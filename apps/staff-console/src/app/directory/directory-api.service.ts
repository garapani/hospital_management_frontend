import { Injectable, inject } from '@angular/core';
import { ApiClientService } from '@org/api-client';
import { Observable } from 'rxjs';

export type DirectoryEntityType = 'patient' | 'doctor' | 'ward' | 'bed' | 'item';

export interface DirectoryResolveRequest {
  patientIds?: string[];
  doctorIds?: string[];
  wardIds?: string[];
  bedIds?: string[];
  itemIds?: string[];
}

export interface DirectoryResolveResult {
  patients: Record<string, { displayName: string; patientNo: string }>;
  doctors: Record<string, { displayName: string }>;
  wards: Record<string, { displayName: string }>;
  beds: Record<string, { displayName: string }>;
  items: Record<string, { displayName: string }>;
}

@Injectable({ providedIn: 'root' })
export class DirectoryApiService {
  private readonly api = inject(ApiClientService);

  resolve(request: DirectoryResolveRequest): Observable<DirectoryResolveResult> {
    return this.api.post<DirectoryResolveResult>('/directory/resolve', request);
  }
}
