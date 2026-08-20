import { PurchaseOrderStatus, StockRequisitionItem, StockRequisitionStatus } from './inventory-api.service.js';

const PURCHASE_ORDER_STATUS_SEVERITY: Record<
  PurchaseOrderStatus,
  'success' | 'warn' | 'danger' | 'info' | 'secondary'
> = {
  Ordered: 'info',
  PartiallyReceived: 'warn',
  Received: 'success',
  Cancelled: 'danger',
};

export const PURCHASE_ORDER_STATUSES: PurchaseOrderStatus[] = [
  'Ordered',
  'PartiallyReceived',
  'Received',
  'Cancelled',
];

export function purchaseOrderStatusSeverity(
  status: string,
): 'success' | 'warn' | 'danger' | 'info' | 'secondary' {
  return PURCHASE_ORDER_STATUS_SEVERITY[status as PurchaseOrderStatus] ?? 'secondary';
}

const REQUISITION_STATUS_SEVERITY: Record<
  StockRequisitionStatus,
  'success' | 'warn' | 'danger' | 'info' | 'secondary'
> = {
  Pending: 'warn',
  PartiallyFulfilled: 'info',
  Fulfilled: 'success',
  Cancelled: 'danger',
};

export const REQUISITION_STATUSES: StockRequisitionStatus[] = [
  'Pending',
  'PartiallyFulfilled',
  'Fulfilled',
  'Cancelled',
];

export function requisitionStatusSeverity(
  status: string,
): 'success' | 'warn' | 'danger' | 'info' | 'secondary' {
  return REQUISITION_STATUS_SEVERITY[status as StockRequisitionStatus] ?? 'secondary';
}

/**
 * Quantity still owed on a requisition line. requested/fulfilled quantities are numeric columns,
 * so the backend serializes them as strings — coerce both before subtracting.
 */
export function requisitionLineRemaining(line: Pick<StockRequisitionItem, 'requestedQuantity' | 'fulfilledQuantity'>): number {
  return Number(line.requestedQuantity) - Number(line.fulfilledQuantity);
}
