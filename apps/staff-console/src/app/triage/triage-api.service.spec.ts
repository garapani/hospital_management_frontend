import { TestBed } from '@angular/core/testing';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { API_BASE_URL, TENANT_ID } from '@org/api-client';
import { TriageApiService } from './triage-api.service.js';

describe('TriageApiService', () => {
  let service: TriageApiService;
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
    service = TestBed.inject(TriageApiService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('lists active triage entries with page and limit', () => {
    let result: unknown;
    service.listActive({ page: 1, limit: 10 }).subscribe((res) => (result = res));

    const req = httpMock.expectOne(
      (r) => r.url === 'https://gateway.example/api/triage/entries',
    );
    expect(req.request.method).toBe('GET');
    expect(req.request.params.get('page')).toBe('1');
    expect(req.request.params.get('limit')).toBe('10');
    const body = { data: [], meta: { total: 0, page: 1, limit: 10, totalPages: 0 } };
    req.flush(body);
    expect(result).toEqual(body);
  });

  it('links a patient to a triage entry', () => {
    let result: unknown;
    service.linkPatient('entry-1', 'patient-1').subscribe((res) => (result = res));

    const req = httpMock.expectOne('https://gateway.example/api/triage/entries/entry-1/link-patient');
    expect(req.request.method).toBe('PATCH');
    expect(req.request.body).toEqual({ patientId: 'patient-1' });
    const updated = { id: 'entry-1', patientId: 'patient-1' };
    req.flush(updated);
    expect(result).toEqual(updated);
  });
});
