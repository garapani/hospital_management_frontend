import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { authGuard, permissionGuard } from './auth.guard.js';
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
});
