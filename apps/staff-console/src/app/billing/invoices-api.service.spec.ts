import { TestBed } from '@angular/core/testing';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { HttpRequest, provideHttpClient } from '@angular/common/http';
import { API_BASE_URL, TENANT_ID } from '@org/api-client';
import { InvoicesApiService } from './invoices-api.service.js';

describe('InvoicesApiService', () => {
  let service: InvoicesApiService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: API_BASE_URL, useValue: 'https://gateway.example/api' },
        { provide: TENANT_ID, useValue: 'demo' },
      ],
    });
    service = TestBed.inject(InvoicesApiService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('lists invoices with page/limit query params', () => {
    let result: unknown;
    service.list({ page: 2, limit: 10 }).subscribe((res) => (result = res));

    const req = httpMock.expectOne(
      (r: HttpRequest<unknown>) =>
        r.url === 'https://gateway.example/api/billing/invoices',
    );
    expect(req.request.params.get('page')).toBe('2');
    expect(req.request.params.get('limit')).toBe('10');
    expect(req.request.params.has('patientId')).toBe(false);

    const body = { data: [], meta: { total: 0, page: 2, limit: 10, totalPages: 0 } };
    req.flush(body);
    expect(result).toEqual(body);
  });

  it('includes patientId in the query when provided', () => {
    service.list({ patientId: 'patient-1' }).subscribe();

    const req = httpMock.expectOne(
      (r: HttpRequest<unknown>) =>
        r.url === 'https://gateway.example/api/billing/invoices',
    );
    expect(req.request.params.get('patientId')).toBe('patient-1');
    req.flush({ data: [], meta: { total: 0, page: 1, limit: 20, totalPages: 0 } });
  });

  it('fetches a single invoice by id', () => {
    let result: unknown;
    service.findOne('invoice-1').subscribe((res) => (result = res));

    const req = httpMock.expectOne(
      'https://gateway.example/api/billing/invoices/invoice-1',
    );
    const invoice = { id: 'invoice-1', returns: [] };
    req.flush(invoice);
    expect(result).toEqual(invoice);
  });

  it('posts a payment to the invoice payments endpoint', () => {
    let result: unknown;
    service.recordPayment('invoice-1', { amount: 100, paymentMode: 'Cash' }).subscribe((res) => (result = res));

    const req = httpMock.expectOne(
      'https://gateway.example/api/billing/invoices/invoice-1/payments',
    );
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ amount: 100, paymentMode: 'Cash' });
    const payment = { id: 'payment-1', invoiceId: 'invoice-1', amount: 100, paymentMode: 'Cash' };
    req.flush(payment);
    expect(result).toEqual(payment);
  });
});
