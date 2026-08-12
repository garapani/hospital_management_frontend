import { isValidPermission, Permissions } from './permissions.js';

describe('Permissions', () => {
  it('defines all expected permission constants', () => {
    expect(Permissions.TENANTS_MANAGE).toBe('system-admin.tenants.manage');
    expect(Permissions.BILLING_MANAGE).toBe('billing.manage');
    expect(Permissions.MASTER_DATA_MANAGE).toBe('master-data.manage');
    expect(Permissions.IDENTITY_ACCOUNTS_MANAGE).toBe('identity.accounts.manage');
    expect(Permissions.REPORTING_READ).toBe('reporting.read');
    expect(Permissions.PATIENTS_READ).toBe('patients.read');
    expect(Permissions.TRIAGE_READ).toBe('triage.read');
  });

  it('exports a type-safe Permission type', () => {
    // This test verifies the type is exported correctly
    const validPermission: typeof Permissions.TENANTS_MANAGE = Permissions.TENANTS_MANAGE;
    expect(validPermission).toBe('system-admin.tenants.manage');
  });
});

describe('isValidPermission', () => {
  it('returns true for valid permission strings', () => {
    expect(isValidPermission(Permissions.TENANTS_MANAGE)).toBe(true);
    expect(isValidPermission(Permissions.BILLING_MANAGE)).toBe(true);
    expect(isValidPermission(Permissions.MASTER_DATA_MANAGE)).toBe(true);
    expect(isValidPermission(Permissions.IDENTITY_ACCOUNTS_MANAGE)).toBe(true);
    expect(isValidPermission(Permissions.REPORTING_READ)).toBe(true);
    expect(isValidPermission(Permissions.PATIENTS_READ)).toBe(true);
    expect(isValidPermission(Permissions.TRIAGE_READ)).toBe(true);
  });

  it('returns false for invalid permission strings', () => {
    expect(isValidPermission('invalid.permission')).toBe(false);
    expect(isValidPermission('')).toBe(false);
    expect(isValidPermission('nonexistent')).toBe(false);
  });

  it('returns false for partial matches', () => {
    expect(isValidPermission('system-admin')).toBe(false);
    expect(isValidPermission('billing')).toBe(false);
  });
});
