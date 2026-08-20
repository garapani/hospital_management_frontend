/**
 * Centralized permission constants to avoid typos and ensure consistency.
 * These match the permission strings enforced by the backend RBAC system.
 */

export const Permissions = {
  // System Administration
  TENANTS_MANAGE: 'system-admin.tenants.manage' as const,

  // Billing
  BILLING_MANAGE: 'billing.manage' as const,

  // Master Data
  MASTER_DATA_MANAGE: 'master-data.manage' as const,

  // Identity & Access Management
  IDENTITY_ACCOUNTS_MANAGE: 'identity.accounts.manage' as const,

  // Reporting
  REPORTING_READ: 'reporting.read' as const,

  // Patients
  PATIENTS_READ: 'patients.read' as const,

  // Triage
  TRIAGE_READ: 'triage.read' as const,

  // Appointments
  APPOINTMENTS_READ: 'appointment.read' as const,

  // Lab / LIS
  LAB_READ: 'lab.read' as const,
  LAB_CATALOG_MANAGE: 'lab.catalog.manage' as const,

  // Radiology
  RADIOLOGY_READ: 'radiology.read' as const,
  RADIOLOGY_CATALOG_MANAGE: 'radiology.catalog.manage' as const,

  // Pharmacy
  PHARMACY_READ: 'pharmacy.read' as const,
  PHARMACY_DISPENSING_CREATE: 'pharmacy.dispensing.create' as const,
  PHARMACY_DISPENSING_DISPENSE: 'pharmacy.dispensing.dispense' as const,

  // Inventory
  INVENTORY_READ: 'inventory.read' as const,
  INVENTORY_CATALOG_MANAGE: 'inventory.catalog.manage' as const,
  INVENTORY_PURCHASE_ORDER_CREATE: 'inventory.purchase-order.create' as const,
  INVENTORY_REQUISITION_CREATE: 'inventory.requisition.create' as const,
  INVENTORY_DISPATCH_FULFILL: 'inventory.dispatch.fulfill' as const,

  // Admissions / ADT
  ADMISSION_READ: 'admission.read' as const,
  ADMISSION_MANAGE: 'admission.manage' as const,

  // Orders
  ORDER_READ: 'order.read' as const,
  ORDER_MANAGE: 'order.manage' as const,
} as const;

export type Permission = (typeof Permissions)[keyof typeof Permissions];

/**
 * Helper to check if a value is a valid permission string.
 */
export function isValidPermission(value: string): value is Permission {
  return Object.values(Permissions).includes(value as Permission);
}
