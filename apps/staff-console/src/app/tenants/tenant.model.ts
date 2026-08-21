export type TenantStatus = 'active' | 'suspended';

/** A sellable edition — which module permission groups a tenant's JWTs carry. */
export interface Package {
  code: string;
  name: string;
  description: string | null;
  modules: string[];
  createdAt: string;
}

export function packageSeverity(code: string): 'success' | 'info' | 'warn' | 'secondary' {
  switch (code) {
    case 'enterprise':
      return 'success';
    case 'standard':
      return 'info';
    case 'basic':
      return 'warn';
    default:
      return 'secondary';
  }
}

export function packageDisplayName(code: string): string {
  switch (code) {
    case 'enterprise':
      return 'Enterprise';
    case 'standard':
      return 'Standard';
    case 'basic':
      return 'Basic';
    default:
      return code;
  }
}

export interface Tenant {
  hospitalId: string;
  hospitalName: string;
  status: TenantStatus;
  packageCode: string;
  createdAt: string;
  updatedAt: string;
}

export interface ProvisionTenantDto {
  hospitalId: string;
  hospitalName: string;
  packageCode?: string;
  createdBy?: string;
  roleIds?: string[];
  departmentCatalogIds?: string[];
}

/** A catalog role plus whether this tenant currently has it enabled. */
export interface TenantRoleOption {
  id: string;
  name: string;
  description: string;
  priority: number;
  isCrossTenant: boolean;
  enabled: boolean;
}

/** A role the backend refused to disable, and the accounts still holding it. */
export interface BlockedRole {
  roleId: string;
  roleName: string;
  accounts: string[];
}

export function tenantStatusSeverity(
  status: TenantStatus,
): 'success' | 'warn' | 'danger' | 'secondary' {
  return status === 'active' ? 'success' : 'danger';
}
