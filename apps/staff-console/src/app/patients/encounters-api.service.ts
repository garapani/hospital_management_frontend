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

@Injectable({ providedIn: 'root' })
export class EncountersApiService {
  private apiClient = inject(ApiClientService);

  createNote(data: CreateNoteDto) {
    return this.apiClient.post<ClinicalNote>('/encounters/notes', data);
  }

  updateNote(id: string, data: UpdateNoteDto) {
    return this.apiClient.patch<ClinicalNote>(`/encounters/notes/${id}`, data);
  }

  getNotesByPatient(patientId: string) {
    return this.apiClient.get<ClinicalNote[]>(`/encounters/notes/patient/${patientId}`);
  }

  createDiagnosis(data: CreateDiagnosisDto) {
    return this.apiClient.post<Diagnosis>('/encounters/diagnoses', data);
  }

  deleteDiagnosis(id: string) {
    return this.apiClient.delete<{ success: boolean }>(`/encounters/diagnoses/${id}`);
  }

  getDiagnosesByPatient(patientId: string) {
    return this.apiClient.get<Diagnosis[]>(`/encounters/diagnoses/patient/${patientId}`);
  }

  createPrescription(data: CreatePrescriptionDto) {
    return this.apiClient.post<Prescription>('/encounters/prescriptions', data);
  }

  deletePrescription(id: string) {
    return this.apiClient.delete<{ success: boolean }>(`/encounters/prescriptions/${id}`);
  }

  getPrescriptionsByPatient(patientId: string) {
    return this.apiClient.get<Prescription[]>(`/encounters/prescriptions/patient/${patientId}`);
  }
}
