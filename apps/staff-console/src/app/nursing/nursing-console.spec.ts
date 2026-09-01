import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap } from '@angular/router';
import { of, Subject } from 'rxjs';
import { MessageService, ConfirmationService, Confirmation } from 'primeng/api';
import { ApiError } from '@org/api-client';
import { AuthService } from '@org/auth';
import { NursingConsole } from './nursing-console.js';
import { NursingApiService } from './nursing-api.service.js';
import { PatientsApiService } from '../patients/patients-api.service.js';
import { AdmissionsApiService } from '../admissions/admissions-api.service.js';
import { DirectoryResolverService } from '../directory/directory-resolver.service.js';

describe('NursingConsole', () => {
  function setup(canManage = true, queryParams: Record<string, string> = {}) {
    const api = {
      listTasks: jest.fn().mockReturnValue(of({ data: [], meta: { total: 0, page: 1, limit: 20, totalPages: 0 } })),
      createTask: jest.fn().mockReturnValue(of({})),
      startTask: jest.fn().mockReturnValue(of({})),
      completeTask: jest.fn().mockReturnValue(of({})),
      cancelTask: jest.fn().mockReturnValue(of({})),
      listAdministrations: jest.fn().mockReturnValue(of({ data: [], meta: { total: 0, page: 1, limit: 20, totalPages: 0 } })),
      createAdministration: jest.fn().mockReturnValue(of({})),
      administer: jest.fn().mockReturnValue(of({})),
      skipAdministration: jest.fn().mockReturnValue(of({})),
      listHandoffNotes: jest.fn().mockReturnValue(of({ data: [], meta: { total: 0, page: 1, limit: 20, totalPages: 0 } })),
      createHandoffNote: jest.fn().mockReturnValue(of({})),
      acknowledgeHandoffNote: jest.fn().mockReturnValue(of({})),
    } as unknown as NursingApiService;
    const messageService = { add: jest.fn() } as unknown as MessageService;
    const confirmationService = {
      confirm: jest.fn((c: Confirmation) => c.accept?.()),
    } as unknown as ConfirmationService;
    const auth = { hasPermission: () => canManage } as unknown as AuthService;
    const activatedRoute = {
      queryParamMap: of(convertToParamMap(queryParams)),
    } as unknown as ActivatedRoute;
    const patientsApi = {
      getById: jest.fn().mockReturnValue(of({ id: 'patient-1', firstName: 'Jane', lastName: 'Doe', patientNo: 'PAT-1' })),
      search: jest.fn().mockReturnValue(of({ data: [], meta: { total: 0, page: 1, limit: 10, totalPages: 0 } })),
    } as unknown as PatientsApiService;
    const admissionsApi = {
      getById: jest.fn().mockReturnValue(of({ id: 'adm-from-link', patientId: 'patient-1', wardId: 'ward-1', bedId: 'bed-1' })),
      list: jest.fn().mockReturnValue(of({ data: [], meta: { total: 0, page: 1, limit: 1, totalPages: 0 } })),
    } as unknown as AdmissionsApiService;
    const directoryResolver = { resolve: jest.fn().mockReturnValue(of(null)) } as unknown as DirectoryResolverService;

    TestBed.configureTestingModule({
      imports: [NursingConsole],
      providers: [
        { provide: NursingApiService, useValue: api },
        { provide: MessageService, useValue: messageService },
        { provide: ConfirmationService, useValue: confirmationService },
        { provide: AuthService, useValue: auth },
        { provide: ActivatedRoute, useValue: activatedRoute },
        { provide: PatientsApiService, useValue: patientsApi },
        { provide: AdmissionsApiService, useValue: admissionsApi },
        { provide: DirectoryResolverService, useValue: directoryResolver },
      ],
    });

    const fixture = TestBed.createComponent(NursingConsole);
    return { fixture, api, messageService, confirmationService, patientsApi, admissionsApi };
  }

  it('loads tasks and administrations on init, page 1', async () => {
    const { fixture, api } = setup();
    fixture.detectChanges();
    await fixture.whenStable();

    expect(api.listTasks).toHaveBeenCalledWith(undefined, 1, 20);
    expect(api.listAdministrations).toHaveBeenCalledWith(undefined, 1, 20);
  });

  it('filters by admission ID', async () => {
    const { fixture, api } = setup();
    fixture.detectChanges();
    await fixture.whenStable();

    fixture.componentInstance.admissionIdFilter.set('adm-1');
    fixture.componentInstance.applyFilter();
    await fixture.whenStable();

    expect(api.listTasks).toHaveBeenCalledWith('adm-1', 1, 20);
    expect(api.listAdministrations).toHaveBeenCalledWith('adm-1', 1, 20);
  });

  it("pre-fills and applies the admissionId filter when arriving via an Admission's Nursing Tasks/MAR link", async () => {
    const { fixture, api } = setup(true, { admissionId: 'adm-from-link' });
    fixture.detectChanges();
    await fixture.whenStable();

    expect(fixture.componentInstance.admissionIdFilter()).toBe('adm-from-link');
    expect(api.listTasks).toHaveBeenCalledWith('adm-from-link', 1, 20);
    expect(api.listAdministrations).toHaveBeenCalledWith('adm-from-link', 1, 20);
  });

  it('re-applies the admissionId filter on a query-params-only navigation, since Angular reuses this component instance', async () => {
    const api = {
      listTasks: jest.fn().mockReturnValue(of({ data: [], meta: { total: 0, page: 1, limit: 20, totalPages: 0 } })),
      listAdministrations: jest.fn().mockReturnValue(of({ data: [], meta: { total: 0, page: 1, limit: 20, totalPages: 0 } })),
      listHandoffNotes: jest.fn().mockReturnValue(of({ data: [], meta: { total: 0, page: 1, limit: 20, totalPages: 0 } })),
    } as unknown as NursingApiService;
    const queryParamMap$ = new Subject<ReturnType<typeof convertToParamMap>>();
    const patientsApi = {
      getById: jest.fn().mockReturnValue(of({ id: 'patient-1', firstName: 'Jane', lastName: 'Doe', patientNo: 'PAT-1' })),
      search: jest.fn().mockReturnValue(of({ data: [], meta: { total: 0, page: 1, limit: 10, totalPages: 0 } })),
    } as unknown as PatientsApiService;
    const admissionsApi = {
      getById: jest.fn().mockReturnValue(of({ id: 'adm-1', patientId: 'patient-1', wardId: 'ward-1', bedId: 'bed-1' })),
      list: jest.fn().mockReturnValue(of({ data: [], meta: { total: 0, page: 1, limit: 1, totalPages: 0 } })),
    } as unknown as AdmissionsApiService;
    const directoryResolver = { resolve: jest.fn().mockReturnValue(of(null)) } as unknown as DirectoryResolverService;
    TestBed.configureTestingModule({
      imports: [NursingConsole],
      providers: [
        { provide: NursingApiService, useValue: api },
        { provide: MessageService, useValue: { add: jest.fn() } },
        { provide: ConfirmationService, useValue: { confirm: jest.fn() } },
        { provide: AuthService, useValue: { hasPermission: () => true } },
        { provide: ActivatedRoute, useValue: { queryParamMap: queryParamMap$ } },
        { provide: PatientsApiService, useValue: patientsApi },
        { provide: AdmissionsApiService, useValue: admissionsApi },
        { provide: DirectoryResolverService, useValue: directoryResolver },
      ],
    });
    const fixture = TestBed.createComponent(NursingConsole);
    fixture.detectChanges();
    queryParamMap$.next(convertToParamMap({ admissionId: 'adm-1' }));
    await fixture.whenStable();
    expect(fixture.componentInstance.admissionIdFilter()).toBe('adm-1');

    queryParamMap$.next(convertToParamMap({ admissionId: 'adm-2' }));
    await fixture.whenStable();

    expect(fixture.componentInstance.admissionIdFilter()).toBe('adm-2');
    expect(api.listTasks).toHaveBeenCalledWith('adm-2', 1, 20);
  });

  it("resolves a selected patient's active admission and applies it as the filter", async () => {
    const { fixture, api, admissionsApi } = setup();
    fixture.detectChanges();
    await fixture.whenStable();
    (admissionsApi.list as jest.Mock).mockReturnValue(
      of({ data: [{ id: 'adm-resolved', patientId: 'patient-1', wardId: 'ward-1', bedId: 'bed-1' }], meta: { total: 1, page: 1, limit: 1, totalPages: 1 } }),
    );

    fixture.componentInstance.onPatientSelected('patient-1');
    await fixture.whenStable();

    expect(admissionsApi.list).toHaveBeenCalledWith({ patientId: 'patient-1', status: 'Admitted', page: 1, limit: 1 });
    expect(fixture.componentInstance.admissionIdFilter()).toBe('adm-resolved');
    expect(fixture.componentInstance.selectedAdmission()?.id).toBe('adm-resolved');
    expect(api.listTasks).toHaveBeenCalledWith('adm-resolved', 1, 20);
  });

  it('warns and clears the filter when the selected patient has no active admission', async () => {
    const { fixture, messageService } = setup();
    fixture.detectChanges();
    await fixture.whenStable();

    fixture.componentInstance.onPatientSelected('patient-no-admission');
    await fixture.whenStable();

    expect(fixture.componentInstance.admissionIdFilter()).toBe('');
    expect(fixture.componentInstance.selectedAdmission()).toBeNull();
    expect(messageService.add).toHaveBeenCalledWith(expect.objectContaining({ severity: 'warn', summary: 'No active admission' }));
  });

  it('clears the filter and context when the patient picker is cleared', async () => {
    const { fixture, api } = setup();
    fixture.detectChanges();
    await fixture.whenStable();

    fixture.componentInstance.selectedAdmission.set({ id: 'adm-1', patientId: 'patient-1', wardId: 'ward-1', bedId: 'bed-1' } as never);
    fixture.componentInstance.admissionIdFilter.set('adm-1');

    fixture.componentInstance.onPatientSelected(null);
    await fixture.whenStable();

    expect(fixture.componentInstance.admissionIdFilter()).toBe('');
    expect(fixture.componentInstance.selectedAdmission()).toBeNull();
    expect(api.listTasks).toHaveBeenLastCalledWith(undefined, 1, 20);
  });

  it('debounces and searches patients as the picker filter is typed', () => {
    jest.useFakeTimers();
    const { fixture, patientsApi } = setup();
    (patientsApi.search as jest.Mock).mockReturnValue(
      of({ data: [{ id: 'p1', firstName: 'John', lastName: 'Smith', patientNo: 'PAT-2' }], meta: { total: 1, page: 1, limit: 10, totalPages: 1 } }),
    );

    fixture.componentInstance.onPatientFilterSearch('jo');
    expect(patientsApi.search).not.toHaveBeenCalled();
    jest.advanceTimersByTime(300);

    expect(patientsApi.search).toHaveBeenCalledWith({ page: 1, limit: 10, q: 'jo' });
    expect(fixture.componentInstance.patientOptions()).toEqual([{ label: 'John Smith (PAT-2)', value: 'p1' }]);
    jest.useRealTimers();
  });

  it("resolves the admission context (patient/ward) when arriving via an Admission's link", async () => {
    const { fixture, admissionsApi, patientsApi } = setup(true, { admissionId: 'adm-from-link' });
    fixture.detectChanges();
    await fixture.whenStable();

    expect(admissionsApi.getById).toHaveBeenCalledWith('adm-from-link');
    expect(patientsApi.getById).toHaveBeenCalledWith('patient-1');
    expect(fixture.componentInstance.selectedAdmission()?.id).toBe('adm-from-link');
    expect(fixture.componentInstance.patientOptions()).toEqual([{ label: 'Jane Doe (PAT-1)', value: 'patient-1' }]);
  });

  it('creates a task and toasts success', async () => {
    const { fixture, api, messageService } = setup();
    fixture.detectChanges();
    await fixture.whenStable();

    fixture.componentInstance.openTaskModal();
    fixture.componentInstance.taskForm.set({ admissionId: 'adm-1', taskType: 'Vitals Check', description: 'Q4H vitals' });
    fixture.componentInstance.submitTask();
    await fixture.whenStable();

    expect(api.createTask).toHaveBeenCalledWith(
      expect.objectContaining({ admissionId: 'adm-1', taskType: 'Vitals Check', description: 'Q4H vitals' }),
    );
    expect(fixture.componentInstance.showTaskModal()).toBe(false);
    expect(messageService.add).toHaveBeenCalledWith(expect.objectContaining({ severity: 'success', summary: 'Task created' }));
  });

  it('completes a task', async () => {
    const { fixture, api, messageService } = setup();
    fixture.detectChanges();
    await fixture.whenStable();

    fixture.componentInstance.completeTask({ id: 't1' } as never);
    await fixture.whenStable();

    expect(api.completeTask).toHaveBeenCalledWith('t1');
    expect(messageService.add).toHaveBeenCalledWith(expect.objectContaining({ severity: 'success', summary: 'Task completed' }));
  });

  it('asks for confirmation before cancelling a task', async () => {
    const { fixture, api, confirmationService } = setup();
    fixture.detectChanges();
    await fixture.whenStable();

    fixture.componentInstance.cancelTask({ id: 't1', taskType: 'Vitals Check' } as never);

    expect(confirmationService.confirm).toHaveBeenCalled();
    expect(api.cancelTask).toHaveBeenCalledWith('t1');
  });

  it('asks for confirmation before administering a dose', async () => {
    const { fixture, api, messageService, confirmationService } = setup();
    fixture.detectChanges();
    await fixture.whenStable();

    fixture.componentInstance.administer({ id: 'a1', drugName: 'Paracetamol', dose: '500mg' } as never);
    await fixture.whenStable();

    expect(confirmationService.confirm).toHaveBeenCalled();
    expect(api.administer).toHaveBeenCalledWith('a1');
    expect(messageService.add).toHaveBeenCalledWith(expect.objectContaining({ severity: 'success', summary: 'Dose administered' }));
  });

  it('requires a reason before skipping a dose', async () => {
    const { fixture, api } = setup();
    fixture.detectChanges();
    await fixture.whenStable();

    fixture.componentInstance.openSkipModal({ id: 'a1', drugName: 'Paracetamol' } as never);
    fixture.componentInstance.confirmSkip();

    expect(api.skipAdministration).not.toHaveBeenCalled();

    fixture.componentInstance.skipNotes.set('Patient refused');
    fixture.componentInstance.confirmSkip();
    await fixture.whenStable();

    expect(api.skipAdministration).toHaveBeenCalledWith('a1', 'Patient refused');
    expect(fixture.componentInstance.showSkipModal()).toBe(false);
  });

  it('shows an error toast when creating a task fails', async () => {
    const { fixture, api } = setup();
    (api.createTask as jest.Mock).mockReturnValue({
      subscribe: (handlers: { error: (err: ApiError) => void }) =>
        handlers.error({ status: 400, message: 'Invalid admission', body: null }),
    });
    fixture.detectChanges();
    await fixture.whenStable();

    fixture.componentInstance.taskForm.set({ admissionId: 'bad', taskType: 'X', description: 'Y' });
    fixture.componentInstance.submitTask();
    await fixture.whenStable();

    expect(fixture.componentInstance.taskError()).toBe('Invalid admission');
  });

  it('hides mutating actions for a read-only user', async () => {
    const { fixture } = setup(false);
    fixture.detectChanges();
    await fixture.whenStable();

    expect(fixture.componentInstance.canManage).toBe(false);
  });

  it('loads shift handoff notes on init, page 1', async () => {
    const { fixture, api } = setup();
    fixture.detectChanges();
    await fixture.whenStable();

    expect(api.listHandoffNotes).toHaveBeenCalledWith(undefined, 1, 20);
  });

  it('creates a shift handoff note and toasts success', async () => {
    const { fixture, api, messageService } = setup();
    fixture.detectChanges();
    await fixture.whenStable();

    fixture.componentInstance.openHandoffModal();
    fixture.componentInstance.handoffForm.set({ admissionId: 'adm-1', shift: 'Night', note: 'Recheck vitals at 2am.' });
    fixture.componentInstance.submitHandoffNote();
    await fixture.whenStable();

    expect(api.createHandoffNote).toHaveBeenCalledWith(
      expect.objectContaining({ admissionId: 'adm-1', shift: 'Night', note: 'Recheck vitals at 2am.' }),
    );
    expect(fixture.componentInstance.showHandoffModal()).toBe(false);
    expect(messageService.add).toHaveBeenCalledWith(expect.objectContaining({ severity: 'success', summary: 'Handoff note added' }));
  });

  it('shows an error toast when creating a handoff note fails', async () => {
    const { fixture, api } = setup();
    (api.createHandoffNote as jest.Mock).mockReturnValue({
      subscribe: (handlers: { error: (err: ApiError) => void }) =>
        handlers.error({ status: 400, message: 'Invalid admission', body: null }),
    });
    fixture.detectChanges();
    await fixture.whenStable();

    fixture.componentInstance.handoffForm.set({ admissionId: 'bad', note: 'x' });
    fixture.componentInstance.submitHandoffNote();
    await fixture.whenStable();

    expect(fixture.componentInstance.handoffError()).toBe('Invalid admission');
  });

  it('acknowledges a shift handoff note', async () => {
    const { fixture, api, messageService } = setup();
    fixture.detectChanges();
    await fixture.whenStable();

    fixture.componentInstance.acknowledgeHandoffNote({ id: 'n1' } as never);
    await fixture.whenStable();

    expect(api.acknowledgeHandoffNote).toHaveBeenCalledWith('n1');
    expect(messageService.add).toHaveBeenCalledWith(expect.objectContaining({ severity: 'success', summary: 'Note acknowledged' }));
  });

  it('pages the handoff notes list', async () => {
    const { fixture, api } = setup();
    fixture.detectChanges();
    await fixture.whenStable();

    fixture.componentInstance.onHandoffPageChange({ first: 20, rows: 20, page: 1, pageCount: 2 });
    await fixture.whenStable();

    expect(api.listHandoffNotes).toHaveBeenCalledWith(undefined, 2, 20);
  });
});
