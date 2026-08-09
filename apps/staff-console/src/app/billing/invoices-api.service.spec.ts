import { TestBed } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { HttpRequest, provideHttpClient } from '@angular/common/http';
import { API_BASE_URL } from '@org/api-client';
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
      (r: HttpRequest<unknown>) => r.url === 'https://gateway.example/api/billing/invoices',
    );
    expect(req.request.params.get('page')).toBe('2');
    expect(req.request.params.get('limit')).toBe('10');
    expect(req.request.params.has('patientId')).toBe(false);

    const body = { data: [], total: 0, page: 2, limit: 10 };
    req.flush(body);
    expect(result).toEqual(body);
  });

  it('includes patientId in the query when provided', () => {
    service.list({ patientId: 'patient-1' }).subscribe();

    const req = httpMock.expectOne(
      (r: HttpRequest<unknown>) => r.url === 'https://gateway.example/api/billing/invoices',
    );
    expect(req.request.params.get('patientId')).toBe('patient-1');
    req.flush({ data: [], total: 0, page: 1, limit: 20 });
  });

  it('fetches a single invoice by id', () => {
    let result: unknown;
    service.findOne('invoice-1').subscribe((res) => (result = res));

    const req = httpMock.expectOne('https://gateway.example/api/billing/invoices/invoice-1');
    const invoice = { id: 'invoice-1', returns: [] };
    req.flush(invoice);
    expect(result).toEqual(invoice);
  });
});
