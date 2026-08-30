import { Injectable, inject } from '@angular/core';
import { ApiClientService } from '@org/api-client';
import { Observable } from 'rxjs';
import {
  PaginatedResult,
  StockMovementDto,
  WardStockBalance,
  WardStockTransaction,
  WardStockTransactionType,
} from './ward-supply.model.js';

export interface ListTransactionsParams {
  departmentId?: string;
  itemId?: string;
  transactionType?: WardStockTransactionType;
  page?: number;
  limit?: number;
}

@Injectable({ providedIn: 'root' })
export class WardSupplyApiService {
  private readonly apiClient = inject(ApiClientService);

  listBalances(departmentId?: string): Observable<PaginatedResult<WardStockBalance>> {
    const query: Record<string, string> = {};
    if (departmentId) query['departmentId'] = departmentId;
    return this.apiClient.get<PaginatedResult<WardStockBalance>>('/ward-supply/stock', { params: query });
  }

  listTransactions(params: ListTransactionsParams = {}): Observable<PaginatedResult<WardStockTransaction>> {
    const query: Record<string, string | number> = {};
    if (params.departmentId) query['departmentId'] = params.departmentId;
    if (params.itemId) query['itemId'] = params.itemId;
    if (params.transactionType) query['transactionType'] = params.transactionType;
    if (params.page !== undefined) query['page'] = params.page;
    if (params.limit !== undefined) query['limit'] = params.limit;
    return this.apiClient.get<PaginatedResult<WardStockTransaction>>('/ward-supply/transactions', { params: query });
  }

  receiveStock(dto: StockMovementDto): Observable<WardStockBalance> {
    return this.apiClient.post<WardStockBalance>('/ward-supply/stock/receive', dto);
  }

  consumeStock(dto: StockMovementDto): Observable<WardStockBalance> {
    return this.apiClient.post<WardStockBalance>('/ward-supply/stock/consume', dto);
  }
}
