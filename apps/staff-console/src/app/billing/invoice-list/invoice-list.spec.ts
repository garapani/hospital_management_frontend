import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';
import { InvoiceList } from './invoice-list.js';
import { InvoicesApiService } from '../invoices-api.service.js';
import { Invoice, InvoiceListResult } from '../invoice.model.js';

describe('InvoiceList', () => {
  function setup() {
    const result: InvoiceListResult = { data: [], total: 0, page: 1, limit: 20 };
    const invoicesApi = { list: jest.fn().mockReturnValue(of(result)) } as unknown as InvoicesApiService;

    TestBed.configureTestingModule({
      imports: [InvoiceList],
      providers: [provideRouter([]), { provide: InvoicesApiService, useValue: invoicesApi }],
    });

    const fixture = TestBed.createComponent(InvoiceList);
    return { fixture, invoicesApi };
  }

  it('loads page 1 exactly once on init (PrimeNG lazyLoadOnInit is disabled to avoid a double fetch)', async () => {
    const { fixture, invoicesApi } = setup();
    fixture.detectChanges();
    await fixture.whenStable();

    expect(invoicesApi.list).toHaveBeenCalledTimes(1);
    expect(invoicesApi.list).toHaveBeenCalledWith({ patientId: undefined, page: 1, limit: 20 });
  });

  it('clears the loading flag when the request errors', async () => {
    const invoicesApi = {
      list: jest.fn().mockReturnValue(throwError(() => new Error('boom'))),
    } as unknown as InvoicesApiService;
    TestBed.configureTestingModule({
      imports: [InvoiceList],
      providers: [provideRouter([]), { provide: InvoicesApiService, useValue: invoicesApi }],
    });
    const fixture = TestBed.createComponent(InvoiceList);

    fixture.detectChanges();
    await fixture.whenStable();

    expect(fixture.componentInstance.loading()).toBe(false);
  });

  it('computes page from a PrimeNG lazy-load event (0-indexed first + rows)', async () => {
    const { fixture, invoicesApi } = setup();
    fixture.detectChanges();
    await fixture.whenStable();
    invoicesApi.list = jest.fn().mockReturnValue(of({ data: [], total: 0, page: 3, limit: 20 }));

    fixture.componentInstance.onLazyLoad({ first: 40, rows: 20 });

    expect(invoicesApi.list).toHaveBeenCalledWith({ patientId: undefined, page: 3, limit: 20 });
  });

  it('applying a patient filter reloads at page 1 with the filter applied', async () => {
    const { fixture, invoicesApi } = setup();
    fixture.detectChanges();
    await fixture.whenStable();
    invoicesApi.list = jest.fn().mockReturnValue(of({ data: [], total: 0, page: 1, limit: 20 }));

    fixture.componentInstance.patientIdFilter.set('patient-1');
    fixture.componentInstance.applyPatientFilter();

    expect(invoicesApi.list).toHaveBeenCalledWith({ patientId: 'patient-1', page: 1, limit: 20 });
  });

  it('populates invoices and totalRecords from the response', async () => {
    const invoice: Invoice = {
      id: 'inv-1',
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
    };
    const result: InvoiceListResult = { data: [invoice], total: 1, page: 1, limit: 20 };
    const invoicesApi = { list: jest.fn().mockReturnValue(of(result)) } as unknown as InvoicesApiService;
    TestBed.configureTestingModule({
      imports: [InvoiceList],
      providers: [provideRouter([]), { provide: InvoicesApiService, useValue: invoicesApi }],
    });
    const fixture = TestBed.createComponent(InvoiceList);

    fixture.detectChanges();
    await fixture.whenStable();

    expect(fixture.componentInstance.invoices()).toEqual([invoice]);
    expect(fixture.componentInstance.totalRecords()).toBe(1);
  });
});
