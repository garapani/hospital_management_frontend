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
  /** Ward-scoped access for Nursing/Vitals (PRD §6.2). Null means unrestricted, tenant-wide
   *  access — the default until an admin assigns a ward. */
  wardId: string | null;
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
  /** Active role assignments with their ids, so a specific assignment can be revoked. */
  assignments: { id: string; roleId: string; roleName: string }[];
}

export interface CreateUserDto {
  username: string;
  email: string;
  displayName: string;
  /** Optional initial password — when omitted the backend generates one and returns it once. */
  password?: string;
  roleName: string;
}

/** POST /accounts response: the created account plus the one-time generated initial password
 *  (present only when the backend generated it because the admin supplied none). */
export type CreateUserResult = User & { initialPassword?: string };

export interface AssignRoleDto {
  roleName: string;
  startDate?: string;
  endDate?: string;
}

export interface RoleDto {
  name: string;
  description: string;
}

export function userStatusLabel(user: Pick<User, 'isActive' | 'lockedUntil'>): string {
  if (user.lockedUntil) return 'Locked';
  if (!user.isActive) return 'Inactive';
  return 'Active';
}

export function userStatusSeverity(
  user: Pick<User, 'isActive' | 'lockedUntil'>,
): 'success' | 'warn' | 'danger' {
  if (user.lockedUntil) return 'danger';
  if (!user.isActive) return 'warn';
  return 'success';
}
