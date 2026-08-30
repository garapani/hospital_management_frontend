import { Component, inject, signal } from '@angular/core';
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { TagModule } from 'primeng/tag';
import { DialogModule } from 'primeng/dialog';
import { FormsModule } from '@angular/forms';
import { InputTextModule } from 'primeng/inputtext';
import { TabsModule } from 'primeng/tabs';
import { CheckboxModule } from 'primeng/checkbox';
import { SelectModule } from 'primeng/select';
import { TooltipModule } from 'primeng/tooltip';
import { MessageService, ConfirmationService } from 'primeng/api';
import { ApiError } from '@org/api-client';
import { AuthService } from '@org/auth';
import { MasterDataApiService } from './master-data-api.service.js';
import { Department, Ward, Bed } from './master-data.model.js';

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
    SelectModule,
    TooltipModule,
  ],
  selector: 'hms-master-data-list',
  templateUrl: './master-data-list.html',
})
export class MasterDataList {
  private readonly mdApi = inject(MasterDataApiService);
  private readonly messageService = inject(MessageService);
  private readonly confirmationService = inject(ConfirmationService);
  readonly auth = inject(AuthService);
  readonly canManage = this.auth.hasPermission('master-data.manage');

  readonly departments = signal<Department[]>([]);
  readonly deptLoading = signal(false);
  readonly togglingDeptId = signal<string | null>(null);

  readonly wards = signal<Ward[]>([]);
  readonly wardLoading = signal(false);
  readonly togglingWardId = signal<string | null>(null);
  readonly togglingBedId = signal<string | null>(null);

  // Department Modal
  readonly showDeptModal = signal(false);
  readonly deptForm = signal<Partial<Department>>({});
  readonly deptSaving = signal(false);
  readonly deptError = signal<string | null>(null);

  // Ward Modal
  readonly showWardModal = signal(false);
  readonly wardForm = signal<Partial<Ward>>({});
  readonly wardSaving = signal(false);

  // Beds Modal
  readonly showBedsModal = signal(false);
  readonly selectedWard = signal<Ward | null>(null);
  readonly beds = signal<Bed[]>([]);
  readonly bedsLoading = signal(false);

  readonly bedForm = signal<Partial<Bed>>({});
  readonly bedSaving = signal(false);

  constructor() {
    this.loadDepartments();
    this.loadWards();
  }

  private loadError(summary: string): void {
    this.messageService.add({
      severity: 'error',
      summary,
      detail: 'Please try again.',
    });
  }

  loadDepartments(): void {
    this.deptLoading.set(true);
    this.mdApi.listDepartments().subscribe({
      next: (data) => {
        this.departments.set(data);
        this.deptLoading.set(false);
      },
      error: () => {
        this.deptLoading.set(false);
        this.loadError('Could not load departments');
      },
    });
  }

  loadWards(): void {
    this.wardLoading.set(true);
    this.mdApi.listWards().subscribe({
      next: (data) => {
        this.wards.set(data);
        this.wardLoading.set(false);
      },
      error: () => {
        this.wardLoading.set(false);
        this.loadError('Could not load wards');
      },
    });
  }

  openDeptModal(): void {
    this.deptForm.set({ isAppointmentApplicable: true });
    this.deptError.set(null);
    this.showDeptModal.set(true);
  }

  submitDept(): void {
    this.deptSaving.set(true);
    this.deptError.set(null);
    this.mdApi.createDepartment(this.deptForm()).subscribe({
      next: () => {
        this.deptSaving.set(false);
        this.showDeptModal.set(false);
        this.loadDepartments();
        this.messageService.add({
          severity: 'success',
          summary: 'Department created',
          detail: `${this.deptForm().departmentName ?? 'Department'} saved.`,
        });
      },
      error: (err: ApiError) => {
        this.deptSaving.set(false);
        if (err.status === 409) {
          this.deptError.set('Department Code already exists.');
        } else {
          this.deptError.set('Failed to save department.');
        }
      },
    });
  }

  openWardModal(): void {
    this.wardForm.set({});
    this.showWardModal.set(true);
  }

  submitWard(): void {
    this.wardSaving.set(true);
    this.mdApi.createWard(this.wardForm()).subscribe({
      next: () => {
        this.wardSaving.set(false);
        this.showWardModal.set(false);
        this.loadWards();
        this.messageService.add({
          severity: 'success',
          summary: 'Ward created',
          detail: 'Ward saved.',
        });
      },
      error: (err: ApiError) => {
        this.wardSaving.set(false);
        this.messageService.add({
          severity: 'error',
          summary: 'Ward create failed',
          detail: err.message || 'Failed to save ward.',
        });
      },
    });
  }

