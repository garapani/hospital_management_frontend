import { Injectable, inject } from '@angular/core';
import { ApiClientService } from '@org/api-client';
import { Observable } from 'rxjs';
import {
  AuditRecord,
  SearchAuditRecordsQuery,
  PaginatedResponse,
} from './audit.model.js';

@Injectable({ providedIn: 'root' })
export class AuditApiService {
  private readonly api = inject(ApiClientService);

  search(
    query: SearchAuditRecordsQuery,
  ): Observable<PaginatedResponse<AuditRecord>> {
    const params: Record<string, string | number | boolean> = {};
    if (query.startDate) params['startDate'] = query.startDate;
    if (query.endDate) params['endDate'] = query.endDate;
    if (query.tableName) params['tableName'] = query.tableName;
    if (query.action) params['action'] = query.action;
    if (query.changedByAccountId)
      params['changedByAccountId'] = query.changedByAccountId;
    if (query.correlationId) params['correlationId'] = query.correlationId;
    params['page'] = query.page;
    params['limit'] = query.limit;

    return this.api.get<PaginatedResponse<AuditRecord>>('/audit', {
      params,
    });
  }
}
