import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from './auth.service.js';

export const authGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  if (authService.isAuthenticated()) {
    return true;
  }
  return inject(Router).createUrlTree(['/login']);
};

/** hasPermission() is false when unauthenticated too, so this alone covers both cases. */
export function permissionGuard(permission: string): CanActivateFn {
  return () => {
    const authService = inject(AuthService);
    if (authService.hasPermission(permission)) {
      return true;
    }
    return inject(Router).createUrlTree(['/login']);
  };
}
