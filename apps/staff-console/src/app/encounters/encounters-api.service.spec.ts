import { TestBed } from '@angular/core/testing';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { HttpRequest, provideHttpClient } from '@angular/common/http';
import { API_BASE_URL, TENANT_ID } from '@org/api-client';
import { EncountersApiService } from './encounters-api.service.js';

describe('EncountersApiService', () => {
  let service: EncountersApiService;
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
    service = TestBed.inject(EncountersApiService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('creates a clinical note', () => {
    let result: unknown;
    service
      .createNote({ patientId: 'patient-1', doctorId: 'doctor-1', chiefComplaint: 'Fever' })
      .subscribe((res) => (result = res));

    const req = httpMock.expectOne('https://gateway.example/api/encounters/notes');
    expect(req.request.method).toBe('POST');
    const note = { id: 'note-1', status: 'Draft' };
    req.flush(note);
    expect(result).toEqual(note);
  });

  it('lists diagnoses for a patient as the backend\'s paginated shape, not a raw array', () => {
    let result: unknown;
    service.getDiagnosesByPatient('patient-1').subscribe((res) => (result = res));

    const req = httpMock.expectOne('https://gateway.example/api/encounters/diagnoses/patient/patient-1');
    expect(req.request.method).toBe('GET');
    const body = { data: [], meta: { total: 0, page: 1, limit: 20, totalPages: 0 } };
    req.flush(body);
    expect(result).toEqual(body);
  });

  it('sends limit as a query param when listing notes/diagnoses/prescriptions', () => {
    service.getNotesByPatient('patient-1', 200).subscribe();
    const notesReq = httpMock.expectOne(
      (r: HttpRequest<unknown>) => r.url === 'https://gateway.example/api/encounters/notes/patient/patient-1',
    );
    expect(notesReq.request.params.get('limit')).toBe('200');
    notesReq.flush({ data: [], meta: { total: 0, page: 1, limit: 200, totalPages: 0 } });

    service.getDiagnosesByPatient('patient-1', 200).subscribe();
    const diagnosesReq = httpMock.expectOne(
      (r: HttpRequest<unknown>) => r.url === 'https://gateway.example/api/encounters/diagnoses/patient/patient-1',
    );
    expect(diagnosesReq.request.params.get('limit')).toBe('200');
    diagnosesReq.flush({ data: [], meta: { total: 0, page: 1, limit: 200, totalPages: 0 } });

    service.getPrescriptionsByPatient('patient-1', 200).subscribe();
    const prescriptionsReq = httpMock.expectOne(
      (r: HttpRequest<unknown>) => r.url === 'https://gateway.example/api/encounters/prescriptions/patient/patient-1',
    );
    expect(prescriptionsReq.request.params.get('limit')).toBe('200');
    prescriptionsReq.flush({ data: [], meta: { total: 0, page: 1, limit: 200, totalPages: 0 } });
  });

  it('omits the limit query param when not provided', () => {
    service.getNotesByPatient('patient-1').subscribe();
    const req = httpMock.expectOne(
      (r: HttpRequest<unknown>) => r.url === 'https://gateway.example/api/encounters/notes/patient/patient-1',
    );
    expect(req.request.params.has('limit')).toBe(false);
    req.flush({ data: [], meta: { total: 0, page: 1, limit: 20, totalPages: 0 } });
  });

  it('deletes a prescription', () => {
    let result: unknown;
    service.deletePrescription('rx-1').subscribe((res) => (result = res));

    const req = httpMock.expectOne('https://gateway.example/api/encounters/prescriptions/rx-1');
    expect(req.request.method).toBe('DELETE');
    req.flush({ success: true });
    expect(result).toEqual({ success: true });
  });
});
