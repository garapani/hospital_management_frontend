import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';
import { AuthService } from '@org/auth';
import { DashboardHome } from './dashboard-home.js';
import { AppointmentsApiService, Appointment } from '../appointments/appointments-api.service.js';
import { NursingApiService } from '../nursing/nursing-api.service.js';
import { NursingTask } from '../nursing/nursing.model.js';
import { PharmacyDispensingApiService } from '../pharmacy/pharmacy-dispensing-api.service.js';
import { PendingPharmacyItem } from '../pharmacy/pharmacy-dispensing.model.js';
import { LabApiService, LabRequisition } from '../lab/lab-api.service.js';
import { RadiologyApiService } from '../radiology/radiology-api.service.js';
import { RadiologyRequisition } from '../radiology/radiology.model.js';
import { DirectoryResolverService } from '../directory/directory-resolver.service.js';

function fakeAppointment(overrides: Partial<Appointment> = {}): Appointment {
  return {
    id: 'appt-1',
    patientId: 'patient-1',
    firstName: 'Jane',
    lastName: 'Doe',
    contactNumber: '9998887777',
    appointmentDate: '2026-09-01',
    appointmentTime: '10:00',
    doctorId: null,
    departmentId: null,
    appointmentType: 'Consultation',
    status: 'Scheduled',
    reason: null,
    cancelledRemarks: null,
    createdAt: '2026-09-01T00:00:00Z',
    updatedAt: '2026-09-01T00:00:00Z',
    ...overrides,
  };
}

function fakeTask(overrides: Partial<NursingTask> = {}): NursingTask {
  return {
    id: 'task-1',
    admissionId: 'adm-1',
    taskType: 'Vitals Check',
    description: 'Q4H vitals',
    dueAt: null,
    status: 'Pending',
    assignedTo: null,
    completedBy: null,
    completedAt: null,
    ...overrides,
  };
}

function fakePendingPharmacyItem(overrides: Partial<PendingPharmacyItem> = {}): PendingPharmacyItem {
  return {
    id: 'item-1',
    orderId: 'order-1',
    itemType: 'Medication',
    itemDescription: 'Paracetamol 500mg',
    priority: 'Routine',
    status: 'Pending',
    completedBy: null,
    completedAt: null,
    cancelReason: null,
    createdAt: '2026-09-01T08:00:00Z',
    updatedAt: '2026-09-01T08:00:00Z',
    patientId: 'patient-1',
    ...overrides,
  };
}

function fakeLabRequisition(overrides: Partial<LabRequisition> = {}): LabRequisition {
  return {
    id: 'req-1',
    orderItemId: 'orderitem-1',
    patientId: 'patient-1',
    testId: 'test-1',
    requisitionNumber: 'REQ-0001',
    specimenType: 'Blood',
    status: 'Pending',
    sampleCollectedBy: null,
    sampleCollectedAt: null,
    verifiedBy: null,
    verifiedAt: null,
    cancelReason: null,
    createdAt: '2026-09-01T08:00:00Z',
    updatedAt: '2026-09-01T08:00:00Z',
    ...overrides,
  };
}

function fakeRadiologyRequisition(overrides: Partial<RadiologyRequisition> = {}): RadiologyRequisition {
  return {
    id: 'radreq-1',
    orderItemId: 'orderitem-1',
    patientId: 'patient-1',
    imagingItemId: 'imaging-1',
    requisitionNumber: 'RAD-0001',
    status: 'Pending',
    scannedBy: null,
    scannedAt: null,
    reportText: null,
    indication: null,
    performerId: null,
    reportEnteredBy: null,
    reportEnteredAt: null,
    verifiedBy: null,
    verifiedAt: null,
    cancelReason: null,
    createdAt: '2026-09-01T08:00:00Z',
    updatedAt: '2026-09-01T08:00:00Z',
    ...overrides,
  };
}

