import { TestBed } from '@angular/core/testing';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { HttpRequest, provideHttpClient } from '@angular/common/http';
import { API_BASE_URL, TENANT_ID } from '@org/api-client';
import { PatientsApiService } from './patients-api.service.js';

describe('PatientsApiService', () => {
  let service: PatientsApiService;
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
    service = TestBed.inject(PatientsApiService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('omits q/phoneNumber/patientNo entirely when not provided, instead of sending them as the string "undefined"', () => {
    service.search({ page: 1, limit: 10 }).subscribe();

    const req = httpMock.expectOne(
      (r: HttpRequest<unknown>) => r.url === 'https://gateway.example/api/patients',
    );
    expect(req.request.params.get('page')).toBe('1');
    expect(req.request.params.get('limit')).toBe('10');
    expect(req.request.params.has('q')).toBe(false);
    expect(req.request.params.has('phoneNumber')).toBe(false);
    expect(req.request.params.has('patientNo')).toBe(false);
    req.flush({ data: [], meta: { total: 0, page: 1, limit: 10, totalPages: 0 } });
  });

  it('includes q when a search term is provided', () => {
    service.search({ page: 1, limit: 10, q: 'jane' }).subscribe();

    const req = httpMock.expectOne(
      (r: HttpRequest<unknown>) => r.url === 'https://gateway.example/api/patients',
    );
    expect(req.request.params.get('q')).toBe('jane');
    req.flush({ data: [], meta: { total: 0, page: 1, limit: 10, totalPages: 0 } });
  });
});
