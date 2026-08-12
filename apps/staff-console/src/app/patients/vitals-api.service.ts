import { Injectable, inject } from '@angular/core';
import { ApiClientService } from '@org/api-client';

export interface Vital {
  id: string;
  patientId: string;
  appointmentId?: string;
  height?: number;
  weight?: number;
  bmi?: number;
  temperature?: number;
  pulse?: number;
  bpSystolic?: number;
  bpDiastolic?: number;
  respiratoryRate?: number;
  spO2?: number;
  painScale?: number;
  triageNotes?: string;
  recordedAt: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateVitalDto {
  patientId: string;
  appointmentId?: string;
  height?: number;
  weight?: number;
  temperature?: number;
  pulse?: number;
  bpSystolic?: number;
  bpDiastolic?: number;
  respiratoryRate?: number;
  spO2?: number;
  painScale?: number;
  triageNotes?: string;
  recordedAt?: string;
}

export type UpdateVitalDto = Omit<CreateVitalDto, 'patientId'>;

@Injectable({ providedIn: 'root' })
export class VitalsApiService {
  private apiClient = inject(ApiClientService);

  create(data: CreateVitalDto) {
    return this.apiClient.post<Vital>('/vitals', data);
  }

  listByPatient(patientId: string) {
    return this.apiClient.get<Vital[]>(`/vitals/patient/${patientId}`);
  }

  update(id: string, data: UpdateVitalDto) {
    return this.apiClient.patch<Vital>(`/vitals/${id}`, data);
  }

  void(id: string) {
    return this.apiClient.delete<{ success: boolean }>(`/vitals/${id}`);
  }
}
