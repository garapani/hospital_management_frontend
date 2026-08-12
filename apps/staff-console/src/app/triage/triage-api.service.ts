import { Injectable, inject } from '@angular/core';
import { ApiClientService } from '@org/api-client';

export interface TriageEntry {
  id: string;
  patientId: string | null;
  firstName: string | null;
  lastName: string | null;
  gender: string | null;
  estimatedAge: string | null;
  arrivalMode: string | null;
  broughtBy: string | null;
  isPoliceCase: boolean;
  chiefComplaint: string | null;
  acuityLevel: number | null;
  colorCode: string | null;
  triagedBy: string | null;
  triagedAt: string | null;
  status: string;
  dischargeRemarks: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateTriageEntryDto {
  patientId?: string;
  firstName?: string;
  lastName?: string;
  gender?: string;
  estimatedAge?: string;
  arrivalMode?: string;
  broughtBy?: string;
  isPoliceCase?: boolean;
  chiefComplaint?: string;
}

export interface UpdateTriageEntryDto {
  firstName?: string;
  lastName?: string;
  gender?: string;
  estimatedAge?: string;
  arrivalMode?: string;
  broughtBy?: string;
  isPoliceCase?: boolean;
  chiefComplaint?: string;
  acuityLevel?: number;
  colorCode?: string;
  triagedBy?: string;
  triagedAt?: string;
  status?: string;
  dischargeRemarks?: string;
}

@Injectable({ providedIn: 'root' })
export class TriageApiService {
  private apiClient = inject(ApiClientService);

  create(data: CreateTriageEntryDto) {
    return this.apiClient.post<TriageEntry>('/triage/entries', data);
  }

  listActive() {
    return this.apiClient.get<TriageEntry[]>('/triage/entries');
  }

  findOne(id: string) {
    return this.apiClient.get<TriageEntry>(`/triage/entries/${id}`);
  }

  update(id: string, data: UpdateTriageEntryDto) {
    return this.apiClient.patch<TriageEntry>(`/triage/entries/${id}`, data);
  }

  linkPatient(id: string, patientId: string) {
    return this.apiClient.patch<TriageEntry>(`/triage/entries/${id}/link-patient`, { patientId });
  }
}
