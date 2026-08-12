import { TestBed } from '@angular/core/testing';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
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

  it('lists diagnoses for a patient', () => {
    let result: unknown;
    service.getDiagnosesByPatient('patient-1').subscribe((res) => (result = res));

    const req = httpMock.expectOne('https://gateway.example/api/encounters/diagnoses/patient/patient-1');
    expect(req.request.method).toBe('GET');
    req.flush([]);
    expect(result).toEqual([]);
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
