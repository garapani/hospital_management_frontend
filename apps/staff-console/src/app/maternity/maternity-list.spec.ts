import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { MessageService, ConfirmationService, Confirmation } from 'primeng/api';
import { ApiError } from '@org/api-client';
import { AuthService } from '@org/auth';
import { MaternityList } from './maternity-list.js';
import { MaternityApiService } from './maternity-api.service.js';
import { PatientsApiService } from '../patients/patients-api.service.js';
import { AdmissionsApiService } from '../admissions/admissions-api.service.js';
import { DirectoryResolverService } from '../directory/directory-resolver.service.js';

describe('MaternityList', () => {
  function setup(canManage = true) {
    const api = {
      list: jest.fn().mockReturnValue(of({ data: [], meta: { total: 0, page: 1, limit: 20, totalPages: 0 } })),
      findOne: jest.fn().mockReturnValue(of({})),
      create: jest.fn().mockReturnValue(of({})),
      recordDelivery: jest.fn().mockReturnValue(of({})),
    } as unknown as MaternityApiService;
    const messageService = { add: jest.fn() } as unknown as MessageService;
    const confirmationService = {
      confirm: jest.fn((c: Confirmation) => c.accept?.()),
    } as unknown as ConfirmationService;
    const auth = { hasPermission: () => canManage } as unknown as AuthService;
    const patientsApi = {
      search: jest.fn().mockReturnValue(of({ data: [], meta: { total: 0, page: 1, limit: 10, totalPages: 0 } })),
    } as unknown as PatientsApiService;
    const admissionsApi = {
      list: jest.fn().mockReturnValue(of({ data: [], meta: { total: 0, page: 1, limit: 1, totalPages: 0 } })),
    } as unknown as AdmissionsApiService;
    const directoryResolver = { resolve: jest.fn().mockReturnValue(of(null)) } as unknown as DirectoryResolverService;

    TestBed.configureTestingModule({
      imports: [MaternityList],
      providers: [
        { provide: MaternityApiService, useValue: api },
        { provide: MessageService, useValue: messageService },
        { provide: ConfirmationService, useValue: confirmationService },
        { provide: AuthService, useValue: auth },
        { provide: PatientsApiService, useValue: patientsApi },
        { provide: AdmissionsApiService, useValue: admissionsApi },
        { provide: DirectoryResolverService, useValue: directoryResolver },
      ],
    });

    const fixture = TestBed.createComponent(MaternityList);
    return { fixture, api, messageService, confirmationService, patientsApi, admissionsApi };
  }

  it('loads records on init', async () => {
    const { fixture, api } = setup();
    fixture.detectChanges();
    await fixture.whenStable();

    expect(api.list).toHaveBeenCalledWith({ patientId: undefined, page: 1, limit: 20 });
  });

  it('creates a maternity record and toasts success', async () => {
    const { fixture, api, messageService } = setup();
    fixture.detectChanges();
    await fixture.whenStable();

    fixture.componentInstance.openCreateModal();
    fixture.componentInstance.createForm.set({ admissionId: 'adm-1', patientId: 'p1', gravida: 2, para: 1 });
    fixture.componentInstance.submitCreate();
    await fixture.whenStable();

    expect(api.create).toHaveBeenCalledWith({ admissionId: 'adm-1', patientId: 'p1', gravida: 2, para: 1 });
    expect(fixture.componentInstance.showCreateModal()).toBe(false);
    expect(messageService.add).toHaveBeenCalledWith(expect.objectContaining({ severity: 'success', summary: 'Maternity record created' }));
  });

  it('sends edd as undefined, not empty string, when picked then cleared before saving', async () => {
    // Regression test: the backend's @IsOptional() on `edd` (@IsDateString) only skips
    // undefined/null, not '' — a cleared date field must never reach the API as ''.
    const { fixture, api } = setup();
    fixture.detectChanges();
    await fixture.whenStable();

    fixture.componentInstance.openCreateModal();
    fixture.componentInstance.createForm.set({ admissionId: 'adm-1', patientId: 'p1', edd: '' });
    fixture.componentInstance.submitCreate();
    await fixture.whenStable();

    const payload = (api.create as jest.Mock).mock.calls[0][0];
    expect(payload.edd).toBeUndefined();
  });

  it('confirms before recording a delivery, and toasts success', async () => {
    const { fixture, api, messageService, confirmationService } = setup();
    fixture.detectChanges();
    await fixture.whenStable();

    fixture.componentInstance.openDeliveryModal({ id: 'r1' } as never);
    fixture.componentInstance.deliveryForm.set({ deliveryDate: '2026-08-23', deliveryType: 'Normal', babyCount: 1 });
    fixture.componentInstance.submitDelivery();
    await fixture.whenStable();

    expect(confirmationService.confirm).toHaveBeenCalled();
    expect(api.recordDelivery).toHaveBeenCalledWith('r1', { deliveryDate: '2026-08-23', deliveryType: 'Normal', babyCount: 1 });
    expect(messageService.add).toHaveBeenCalledWith(expect.objectContaining({ severity: 'success', summary: 'Delivery recorded' }));
  });

  it('refuses to record a delivery with no baby count', async () => {
    const { fixture, api } = setup();
    fixture.detectChanges();
    await fixture.whenStable();

    fixture.componentInstance.openDeliveryModal({ id: 'r1' } as never);
    fixture.componentInstance.deliveryForm.set({ deliveryDate: '2026-08-23', deliveryType: 'Normal', babyCount: null as unknown as number });
    fixture.componentInstance.submitDelivery();

    expect(api.recordDelivery).not.toHaveBeenCalled();
    expect(fixture.componentInstance.deliveryError()).toBeTruthy();
  });

  it('shows an error toast when creating a record fails', async () => {
    const { fixture, api } = setup();
    (api.create as jest.Mock).mockReturnValue({
      subscribe: (handlers: { error: (err: ApiError) => void }) =>
        handlers.error({ status: 400, message: 'Invalid patient', body: null }),
    });
    fixture.detectChanges();
    await fixture.whenStable();

    fixture.componentInstance.createForm.set({ admissionId: 'bad', patientId: 'bad' });
    fixture.componentInstance.submitCreate();
    await fixture.whenStable();

    expect(fixture.componentInstance.createError()).toBe('Invalid patient');
  });

  it('debounces and searches patients as the filter/create pickers are typed', () => {
    jest.useFakeTimers();
    const { fixture, patientsApi } = setup();
    (patientsApi.search as jest.Mock).mockReturnValue(
      of({ data: [{ id: 'p1', firstName: 'John', lastName: 'Smith', patientNo: 'PAT-2' }], meta: { total: 1, page: 1, limit: 10, totalPages: 1 } }),
    );

    fixture.componentInstance.onPatientFilterSearch('jo');
    fixture.componentInstance.onCreatePatientSearch('jo');
    expect(patientsApi.search).not.toHaveBeenCalled();
    jest.advanceTimersByTime(300);

    expect(patientsApi.search).toHaveBeenCalledWith({ page: 1, limit: 10, q: 'jo' });
    expect(fixture.componentInstance.patientOptions()).toEqual([{ label: 'John Smith (PAT-2)', value: 'p1' }]);
    expect(fixture.componentInstance.createPatientOptions()).toEqual([{ label: 'John Smith (PAT-2)', value: 'p1' }]);
    jest.useRealTimers();
  });

  it("resolves a selected patient's active admission and applies it to the create form", async () => {
    const { fixture, admissionsApi } = setup();
    fixture.detectChanges();
    await fixture.whenStable();
    (admissionsApi.list as jest.Mock).mockReturnValue(
      of({ data: [{ id: 'adm-1', patientId: 'p1', wardId: 'ward-1', bedId: 'bed-1' }], meta: { total: 1, page: 1, limit: 1, totalPages: 1 } }),
    );

    fixture.componentInstance.onCreatePatientSelected('p1');
    await fixture.whenStable();

    expect(admissionsApi.list).toHaveBeenCalledWith({ patientId: 'p1', status: 'Admitted', page: 1, limit: 1 });
    expect(fixture.componentInstance.createForm()).toEqual(expect.objectContaining({ patientId: 'p1', admissionId: 'adm-1' }));
    expect(fixture.componentInstance.resolvedAdmission()?.id).toBe('adm-1');
  });

  it('warns and leaves the admission unresolved when the selected patient has no active admission', async () => {
    const { fixture, messageService } = setup();
    fixture.detectChanges();
    await fixture.whenStable();

    fixture.componentInstance.onCreatePatientSelected('p-no-admission');
    await fixture.whenStable();

    expect(fixture.componentInstance.createForm().admissionId).toBe('');
    expect(fixture.componentInstance.resolvedAdmission()).toBeNull();
    expect(messageService.add).toHaveBeenCalledWith(expect.objectContaining({ severity: 'warn', summary: 'No active admission' }));
  });

  it('hides mutating actions for a read-only user', async () => {
    const { fixture } = setup(false);
    fixture.detectChanges();
    await fixture.whenStable();

    expect(fixture.componentInstance.canManage).toBe(false);
  });
});
