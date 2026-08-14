export type TenantStatus = 'active' | 'suspended';

export interface Tenant {
  hospitalId: string;
  hospitalName: string;
  status: TenantStatus;
  createdAt: string;
  updatedAt: string;
}

export interface ProvisionTenantDto {
  hospitalId: string;
  hospitalName: string;
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
