import { TestBed } from '@angular/core/testing';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { HttpRequest, provideHttpClient } from '@angular/common/http';
import { API_BASE_URL, TENANT_ID } from '@org/api-client';
import { EmployeesApiService } from './employees-api.service.js';

describe('EmployeesApiService', () => {
  let service: EmployeesApiService;
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
    service = TestBed.inject(EmployeesApiService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('omits q from the query string when unset, instead of sending the literal string "undefined"', () => {
    service.list({ page: 1, limit: 10, q: undefined }).subscribe();

    const req = httpMock.expectOne(
      (r: HttpRequest<unknown>) => r.url === 'https://gateway.example/api/employees',
    );
    expect(req.request.params.has('q')).toBe(false);
    expect(req.request.params.get('page')).toBe('1');
    expect(req.request.params.get('limit')).toBe('10');
    req.flush({ data: [], meta: { total: 0, page: 1, limit: 10, totalPages: 0 } });
  });

  it('includes q when set', () => {
    service.list({ page: 1, limit: 10, q: 'priya' }).subscribe();

    const req = httpMock.expectOne(
      (r: HttpRequest<unknown>) => r.url === 'https://gateway.example/api/employees',
    );
    expect(req.request.params.get('q')).toBe('priya');
    req.flush({ data: [], meta: { total: 0, page: 1, limit: 10, totalPages: 0 } });
  });
});
