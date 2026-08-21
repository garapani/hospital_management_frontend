import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { AuthService } from '@org/auth';
import { MessageService } from 'primeng/api';
import { of, throwError } from 'rxjs';
import { ChangePassword } from './change-password.js';

describe('ChangePassword', () => {
  function setup(options: { changeResult?: unknown; router?: Partial<Router> } = {}) {
    const authService = {
      changeInitialPassword: jest
        .fn()
        .mockReturnValue(
          options.changeResult === undefined
            ? of({ success: true })
            : options.changeResult,
        ),
    } as unknown as AuthService;
    const messageService = { add: jest.fn() } as unknown as MessageService;
    const router = {
      navigateByUrl: jest.fn(),
      ...(options.router ?? {}),
    } as unknown as Router;

    TestBed.configureTestingModule({
      imports: [ChangePassword],
      providers: [
        { provide: AuthService, useValue: authService },
        { provide: MessageService, useValue: messageService },
        { provide: Router, useValue: router },
      ],
    });

    const fixture = TestBed.createComponent(ChangePassword);
    return { fixture, authService, messageService, router };
  }

  it('prefills the username carried over from the login screen', () => {
    history.replaceState({ username: 'new.hire' }, '');
    const { fixture } = setup();

    expect(fixture.componentInstance.usernameControl.value).toBe('new.hire');
  });

  it('submits the credentials and returns to login on success', () => {
    history.replaceState({}, '');
    const { fixture, authService, router, messageService } = setup();
    const component = fixture.componentInstance;
    component.usernameControl.setValue('new.hire');
    component.currentPasswordControl.setValue('initial-pass');
    component.newPasswordControl.setValue('brand-new-pass');
    component.confirmPasswordControl.setValue('brand-new-pass');

    component.submit();

    expect(authService.changeInitialPassword).toHaveBeenCalledWith(
      'new.hire',
      'initial-pass',
      'brand-new-pass',
    );
    expect(router.navigateByUrl).toHaveBeenCalledWith('/login');
    expect(messageService.add).toHaveBeenCalledWith(
      expect.objectContaining({ severity: 'success' }),
    );
    expect(component.submitting()).toBe(false);
  });

  it('does not call the API when the confirmation does not match', () => {
    const { fixture, authService } = setup();
    const component = fixture.componentInstance;
    component.usernameControl.setValue('new.hire');
    component.currentPasswordControl.setValue('initial-pass');
    component.newPasswordControl.setValue('brand-new-pass');
    component.confirmPasswordControl.setValue('different-pass');

    component.submit();

    expect(authService.changeInitialPassword).not.toHaveBeenCalled();
    expect(component.errorMessage()).toBe(
      'New password and confirmation do not match.',
    );
  });

  it('shows an inline error on a 401 (wrong current password)', () => {
    history.replaceState({}, '');
    const { fixture, authService, router } = setup({
      changeResult: throwError(() => ({
        status: 401,
        message: 'Invalid credentials',
      })),
    });
    const component = fixture.componentInstance;
    component.usernameControl.setValue('new.hire');
    component.currentPasswordControl.setValue('wrong');
    component.newPasswordControl.setValue('brand-new-pass');
    component.confirmPasswordControl.setValue('brand-new-pass');

    component.submit();

    expect(component.errorMessage()).toBe('Current password is incorrect.');
    expect(router.navigateByUrl).not.toHaveBeenCalled();
    expect(component.submitting()).toBe(false);
  });

  it('surfaces the backend message for other errors', () => {
    history.replaceState({}, '');
    const { fixture, router } = setup({
      changeResult: throwError(() => ({
        status: 400,
        message: 'This account is not required to change its password',
      })),
    });
    const component = fixture.componentInstance;
    component.usernameControl.setValue('jdoe');
    component.currentPasswordControl.setValue('current-pass');
    component.newPasswordControl.setValue('brand-new-pass');
    component.confirmPasswordControl.setValue('brand-new-pass');

    component.submit();

    expect(component.errorMessage()).toBe(
      'This account is not required to change its password',
    );
    expect(router.navigateByUrl).not.toHaveBeenCalled();
  });
});
