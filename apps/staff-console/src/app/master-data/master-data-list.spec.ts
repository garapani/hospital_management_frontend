import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { MessageService } from 'primeng/api';
import { ApiError } from '@org/api-client';
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

  function setup(overrides: { deactivateDept?: unknown; createWard?: unknown } = {}) {
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

    TestBed.configureTestingModule({
      imports: [MasterDataList],
      providers: [
        { provide: MasterDataApiService, useValue: mdApi },
        { provide: MessageService, useValue: messageService },
      ],
    });

    const fixture = TestBed.createComponent(MasterDataList);
    fixture.detectChanges();
    return { fixture, mdApi, messageService };
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
});
