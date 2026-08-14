import { Injectable, inject } from '@angular/core';
import { ApiClientService } from '@org/api-client';

export interface PatientAddress {
  addressType?: string;
  streetAddress?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  country?: string;
}

export interface PatientKin {
  kinName: string;
  relationship: string;
  phoneNumber: string;
  email?: string;
  address?: string;
}

export interface Patient {
  id: string;
  patientNo: string;
  firstName: string;
  middleName?: string;
  lastName: string;
  gender: string;
  dateOfBirth?: string;
  age?: string;
  phoneNumber?: string;
  email?: string;
  bloodGroup?: string;
  governmentIdType?: string;
  governmentIdNumber?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  addresses?: PatientAddress[];
  kins?: PatientKin[];
}

export interface CreatePatientDto {
  firstName: string;
  middleName?: string;
  lastName: string;
  gender: string;
  dateOfBirth?: string;
  age?: string;
  phoneNumber?: string;
  email?: string;
  bloodGroup?: string;
  governmentIdType?: string;
  governmentIdNumber?: string;
  addresses?: PatientAddress[];
  kins?: PatientKin[];
  allowDuplicate?: boolean;
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
export class PatientsApiService {
  private apiClient = inject(ApiClientService);

  search(params: { page: number; limit: number; q?: string; phoneNumber?: string; patientNo?: string }) {
    return this.apiClient.get<PaginatedResponse<Patient>>('/patients', {
      params: {
        page: params.page,
        limit: params.limit,
        ...(params.q ? { q: params.q } : {}),
        ...(params.phoneNumber ? { phoneNumber: params.phoneNumber } : {}),
        ...(params.patientNo ? { patientNo: params.patientNo } : {}),
      },
    });
  }

  getById(id: string) {
    return this.apiClient.get<Patient>(`/patients/${id}`);
  }

  create(data: CreatePatientDto) {
    return this.apiClient.post<Patient>('/patients', data);
  }

  update(id: string, data: Partial<CreatePatientDto>) {
    return this.apiClient.patch<Patient>(`/patients/${id}`, data);
  }

  checkDuplicates(data: { phoneNumber?: string; firstName?: string; lastName?: string; dateOfBirth?: string }) {
    return this.apiClient.post<Patient[]>('/patients/check-duplicates', data);
  }
}
