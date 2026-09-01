import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';
import { AuthService } from '@org/auth';
import { AppointmentList } from './appointment-list.js';
import { AppointmentsApiService, Appointment } from './appointments-api.service.js';
import { UsersApiService, DirectoryEntry } from '../users/users-api.service.js';
import { MasterDataApiService } from '../master-data/master-data-api.service.js';
import { Department } from '../master-data/master-data.model.js';

describe('AppointmentList', () => {
  function setup(
    queryParams: Record<string, string> = {},
    overrides: { doctors?: DirectoryEntry[]; departments?: Department[] } = {},
  ) {
    const appointmentsApi = {
      list: jest.fn().mockReturnValue(of({ data: [], meta: { total: 0, page: 1, limit: 20, totalPages: 0 } })),
      create: jest.fn().mockReturnValue(of({})),
      checkIn: jest.fn().mockReturnValue(of({ id: 'appt-1', status: 'CheckedIn' })),
    } as unknown as AppointmentsApiService;
    const usersApi = {
      listDirectory: jest.fn().mockReturnValue(of(overrides.doctors ?? [])),
    } as unknown as UsersApiService;
    const masterDataApi = {
      listDepartments: jest.fn().mockReturnValue(of(overrides.departments ?? [])),
    } as unknown as MasterDataApiService;
    const auth = { hasPermission: () => true } as unknown as AuthService;
    const activatedRoute = {
      queryParamMap: of(convertToParamMap(queryParams)),
    } as unknown as ActivatedRoute;

    TestBed.configureTestingModule({
      imports: [AppointmentList],
      providers: [
        provideRouter([]),
        { provide: AppointmentsApiService, useValue: appointmentsApi },
        { provide: UsersApiService, useValue: usersApi },
        { provide: MasterDataApiService, useValue: masterDataApi },
        { provide: AuthService, useValue: auth },
        { provide: ActivatedRoute, useValue: activatedRoute },
      ],
    });

    const fixture = TestBed.createComponent(AppointmentList);
    return { fixture, appointmentsApi, usersApi, masterDataApi };
  }

  function fakeDepartment(overrides: Partial<Department> = {}): Department {
    return {
      id: 'dept-1',
      departmentCode: 'CARD',
      departmentName: 'Cardiology',
      description: null,
      isAppointmentApplicable: true,
      parentDepartmentId: null,
      roomNumber: null,
      noticeText: null,
      isActive: true,
      createdAt: '2026-08-01T00:00:00Z',
      updatedAt: '2026-08-01T00:00:00Z',
      ...overrides,
    };
  }

  it("loads today's appointments on init, page 1", async () => {
    const { fixture, appointmentsApi } = setup();
    fixture.detectChanges();
    await fixture.whenStable();

    expect(appointmentsApi.list).toHaveBeenCalledTimes(1);
    const call = (appointmentsApi.list as jest.Mock).mock.calls[0][0];
    expect(call.date).toBe(fixture.componentInstance.dateFilter());
    expect(call.page).toBe(1);
    expect(call.limit).toBe(fixture.componentInstance.pageSize());
    expect(fixture.componentInstance.appointments()).toEqual([]);
  });

  it('requests the correct page when the table lazy-loads a later page', async () => {
    const { fixture, appointmentsApi } = setup();
    fixture.detectChanges();
    await fixture.whenStable();

    fixture.componentInstance.onLazyLoad({ first: 20 });

    const call = (appointmentsApi.list as jest.Mock).mock.calls[1][0];
    expect(call.page).toBe(3);
    expect(fixture.componentInstance.firstRecord()).toBe(20);
  });

  it('resets to page 1 when filters are applied', async () => {
    const { fixture, appointmentsApi } = setup();
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.componentInstance.onLazyLoad({ first: 20 });

    fixture.componentInstance.applyFilters();

    expect(fixture.componentInstance.firstRecord()).toBe(0);
    const call = (appointmentsApi.list as jest.Mock).mock.calls[2][0];
    expect(call.page).toBe(1);
  });

  it('pre-fills and opens the create modal when navigated with a patientId query param', () => {
    const { fixture } = setup({ patientId: 'patient-1', firstName: 'Jane', lastName: 'Doe', contactNumber: '555-1234' });

    expect(fixture.componentInstance.showCreateModal()).toBe(true);
    expect(fixture.componentInstance.createForm()).toEqual(
      expect.objectContaining({ patientId: 'patient-1', firstName: 'Jane', lastName: 'Doe', contactNumber: '555-1234' }),
    );
  });

  it('does not open the create modal when no patientId query param is present', () => {
    const { fixture } = setup();
    expect(fixture.componentInstance.showCreateModal()).toBe(false);
  });

  it('clears the loading flag when the list request errors', async () => {
    const { fixture, appointmentsApi } = setup();
    (appointmentsApi.list as jest.Mock).mockReturnValue(throwError(() => new Error('boom')));

    fixture.detectChanges();
    await fixture.whenStable();

    expect(fixture.componentInstance.loading()).toBe(false);
  });

  it('clears the saving flag and keeps the modal open when create errors', async () => {
    const { fixture, appointmentsApi } = setup();
    fixture.detectChanges();
    await fixture.whenStable();
    (appointmentsApi.create as jest.Mock).mockReturnValue(throwError(() => new Error('boom')));

    fixture.componentInstance.showCreateModal.set(true);
    fixture.componentInstance.submitCreate();

    expect(fixture.componentInstance.saving()).toBe(false);
    expect(fixture.componentInstance.showCreateModal()).toBe(true);
  });

  it('checks in an appointment and reloads the current page', async () => {
    const { fixture, appointmentsApi } = setup();
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.componentInstance.onLazyLoad({ first: 20 });
    const callsBeforeCheckIn = (appointmentsApi.list as jest.Mock).mock.calls.length;

    fixture.componentInstance.checkIn({ id: 'appt-1' } as Appointment);

    expect(appointmentsApi.checkIn).toHaveBeenCalledWith('appt-1');
    expect(fixture.componentInstance.checkInActionId()).toBeNull();
    const call = (appointmentsApi.list as jest.Mock).mock.calls[callsBeforeCheckIn][0];
    expect(call.page).toBe(3);
  });

  it('loads doctor and department options for the pickers, keeping only appointment-applicable departments', async () => {
    const doctors: DirectoryEntry[] = [{ id: 'doc-1', displayName: 'Dr. Amara', username: 'dr.amara' }];
    const departments: Department[] = [
      fakeDepartment({ id: 'dept-1', departmentName: 'Cardiology', isAppointmentApplicable: true }),
      fakeDepartment({ id: 'dept-2', departmentName: 'Central Sterile Supply', isAppointmentApplicable: false }),
    ];
    const { fixture, usersApi, masterDataApi } = setup({}, { doctors, departments });
    fixture.detectChanges();
    await fixture.whenStable();

    expect(usersApi.listDirectory).toHaveBeenCalledWith('Doctor');
    expect(fixture.componentInstance.doctorOptions()).toEqual([{ label: 'Dr. Amara', value: 'doc-1' }]);
    expect(masterDataApi.listDepartments).toHaveBeenCalled();
    expect(fixture.componentInstance.departmentOptions()).toEqual([{ label: 'Cardiology', value: 'dept-1' }]);
  });

  it('leaves the doctor/department pickers empty rather than failing the page when their lookups error', async () => {
    const usersApi = { listDirectory: jest.fn().mockReturnValue(throwError(() => new Error('boom'))) } as unknown as UsersApiService;
    const masterDataApi = { listDepartments: jest.fn().mockReturnValue(throwError(() => new Error('boom'))) } as unknown as MasterDataApiService;
    TestBed.configureTestingModule({
      imports: [AppointmentList],
      providers: [
        provideRouter([]),
        { provide: AppointmentsApiService, useValue: { list: jest.fn().mockReturnValue(of({ data: [], meta: { total: 0, page: 1, limit: 20, totalPages: 0 } })) } },
        { provide: UsersApiService, useValue: usersApi },
        { provide: MasterDataApiService, useValue: masterDataApi },
        { provide: AuthService, useValue: { hasPermission: () => true } },
        { provide: ActivatedRoute, useValue: { queryParamMap: of(convertToParamMap({})) } },
      ],
    });
    const fixture = TestBed.createComponent(AppointmentList);
    fixture.detectChanges();
    await fixture.whenStable();

    expect(fixture.componentInstance.doctorOptions()).toEqual([]);
    expect(fixture.componentInstance.departmentOptions()).toEqual([]);
    expect(fixture.componentInstance.loading()).toBe(false);
  });

  it('clears the check-in action flag when check-in errors', async () => {
    const { fixture, appointmentsApi } = setup();
    fixture.detectChanges();
    await fixture.whenStable();
    (appointmentsApi.checkIn as jest.Mock).mockReturnValue(throwError(() => new Error('boom')));

    fixture.componentInstance.checkIn({ id: 'appt-1' } as Appointment);

    expect(fixture.componentInstance.checkInActionId()).toBeNull();
  });
});
