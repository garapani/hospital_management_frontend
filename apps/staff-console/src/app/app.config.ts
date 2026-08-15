import {
  ApplicationConfig,
  provideBrowserGlobalErrorListeners,
} from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { providePrimeNG } from 'primeng/config';
import { definePreset } from '@primeuix/themes';
import Aura from '@primeuix/themes/aura';
import { API_BASE_URL, TENANT_ID } from '@org/api-client';
import { authInterceptor, provideAuthBootstrap, PLATFORM_TENANT_ID } from '@org/auth';
import { environment } from '../environments/environment';
import { appRoutes } from './app.routes';

/**
 * Vaidya brand teal on cool slate neutrals. Must stay in sync with the accent tokens in
 * styles.css (`accent-bg`, `nav-item-active`) — PrimeNG components and hand-rolled elements sit
 * side by side on the same screen, so a drift between the two shows up immediately as two
 * different teals. `600` is the brand's primary hex (`#006D77`, PRD "Brand colors"); `50` is the
 * brand's background/surface hex (`#F0FDFD`) rather than a derived tint, so both brand colors stay
 * the single source of truth other components (e.g. `body`'s `bg-primary-50`) pull from.
 */
const VaidyaTealPreset = definePreset(Aura, {
  semantic: {
    primary: {
      50: '#f0fdfd',
      100: '#e5f4f5',
      200: '#c4eaee',
      300: '#95dee4',
      400: '#57d0db',
      500: '#1ec3d2',
      600: '#006d77', // main action colour — matches .accent-bg
      700: '#02575e',
      800: '#044349',
      900: '#043034',
      950: '#041e20',
    },
    colorScheme: {
      light: {
        primary: {
          color: '{primary.600}',
          contrastColor: '#ffffff',
          hoverColor: '{primary.700}',
          activeColor: '{primary.800}',
        },
        highlight: {
          background: '{primary.50}',
          focusBackground: '{primary.100}',
          color: '{primary.700}',
          focusColor: '{primary.800}',
        },
      },
    },
  },
});

/**
 * Resolves the tenant ID from the subdomain with fallback mechanism for invalid tenant IDs.
 * - Extracts subdomain from hostname (e.g., 'cityhospital.localhost' -> 'cityhospital')
 * - Returns PLATFORM_TENANT_ID for 'admin' subdomain
 * - Falls back to environment default for localhost, IP addresses, or www
 * - Invalid/non-existent tenant IDs will be handled by backend authentication
 */
export function resolveTenantId(): string {
  if (typeof window === 'undefined') return environment.tenantId;

  const hostname = window.location.hostname;
  const parts = hostname.split('.');

  // Fallback to environment default if no subdomain (e.g. localhost, 127.0.0.1)
  if (parts.length === 1 || (parts.length === 4 && !isNaN(Number(parts[0])))) {
    return environment.tenantId;
  }

  const subdomain = parts[0];

  // If the subdomain is 'www', fallback or handle it
  if (subdomain === 'www') {
    return environment.tenantId;
  }

  // The platform console is served from the 'admin' subdomain; its accounts live in the reserved
  // platform tenant, not inside any hospital. Dev: http://admin.localhost:4200.
  if (subdomain === 'admin') {
    return PLATFORM_TENANT_ID;
  }

  // E.g., 'cityhospital.localhost' -> 'cityhospital'
  // Note: Invalid tenant IDs will be rejected by backend during authentication
  return subdomain;
}

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(appRoutes),
    provideAnimationsAsync(),
    provideHttpClient(withInterceptors([authInterceptor])),
    { provide: API_BASE_URL, useValue: environment.apiBaseUrl },
    { provide: TENANT_ID, useFactory: resolveTenantId },
    provideAuthBootstrap(),
    providePrimeNG({
      theme: {
        preset: VaidyaTealPreset,
        options: {
          // Off for now — a future dark theme needs this switched to a selector (e.g. '.dark')
          // and a colorScheme.dark block added to VaidyaTealPreset above; see styles.css's
          // status-rail-tokens comment for the other half (Tailwind's own color variables).
          darkModeSelector: false,
          cssLayer: {
            name: 'primeng',
            order: 'tailwind-base, primeng, tailwind-utilities',
          },
        },
      },
    }),
  ],
};
