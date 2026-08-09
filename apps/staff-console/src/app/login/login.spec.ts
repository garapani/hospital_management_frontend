import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { AuthService } from '@org/auth';
import { of, throwError } from 'rxjs';
import { Login } from './login.js';

describe('Login', () => {
  function setup(loginResult: unknown) {
    const authService = {
      login: jest.fn().mockReturnValue(of(loginResult)),
    } as unknown as AuthService;
    const router = { navigateByUrl: jest.fn() } as unknown as Router;

    TestBed.configureTestingModule({
      imports: [Login],
      providers: [
        { provide: AuthService, useValue: authService },
        { provide: Router, useValue: router },
      ],
    });

    const fixture = TestBed.createComponent(Login);
    return { fixture, authService, router };
  }

  it('navigates to /billing/invoices on successful login', () => {
    const { fixture, router } = setup({ kind: 'success' });
    fixture.componentInstance.usernameControl.setValue('jdoe');
    fixture.componentInstance.passwordControl.setValue('secret');

    fixture.componentInstance.submit();

    expect(router.navigateByUrl).toHaveBeenCalledWith('/billing/invoices');
  });

  it('shows an invalid-credentials message and does not navigate', () => {
    const { fixture, router } = setup({ kind: 'invalidCredentials' });
    fixture.componentInstance.usernameControl.setValue('jdoe');
    fixture.componentInstance.passwordControl.setValue('wrong');

    fixture.componentInstance.submit();

    expect(fixture.componentInstance.errorMessage()).toBe('Invalid username or password');
    expect(router.navigateByUrl).not.toHaveBeenCalled();
  });

  it('shows a locked message with the retry time and does not navigate', () => {
    const { fixture, router } = setup({ kind: 'locked', retryAfterSeconds: 300 });
    fixture.componentInstance.usernameControl.setValue('jdoe');
    fixture.componentInstance.passwordControl.setValue('secret');

    fixture.componentInstance.submit();

    expect(fixture.componentInstance.errorMessage()).toBe(
      'Account locked. Try again in 300 seconds.',
    );
    expect(router.navigateByUrl).not.toHaveBeenCalled();
  });

  it('clears the submitting flag and shows an error when login() itself errors', () => {
    const authService = {
      login: jest.fn().mockReturnValue(throwError(() => new Error('boom'))),
    } as unknown as AuthService;
    TestBed.configureTestingModule({
      imports: [Login],
      providers: [
        { provide: AuthService, useValue: authService },
        { provide: Router, useValue: { navigateByUrl: jest.fn() } },
      ],
    });
    const fixture = TestBed.createComponent(Login);
    fixture.componentInstance.usernameControl.setValue('jdoe');
    fixture.componentInstance.passwordControl.setValue('secret');

    fixture.componentInstance.submit();

    expect(fixture.componentInstance.submitting()).toBe(false);
    expect(fixture.componentInstance.errorMessage()).toBe('Something went wrong. Please try again.');
  });

  it('calls AuthService.login with the entered credentials', () => {
    const { fixture, authService } = setup({ kind: 'success' });
    fixture.componentInstance.usernameControl.setValue('jdoe');
    fixture.componentInstance.passwordControl.setValue('secret');

    fixture.componentInstance.submit();

    expect(authService.login).toHaveBeenCalledWith('jdoe', 'secret');
  });
});
