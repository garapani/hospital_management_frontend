import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { MessageService } from 'primeng/api';
import { ApiError } from '@org/api-client';
import { AuthService } from '@org/auth';
import { VaccinationList } from './vaccination-list.js';
import { VaccinationApiService } from './vaccination-api.service.js';
import { PatientsApiService } from '../patients/patients-api.service.js';

describe('VaccinationList', () => {
  function setup(canManage = true) {
    const api = {
      list: jest.fn().mockReturnValue(of({ data: [], meta: { total: 0, page: 1, limit: 20, totalPages: 0 } })),
      record: jest.fn().mockReturnValue(of({})),
    } as unknown as VaccinationApiService;
    const messageService = { add: jest.fn() } as unknown as MessageService;
    const auth = { hasPermission: () => canManage } as unknown as AuthService;
    const patientsApi = {
      search: jest.fn().mockReturnValue(of({ data: [], meta: { total: 0, page: 1, limit: 10, totalPages: 0 } })),
    } as unknown as PatientsApiService;

    TestBed.configureTestingModule({
      imports: [VaccinationList],
      providers: [
        { provide: VaccinationApiService, useValue: api },
        { provide: MessageService, useValue: messageService },
        { provide: AuthService, useValue: auth },
        { provide: PatientsApiService, useValue: patientsApi },
      ],
    });

    const fixture = TestBed.createComponent(VaccinationList);
    return { fixture, api, messageService, patientsApi };
  }

  it('loads records on init', async () => {
    const { fixture, api } = setup();
    fixture.detectChanges();
    await fixture.whenStable();

    expect(api.list).toHaveBeenCalledWith({ patientId: undefined, page: 1, limit: 20 });
  });

  it('records a vaccination and toasts success', async () => {
    const { fixture, api, messageService } = setup();
    fixture.detectChanges();
    await fixture.whenStable();

    fixture.componentInstance.openModal();
    fixture.componentInstance.form.set({ patientId: 'p1', vaccine: 'MMR', administeredDate: '2026-08-23' });
    fixture.componentInstance.submit();
    await fixture.whenStable();

    expect(api.record).toHaveBeenCalledWith({ patientId: 'p1', vaccine: 'MMR', administeredDate: '2026-08-23' });
    expect(fixture.componentInstance.showModal()).toBe(false);
    expect(messageService.add).toHaveBeenCalledWith(expect.objectContaining({ severity: 'success', summary: 'Vaccination recorded' }));
  });

  it('shows an error toast when recording fails', async () => {
    const { fixture, api } = setup();
    (api.record as jest.Mock).mockReturnValue({
      subscribe: (handlers: { error: (err: ApiError) => void }) =>
        handlers.error({ status: 400, message: 'Invalid patient', body: null }),
    });
    fixture.detectChanges();
    await fixture.whenStable();

    fixture.componentInstance.form.set({ patientId: 'bad', vaccine: 'MMR', administeredDate: '2026-08-23' });
    fixture.componentInstance.submit();
    await fixture.whenStable();

    expect(fixture.componentInstance.error()).toBe('Invalid patient');
  });

  it('debounces and searches patients as the filter/form pickers are typed', () => {
    jest.useFakeTimers();
    const { fixture, patientsApi } = setup();
    (patientsApi.search as jest.Mock).mockReturnValue(
      of({ data: [{ id: 'p1', firstName: 'John', lastName: 'Smith', patientNo: 'PAT-2' }], meta: { total: 1, page: 1, limit: 10, totalPages: 1 } }),
    );

    fixture.componentInstance.onPatientFilterSearch('jo');
    fixture.componentInstance.onFormPatientSearch('jo');
    expect(patientsApi.search).not.toHaveBeenCalled();
    jest.advanceTimersByTime(300);

    expect(patientsApi.search).toHaveBeenCalledWith({ page: 1, limit: 10, q: 'jo' });
    expect(fixture.componentInstance.patientOptions()).toEqual([{ label: 'John Smith (PAT-2)', value: 'p1' }]);
    expect(fixture.componentInstance.formPatientOptions()).toEqual([{ label: 'John Smith (PAT-2)', value: 'p1' }]);
    jest.useRealTimers();
  });

  it('hides the record action for a read-only user', async () => {
    const { fixture } = setup(false);
    fixture.detectChanges();
    await fixture.whenStable();

    expect(fixture.componentInstance.canManage).toBe(false);
  });
});
