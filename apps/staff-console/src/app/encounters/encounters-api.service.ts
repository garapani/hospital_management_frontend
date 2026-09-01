import { Injectable, inject } from '@angular/core';
import { ApiClientService } from '@org/api-client';
import { Observable } from 'rxjs';

export interface ClinicalNote {
  id: string;
  patientId: string;
  appointmentId?: string | null;
  doctorId: string;
  chiefComplaint?: string | null;
  historyOfPresentingIllness?: string | null;
  physicalExamination?: string | null;
  plan?: string | null;
  status: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateNoteDto {
  patientId: string;
  appointmentId?: string;
  doctorId: string;
  chiefComplaint?: string;
  historyOfPresentingIllness?: string;
  physicalExamination?: string;
  plan?: string;
}

export interface UpdateNoteDto {
  chiefComplaint?: string;
  historyOfPresentingIllness?: string;
  physicalExamination?: string;
  plan?: string;
  status?: string;
}

export interface Diagnosis {
  id: string;
  patientId: string;
  appointmentId?: string | null;
  doctorId: string;
  icd10Code?: string | null;
  description: string;
  isPrimary: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateDiagnosisDto {
  patientId: string;
  appointmentId?: string;
  doctorId: string;
  icd10Code?: string;
  description: string;
  isPrimary?: boolean;
}

export interface Prescription {
  id: string;
  patientId: string;
  appointmentId?: string | null;
  doctorId: string;
  medicationName: string;
  dosage: string;
  frequency: string;
  route: string;
  durationDays: number;
  notes?: string | null;
  status: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreatePrescriptionDto {
  patientId: string;
  appointmentId?: string;
  doctorId: string;
  medicationName: string;
  dosage: string;
  frequency: string;
  route: string;
  durationDays: number;
  notes?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

@Injectable({ providedIn: 'root' })
export class EncountersApiService {
  private readonly api = inject(ApiClientService);

  createNote(dto: CreateNoteDto): Observable<ClinicalNote> {
    return this.api.post<ClinicalNote>('/encounters/notes', dto);
  }

  updateNote(id: string, dto: UpdateNoteDto): Observable<ClinicalNote> {
    return this.api.patch<ClinicalNote>(`/encounters/notes/${id}`, dto);
  }

  // Backend paginates this endpoint (PaginatedResponseDto<ClinicalNote>), matching every other
  // patient-chart list endpoint — not a raw array (see the "Patient Edit Profile" finding for the
  // earlier instance of this exact mismatch breaking a different screen).
  getNotesByPatient(patientId: string, limit?: number): Observable<PaginatedResponse<ClinicalNote>> {
    return this.api.get<PaginatedResponse<ClinicalNote>>(`/encounters/notes/patient/${patientId}`, {
      params: limit !== undefined ? { limit } : {},
    });
  }

  createDiagnosis(dto: CreateDiagnosisDto): Observable<Diagnosis> {
    return this.api.post<Diagnosis>('/encounters/diagnoses', dto);
  }

  deleteDiagnosis(id: string): Observable<{ success: boolean }> {
    return this.api.delete<{ success: boolean }>(`/encounters/diagnoses/${id}`);
  }

  getDiagnosesByPatient(patientId: string, limit?: number): Observable<PaginatedResponse<Diagnosis>> {
    return this.api.get<PaginatedResponse<Diagnosis>>(`/encounters/diagnoses/patient/${patientId}`, {
      params: limit !== undefined ? { limit } : {},
    });
  }

  createPrescription(dto: CreatePrescriptionDto): Observable<Prescription> {
    return this.api.post<Prescription>('/encounters/prescriptions', dto);
  }

  deletePrescription(id: string): Observable<{ success: boolean }> {
    return this.api.delete<{ success: boolean }>(`/encounters/prescriptions/${id}`);
  }

  getPrescriptionsByPatient(patientId: string, limit?: number): Observable<PaginatedResponse<Prescription>> {
    return this.api.get<PaginatedResponse<Prescription>>(`/encounters/prescriptions/patient/${patientId}`, {
      params: limit !== undefined ? { limit } : {},
    });
  }
}
