import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap } from '@angular/router';
import { Subject, of, throwError } from 'rxjs';
import { AuthService } from '@org/auth';
import { InvoiceDetail } from './invoice-detail.js';
import { InvoicesApiService } from '../invoices-api.service.js';
import { PatientsApiService, Patient } from '../../patients/patients-api.service.js';
import { InvoiceWithReturns } from '../invoice.model.js';

function fakeInvoice(overrides: Partial<InvoiceWithReturns> = {}): InvoiceWithReturns {
  return {
    id: 'invoice-1',
    patientId: 'patient-1',
    invoiceNumber: 1,
    financialYear: '2026-27',
    subtotal: 100,
    discountAmount: 0,
    taxableAmount: 100,
    taxAmount: 0,
    totalAmount: 100,
    paidAmount: 0,
    status: 'Unpaid',
    notes: null,
    createdBy: 'account-1',
    createdAt: '2026-08-09T00:00:00Z',
    updatedAt: '2026-08-09T00:00:00Z',
    returns: [],
    ...overrides,
  };
}

function fakePatient(overrides: Partial<Patient> = {}): Patient {
  return {
    id: 'patient-1',
    patientNo: 'PAT-2026-00001',
    firstName: 'Asha',
    lastName: 'Rao',
    gender: 'Female',
    isActive: true,
    createdAt: '2026-08-09T00:00:00Z',
    updatedAt: '2026-08-09T00:00:00Z',
    ...overrides,
  };
}

function fakeAuth(canManage = true): AuthService {
  return { hasPermission: () => canManage } as unknown as AuthService;
}

function fakePatientsApi(patient: Patient | null = fakePatient()): PatientsApiService {
  return {
    getById: jest.fn().mockReturnValue(patient ? of(patient) : throwError(() => new Error('not found'))),
  } as unknown as PatientsApiService;
}

