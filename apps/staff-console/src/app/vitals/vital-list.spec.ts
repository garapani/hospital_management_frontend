import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { MessageService, ConfirmationService, Confirmation } from 'primeng/api';
import { AuthService } from '@org/auth';
import { VitalList } from './vital-list.js';
import { VitalsApiService, Vital } from './vitals-api.service.js';
import { PatientsApiService, Patient } from '../patients/patients-api.service.js';

describe('VitalList', () => {
  function setup() {
    const vitalsApi = {
      listByPatient: jest.fn().mockReturnValue(of([])),
      create: jest.fn().mockReturnValue(of({})),
      voidVital: jest.fn().mockReturnValue(of({ success: true })),
    } as unknown as VitalsApiService;
    const patientsApi = {
      search: jest.fn().mockReturnValue(of({ data: [], meta: { total: 0 } })),
    } as unknown as PatientsApiService;
    const auth = { hasPermission: () => true } as unknown as AuthService;
    // No <p-confirmDialog> is rendered in these component tests, so simulate the user accepting
    // every confirmation immediately rather than asserting against the dialog UI.
    const confirmationService = {
      confirm: jest.fn((c: Confirmation) => c.accept?.()),
    } as unknown as ConfirmationService;

    TestBed.configureTestingModule({
      imports: [VitalList],
      providers: [
        { provide: VitalsApiService, useValue: vitalsApi },
        { provide: PatientsApiService, useValue: patientsApi },
        { provide: AuthService, useValue: auth },
        MessageService,
        { provide: ConfirmationService, useValue: confirmationService },
      ],
    });

    const fixture = TestBed.createComponent(VitalList);
    return { fixture, vitalsApi, patientsApi };
  }

  it('searches patients and loads vitals for the selected patient', async () => {
    const { fixture, patientsApi, vitalsApi } = setup();
    fixture.detectChanges();
    await fixture.whenStable();

    const patient: Patient = {
      id: 'p1',
      patientNo: 'PAT-0001-00001',
      firstName: 'Asha',
      lastName: 'Kumar',
      gender: 'Female',
      phoneNumber: '9876543210',
      isActive: true,
      createdAt: '',
      updatedAt: '',
    };
    patientsApi.search = jest.fn().mockReturnValue(of({ data: [patient], meta: { total: 1 } }));

    fixture.componentInstance.searchQuery.set('Asha');
    fixture.componentInstance.searchPatients();
    await fixture.whenStable();

    expect(patientsApi.search).toHaveBeenCalledWith({ page: 1, limit: 10, q: 'Asha' });
    expect(fixture.componentInstance.patientResults()).toEqual([patient]);

    fixture.componentInstance.selectPatient(patient);
    await fixture.whenStable();

    expect(fixture.componentInstance.selectedPatient()).toBe(patient);
    expect(vitalsApi.listByPatient).toHaveBeenCalledWith('p1');
    expect(fixture.componentInstance.searchQuery()).toBe('');
    expect(fixture.componentInstance.patientResults()).toEqual([]);
  });

  it('creates a vital reading for the selected patient and reloads the list', async () => {
    const { fixture, vitalsApi } = setup();
    fixture.detectChanges();
    await fixture.whenStable();

    const patient: Patient = {
      id: 'p2',
      patientNo: 'PAT-0001-00002',
      firstName: 'Ravi',
      lastName: 'Nair',
      gender: 'Male',
      isActive: true,
      createdAt: '',
      updatedAt: '',
    };
    fixture.componentInstance.selectedPatient.set(patient);
    fixture.componentInstance.openCreateModal();
    fixture.componentInstance.createForm.set({ patientId: 'p2', temperature: 98.6, pulse: 72 });

    fixture.componentInstance.submitCreate();
    await fixture.whenStable();

    expect(vitalsApi.create).toHaveBeenCalledWith({ patientId: 'p2', temperature: 98.6, pulse: 72 });
    expect(vitalsApi.listByPatient).toHaveBeenCalledWith('p2');
    expect(fixture.componentInstance.showCreateModal()).toBe(false);
  });

  it('voids a vital and reloads the patient list', async () => {
    const { fixture, vitalsApi } = setup();
    fixture.detectChanges();
    await fixture.whenStable();

    const vital: Vital = {
      id: 'v1',
      patientId: 'p3',
      recordedAt: '2025-01-01T10:00:00.000Z',
      createdAt: '2025-01-01T10:00:00.000Z',
    };
    fixture.componentInstance.voidVital(vital);
    await fixture.whenStable();

    expect(vitalsApi.voidVital).toHaveBeenCalledWith('v1');
    expect(vitalsApi.listByPatient).toHaveBeenCalledWith('p3');
  });

  it('resets patient search via resetPatientSearch()', async () => {
    const { fixture } = setup();
    fixture.detectChanges();
    await fixture.whenStable();

    const samplePatient: Patient = {
      id: 'p1', patientNo: 'PAT-1', firstName: 'John', lastName: 'Doe', gender: 'Male', isActive: true, createdAt: '', updatedAt: '',
    };
    fixture.componentInstance.searchQuery.set('John');
    fixture.componentInstance.patientResults.set([samplePatient]);

    fixture.componentInstance.resetPatientSearch();
    expect(fixture.componentInstance.searchQuery()).toBe('');
    expect(fixture.componentInstance.patientResults()).toEqual([]);
  });

  it('correctly categorizes vital severity based on physiological thresholds', () => {
    const { fixture } = setup();
    const normal: Vital = {
      id: 'v1', patientId: 'p1', recordedAt: '', createdAt: '',
      spO2: 98, temperature: 36.8, bpSystolic: 120, pulse: 72,
    };
    expect(fixture.componentInstance.vitalSeverity(normal)).toBe('success');

    const lowSpO2: Vital = { ...normal, spO2: 92 };
    expect(fixture.componentInstance.vitalSeverity(lowSpO2)).toBe('warn');

    const fever: Vital = { ...normal, temperature: 38.5 };
    expect(fixture.componentInstance.vitalSeverity(fever)).toBe('warn');

    const hypertension: Vital = { ...normal, bpSystolic: 155 };
    expect(fixture.componentInstance.vitalSeverity(hypertension)).toBe('warn');
  });
});

