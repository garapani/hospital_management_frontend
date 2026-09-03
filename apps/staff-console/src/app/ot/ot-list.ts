import { DatePipe } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { TableLazyLoadEvent, TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { TagModule } from 'primeng/tag';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { MessageService, ConfirmationService } from 'primeng/api';
import { EMPTY, Observable, Subject, catchError, map, switchMap } from 'rxjs';
import { ApiError } from '@org/api-client';
import { AuthService } from '@org/auth';
import { OtApiService } from './ot-api.service.js';
import { CreateSurgeryDto, OtSurgery, OtSurgeryStatus, otSurgeryStatusSeverity } from './ot.model.js';
import { EntityName } from '../directory/entity-name.js';
import { PatientsApiService } from '../patients/patients-api.service.js';

const DEFAULT_PAGE_SIZE = 20;
const PATIENT_SEARCH_DEBOUNCE_MS = 300;
const EMPTY_FORM: CreateSurgeryDto = { patientId: '', procedureName: '' };

function patientLabel(p: { firstName: string; lastName: string; patientNo: string }): string {
  return `${p.firstName} ${p.lastName} (${p.patientNo})`;
}

@Component({
  imports: [DatePipe, FormsModule, TableModule, ButtonModule, TagModule, DialogModule, InputTextModule, SelectModule, EntityName],
  selector: 'hms-ot-list',
  templateUrl: './ot-list.html',
})
export class OtList {
  private readonly api = inject(OtApiService);
  private readonly messageService = inject(MessageService);
  private readonly confirmationService = inject(ConfirmationService);
  private readonly patientsApi = inject(PatientsApiService);
  readonly auth = inject(AuthService);
  readonly canManage = this.auth.hasPermission('ot.manage');

  readonly surgeries = signal<OtSurgery[]>([]);
  readonly totalRecords = signal(0);
  readonly loading = signal(false);
  readonly pageSize = signal(DEFAULT_PAGE_SIZE);
  readonly firstRecord = signal(0);
  readonly patientIdFilter = signal('');
  readonly statusFilter = signal<OtSurgeryStatus | null>(null);
  // Name pickers, replacing raw-UUID "Patient ID" text fields.
  readonly patientOptions = signal<{ label: string; value: string }[]>([]);
  readonly patientSearching = signal(false);
  private patientSearchTimer?: ReturnType<typeof setTimeout>;
  readonly schedulePatientOptions = signal<{ label: string; value: string }[]>([]);
  readonly schedulePatientSearching = signal(false);
  private schedulePatientSearchTimer?: ReturnType<typeof setTimeout>;

  readonly statusOptions: { label: string; value: OtSurgeryStatus | null }[] = [
    { label: 'All', value: null },
    { label: 'Scheduled', value: 'Scheduled' },
    { label: 'In Progress', value: 'InProgress' },
    { label: 'Completed', value: 'Completed' },
    { label: 'Cancelled', value: 'Cancelled' },
  ];

  readonly showScheduleModal = signal(false);
  readonly scheduleForm = signal<CreateSurgeryDto>(EMPTY_FORM);
  readonly scheduleScheduledAt = signal('');
  readonly scheduleSaving = signal(false);
  readonly scheduleError = signal<string | null>(null);
  readonly actionId = signal<string | null>(null);

  readonly showDetail = signal(false);
  readonly detail = signal<OtSurgery | null>(null);
  readonly detailLoading = signal(false);
  readonly detailError = signal(false);

  // switchMap cancels a still-in-flight request the moment a newer page/filter is requested, so a
  // slow page-2 response can never overwrite a page-3 response that resolved first; firstRecord is
  // set only once the winning response lands, so the paginator never advances ahead of what the
  // table is actually showing (previously: set eagerly before the HTTP call, so a failed request
  // left the paginator on the new page while the table still showed the old one).
  private readonly loadTrigger = new Subject<{ page: number; limit: number }>();

  onLazyLoad(event: TableLazyLoadEvent): void {
    const rows = event.rows ?? this.pageSize();
    const page = Math.floor((event.first ?? 0) / rows) + 1;
    this.load(page, rows);
  }

  readonly statusSeverity = otSurgeryStatusSeverity;

  applyFilters(): void {
    this.firstRecord.set(0);
    this.load(1, this.pageSize());
  }

  resetFilters(): void {
    this.patientIdFilter.set('');
    this.statusFilter.set(null);
    this.applyFilters();
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

  onSchedulePatientSearch(query: string): void {
    clearTimeout(this.schedulePatientSearchTimer);
    const q = query.trim();
    if (q.length < 2) {
      this.schedulePatientOptions.set([]);
      return;
    }
    this.schedulePatientSearchTimer = setTimeout(() => {
      this.schedulePatientSearching.set(true);
      this.patientsApi.search({ page: 1, limit: 10, q }).subscribe({
        next: (res) => {
          this.schedulePatientOptions.set(res.data.map((p) => ({ label: patientLabel(p), value: p.id })));
          this.schedulePatientSearching.set(false);
        },
        error: () => this.schedulePatientSearching.set(false),
      });
    }, PATIENT_SEARCH_DEBOUNCE_MS);
  }

  openScheduleModal(): void {
    this.scheduleForm.set(EMPTY_FORM);
    this.scheduleScheduledAt.set('');
    this.scheduleError.set(null);
    this.schedulePatientOptions.set([]);
    this.showScheduleModal.set(true);
  }

  submitSchedule(): void {
    this.scheduleSaving.set(true);
    this.scheduleError.set(null);
    const scheduledAt = this.scheduleScheduledAt();
    this.api
      .schedule({ ...this.scheduleForm(), scheduledAt: scheduledAt ? new Date(scheduledAt).toISOString() : undefined })
      .subscribe({
        next: (surgery) => {
          this.scheduleSaving.set(false);
          this.showScheduleModal.set(false);
          this.load(1, this.pageSize());
          this.messageService.add({ severity: 'success', summary: 'Surgery scheduled', detail: surgery.surgeryNumber });
        },
        error: (err: ApiError) => {
          this.scheduleSaving.set(false);
          this.scheduleError.set(err.message || 'Failed to schedule the surgery.');
        },
      });
  }

  viewSurgery(surgery: OtSurgery): void {
    this.detailLoading.set(true);
    this.detailError.set(false);
    this.detail.set(null);
    this.showDetail.set(true);
    this.api.findOne(surgery.id).subscribe({
      next: (data) => {
        this.detail.set(data);
        this.detailLoading.set(false);
      },
      error: () => {
        this.detailLoading.set(false);
        this.detailError.set(true);
        this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Could not load the surgery record.' });
      },
    });
  }

  start(surgery: OtSurgery): void {
    this.runAction(surgery.id, this.api.start(surgery.id), 'Surgery started');
  }

  complete(surgery: OtSurgery): void {
    this.confirmationService.confirm({
      header: 'Complete Surgery',
      message: `Mark surgery "${surgery.surgeryNumber}" (${surgery.procedureName}) as completed?`,
      icon: 'pi pi-check-circle',
      acceptButtonProps: { label: 'Complete', severity: 'success' },
      rejectButtonProps: { label: 'Cancel', severity: 'secondary', outlined: true },
      accept: () => this.runAction(surgery.id, this.api.complete(surgery.id), 'Surgery completed'),
    });
  }

  cancel(surgery: OtSurgery): void {
    this.confirmationService.confirm({
      header: 'Cancel Surgery',
      message: `Cancel surgery "${surgery.surgeryNumber}" (${surgery.procedureName})?`,
      icon: 'pi pi-exclamation-triangle',
      acceptButtonProps: { label: 'Cancel Surgery', severity: 'danger' },
      rejectButtonProps: { label: 'Back', severity: 'secondary', outlined: true },
      accept: () => this.runAction(surgery.id, this.api.cancel(surgery.id), 'Surgery cancelled'),
    });
  }

  private runAction(id: string, action$: Observable<OtSurgery>, successSummary: string): void {
    this.actionId.set(id);
    action$.subscribe({
      next: () => {
        this.actionId.set(null);
        this.load(1, this.pageSize());
        this.messageService.add({ severity: 'success', summary: successSummary });
      },
      error: (err: ApiError) => {
        this.actionId.set(null);
        this.messageService.add({ severity: 'error', summary: 'Action failed', detail: err.message || 'Please try again.' });
      },
    });
  }

  constructor() {
    this.loadTrigger
      .pipe(
        switchMap(({ page, limit }) => {
          this.loading.set(true);
          return this.api
            .list({
              patientId: this.patientIdFilter() || undefined,
              status: this.statusFilter() ?? undefined,
              page,
              limit,
            })
            .pipe(
              map((result) => ({ result, page, limit })),
              catchError(() => {
                this.loading.set(false);
                this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Could not load surgeries.' });
                return EMPTY;
              }),
            );
        }),
        takeUntilDestroyed(),
      )
      .subscribe(({ result, page, limit }) => {
        this.firstRecord.set((page - 1) * limit);
        this.surgeries.set(result.data);
        this.totalRecords.set(result.meta.total);
        this.loading.set(false);
      });

    this.load(1, this.pageSize());
  }
}