describe('InvoiceDetail', () => {
  it('fetches the invoice for the route id param and exposes it as a signal', async () => {
    const invoice = fakeInvoice();
    const invoicesApi = { findOne: jest.fn().mockReturnValue(of(invoice)) } as unknown as InvoicesApiService;

    TestBed.configureTestingModule({
      imports: [InvoiceDetail],
      providers: [
        { provide: InvoicesApiService, useValue: invoicesApi },
        { provide: PatientsApiService, useValue: fakePatientsApi() },
        { provide: AuthService, useValue: fakeAuth() },
        { provide: ActivatedRoute, useValue: { paramMap: of(convertToParamMap({ id: 'invoice-1' })) } },
      ],
    });

    const fixture = TestBed.createComponent(InvoiceDetail);
    fixture.detectChanges();
    await fixture.whenStable();

    expect(invoicesApi.findOne).toHaveBeenCalledWith('invoice-1');
    expect(fixture.componentInstance.invoice()).toEqual(invoice);
  });

  it('sets an error message instead of hanging on "Loading…" when the request fails', async () => {
    const invoicesApi = {
      findOne: jest.fn().mockReturnValue(throwError(() => new Error('boom'))),
    } as unknown as InvoicesApiService;

    TestBed.configureTestingModule({
      imports: [InvoiceDetail],
      providers: [
        { provide: InvoicesApiService, useValue: invoicesApi },
        { provide: PatientsApiService, useValue: fakePatientsApi() },
        { provide: AuthService, useValue: fakeAuth() },
        { provide: ActivatedRoute, useValue: { paramMap: of(convertToParamMap({ id: 'invoice-1' })) } },
      ],
    });

    const fixture = TestBed.createComponent(InvoiceDetail);
    fixture.detectChanges();
    await fixture.whenStable();

    expect(fixture.componentInstance.invoice()).toBeNull();
    expect(fixture.componentInstance.error()).toBe('Failed to load invoice.');
  });

  it('refetches when the route id changes under a reused component instance', async () => {
    const invoiceOne = fakeInvoice({ id: 'invoice-1' });
    const invoiceTwo = fakeInvoice({ id: 'invoice-2' });
    const findOne = jest.fn((id: string) => of(id === 'invoice-1' ? invoiceOne : invoiceTwo));
    const invoicesApi = { findOne } as unknown as InvoicesApiService;
    const paramMap$ = new Subject<ReturnType<typeof convertToParamMap>>();

    TestBed.configureTestingModule({
      imports: [InvoiceDetail],
      providers: [
        { provide: InvoicesApiService, useValue: invoicesApi },
        { provide: PatientsApiService, useValue: fakePatientsApi() },
        { provide: AuthService, useValue: fakeAuth() },
        { provide: ActivatedRoute, useValue: { paramMap: paramMap$ } },
      ],
    });

    const fixture = TestBed.createComponent(InvoiceDetail);
    fixture.detectChanges();
    paramMap$.next(convertToParamMap({ id: 'invoice-1' }));
    await fixture.whenStable();
    expect(fixture.componentInstance.invoice()).toEqual(invoiceOne);

    paramMap$.next(convertToParamMap({ id: 'invoice-2' }));
    await fixture.whenStable();

    expect(findOne).toHaveBeenCalledWith('invoice-2');
    expect(fixture.componentInstance.invoice()).toEqual(invoiceTwo);
  });

  describe('patient name resolution', () => {
    function setUp(patient: Patient | null) {
      const invoice = fakeInvoice({ patientId: 'patient-1' });
      const invoicesApi = { findOne: jest.fn().mockReturnValue(of(invoice)) } as unknown as InvoicesApiService;
      const patientsApi = fakePatientsApi(patient);

      TestBed.configureTestingModule({
        imports: [InvoiceDetail],
        providers: [
          { provide: InvoicesApiService, useValue: invoicesApi },
          { provide: PatientsApiService, useValue: patientsApi },
          { provide: AuthService, useValue: fakeAuth() },
          { provide: ActivatedRoute, useValue: { paramMap: of(convertToParamMap({ id: invoice.id })) } },
        ],
      });

      const fixture = TestBed.createComponent(InvoiceDetail);
      fixture.detectChanges();
      return { fixture, patientsApi };
    }

    it('resolves and exposes the patient full name once the invoice loads', async () => {
      const { fixture, patientsApi } = setUp(fakePatient({ firstName: 'Asha', lastName: 'Rao' }));
      await fixture.whenStable();

      expect(patientsApi.getById).toHaveBeenCalledWith('patient-1');
      expect(fixture.componentInstance.patientName()).toBe('Asha Rao');
    });

    it('leaves the patient name null (falling back to the raw id in the template) if the lookup fails', async () => {
      const { fixture } = setUp(null);
      await fixture.whenStable();

      expect(fixture.componentInstance.patientName()).toBeNull();
    });
  });

  describe('Record Payment', () => {
    function setUp(opts: { canManage?: boolean; invoice?: InvoiceWithReturns } = {}) {
      const invoice = opts.invoice ?? fakeInvoice({ totalAmount: 100, paidAmount: 40 });
      const findOne = jest.fn().mockReturnValue(of(invoice));
      const recordPayment = jest.fn().mockReturnValue(of({ id: 'payment-1' }));
      const invoicesApi = { findOne, recordPayment } as unknown as InvoicesApiService;

      TestBed.configureTestingModule({
        imports: [InvoiceDetail],
        providers: [
          { provide: InvoicesApiService, useValue: invoicesApi },
          { provide: PatientsApiService, useValue: fakePatientsApi() },
          { provide: AuthService, useValue: fakeAuth(opts.canManage ?? true) },
          { provide: ActivatedRoute, useValue: { paramMap: of(convertToParamMap({ id: invoice.id })) } },
        ],
      });

      const fixture = TestBed.createComponent(InvoiceDetail);
      fixture.detectChanges();
      return { fixture, invoice, findOne, recordPayment };
    }

    it('computes the outstanding balance from total minus paid', async () => {
      const { fixture } = setUp({ invoice: fakeInvoice({ totalAmount: 100, paidAmount: 40 }) });
      await fixture.whenStable();

      expect(fixture.componentInstance.outstanding()).toBe(60);
    });

    it('hides the Record Payment action without billing.manage', async () => {
      const { fixture } = setUp({ canManage: false });
      await fixture.whenStable();

      expect(fixture.componentInstance.canRecordPayment()).toBe(false);
    });

    it('hides the Record Payment action once the invoice is Paid or Cancelled', async () => {
      const { fixture } = setUp({ invoice: fakeInvoice({ status: 'Paid' }) });
      await fixture.whenStable();

      expect(fixture.componentInstance.canRecordPayment()).toBe(false);
    });

    it('records a payment and refreshes the invoice from the server', async () => {
      const updatedInvoice = fakeInvoice({ paidAmount: 100, status: 'Paid' });
      const { fixture, invoice, findOne, recordPayment } = setUp();
      await fixture.whenStable();
      findOne.mockReturnValue(of(updatedInvoice));

      const component = fixture.componentInstance;
      component.openPaymentModal();
      component.paymentAmount.set(60);
      component.paymentMode.set('Cash');
      component.submitPayment();
      await fixture.whenStable();

      expect(recordPayment).toHaveBeenCalledWith(invoice.id, { amount: 60, paymentMode: 'Cash', sourceDepositId: undefined });
      expect(findOne).toHaveBeenLastCalledWith(invoice.id);
      expect(component.invoice()).toEqual(updatedInvoice);
      expect(component.showPaymentModal()).toBe(false);
    });

    it('requires a source deposit id when the payment mode is Deposit', async () => {
      const { fixture, recordPayment } = setUp();
      await fixture.whenStable();

      const component = fixture.componentInstance;
      component.openPaymentModal();
      component.paymentAmount.set(60);
      component.paymentMode.set('Deposit');
      component.submitPayment();

      expect(recordPayment).not.toHaveBeenCalled();
      expect(component.paymentError()).toContain('Source deposit ID');
    });

    it('surfaces the backend error message and stops the saving spinner on failure', async () => {
      const invoice = fakeInvoice();
      const findOne = jest.fn().mockReturnValue(of(invoice));
      const recordPayment = jest.fn().mockReturnValue(throwError(() => ({ message: 'Payment amount exceeds outstanding balance' })));
      const invoicesApi = { findOne, recordPayment } as unknown as InvoicesApiService;

      TestBed.configureTestingModule({
        imports: [InvoiceDetail],
        providers: [
          { provide: InvoicesApiService, useValue: invoicesApi },
          { provide: PatientsApiService, useValue: fakePatientsApi() },
          { provide: AuthService, useValue: fakeAuth() },
          { provide: ActivatedRoute, useValue: { paramMap: of(convertToParamMap({ id: invoice.id })) } },
        ],
      });

      const fixture = TestBed.createComponent(InvoiceDetail);
      fixture.detectChanges();
      await fixture.whenStable();

      const component = fixture.componentInstance;
      component.openPaymentModal();
      component.paymentAmount.set(999);
      component.paymentMode.set('Cash');
      component.submitPayment();
      await fixture.whenStable();

      expect(component.paymentSaving()).toBe(false);
      expect(component.paymentError()).toBe('Payment amount exceeds outstanding balance');
      expect(component.showPaymentModal()).toBe(true);
    });
  });
});
