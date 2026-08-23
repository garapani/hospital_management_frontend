import { TestBed } from '@angular/core/testing';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { HttpRequest, provideHttpClient } from '@angular/common/http';
import { API_BASE_URL, TENANT_ID } from '@org/api-client';
import { CssdApiService } from './cssd-api.service.js';

describe('CssdApiService', () => {
  let service: CssdApiService;
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
    service = TestBed.inject(CssdApiService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('lists instruments', () => {
    service.listInstruments().subscribe();
    httpMock.expectOne('https://gateway.example/api/cssd/instruments').flush([]);
  });

  it('creates an instrument', () => {
    const dto = { code: 'FORCEPS-01', name: 'Forceps', quantity: 10 };
    service.createInstrument(dto).subscribe();

    const req = httpMock.expectOne('https://gateway.example/api/cssd/instruments');
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(dto);
    req.flush({});
  });

  it('lists cycles filtered by instrumentId/status', () => {
    service.listCycles({ instrumentId: 'i1', status: 'InProgress' }).subscribe();

    const req = httpMock.expectOne(
      (r: HttpRequest<unknown>) => r.url === 'https://gateway.example/api/cssd/cycles',
    );
    expect(req.request.params.get('instrumentId')).toBe('i1');
    expect(req.request.params.get('status')).toBe('InProgress');
    req.flush({ data: [], total: 0 });
  });

  it('starts, completes, and fails a cycle', () => {
    service.startCycle({ instrumentId: 'i1', method: 'Steam' }).subscribe();
    const startReq = httpMock.expectOne('https://gateway.example/api/cssd/cycles');
    expect(startReq.request.body).toEqual({ instrumentId: 'i1', method: 'Steam' });
    startReq.flush({});

    service.completeCycle('c1', { sterileHours: 48 }).subscribe();
    const completeReq = httpMock.expectOne('https://gateway.example/api/cssd/cycles/c1/complete');
    expect(completeReq.request.body).toEqual({ sterileHours: 48 });
    completeReq.flush({});

    service.failCycle('c1', { failureReason: 'Indicator failed' }).subscribe();
    const failReq = httpMock.expectOne('https://gateway.example/api/cssd/cycles/c1/fail');
    expect(failReq.request.body).toEqual({ failureReason: 'Indicator failed' });
    failReq.flush({});
  });
});
