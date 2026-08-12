import { TestBed } from '@angular/core/testing';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { HttpRequest, provideHttpClient } from '@angular/common/http';
import { API_BASE_URL, TENANT_ID } from '@org/api-client';
import { AppointmentsApiService } from './appointments-api.service.js';

describe('AppointmentsApiService', () => {
  let service: AppointmentsApiService;
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
    service = TestBed.inject(AppointmentsApiService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('lists appointments with only the provided filters as query params', () => {
    let result: unknown;
    service.list({ date: '2026-08-12' }).subscribe((res) => (result = res));

    const req = httpMock.expectOne(
      (r: HttpRequest<unknown>) => r.url === 'https://gateway.example/api/appointments',
    );
    expect(req.request.params.get('date')).toBe('2026-08-12');
    expect(req.request.params.has('doctorId')).toBe(false);
    expect(req.request.params.has('status')).toBe(false);
    req.flush([]);
    expect(result).toEqual([]);
  });

  it('updates an appointment via PUT (matching the backend route)', () => {
    let result: unknown;
    service.update('appt-1', { status: 'Completed' }).subscribe((res) => (result = res));

    const req = httpMock.expectOne('https://gateway.example/api/appointments/appt-1');
    expect(req.request.method).toBe('PUT');
    expect(req.request.body).toEqual({ status: 'Completed' });
    const updated = { id: 'appt-1', status: 'Completed' };
    req.flush(updated);
    expect(result).toEqual(updated);
  });

  it('cancels an appointment with remarks', () => {
    service.cancel('appt-1', 'Patient rescheduled').subscribe();

    const req = httpMock.expectOne('https://gateway.example/api/appointments/appt-1/cancel');
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ cancelledRemarks: 'Patient rescheduled' });
    req.flush({ id: 'appt-1', status: 'Cancelled' });
  });
});
