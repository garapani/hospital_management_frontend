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
import { authInterceptor, provideAuthBootstrap } from '@org/auth';
import { environment } from '../environments/environment';
import { appRoutes } from './app.routes';

// Ocean Breeze (Teal & Blue) ramp for the Glassmorphism aesthetic.
const OceanBreezePreset = definePreset(Aura, {
  semantic: {
    primary: {
      50: '#f0f9ff',
      100: '#e0f2fe',
      200: '#bae6fd',
      300: '#7dd3fc',
      400: '#38bdf8',
      500: '#0ea5e9',
      600: '#0284c7', // main button color
      700: '#0369a1',
      800: '#075985',
      900: '#0c4a6e',
      950: '#082f49',
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

  // Map the 'admin' subdomain to the 'demo' tenant for local development,
  // since the Super Admin account is seeded inside the 'demo' tenant schema.
  if (subdomain === 'admin') {
    return 'demo';
  }

  // E.g., 'cityhospital.localhost' -> 'cityhospital'
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
        preset: OceanBreezePreset,
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
