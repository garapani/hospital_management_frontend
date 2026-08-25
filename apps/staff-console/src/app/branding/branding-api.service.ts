import { Injectable, inject } from '@angular/core';
import { ApiClientService } from '@org/api-client';
import { Observable } from 'rxjs';
import { TenantBranding } from './branding.model.js';

export interface UpsertBrandingDto {
  displayName?: string | null;
  primaryColor?: string | null;
  tagline?: string | null;
  description?: string | null;
  footerText?: string | null;
  supportText?: string | null;
}

@Injectable({ providedIn: 'root' })
export class BrandingApiService {
  private readonly api = inject(ApiClientService);

  /** Public, unauthenticated — resolved from the x-tenant-id header. Works pre-login. */
  getPublicBranding(): Observable<TenantBranding> {
    return this.api.get<TenantBranding>('/branding');
  }

  // Platform-admin CRUD (system-admin.tenants.manage) — used by the tenant-detail Branding panel.

  getForAdmin(hospitalId: string): Observable<TenantBranding> {
    return this.api.get<TenantBranding>(`/platform/tenants/${hospitalId}/branding`);
  }

  upsert(hospitalId: string, dto: UpsertBrandingDto): Observable<TenantBranding> {
    return this.api.put<TenantBranding>(`/platform/tenants/${hospitalId}/branding`, dto);
  }

  uploadLogo(hospitalId: string, file: File): Observable<TenantBranding> {
    const formData = new FormData();
    formData.append('file', file);
    return this.api.post<TenantBranding>(`/platform/tenants/${hospitalId}/branding/logo`, formData);
  }

  removeLogo(hospitalId: string): Observable<TenantBranding> {
    return this.api.delete<TenantBranding>(`/platform/tenants/${hospitalId}/branding/logo`);
  }
}
