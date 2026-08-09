import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap } from '@angular/router';
import { Subject, of, throwError } from 'rxjs';
import { InvoiceDetail } from './invoice-detail.js';
import { InvoicesApiService } from '../invoices-api.service.js';
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

describe('InvoiceDetail', () => {
  it('fetches the invoice for the route id param and exposes it as a signal', async () => {
    const invoice = fakeInvoice();
    const invoicesApi = { findOne: jest.fn().mockReturnValue(of(invoice)) } as unknown as InvoicesApiService;

    TestBed.configureTestingModule({
      imports: [InvoiceDetail],
      providers: [
        { provide: InvoicesApiService, useValue: invoicesApi },
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
});
