import { TestBed } from '@angular/core/testing';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { HttpRequest, provideHttpClient } from '@angular/common/http';
import { API_BASE_URL, TENANT_ID } from '@org/api-client';
import { VaccinationApiService } from './vaccination-api.service.js';

describe('VaccinationApiService', () => {
  let service: VaccinationApiService;
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
    service = TestBed.inject(VaccinationApiService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('lists records filtered by patientId and vaccine', () => {
    service.list({ patientId: 'p1', vaccine: 'MMR' }).subscribe();

    const req = httpMock.expectOne(
      (r: HttpRequest<unknown>) => r.url === 'https://gateway.example/api/vaccination/records',
    );
    expect(req.request.params.get('patientId')).toBe('p1');
    expect(req.request.params.get('vaccine')).toBe('MMR');
    req.flush({ data: [], total: 0 });
  });

  it('records a vaccination', () => {
    const dto = { patientId: 'p1', vaccine: 'MMR', administeredDate: '2026-08-23' };
    service.record(dto).subscribe();

    const req = httpMock.expectOne('https://gateway.example/api/vaccination/records');
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(dto);
    req.flush({});
  });
});
