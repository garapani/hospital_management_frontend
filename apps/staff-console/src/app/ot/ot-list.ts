import { DatePipe } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TableLazyLoadEvent, TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { TagModule } from 'primeng/tag';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { MessageService } from 'primeng/api';
import { Observable } from 'rxjs';
import { ApiError } from '@org/api-client';
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
  readonly scheduleSaving = signal(false);
  readonly scheduleError = signal<string | null>(null);
  readonly actionId = signal<string | null>(null);

  readonly showDetail = signal(false);
  readonly detail = signal<OtSurgery | null>(null);
  readonly detailLoading = signal(false);

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
          this.totalRecords.set(result.total);
          this.loading.set(false);
        },
        error: () => this.loading.set(false),
      });
  }

  openScheduleModal(): void {
    this.scheduleForm.set(EMPTY_FORM);
    this.scheduleError.set(null);
    this.showScheduleModal.set(true);
  }

  submitSchedule(): void {
    this.scheduleSaving.set(true);
    this.scheduleError.set(null);
    this.api.schedule(this.scheduleForm()).subscribe({
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
    this.detail.set(null);
    this.showDetail.set(true);
    this.api.findOne(surgery.id).subscribe({
      next: (data) => {
        this.detail.set(data);
        this.detailLoading.set(false);
      },
      error: () => {
        this.detailLoading.set(false);
        this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Could not load the surgery record.' });
      },
    });
  }

  start(surgery: OtSurgery): void {
    this.runAction(surgery.id, this.api.start(surgery.id), 'Surgery started');
  }

  complete(surgery: OtSurgery): void {
    this.runAction(surgery.id, this.api.complete(surgery.id), 'Surgery completed');
  }

  cancel(surgery: OtSurgery): void {
    this.runAction(surgery.id, this.api.cancel(surgery.id), 'Surgery cancelled');
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
