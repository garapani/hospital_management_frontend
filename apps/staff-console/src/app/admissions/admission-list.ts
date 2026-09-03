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
import { PatientsApiService } from '../patients/patients-api.service.js';
import { UsersApiService } from '../users/users-api.service.js';
import { MasterDataApiService } from '../master-data/master-data-api.service.js';
import { Ward, Bed } from '../master-data/master-data.model.js';

export type AdmissionView = 'All' | 'Active';

const PATIENT_SEARCH_DEBOUNCE_MS = 300;

function patientLabel(p: { firstName: string; lastName: string; patientNo: string }): string {
  return `${p.firstName} ${p.lastName} (${p.patientNo})`;
}

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
  private readonly patientsApi = inject(PatientsApiService);
  private readonly usersApi = inject(UsersApiService);
  private readonly masterDataApi = inject(MasterDataApiService);
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

  // Name pickers, replacing raw-UUID text fields — matching the Orders/Nursing/OT/Maternity/
  // Vaccination pattern (server-searched patient) and the Appointments pattern (bulk-loaded
  // doctor/ward, small enough lists to load once rather than search).
  readonly patientOptions = signal<{ label: string; value: string }[]>([]);
  readonly patientSearching = signal(false);
  private patientSearchTimer?: ReturnType<typeof setTimeout>;
  readonly createPatientOptions = signal<{ label: string; value: string }[]>([]);
  readonly createPatientSearching = signal(false);
  private createPatientSearchTimer?: ReturnType<typeof setTimeout>;
  readonly doctorOptions = signal<{ label: string; value: string }[]>([]);
  readonly wardOptions = signal<Ward[]>([]);
  readonly createBedWardId = signal<string | null>(null);
  readonly createBeds = signal<Bed[]>([]);
  readonly createBedsLoading = signal(false);

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
    this.usersApi.listDirectory('Doctor').subscribe({
      next: (doctors) => this.doctorOptions.set(doctors.map((d) => ({ label: d.displayName, value: d.id }))),
      error: () => this.doctorOptions.set([]),
    });
    this.masterDataApi.listWards().subscribe({
      next: (wards) => this.wardOptions.set(wards.filter((w) => w.isActive)),
      error: () => this.wardOptions.set([]),
    });
  }

  onPatientFilterSearch(query: string): void {
    clearTimeout(this.patientSearchTimer);
    const q = query.trim();
    if (q.length < 2) {
      this.patientOptions.set([]);
      return;
    }
    this.patientSearchTimer = setTimeout(() => {
      this.patientSearching.set(true);
      this.patientsApi.search({ page: 1, limit: 10, q }).subscribe({
        next: (res) => {
          this.patientOptions.set(res.data.map((p) => ({ label: patientLabel(p), value: p.id })));
          this.patientSearching.set(false);
        },
        error: () => this.patientSearching.set(false),
      });
    }, PATIENT_SEARCH_DEBOUNCE_MS);
  }

  onCreatePatientSearch(query: string): void {
    clearTimeout(this.createPatientSearchTimer);
    const q = query.trim();
    if (q.length < 2) {
      this.createPatientOptions.set([]);
      return;
    }
    this.createPatientSearchTimer = setTimeout(() => {
      this.createPatientSearching.set(true);
      this.patientsApi.search({ page: 1, limit: 10, q }).subscribe({
        next: (res) => {
          this.createPatientOptions.set(res.data.map((p) => ({ label: patientLabel(p), value: p.id })));
          this.createPatientSearching.set(false);
        },
        error: () => this.createPatientSearching.set(false),
      });
    }, PATIENT_SEARCH_DEBOUNCE_MS);
  }

  selectCreateBedWard(wardId: string | null): void {
    this.createBedWardId.set(wardId);
    this.createForm.set({ ...this.createForm(), bedId: '' });
    if (!wardId) {
      this.createBeds.set([]);
      return;
    }
    this.createBedsLoading.set(true);
    this.masterDataApi.listBedsByWard(wardId).subscribe({
      next: (beds) => {
        this.createBeds.set(beds.filter((b) => b.isActive && b.status === 'Available'));
        this.createBedsLoading.set(false);
      },
      error: () => this.createBedsLoading.set(false),
    });
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

  readonly hasActiveFilters = computed(() => {
    return this.view() !== 'All' || !!this.wardIdFilter() || !!this.statusFilter() || !!this.patientIdFilter();
  });

  applyFilters(): void {
    this.firstRecord.set(0);
    this.load(0);
  }

  resetFilters(): void {
    this.view.set('All');
    this.wardIdFilter.set('');
    this.statusFilter.set('');
    this.patientIdFilter.set('');
    this.applyFilters();
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
    this.createPatientOptions.set([]);
    this.createBedWardId.set(null);
    this.createBeds.set([]);
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