  toggleDept(dept: Department): void {
    if (this.togglingDeptId() !== null) return;
    const doToggle = () => {
      this.togglingDeptId.set(dept.id);
      const action = dept.isActive
        ? this.mdApi.deactivateDepartment(dept.id)
        : this.mdApi.reactivateDepartment(dept.id);
      action.subscribe({
        next: () => {
          this.togglingDeptId.set(null);
          this.loadDepartments();
          this.messageService.add({
            severity: 'success',
            summary: dept.isActive ? 'Department deactivated' : 'Department reactivated',
            detail: `${dept.departmentName} is ${dept.isActive ? 'no longer active' : 'active again'}.`,
          });
        },
        error: (err: ApiError) => {
          this.togglingDeptId.set(null);
          this.messageService.add({
            severity: 'error',
            summary: dept.isActive ? 'Deactivate failed' : 'Reactivate failed',
            detail: err.message || 'Please try again.',
          });
        },
      });
    };

    if (!dept.isActive) {
      doToggle();
      return;
    }
    this.confirmationService.confirm({
      header: 'Deactivate Department',
      message: `Deactivate "${dept.departmentName}"? It will no longer be selectable for new records.`,
      icon: 'pi pi-exclamation-triangle',
      acceptButtonProps: { label: 'Deactivate', severity: 'danger' },
      rejectButtonProps: { label: 'Cancel', severity: 'secondary', outlined: true },
      accept: doToggle,
    });
  }

  toggleWard(ward: Ward): void {
    if (this.togglingWardId() !== null) return;
    const doToggle = () => {
      this.togglingWardId.set(ward.id);
      const action = ward.isActive ? this.mdApi.deactivateWard(ward.id) : this.mdApi.reactivateWard(ward.id);
      action.subscribe({
        next: () => {
          this.togglingWardId.set(null);
          this.loadWards();
          this.messageService.add({
            severity: 'success',
            summary: ward.isActive ? 'Ward deactivated' : 'Ward reactivated',
            detail: `${ward.wardName} is ${ward.isActive ? 'no longer active' : 'active again'}.`,
          });
        },
        error: (err: ApiError) => {
          this.togglingWardId.set(null);
          this.messageService.add({
            severity: 'error',
            summary: ward.isActive ? 'Deactivate failed' : 'Reactivate failed',
            detail: err.message || 'Failed to update the ward.',
          });
        },
      });
    };

    if (!ward.isActive) {
      doToggle();
      return;
    }
    this.confirmationService.confirm({
      header: 'Deactivate Ward',
      message: `Deactivate "${ward.wardName}"? It will no longer be selectable for new admissions.`,
      icon: 'pi pi-exclamation-triangle',
      acceptButtonProps: { label: 'Deactivate', severity: 'danger' },
      rejectButtonProps: { label: 'Cancel', severity: 'secondary', outlined: true },
      accept: doToggle,
    });
  }

  // Circular reference guard helper for parent dropdown
  getAvailableParents() {
    // In a real edit mode we would exclude descendants. Since we only support create for now,
    // any active department can be a parent.
    return this.departments()
      .filter((d) => d.isActive)
      .map((d) => ({ label: d.departmentName, value: d.id }));
  }

  parentDepartmentName(parentDepartmentId: string | null | undefined): string {
    if (!parentDepartmentId) return '-';
    return this.departments().find((d) => d.id === parentDepartmentId)?.departmentName ?? parentDepartmentId;
  }

  openBedsModal(ward: Ward): void {
    this.selectedWard.set(ward);
    this.bedForm.set({});
    this.showBedsModal.set(true);
    this.loadBeds(ward.id);
  }

  loadBeds(wardId: string): void {
    this.bedsLoading.set(true);
    this.mdApi.listBedsByWard(wardId).subscribe({
      next: (data) => {
        this.beds.set(data);
        this.bedsLoading.set(false);
      },
      error: () => {
        this.bedsLoading.set(false);
        this.loadError('Could not load beds');
      },
    });
  }

  submitBed(): void {
    const ward = this.selectedWard();
    if (!ward) return;

    this.bedSaving.set(true);
    this.mdApi.createBed(ward.id, this.bedForm()).subscribe({
      next: () => {
        this.bedSaving.set(false);
        this.bedForm.set({});
        this.loadBeds(ward.id);
        this.messageService.add({
          severity: 'success',
          summary: 'Bed created',
          detail: 'Bed saved.',
        });
      },
      error: (err: ApiError) => {
        this.bedSaving.set(false);
        this.messageService.add({
          severity: 'error',
          summary: 'Bed create failed',
          detail: err.message || 'Failed to save bed.',
        });
      },
    });
  }

  toggleBed(bed: Bed): void {
    if (this.togglingBedId() !== null) return;
    const doToggle = () => {
      this.togglingBedId.set(bed.id);
      const action = bed.isActive ? this.mdApi.deactivateBed(bed.id) : this.mdApi.reactivateBed(bed.id);
      action.subscribe({
        next: () => {
          this.togglingBedId.set(null);
          this.loadBeds(bed.wardId);
        },
        error: () => {
          this.togglingBedId.set(null);
          this.loadError(bed.isActive ? 'Could not deactivate bed' : 'Could not reactivate bed');
        },
      });
    };

    if (!bed.isActive) {
      doToggle();
      return;
    }
    this.confirmationService.confirm({
      header: 'Deactivate Bed',
      message: `Deactivate bed "${bed.bedNumber}"?`,
      icon: 'pi pi-exclamation-triangle',
      acceptButtonProps: { label: 'Deactivate', severity: 'danger' },
      rejectButtonProps: { label: 'Cancel', severity: 'secondary', outlined: true },
      accept: doToggle,
    });
  }
}
