import { Injectable, inject } from '@angular/core';
import { ApiClientService } from '@org/api-client';

export interface Appointment {
  id: string;
  patientId: string | null;
  firstName: string;
  lastName: string;
  contactNumber: string;
  appointmentDate: string;
  appointmentTime: string;
  doctorId: string | null;
  departmentId: string | null;
  appointmentType: string;
  status: string;
  reason: string | null;
  cancelledRemarks: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateAppointmentDto {
  patientId?: string;
  firstName: string;
  lastName: string;
  contactNumber: string;
  appointmentDate: string;
  appointmentTime: string;
  doctorId?: string;
  departmentId?: string;
  appointmentType: string;
  reason?: string;
}

export interface UpdateAppointmentDto {
  patientId?: string;
  firstName?: string;
  lastName?: string;
  contactNumber?: string;
  appointmentDate?: string;
  appointmentTime?: string;
  doctorId?: string;
  departmentId?: string;
  appointmentType?: string;
  status?: string;
  reason?: string;
}

export interface AppointmentFilters {
  date?: string;
  doctorId?: string;
  departmentId?: string;
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
export class AppointmentsApiService {
  private apiClient = inject(ApiClientService);

  create(data: CreateAppointmentDto) {
    return this.apiClient.post<Appointment>('/appointments', data);
  }

  list(filters: AppointmentFilters) {
    return this.apiClient.get<PaginatedResponse<Appointment>>('/appointments', {
      params: {
        ...(filters.date ? { date: filters.date } : {}),
        ...(filters.doctorId ? { doctorId: filters.doctorId } : {}),
        ...(filters.departmentId ? { departmentId: filters.departmentId } : {}),
        ...(filters.patientId ? { patientId: filters.patientId } : {}),
        ...(filters.status ? { status: filters.status } : {}),
        ...(filters.page !== undefined ? { page: filters.page } : {}),
        ...(filters.limit !== undefined ? { limit: filters.limit } : {}),
      },
    });
  }

  getById(id: string) {
    return this.apiClient.get<Appointment>(`/appointments/${id}`);
  }

  update(id: string, data: UpdateAppointmentDto) {
    return this.apiClient.put<Appointment>(`/appointments/${id}`, data);
  }

  cancel(id: string, cancelledRemarks: string) {
    return this.apiClient.post<Appointment>(`/appointments/${id}/cancel`, { cancelledRemarks });
  }
}
