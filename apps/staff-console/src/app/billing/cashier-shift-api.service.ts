import { Injectable, inject } from '@angular/core';
import { ApiClientService } from '@org/api-client';
import { Observable } from 'rxjs';
import { PaginatedResponse } from '../audit/audit.model.js';

export type CashierShiftStatus = 'Open' | 'Closed';
export type DenominationCounts = Record<string, number>;
export type ModeDeclaredTotals = Record<string, number>;

export interface CashierShift {
  id: string;
  openedBy: string;
  openedAt: string;
  floatAmount: number;
  status: CashierShiftStatus;
  closedBy: string | null;
  closedAt: string | null;
  cashDenominationCounts: DenominationCounts | null;
  cashDeclaredTotal: number | null;
  modeDeclaredTotals: ModeDeclaredTotals | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ShiftModeReconciliation {
  paymentMode: string;
  expectedAmount: number;
  declaredAmount: number;
  variance: number;
}

export interface ShiftReconciliation {
  shift: CashierShift;
  modes: ShiftModeReconciliation[];
}

export interface OpenShiftDto {
  floatAmount: number;
  notes?: string;
}

export interface CloseShiftDto {
  cashDenominationCounts: DenominationCounts;
  modeDeclaredTotals?: ModeDeclaredTotals;
  notes?: string;
}

@Injectable({ providedIn: 'root' })
export class CashierShiftApiService {
  private readonly api = inject(ApiClientService);

  open(dto: OpenShiftDto): Observable<CashierShift> {
    return this.api.post<CashierShift>('/billing/cashier-shifts', dto);
  }

  current(): Observable<CashierShift | null> {
    return this.api.get<CashierShift | null>('/billing/cashier-shifts/current');
  }

  list(params: { page?: number; limit?: number } = {}): Observable<PaginatedResponse<CashierShift>> {
    const query: Record<string, number> = {};
    if (params.page !== undefined) query['page'] = params.page;
    if (params.limit !== undefined) query['limit'] = params.limit;
    return this.api.get<PaginatedResponse<CashierShift>>('/billing/cashier-shifts', { params: query });
  }

  findOne(id: string): Observable<CashierShift> {
    return this.api.get<CashierShift>(`/billing/cashier-shifts/${id}`);
  }

  reconciliation(id: string): Observable<ShiftReconciliation> {
    return this.api.get<ShiftReconciliation>(`/billing/cashier-shifts/${id}/reconciliation`);
  }

  close(id: string, dto: CloseShiftDto): Observable<ShiftReconciliation> {
    return this.api.post<ShiftReconciliation>(`/billing/cashier-shifts/${id}/close`, dto);
  }
}
