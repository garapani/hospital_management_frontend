import { Component, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { TableLazyLoadEvent, TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { TagModule } from 'primeng/tag';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { SelectButtonModule } from 'primeng/selectbutton';
import { AuthService } from '@org/auth';

import { AdmissionsApiService, Admission, CreateAdmissionDto } from './admissions-api.service.js';
import { admissionSourceSeverity, admissionStatusSeverity, ADMISSION_SOURCES, ADMISSION_STATUSES } from './admission.model.js';
import { EntityName } from '../directory/entity-name.js';

export type AdmissionView = 'All' | 'Active';

@Component({
  selector: 'hms-admission-list',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    FormsModule,
    TableModule,
    ButtonModule,
    TagModule,
    DialogModule,
    InputTextModule,
    SelectModule,
    SelectButtonModule,
    EntityName,
  ],
  templateUrl: './admission-list.html',
})
export class AdmissionList {
  private readonly admissionsApi = inject(AdmissionsApiService);
  readonly auth = inject(AuthService);

  // GET /admissions/active returns the full list with no server-side pagination, unlike the "All"
  // view's paginated GET /admissions — so the Active view pages client-side over this full array.
  private readonly activeAdmissionsAll = signal<Admission[]>([]);
  private readonly allAdmissionsPage = signal<Admission[]>([]);
  readonly admissions = computed(() => {
    if (this.view() === 'Active') {
      const start = this.firstRecord();
      return this.activeAdmissionsAll().slice(start, start + this.pageSize());
    }
    return this.allAdmissionsPage();
  });
  readonly loading = signal(false);
  readonly totalRecords = signal(0);
  readonly pageSize = signal(10);
  readonly firstRecord = signal(0);

  readonly view = signal<AdmissionView>('All');
  readonly statusFilter = signal('');
  readonly patientIdFilter = signal('');
  readonly wardIdFilter = signal('');

  readonly showCreateModal = signal(false);
  readonly createForm = signal<CreateAdmissionDto>({
    patientId: '',
    admissionSource: '',
    admittingDoctorId: '',
    bedId: '',
  });
  readonly saving = signal(false);

  readonly viewOptions = [
    { label: 'All Admissions', value: 'All' },
    { label: 'Active', value: 'Active' },
  ];
  readonly statuses = ADMISSION_STATUSES.map((s) => ({ label: s, value: s }));
  readonly sources = ADMISSION_SOURCES.map((s) => ({ label: s, value: s }));
  readonly statusSeverity = admissionStatusSeverity;
  readonly sourceSeverity = admissionSourceSeverity;

  constructor() {
    this.load(0);
  }

  load(first: number): void {
    this.loading.set(true);

    if (this.view() === 'Active') {
      this.admissionsApi.listActive(this.wardIdFilter() || undefined).subscribe({
        next: (data) => {
          this.activeAdmissionsAll.set(data);
          this.totalRecords.set(data.length);
          this.loading.set(false);
        },
        error: () => this.loading.set(false),
      });
      return;
    }

    const page = Math.floor(first / this.pageSize()) + 1;
    this.admissionsApi
      .list({
        patientId: this.patientIdFilter() || undefined,
        wardId: this.wardIdFilter() || undefined,
        status: this.statusFilter() || undefined,
        page,
        limit: this.pageSize(),
      })
      .subscribe({
        next: (res) => {
          this.allAdmissionsPage.set(res.data);
          this.totalRecords.set(res.meta.total);
          this.loading.set(false);
        },
        error: () => this.loading.set(false),
      });
  }

  onLazyLoad(event: TableLazyLoadEvent): void {
    this.firstRecord.set(event.first || 0);
    // Active view already has every row client-side (see `load`/`admissions` above) — a page
    // change there is a pure slice, not a new fetch.
    if (this.view() !== 'Active') {
      this.load(event.first || 0);
    }
  }

  applyFilters(): void {
    this.firstRecord.set(0);
    this.load(0);
  }

  onViewChange(value: AdmissionView): void {
    this.view.set(value);
    this.firstRecord.set(0);
    this.load(0);
  }

  openCreateModal(): void {
    this.createForm.set({
      patientId: '',
      admissionSource: '',
      admittingDoctorId: '',
      bedId: '',
    });
    this.showCreateModal.set(true);
  }

  submitCreate(): void {
    this.saving.set(true);
    this.admissionsApi.create(this.createForm()).subscribe({
      next: () => {
        this.saving.set(false);
        this.showCreateModal.set(false);
        this.firstRecord.set(0);
        this.load(0);
      },
      error: () => {
        this.saving.set(false);
      },
    });
  }
}
