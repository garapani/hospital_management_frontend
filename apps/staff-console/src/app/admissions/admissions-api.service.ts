import { Injectable, inject } from '@angular/core';
import { ApiClientService } from '@org/api-client';
import { Observable } from 'rxjs';

export interface Admission {
  id: string;
  patientId: string;
  admissionSource: string; // 'OPD' | 'ER' | 'Direct'
  sourceAppointmentId: string | null;
  sourceTriageEntryId: string | null;
  admittingDoctorId: string;
  wardId: string;
  bedId: string;
  admissionDate: string;
  status: string; // 'Admitted' | 'Discharged'
  dischargeDate: string | null;
  dischargeType: string | null;
  dischargeCondition: string | null;
  dischargeSummary: string | null;
  dischargedBy: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateAdmissionDto {
  patientId: string;
  admissionSource: string;
  sourceAppointmentId?: string;
  sourceTriageEntryId?: string;
  admittingDoctorId: string;
  bedId: string;
}

export interface TransferAdmissionDto {
  toBedId: string;
  transferredBy?: string;
  reason?: string;
}

export interface DischargeAdmissionDto {
  dischargedBy?: string;
  dischargeType?: string;
  dischargeCondition?: string;
  dischargeSummary?: string;
}

export interface DischargeSummary {
  id: string;
  admissionId: string;
  patientId: string;
  primaryDiagnosis: string | null;
  secondaryDiagnoses: string[];
  proceduresPerformed: string[];
  hospitalCourse: string | null;
  dischargeMedications: string | null;
  followUpInstructions: string | null;
  warningSigns: string | null;
  activityRestrictions: string | null;
  followUpAppointmentDate: string | null;
  followUpDoctorId: string | null;
  dietRecommendations: string | null;
  additionalNotes: string | null;
  preparedBy: string;
  reviewedBy: string | null;
  reviewedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateDischargeSummaryDto {
  admissionId: string;
  patientId: string;
  primaryDiagnosis?: string;
  secondaryDiagnoses?: string[];
  proceduresPerformed?: string[];
  hospitalCourse?: string;
  dischargeMedications?: string;
  followUpInstructions?: string;
  warningSigns?: string;
  activityRestrictions?: string;
  followUpAppointmentDate?: string;
  followUpDoctorId?: string;
  dietRecommendations?: string;
  additionalNotes?: string;
  preparedBy?: string;
}

export interface AdmissionFilters {
  wardId?: string;
  patientId?: string;
  status?: string;
  page?: number;
  limit?: number;
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
export class AdmissionsApiService {
  private readonly apiClient = inject(ApiClientService);

  create(data: CreateAdmissionDto): Observable<Admission> {
    return this.apiClient.post<Admission>('/admissions', data);
  }

  list(filters: AdmissionFilters): Observable<PaginatedResponse<Admission>> {
    return this.apiClient.get<PaginatedResponse<Admission>>('/admissions', {
      params: {
        ...(filters.wardId ? { wardId: filters.wardId } : {}),
        ...(filters.patientId ? { patientId: filters.patientId } : {}),
        ...(filters.status ? { status: filters.status } : {}),
        ...(filters.page !== undefined ? { page: filters.page } : {}),
        ...(filters.limit !== undefined ? { limit: filters.limit } : {}),
      },
    });
  }

  listActive(wardId?: string): Observable<Admission[]> {
    return this.apiClient.get<Admission[]>('/admissions/active', {
      params: wardId ? { wardId } : {},
    });
  }

  getById(id: string): Observable<Admission> {
    return this.apiClient.get<Admission>(`/admissions/${id}`);
  }

  transfer(id: string, data: TransferAdmissionDto): Observable<Admission> {
    return this.apiClient.patch<Admission>(`/admissions/${id}/transfer`, data);
  }

  discharge(id: string, data: DischargeAdmissionDto): Observable<Admission> {
    return this.apiClient.patch<Admission>(`/admissions/${id}/discharge`, data);
  }

  createDischargeSummary(data: CreateDischargeSummaryDto): Observable<DischargeSummary> {
    return this.apiClient.post<DischargeSummary>('/admissions/discharge-summaries', data);
  }

  getDischargeSummaryByAdmission(admissionId: string): Observable<DischargeSummary> {
    return this.apiClient.get<DischargeSummary>(`/admissions/discharge-summaries/by-admission/${admissionId}`);
  }

  reviewDischargeSummary(id: string, reviewedBy?: string): Observable<DischargeSummary> {
    return this.apiClient.patch<DischargeSummary>(`/admissions/discharge-summaries/${id}/review`, { reviewedBy });
  }
}
