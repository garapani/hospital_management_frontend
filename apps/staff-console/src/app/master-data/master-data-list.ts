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
import { MessageService } from 'primeng/api';
import { ApiError } from '@org/api-client';
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
  ],
  selector: 'hms-master-data-list',
  templateUrl: './master-data-list.html',
})
export class MasterDataList {
  private readonly mdApi = inject(MasterDataApiService);
  private readonly messageService = inject(MessageService);

  readonly departments = signal<Department[]>([]);
  readonly deptLoading = signal(false);

  readonly wards = signal<Ward[]>([]);
  readonly wardLoading = signal(false);

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
    const id = dept.id;
    if (dept.isActive) {
      this.mdApi.deactivateDepartment(id).subscribe({
        next: () => {
          this.loadDepartments();
          this.messageService.add({
            severity: 'success',
            summary: 'Department deactivated',
            detail: `${dept.departmentName} is no longer active.`,
          });
        },
        error: (err: ApiError) => {
          this.messageService.add({
            severity: 'error',
            summary: 'Deactivate failed',
            detail: err.message || 'Failed to deactivate.',
          });
        },
      });
    } else {
      this.mdApi.reactivateDepartment(id).subscribe({
        next: () => {
          this.loadDepartments();
          this.messageService.add({
            severity: 'success',
            summary: 'Department reactivated',
            detail: `${dept.departmentName} is active again.`,
          });
        },
        error: () => {
          this.messageService.add({
            severity: 'error',
            summary: 'Reactivate failed',
            detail: 'Failed to reactivate.',
          });
        },
      });
    }
  }

  toggleWard(ward: Ward): void {
    if (ward.isActive) {
      this.mdApi.deactivateWard(ward.id).subscribe({
        next: () => {
          this.loadWards();
          this.messageService.add({
            severity: 'success',
            summary: 'Ward deactivated',
            detail: `${ward.wardName} is no longer active.`,
          });
        },
        error: () => {
          this.messageService.add({
            severity: 'error',
            summary: 'Deactivate failed',
            detail: 'Failed to deactivate ward.',
          });
        },
      });
    } else {
      this.mdApi.reactivateWard(ward.id).subscribe({
        next: () => {
          this.loadWards();
          this.messageService.add({
            severity: 'success',
            summary: 'Ward reactivated',
            detail: `${ward.wardName} is active again.`,
          });
        },
        error: () => {
          this.messageService.add({
            severity: 'error',
            summary: 'Reactivate failed',
            detail: 'Failed to reactivate ward.',
          });
        },
      });
    }
  }

  // Circular reference guard helper for parent dropdown
  getAvailableParents() {
    // In a real edit mode we would exclude descendants. Since we only support create for now,
    // any active department can be a parent.
    return this.departments()
      .filter((d) => d.isActive)
      .map((d) => ({ label: d.departmentName, value: d.id }));
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
    if (bed.isActive) {
      this.mdApi.deactivateBed(bed.id).subscribe({
        next: () => this.loadBeds(bed.wardId),
        error: () => this.loadError('Could not deactivate bed'),
      });
    } else {
      this.mdApi.reactivateBed(bed.id).subscribe({
        next: () => this.loadBeds(bed.wardId),
        error: () => this.loadError('Could not reactivate bed'),
      });
    }
  }
}
