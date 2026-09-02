export type PharmacyDispensingStatus = 'Pending' | 'Dispensed' | 'Cancelled' | 'Reversed';

/**
 * Shape of the joined `orderItem` relation the backend list query declares
 * (`leftJoinAndSelect('dispensing.orderItem', 'orderItem')` in PharmacyDispensingService.findAll).
 * Field names mirror the backend OrderItem entity exactly.
 */
export interface PharmacyDispensingOrderItem {
  id: string;
  orderId: string;
  itemType: string;
  itemDescription: string;
  priority: string;
  status: string;
  completedBy: string | null;
  completedAt: string | null;
  cancelReason: string | null;
  createdAt: string;
  updatedAt: string;
}

/**
 * Mirrors the backend PharmacyDispensing entity. `quantity` is a numeric column, so it is
 * serialized as a string by TypeORM.
 */
export interface PharmacyDispensing {
  id: string;
  orderItemId: string;
  inventoryItemId: string;
  dispensingNumber: string;
  quantity: string;
  status: PharmacyDispensingStatus;
  dispensedBy: string | null;
  dispensedAt: string | null;
  cancelReason: string | null;
  reversedBy: string | null;
  reversedAt: string | null;
  reversalReason: string | null;
  createdAt: string;
  updatedAt: string;
  orderItem?: PharmacyDispensingOrderItem;
}

/**
 * A Pharmacy order item awaiting action — the Add Dispensing picker's source
 * (`GET /pharmacy/dispensings/pending-items`), since a Pharmacist has no patient search access
 * and would otherwise have no way to find an orderItemId to dispense against.
 */
export interface PendingPharmacyItem extends PharmacyDispensingOrderItem {
  patientId: string | null;
}

export const DISPENSING_STATUSES: PharmacyDispensingStatus[] = ['Pending', 'Dispensed', 'Cancelled', 'Reversed'];

const STATUS_SEVERITY: Record<string, 'success' | 'warn' | 'danger' | 'info' | 'secondary'> = {
  Pending: 'warn',
  Dispensed: 'success',
  Cancelled: 'danger',
  Reversed: 'danger',
};

export function dispensingStatusSeverity(status: string): 'success' | 'warn' | 'danger' | 'info' | 'secondary' {
  return STATUS_SEVERITY[status] ?? 'secondary';
}
