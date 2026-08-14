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
  APPOINTMENTS_READ: 'appointments.read' as const,
} as const;

export type Permission = (typeof Permissions)[keyof typeof Permissions];

/**
 * Helper to check if a value is a valid permission string.
 */
export function isValidPermission(value: string): value is Permission {
  return Object.values(Permissions).includes(value as Permission);
}
