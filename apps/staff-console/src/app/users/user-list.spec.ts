import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { MessageService } from 'primeng/api';
import { ApiError } from '@org/api-client';
import { UserList } from './user-list.js';
import { UsersApiService } from './users-api.service.js';

describe('UserList', () => {
  function setup(createResult: 'ok' | 'error' | 'generated') {
    const usersApi = {
      list: jest.fn().mockReturnValue(of([])),
      getRoles: jest
        .fn()
        .mockReturnValue(of([{ name: 'Doctor', description: 'Treats patients' }])),
      create:
        createResult === 'generated'
          ? jest.fn().mockReturnValue(
              of({
                id: 'a1',
                username: 'new.staff',
                email: 'new@example.com',
                displayName: 'New Staff',
                initialPassword: 'Gen3rated-Secret',
              }),
            )
          : createResult === 'ok'
            ? jest.fn().mockReturnValue(
                of({
                  id: 'a1',
                  username: 'new.staff',
                  email: 'new@example.com',
                  displayName: 'New Staff',
                }),
              )
            : jest
                .fn()
                .mockReturnValue(
                  throwError(() => ({ status: 500, message: 'boom' } as ApiError)),
                ),
    } as unknown as UsersApiService;
    const messageService = { add: jest.fn() } as unknown as MessageService;

    TestBed.configureTestingModule({
      imports: [UserList],
      providers: [
        { provide: UsersApiService, useValue: usersApi },
        { provide: MessageService, useValue: messageService },
      ],
    });

    const fixture = TestBed.createComponent(UserList);
    return { fixture, usersApi, messageService };
  }

  function fillForm(fixture: { componentInstance: UserList }): void {
    fixture.componentInstance.createForm.set({
      username: 'new.staff',
      email: 'new@example.com',
      displayName: 'New Staff',
      roleName: 'Doctor',
    });
  }

  it('loads users and roles on construction', async () => {
    const { fixture, usersApi } = setup('ok');
    fixture.detectChanges();
    await fixture.whenStable();

    expect(usersApi.list).toHaveBeenCalledTimes(1);
    expect(usersApi.getRoles).toHaveBeenCalledTimes(1);
  });

  it('creates an account without sending a hardcoded password and toasts success', async () => {
    const { fixture, usersApi, messageService } = setup('ok');
    fixture.detectChanges();
    await fixture.whenStable();

    fixture.componentInstance.openCreateModal();
    fillForm(fixture);
    fixture.componentInstance.submitCreate();
    await fixture.whenStable();

    expect(usersApi.create).toHaveBeenCalledWith({
      username: 'new.staff',
      email: 'new@example.com',
      displayName: 'New Staff',
      roleName: 'Doctor',
    });
    expect(fixture.componentInstance.showCreateModal()).toBe(false);
    expect(usersApi.list).toHaveBeenCalledTimes(2);
    expect(messageService.add).toHaveBeenCalledWith(
      expect.objectContaining({ severity: 'success', summary: 'Account created' }),
    );
  });

  it('keeps the modal open and shows the generated initial password once', async () => {
    const { fixture, usersApi, messageService } = setup('generated');
    fixture.detectChanges();
    await fixture.whenStable();

    fixture.componentInstance.openCreateModal();
    fillForm(fixture);
    fixture.componentInstance.submitCreate();
    await fixture.whenStable();

    expect(fixture.componentInstance.showCreateModal()).toBe(true);
    expect(fixture.componentInstance.createdAccount()).toEqual({
      username: 'new.staff',
      initialPassword: 'Gen3rated-Secret',
    });
    expect(messageService.add).not.toHaveBeenCalled();

    fixture.componentInstance.closeCreated();
    expect(fixture.componentInstance.showCreateModal()).toBe(false);
    expect(fixture.componentInstance.createdAccount()).toBeNull();
    expect(usersApi.list).toHaveBeenCalledTimes(2);
  });

  it('shows an inline conflict message on a 409', async () => {
    const usersApi = {
      list: jest.fn().mockReturnValue(of([])),
      getRoles: jest.fn().mockReturnValue(of([])),
      create: jest
        .fn()
        .mockReturnValue(
          throwError(() => ({ status: 409, message: 'Conflict' } as ApiError)),
        ),
    } as unknown as UsersApiService;
    const messageService = { add: jest.fn() } as unknown as MessageService;
    TestBed.configureTestingModule({
      imports: [UserList],
      providers: [
        { provide: UsersApiService, useValue: usersApi },
        { provide: MessageService, useValue: messageService },
      ],
    });
    const fixture = TestBed.createComponent(UserList);
    fixture.detectChanges();
    await fixture.whenStable();

    fixture.componentInstance.openCreateModal();
    fillForm(fixture);
    fixture.componentInstance.submitCreate();
    await fixture.whenStable();

    expect(fixture.componentInstance.conflictError()).toBe(
      'Username or Email already exists.',
    );
    expect(messageService.add).not.toHaveBeenCalled();
  });

  it('toasts other creation errors instead of failing silently', async () => {
    const { fixture, messageService } = setup('error');
    fixture.detectChanges();
    await fixture.whenStable();

    fixture.componentInstance.openCreateModal();
    fillForm(fixture);
    fixture.componentInstance.submitCreate();
    await fixture.whenStable();

    expect(fixture.componentInstance.showCreateModal()).toBe(true);
    expect(messageService.add).toHaveBeenCalledWith(
      expect.objectContaining({ severity: 'error', detail: 'boom' }),
    );
  });
});