describe('DashboardHome', () => {
  function setup(options: {
    roles?: string[];
    permissions?: string[];
    sub?: string;
    appointments?: Appointment[];
    tasks?: NursingTask[];
    pendingDispenseItems?: PendingPharmacyItem[];
    pendingRequisitions?: LabRequisition[];
    pendingScans?: RadiologyRequisition[];
    appointmentsError?: boolean;
    tasksError?: boolean;
    dispenseItemsError?: boolean;
    requisitionsError?: boolean;
    scansError?: boolean;
  } = {}) {
    const { roles = [], permissions = [], sub = 'user-1' } = options;
    const appointmentsApi = {
      list: jest.fn().mockReturnValue(
        options.appointmentsError
          ? throwError(() => new Error('boom'))
          : of({ data: options.appointments ?? [], meta: { total: (options.appointments ?? []).length, page: 1, limit: 100, totalPages: 1 } }),
      ),
    } as unknown as AppointmentsApiService;
    const nursingApi = {
      listTasks: jest.fn().mockReturnValue(
        options.tasksError
          ? throwError(() => new Error('boom'))
          : of({ data: options.tasks ?? [], meta: { total: (options.tasks ?? []).length, page: 1, limit: 100, totalPages: 1 } }),
      ),
    } as unknown as NursingApiService;
    const pharmacyApi = {
      listPendingItems: jest.fn().mockReturnValue(
        options.dispenseItemsError
          ? throwError(() => new Error('boom'))
          : of({
              data: options.pendingDispenseItems ?? [],
              meta: { total: (options.pendingDispenseItems ?? []).length, page: 1, limit: 100, totalPages: 1 },
            }),
      ),
    } as unknown as PharmacyDispensingApiService;
    const labApi = {
      listRequisitions: jest.fn().mockReturnValue(
        options.requisitionsError
          ? throwError(() => new Error('boom'))
          : of({
              data: options.pendingRequisitions ?? [],
              meta: { total: (options.pendingRequisitions ?? []).length, page: 1, limit: 100, totalPages: 1 },
            }),
      ),
    } as unknown as LabApiService;
    const radiologyApi = {
      list: jest.fn().mockReturnValue(
        options.scansError
          ? throwError(() => new Error('boom'))
          : of({
              data: options.pendingScans ?? [],
              meta: { total: (options.pendingScans ?? []).length, page: 1, limit: 100, totalPages: 1 },
            }),
      ),
    } as unknown as RadiologyApiService;
    const auth = {
      currentUser: () => ({ sub, roles }),
      hasPermission: (permission: string) => permissions.includes(permission),
    } as unknown as AuthService;
    const directoryResolver = { resolve: jest.fn().mockReturnValue(of(null)) } as unknown as DirectoryResolverService;

    TestBed.configureTestingModule({
      imports: [DashboardHome],
      providers: [
        provideRouter([]),
        { provide: AppointmentsApiService, useValue: appointmentsApi },
        { provide: NursingApiService, useValue: nursingApi },
        { provide: PharmacyDispensingApiService, useValue: pharmacyApi },
        { provide: LabApiService, useValue: labApi },
        { provide: RadiologyApiService, useValue: radiologyApi },
        { provide: AuthService, useValue: auth },
        { provide: DirectoryResolverService, useValue: directoryResolver },
      ],
    });

    const fixture = TestBed.createComponent(DashboardHome);
    return { fixture, appointmentsApi, nursingApi, pharmacyApi, labApi, radiologyApi };
  }

  it('shows nothing scoped and makes no calls for a role with no dashboard widget', async () => {
    const { fixture, appointmentsApi, nursingApi, pharmacyApi, labApi, radiologyApi } = setup({
      roles: ['Auditor/Compliance'],
      permissions: [],
    });
    fixture.detectChanges();
    await fixture.whenStable();

    expect(fixture.componentInstance.hasNoWidgets()).toBe(true);
    expect(appointmentsApi.list).not.toHaveBeenCalled();
    expect(nursingApi.listTasks).not.toHaveBeenCalled();
    expect(pharmacyApi.listPendingItems).not.toHaveBeenCalled();
    expect(labApi.listRequisitions).not.toHaveBeenCalled();
    expect(radiologyApi.list).not.toHaveBeenCalled();
  });

  it("loads today's appointments and tallies status counts for a Receptionist", async () => {
    const appointments = [
      fakeAppointment({ id: 'a1', status: 'Scheduled' }),
      fakeAppointment({ id: 'a2', status: 'Scheduled' }),
      fakeAppointment({ id: 'a3', status: 'CheckedIn' }),
    ];
    const { fixture, appointmentsApi } = setup({
      roles: ['Receptionist / Front Desk'],
      permissions: ['appointment.read'],
      appointments,
    });
    fixture.detectChanges();
    await fixture.whenStable();

    expect(fixture.componentInstance.isReceptionist()).toBe(true);
    expect(appointmentsApi.list).toHaveBeenCalledWith(expect.objectContaining({ date: fixture.componentInstance.today, limit: 100 }));
    expect(fixture.componentInstance.todaysAppointments()).toHaveLength(3);
    expect(fixture.componentInstance.appointmentStatusCounts()).toEqual({ Scheduled: 2, CheckedIn: 1 });
  });

  it("filters to the signed-in doctor's own appointments for a Doctor", async () => {
    const { fixture, appointmentsApi } = setup({
      roles: ['Doctor'],
      permissions: ['appointment.read'],
      sub: 'doctor-42',
      appointments: [fakeAppointment({ doctorId: 'doctor-42' })],
    });
    fixture.detectChanges();
    await fixture.whenStable();

    expect(fixture.componentInstance.isDoctor()).toBe(true);
    expect(appointmentsApi.list).toHaveBeenCalledWith(
      expect.objectContaining({ date: fixture.componentInstance.today, doctorId: 'doctor-42', limit: 100 }),
    );
    expect(fixture.componentInstance.myAppointmentsToday()).toHaveLength(1);
  });

  it('loads pending/in-progress tasks for a Nurse, sorted by due date with unscheduled tasks last', async () => {
    const tasks = [
      fakeTask({ id: 't1', dueAt: '2026-09-01T14:00:00Z' }),
      fakeTask({ id: 't2', dueAt: null }),
      fakeTask({ id: 't3', dueAt: '2026-09-01T09:00:00Z' }),
      fakeTask({ id: 't4', status: 'Completed' }),
      fakeTask({ id: 't5', status: 'Cancelled' }),
    ];
    const { fixture, nursingApi } = setup({ roles: ['Nurse'], permissions: ['nursing.read'], tasks });
    fixture.detectChanges();
    await fixture.whenStable();

    expect(fixture.componentInstance.isNurse()).toBe(true);
    expect(nursingApi.listTasks).toHaveBeenCalledWith(undefined, 1, 100);
    expect(fixture.componentInstance.pendingTasks().map((t) => t.id)).toEqual(['t3', 't1', 't2']);
  });

  it('loads items pending dispensing for a Pharmacist', async () => {
    const pendingDispenseItems = [fakePendingPharmacyItem({ id: 'item-1' }), fakePendingPharmacyItem({ id: 'item-2' })];
    const { fixture, pharmacyApi } = setup({
      roles: ['Pharmacist'],
      permissions: ['pharmacy.read'],
      pendingDispenseItems,
    });
    fixture.detectChanges();
    await fixture.whenStable();

    expect(fixture.componentInstance.isPharmacist()).toBe(true);
    expect(pharmacyApi.listPendingItems).toHaveBeenCalledWith({ status: 'Pending', limit: 100 });
    expect(fixture.componentInstance.pendingDispenseItems()).toHaveLength(2);
  });

  it('loads requisitions pending sample collection for a Lab Technician', async () => {
    const pendingRequisitions = [fakeLabRequisition({ id: 'req-1' }), fakeLabRequisition({ id: 'req-2' })];
    const { fixture, labApi } = setup({
      roles: ['Lab Technician'],
      permissions: ['lab.read'],
      pendingRequisitions,
    });
    fixture.detectChanges();
    await fixture.whenStable();

    expect(fixture.componentInstance.isLabTechnician()).toBe(true);
    expect(labApi.listRequisitions).toHaveBeenCalledWith({ status: 'Pending', limit: 100 });
    expect(fixture.componentInstance.pendingRequisitions()).toHaveLength(2);
  });

  it('loads requisitions pending a scan for a Radiology Technician', async () => {
    const pendingScans = [fakeRadiologyRequisition({ id: 'radreq-1' }), fakeRadiologyRequisition({ id: 'radreq-2' })];
    const { fixture, radiologyApi } = setup({
      roles: ['Radiology Technician'],
      permissions: ['radiology.read'],
      pendingScans,
    });
    fixture.detectChanges();
    await fixture.whenStable();

    expect(fixture.componentInstance.isRadiologyTechnician()).toBe(true);
    expect(radiologyApi.list).toHaveBeenCalledWith({ status: 'Pending', limit: 100 });
    expect(fixture.componentInstance.pendingScans()).toHaveLength(2);
  });

  it('skips a widget load when the role matches but the permission does not', async () => {
    const { fixture, appointmentsApi } = setup({ roles: ['Doctor'], permissions: [] });
    fixture.detectChanges();
    await fixture.whenStable();

    expect(appointmentsApi.list).not.toHaveBeenCalled();
  });

  it('renders multiple widgets for a user holding more than one role', async () => {
    const { fixture, appointmentsApi, nursingApi } = setup({
      roles: ['Doctor', 'Nurse'],
      permissions: ['appointment.read', 'nursing.read'],
    });
    fixture.detectChanges();
    await fixture.whenStable();

    expect(fixture.componentInstance.isDoctor()).toBe(true);
    expect(fixture.componentInstance.isNurse()).toBe(true);
    expect(appointmentsApi.list).toHaveBeenCalled();
    expect(nursingApi.listTasks).toHaveBeenCalled();
  });

  it('clears loading flags without throwing when the appointments/tasks/dispensing/requisitions/scans lookups error', async () => {
    const { fixture } = setup({
      roles: ['Receptionist / Front Desk', 'Nurse', 'Pharmacist', 'Lab Technician', 'Radiology Technician'],
      permissions: ['appointment.read', 'nursing.read', 'pharmacy.read', 'lab.read', 'radiology.read'],
      appointmentsError: true,
      tasksError: true,
      dispenseItemsError: true,
      requisitionsError: true,
      scansError: true,
    });
    fixture.detectChanges();
    await fixture.whenStable();

    expect(fixture.componentInstance.appointmentsLoading()).toBe(false);
    expect(fixture.componentInstance.tasksLoading()).toBe(false);
    expect(fixture.componentInstance.dispenseItemsLoading()).toBe(false);
    expect(fixture.componentInstance.requisitionsLoading()).toBe(false);
    expect(fixture.componentInstance.scansLoading()).toBe(false);
  });
});
