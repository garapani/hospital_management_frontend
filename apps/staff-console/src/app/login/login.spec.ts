import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { AuthService } from '@org/auth';
import { TENANT_ID } from '@org/api-client';
import { of, throwError } from 'rxjs';
import { Login } from './login.js';
import { BrandingService } from '../branding/branding.service.js';

describe('Login', () => {
  function setup(loginResult: unknown) {
    const authService = {
      login: jest.fn().mockReturnValue(of(loginResult)),
      isPlatformAdmin: () => false,
      hasPermission: (permission: string) => permission === 'billing.manage',
      currentUser: () => ({ roles: [] }),
    } as unknown as AuthService;
    const router = {
      navigateByUrl: jest.fn(),
      navigate: jest.fn(),
    } as unknown as Router;
    const brandingService = {
      displayName: () => null,
      logoUrl: () => null,
      primaryColor: () => null,
    } as unknown as BrandingService;

    TestBed.configureTestingModule({
      imports: [Login],
      providers: [
        { provide: AuthService, useValue: authService },
        { provide: TENANT_ID, useValue: 'demo' },
        { provide: Router, useValue: router },
        { provide: BrandingService, useValue: brandingService },
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

  it('routes to /change-password with the username on a mustChangePassword outcome', () => {
    const { fixture, router } = setup({ kind: 'mustChangePassword' });
    fixture.componentInstance.usernameControl.setValue('new.hire');
    fixture.componentInstance.passwordControl.setValue('initial-pass');

    fixture.componentInstance.submit();

    expect(router.navigate).toHaveBeenCalledWith(['/change-password'], {
      state: { username: 'new.hire' },
    });
    expect(router.navigateByUrl).not.toHaveBeenCalled();
  });

  it('clears the submitting flag and shows an error when login() itself errors', () => {
    const authService = {
      login: jest.fn().mockReturnValue(throwError(() => new Error('boom'))),
      isPlatformAdmin: () => false,
      hasPermission: () => false,
    } as unknown as AuthService;
    TestBed.configureTestingModule({
      imports: [Login],
      providers: [
        { provide: AuthService, useValue: authService },
        { provide: TENANT_ID, useValue: 'demo' },
        { provide: Router, useValue: { navigateByUrl: jest.fn() } },
        {
          provide: BrandingService,
          useValue: { displayName: () => null, logoUrl: () => null, primaryColor: () => null } as unknown as BrandingService,
        },
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

describe('Login redirect', () => {
  function setup(options: { isPlatformAdmin?: boolean; roles?: string[]; permissions?: string[] } = {}) {
    const { isPlatformAdmin = false, roles = [], permissions = [] } = options;
    const authService = {
      login: () => of({ kind: 'success' as const }),
      isPlatformAdmin: () => isPlatformAdmin,
      hasPermission: (permission: string) => permissions.includes(permission),
      currentUser: () => ({ roles }),
    } as unknown as AuthService;
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        { provide: TENANT_ID, useValue: 'demo' },
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: AuthService, useValue: authService },
        {
          provide: BrandingService,
          useValue: { displayName: () => null, logoUrl: () => null, primaryColor: () => null } as unknown as BrandingService,
        },
      ],
    });
    const router = TestBed.inject(Router);
    const navigate = jest.spyOn(router, 'navigateByUrl').mockResolvedValue(true);
    const fixture = TestBed.createComponent(Login);
    return { component: fixture.componentInstance, navigate };
  }

  it('sends a platform admin to the platform dashboard', () => {
    const { component, navigate } = setup({ isPlatformAdmin: true });
    component.usernameControl.setValue('superadmin');
    component.passwordControl.setValue('SuperAdmin@123!');

    component.submit();

    expect(navigate).toHaveBeenCalledWith('/platform/dashboard');
  });

  it.each([
    ['Hospital Admin', '/admin/users'],
    ['Receptionist / Front Desk', '/clinical/appointments'],
    ['Doctor', '/clinical/patients'],
    ['Nurse', '/clinical/triage'],
    ['Billing/Accounts Staff', '/billing/invoices'],
    ['Auditor/Compliance', '/admin/audit'],
  ])('sends a %s to their role-specific landing page', (role, expectedRoute) => {
    const { component, navigate } = setup({ roles: [role] });
    component.usernameControl.setValue('someuser');
    component.passwordControl.setValue('secret');

    component.submit();

    expect(navigate).toHaveBeenCalledWith(expectedRoute);
  });

  it('falls back to permission-priority routing for a role with no explicit landing page', () => {
    const { component, navigate } = setup({ roles: ['Some Future Role'], permissions: ['billing.manage'] });
    component.usernameControl.setValue('someuser');
    component.passwordControl.setValue('secret');

    component.submit();

    expect(navigate).toHaveBeenCalledWith('/billing/invoices');
  });

  it('keeps a tenant user with no matching role or permission on the login page with an explanatory message', () => {
    const { component, navigate } = setup({ roles: ['Lab Technician'], permissions: ['lab.read'] });
    component.usernameControl.setValue('demo.labtech');
    component.passwordControl.setValue('Demo@12345!');

    component.submit();

    expect(navigate).not.toHaveBeenCalled();
    expect(component.errorMessage()).toBe('Your account has no accessible screens yet. Contact your administrator.');
  });
});
