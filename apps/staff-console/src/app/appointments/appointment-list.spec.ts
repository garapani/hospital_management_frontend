import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';
import { AuthService } from '@org/auth';
import { AppointmentList } from './appointment-list.js';
import { AppointmentsApiService, Appointment } from './appointments-api.service.js';
import { UsersApiService, DirectoryEntry } from '../users/users-api.service.js';
import { MasterDataApiService } from '../master-data/master-data-api.service.js';
import { Department } from '../master-data/master-data.model.js';
import { PatientsApiService, Patient } from '../patients/patients-api.service.js';

describe('AppointmentList', () => {
  function fakePatient(overrides: Partial<Patient> = {}): Patient {
    return {
      id: 'patient-1',
      patientNo: 'PAT-1',
      firstName: 'Jane',
      lastName: 'Doe',
      gender: 'Female',
      phoneNumber: '5551234567',
      isActive: true,
      createdAt: '2026-08-01T00:00:00Z',
      updatedAt: '2026-08-01T00:00:00Z',
      ...overrides,
    };
  }

  function setup(
    queryParams: Record<string, string> = {},
    overrides: { doctors?: DirectoryEntry[]; departments?: Department[] } = {},
  ) {
    const appointmentsApi = {
      list: jest.fn().mockReturnValue(of({ data: [], meta: { total: 0, page: 1, limit: 20, totalPages: 0 } })),
      create: jest.fn().mockReturnValue(of({})),
      checkIn: jest.fn().mockReturnValue(of({ id: 'appt-1', status: 'CheckedIn' })),
      complete: jest.fn().mockReturnValue(of({ id: 'appt-1', status: 'Completed' })),
      markNoShow: jest.fn().mockReturnValue(of({ id: 'appt-1', status: 'NoShow' })),
    } as unknown as AppointmentsApiService;
    const usersApi = {
      listDirectory: jest.fn().mockReturnValue(of(overrides.doctors ?? [])),
    } as unknown as UsersApiService;
    const masterDataApi = {
      listDepartments: jest.fn().mockReturnValue(of(overrides.departments ?? [])),
    } as unknown as MasterDataApiService;
    const patientsApi = {
      search: jest.fn().mockReturnValue(of({ data: [], meta: { total: 0, page: 1, limit: 10, totalPages: 0 } })),
      getById: jest.fn().mockReturnValue(of(fakePatient())),
      create: jest.fn().mockReturnValue(of(fakePatient())),
      checkDuplicates: jest.fn().mockReturnValue(of([])),
    } as unknown as PatientsApiService;
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
        { provide: PatientsApiService, useValue: patientsApi },
        { provide: AuthService, useValue: auth },
        { provide: ActivatedRoute, useValue: activatedRoute },
      ],
    });

    const fixture = TestBed.createComponent(AppointmentList);
    return { fixture, appointmentsApi, usersApi, masterDataApi, patientsApi };
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

  it('pre-fills and opens the create modal in Existing Patient mode when navigated with a patientId query param', () => {
    const { fixture } = setup({ patientId: 'patient-1', firstName: 'Jane', lastName: 'Doe', contactNumber: '555-1234' });

    expect(fixture.componentInstance.showCreateModal()).toBe(true);
    expect(fixture.componentInstance.patientMode()).toBe('existing');
    expect(fixture.componentInstance.createForm()).toEqual(
      expect.objectContaining({ patientId: 'patient-1', firstName: 'Jane', lastName: 'Doe', contactNumber: '555-1234' }),
    );
    expect(fixture.componentInstance.patientOptions()).toEqual([{ label: 'Jane Doe', value: 'patient-1' }]);
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

  it('clears the saving flag and keeps the modal open when create errors (Existing Patient mode)', async () => {
    const { fixture, appointmentsApi } = setup();
    fixture.detectChanges();
    await fixture.whenStable();
    (appointmentsApi.create as jest.Mock).mockReturnValue(throwError(() => ({ message: 'boom' })));

    fixture.componentInstance.showCreateModal.set(true);
    fixture.componentInstance.createForm.set({ ...fixture.componentInstance.createForm(), patientId: 'patient-1' });
    fixture.componentInstance.submitCreate();

    expect(fixture.componentInstance.saving()).toBe(false);
    expect(fixture.componentInstance.showCreateModal()).toBe(true);
  });

  it('does nothing in Existing Patient mode when no patient has been selected', () => {
    const { fixture, appointmentsApi } = setup();
    fixture.componentInstance.showCreateModal.set(true);

    fixture.componentInstance.submitCreate();

    expect(appointmentsApi.create).not.toHaveBeenCalled();
    expect(fixture.componentInstance.saving()).toBe(false);
  });

  it('books an appointment for the selected existing patient', () => {
    const { fixture, appointmentsApi } = setup();
    fixture.componentInstance.showCreateModal.set(true);
    fixture.componentInstance.onPatientSelected('patient-1');
    fixture.componentInstance.createForm.set({
      ...fixture.componentInstance.createForm(),
      appointmentDate: '2026-09-05',
      appointmentTime: '10:00',
      appointmentType: 'OPD',
    });

    fixture.componentInstance.submitCreate();

    expect(appointmentsApi.create).toHaveBeenCalledWith(
      expect.objectContaining({ patientId: 'patient-1', firstName: 'Jane', lastName: 'Doe', contactNumber: '5551234567' }),
    );
    expect(fixture.componentInstance.showCreateModal()).toBe(false);
  });

  it('resets the patient identity fields when switching Existing/New Patient mode', () => {
    const { fixture } = setup();
    fixture.componentInstance.createForm.set({
      ...fixture.componentInstance.createForm(),
      patientId: 'patient-1',
      firstName: 'Jane',
      lastName: 'Doe',
      contactNumber: '5551234567',
    });

    fixture.componentInstance.setPatientMode('new');

    expect(fixture.componentInstance.patientMode()).toBe('new');
    expect(fixture.componentInstance.createForm().patientId).toBeUndefined();
    expect(fixture.componentInstance.createForm()).toEqual(
      expect.objectContaining({ firstName: '', lastName: '', contactNumber: '' }),
    );
  });

  it('debounces and searches patients as the picker filter is typed', () => {
    jest.useFakeTimers();
    const { fixture, patientsApi } = setup();
    (patientsApi.search as jest.Mock).mockReturnValue(
      of({ data: [{ id: 'p1', firstName: 'John', lastName: 'Smith', patientNo: 'PAT-2' }], meta: { total: 1, page: 1, limit: 10, totalPages: 1 } }),
    );

    fixture.componentInstance.onPatientSearch('jo');
    expect(patientsApi.search).not.toHaveBeenCalled();
    jest.advanceTimersByTime(300);

    expect(patientsApi.search).toHaveBeenCalledWith({ page: 1, limit: 10, q: 'jo' });
    expect(fixture.componentInstance.patientOptions()).toEqual([{ label: 'John Smith (PAT-2)', value: 'p1' }]);
    jest.useRealTimers();
  });

  it('registers a new patient before booking the appointment when no duplicate is found (New Patient mode)', () => {
    const { fixture, appointmentsApi, patientsApi } = setup();
    fixture.componentInstance.showCreateModal.set(true);
    fixture.componentInstance.setPatientMode('new');
    fixture.componentInstance.createForm.set({
      ...fixture.componentInstance.createForm(),
      firstName: 'New',
      lastName: 'Patient',
      contactNumber: '9998887777',
      appointmentDate: '2026-09-05',
      appointmentTime: '10:00',
      appointmentType: 'OPD',
    });

    fixture.componentInstance.submitCreate();

    expect(patientsApi.checkDuplicates).toHaveBeenCalledWith({ firstName: 'New', lastName: 'Patient', phoneNumber: '9998887777' });
    expect(patientsApi.create).toHaveBeenCalledWith(
      expect.objectContaining({ firstName: 'New', lastName: 'Patient', phoneNumber: '9998887777', gender: 'Unknown' }),
    );
    expect(appointmentsApi.create).toHaveBeenCalledWith(expect.objectContaining({ patientId: 'patient-1' }));
    expect(fixture.componentInstance.showCreateModal()).toBe(false);
  });

  it('shows a duplicate warning instead of registering when matches are found (New Patient mode)', () => {
    const { fixture, appointmentsApi, patientsApi } = setup();
    const match = fakePatient({ id: 'dup-1' });
    (patientsApi.checkDuplicates as jest.Mock).mockReturnValue(of([match]));
    fixture.componentInstance.showCreateModal.set(true);
    fixture.componentInstance.setPatientMode('new');
    fixture.componentInstance.createForm.set({
      ...fixture.componentInstance.createForm(),
      firstName: 'Jane',
      lastName: 'Doe',
      contactNumber: '5551234567',
    });

    fixture.componentInstance.submitCreate();

    expect(fixture.componentInstance.showDuplicateWarning()).toBe(true);
    expect(fixture.componentInstance.duplicateMatches()).toEqual([match]);
    expect(patientsApi.create).not.toHaveBeenCalled();
    expect(appointmentsApi.create).not.toHaveBeenCalled();
    expect(fixture.componentInstance.saving()).toBe(false);
  });

  it('links the appointment to the matched patient instead of creating a duplicate', () => {
    const { fixture, patientsApi } = setup();
    const match = fakePatient({ id: 'dup-1', firstName: 'Jane', lastName: 'Doe', phoneNumber: '5551234567' });
    fixture.componentInstance.showDuplicateWarning.set(true);
    fixture.componentInstance.duplicateMatches.set([match]);

    fixture.componentInstance.useExistingMatch(match);

    expect(fixture.componentInstance.patientMode()).toBe('existing');
    expect(fixture.componentInstance.showDuplicateWarning()).toBe(false);
    expect(fixture.componentInstance.createForm()).toEqual(
      expect.objectContaining({ patientId: 'dup-1', firstName: 'Jane', lastName: 'Doe', contactNumber: '5551234567' }),
    );
    expect(patientsApi.create).not.toHaveBeenCalled();
  });

  it('registers the new patient anyway when the receptionist confirms past the duplicate warning', () => {
    const { fixture, appointmentsApi, patientsApi } = setup();
    fixture.componentInstance.showDuplicateWarning.set(true);
    fixture.componentInstance.duplicateMatches.set([fakePatient()]);
    fixture.componentInstance.createForm.set({
      ...fixture.componentInstance.createForm(),
      firstName: 'Jane',
      lastName: 'Doe',
      contactNumber: '5551234567',
    });

    fixture.componentInstance.proceedWithDuplicate();

    expect(patientsApi.create).toHaveBeenCalledWith(expect.objectContaining({ allowDuplicate: true }));
    expect(appointmentsApi.create).toHaveBeenCalled();
    expect(fixture.componentInstance.showDuplicateWarning()).toBe(false);
  });

  it('shows an error and stops saving when patient registration fails (New Patient mode)', () => {
    const { fixture, appointmentsApi, patientsApi } = setup();
    (patientsApi.create as jest.Mock).mockReturnValue(throwError(() => ({ status: 500, message: 'boom' })));
    fixture.componentInstance.showCreateModal.set(true);
    fixture.componentInstance.setPatientMode('new');
    fixture.componentInstance.createForm.set({
      ...fixture.componentInstance.createForm(),
      firstName: 'New',
      lastName: 'Patient',
      contactNumber: '9998887777',
    });

    fixture.componentInstance.submitCreate();

    expect(fixture.componentInstance.saving()).toBe(false);
    expect(appointmentsApi.create).not.toHaveBeenCalled();
  });

  it('exposes a fixed appointment type option list', () => {
    const { fixture } = setup();
    expect(fixture.componentInstance.appointmentTypes.map((t) => t.value)).toContain('OPD');
    expect(fixture.componentInstance.appointmentTypes.map((t) => t.value)).toContain('Follow-up');
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
        { provide: PatientsApiService, useValue: { search: jest.fn(), getById: jest.fn(), create: jest.fn(), checkDuplicates: jest.fn() } },
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

  it('completes an appointment and reloads the current page', async () => {
    const { fixture, appointmentsApi } = setup();
    fixture.detectChanges();
    await fixture.whenStable();

    fixture.componentInstance.complete({ id: 'appt-1' } as Appointment);

    expect(appointmentsApi.complete).toHaveBeenCalledWith('appt-1');
    expect(fixture.componentInstance.completeActionId()).toBeNull();
  });

  it('clears the complete action flag when complete errors', async () => {
    const { fixture, appointmentsApi } = setup();
    fixture.detectChanges();
    await fixture.whenStable();
    (appointmentsApi.complete as jest.Mock).mockReturnValue(throwError(() => new Error('boom')));

    fixture.componentInstance.complete({ id: 'appt-1' } as Appointment);

    expect(fixture.componentInstance.completeActionId()).toBeNull();
  });

  it('marks an appointment as a no-show and reloads the current page', async () => {
    const { fixture, appointmentsApi } = setup();
    fixture.detectChanges();
    await fixture.whenStable();

    fixture.componentInstance.markNoShow({ id: 'appt-1' } as Appointment);

    expect(appointmentsApi.markNoShow).toHaveBeenCalledWith('appt-1');
    expect(fixture.componentInstance.noShowActionId()).toBeNull();
  });

  it('clears the no-show action flag when marking no-show errors', async () => {
    const { fixture, appointmentsApi } = setup();
    fixture.detectChanges();
    await fixture.whenStable();
    (appointmentsApi.markNoShow as jest.Mock).mockReturnValue(throwError(() => new Error('boom')));

    fixture.componentInstance.markNoShow({ id: 'appt-1' } as Appointment);

    expect(fixture.componentInstance.noShowActionId()).toBeNull();
  });
});
