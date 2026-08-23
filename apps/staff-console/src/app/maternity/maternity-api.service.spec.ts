import { TestBed } from '@angular/core/testing';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { HttpRequest, provideHttpClient } from '@angular/common/http';
import { API_BASE_URL, TENANT_ID } from '@org/api-client';
import { MaternityApiService } from './maternity-api.service.js';

describe('MaternityApiService', () => {
  let service: MaternityApiService;
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
    service = TestBed.inject(MaternityApiService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('lists records filtered by patientId', () => {
    service.list({ patientId: 'p1' }).subscribe();

    const req = httpMock.expectOne(
      (r: HttpRequest<unknown>) => r.url === 'https://gateway.example/api/maternity/records',
    );
    expect(req.request.params.get('patientId')).toBe('p1');
    req.flush({ data: [], total: 0 });
  });

  it('creates a record', () => {
    const dto = { admissionId: 'adm-1', patientId: 'p1', gravida: 2, para: 1 };
    service.create(dto).subscribe();

    const req = httpMock.expectOne('https://gateway.example/api/maternity/records');
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(dto);
    req.flush({});
  });

  it('records a delivery', () => {
    const dto = { deliveryDate: '2026-08-23', deliveryType: 'Normal' as const, babyCount: 1 };
    service.recordDelivery('r1', dto).subscribe();

    const req = httpMock.expectOne('https://gateway.example/api/maternity/records/r1/delivery');
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(dto);
    req.flush({});
  });
});
