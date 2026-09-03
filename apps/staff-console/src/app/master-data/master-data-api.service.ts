import { Injectable, inject } from '@angular/core';
import { ApiClientService } from '@org/api-client';
import { Observable, map } from 'rxjs';
import { PaginatedResponse } from '../audit/audit.model.js';
import {
  Department,
  Ward,
  Bed,
  Role,
  CreateRoleDto,
  DepartmentCatalog,
  CreateDepartmentCatalogDto,
} from './master-data.model.js';

@Injectable({ providedIn: 'root' })
export class MasterDataApiService {
  private readonly api = inject(ApiClientService);

  listDepartments(): Observable<Department[]> {
    return this.api
      .get<PaginatedResponse<Department>>('/departments', { params: { limit: 100 } })
      .pipe(map((res) => res.data));
  }

  getDepartment(id: string): Observable<Department> {
    return this.api.get<Department>(`/departments/${id}`);
  }

  createDepartment(dto: Partial<Department>): Observable<Department> {
    return this.api.post<Department>('/departments', dto);
  }

  deactivateDepartment(id: string): Observable<Department> {
    return this.api.patch<Department>(`/departments/${id}/deactivate`, {});
  }

  reactivateDepartment(id: string): Observable<Department> {
    return this.api.patch<Department>(`/departments/${id}/reactivate`, {});
  }

  listWards(): Observable<Ward[]> {
    return this.api
      .get<PaginatedResponse<Ward>>('/wards', { params: { limit: 100 } })
      .pipe(map((res) => res.data));
  }

  getWard(id: string): Observable<Ward> {
    return this.api.get<Ward>(`/wards/${id}`);
  }

  createWard(dto: Partial<Ward>): Observable<Ward> {
    return this.api.post<Ward>('/wards', dto);
  }

  deactivateWard(id: string): Observable<Ward> {
    return this.api.patch<Ward>(`/wards/${id}/deactivate`, {});
  }

  reactivateWard(id: string): Observable<Ward> {
    return this.api.patch<Ward>(`/wards/${id}/reactivate`, {});
  }

  listBedsByWard(wardId: string): Observable<Bed[]> {
    return this.api
      .get<PaginatedResponse<Bed>>(`/wards/${wardId}/beds`, { params: { limit: 100 } })
      .pipe(map((res) => res.data));
  }

  getBed(id: string): Observable<Bed> {
    return this.api.get<Bed>(`/beds/${id}`);
  }

  createBed(wardId: string, dto: Partial<Bed>): Observable<Bed> {
    return this.api.post<Bed>(`/wards/${wardId}/beds`, dto);
  }

  deactivateBed(id: string): Observable<Bed> {
    return this.api.patch<Bed>(`/beds/${id}/deactivate`, {});
  }

  reactivateBed(id: string): Observable<Bed> {
    return this.api.patch<Bed>(`/beds/${id}/reactivate`, {});
  }

  getRoles(): Observable<Role[]> {
    return this.api.get<Role[]>('/roles');
  }

  createRole(dto: CreateRoleDto): Observable<Role> {
    return this.api.post<Role>('/roles', dto);
  }

  updateRole(id: string, dto: Partial<Role>): Observable<Role> {
    return this.api.patch<Role>(`/roles/${id}`, dto);
  }

  deactivateRole(id: string): Observable<Role> {
    return this.api.patch<Role>(`/roles/${id}/deactivate`, {});
  }

  reactivateRole(id: string): Observable<Role> {
    return this.api.patch<Role>(`/roles/${id}/reactivate`, {});
  }

  listDepartmentCatalogs(): Observable<DepartmentCatalog[]> {
    return this.api.get<DepartmentCatalog[]>('/catalogs/departments');
  }

  createDepartmentCatalog(
    dto: CreateDepartmentCatalogDto,
  ): Observable<DepartmentCatalog> {
    return this.api.post<DepartmentCatalog>('/catalogs/departments', dto);
  }

  updateDepartmentCatalog(
    id: string,
    dto: Partial<DepartmentCatalog>,
  ): Observable<DepartmentCatalog> {
    return this.api.patch<DepartmentCatalog>(`/catalogs/departments/${id}`, dto);
  }

  deactivateDepartmentCatalog(id: string): Observable<DepartmentCatalog> {
    return this.api.patch<DepartmentCatalog>(`/catalogs/departments/${id}/deactivate`, {});
  }

  reactivateDepartmentCatalog(id: string): Observable<DepartmentCatalog> {
    return this.api.patch<DepartmentCatalog>(`/catalogs/departments/${id}/reactivate`, {});
  }
}
