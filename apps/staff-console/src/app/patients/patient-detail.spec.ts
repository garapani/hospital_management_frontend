import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router, convertToParamMap, provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';
import { ConfirmationService } from 'primeng/api';
import { AuthService } from '@org/auth';
import { PatientDetail } from './patient-detail.js';
import { PatientsApiService, Patient } from './patients-api.service.js';
import { VitalsApiService, Vital } from './vitals-api.service.js';
import { EncountersApiService, ClinicalNote, Diagnosis } from './encounters-api.service.js';
import { AppointmentsApiService } from '../appointments/appointments-api.service.js';
import { AdmissionsApiService } from '../admissions/admissions-api.service.js';
import { OrdersApiService } from '../orders/orders-api.service.js';
import { InvoicesApiService } from '../billing/invoices-api.service.js';

describe('PatientDetail', () => {
  const patient: Patient = {
    id: 'patient-1',
    patientNo: 'PMI-1',
    firstName: 'Jane',
    lastName: 'Doe',
    gender: 'Female',
    allergies: 'Penicillin',
    isActive: true,
    createdAt: '2026-08-01T00:00:00Z',
    updatedAt: '2026-08-01T00:00:00Z',
  };

  function setup(
    permissions: string[],
    patientsApiOverrides: Partial<PatientsApiService> = {},
    vitalsApiOverrides: Partial<VitalsApiService> = {},
  ) {
    const patientsApi = {
      getById: jest.fn().mockReturnValue(of(patient)),
      update: jest.fn().mockReturnValue(of(patient)),
      ...patientsApiOverrides,
    } as unknown as PatientsApiService;
    const vitalsApi = {
      listByPatient: jest.fn().mockReturnValue(of([])),
      ...vitalsApiOverrides,
    } as unknown as VitalsApiService;
    const encountersApi = {
      getNotesByPatient: jest.fn().mockReturnValue(of({ data: [], meta: { total: 0, page: 1, limit: 200, totalPages: 0 } })),
      getDiagnosesByPatient: jest.fn().mockReturnValue(of({ data: [], meta: { total: 0, page: 1, limit: 200, totalPages: 0 } })),
      getPrescriptionsByPatient: jest.fn().mockReturnValue(of({ data: [], meta: { total: 0, page: 1, limit: 200, totalPages: 0 } })),
      deleteDiagnosis: jest.fn().mockReturnValue(of({ success: true })),
      deletePrescription: jest.fn().mockReturnValue(of({ success: true })),
    } as unknown as EncountersApiService;
    const appointmentsApi = {
      list: jest.fn().mockReturnValue(of({ data: [], meta: { total: 0, page: 1, limit: 10, totalPages: 0 } })),
    } as unknown as AppointmentsApiService;
    const admissionsApi = {
      list: jest.fn().mockReturnValue(of({ data: [], meta: { total: 0, page: 1, limit: 10, totalPages: 0 } })),
    } as unknown as AdmissionsApiService;
    const ordersApi = {
      list: jest.fn().mockReturnValue(of({ data: [], meta: { total: 0, page: 1, limit: 10, totalPages: 0 } })),
    } as unknown as OrdersApiService;
    const invoicesApi = {
      list: jest.fn().mockReturnValue(of({ data: [], total: 0, page: 1, limit: 10 })),
    } as unknown as InvoicesApiService;
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
        { provide: AppointmentsApiService, useValue: appointmentsApi },
        { provide: AdmissionsApiService, useValue: admissionsApi },
        { provide: OrdersApiService, useValue: ordersApi },
        { provide: InvoicesApiService, useValue: invoicesApi },
        { provide: AuthService, useValue: auth },
        { provide: ActivatedRoute, useValue: activatedRoute },
      ],
    });

    const fixture = TestBed.createComponent(PatientDetail);
    return { fixture, vitalsApi, encountersApi, patientsApi, appointmentsApi, admissionsApi, ordersApi, invoicesApi };
  }

  it('loads vitals and encounter data when the user holds read permission', async () => {
    const { fixture, vitalsApi, encountersApi } = setup(['vitals.read', 'encounter.read']);
    fixture.detectChanges();
    await fixture.whenStable();

    expect(vitalsApi.listByPatient).toHaveBeenCalledWith('patient-1');
    expect(encountersApi.getNotesByPatient).toHaveBeenCalledWith('patient-1', 200);
    expect(encountersApi.getDiagnosesByPatient).toHaveBeenCalledWith('patient-1', 200);
    expect(encountersApi.getPrescriptionsByPatient).toHaveBeenCalledWith('patient-1', 200);
  });

  it('skips vitals/encounter loads when the user lacks read permission', async () => {
    const { fixture, vitalsApi, encountersApi } = setup([]);
    fixture.detectChanges();
    await fixture.whenStable();

    expect(vitalsApi.listByPatient).not.toHaveBeenCalled();
    expect(encountersApi.getNotesByPatient).not.toHaveBeenCalled();
  });

  it('loads appointments, admissions, orders and invoices when the user holds read permission', async () => {
    const { fixture, appointmentsApi, admissionsApi, ordersApi, invoicesApi } = setup([
      'appointment.read',
      'admission.read',
      'order.read',
      'billing.manage',
    ]);
    fixture.detectChanges();
    await fixture.whenStable();

    expect(appointmentsApi.list).toHaveBeenCalledWith({ patientId: 'patient-1', limit: 200 });
    expect(admissionsApi.list).toHaveBeenCalledWith({ patientId: 'patient-1', limit: 200 });
    expect(ordersApi.list).toHaveBeenCalledWith({ patientId: 'patient-1', limit: 200 });
    expect(invoicesApi.list).toHaveBeenCalledWith({ patientId: 'patient-1', limit: 200 });
  });

  it('skips appointments/admissions/orders/invoices loads when the user lacks read permission', async () => {
    const { fixture, appointmentsApi, admissionsApi, ordersApi, invoicesApi } = setup([]);
    fixture.detectChanges();
    await fixture.whenStable();

    expect(appointmentsApi.list).not.toHaveBeenCalled();
    expect(admissionsApi.list).not.toHaveBeenCalled();
    expect(ordersApi.list).not.toHaveBeenCalled();
    expect(invoicesApi.list).not.toHaveBeenCalled();
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
      expect.objectContaining({ firstName: 'Jane', lastName: 'Doe', gender: 'Female', allergies: 'Penicillin' }),
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

  it('saves an updated allergies value', async () => {
    const updated: Patient = { ...patient, allergies: 'No known allergies' };
    const { fixture, patientsApi } = setup([], { update: jest.fn().mockReturnValue(of(updated)) });
    fixture.detectChanges();
    await fixture.whenStable();

    fixture.componentInstance.openEditModal();
    fixture.componentInstance.editForm.set({ ...fixture.componentInstance.editForm(), allergies: 'No known allergies' });
    fixture.componentInstance.submitEdit();

    expect(patientsApi.update).toHaveBeenCalledWith('patient-1', expect.objectContaining({ allergies: 'No known allergies' }));
    expect(fixture.componentInstance.patient()?.allergies).toBe('No known allergies');
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
      getNotesByPatient: jest.fn().mockReturnValue(of({ data: manyNotes, meta: { total: 12, page: 1, limit: 200, totalPages: 1 } })),
      getDiagnosesByPatient: jest.fn().mockReturnValue(of({ data: [], meta: { total: 0, page: 1, limit: 200, totalPages: 0 } })),
      getPrescriptionsByPatient: jest.fn().mockReturnValue(of({ data: [], meta: { total: 0, page: 1, limit: 200, totalPages: 0 } })),
    } as unknown as EncountersApiService;
    TestBed.configureTestingModule({
      imports: [PatientDetail],
      providers: [
        provideRouter([]),
        { provide: PatientsApiService, useValue: { getById: jest.fn().mockReturnValue(of(patient)) } },
        { provide: VitalsApiService, useValue: { listByPatient: jest.fn().mockReturnValue(of([])) } },
        { provide: EncountersApiService, useValue: encountersApi },
        {
          provide: AppointmentsApiService,
          useValue: { list: jest.fn().mockReturnValue(of({ data: [], meta: { total: 0, page: 1, limit: 10, totalPages: 0 } })) },
        },
        {
          provide: AdmissionsApiService,
          useValue: { list: jest.fn().mockReturnValue(of({ data: [], meta: { total: 0, page: 1, limit: 10, totalPages: 0 } })) },
        },
        {
          provide: OrdersApiService,
          useValue: { list: jest.fn().mockReturnValue(of({ data: [], meta: { total: 0, page: 1, limit: 10, totalPages: 0 } })) },
        },
        { provide: InvoicesApiService, useValue: { list: jest.fn().mockReturnValue(of({ data: [], total: 0, page: 1, limit: 10 })) } },
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

  it('opens Record Vitals blank when no prior vitals exist', async () => {
    const { fixture } = setup(['vitals.read', 'vitals.manage']);
    fixture.detectChanges();
    await fixture.whenStable();

    fixture.componentInstance.openVitalModal();

    expect(fixture.componentInstance.vitalForm()).toEqual({});
  });

  it('carries forward only height/weight from the most recent reading, not point-in-time measurements', async () => {
    const latestVital: Vital = {
      id: 'vital-1',
      patientId: 'patient-1',
      appointmentId: 'appt-old',
      height: 170,
      weight: 65,
      temperature: 37.1,
      pulse: 72,
      bpSystolic: 120,
      bpDiastolic: 80,
      respiratoryRate: 16,
      spO2: 98,
      painScale: 0,
      triageNotes: 'Stable',
      recordedAt: '2026-08-01T00:00:00Z',
      createdAt: '2026-08-01T00:00:00Z',
      updatedAt: '2026-08-01T00:00:00Z',
    };
    const { fixture } = setup(['vitals.read', 'vitals.manage'], {}, {
      listByPatient: jest.fn().mockReturnValue(of([latestVital])),
    });
    fixture.detectChanges();
    await fixture.whenStable();

    fixture.componentInstance.openVitalModal();

    expect(fixture.componentInstance.vitalForm()).toEqual({
      height: 170,
      weight: 65,
    });
  });

  it('asks for confirmation before deleting a diagnosis, and reloads the list once confirmed', async () => {
    const { fixture, encountersApi } = setup(['encounter.read']);
    fixture.detectChanges();
    await fixture.whenStable();

    const confirmationService = fixture.debugElement.injector.get(ConfirmationService);
    const confirmSpy = jest.spyOn(confirmationService, 'confirm');

    const diagnosis = { id: 'diag-1', description: 'URTI' } as Diagnosis;
    fixture.componentInstance.removeDiagnosis(diagnosis);

    expect(confirmSpy).toHaveBeenCalled();
    expect(encountersApi.deleteDiagnosis).not.toHaveBeenCalled();

    // Simulate the user accepting the confirm dialog.
    confirmSpy.mock.calls[0][0].accept?.();

    expect(encountersApi.deleteDiagnosis).toHaveBeenCalledWith('diag-1');
    // Called once on initial load, once more after the confirmed delete.
    expect(encountersApi.getDiagnosesByPatient).toHaveBeenCalledTimes(2);
  });
});
