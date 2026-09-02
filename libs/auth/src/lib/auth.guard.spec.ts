import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { authGuard, permissionGuard, platformGuard, tenantGuard } from './auth.guard.js';
import { AuthService } from './auth.service.js';

describe('authGuard', () => {
  function setup(isAuthenticated: boolean) {
    const authService = { isAuthenticated: () => isAuthenticated } as unknown as AuthService;
    TestBed.configureTestingModule({
      providers: [provideRouter([]), { provide: AuthService, useValue: authService }],
    });
    return { router: TestBed.inject(Router) };
  }

  it('allows navigation when authenticated', () => {
    setup(true);
    const result = TestBed.runInInjectionContext(() =>
      authGuard({} as never, { url: '/billing/invoices' } as never),
    );
    expect(result).toBe(true);
  });

  it('redirects to /login when not authenticated', () => {
    setup(false);
    const result = TestBed.runInInjectionContext(() =>
      authGuard({} as never, { url: '/billing/invoices' } as never),
    );
    expect(result).not.toBe(true);
  });
});

describe('permissionGuard', () => {
  function setup(hasPermission: boolean) {
    const authService = { hasPermission: () => hasPermission } as unknown as AuthService;
    TestBed.configureTestingModule({
      providers: [provideRouter([]), { provide: AuthService, useValue: authService }],
    });
  }

  it('allows navigation when the user has the required permission', () => {
    setup(true);
    const guard = permissionGuard('billing.manage');
    const result = TestBed.runInInjectionContext(() => guard({} as never, {} as never));
    expect(result).toBe(true);
  });

  it('redirects to /login when the user lacks the required permission', () => {
    setup(false);
    const guard = permissionGuard('billing.manage');
    const result = TestBed.runInInjectionContext(() => guard({} as never, {} as never));
    expect(result).not.toBe(true);
  });

  it('rejects when the user holds a different permission than the one required', () => {
    // A non-discriminating stub (hasPermission: () => bool, as above) can't tell "checks the
    // right permission" apart from "checks nothing at all" — this one actually distinguishes.
    const authService = { hasPermission: (p: string) => p === 'billing.manage' } as unknown as AuthService;
    TestBed.configureTestingModule({
      providers: [provideRouter([]), { provide: AuthService, useValue: authService }],
    });
    const guard = permissionGuard('billing.read');
    const result = TestBed.runInInjectionContext(() => guard({} as never, {} as never));
    expect(result).not.toBe(true);
  });

  it('allows navigation when the user has any one permission from an array (OR semantics)', () => {
    const authService = {
      hasPermission: (p: string) => p === 'helpdesk.create',
    } as unknown as AuthService;
    TestBed.configureTestingModule({
      providers: [provideRouter([]), { provide: AuthService, useValue: authService }],
    });
    const guard = permissionGuard(['helpdesk.read', 'helpdesk.create']);
    const result = TestBed.runInInjectionContext(() => guard({} as never, {} as never));
    expect(result).toBe(true);
  });

  it('redirects to /login when the user has none of the permissions in an array', () => {
    setup(false);
    const guard = permissionGuard(['helpdesk.read', 'helpdesk.create']);
    const result = TestBed.runInInjectionContext(() => guard({} as never, {} as never));
    expect(result).not.toBe(true);
  });
});

describe('platformGuard / tenantGuard', () => {
  function setup(isAuthenticated: boolean, isPlatformAdmin: boolean) {
    const authService = {
      isAuthenticated: () => isAuthenticated,
      isPlatformAdmin: () => isPlatformAdmin,
    } as unknown as AuthService;
    TestBed.configureTestingModule({
      providers: [provideRouter([]), { provide: AuthService, useValue: authService }],
    });
  }

  it('platformGuard allows a platform admin', () => {
    setup(true, true);
    const result = TestBed.runInInjectionContext(() =>
      platformGuard({} as never, { url: '/platform/tenants' } as never),
    );
    expect(result).toBe(true);
  });

  it('platformGuard sends a tenant user to the tenant landing page', () => {
    setup(true, false);
    const result = TestBed.runInInjectionContext(() =>
      platformGuard({} as never, { url: '/platform/tenants' } as never),
    );
    expect(result?.toString()).toBe('/billing/invoices');
  });

  it('platformGuard sends an unauthenticated visitor to /login', () => {
    setup(false, false);
    const result = TestBed.runInInjectionContext(() =>
      platformGuard({} as never, { url: '/platform/tenants' } as never),
    );
    expect(result?.toString()).toBe('/login');
  });

  it('tenantGuard allows a tenant user', () => {
    setup(true, false);
    const result = TestBed.runInInjectionContext(() =>
      tenantGuard({} as never, { url: '/clinical/patients' } as never),
    );
    expect(result).toBe(true);
  });

  it('tenantGuard sends a platform admin to the platform landing page', () => {
    setup(true, true);
    const result = TestBed.runInInjectionContext(() =>
      tenantGuard({} as never, { url: '/clinical/patients' } as never),
    );
    expect(result?.toString()).toBe('/platform/dashboard');
  });

  it('tenantGuard sends an unauthenticated visitor to /login', () => {
    setup(false, false);
    const result = TestBed.runInInjectionContext(() =>
      tenantGuard({} as never, { url: '/clinical/patients' } as never),
    );
    expect(result?.toString()).toBe('/login');
  });
});
