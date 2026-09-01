import { TestBed } from '@angular/core/testing';
import { Subject, of } from 'rxjs';
import { MessageService, ConfirmationService, Confirmation } from 'primeng/api';
import { ApiError } from '@org/api-client';
import { AuthService } from '@org/auth';
import { OtList } from './ot-list.js';
import { OtApiService } from './ot-api.service.js';
import { PatientsApiService } from '../patients/patients-api.service.js';
import { DirectoryResolverService } from '../directory/directory-resolver.service.js';

describe('OtList', () => {
  function setup(canManage = true) {
    const api = {
      list: jest.fn().mockReturnValue(of({ data: [], meta: { total: 0, page: 1, limit: 20, totalPages: 0 } })),
      findOne: jest.fn().mockReturnValue(of({})),
      schedule: jest.fn().mockReturnValue(of({ id: 's1', surgeryNumber: 'OT-0001' })),
      start: jest.fn().mockReturnValue(of({})),
      complete: jest.fn().mockReturnValue(of({})),
      cancel: jest.fn().mockReturnValue(of({})),
    } as unknown as OtApiService;
    const messageService = { add: jest.fn() } as unknown as MessageService;
    const confirmationService = {
      confirm: jest.fn((c: Confirmation) => c.accept?.()),
    } as unknown as ConfirmationService;
    const auth = { hasPermission: () => canManage } as unknown as AuthService;
    const patientsApi = {
      search: jest.fn().mockReturnValue(of({ data: [], meta: { total: 0, page: 1, limit: 10, totalPages: 0 } })),
    } as unknown as PatientsApiService;
    const directoryResolver = { resolve: jest.fn().mockReturnValue(of(null)) } as unknown as DirectoryResolverService;

    TestBed.configureTestingModule({
      imports: [OtList],
      providers: [
        { provide: OtApiService, useValue: api },
        { provide: MessageService, useValue: messageService },
        { provide: ConfirmationService, useValue: confirmationService },
        { provide: AuthService, useValue: auth },
        { provide: PatientsApiService, useValue: patientsApi },
        { provide: DirectoryResolverService, useValue: directoryResolver },
      ],
    });

    const fixture = TestBed.createComponent(OtList);
    return { fixture, api, messageService, confirmationService, patientsApi };
  }

  it('loads surgeries on init', async () => {
    const { fixture, api } = setup();
    fixture.detectChanges();
    await fixture.whenStable();

    expect(api.list).toHaveBeenCalledWith({ patientId: undefined, status: undefined, page: 1, limit: 20 });
  });

  it('schedules a surgery and toasts success', async () => {
    const { fixture, api, messageService } = setup();
    fixture.detectChanges();
    await fixture.whenStable();

    fixture.componentInstance.openScheduleModal();
    fixture.componentInstance.scheduleForm.set({ patientId: 'p1', procedureName: 'Appendectomy' });
    fixture.componentInstance.submitSchedule();
    await fixture.whenStable();

    expect(api.schedule).toHaveBeenCalledWith(expect.objectContaining({ patientId: 'p1', procedureName: 'Appendectomy' }));
    expect(fixture.componentInstance.showScheduleModal()).toBe(false);
    expect(messageService.add).toHaveBeenCalledWith(expect.objectContaining({ severity: 'success', summary: 'Surgery scheduled' }));
  });

  it('starts a surgery, and confirms before completing it', async () => {
    const { fixture, api, messageService, confirmationService } = setup();
    fixture.detectChanges();
    await fixture.whenStable();

    fixture.componentInstance.start({ id: 's1' } as never);
    await fixture.whenStable();
    expect(api.start).toHaveBeenCalledWith('s1');

    fixture.componentInstance.complete({ id: 's1', surgeryNumber: 'OT-0001', procedureName: 'Appendectomy' } as never);
    await fixture.whenStable();
    expect(confirmationService.confirm).toHaveBeenCalled();
    expect(api.complete).toHaveBeenCalledWith('s1');
    expect(messageService.add).toHaveBeenCalledWith(expect.objectContaining({ severity: 'success', summary: 'Surgery completed' }));
  });

  it('confirms before cancelling a surgery', async () => {
    const { fixture, api, confirmationService } = setup();
    fixture.detectChanges();
    await fixture.whenStable();

    fixture.componentInstance.cancel({ id: 's1', surgeryNumber: 'OT-0001', procedureName: 'Appendectomy' } as never);
    await fixture.whenStable();

    expect(confirmationService.confirm).toHaveBeenCalled();
    expect(api.cancel).toHaveBeenCalledWith('s1');
  });

  it('shows an error toast when scheduling fails', async () => {
    const { fixture, api } = setup();
    (api.schedule as jest.Mock).mockReturnValue({
      subscribe: (handlers: { error: (err: ApiError) => void }) =>
        handlers.error({ status: 400, message: 'Invalid patient', body: null }),
    });
    fixture.detectChanges();
    await fixture.whenStable();

    fixture.componentInstance.scheduleForm.set({ patientId: 'bad', procedureName: 'X' });
    fixture.componentInstance.submitSchedule();
    await fixture.whenStable();

    expect(fixture.componentInstance.scheduleError()).toBe('Invalid patient');
  });

  it('shows an error toast and a detail error state when viewing a surgery fails', async () => {
    const { fixture, api, messageService } = setup();
    (api.findOne as jest.Mock).mockReturnValue({
      subscribe: (handlers: { error: (err: ApiError) => void }) =>
        handlers.error({ status: 500, message: 'Server error', body: null }),
    });
    fixture.detectChanges();
    await fixture.whenStable();

    fixture.componentInstance.viewSurgery({ id: 's1' } as never);

    expect(fixture.componentInstance.detailError()).toBe(true);
    expect(fixture.componentInstance.detailLoading()).toBe(false);
    expect(messageService.add).toHaveBeenCalledWith(expect.objectContaining({ severity: 'error' }));
  });

  it('does not let a slower earlier response overwrite a later response that resolved first (superseded requests are cancelled, not just outrun)', async () => {
    const { fixture, api } = setup();
    fixture.detectChanges();
    await fixture.whenStable();

    const slow$ = new Subject<{ data: unknown[]; meta: { total: number; page: number; limit: number; totalPages: number } }>();
    const fast$ = new Subject<{ data: unknown[]; meta: { total: number; page: number; limit: number; totalPages: number } }>();
    (api.list as jest.Mock).mockReturnValueOnce(slow$).mockReturnValueOnce(fast$);

    fixture.componentInstance.onLazyLoad({ first: 0, rows: 20 }); // triggers `slow$` (page 1)
    fixture.componentInstance.onLazyLoad({ first: 20, rows: 20 }); // triggers `fast$` (page 2), cancels `slow$`

    // The page-2 (later) request resolves first.
    fast$.next({ data: [{ id: 'page2-row' }], meta: { total: 40, page: 2, limit: 20, totalPages: 2 } });
    fast$.complete();
    await fixture.whenStable();

    // The page-1 request, now superseded, resolves after — should have no effect.
    slow$.next({ data: [{ id: 'page1-row' }], meta: { total: 40, page: 1, limit: 20, totalPages: 2 } });
    slow$.complete();
    await fixture.whenStable();

    expect(fixture.componentInstance.surgeries()).toEqual([{ id: 'page2-row' }]);
    expect(fixture.componentInstance.firstRecord()).toBe(20);
  });

  it('does not advance the paginator when a page request fails, leaving the table on the last successful page', async () => {
    const { fixture, api, messageService } = setup();
    fixture.detectChanges();
    await fixture.whenStable();
    expect(fixture.componentInstance.firstRecord()).toBe(0);

    const page2$ = new Subject<never>();
    (api.list as jest.Mock).mockReturnValueOnce(page2$);
    fixture.componentInstance.onLazyLoad({ first: 20, rows: 20 });
    page2$.error(new Error('boom'));
    await fixture.whenStable();

    expect(fixture.componentInstance.firstRecord()).toBe(0);
    expect(fixture.componentInstance.loading()).toBe(false);
    expect(messageService.add).toHaveBeenCalledWith(expect.objectContaining({ severity: 'error', summary: 'Error' }));
  });

  it('debounces and searches patients as the filter/schedule pickers are typed', () => {
    jest.useFakeTimers();
    const { fixture, patientsApi } = setup();
    (patientsApi.search as jest.Mock).mockReturnValue(
      of({ data: [{ id: 'p1', firstName: 'John', lastName: 'Smith', patientNo: 'PAT-2' }], meta: { total: 1, page: 1, limit: 10, totalPages: 1 } }),
    );

    fixture.componentInstance.onPatientFilterSearch('jo');
    fixture.componentInstance.onSchedulePatientSearch('jo');
    expect(patientsApi.search).not.toHaveBeenCalled();
    jest.advanceTimersByTime(300);

    expect(patientsApi.search).toHaveBeenCalledWith({ page: 1, limit: 10, q: 'jo' });
    expect(fixture.componentInstance.patientOptions()).toEqual([{ label: 'John Smith (PAT-2)', value: 'p1' }]);
    expect(fixture.componentInstance.schedulePatientOptions()).toEqual([{ label: 'John Smith (PAT-2)', value: 'p1' }]);
    jest.useRealTimers();
  });

  it('hides mutating actions for a read-only user', async () => {
    const { fixture } = setup(false);
    fixture.detectChanges();
    await fixture.whenStable();

    expect(fixture.componentInstance.canManage).toBe(false);
  });
});
