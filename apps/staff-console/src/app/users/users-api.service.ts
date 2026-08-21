import { Injectable, inject } from '@angular/core';
import { ApiClientService } from '@org/api-client';
import { Observable } from 'rxjs';
import {
  User,
  UserWithRoles,
  CreateUserDto,
  CreateUserResult,
  AssignRoleDto,
  UserRole,
  RoleDto,
} from './user.model.js';

@Injectable({ providedIn: 'root' })
export class UsersApiService {
  private readonly api = inject(ApiClientService);

  list(): Observable<User[]> {
    return this.api.get<User[]>('/accounts');
  }

  getOne(id: string): Observable<UserWithRoles> {
    return this.api.get<UserWithRoles>(`/accounts/${id}`);
  }

  create(dto: CreateUserDto): Observable<CreateUserResult> {
    return this.api.post<CreateUserResult>('/accounts', dto);
  }

  deactivate(id: string): Observable<User> {
    return this.api.patch<User>(`/accounts/${id}/deactivate`, {});
  }

  reactivate(id: string): Observable<User> {
    return this.api.patch<User>(`/accounts/${id}/reactivate`, {});
  }

  unlock(id: string): Observable<User> {
    return this.api.patch<User>(`/accounts/${id}/unlock`, {});
  }

  /** Admin-initiated password reset; when no password is supplied the backend generates one
   *  and returns it once (the account must change it on next login). */
  resetPassword(
    id: string,
    dto?: { password?: string },
  ): Observable<{ success: boolean; initialPassword?: string }> {
    return this.api.post<{ success: boolean; initialPassword?: string }>(
      `/accounts/${id}/reset-password`,
      dto ?? {},
    );
  }

  assignRole(id: string, dto: AssignRoleDto): Observable<UserRole> {
    return this.api.post<UserRole>(`/accounts/${id}/roles`, dto);
  }

  revokeRole(id: string, roleId: string): Observable<void> {
    return this.api.delete<void>(`/accounts/${id}/roles/${roleId}`);
  }

  getRoles(): Observable<RoleDto[]> {
    return this.api.get<RoleDto[]>('/accounts/roles');
  }
}
