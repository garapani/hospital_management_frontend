import { DatePipe } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { TableLazyLoadEvent, TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { TagModule } from 'primeng/tag';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { InputNumberModule } from 'primeng/inputnumber';
import { SelectModule } from 'primeng/select';
import { MessageService, ConfirmationService } from 'primeng/api';
import { EMPTY, Subject, catchError, map, switchMap } from 'rxjs';
import { ApiError } from '@org/api-client';
import { AuthService } from '@org/auth';
import { MaternityApiService } from './maternity-api.service.js';
import { CreateMaternityRecordDto, DELIVERY_TYPES, DeliveryType, MaternityRecord, RecordDeliveryDto } from './maternity.model.js';
import { todayLocal } from '../shared/date.util.js';
import { EntityName } from '../directory/entity-name.js';
import { PatientsApiService } from '../patients/patients-api.service.js';
import { AdmissionsApiService, Admission } from '../admissions/admissions-api.service.js';

const DEFAULT_PAGE_SIZE = 20;
const PATIENT_SEARCH_DEBOUNCE_MS = 300;
const EMPTY_CREATE_FORM: CreateMaternityRecordDto = { admissionId: '', patientId: '' };
const EMPTY_DELIVERY_FORM: RecordDeliveryDto = { deliveryDate: '', deliveryType: 'Normal', babyCount: 1 };

function patientLabel(p: { firstName: string; lastName: string; patientNo: string }): string {
  return `${p.firstName} ${p.lastName} (${p.patientNo})`;
}

@Component({
  imports: [DatePipe, RouterModule, FormsModule, TableModule, ButtonModule, TagModule, DialogModule, InputTextModule, InputNumberModule, SelectModule, EntityName],
  selector: 'hms-maternity-list',
  templateUrl: './maternity-list.html',
})
export class MaternityList {
  private readonly api = inject(MaternityApiService);
  private readonly messageService = inject(MessageService);
  private readonly confirmationService = inject(ConfirmationService);
  private readonly patientsApi = inject(PatientsApiService);
  private readonly admissionsApi = inject(AdmissionsApiService);
  readonly auth = inject(AuthService);
  readonly canManage = this.auth.hasPermission('maternity.manage');

  readonly deliveryTypes: DeliveryType[] = DELIVERY_TYPES;

  readonly records = signal<MaternityRecord[]>([]);
  readonly totalRecords = signal(0);
  readonly loading = signal(false);
  readonly pageSize = signal(DEFAULT_PAGE_SIZE);
  readonly firstRecord = signal(0);
  readonly patientIdFilter = signal('');
  // Name picker, replacing a raw-UUID "Patient ID" text filter.
  readonly patientOptions = signal<{ label: string; value: string }[]>([]);
  readonly patientSearching = signal(false);
  private patientSearchTimer?: ReturnType<typeof setTimeout>;

  readonly showCreateModal = signal(false);
  readonly createForm = signal<CreateMaternityRecordDto>(EMPTY_CREATE_FORM);
  readonly createSaving = signal(false);
  readonly createError = signal<string | null>(null);
  // A maternity record needs a real admissionId, not just a patientId — selecting a patient in
  // the create dialog resolves straight to their current active admission (mirroring
  // NursingConsole.onPatientSelected), rather than asking the user for an admission UUID.
  readonly createPatientOptions = signal<{ label: string; value: string }[]>([]);
  readonly createPatientSearching = signal(false);
  private createPatientSearchTimer?: ReturnType<typeof setTimeout>;
  readonly resolvedAdmission = signal<Admission | null>(null);
  readonly resolvingAdmission = signal(false);

  readonly showDeliveryModal = signal(false);
  readonly deliveryRecordId = signal<string | null>(null);
  readonly deliveryForm = signal<RecordDeliveryDto>(EMPTY_DELIVERY_FORM);
  readonly deliverySaving = signal(false);
  readonly deliveryError = signal<string | null>(null);

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

  /** A patient can only have one active admission at a time (backend-enforced), so selecting a
   *  patient resolves straight to it — no separate "pick which admission" step needed. */
  onCreatePatientSelected(patientId: string | null): void {
    this.createForm.set({ ...this.createForm(), patientId: patientId ?? '', admissionId: '' });
    this.resolvedAdmission.set(null);

    if (!patientId) return;

    this.resolvingAdmission.set(true);
    this.admissionsApi.list({ patientId, status: 'Admitted', page: 1, limit: 1 }).subscribe({
      next: (result) => {
        this.resolvingAdmission.set(false);
        const admission = result.data[0];
        if (!admission) {
          this.messageService.add({
            severity: 'warn',
            summary: 'No active admission',
            detail: 'This patient has no active admission right now.',
          });
          return;
        }
        this.resolvedAdmission.set(admission);
        this.createForm.set({ ...this.createForm(), admissionId: admission.id });
      },
      error: () => {
        this.resolvingAdmission.set(false);
        this.messageService.add({ severity: 'error', summary: 'Error', detail: "Could not look up this patient's admission." });
      },
    });
  }

  openCreateModal(): void {
    this.createForm.set(EMPTY_CREATE_FORM);
    this.createPatientOptions.set([]);
    this.resolvedAdmission.set(null);
    this.createError.set(null);
    this.showCreateModal.set(true);
  }

  submitCreate(): void {
    this.createSaving.set(true);
    this.createError.set(null);
    const form = this.createForm();
    // @IsOptional() on the backend's `edd` (@IsDateString) only skips undefined/null, not '' — a
    // cleared date field must not be sent as an empty string or it 400s.
    this.api.create({ ...form, edd: form.edd || undefined }).subscribe({
      next: () => {
        this.createSaving.set(false);
        this.showCreateModal.set(false);
        this.load(1, this.pageSize());
        this.messageService.add({ severity: 'success', summary: 'Maternity record created' });
      },
      error: (err: ApiError) => {
        this.createSaving.set(false);
        this.createError.set(err.message || 'Failed to save the record.');
      },
    });
  }

  openDeliveryModal(record: MaternityRecord): void {
    this.deliveryRecordId.set(record.id);
    this.deliveryForm.set({ ...EMPTY_DELIVERY_FORM, deliveryDate: todayLocal() });
    this.deliveryError.set(null);
    this.showDeliveryModal.set(true);
  }

  submitDelivery(): void {
    const id = this.deliveryRecordId();
    const form = this.deliveryForm();
    if (!id) return;
    if (!form.deliveryDate || !form.babyCount || form.babyCount < 1) {
      this.deliveryError.set('Delivery date and a baby count of at least 1 are required.');
      return;
    }

    this.confirmationService.confirm({
      header: 'Record Delivery',
      message: 'This delivery record cannot be edited or undone once saved. Continue?',
      icon: 'pi pi-exclamation-triangle',
      acceptButtonProps: { label: 'Record Delivery', severity: 'danger' },
      rejectButtonProps: { label: 'Back', severity: 'secondary', outlined: true },
      accept: () => {
        this.deliverySaving.set(true);
        this.deliveryError.set(null);
        this.api.recordDelivery(id, form).subscribe({
          next: () => {
            this.deliverySaving.set(false);
            this.showDeliveryModal.set(false);
            this.load(1, this.pageSize());
            this.messageService.add({ severity: 'success', summary: 'Delivery recorded' });
          },
          error: (err: ApiError) => {
            this.deliverySaving.set(false);
            this.deliveryError.set(err.message || 'Failed to record the delivery.');
          },
        });
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
              this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Could not load maternity records.' });
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
