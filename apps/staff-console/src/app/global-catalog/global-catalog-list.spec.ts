import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { MessageService } from 'primeng/api';
import { ApiError } from '@org/api-client';
import { GlobalCatalogList } from './global-catalog-list.js';
import { MasterDataApiService } from '../master-data/master-data-api.service.js';

describe('GlobalCatalogList', () => {
  function setup() {
    const mdApi = {
      listDepartmentCatalogs: jest.fn().mockReturnValue(of([])),
      createDepartmentCatalog: jest.fn().mockReturnValue(of({})),
      updateDepartmentCatalog: jest.fn().mockReturnValue(of({})),
      deactivateDepartmentCatalog: jest.fn().mockReturnValue(of({})),
      reactivateDepartmentCatalog: jest.fn().mockReturnValue(of({})),
      getRoles: jest.fn().mockReturnValue(of([])),
      createRole: jest.fn().mockReturnValue(of({})),
      updateRole: jest.fn().mockReturnValue(of({})),
      deactivateRole: jest.fn().mockReturnValue(of({})),
      reactivateRole: jest.fn().mockReturnValue(of({})),
    } as unknown as MasterDataApiService;
    const messageService = { add: jest.fn() } as unknown as MessageService;

    TestBed.configureTestingModule({
      imports: [GlobalCatalogList],
      providers: [
        { provide: MasterDataApiService, useValue: mdApi },
        { provide: MessageService, useValue: messageService },
      ],
    });

    const fixture = TestBed.createComponent(GlobalCatalogList);
    return { fixture, mdApi, messageService };
  }

  it('creates a role with the catalog DTO only (no bypass flag) and toasts success', async () => {
    const { fixture, mdApi, messageService } = setup();
    fixture.detectChanges();
    await fixture.whenStable();

    fixture.componentInstance.openRoleModal();
    fixture.componentInstance.roleForm.set({
      name: 'Telehealth Consultant',
      description: 'Remote consultations',
      priority: 55,
      isCrossTenant: false,
    });
    fixture.componentInstance.submitRole();
    await fixture.whenStable();

    expect(mdApi.createRole).toHaveBeenCalledWith({
      name: 'Telehealth Consultant',
      description: 'Remote consultations',
      priority: 55,
      isCrossTenant: false,
    });
    expect(fixture.componentInstance.showRoleModal()).toBe(false);
    expect(messageService.add).toHaveBeenCalledWith(
      expect.objectContaining({ severity: 'success', summary: 'Role created' }),
    );
  });

  it('creates a global department and toasts success', async () => {
    const { fixture, mdApi, messageService } = setup();
    fixture.detectChanges();
    await fixture.whenStable();

    fixture.componentInstance.openDeptModal();
    fixture.componentInstance.deptForm.set({
      departmentCode: 'TEL',
      departmentName: 'Telemedicine',
      description: null,
      isAppointmentApplicable: true,
    });
    fixture.componentInstance.submitDept();
    await fixture.whenStable();

    expect(mdApi.createDepartmentCatalog).toHaveBeenCalledWith({
      departmentCode: 'TEL',
      departmentName: 'Telemedicine',
      description: null,
      isAppointmentApplicable: true,
    });
    expect(fixture.componentInstance.showDeptModal()).toBe(false);
    expect(messageService.add).toHaveBeenCalledWith(
      expect.objectContaining({ severity: 'success', summary: 'Department added' }),
    );
  });

  it('edits a role (description/priority) and toasts success', async () => {
    const { fixture, mdApi, messageService } = setup();
    fixture.detectChanges();
    await fixture.whenStable();

    fixture.componentInstance.openEditRoleModal({
      id: 'role-1',
      name: 'Telehealth Consultant',
      description: 'Old description',
      priority: 55,
      isCrossTenant: false,
      bypassesPermissionChecks: false,
      isActive: true,
    });
    fixture.componentInstance.editRoleForm.set({
      name: 'Telehealth Consultant',
      description: 'New description',
      priority: 60,
    });
    fixture.componentInstance.submitEditRole();
    await fixture.whenStable();

    expect(mdApi.updateRole).toHaveBeenCalledWith('role-1', {
      description: 'New description',
      priority: 60,
    });
    expect(fixture.componentInstance.showEditRoleModal()).toBe(false);
    expect(messageService.add).toHaveBeenCalledWith(
      expect.objectContaining({ severity: 'success', summary: 'Role updated' }),
    );
  });

  it('deactivates a department with a toast', async () => {
    const { fixture, mdApi, messageService } = setup();
    fixture.detectChanges();
    await fixture.whenStable();

    fixture.componentInstance.toggleDeptActive({
      id: 'dept-1',
      departmentCode: 'GEN',
      departmentName: 'General Medicine',
      description: null,
      isAppointmentApplicable: true,
      isActive: true,
      createdAt: '',
    });

    expect(mdApi.deactivateDepartmentCatalog).toHaveBeenCalledWith('dept-1');
    expect(messageService.add).toHaveBeenCalledWith(
      expect.objectContaining({ severity: 'success', summary: 'Department deactivated' }),
    );
  });

  it('surfaces the backend message when role deactivation is blocked (e.g. platform role)', async () => {
    const mdApi = {
      listDepartmentCatalogs: jest.fn().mockReturnValue(of([])),
      createDepartmentCatalog: jest.fn().mockReturnValue(of({})),
      getRoles: jest.fn().mockReturnValue(of([])),
      createRole: jest.fn().mockReturnValue(of({})),
      deactivateRole: jest
        .fn()
        .mockReturnValue(
          throwError(() => ({
            status: 400,
            message: 'Role Super Admin is a platform role and cannot be deactivated',
          } as ApiError)),
        ),
    } as unknown as MasterDataApiService;
    const messageService = { add: jest.fn() } as unknown as MessageService;
    TestBed.configureTestingModule({
      imports: [GlobalCatalogList],
      providers: [
        { provide: MasterDataApiService, useValue: mdApi },
        { provide: MessageService, useValue: messageService },
      ],
    });
    const fixture = TestBed.createComponent(GlobalCatalogList);
    fixture.detectChanges();
    await fixture.whenStable();

    fixture.componentInstance.toggleRoleActive({
      id: 'role-super',
      name: 'Super Admin',
      description: '',
      priority: 100,
      isCrossTenant: true,
      bypassesPermissionChecks: true,
      isActive: true,
    });

    expect(messageService.add).toHaveBeenCalledWith(
      expect.objectContaining({
        severity: 'error',
        detail: 'Role Super Admin is a platform role and cannot be deactivated',
      }),
    );
  });
});
