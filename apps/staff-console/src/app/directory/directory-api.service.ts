import { Injectable, inject } from '@angular/core';
import { ApiClientService } from '@org/api-client';
import { Observable } from 'rxjs';

export type DirectoryEntityType =
  | 'patient'
  | 'doctor'
  | 'ward'
  | 'bed'
  | 'item'
  | 'orderItem'
  | 'test'
  | 'imagingItem'
  | 'invoice'
  | 'employee'
  | 'department';

export interface DirectoryResolveRequest {
  patientIds?: string[];
  doctorIds?: string[];
  wardIds?: string[];
  bedIds?: string[];
  itemIds?: string[];
  orderItemIds?: string[];
  testIds?: string[];
  imagingItemIds?: string[];
  invoiceIds?: string[];
  employeeIds?: string[];
  departmentIds?: string[];
}

export interface DirectoryResolveResult {
  patients: Record<string, { displayName: string; patientNo: string }>;
  doctors: Record<string, { displayName: string }>;
  wards: Record<string, { displayName: string }>;
  beds: Record<string, { displayName: string }>;
  items: Record<string, { displayName: string }>;
  orderItems: Record<string, { displayName: string }>;
  tests: Record<string, { displayName: string }>;
  imagingItems: Record<string, { displayName: string }>;
  invoices: Record<string, { displayName: string }>;
  employees: Record<string, { displayName: string }>;
  departments: Record<string, { displayName: string }>;
}

@Injectable({ providedIn: 'root' })
export class DirectoryApiService {
  private readonly api = inject(ApiClientService);

  resolve(request: DirectoryResolveRequest): Observable<DirectoryResolveResult> {
    return this.api.post<DirectoryResolveResult>('/directory/resolve', request);
  }
}
