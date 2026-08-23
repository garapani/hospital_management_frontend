import { TestBed } from '@angular/core/testing';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { HttpRequest, provideHttpClient } from '@angular/common/http';
import { API_BASE_URL, TENANT_ID } from '@org/api-client';
import { OtApiService } from './ot-api.service.js';

describe('OtApiService', () => {
  let service: OtApiService;
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
    service = TestBed.inject(OtApiService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('lists surgeries with status/patientId filters', () => {
    service.list({ status: 'Scheduled', patientId: 'p1' }).subscribe();

    const req = httpMock.expectOne(
      (r: HttpRequest<unknown>) => r.url === 'https://gateway.example/api/ot/surgeries',
    );
    expect(req.request.params.get('status')).toBe('Scheduled');
    expect(req.request.params.get('patientId')).toBe('p1');
    req.flush({ data: [], total: 0 });
  });

  it('schedules a surgery', () => {
    const dto = { patientId: 'p1', procedureName: 'Appendectomy' };
    service.schedule(dto).subscribe();

    const req = httpMock.expectOne('https://gateway.example/api/ot/surgeries');
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(dto);
    req.flush({});
  });

  it('starts, completes, and cancels a surgery', () => {
    service.start('s1').subscribe();
    httpMock.expectOne('https://gateway.example/api/ot/surgeries/s1/start').flush({});

    service.complete('s1').subscribe();
    httpMock.expectOne('https://gateway.example/api/ot/surgeries/s1/complete').flush({});

    service.cancel('s1').subscribe();
    httpMock.expectOne('https://gateway.example/api/ot/surgeries/s1/cancel').flush({});
  });

  it('fetches a single surgery by id', () => {
    service.findOne('s1').subscribe();
    httpMock.expectOne('https://gateway.example/api/ot/surgeries/s1').flush({});
  });
});
