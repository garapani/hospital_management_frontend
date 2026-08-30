import { DatePipe } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TableLazyLoadEvent, TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { TagModule } from 'primeng/tag';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { MessageService, ConfirmationService } from 'primeng/api';
import { Observable } from 'rxjs';
import { ApiError } from '@org/api-client';
import { AuthService } from '@org/auth';
import { OtApiService } from './ot-api.service.js';
import { CreateSurgeryDto, OtSurgery, OtSurgeryStatus } from './ot.model.js';

const DEFAULT_PAGE_SIZE = 20;
const EMPTY_FORM: CreateSurgeryDto = { patientId: '', procedureName: '' };

@Component({
  imports: [DatePipe, FormsModule, TableModule, ButtonModule, TagModule, DialogModule, InputTextModule, SelectModule],
  selector: 'hms-ot-list',
  templateUrl: './ot-list.html',
})
export class OtList {
  private readonly api = inject(OtApiService);
  private readonly messageService = inject(MessageService);
  private readonly confirmationService = inject(ConfirmationService);
  readonly auth = inject(AuthService);
  readonly canManage = this.auth.hasPermission('ot.manage');

  readonly surgeries = signal<OtSurgery[]>([]);
  readonly totalRecords = signal(0);
  readonly loading = signal(false);
  readonly pageSize = signal(DEFAULT_PAGE_SIZE);
  readonly firstRecord = signal(0);
  readonly patientIdFilter = signal('');
  readonly statusFilter = signal<OtSurgeryStatus | null>(null);

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

  onLazyLoad(event: TableLazyLoadEvent): void {
    const rows = event.rows ?? this.pageSize();
    const page = Math.floor((event.first ?? 0) / rows) + 1;
    this.load(page, rows);
  }

  applyFilters(): void {
    this.load(1, this.pageSize());
  }

  private load(page: number, limit: number): void {
    this.loading.set(true);
    this.firstRecord.set((page - 1) * limit);
    this.api
      .list({
        patientId: this.patientIdFilter() || undefined,
        status: this.statusFilter() ?? undefined,
        page,
        limit,
      })
      .subscribe({
        next: (result) => {
          this.surgeries.set(result.data);
          this.totalRecords.set(result.meta.total);
          this.loading.set(false);
        },
        error: () => {
          this.loading.set(false);
          this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Could not load surgeries.' });
        },
      });
  }

  openScheduleModal(): void {
    this.scheduleForm.set(EMPTY_FORM);
    this.scheduleScheduledAt.set('');
    this.scheduleError.set(null);
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
    this.load(1, this.pageSize());
  }
}
