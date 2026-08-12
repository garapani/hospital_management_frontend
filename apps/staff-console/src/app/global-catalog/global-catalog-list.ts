import { Component, inject, signal } from '@angular/core';
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { TagModule } from 'primeng/tag';
import { DialogModule } from 'primeng/dialog';
import { FormsModule } from '@angular/forms';
import { InputTextModule } from 'primeng/inputtext';
import { TabsModule } from 'primeng/tabs';
import { CheckboxModule } from 'primeng/checkbox';
import { ApiError } from '@org/api-client';
import { MasterDataApiService } from '../master-data/master-data-api.service.js';
import {
  CreateRoleDto,
  DepartmentCatalog,
  Role,
} from '../master-data/master-data.model.js';

interface DepartmentCatalogFormState {
  departmentCode: string;
  departmentName: string;
  description: string | null;
  isAppointmentApplicable: boolean;
}

interface RoleFormState {
  name: string;
  description: string;
  priority: number;
  isCrossTenant: boolean;
  bypassesPermissionChecks: boolean;
}

@Component({
  imports: [
    TableModule,
    ButtonModule,
    TagModule,
    DialogModule,
    FormsModule,
    InputTextModule,
    TabsModule,
    CheckboxModule,
  ],
  selector: 'hms-global-catalog-list',
  templateUrl: './global-catalog-list.html',
})
export class GlobalCatalogList {
  private readonly mdApi = inject(MasterDataApiService);

  readonly departments = signal<DepartmentCatalog[]>([]);
  readonly deptLoading = signal(false);

  readonly roles = signal<Role[]>([]);
  readonly roleLoading = signal(false);

  // Department Modal
  readonly showDeptModal = signal(false);
  readonly deptForm = signal<DepartmentCatalogFormState>({
    departmentCode: '',
    departmentName: '',
    description: null,
    isAppointmentApplicable: true,
  });
  readonly deptSaving = signal(false);
  readonly deptError = signal<string | null>(null);

  // Role Modal
  readonly showRoleModal = signal(false);
  readonly roleForm = signal<RoleFormState>({
    name: '',
    description: '',
    priority: 0,
    isCrossTenant: false,
    bypassesPermissionChecks: false,
  });
  readonly roleSaving = signal(false);
  readonly roleError = signal<string | null>(null);

  constructor() {
    this.loadDepartments();
    this.loadRoles();
  }

  loadDepartments(): void {
    this.deptLoading.set(true);
    this.mdApi.listDepartmentCatalogs().subscribe({
      next: (data) => {
        this.departments.set(data);
        this.deptLoading.set(false);
      },
      error: () => this.deptLoading.set(false),
    });
  }

  loadRoles(): void {
    this.roleLoading.set(true);
    this.mdApi.getRoles().subscribe({
      next: (data) => {
        this.roles.set(data);
        this.roleLoading.set(false);
      },
      error: () => this.roleLoading.set(false),
    });
  }

  openDeptModal(): void {
    this.deptForm.set({
      departmentCode: '',
      departmentName: '',
      description: null,
      isAppointmentApplicable: true,
    });
    this.deptError.set(null);
    this.showDeptModal.set(true);
  }

  submitDept(): void {
    this.deptSaving.set(true);
    this.deptError.set(null);
    this.mdApi.createDepartmentCatalog(this.deptForm()).subscribe({
      next: () => {
        this.deptSaving.set(false);
        this.showDeptModal.set(false);
        this.loadDepartments();
      },
      error: (err: ApiError) => {
        this.deptSaving.set(false);
        if (err.status === 409) {
          this.deptError.set('Department Code already exists.');
        } else {
          this.deptError.set('Failed to save department catalog.');
        }
      },
    });
  }

  openRoleModal(): void {
    this.roleForm.set({
      name: '',
      description: '',
      priority: 0,
      isCrossTenant: false,
      bypassesPermissionChecks: false,
    });
    this.roleError.set(null);
    this.showRoleModal.set(true);
  }

  submitRole(): void {
    this.roleSaving.set(true);
    this.roleError.set(null);
    const form = this.roleForm();
    const dto: CreateRoleDto = {
      name: form.name,
      description: form.description,
      priority: form.priority,
      isCrossTenant: form.isCrossTenant,
    };
    this.mdApi.createRole(dto).subscribe({
      next: () => {
        this.roleSaving.set(false);
        this.showRoleModal.set(false);
        this.loadRoles();
      },
      error: (err: ApiError) => {
        this.roleSaving.set(false);
        if (err.status === 409) {
          this.roleError.set('Role name already exists.');
        } else {
          this.roleError.set('Failed to save role.');
        }
      },
    });
  }
}
