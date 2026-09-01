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
import { MessageService, ConfirmationService } from 'primeng/api';
import { ApiError } from '@org/api-client';
import { UsersApiService } from './users-api.service.js';
import { RoleDto, UserWithRoles, userStatusLabel, userStatusSeverity } from './user.model.js';
import { MasterDataApiService } from '../master-data/master-data-api.service.js';
import { Ward } from '../master-data/master-data.model.js';

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
  private readonly masterDataApi = inject(MasterDataApiService);
  private readonly messageService = inject(MessageService);
  private readonly confirmationService = inject(ConfirmationService);

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

  // Ward Assignment. wardId scopes Nursing/Vitals access (PRD §6.2); unassigned (null) keeps
  // today's tenant-wide access. Editable inline rather than via a modal — a single field.
  readonly wards = signal<Ward[]>([]);
  readonly editingWard = signal(false);
  readonly selectedWardId = signal<string | null>(null);
  readonly wardSaving = signal(false);

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
    this.masterDataApi.listWards().subscribe({
      next: (wards) => this.wards.set(wards.filter((w) => w.isActive)),
      error: () => {
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'Could not load the ward list.',
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
    this.confirmationService.confirm({
      header: 'Deactivate Account',
      message: 'Deactivate this account? It will no longer be able to log in.',
      icon: 'pi pi-exclamation-triangle',
      acceptButtonProps: { label: 'Deactivate', severity: 'danger' },
      rejectButtonProps: { label: 'Cancel', severity: 'secondary', outlined: true },
      accept: () => {
        this.usersApi.deactivate(id).subscribe({
          next: () => this.afterAction('Account deactivated'),
          error: () =>
            this.messageService.add({
              severity: 'error',
              summary: 'Deactivate failed',
              detail: 'Could not deactivate the account. Please try again.',
            }),
        });
      },
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

  wardName(wardId: string | null): string {
    if (!wardId) return 'Unassigned (tenant-wide access)';
    return this.wards().find((w) => w.id === wardId)?.wardName ?? 'Unknown ward';
  }

  openWardEdit(): void {
    this.selectedWardId.set(this.accountData()?.account.wardId ?? null);
    this.editingWard.set(true);
  }

  cancelWardEdit(): void {
    this.editingWard.set(false);
  }

  saveWard(): void {
    const id = this.accountData()?.account.id;
    if (!id) return;

    this.wardSaving.set(true);
    this.usersApi.setWard(id, this.selectedWardId()).subscribe({
      next: () => {
        this.wardSaving.set(false);
        this.editingWard.set(false);
        this.afterAction('Ward assignment updated');
      },
      error: (error: ApiError) => {
        this.wardSaving.set(false);
        this.messageService.add({
          severity: 'error',
          summary: 'Ward assignment failed',
          detail: error.message || 'Could not update the ward assignment. Please try again.',
        });
      },
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
    this.confirmationService.confirm({
      header: 'Remove Role',
      message: `Remove the "${assignment.roleName}" role from this account?`,
      icon: 'pi pi-exclamation-triangle',
      acceptButtonProps: { label: 'Remove', severity: 'danger' },
      rejectButtonProps: { label: 'Cancel', severity: 'secondary', outlined: true },
      accept: () => {
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
