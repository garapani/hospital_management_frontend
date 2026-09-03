import { Injectable, inject } from '@angular/core';
import { ApiClientService } from '@org/api-client';
import { Observable, map } from 'rxjs';
import { PaginatedResponse, AuditRecord } from '../audit/audit.model.js';
import {
  AdminCredentials,
  Package,
  ProvisionTenantDto,
  Tenant,
  TenantRoleOption,
} from './tenant.model.js';

/** POST /tenants returns the tenant plus the bootstrap Hospital Admin credentials. */
export interface ProvisionResult extends Tenant {
  adminCredentials: AdminCredentials;
}

@Injectable({ providedIn: 'root' })
export class TenantsApiService {
  private readonly api = inject(ApiClientService);

  provision(dto: ProvisionTenantDto): Observable<ProvisionResult> {
    return this.api.post<ProvisionResult>('/tenants', dto);
  }

  /** The sellable editions, for the provision form and the package-change control. */
  listPackages(): Observable<Package[]> {
    return this.api.get<Package[]>('/packages');
  }

  /** Switches a tenant's edition (upgrade/downgrade). Takes effect at next login/refresh. */
  setPackage(hospitalId: string, packageCode: string): Observable<Tenant> {
    return this.api.patch<Tenant>(`/tenants/${hospitalId}/package`, { packageCode });
  }

  // GET /tenants is paginated server-side now (unbounded-list hardening). limit: 100 keeps this
  // returning "the full set" for the platform-console screens, which don't have pager UI — tenant
  // counts are small (hospitals on the platform) so 100 covers real usage; unwrapped here so
  // callers keep seeing a plain array, matching every other catalog-style list in this service.
  list(): Observable<Tenant[]> {
    return this.api
      .get<PaginatedResponse<Tenant>>('/tenants', { params: { limit: 100 } })
      .pipe(map((res) => res.data));
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

  /** Soft-delete: keeps schema + data, blocks login, reversible via restore. */
  archive(id: string): Observable<Tenant> {
    return this.api.patch<Tenant>(`/tenants/${id}/archive`, {});
  }

  restore(id: string): Observable<Tenant> {
    return this.api.patch<Tenant>(`/tenants/${id}/restore`, {});
  }

  /** Irreversible — drops schema + role + registry row. Archived tenants only; hospitalId must
   *  be confirmed exactly (typed confirmation in the UI). */
  purge(id: string, confirmHospitalId: string): Observable<{ purged: string }> {
    return this.api.patch<{ purged: string }>(`/tenants/${id}/purge`, { confirmHospitalId });
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

  /** Platform-side history for one tenant: the platform audit trail's events whose record is
   *  this tenant (created, package changes, suspension events) — from the platform tenant's own
   *  audit schema, so no cross-tenant data is involved. A wide date range is passed because the
   *  audit search defaults to a 24h window. */
  history(id: string): Observable<PaginatedResponse<AuditRecord>> {
    return this.api.get<PaginatedResponse<AuditRecord>>('/audit', {
      params: {
        tableName: 'tenants',
        recordId: id,
        startDate: '2000-01-01T00:00:00.000Z',
        endDate: new Date().toISOString(),
        page: 1,
        limit: 50,
      },
    });
  }
}
