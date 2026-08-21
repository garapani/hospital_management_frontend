import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { AuthService } from '@org/auth';
import { EncounterList } from './encounter-list.js';
import { EncountersApiService } from './encounters-api.service.js';
import { PatientsApiService, Patient } from '../patients/patients-api.service.js';

describe('EncounterList', () => {
  function setup() {
    const encountersApi = {
      notesByPatient: jest.fn().mockReturnValue(of([])),
      diagnosesByPatient: jest.fn().mockReturnValue(of([])),
      prescriptionsByPatient: jest.fn().mockReturnValue(of([])),
      createNote: jest.fn().mockReturnValue(of({})),
      createDiagnosis: jest.fn().mockReturnValue(of({})),
      createPrescription: jest.fn().mockReturnValue(of({})),
      deleteDiagnosis: jest.fn().mockReturnValue(of({ success: true })),
      deletePrescription: jest.fn().mockReturnValue(of({ success: true })),
    } as unknown as EncountersApiService;
    const patientsApi = {
      search: jest.fn().mockReturnValue(of({ data: [], meta: { total: 0 } })),
    } as unknown as PatientsApiService;
    const auth = {
      hasPermission: () => true,
      currentUser: () => ({ sub: 'doctor-1' }),
    } as unknown as AuthService;

    TestBed.configureTestingModule({
      imports: [EncounterList],
      providers: [
        { provide: EncountersApiService, useValue: encountersApi },
        { provide: PatientsApiService, useValue: patientsApi },
        { provide: AuthService, useValue: auth },
      ],
    });

    const fixture = TestBed.createComponent(EncounterList);
    return { fixture, encountersApi, patientsApi };
  }

  const patient: Patient = {
    id: 'p1',
    patientNo: 'PAT-0001-00001',
    firstName: 'Meera',
    lastName: 'Iyer',
    gender: 'Female',
    isActive: true,
    createdAt: '',
    updatedAt: '',
  };

  it('loads notes, diagnoses, and prescriptions when a patient is selected', async () => {
    const { fixture, encountersApi } = setup();
    fixture.detectChanges();
    await fixture.whenStable();

    fixture.componentInstance.selectPatient(patient);
    await fixture.whenStable();

    expect(encountersApi.notesByPatient).toHaveBeenCalledWith('p1');
    expect(encountersApi.diagnosesByPatient).toHaveBeenCalledWith('p1');
    expect(encountersApi.prescriptionsByPatient).toHaveBeenCalledWith('p1');
  });

  it('creates a clinical note with the current user as doctorId', async () => {
    const { fixture, encountersApi } = setup();
    fixture.detectChanges();
    await fixture.whenStable();

    fixture.componentInstance.selectedPatient.set(patient);
    fixture.componentInstance.openNoteModal();
    fixture.componentInstance.noteForm.update((v) => ({ ...v, chiefComplaint: 'Fever' }));
    fixture.componentInstance.submitNote();
    await fixture.whenStable();

    expect(encountersApi.createNote).toHaveBeenCalledWith(
      expect.objectContaining({ patientId: 'p1', doctorId: 'doctor-1', chiefComplaint: 'Fever' }),
    );
    expect(fixture.componentInstance.showNoteModal()).toBe(false);
  });

  it('creates a diagnosis and a prescription for the selected patient', async () => {
    const { fixture, encountersApi } = setup();
    fixture.detectChanges();
    await fixture.whenStable();

    fixture.componentInstance.selectedPatient.set(patient);
    fixture.componentInstance.openDiagnosisModal();
    fixture.componentInstance.diagnosisForm.update((v) => ({ ...v, description: 'URTI' }));
    fixture.componentInstance.submitDiagnosis();
    await fixture.whenStable();
    expect(encountersApi.createDiagnosis).toHaveBeenCalledWith(
      expect.objectContaining({ patientId: 'p1', description: 'URTI' }),
    );

    fixture.componentInstance.openPrescriptionModal();
    fixture.componentInstance.prescriptionForm.update((v) => ({ ...v, medicationName: 'Paracetamol' }));
    fixture.componentInstance.submitPrescription();
    await fixture.whenStable();
    expect(encountersApi.createPrescription).toHaveBeenCalledWith(
      expect.objectContaining({ patientId: 'p1', medicationName: 'Paracetamol' }),
    );
  });
});
