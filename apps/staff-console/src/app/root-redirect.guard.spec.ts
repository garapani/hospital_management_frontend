import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { AuthService } from '@org/auth';
import { rootRedirectGuard } from './root-redirect.guard.js';

describe('rootRedirectGuard', () => {
  function setup(isAuthenticated: boolean, isPlatformAdmin: boolean) {
    const authService = {
      isAuthenticated: () => isAuthenticated,
      isPlatformAdmin: () => isPlatformAdmin,
    } as unknown as AuthService;
    TestBed.configureTestingModule({
      providers: [provideRouter([]), { provide: AuthService, useValue: authService }],
    });
  }

  it('sends a platform admin to the platform dashboard', () => {
    setup(true, true);
    const result = TestBed.runInInjectionContext(() =>
      rootRedirectGuard({} as never, { url: '/' } as never),
    );
    expect(result?.toString()).toBe('/platform/dashboard');
  });

  it('sends a tenant user to the tenant landing page', () => {
    setup(true, false);
    const result = TestBed.runInInjectionContext(() =>
      rootRedirectGuard({} as never, { url: '/' } as never),
    );
    expect(result?.toString()).toBe('/billing/invoices');
  });

  it('sends an unauthenticated visitor to /login', () => {
    setup(false, false);
    const result = TestBed.runInInjectionContext(() =>
      rootRedirectGuard({} as never, { url: '/' } as never),
    );
    expect(result?.toString()).toBe('/login');
  });
});
