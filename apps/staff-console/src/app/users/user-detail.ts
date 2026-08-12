import { Component, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { ActivatedRoute, RouterModule, Router } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { TagModule } from 'primeng/tag';
import { TableModule } from 'primeng/table';
import { DialogModule } from 'primeng/dialog';
import { FormsModule } from '@angular/forms';
import { InputTextModule } from 'primeng/inputtext';
import { UsersApiService } from './users-api.service.js';
import { UserWithRoles } from './user.model.js';

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
  ],
  selector: 'hms-user-detail',
  templateUrl: './user-detail.html',
})
export class UserDetail {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly usersApi = inject(UsersApiService);

  readonly accountData = signal<UserWithRoles | null>(null);
  readonly loading = signal(true);

  // Assign Role Modal
  readonly showAssignModal = signal(false);
  readonly assignForm = signal({ roleName: '', startDate: '', endDate: '' });
  readonly assignLoading = signal(false);

  constructor() {
    this.route.paramMap.subscribe((params) => {
      const id = params.get('id');
      if (id) {
        this.load(id);
      }
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
        this.router.navigate(['/admin/users']);
      },
    });
  }

  deactivate(): void {
    const id = this.accountData()?.account.id;
    if (id && confirm('Are you sure you want to deactivate this account?')) {
      this.usersApi.deactivate(id).subscribe(() => this.load(id));
    }
  }

  reactivate(): void {
    const id = this.accountData()?.account.id;
    if (id) {
      this.usersApi.reactivate(id).subscribe(() => this.load(id));
    }
  }

  unlock(): void {
    const id = this.accountData()?.account.id;
    if (id) {
      this.usersApi.unlock(id).subscribe(() => this.load(id));
    }
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
        },
        error: () => {
          this.assignLoading.set(false);
          alert('Failed to assign role. Maybe it already exists?');
        },
      });
  }
}
