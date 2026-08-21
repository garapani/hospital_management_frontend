import { Injectable, inject } from '@angular/core';
import { ApiClientService } from '@org/api-client';
import { Observable } from 'rxjs';
import { Package, ProvisionTenantDto, Tenant, TenantRoleOption } from './tenant.model.js';

@Injectable({ providedIn: 'root' })
export class TenantsApiService {
  private readonly api = inject(ApiClientService);

  provision(dto: ProvisionTenantDto): Observable<Tenant> {
    return this.api.post<Tenant>('/tenants', dto);
  }

  /** The sellable editions, for the provision form and the package-change control. */
  listPackages(): Observable<Package[]> {
    return this.api.get<Package[]>('/packages');
  }

  /** Switches a tenant's edition (upgrade/downgrade). Takes effect at next login/refresh. */
  setPackage(hospitalId: string, packageCode: string): Observable<Tenant> {
    return this.api.patch<Tenant>(`/tenants/${hospitalId}/package`, { packageCode });
  }

  // GET /tenants has no pagination or query params on the backend (TenantsController#list) —
  // tenant counts are small (hospitals on the platform), so this always returns the full set.
  list(): Observable<Tenant[]> {
    return this.api.get<Tenant[]>('/tenants');
  }

  getOne(id: string): Observable<Tenant> {
    return this.api.get<Tenant>(`/tenants/${id}`);
  }

  suspend(id: string): Observable<Tenant> {
    return this.api.patch<Tenant>(`/tenants/${id}/suspend`, {});
  }

  reactivate(id: string): Observable<Tenant> {
    return this.api.patch<Tenant>(`/tenants/${id}/reactivate`, {});
  }

  listRoles(id: string): Observable<TenantRoleOption[]> {
    return this.api.get<TenantRoleOption[]>(`/tenants/${id}/roles`);
  }

  /**
   * Replaces the tenant's enabled role set. Rejects with a 409 whose body carries `blocked` when a
   * role being switched off is still held by accounts — see BlockedRole.
   */
  setRoles(id: string, roleIds: string[]): Observable<TenantRoleOption[]> {
    return this.api.patch<TenantRoleOption[]>(`/tenants/${id}/roles`, { roleIds });
  }
}
