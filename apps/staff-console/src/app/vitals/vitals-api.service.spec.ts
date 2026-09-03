import { TestBed } from '@angular/core/testing';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { API_BASE_URL, TENANT_ID } from '@org/api-client';
import { VitalsApiService } from './vitals-api.service.js';

describe('VitalsApiService', () => {
  let service: VitalsApiService;
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
    service = TestBed.inject(VitalsApiService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('creates a vital record for a patient', () => {
    let result: unknown;
    service.create({ patientId: 'patient-1', pulse: 80 }).subscribe((res) => (result = res));

    const req = httpMock.expectOne('https://gateway.example/api/vitals');
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ patientId: 'patient-1', pulse: 80 });

    const vital = { id: 'vital-1', patientId: 'patient-1', pulse: 80 };
    req.flush(vital);
    expect(result).toEqual(vital);
  });

  it('lists vitals for a patient', () => {
    let result: unknown;
    service.listByPatient('patient-1').subscribe((res) => (result = res));

    const req = httpMock.expectOne(
      'https://gateway.example/api/vitals/patient/patient-1?limit=100',
    );
    expect(req.request.method).toBe('GET');
    req.flush({ data: [], meta: { total: 0, page: 1, limit: 100, totalPages: 0 } });
    expect(result).toEqual([]);
  });

  it('updates a vital record', () => {
    let result: unknown;
    service.update('vital-1', { pulse: 90 }).subscribe((res) => (result = res));

    const req = httpMock.expectOne('https://gateway.example/api/vitals/vital-1');
    expect(req.request.method).toBe('PATCH');
    expect(req.request.body).toEqual({ pulse: 90 });

    const vital = { id: 'vital-1', patientId: 'patient-1', pulse: 90 };
    req.flush(vital);
    expect(result).toEqual(vital);
  });

  it('voids a vital record', () => {
    let result: unknown;
    service.voidVital('vital-1').subscribe((res) => (result = res));

    const req = httpMock.expectOne('https://gateway.example/api/vitals/vital-1');
    expect(req.request.method).toBe('DELETE');
    req.flush({ success: true });
    expect(result).toEqual({ success: true });
  });
});
