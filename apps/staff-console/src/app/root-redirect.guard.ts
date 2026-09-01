import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService, PLATFORM_LANDING_URL } from '@org/auth';
import { resolveTenantLandingUrl } from './login/login.js';

/**
 * Resolves the bare '' URL to whichever landing page matches the signed-in audience. Runs on
 * every hit of '/' — not just first login, but a page refresh or the SPA cold-booting on the
 * root URL while a session already exists — so the tenant branch must use the same per-role
 * resolution login.ts uses, not a single hardcoded route. It used to hardcode
 * '/billing/invoices' (@org/auth's TENANT_LANDING_URL), which only Receptionist/Billing-Staff
 * can reach: a Doctor or Nurse refreshing the browser got rejected by permissionGuard and bounced
 * to /login despite holding a valid session.
 */
export const rootRedirectGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const router = inject(Router);
  if (!authService.isAuthenticated()) {
    return router.createUrlTree(['/login']);
  }
  if (authService.isPlatformAdmin()) {
    return router.createUrlTree([PLATFORM_LANDING_URL]);
  }
  const landingUrl = resolveTenantLandingUrl(authService);
  // No accessible screens for this role — same edge case login.ts surfaces as an inline error;
  // a guard has no UI to show it in, so fall back to /login rather than an infinite redirect loop.
  return router.createUrlTree([landingUrl ?? '/login']);
};
