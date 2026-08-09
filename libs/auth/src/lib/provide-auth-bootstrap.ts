import { EnvironmentProviders, inject, provideAppInitializer } from '@angular/core';
import { AuthService } from './auth.service.js';

/**
 * Best-effort silent refresh on app startup when a refresh token survived a reload — a failed
 * refresh already clears the session and redirects to login, so this never blocks bootstrap.
 */
export function provideAuthBootstrap(): EnvironmentProviders {
  return provideAppInitializer(() => {
    const authService = inject(AuthService);
    if (!authService.hasStoredSession()) {
      return;
    }
    return new Promise<void>((resolve) => {
      authService.refreshAccessToken().subscribe({ next: () => resolve(), error: () => resolve() });
    });
  });
}
