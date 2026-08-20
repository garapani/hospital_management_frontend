export const ORDER_ITEM_TYPES = ['Lab', 'Radiology', 'Pharmacy', 'Other'];
export const ORDER_PRIORITIES = ['Routine', 'Urgent', 'STAT'];
export const ORDER_ITEM_STATUSES = ['Pending', 'Completed', 'Cancelled'];

type Severity = 'success' | 'warn' | 'danger' | 'info' | 'secondary';

const ITEM_STATUS_SEVERITY: Record<string, Severity> = {
  Pending: 'warn',
  Completed: 'success',
  Cancelled: 'danger',
};

export function orderItemStatusSeverity(status: string): Severity {
  return ITEM_STATUS_SEVERITY[status] ?? 'secondary';
}

const ITEM_TYPE_SEVERITY: Record<string, Severity> = {
  Lab: 'info',
  Radiology: 'info',
  Pharmacy: 'success',
  Other: 'secondary',
};

export function orderItemTypeSeverity(itemType: string): Severity {
  return ITEM_TYPE_SEVERITY[itemType] ?? 'secondary';
}

const PRIORITY_SEVERITY: Record<string, Severity> = {
  Routine: 'secondary',
  Urgent: 'warn',
  STAT: 'danger',
};

export function orderPrioritySeverity(priority: string): Severity {
  return PRIORITY_SEVERITY[priority] ?? 'secondary';
}
