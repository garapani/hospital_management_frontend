export interface Department {
  id: string;
  departmentCode: string;
  departmentName: string;
  description: string | null;
  isAppointmentApplicable: boolean;
  parentDepartmentId: string | null;
  roomNumber: string | null;
  noticeText: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Ward {
  id: string;
  wardCode: string;
  wardName: string;
  wardType: string;
  bedCapacity: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface DepartmentCatalog {
  id: string;
  departmentCode: string;
  departmentName: string;
  description: string | null;
  isAppointmentApplicable: boolean;
  isActive: boolean;
  createdAt: string;
}

export interface CreateDepartmentCatalogDto {
  departmentCode: string;
  departmentName: string;
  description: string | null;
  isAppointmentApplicable: boolean;
}

export interface LookupData {
  code: string;
  label: string;
}

export interface Bed {
  id: string;
  wardId: string;
  bedNumber: string;
  bedType: string | null;
  status: string;
  isActive: boolean;
  createdAt: string;
}

export interface Role {
  id: string;
  name: string;
  description: string;
  priority: number;
  isCrossTenant: boolean;
  bypassesPermissionChecks: boolean;
  isActive: boolean;
}

export interface CreateRoleDto {
  name: string;
  description: string;
  priority: number;
  isCrossTenant?: boolean;
}
