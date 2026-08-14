import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService, PLATFORM_LANDING_URL, TENANT_LANDING_URL } from '@org/auth';

/** Resolves the bare '' URL to whichever landing page matches the signed-in audience. */
export const rootRedirectGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const router = inject(Router);
  if (!authService.isAuthenticated()) {
    return router.createUrlTree(['/login']);
  }
  return router.createUrlTree([
    authService.isPlatformAdmin() ? PLATFORM_LANDING_URL : TENANT_LANDING_URL,
  ]);
};
