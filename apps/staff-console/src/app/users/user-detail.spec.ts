import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { ActivatedRoute, Router } from '@angular/router';
import { MessageService, ConfirmationService, Confirmation } from 'primeng/api';
import { ApiError } from '@org/api-client';
import { UserDetail } from './user-detail.js';
import { UsersApiService } from './users-api.service.js';
import { MasterDataApiService } from '../master-data/master-data-api.service.js';

describe('UserDetail', () => {
  const accountWithRoles = {
    account: {
      id: 'acc-1',
      accountType: 'staff',
      username: 'op1',
      email: 'op1@platform.local',
      displayName: 'Operator One',
      isActive: true,
      needsPasswordUpdate: false,
      failedLoginAttempts: 0,
      lockedUntil: null,
      createdAt: '2026-08-01T00:00:00Z',
      wardId: null,
    },
    roleIds: ['role-1'],
    roleNames: ['Super Admin'],
    assignments: [{ id: 'assign-1', roleId: 'role-1', roleName: 'Super Admin' }],
  };

  function setup(options: { assignError?: unknown; revokeError?: unknown } = {}) {
    const usersApi = {
      getOne: jest.fn().mockReturnValue(of(accountWithRoles)),
      getRoles: jest.fn().mockReturnValue(of([{ name: 'Super Admin', description: 'Platform ops' }])),
      deactivate: jest.fn().mockReturnValue(of({})),
      reactivate: jest.fn().mockReturnValue(of({})),
      unlock: jest.fn().mockReturnValue(of({})),
      resetPassword: jest.fn().mockReturnValue(of({ success: true, initialPassword: 'Gen3rated-Pass' })),
      setWard: jest.fn().mockReturnValue(of({})),
      assignRole:
        options.assignError === undefined
          ? jest.fn().mockReturnValue(of({ id: 'role-assignment-1' }))
          : jest.fn().mockReturnValue(options.assignError),
      revokeRole:
        options.revokeError === undefined
          ? jest.fn().mockReturnValue(of({ revoked: true }))
          : jest.fn().mockReturnValue(options.revokeError),
    } as unknown as UsersApiService;
    const masterDataApi = {
      listWards: jest.fn().mockReturnValue(of([{ id: 'ward-1', wardName: 'ICU', isActive: true }])),
    } as unknown as MasterDataApiService;
    const messageService = { add: jest.fn() } as unknown as MessageService;
    const router = { navigate: jest.fn() } as unknown as Router;
    const confirmationService = {
      confirm: jest.fn((c: Confirmation) => c.accept?.()),
    } as unknown as ConfirmationService;

    TestBed.configureTestingModule({
      imports: [UserDetail],
      providers: [
        { provide: ActivatedRoute, useValue: { paramMap: of({ get: () => 'acc-1' }) } },
        { provide: UsersApiService, useValue: usersApi },
        { provide: MasterDataApiService, useValue: masterDataApi },
        { provide: MessageService, useValue: messageService },
        { provide: Router, useValue: router },
        { provide: ConfirmationService, useValue: confirmationService },
      ],
    });

    const fixture = TestBed.createComponent(UserDetail);
    return { fixture, usersApi, masterDataApi, messageService, router, confirmationService };
  }

  it('loads the account and its role options on construction', async () => {
    const { fixture, usersApi } = setup();
    await fixture.whenStable();

    expect(usersApi.getOne).toHaveBeenCalledWith('acc-1');
    expect(usersApi.getRoles).toHaveBeenCalledTimes(1);
    expect(fixture.componentInstance.roles()).toEqual([
      { name: 'Super Admin', description: 'Platform ops' },
    ]);
  });

  it('assigns a role from the tenant-scoped picker and toasts success', async () => {
    const { fixture, usersApi, messageService } = setup();
    await fixture.whenStable();

    fixture.componentInstance.openAssignModal();
    fixture.componentInstance.assignForm.set({ roleName: 'Super Admin', startDate: '', endDate: '' });
    fixture.componentInstance.submitAssign();

    expect(usersApi.assignRole).toHaveBeenCalledWith('acc-1', {
      roleName: 'Super Admin',
      startDate: undefined,
      endDate: undefined,
    });
    expect(fixture.componentInstance.showAssignModal()).toBe(false);
    expect(messageService.add).toHaveBeenCalledWith(
      expect.objectContaining({ severity: 'success', summary: 'Role assigned' }),
    );
  });

  it('toasts a warning instead of alert() when the role is already held', async () => {
    const { fixture, messageService } = setup({
      assignError: throwError(() => ({ status: 409, message: 'Conflict' } as ApiError)),
    });
    await fixture.whenStable();

    fixture.componentInstance.openAssignModal();
    fixture.componentInstance.assignForm.set({ roleName: 'Super Admin', startDate: '', endDate: '' });
    fixture.componentInstance.submitAssign();

    expect(messageService.add).toHaveBeenCalledWith(
      expect.objectContaining({ severity: 'warn', summary: 'Role not assigned' }),
    );
    expect(fixture.componentInstance.showAssignModal()).toBe(true);
  });

  it('confirms before deactivating the account', async () => {
    const { fixture, usersApi, confirmationService, messageService } = setup();
    await fixture.whenStable();

    fixture.componentInstance.deactivate();

    expect(confirmationService.confirm).toHaveBeenCalled();
    expect(usersApi.deactivate).toHaveBeenCalledWith('acc-1');
    expect(messageService.add).toHaveBeenCalledWith(
      expect.objectContaining({ severity: 'success', summary: 'Account deactivated' }),
    );
  });

  it('confirms before removing a role assignment, then toasts', async () => {
    const { fixture, usersApi, confirmationService, messageService } = setup();
    await fixture.whenStable();

    fixture.componentInstance.removeRole({ id: 'assign-1', roleName: 'Super Admin' });

    expect(confirmationService.confirm).toHaveBeenCalled();
    expect(usersApi.revokeRole).toHaveBeenCalledWith('acc-1', 'assign-1');
    expect(usersApi.getOne).toHaveBeenCalledTimes(2);
    expect(messageService.add).toHaveBeenCalledWith(
      expect.objectContaining({ severity: 'success', summary: 'Role Super Admin removed' }),
    );
  });

  it('toasts the backend message when role removal is blocked (e.g. last Super Admin)', async () => {
    const { fixture, messageService } = setup({
      revokeError: throwError(() => ({
        status: 400,
        message: 'Cannot remove the last Super Admin from the platform tenant',
      } as ApiError)),
    });
    await fixture.whenStable();

    fixture.componentInstance.removeRole({ id: 'assign-1', roleName: 'Super Admin' });

    expect(messageService.add).toHaveBeenCalledWith(
      expect.objectContaining({
        severity: 'error',
        detail: 'Cannot remove the last Super Admin from the platform tenant',
      }),
    );
  });

  it('assigns a ward and toasts success', async () => {
    const { fixture, usersApi, messageService } = setup();
    await fixture.whenStable();

    fixture.componentInstance.openWardEdit();
    fixture.componentInstance.selectedWardId.set('ward-1');
    fixture.componentInstance.saveWard();

    expect(usersApi.setWard).toHaveBeenCalledWith('acc-1', 'ward-1');
    expect(fixture.componentInstance.editingWard()).toBe(false);
    expect(messageService.add).toHaveBeenCalledWith(
      expect.objectContaining({ severity: 'success', summary: 'Ward assignment updated' }),
    );
  });

  it('clears a ward assignment', async () => {
    const { fixture, usersApi } = setup();
    await fixture.whenStable();

    fixture.componentInstance.openWardEdit();
    fixture.componentInstance.selectedWardId.set(null);
    fixture.componentInstance.saveWard();

    expect(usersApi.setWard).toHaveBeenCalledWith('acc-1', null);
  });

  it('reset with no temporary password shows the generated password once', async () => {
    const { fixture, usersApi } = setup();
    await fixture.whenStable();

    fixture.componentInstance.openResetModal();
    fixture.componentInstance.confirmReset();

    expect(usersApi.resetPassword).toHaveBeenCalledWith('acc-1', { password: undefined });
    expect(fixture.componentInstance.resetResult()).toBe('Gen3rated-Pass');
    expect(fixture.componentInstance.showResetModal()).toBe(true);

    fixture.componentInstance.closeReset();
    expect(fixture.componentInstance.showResetModal()).toBe(false);
    expect(fixture.componentInstance.resetResult()).toBeNull();
    expect(usersApi.getOne).toHaveBeenCalledTimes(2);
  });

  it('reset with a supplied temporary password toasts and closes', async () => {
    const usersApi = {
      getOne: jest.fn().mockReturnValue(of(accountWithRoles)),
      getRoles: jest.fn().mockReturnValue(of([])),
      resetPassword: jest.fn().mockReturnValue(of({ success: true })),
    } as unknown as UsersApiService;
    const masterDataApi = {
      listWards: jest.fn().mockReturnValue(of([])),
    } as unknown as MasterDataApiService;
    const messageService = { add: jest.fn() } as unknown as MessageService;
    TestBed.configureTestingModule({
      imports: [UserDetail],
      providers: [
        { provide: ActivatedRoute, useValue: { paramMap: of({ get: () => 'acc-1' }) } },
        { provide: UsersApiService, useValue: usersApi },
        { provide: MasterDataApiService, useValue: masterDataApi },
        { provide: MessageService, useValue: messageService },
        { provide: Router, useValue: { navigate: jest.fn() } },
        { provide: ConfirmationService, useValue: { confirm: jest.fn() } },
      ],
    });
    const fixture = TestBed.createComponent(UserDetail);
    await fixture.whenStable();

    fixture.componentInstance.openResetModal();
    fixture.componentInstance.resetForm.set({ password: 'TempPass!123' });
    fixture.componentInstance.confirmReset();

    expect(usersApi.resetPassword).toHaveBeenCalledWith('acc-1', { password: 'TempPass!123' });
    expect(fixture.componentInstance.showResetModal()).toBe(false);
    expect(messageService.add).toHaveBeenCalledWith(
      expect.objectContaining({ severity: 'success', summary: 'Password reset' }),
    );
  });
});
