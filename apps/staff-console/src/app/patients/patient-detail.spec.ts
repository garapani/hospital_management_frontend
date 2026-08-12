import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { AuthService } from '@org/auth';
import { PatientDetail } from './patient-detail.js';
import { PatientsApiService, Patient } from './patients-api.service.js';
import { VitalsApiService } from './vitals-api.service.js';
import { EncountersApiService } from './encounters-api.service.js';

describe('PatientDetail', () => {
  const patient: Patient = {
    id: 'patient-1',
    patientNo: 'PMI-1',
    firstName: 'Jane',
    lastName: 'Doe',
    gender: 'Female',
    isActive: true,
    createdAt: '2026-08-01T00:00:00Z',
    updatedAt: '2026-08-01T00:00:00Z',
  };

  function setup(permissions: string[]) {
    const patientsApi = { getById: jest.fn().mockReturnValue(of(patient)) } as unknown as PatientsApiService;
    const vitalsApi = { listByPatient: jest.fn().mockReturnValue(of([])) } as unknown as VitalsApiService;
    const encountersApi = {
      getNotesByPatient: jest.fn().mockReturnValue(of([])),
      getDiagnosesByPatient: jest.fn().mockReturnValue(of([])),
      getPrescriptionsByPatient: jest.fn().mockReturnValue(of([])),
    } as unknown as EncountersApiService;
    const auth = { hasPermission: (p: string) => permissions.includes(p), currentUser: () => null } as unknown as AuthService;
    const activatedRoute = {
      paramMap: of(convertToParamMap({ id: 'patient-1' })),
    } as unknown as ActivatedRoute;

    TestBed.configureTestingModule({
      imports: [PatientDetail],
      providers: [
        provideRouter([]),
        { provide: PatientsApiService, useValue: patientsApi },
        { provide: VitalsApiService, useValue: vitalsApi },
        { provide: EncountersApiService, useValue: encountersApi },
        { provide: AuthService, useValue: auth },
        { provide: ActivatedRoute, useValue: activatedRoute },
      ],
    });

    const fixture = TestBed.createComponent(PatientDetail);
    return { fixture, vitalsApi, encountersApi };
  }

  it('loads vitals and encounter data when the user holds read permission', async () => {
    const { fixture, vitalsApi, encountersApi } = setup(['vitals.read', 'encounter.read']);
    fixture.detectChanges();
    await fixture.whenStable();

    expect(vitalsApi.listByPatient).toHaveBeenCalledWith('patient-1');
    expect(encountersApi.getNotesByPatient).toHaveBeenCalledWith('patient-1');
    expect(encountersApi.getDiagnosesByPatient).toHaveBeenCalledWith('patient-1');
    expect(encountersApi.getPrescriptionsByPatient).toHaveBeenCalledWith('patient-1');
  });

  it('skips vitals/encounter loads when the user lacks read permission', async () => {
    const { fixture, vitalsApi, encountersApi } = setup([]);
    fixture.detectChanges();
    await fixture.whenStable();

    expect(vitalsApi.listByPatient).not.toHaveBeenCalled();
    expect(encountersApi.getNotesByPatient).not.toHaveBeenCalled();
  });
});
