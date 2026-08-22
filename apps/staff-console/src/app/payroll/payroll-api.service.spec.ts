import { TestBed } from '@angular/core/testing';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { HttpRequest, provideHttpClient } from '@angular/common/http';
import { API_BASE_URL, TENANT_ID } from '@org/api-client';
import { PayrollApiService } from './payroll-api.service.js';

describe('PayrollApiService', () => {
  let service: PayrollApiService;
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
    service = TestBed.inject(PayrollApiService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('omits month/year from the query string when not filtering — regression for the "undefined" literal bug', () => {
    service.listPayslips({ page: 1, limit: 10 }).subscribe();

    const req = httpMock.expectOne(
      (r: HttpRequest<unknown>) => r.url === 'https://gateway.example/api/payroll/payslips',
    );
    expect(req.request.params.get('page')).toBe('1');
    expect(req.request.params.get('limit')).toBe('10');
    // The actual bug: HttpClient stringifies an undefined value to the literal "undefined"
    // rather than omitting the key, which the backend then fails to parse as an integer.
    expect(req.request.params.has('month')).toBe(false);
    expect(req.request.params.has('year')).toBe(false);
    req.flush({ data: [], meta: { total: 0, page: 1, limit: 10, totalPages: 0 } });
  });

  it('includes month/year in the query when both are provided', () => {
    service.listPayslips({ page: 1, limit: 10, month: 8, year: 2026 }).subscribe();

    const req = httpMock.expectOne(
      (r: HttpRequest<unknown>) => r.url === 'https://gateway.example/api/payroll/payslips',
    );
    expect(req.request.params.get('month')).toBe('8');
    expect(req.request.params.get('year')).toBe('2026');
    req.flush({ data: [], meta: { total: 0, page: 1, limit: 10, totalPages: 0 } });
  });
});
