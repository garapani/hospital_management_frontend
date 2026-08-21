export interface PaginatedResponse<T> {
  data: T[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export interface AuditRecord {
  id: string;
  tableName: string;
  recordId: string;
  action: 'create' | 'update' | 'delete';
  changedByAccountId: string | null;
  correlationId: string | null;
  diff: unknown;
  occurredAt: string;
}

export interface SearchAuditRecordsQuery {
  startDate?: string;
  endDate?: string;
  tableName?: string;
  action?: 'create' | 'update' | 'delete';
  changedByAccountId?: string;
  recordId?: string;
  correlationId?: string;
  page: number;
  limit: number;
}
