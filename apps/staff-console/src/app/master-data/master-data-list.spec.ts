import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { MessageService, ConfirmationService, Confirmation } from 'primeng/api';
import { ApiError } from '@org/api-client';
import { AuthService } from '@org/auth';
import { MasterDataList } from './master-data-list.js';
import { MasterDataApiService } from './master-data-api.service.js';
import { Department } from './master-data.model.js';

describe('MasterDataList', () => {
  const department: Department = {
    id: 'dept-1',
    departmentCode: 'GEN',
    departmentName: 'General Medicine',
    description: null,
    isAppointmentApplicable: true,
    parentDepartmentId: null,
    roomNumber: null,
    noticeText: null,
    isActive: true,
    createdAt: '',
    updatedAt: '',
  };

  function setup(overrides: { deactivateDept?: unknown; createWard?: unknown } = {}, canManage = true) {
    const mdApi = {
      listDepartments: jest.fn().mockReturnValue(of([department])),
      listWards: jest.fn().mockReturnValue(of([])),
      listBedsByWard: jest.fn().mockReturnValue(of([])),
      createDepartment: jest.fn().mockReturnValue(of({})),
      createWard:
        overrides.createWard === undefined
          ? jest.fn().mockReturnValue(of({}))
          : jest.fn().mockReturnValue(overrides.createWard),
      deactivateDepartment:
        overrides.deactivateDept === undefined
          ? jest.fn().mockReturnValue(of({}))
          : jest.fn().mockReturnValue(overrides.deactivateDept),
      reactivateDepartment: jest.fn().mockReturnValue(of({})),
      deactivateWard: jest.fn().mockReturnValue(of({})),
      reactivateWard: jest.fn().mockReturnValue(of({})),
      deactivateBed: jest.fn().mockReturnValue(of({})),
      reactivateBed: jest.fn().mockReturnValue(of({})),
      createBed: jest.fn().mockReturnValue(of({})),
    } as unknown as MasterDataApiService;
    const messageService = { add: jest.fn() } as unknown as MessageService;
    const confirmationService = {
      confirm: jest.fn((c: Confirmation) => c.accept?.()),
    } as unknown as ConfirmationService;
    const auth = { hasPermission: () => canManage } as unknown as AuthService;

    TestBed.configureTestingModule({
      imports: [MasterDataList],
      providers: [
        { provide: MasterDataApiService, useValue: mdApi },
        { provide: MessageService, useValue: messageService },
        { provide: ConfirmationService, useValue: confirmationService },
        { provide: AuthService, useValue: auth },
      ],
    });

    const fixture = TestBed.createComponent(MasterDataList);
    fixture.detectChanges();
    return { fixture, mdApi, messageService, confirmationService };
  }

  it('toasts ward-create failure instead of alert()', async () => {
    const { fixture, messageService } = setup({
      createWard: throwError(() => ({ status: 500, message: 'boom' } as ApiError)),
    });
    await fixture.whenStable();

    fixture.componentInstance.openWardModal();
    fixture.componentInstance.wardForm.set({ wardName: 'Ward A' });
    fixture.componentInstance.submitWard();
    await fixture.whenStable();

    expect(messageService.add).toHaveBeenCalledWith(
      expect.objectContaining({ severity: 'error', summary: 'Ward create failed' }),
    );
    expect(fixture.componentInstance.wardSaving()).toBe(false);
  });

  it('confirms before deactivating a department, but not before reactivating one', async () => {
    const { fixture, mdApi, confirmationService } = setup();
    await fixture.whenStable();

    fixture.componentInstance.toggleDept(department);
    expect(confirmationService.confirm).toHaveBeenCalled();
    expect(mdApi.deactivateDepartment).toHaveBeenCalledWith('dept-1');

    fixture.componentInstance.toggleDept({ ...department, isActive: false });
    expect(mdApi.reactivateDepartment).toHaveBeenCalledWith('dept-1');
  });

  it('deactivates a department with a toast and no native confirm', async () => {
    const { fixture, mdApi, messageService } = setup();
    await fixture.whenStable();

    fixture.componentInstance.toggleDept(department);

    expect(mdApi.deactivateDepartment).toHaveBeenCalledWith('dept-1');
    expect(messageService.add).toHaveBeenCalledWith(
      expect.objectContaining({ severity: 'success', summary: 'Department deactivated' }),
    );
  });

  it('surfaces the backend rejection when a department has active children', async () => {
    const { fixture, messageService } = setup({
      deactivateDept: throwError(() => ({
        status: 400,
        message: 'Cannot deactivate: department has active children',
      } as ApiError)),
    });
    await fixture.whenStable();

    fixture.componentInstance.toggleDept(department);

    expect(messageService.add).toHaveBeenCalledWith(
      expect.objectContaining({
        severity: 'error',
        detail: 'Cannot deactivate: department has active children',
      }),
    );
  });

  it('resolves a parent department name from the loaded catalog', async () => {
    const { fixture } = setup();
    await fixture.whenStable();

    expect(fixture.componentInstance.parentDepartmentName('dept-1')).toBe('General Medicine');
    expect(fixture.componentInstance.parentDepartmentName(null)).toBe('-');
    expect(fixture.componentInstance.parentDepartmentName('missing')).toBe('missing');
  });

  it('hides mutating actions for a read-only user', async () => {
    const { fixture } = setup({}, false);
    await fixture.whenStable();

    expect(fixture.componentInstance.canManage).toBe(false);
  });
});
