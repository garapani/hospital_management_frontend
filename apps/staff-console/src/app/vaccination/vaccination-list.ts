import { DatePipe } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { TableLazyLoadEvent, TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { InputNumberModule } from 'primeng/inputnumber';
import { SelectModule } from 'primeng/select';
import { MessageService } from 'primeng/api';
import { EMPTY, Subject, catchError, map, switchMap } from 'rxjs';
import { ApiError } from '@org/api-client';
import { AuthService } from '@org/auth';
import { VaccinationApiService } from './vaccination-api.service.js';
import { CreateVaccinationRecordDto, VaccinationRecord } from './vaccination.model.js';
import { todayLocal } from '../shared/date.util.js';
import { EntityName } from '../directory/entity-name.js';
import { PatientsApiService } from '../patients/patients-api.service.js';

const DEFAULT_PAGE_SIZE = 20;
const PATIENT_SEARCH_DEBOUNCE_MS = 300;
const EMPTY_FORM: CreateVaccinationRecordDto = { patientId: '', vaccine: '', administeredDate: '' };

function patientLabel(p: { firstName: string; lastName: string; patientNo: string }): string {
  return `${p.firstName} ${p.lastName} (${p.patientNo})`;
}

@Component({
  imports: [DatePipe, FormsModule, TableModule, ButtonModule, DialogModule, InputTextModule, InputNumberModule, SelectModule, EntityName],
  selector: 'hms-vaccination-list',
  templateUrl: './vaccination-list.html',
})
export class VaccinationList {
  private readonly api = inject(VaccinationApiService);
  private readonly messageService = inject(MessageService);
  private readonly patientsApi = inject(PatientsApiService);
  readonly auth = inject(AuthService);
  readonly canManage = this.auth.hasPermission('vaccination.manage');

  readonly records = signal<VaccinationRecord[]>([]);
  readonly totalRecords = signal(0);
  readonly loading = signal(false);
  readonly pageSize = signal(DEFAULT_PAGE_SIZE);
  readonly firstRecord = signal(0);
  readonly patientIdFilter = signal('');
  // Name pickers, replacing raw-UUID "Patient ID" text fields.
  readonly patientOptions = signal<{ label: string; value: string }[]>([]);
  readonly patientSearching = signal(false);
  private patientSearchTimer?: ReturnType<typeof setTimeout>;
  readonly formPatientOptions = signal<{ label: string; value: string }[]>([]);
  readonly formPatientSearching = signal(false);
  private formPatientSearchTimer?: ReturnType<typeof setTimeout>;

  readonly showModal = signal(false);
  readonly form = signal<CreateVaccinationRecordDto>(EMPTY_FORM);
  readonly saving = signal(false);
  readonly error = signal<string | null>(null);

  // switchMap cancels a still-in-flight request the moment a newer page/filter is requested, so a
  // slow response can never overwrite a later one that resolved first; firstRecord is set only
  // once the winning response lands, so the paginator never advances ahead of what the table is
  // actually showing (previously: set eagerly before the HTTP call, so a failed request left the
  // paginator on the new page while the table still showed the old one).
  private readonly loadTrigger = new Subject<{ page: number; limit: number }>();

  onLazyLoad(event: TableLazyLoadEvent): void {
    const rows = event.rows ?? this.pageSize();
    const page = Math.floor((event.first ?? 0) / rows) + 1;
    this.load(page, rows);
  }

  applyFilter(): void {
    this.load(1, this.pageSize());
  }

  private load(page: number, limit: number): void {
    this.loadTrigger.next({ page, limit });
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

  onFormPatientSearch(query: string): void {
    clearTimeout(this.formPatientSearchTimer);
    const q = query.trim();
    if (q.length < 2) {
      this.formPatientOptions.set([]);
      return;
    }
    this.formPatientSearchTimer = setTimeout(() => {
      this.formPatientSearching.set(true);
      this.patientsApi.search({ page: 1, limit: 10, q }).subscribe({
        next: (res) => {
          this.formPatientOptions.set(res.data.map((p) => ({ label: patientLabel(p), value: p.id })));
          this.formPatientSearching.set(false);
        },
        error: () => this.formPatientSearching.set(false),
      });
    }, PATIENT_SEARCH_DEBOUNCE_MS);
  }

  openModal(): void {
    this.form.set({ ...EMPTY_FORM, administeredDate: todayLocal() });
    this.error.set(null);
    this.formPatientOptions.set([]);
    this.showModal.set(true);
  }

  submit(): void {
    this.saving.set(true);
    this.error.set(null);
    this.api.record(this.form()).subscribe({
      next: () => {
        this.saving.set(false);
        this.showModal.set(false);
        this.load(1, this.pageSize());
        this.messageService.add({ severity: 'success', summary: 'Vaccination recorded', detail: this.form().vaccine });
      },
      error: (err: ApiError) => {
        this.saving.set(false);
        this.error.set(err.message || 'Failed to record the vaccination.');
      },
    });
  }

  constructor() {
    this.loadTrigger
      .pipe(
        switchMap(({ page, limit }) => {
          this.loading.set(true);
          return this.api.list({ patientId: this.patientIdFilter() || undefined, page, limit }).pipe(
            map((result) => ({ result, page, limit })),
            catchError(() => {
              this.loading.set(false);
              this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Could not load vaccination records.' });
              return EMPTY;
            }),
          );
        }),
        takeUntilDestroyed(),
      )
      .subscribe(({ result, page, limit }) => {
        this.firstRecord.set((page - 1) * limit);
        this.records.set(result.data);
        this.totalRecords.set(result.meta.total);
        this.loading.set(false);
      });

    this.load(1, this.pageSize());
  }
}
