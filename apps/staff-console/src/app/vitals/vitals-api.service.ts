import { Injectable, inject } from '@angular/core';
import { ApiClientService } from '@org/api-client';
import { Observable } from 'rxjs';

export interface Vital {
  id: string;
  patientId: string;
  appointmentId?: string | null;
  height?: number | null;
  weight?: number | null;
  bmi?: number | null;
  temperature?: number | null;
  pulse?: number | null;
  bpSystolic?: number | null;
  bpDiastolic?: number | null;
  respiratoryRate?: number | null;
  spO2?: number | null;
  painScale?: number | null;
  triageNotes?: string | null;
  recordedAt: string;
  createdAt: string;
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
  private readonly api = inject(ApiClientService);

  listByPatient(patientId: string): Observable<Vital[]> {
    return this.api.get<Vital[]>(`/vitals/patient/${patientId}`);
  }

  create(dto: CreateVitalDto): Observable<Vital> {
    return this.api.post<Vital>('/vitals', dto);
  }

  update(id: string, dto: UpdateVitalDto): Observable<Vital> {
    return this.api.patch<Vital>(`/vitals/${id}`, dto);
  }

  voidVital(id: string): Observable<{ success: boolean }> {
    return this.api.delete<{ success: boolean }>(`/vitals/${id}`);
  }
}
