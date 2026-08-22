import { EnvironmentProviders, inject, provideAppInitializer } from '@angular/core';
import { BrandingService } from './branding.service.js';

/**
 * Loads the tenant's branding before the app finishes bootstrapping, same pattern as
 * `provideAuthBootstrap` (`@org/auth`) — so the login page never flashes the default Vaidya brand
 * before swapping to the tenant's real one. Best-effort: `BrandingService.load()` always resolves,
 * never blocks bootstrap on a slow/failed request.
 */
export function provideBrandingBootstrap(): EnvironmentProviders {
  return provideAppInitializer(() => {
    const brandingService = inject(BrandingService);
    return brandingService.load();
  });
}
