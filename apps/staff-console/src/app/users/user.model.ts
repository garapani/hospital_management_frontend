export interface User {
  id: string;
  accountType: 'staff' | 'patient';
  username: string;
  email: string;
  displayName: string;
  isActive: boolean;
  needsPasswordUpdate: boolean;
  failedLoginAttempts: number;
  lockedUntil: string | null;
  createdAt: string;
}

export interface UserRole {
  id: string;
  roleId: string;
  startDate: string | null;
  endDate: string | null;
  isActive: boolean;
}

export interface UserWithRoles {
  account: User;
  roleIds: string[];
  roleNames: string[];
}

export interface CreateUserDto {
  username: string;
  email: string;
  displayName: string;
  password?: string; // We'll autogenerate one on the frontend if needed, but the spec says Admin sets it.
  roleName: string;
  needsPasswordUpdate?: boolean;
}

export interface AssignRoleDto {
  roleName: string;
  startDate?: string;
  endDate?: string;
}

export interface RoleDto {
  name: string;
  description: string;
}
