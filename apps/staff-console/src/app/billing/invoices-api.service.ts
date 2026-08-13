import { Injectable, inject } from '@angular/core';
import { ApiClientService } from '@org/api-client';
import { Observable } from 'rxjs';
import { InvoiceListResult, InvoiceWithReturns } from './invoice.model.js';

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

  findOne(id: string): Observable<InvoiceWithReturns> {
    return this.apiClient.get<InvoiceWithReturns>(`/billing/invoices/${id}`);
  }

  /**
   * Convenience method for dashboard to get invoices with pagination.
   * Overloaded signature to support list(page, limit) syntax.
   */
  listByPage(page: number = 1, limit: number = 10): Observable<InvoiceListResult> {
    return this.list({ page, limit });
  }
}
