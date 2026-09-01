import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';
import { AuthService } from '@org/auth';
import { DashboardHome } from './dashboard-home.js';
import { AppointmentsApiService, Appointment } from '../appointments/appointments-api.service.js';
import { NursingApiService } from '../nursing/nursing-api.service.js';
import { NursingTask } from '../nursing/nursing.model.js';

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

describe('DashboardHome', () => {
  function setup(options: {
    roles?: string[];
    permissions?: string[];
    sub?: string;
    appointments?: Appointment[];
    tasks?: NursingTask[];
    appointmentsError?: boolean;
    tasksError?: boolean;
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
    const auth = {
      currentUser: () => ({ sub, roles }),
      hasPermission: (permission: string) => permissions.includes(permission),
    } as unknown as AuthService;

    TestBed.configureTestingModule({
      imports: [DashboardHome],
      providers: [
        provideRouter([]),
        { provide: AppointmentsApiService, useValue: appointmentsApi },
        { provide: NursingApiService, useValue: nursingApi },
        { provide: AuthService, useValue: auth },
      ],
    });

    const fixture = TestBed.createComponent(DashboardHome);
    return { fixture, appointmentsApi, nursingApi };
  }

  it('shows nothing scoped and makes no calls for a role with no dashboard widget', async () => {
    const { fixture, appointmentsApi, nursingApi } = setup({ roles: ['Lab Technician'], permissions: ['lab.read'] });
    fixture.detectChanges();
    await fixture.whenStable();

    expect(fixture.componentInstance.hasNoWidgets()).toBe(true);
    expect(appointmentsApi.list).not.toHaveBeenCalled();
    expect(nursingApi.listTasks).not.toHaveBeenCalled();
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

  it('clears loading flags without throwing when the appointments/tasks lookups error', async () => {
    const { fixture } = setup({
      roles: ['Receptionist / Front Desk', 'Nurse'],
      permissions: ['appointment.read', 'nursing.read'],
      appointmentsError: true,
      tasksError: true,
    });
    fixture.detectChanges();
    await fixture.whenStable();

    expect(fixture.componentInstance.appointmentsLoading()).toBe(false);
    expect(fixture.componentInstance.tasksLoading()).toBe(false);
  });
});
