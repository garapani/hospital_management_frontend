import { TestBed } from '@angular/core/testing';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { HttpRequest, provideHttpClient } from '@angular/common/http';
import { API_BASE_URL, TENANT_ID } from '@org/api-client';
import { FractionApiService } from './fraction-api.service.js';

describe('FractionApiService', () => {
  let service: FractionApiService;
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
    service = TestBed.inject(FractionApiService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('lists rules filtered by doctorId', () => {
    service.listRules('d1').subscribe();

    const req = httpMock.expectOne(
      (r: HttpRequest<unknown>) => r.url === 'https://gateway.example/api/fraction/rules',
    );
    expect(req.request.params.get('doctorId')).toBe('d1');
    req.flush({ data: [], total: 0 });
  });

  it('creates a rule', () => {
    const dto = { doctorId: 'd1', fractionPercent: 30 };
    service.createRule(dto).subscribe();

    const req = httpMock.expectOne('https://gateway.example/api/fraction/rules');
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(dto);
    req.flush({});
  });

  it('records an entry', () => {
    const dto = { invoiceId: 'inv1', doctorId: 'd1' };
    service.recordEntry(dto).subscribe();

    const req = httpMock.expectOne('https://gateway.example/api/fraction/entries');
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(dto);
    req.flush({});
  });
});
