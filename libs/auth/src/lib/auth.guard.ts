import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from './auth.service.js';

/**
 * Auth guard that checks if user is authenticated.
 * Note: During app bootstrap, silent refresh may not have completed yet.
 * The provideAuthBootstrap() handles silent refresh on app startup.
 * If this guard runs before bootstrap completes, it may return false temporarily.
 * Users should be redirected to login, and bootstrap will restore their session.
 */
export const authGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  if (authService.isAuthenticated()) {
    return true;
  }
  // Not authenticated yet - could be unauthenticated or bootstrap in progress
  // Redirect to login; if bootstrap succeeds, user will be redirected back
  return inject(Router).createUrlTree(['/login']);
};

/** 
 * Permission guard that checks if user has the required permission.
 * hasPermission() is false when unauthenticated too, so this alone covers both cases.
 * @param permission - The permission string to check against user's claims
 */
export function permissionGuard(permission: string): CanActivateFn {
  return () => {
    const authService = inject(AuthService);
    if (authService.hasPermission(permission)) {
      return true;
    }
    return inject(Router).createUrlTree(['/login']);
  };
}

export const PLATFORM_LANDING_URL = '/platform/dashboard';
export const TENANT_LANDING_URL = '/billing/invoices';

/**
 * Keeps each audience inside its own route tree. The wrong audience is redirected to the other
 * tree's landing page rather than to /login — a mis-typed URL is not a session failure, and
 * bouncing a signed-in user to a login form reads as one.
 */
export const platformGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const router = inject(Router);
  if (!authService.isAuthenticated()) {
    return router.createUrlTree(['/login']);
  }
  return authService.isPlatformAdmin() ? true : router.createUrlTree([TENANT_LANDING_URL]);
};

export const tenantGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const router = inject(Router);
  if (!authService.isAuthenticated()) {
    return router.createUrlTree(['/login']);
  }
  return authService.isPlatformAdmin() ? router.createUrlTree([PLATFORM_LANDING_URL]) : true;
};
