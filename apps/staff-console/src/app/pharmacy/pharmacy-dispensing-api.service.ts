import { Injectable, inject } from '@angular/core';
import { ApiClientService } from '@org/api-client';

import { PharmacyDispensing } from './pharmacy-dispensing.model.js';

export interface CreatePharmacyDispensingDto {
  orderItemId: string;
  inventoryItemId: string;
  quantity: number;
}

export interface PharmacyDispensingFilters {
  orderItemId?: string;
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
export class PharmacyDispensingApiService {
  private apiClient = inject(ApiClientService);

  list(filters: PharmacyDispensingFilters) {
    return this.apiClient.get<PaginatedResponse<PharmacyDispensing>>('/pharmacy/dispensings', {
      params: {
        ...(filters.orderItemId ? { orderItemId: filters.orderItemId } : {}),
        ...(filters.status ? { status: filters.status } : {}),
        ...(filters.page !== undefined ? { page: filters.page } : {}),
        ...(filters.limit !== undefined ? { limit: filters.limit } : {}),
      },
    });
  }

  getById(id: string) {
    return this.apiClient.get<PharmacyDispensing>(`/pharmacy/dispensings/${id}`);
  }

  create(data: CreatePharmacyDispensingDto) {
    return this.apiClient.post<PharmacyDispensing>('/pharmacy/dispensings', data);
  }

  dispense(id: string) {
    // dispensedBy is deprecated on the backend — the authenticated principal wins.
    return this.apiClient.patch<PharmacyDispensing>(`/pharmacy/dispensings/${id}/dispense`, {});
  }
}
