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

// Ocean Breeze (Teal & Blue) ramp for the Glassmorphism aesthetic.
/**
 * Indigo primary on cool slate neutrals. Must stay in sync with the accent tokens in styles.css
 * (`accent-bg`, `nav-item-active`) — PrimeNG components and hand-rolled elements sit side by side
 * on the same screen, so a drift between the two shows up immediately as two different blues.
 */
const IndigoSlatePreset = definePreset(Aura, {
  semantic: {
    primary: {
      50: '#eef2ff',
      100: '#e0e7ff',
      200: '#c7d2fe',
      300: '#a5b4fc',
      400: '#818cf8',
      500: '#6366f1',
      600: '#4f46e5', // main action colour — matches .accent-bg
      700: '#4338ca',
      800: '#3730a3',
      900: '#312e81',
      950: '#1e1b4b',
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
        preset: IndigoSlatePreset,
        options: {
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
