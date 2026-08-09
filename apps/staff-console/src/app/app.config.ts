import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { providePrimeNG } from 'primeng/config';
import { definePreset } from '@primeuix/themes';
import Aura from '@primeuix/themes/aura';
import { API_BASE_URL } from '@org/api-client';
import { authInterceptor, provideAuthBootstrap } from '@org/auth';
import { environment } from '../environments/environment';
import { appRoutes } from './app.routes';

// Navy ramp anchored on the brand color #173b63 (step 700). See
// new/docs/superpowers/specs/2026-08-09-frontend-design-refresh-design.md for the full rationale —
// this ramp was hand-picked, not generated, and should be redone properly (not hand-extended) if a
// second brand color or a generated-palette tool ever enters the picture.
const MediCareNavyPreset = definePreset(Aura, {
  semantic: {
    primary: {
      50: '#eef3f9',
      100: '#d9e4f0',
      200: '#b3c9e1',
      300: '#86a8cc',
      400: '#5c86b0',
      500: '#3d668f',
      600: '#2a4f74',
      700: '#173b63',
      800: '#122f50',
      900: '#0d233c',
      950: '#08141f',
    },
    colorScheme: {
      light: {
        primary: {
          color: '{primary.700}',
          contrastColor: '#ffffff',
          hoverColor: '{primary.800}',
          activeColor: '{primary.900}',
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

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(appRoutes),
    provideAnimationsAsync(),
    provideHttpClient(withInterceptors([authInterceptor])),
    { provide: API_BASE_URL, useValue: environment.apiBaseUrl },
    provideAuthBootstrap(),
    providePrimeNG({
      theme: {
        preset: MediCareNavyPreset,
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
