import { Component, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { ActivatedRoute, RouterModule, Router } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { TagModule } from 'primeng/tag';
import { TableModule } from 'primeng/table';
import { DialogModule } from 'primeng/dialog';
import { FormsModule } from '@angular/forms';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { MessageService } from 'primeng/api';
import { ApiError } from '@org/api-client';
import { UsersApiService } from './users-api.service.js';
import { RoleDto, UserWithRoles, userStatusLabel, userStatusSeverity } from './user.model.js';

@Component({
  imports: [
    DatePipe,
    RouterModule,
    ButtonModule,
    TagModule,
    TableModule,
    DialogModule,
    FormsModule,
    InputTextModule,
    SelectModule,
  ],
  selector: 'hms-user-detail',
  templateUrl: './user-detail.html',
})
export class UserDetail {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly usersApi = inject(UsersApiService);
  private readonly messageService = inject(MessageService);

  readonly accountData = signal<UserWithRoles | null>(null);
  readonly loading = signal(true);
  readonly userStatusLabel = userStatusLabel;
  readonly userStatusSeverity = userStatusSeverity;

  // Assign Role Modal. The picker is tenant-scoped exactly like the create-account modal: the
  // backend returns only roles the current tenant may hold (platform tenant → Super Admin only).
  readonly roles = signal<RoleDto[]>([]);
  readonly showAssignModal = signal(false);
  readonly assignForm = signal({ roleName: '', startDate: '', endDate: '' });
  readonly assignLoading = signal(false);

  // Reset Password Modal. A generated password is shown once; an admin-supplied temporary
  // password is used as-is. Either way the account must change it on next login.
  readonly showResetModal = signal(false);
  readonly resetForm = signal({ password: '' });
  readonly resetLoading = signal(false);
  /** Generated one-time password to display; null once the admin sets their own. */
  readonly resetResult = signal<string | null>(null);

  constructor() {
    this.route.paramMap.subscribe((params) => {
      const id = params.get('id');
      if (id) {
        this.load(id);
      }
    });
    this.usersApi.getRoles().subscribe({
      next: (roles) => this.roles.set(roles),
      error: () => {
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'Could not load the role list.',
        });
      },
    });
  }

  private load(id: string): void {
    this.loading.set(true);
    this.usersApi.getOne(id).subscribe({
      next: (data) => {
        this.accountData.set(data);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        // Relative to this route's own matched path ('admin/users/:id' or 'platform/admins/:id')
        // so the redirect lands back on whichever list screen the user came from — this component
        // is reused verbatim under both the tenant and platform route trees.
        this.router.navigate(['..'], { relativeTo: this.route });
      },
    });
  }

  private afterAction(message: string): void {
    const id = this.accountData()?.account.id;
    if (!id) return;
    this.load(id);
    this.messageService.add({ severity: 'success', summary: message });
  }

  deactivate(): void {
    const id = this.accountData()?.account.id;
    if (!id) return;
    this.usersApi.deactivate(id).subscribe({
      next: () => this.afterAction('Account deactivated'),
      error: () =>
        this.messageService.add({
          severity: 'error',
          summary: 'Deactivate failed',
          detail: 'Could not deactivate the account. Please try again.',
        }),
    });
  }

  reactivate(): void {
    const id = this.accountData()?.account.id;
    if (!id) return;
    this.usersApi.reactivate(id).subscribe({
      next: () => this.afterAction('Account reactivated'),
      error: () =>
        this.messageService.add({
          severity: 'error',
          summary: 'Reactivate failed',
          detail: 'Could not reactivate the account. Please try again.',
        }),
    });
  }

  unlock(): void {
    const id = this.accountData()?.account.id;
    if (!id) return;
    this.usersApi.unlock(id).subscribe({
      next: () => this.afterAction('Account unlocked'),
      error: () =>
        this.messageService.add({
          severity: 'error',
          summary: 'Unlock failed',
          detail: 'Could not unlock the account. Please try again.',
        }),
    });
  }

  openAssignModal(): void {
    this.assignForm.set({ roleName: '', startDate: '', endDate: '' });
    this.showAssignModal.set(true);
  }

  submitAssign(): void {
    const id = this.accountData()?.account.id;
    if (!id) return;

    this.assignLoading.set(true);
    const form = this.assignForm();
    this.usersApi
      .assignRole(id, {
        roleName: form.roleName,
        startDate: form.startDate || undefined,
        endDate: form.endDate || undefined,
      })
      .subscribe({
        next: () => {
          this.assignLoading.set(false);
          this.showAssignModal.set(false);
          this.load(id);
          this.messageService.add({
            severity: 'success',
            summary: 'Role assigned',
            detail: `${form.roleName} added to this account.`,
          });
        },
        error: (error: ApiError) => {
          this.assignLoading.set(false);
          if (error.status === 409) {
            this.messageService.add({
              severity: 'warn',
              summary: 'Role not assigned',
              detail: 'The account already holds an active assignment of this role.',
            });
            return;
          }
          this.messageService.add({
            severity: 'error',
            summary: 'Role assignment failed',
            detail: error.message || 'Could not assign the role. Please try again.',
          });
        },
      });
  }

  removeRole(assignment: { id: string; roleName: string }): void {
    const id = this.accountData()?.account.id;
    if (!id) return;
    this.usersApi.revokeRole(id, assignment.id).subscribe({
      next: () => this.afterAction(`Role ${assignment.roleName} removed`),
      error: (error: ApiError) => {
        this.messageService.add({
          severity: 'error',
          summary: 'Role removal failed',
          detail: error.message || 'Could not remove the role. Please try again.',
        });
      },
    });
  }

  openResetModal(): void {
    this.resetForm.set({ password: '' });
    this.resetResult.set(null);
    this.showResetModal.set(true);
  }

  confirmReset(): void {
    const id = this.accountData()?.account.id;
    if (!id) return;

    this.resetLoading.set(true);
    this.resetResult.set(null);
    const password = this.resetForm().password || undefined;
    this.usersApi.resetPassword(id, { password }).subscribe({
      next: (result) => {
        this.resetLoading.set(false);
        if (result.initialPassword) {
          // Generated once — hold the modal open until it is copied.
          this.resetResult.set(result.initialPassword);
          return;
        }
        this.showResetModal.set(false);
        this.load(id);
        this.messageService.add({
          severity: 'success',
          summary: 'Password reset',
          detail: 'The account must use the temporary password on next login.',
        });
      },
      error: (error: ApiError) => {
        this.resetLoading.set(false);
        this.messageService.add({
          severity: 'error',
          summary: 'Password reset failed',
          detail: error.message || 'Could not reset the password. Please try again.',
        });
      },
    });
  }

  closeReset(): void {
    this.resetResult.set(null);
    this.showResetModal.set(false);
    this.load(this.accountData()?.account.id ?? '');
  }
}
