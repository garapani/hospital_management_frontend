import { Injectable, inject } from '@angular/core';
import { ApiClientService } from '@org/api-client';
import { Observable } from 'rxjs';
import { ProvisionTenantDto, Tenant } from './tenant.model.js';

@Injectable({ providedIn: 'root' })
export class TenantsApiService {
  private readonly api = inject(ApiClientService);

  provision(dto: ProvisionTenantDto): Observable<Tenant> {
    return this.api.post<Tenant>('/tenants', dto);
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
}
