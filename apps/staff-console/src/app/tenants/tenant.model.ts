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

export function tenantStatusSeverity(
  status: TenantStatus,
): 'success' | 'warn' | 'danger' | 'secondary' {
  return status === 'active' ? 'success' : 'danger';
}
