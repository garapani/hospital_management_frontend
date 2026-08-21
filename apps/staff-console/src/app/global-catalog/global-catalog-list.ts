import { Component, inject, signal } from '@angular/core';
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { TagModule } from 'primeng/tag';
import { DialogModule } from 'primeng/dialog';
import { FormsModule } from '@angular/forms';
import { InputTextModule } from 'primeng/inputtext';
import { TabsModule } from 'primeng/tabs';
import { CheckboxModule } from 'primeng/checkbox';
import { MessageService } from 'primeng/api';
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
  private readonly messageService = inject(MessageService);

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
  });
  readonly roleSaving = signal(false);
  readonly roleError = signal<string | null>(null);

  // Edit Role Modal (description/priority — the name is immutable).
  readonly showEditRoleModal = signal(false);
  readonly editRoleForm = signal({ name: '', description: '', priority: 0 });
  readonly editRoleId = signal<string | null>(null);
  readonly editRoleSaving = signal(false);
  readonly editRoleError = signal<string | null>(null);

  // Edit Department Modal (name/description/appt — the code is immutable).
  readonly showEditDeptModal = signal(false);
  readonly editDeptForm = signal({
    departmentCode: '',
    departmentName: '',
    description: '',
    isAppointmentApplicable: true,
  });
  readonly editDeptId = signal<string | null>(null);
  readonly editDeptSaving = signal(false);
  readonly editDeptError = signal<string | null>(null);

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
      error: () => {
        this.deptLoading.set(false);
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'Could not load the department catalog.',
        });
      },
    });
  }

  loadRoles(): void {
    this.roleLoading.set(true);
    this.mdApi.getRoles().subscribe({
      next: (data) => {
        this.roles.set(data);
        this.roleLoading.set(false);
      },
      error: () => {
        this.roleLoading.set(false);
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'Could not load the role catalog.',
        });
      },
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
        this.messageService.add({
          severity: 'success',
          summary: 'Department added',
          detail: `${this.deptForm().departmentName} is now available for tenants.`,
        });
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
        this.messageService.add({
          severity: 'success',
          summary: 'Role created',
          detail: `${dto.name} is now part of the global catalog.`,
        });
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

  openEditRoleModal(role: Role): void {
    this.editRoleForm.set({
      name: role.name,
      description: role.description,
      priority: role.priority,
    });
    this.editRoleId.set(role.id);
    this.editRoleError.set(null);
    this.showEditRoleModal.set(true);
  }

  submitEditRole(): void {
    const id = this.editRoleId();
    if (!id) return;
    this.editRoleSaving.set(true);
    this.editRoleError.set(null);
    const form = this.editRoleForm();
    this.mdApi
      .updateRole(id, { description: form.description, priority: form.priority })
      .subscribe({
        next: () => {
          this.editRoleSaving.set(false);
          this.showEditRoleModal.set(false);
          this.loadRoles();
          this.messageService.add({
            severity: 'success',
            summary: 'Role updated',
            detail: `${form.name} saved.`,
          });
        },
        error: (err: ApiError) => {
          this.editRoleSaving.set(false);
          this.editRoleError.set(err.message || 'Failed to update the role.');
        },
      });
  }

  toggleRoleActive(role: Role): void {
    const action = role.isActive
      ? this.mdApi.deactivateRole(role.id)
      : this.mdApi.reactivateRole(role.id);
    action.subscribe({
      next: () => {
        this.loadRoles();
        this.messageService.add({
          severity: 'success',
          summary: role.isActive ? 'Role deactivated' : 'Role reactivated',
          detail: `${role.name} is ${role.isActive ? 'no longer offered' : 'available again'} to tenants.`,
        });
      },
      error: (err: ApiError) => {
        this.messageService.add({
          severity: 'error',
          summary: role.isActive ? 'Deactivate failed' : 'Reactivate failed',
          detail: err.message || 'Please try again.',
        });
      },
    });
  }

  openEditDeptModal(dept: DepartmentCatalog): void {
    this.editDeptForm.set({
      departmentCode: dept.departmentCode,
      departmentName: dept.departmentName,
      description: dept.description ?? '',
      isAppointmentApplicable: dept.isAppointmentApplicable,
    });
    this.editDeptId.set(dept.id);
    this.editDeptError.set(null);
    this.showEditDeptModal.set(true);
  }

  submitEditDept(): void {
    const id = this.editDeptId();
    if (!id) return;
    this.editDeptSaving.set(true);
    this.editDeptError.set(null);
    const form = this.editDeptForm();
    this.mdApi
      .updateDepartmentCatalog(id, {
        departmentName: form.departmentName,
        description: form.description || null,
        isAppointmentApplicable: form.isAppointmentApplicable,
      })
      .subscribe({
        next: () => {
          this.editDeptSaving.set(false);
          this.showEditDeptModal.set(false);
          this.loadDepartments();
          this.messageService.add({
            severity: 'success',
            summary: 'Department updated',
            detail: `${form.departmentName} saved.`,
          });
        },
        error: (err: ApiError) => {
          this.editDeptSaving.set(false);
          this.editDeptError.set(err.message || 'Failed to update the department.');
        },
      });
  }

  toggleDeptActive(dept: DepartmentCatalog): void {
    const action = dept.isActive
      ? this.mdApi.deactivateDepartmentCatalog(dept.id)
      : this.mdApi.reactivateDepartmentCatalog(dept.id);
    action.subscribe({
      next: () => {
        this.loadDepartments();
        this.messageService.add({
          severity: 'success',
          summary: dept.isActive ? 'Department deactivated' : 'Department reactivated',
          detail: `${dept.departmentName} is ${dept.isActive ? 'no longer available' : 'available again'} to tenants.`,
        });
      },
      error: (err: ApiError) => {
        this.messageService.add({
          severity: 'error',
          summary: dept.isActive ? 'Deactivate failed' : 'Reactivate failed',
          detail: err.message || 'Please try again.',
        });
      },
    });
  }
}
