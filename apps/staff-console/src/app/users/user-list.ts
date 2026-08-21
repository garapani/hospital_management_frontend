import { Component, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { RouterModule } from '@angular/router';
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { TagModule } from 'primeng/tag';
import { DialogModule } from 'primeng/dialog';
import { FormsModule } from '@angular/forms';
import { SelectModule } from 'primeng/select';
import { InputTextModule } from 'primeng/inputtext';
import { MessageService } from 'primeng/api';
import { ApiError } from '@org/api-client';
import { UsersApiService } from './users-api.service.js';
import { User, RoleDto, userStatusLabel, userStatusSeverity } from './user.model.js';

@Component({
  imports: [
    DatePipe,
    RouterModule,
    TableModule,
    ButtonModule,
    TagModule,
    DialogModule,
    FormsModule,
    InputTextModule,
    SelectModule,
  ],
  selector: 'hms-user-list',
  templateUrl: './user-list.html',
})
export class UserList {
  private readonly usersApi = inject(UsersApiService);
  private readonly messageService = inject(MessageService);

  readonly users = signal<User[]>([]);
  readonly loading = signal(false);
  readonly roles = signal<RoleDto[]>([]);
  readonly userStatusLabel = userStatusLabel;
  readonly userStatusSeverity = userStatusSeverity;

  // Create User Modal
  readonly showCreateModal = signal(false);
  readonly createForm = signal({
    username: '',
    email: '',
    displayName: '',
    roleName: '',
  });
  readonly createLoading = signal(false);
  readonly conflictError = signal<string | null>(null);
  /**
   * Set when creation succeeded with a backend-generated initial password: the password is shown
   * exactly once here, so the modal stays open until the admin copies it (same pattern as tenant
   * provisioning's bootstrap credentials).
   */
  readonly createdAccount = signal<{ username: string; initialPassword: string } | null>(null);

  constructor() {
    this.load();
    this.loadRoles();
  }

  private loadRoles(): void {
    this.usersApi.getRoles().subscribe({
      next: (roles) => this.roles.set(roles),
      error: () => {
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'Could not load roles. Please try again.',
        });
      },
    });
  }

  private load(): void {
    this.loading.set(true);
    this.usersApi.list().subscribe({
      next: (users) => {
        this.users.set(users);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'Failed to load staff accounts',
        });
      },
    });
  }

  openCreateModal(): void {
    this.createForm.set({
      username: '',
      email: '',
      displayName: '',
      roleName: '',
    });
    this.conflictError.set(null);
    this.createdAccount.set(null);
    this.showCreateModal.set(true);
  }

  submitCreate(): void {
    this.createLoading.set(true);
    this.conflictError.set(null);
    this.usersApi
      .create({ ...this.createForm() })
      .subscribe({
        next: (result) => {
          this.createLoading.set(false);
          if (result.initialPassword) {
            // Generated once by the backend — hold the modal open so it can be copied.
            this.createdAccount.set({
              username: result.username,
              initialPassword: result.initialPassword,
            });
            return;
          }
          this.showCreateModal.set(false);
          this.load();
          this.messageService.add({
            severity: 'success',
            summary: 'Account created',
            detail: `${result.username} can now sign in with the password you set.`,
          });
        },
        error: (error: ApiError) => {
          this.createLoading.set(false);
          if (error.status === 409) {
            this.conflictError.set('Username or Email already exists.');
            return;
          }
          this.messageService.add({
            severity: 'error',
            summary: 'Account creation failed',
            detail: error.message || 'Could not create the account. Please try again.',
          });
        },
      });
  }

  closeCreated(): void {
    this.createdAccount.set(null);
    this.showCreateModal.set(false);
    this.load();
  }
}
