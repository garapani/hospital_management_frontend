import { DatePipe } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TableLazyLoadEvent, TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { InputNumberModule } from 'primeng/inputnumber';
import { MessageService } from 'primeng/api';
import { ApiError } from '@org/api-client';
import { AuthService } from '@org/auth';
import { VaccinationApiService } from './vaccination-api.service.js';
import { CreateVaccinationRecordDto, VaccinationRecord } from './vaccination.model.js';
import { todayLocal } from '../shared/date.util.js';

const DEFAULT_PAGE_SIZE = 20;
const EMPTY_FORM: CreateVaccinationRecordDto = { patientId: '', vaccine: '', administeredDate: '' };

@Component({
  imports: [DatePipe, FormsModule, TableModule, ButtonModule, DialogModule, InputTextModule, InputNumberModule],
  selector: 'hms-vaccination-list',
  templateUrl: './vaccination-list.html',
})
export class VaccinationList {
  private readonly api = inject(VaccinationApiService);
  private readonly messageService = inject(MessageService);
  readonly auth = inject(AuthService);
  readonly canManage = this.auth.hasPermission('vaccination.manage');

  readonly records = signal<VaccinationRecord[]>([]);
  readonly totalRecords = signal(0);
  readonly loading = signal(false);
  readonly pageSize = signal(DEFAULT_PAGE_SIZE);
  readonly firstRecord = signal(0);
  readonly patientIdFilter = signal('');

  readonly showModal = signal(false);
  readonly form = signal<CreateVaccinationRecordDto>(EMPTY_FORM);
  readonly saving = signal(false);
  readonly error = signal<string | null>(null);

  onLazyLoad(event: TableLazyLoadEvent): void {
    const rows = event.rows ?? this.pageSize();
    const page = Math.floor((event.first ?? 0) / rows) + 1;
    this.load(page, rows);
  }

  applyFilter(): void {
    this.load(1, this.pageSize());
  }

  private load(page: number, limit: number): void {
    this.loading.set(true);
    this.firstRecord.set((page - 1) * limit);
    this.api.list({ patientId: this.patientIdFilter() || undefined, page, limit }).subscribe({
      next: (result) => {
        this.records.set(result.data);
        this.totalRecords.set(result.meta.total);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Could not load vaccination records.' });
      },
    });
  }

  openModal(): void {
    this.form.set({ ...EMPTY_FORM, administeredDate: todayLocal() });
    this.error.set(null);
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
    this.load(1, this.pageSize());
  }
}
