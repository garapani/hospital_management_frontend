import { Injectable, inject } from '@angular/core';
import { ApiClientService } from '@org/api-client';
import { Observable } from 'rxjs';
import { InvoiceDetail, InvoiceListResult } from './invoice.model.js';

export interface ListInvoicesParams {
  patientId?: string;
  page?: number;
  limit?: number;
}

@Injectable({ providedIn: 'root' })
export class InvoicesApiService {
  private readonly apiClient = inject(ApiClientService);

  list(params: ListInvoicesParams = {}): Observable<InvoiceListResult> {
    const query: Record<string, string | number> = {};
    if (params.patientId) {
      query['patientId'] = params.patientId;
    }
    if (params.page !== undefined) {
      query['page'] = params.page;
    }
    if (params.limit !== undefined) {
      query['limit'] = params.limit;
    }
    return this.apiClient.get<InvoiceListResult>('/billing/invoices', { params: query });
  }

  findOne(id: string): Observable<InvoiceDetail> {
    return this.apiClient.get<InvoiceDetail>(`/billing/invoices/${id}`);
  }
}
