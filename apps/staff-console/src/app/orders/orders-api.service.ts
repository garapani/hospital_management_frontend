import { Injectable, inject } from '@angular/core';
import { ApiClientService } from '@org/api-client';

export interface Order {
  id: string;
  patientId: string;
  sourceAppointmentId: string | null;
  sourceAdmissionId: string | null;
  orderedBy: string;
  orderedAt: string;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface OrderItem {
  id: string;
  orderId: string;
  itemType: string; // 'Lab' | 'Radiology' | 'Pharmacy' | 'Other'
  itemDescription: string;
  priority: string; // 'Routine' | 'Urgent' | 'STAT'
  status: string; // 'Pending' | 'Completed' | 'Cancelled'
  completedBy: string | null;
  completedAt: string | null;
  cancelReason: string | null;
  createdAt: string;
  updatedAt: string;
}

export type OrderWithItems = Order & { items: OrderItem[] };

export interface CreateOrderItemDto {
  itemType: string;
  itemDescription: string;
  priority?: string;
}

export interface CreateOrderDto {
  patientId: string;
  /** Deprecated — ignored when a tenant context with an accountId is active. */
  orderedBy?: string;
  sourceAppointmentId?: string;
  sourceAdmissionId?: string;
  notes?: string;
  items: CreateOrderItemDto[];
}

export interface OrderFilters {
  /** Required by the backend list endpoint — an order is always scoped to one patient. */
  patientId: string;
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
export class OrdersApiService {
  private apiClient = inject(ApiClientService);

  create(data: CreateOrderDto) {
    return this.apiClient.post<OrderWithItems>('/orders', data);
  }

  list(filters: OrderFilters) {
    return this.apiClient.get<PaginatedResponse<Order>>('/orders', {
      params: {
        patientId: filters.patientId,
        ...(filters.page !== undefined ? { page: filters.page } : {}),
        ...(filters.limit !== undefined ? { limit: filters.limit } : {}),
      },
    });
  }

  getById(id: string) {
    return this.apiClient.get<OrderWithItems>(`/orders/${id}`);
  }
}
