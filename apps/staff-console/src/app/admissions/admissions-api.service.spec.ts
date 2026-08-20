import { TestBed } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { HttpRequest, provideHttpClient } from '@angular/common/http';
import { API_BASE_URL, TENANT_ID } from '@org/api-client';
import { AdmissionsApiService } from './admissions-api.service.js';

describe('AdmissionsApiService', () => {
  let service: AdmissionsApiService;
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
    service = TestBed.inject(AdmissionsApiService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('lists admissions with only the provided filters as query params', () => {
    let result: unknown;
    service.list({ patientId: 'patient-1', page: 2, limit: 10 }).subscribe((res) => (result = res));

    const req = httpMock.expectOne((r: HttpRequest<unknown>) => r.url === 'https://gateway.example/api/admissions');
    expect(req.request.params.get('patientId')).toBe('patient-1');
    expect(req.request.params.get('page')).toBe('2');
    expect(req.request.params.has('wardId')).toBe(false);
    expect(req.request.params.has('status')).toBe(false);
    const body = { data: [], meta: { total: 0, page: 2, limit: 10, totalPages: 0 } };
    req.flush(body);
    expect(result).toEqual(body);
  });

  it('fetches active admissions with an optional ward filter', () => {
    let result: unknown;
    service.listActive('ward-1').subscribe((res) => (result = res));

    const req = httpMock.expectOne((r: HttpRequest<unknown>) => r.url === 'https://gateway.example/api/admissions/active');
    expect(req.request.method).toBe('GET');
    expect(req.request.params.get('wardId')).toBe('ward-1');
    req.flush([{ id: 'admission-1' }]);
    expect(result).toEqual([{ id: 'admission-1' }]);
  });

  it('transfers an admission via PATCH to the transfer route', () => {
    let result: unknown;
    service.transfer('admission-1', { toBedId: 'bed-2', transferredBy: 'user-1' }).subscribe((res) => (result = res));

    const req = httpMock.expectOne('https://gateway.example/api/admissions/admission-1/transfer');
    expect(req.request.method).toBe('PATCH');
    expect(req.request.body).toEqual({ toBedId: 'bed-2', transferredBy: 'user-1' });
    req.flush({ id: 'admission-1', bedId: 'bed-2' });
    expect(result).toEqual({ id: 'admission-1', bedId: 'bed-2' });
  });

  it('discharges an admission via PATCH to the discharge route', () => {
    service
      .discharge('admission-1', { dischargeType: 'Recovered', dischargeCondition: 'Stable', dischargedBy: 'user-1' })
      .subscribe();

    const req = httpMock.expectOne('https://gateway.example/api/admissions/admission-1/discharge');
    expect(req.request.method).toBe('PATCH');
    expect(req.request.body).toEqual({ dischargeType: 'Recovered', dischargeCondition: 'Stable', dischargedBy: 'user-1' });
    req.flush({ id: 'admission-1', status: 'Discharged' });
  });

  it('creates a discharge summary via POST', () => {
    service
      .createDischargeSummary({ admissionId: 'admission-1', patientId: 'patient-1', primaryDiagnosis: 'Pneumonia', preparedBy: 'user-1' })
      .subscribe();

    const req = httpMock.expectOne('https://gateway.example/api/admissions/discharge-summaries');
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({
      admissionId: 'admission-1',
      patientId: 'patient-1',
      primaryDiagnosis: 'Pneumonia',
      preparedBy: 'user-1',
    });
    req.flush({ id: 'summary-1' });
  });

  it('reviews a discharge summary via PATCH', () => {
    service.reviewDischargeSummary('summary-1', 'user-1').subscribe();

    const req = httpMock.expectOne('https://gateway.example/api/admissions/discharge-summaries/summary-1/review');
    expect(req.request.method).toBe('PATCH');
    expect(req.request.body).toEqual({ reviewedBy: 'user-1' });
    req.flush({ id: 'summary-1', reviewedBy: 'user-1' });
  });
});
