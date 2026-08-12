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
import { UsersApiService } from './users-api.service.js';
import { User, RoleDto } from './user.model.js';

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

  readonly users = signal<User[]>([]);
  readonly loading = signal(false);
  readonly roles = signal<RoleDto[]>([]);

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

  constructor() {
    this.load();
    this.loadRoles();
  }

  private loadRoles(): void {
    this.usersApi.getRoles().subscribe({
      next: (roles) => this.roles.set(roles),
    });
  }

  private load(): void {
    this.loading.set(true);
    this.usersApi.list().subscribe({
      next: (users) => {
        this.users.set(users);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
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
    this.showCreateModal.set(true);
  }

  submitCreate(): void {
    this.createLoading.set(true);
    this.conflictError.set(null);
    this.usersApi
      .create({
        ...this.createForm(),
        password: 'ChangeMe123!', // Admin assigned temporary password
        needsPasswordUpdate: true,
      })
      .subscribe({
        next: () => {
          this.createLoading.set(false);
          this.showCreateModal.set(false);
          this.load();
        },
        error: (err) => {
          this.createLoading.set(false);
          if (err.status === 409) {
            this.conflictError.set('Username or Email already exists.');
          }
        },
      });
  }
}
