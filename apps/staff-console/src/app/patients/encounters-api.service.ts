import { Injectable, inject } from '@angular/core';
import { ApiClientService } from '@org/api-client';

export interface ClinicalNote {
  id: string;
  patientId: string;
  appointmentId?: string;
  doctorId: string;
  chiefComplaint?: string;
  historyOfPresentingIllness?: string;
  physicalExamination?: string;
  plan?: string;
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
  appointmentId?: string;
  doctorId: string;
  icd10Code?: string;
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
  appointmentId?: string;
  doctorId: string;
  medicationName: string;
  dosage: string;
  frequency: string;
  route: string;
  durationDays: number;
  notes?: string;
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
  private apiClient = inject(ApiClientService);

  createNote(data: CreateNoteDto) {
    return this.apiClient.post<ClinicalNote>('/encounters/notes', data);
  }

  updateNote(id: string, data: UpdateNoteDto) {
    return this.apiClient.patch<ClinicalNote>(`/encounters/notes/${id}`, data);
  }

  // Backend paginates this endpoint (PaginatedResponseDto<ClinicalNote>) — matching the shape
  // every other patient-chart tab's list endpoint returns, not a raw array.
  getNotesByPatient(patientId: string, limit?: number) {
    return this.apiClient.get<PaginatedResponse<ClinicalNote>>(`/encounters/notes/patient/${patientId}`, {
      params: limit !== undefined ? { limit } : {},
    });
  }

  createDiagnosis(data: CreateDiagnosisDto) {
    return this.apiClient.post<Diagnosis>('/encounters/diagnoses', data);
  }

  deleteDiagnosis(id: string) {
    return this.apiClient.delete<{ success: boolean }>(`/encounters/diagnoses/${id}`);
  }

  getDiagnosesByPatient(patientId: string, limit?: number) {
    return this.apiClient.get<PaginatedResponse<Diagnosis>>(`/encounters/diagnoses/patient/${patientId}`, {
      params: limit !== undefined ? { limit } : {},
    });
  }

  createPrescription(data: CreatePrescriptionDto) {
    return this.apiClient.post<Prescription>('/encounters/prescriptions', data);
  }

  deletePrescription(id: string) {
    return this.apiClient.delete<{ success: boolean }>(`/encounters/prescriptions/${id}`);
  }

  getPrescriptionsByPatient(patientId: string, limit?: number) {
    return this.apiClient.get<PaginatedResponse<Prescription>>(`/encounters/prescriptions/patient/${patientId}`, {
      params: limit !== undefined ? { limit } : {},
    });
  }
}
