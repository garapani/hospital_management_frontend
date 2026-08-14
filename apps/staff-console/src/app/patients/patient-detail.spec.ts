import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router, convertToParamMap, provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';
import { AuthService } from '@org/auth';
import { PatientDetail } from './patient-detail.js';
import { PatientsApiService, Patient } from './patients-api.service.js';
import { VitalsApiService } from './vitals-api.service.js';
import { EncountersApiService, ClinicalNote } from './encounters-api.service.js';

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

  function setup(permissions: string[], patientsApiOverrides: Partial<PatientsApiService> = {}) {
    const patientsApi = {
      getById: jest.fn().mockReturnValue(of(patient)),
      update: jest.fn().mockReturnValue(of(patient)),
      ...patientsApiOverrides,
    } as unknown as PatientsApiService;
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
    return { fixture, vitalsApi, encountersApi, patientsApi };
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

  it('navigates to Appointments with the patient pre-filled when booking', async () => {
    const { fixture } = setup([]);
    fixture.detectChanges();
    await fixture.whenStable();

    const router = TestBed.inject(Router);
    const navigateSpy = jest.spyOn(router, 'navigate').mockResolvedValue(true);

    fixture.componentInstance.bookAppointment(patient);

    expect(navigateSpy).toHaveBeenCalledWith(['/clinical/appointments'], {
      queryParams: { patientId: 'patient-1', firstName: 'Jane', lastName: 'Doe', contactNumber: undefined },
    });
  });

  it('switches to the Notes tab and opens Add Note when starting an encounter', async () => {
    const { fixture } = setup(['encounter.read', 'encounter.manage']);
    fixture.detectChanges();
    await fixture.whenStable();

    fixture.componentInstance.startEncounter();

    expect(fixture.componentInstance.activeTab()).toBe('notes');
    expect(fixture.componentInstance.showNoteModal()).toBe(true);
  });

  it('pre-fills the edit form from the loaded patient and opens the modal', async () => {
    const { fixture } = setup([]);
    fixture.detectChanges();
    await fixture.whenStable();

    fixture.componentInstance.openEditModal();

    expect(fixture.componentInstance.showEditModal()).toBe(true);
    expect(fixture.componentInstance.editForm()).toEqual(
      expect.objectContaining({ firstName: 'Jane', lastName: 'Doe', gender: 'Female' }),
    );
  });

  it('saves the edited profile and refreshes the displayed patient', async () => {
    const updated: Patient = { ...patient, firstName: 'Janet' };
    const { fixture, patientsApi } = setup([], { update: jest.fn().mockReturnValue(of(updated)) });
    fixture.detectChanges();
    await fixture.whenStable();

    fixture.componentInstance.openEditModal();
    fixture.componentInstance.editForm.set({ ...fixture.componentInstance.editForm(), firstName: 'Janet' });
    fixture.componentInstance.submitEdit();

    expect(patientsApi.update).toHaveBeenCalledWith('patient-1', expect.objectContaining({ firstName: 'Janet' }));
    expect(fixture.componentInstance.patient()?.firstName).toBe('Janet');
    expect(fixture.componentInstance.showEditModal()).toBe(false);
  });

  it('clears the saving flag and keeps the modal open when the edit save fails', async () => {
    const { fixture } = setup([], { update: jest.fn().mockReturnValue(throwError(() => new Error('boom'))) });
    fixture.detectChanges();
    await fixture.whenStable();

    fixture.componentInstance.openEditModal();
    fixture.componentInstance.submitEdit();

    expect(fixture.componentInstance.editSaving()).toBe(false);
    expect(fixture.componentInstance.showEditModal()).toBe(true);
  });

  it('paginates the notes list client-side, 10 per page', async () => {
    const manyNotes: ClinicalNote[] = Array.from({ length: 12 }, (_, i) => ({
      id: `note-${i}`,
      patientId: 'patient-1',
      doctorId: 'doctor-1',
      status: 'Final',
      createdAt: '2026-08-01T00:00:00Z',
      updatedAt: '2026-08-01T00:00:00Z',
    }));
    const encountersApi = {
      getNotesByPatient: jest.fn().mockReturnValue(of(manyNotes)),
      getDiagnosesByPatient: jest.fn().mockReturnValue(of([])),
      getPrescriptionsByPatient: jest.fn().mockReturnValue(of([])),
    } as unknown as EncountersApiService;
    TestBed.configureTestingModule({
      imports: [PatientDetail],
      providers: [
        provideRouter([]),
        { provide: PatientsApiService, useValue: { getById: jest.fn().mockReturnValue(of(patient)) } },
        { provide: VitalsApiService, useValue: { listByPatient: jest.fn().mockReturnValue(of([])) } },
        { provide: EncountersApiService, useValue: encountersApi },
        { provide: AuthService, useValue: { hasPermission: (p: string) => p === 'encounter.read', currentUser: () => null } },
        { provide: ActivatedRoute, useValue: { paramMap: of(convertToParamMap({ id: 'patient-1' })) } },
      ],
    });
    const fixture = TestBed.createComponent(PatientDetail);
    fixture.detectChanges();
    await fixture.whenStable();

    expect(fixture.componentInstance.pagedNotes()).toHaveLength(10);
    expect(fixture.componentInstance.pagedNotes()[0].id).toBe('note-0');

    fixture.componentInstance.notesFirst.set(10);

    expect(fixture.componentInstance.pagedNotes()).toHaveLength(2);
    expect(fixture.componentInstance.pagedNotes()[0].id).toBe('note-10');
  });
});
