import { DirectoryEntityType } from '../directory/directory-api.service.js';

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

// Audit records cover every AuditableEntity in the system (dozens of tables — journal entries,
// helpdesk tickets, tenants, etc.), far more than the directory resolver's own type set. Only
// map the tables that ARE covered; recordId is already the record's own PK in that table (unlike
// a reporting event's entityId, no drilling into a payload needed), so this is a direct lookup.
// An unmapped table falls back to the raw recordId — a smaller, deliberately bounded win, not
// full audit-log entity resolution.
const TABLE_TO_DIRECTORY_TYPE: Record<string, DirectoryEntityType> = {
  patients: 'patient',
  accounts: 'doctor',
  wards: 'ward',
  beds: 'bed',
  inventory_items: 'item',
  order_items: 'orderItem',
  lab_tests: 'test',
  radiology_imaging_items: 'imagingItem',
  invoices: 'invoice',
  employees: 'employee',
  departments: 'department',
};

export function auditRecordDirectoryType(tableName: string): DirectoryEntityType | null {
  return TABLE_TO_DIRECTORY_TYPE[tableName] ?? null;
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
