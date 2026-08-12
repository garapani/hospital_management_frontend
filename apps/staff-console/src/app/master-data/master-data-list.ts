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

  loadDepartments(): void {
    this.deptLoading.set(true);
    this.mdApi.listDepartments().subscribe({
      next: (data) => {
        this.departments.set(data);
        this.deptLoading.set(false);
      },
      error: () => this.deptLoading.set(false),
    });
  }

  loadWards(): void {
    this.wardLoading.set(true);
    this.mdApi.listWards().subscribe({
      next: (data) => {
        this.wards.set(data);
        this.wardLoading.set(false);
      },
      error: () => this.wardLoading.set(false),
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
      },
      error: (err) => {
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
      },
      error: () => {
        this.wardSaving.set(false);
        alert('Failed to save ward.');
      },
    });
  }

  toggleDept(dept: Department): void {
    if (dept.isActive) {
      if (confirm('Are you sure you want to deactivate this department?')) {
        this.mdApi.deactivateDepartment(dept.id).subscribe({
          next: () => this.loadDepartments(),
          error: (err: ApiError) => {
            if (err.status === 400 && err.message?.includes('active children')) {
              alert(err.message); // Exposes backend rejection per spec
            } else {
              alert('Failed to deactivate');
            }
          },
        });
      }
    } else {
      this.mdApi
        .reactivateDepartment(dept.id)
        .subscribe(() => this.loadDepartments());
    }
  }

  toggleWard(ward: Ward): void {
    if (ward.isActive) {
      this.mdApi.deactivateWard(ward.id).subscribe(() => this.loadWards());
    } else {
      this.mdApi.reactivateWard(ward.id).subscribe(() => this.loadWards());
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
      error: () => this.bedsLoading.set(false),
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
      },
      error: () => {
        this.bedSaving.set(false);
        alert('Failed to save bed.');
      },
    });
  }

  toggleBed(bed: Bed): void {
    if (bed.isActive) {
      this.mdApi.deactivateBed(bed.id).subscribe(() => this.loadBeds(bed.wardId));
    } else {
      this.mdApi.reactivateBed(bed.id).subscribe(() => this.loadBeds(bed.wardId));
    }
  }
}
