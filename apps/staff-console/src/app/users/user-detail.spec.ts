import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { ActivatedRoute, Router } from '@angular/router';
import { MessageService } from 'primeng/api';
import { ApiError } from '@org/api-client';
import { UserDetail } from './user-detail.js';
import { UsersApiService } from './users-api.service.js';

describe('UserDetail', () => {
  function setup(options: { assignError?: unknown } = {}) {
    const usersApi = {
      getOne: jest.fn().mockReturnValue(
        of({
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
          },
          roleIds: [],
          roleNames: [],
        }),
      ),
      getRoles: jest.fn().mockReturnValue(of([{ name: 'Super Admin', description: 'Platform ops' }])),
      deactivate: jest.fn().mockReturnValue(of({})),
      reactivate: jest.fn().mockReturnValue(of({})),
      unlock: jest.fn().mockReturnValue(of({})),
      assignRole:
        options.assignError === undefined
          ? jest.fn().mockReturnValue(of({ id: 'role-assignment-1' }))
          : jest.fn().mockReturnValue(options.assignError),
    } as unknown as UsersApiService;
    const messageService = { add: jest.fn() } as unknown as MessageService;
    const router = { navigate: jest.fn() } as unknown as Router;

    TestBed.configureTestingModule({
      imports: [UserDetail],
      providers: [
        { provide: ActivatedRoute, useValue: { paramMap: of({ get: () => 'acc-1' }) } },
        { provide: UsersApiService, useValue: usersApi },
        { provide: MessageService, useValue: messageService },
        { provide: Router, useValue: router },
      ],
    });

    const fixture = TestBed.createComponent(UserDetail);
    return { fixture, usersApi, messageService, router };
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

  it('deactivates with a success toast and reloads', async () => {
    const { fixture, usersApi, messageService } = setup();
    await fixture.whenStable();

    fixture.componentInstance.deactivate();

    expect(usersApi.deactivate).toHaveBeenCalledWith('acc-1');
    expect(usersApi.getOne).toHaveBeenCalledTimes(2);
    expect(messageService.add).toHaveBeenCalledWith(
      expect.objectContaining({ severity: 'success', summary: 'Account deactivated' }),
    );
  });
});
