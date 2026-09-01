import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { AuthService } from '@org/auth';
import { rootRedirectGuard } from './root-redirect.guard.js';

describe('rootRedirectGuard', () => {
  function setup(
    isAuthenticated: boolean,
    options: { isPlatformAdmin?: boolean; roles?: string[]; permissions?: string[] } = {},
  ) {
    const { isPlatformAdmin = false, roles = [], permissions = [] } = options;
    const authService = {
      isAuthenticated: () => isAuthenticated,
      isPlatformAdmin: () => isPlatformAdmin,
      hasPermission: (permission: string) => permissions.includes(permission),
      currentUser: () => ({ roles }),
    } as unknown as AuthService;
    TestBed.configureTestingModule({
      providers: [provideRouter([]), { provide: AuthService, useValue: authService }],
    });
  }

  function run() {
    return TestBed.runInInjectionContext(() => rootRedirectGuard({} as never, { url: '/' } as never));
  }

  it('sends a platform admin to the platform dashboard', () => {
    setup(true, { isPlatformAdmin: true });
    expect(run()?.toString()).toBe('/platform/dashboard');
  });

  // Regression coverage: this guard used to hardcode '/billing/invoices' for every tenant user
  // (@org/auth's TENANT_LANDING_URL) — a Doctor or Nurse refreshing the browser at '/' had no
  // billing.manage permission, so permissionGuard rejected them and bounced them to /login
  // despite a valid session. It must resolve per-role, the same way login.ts does.
  it.each([
    ['Hospital Admin', '/admin/users'],
    ['Receptionist / Front Desk', '/clinical/appointments'],
    ['Doctor', '/clinical/patients'],
    ['Nurse', '/clinical/triage'],
    ['Billing/Accounts Staff', '/billing/invoices'],
    ['Auditor/Compliance', '/admin/audit'],
  ])('sends a %s to their role-specific landing page, not a hardcoded route', (role, expectedRoute) => {
    setup(true, { roles: [role] });
    expect(run()?.toString()).toBe(expectedRoute);
  });

  it('falls back to permission-priority routing for a role with no explicit landing page', () => {
    setup(true, { roles: ['Some Future Role'], permissions: ['billing.manage'] });
    expect(run()?.toString()).toBe('/billing/invoices');
  });

  it('sends a tenant user with no matching role or permission to /login rather than looping', () => {
    setup(true, { roles: ['Lab Technician'], permissions: ['lab.read'] });
    expect(run()?.toString()).toBe('/login');
  });

  it('sends an unauthenticated visitor to /login', () => {
    setup(false);
    expect(run()?.toString()).toBe('/login');
  });
});
