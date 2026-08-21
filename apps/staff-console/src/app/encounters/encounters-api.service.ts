import { Injectable, inject } from '@angular/core';
import { ApiClientService } from '@org/api-client';
import { Observable } from 'rxjs';

export interface ClinicalNote {
  id: string;
  patientId: string;
  doctorId: string;
  chiefComplaint?: string | null;
  historyOfPresentingIllness?: string | null;
  physicalExamination?: string | null;
  plan?: string | null;
  status: string;
  createdAt: string;
  updatedAt: string;
}

export interface Diagnosis {
  id: string;
  patientId: string;
  doctorId: string;
  icd10Code?: string | null;
  description: string;
  isPrimary: boolean;
  createdAt: string;
}

export interface Prescription {
  id: string;
  patientId: string;
  doctorId: string;
  medicationName: string;
  dosage: string;
  frequency: string;
  route: string;
  durationDays: number;
  notes?: string | null;
  createdAt: string;
}

export interface CreateNoteDto {
  patientId: string;
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
}

export interface CreateDiagnosisDto {
  patientId: string;
  doctorId: string;
  icd10Code?: string;
  description: string;
  isPrimary?: boolean;
}

export interface CreatePrescriptionDto {
  patientId: string;
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
  private readonly api = inject(ApiClientService);

  createNote(dto: CreateNoteDto): Observable<ClinicalNote> {
    return this.api.post<ClinicalNote>('/encounters/notes', dto);
  }

  updateNote(id: string, dto: UpdateNoteDto): Observable<ClinicalNote> {
    return this.api.patch<ClinicalNote>(`/encounters/notes/${id}`, dto);
  }

  notesByPatient(patientId: string): Observable<ClinicalNote[]> {
    return this.api.get<ClinicalNote[]>(`/encounters/notes/patient/${patientId}`);
  }

  createDiagnosis(dto: CreateDiagnosisDto): Observable<Diagnosis> {
    return this.api.post<Diagnosis>('/encounters/diagnoses', dto);
  }

  deleteDiagnosis(id: string): Observable<{ success: boolean }> {
    return this.api.delete<{ success: boolean }>(`/encounters/diagnoses/${id}`);
  }

  diagnosesByPatient(patientId: string): Observable<Diagnosis[]> {
    return this.api.get<Diagnosis[]>(`/encounters/diagnoses/patient/${patientId}`);
  }

  createPrescription(dto: CreatePrescriptionDto): Observable<Prescription> {
    return this.api.post<Prescription>('/encounters/prescriptions', dto);
  }

  deletePrescription(id: string): Observable<{ success: boolean }> {
    return this.api.delete<{ success: boolean }>(`/encounters/prescriptions/${id}`);
  }

  prescriptionsByPatient(patientId: string): Observable<Prescription[]> {
    return this.api.get<Prescription[]>(`/encounters/prescriptions/patient/${patientId}`);
  }
}
