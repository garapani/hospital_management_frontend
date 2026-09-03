import { Injectable, inject } from '@angular/core';
import { ApiClientService } from '@org/api-client';
import { Observable, map } from 'rxjs';
import { PaginatedResponse } from '../audit/audit.model.js';

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

  // limit: 100 — a long admission's vitals history can run past the default page size (recorded
  // every few hours); unwrapped so callers keep seeing a plain array, most-recent-first (backend
  // default order), matching every other catalog-style list in this app.
  listByPatient(patientId: string): Observable<Vital[]> {
    return this.api
      .get<PaginatedResponse<Vital>>(`/vitals/patient/${patientId}`, { params: { limit: 100 } })
      .pipe(map((res) => res.data));
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
