import { Injectable, inject, signal } from '@angular/core';
import { TENANT_ID } from '@org/api-client';
import { PLATFORM_TENANT_ID } from '@org/auth';
import { BrandingApiService } from './branding-api.service.js';
import { buildColorRamp, TenantBranding } from './branding.model.js';

/**
 * Per-tenant white-label state: loaded once at app bootstrap (see `provideBrandingBootstrap`),
 * consumed by the shell/login/change-password screens via the signals below. The platform console
 * (admin subdomain) never fetches or applies branding — it always shows the default Vaidya brand,
 * per PRD/design decision (§ `Development-Standards.md`, per-tenant branding).
 */
@Injectable({ providedIn: 'root' })
export class BrandingService {
  private readonly brandingApi = inject(BrandingApiService);
  private readonly tenantId = inject(TENANT_ID);

  readonly displayName = signal<string | null>(null);
  readonly logoUrl = signal<string | null>(null);
  readonly primaryColor = signal<string | null>(null);

  /** Best-effort: a failed/slow branding fetch never blocks the app from rendering — the default
   *  Vaidya brand (this service's initial signal state) is a perfectly good fallback. */
  load(): Promise<void> {
    if (this.tenantId === PLATFORM_TENANT_ID) {
      return Promise.resolve();
    }
    return new Promise<void>((resolve) => {
      this.brandingApi.getPublicBranding().subscribe({
        next: (branding) => {
          this.apply(branding);
          resolve();
        },
        error: () => resolve(),
      });
    });
  }

  private apply(branding: TenantBranding): void {
    this.displayName.set(branding.displayName);
    this.logoUrl.set(branding.logoUrl);
    this.primaryColor.set(branding.primaryColor);
    if (branding.primaryColor) {
      this.applyCssVariables(branding.primaryColor);
    }
  }

  /** Overrides the same `--p-primary-*`/`--p-highlight-*` custom properties `VaidyaTealPreset`
   *  (app.config.ts) defines — both PrimeNG components and this app's own Tailwind classes
   *  (`bg-primary-600`, etc., via `tailwindcss-primeui`) resolve from these same variables, so one
   *  override re-themes both at once. Explicit per-token overrides rather than relying on
   *  `{primary.600}`-style reference resolution at runtime, since it's not guaranteed those stay
   *  live `var()` chains after PrimeNG's own theme generation. */
  private applyCssVariables(primaryColor: string): void {
    const root = document.documentElement.style;
    const ramp = buildColorRamp(primaryColor);
    for (const [step, hex] of Object.entries(ramp)) {
      root.setProperty(`--p-primary-${step}`, hex);
    }
    root.setProperty('--p-primary-color', ramp[600]);
    root.setProperty('--p-primary-contrast-color', '#ffffff');
    root.setProperty('--p-primary-hover-color', ramp[700]);
    root.setProperty('--p-primary-active-color', ramp[800]);
    root.setProperty('--p-highlight-background', ramp[50]);
    root.setProperty('--p-highlight-focus-background', ramp[100]);
    root.setProperty('--p-highlight-color', ramp[700]);
    root.setProperty('--p-highlight-focus-color', ramp[800]);
  }
}
