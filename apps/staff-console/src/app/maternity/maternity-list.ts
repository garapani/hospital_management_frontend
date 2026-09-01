import { DatePipe } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
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
import { ApiError } from '@org/api-client';
import { AuthService } from '@org/auth';
import { MaternityApiService } from './maternity-api.service.js';
import { CreateMaternityRecordDto, DELIVERY_TYPES, DeliveryType, MaternityRecord, RecordDeliveryDto } from './maternity.model.js';
import { todayLocal } from '../shared/date.util.js';
import { EntityName } from '../directory/entity-name.js';

const DEFAULT_PAGE_SIZE = 20;
const EMPTY_CREATE_FORM: CreateMaternityRecordDto = { admissionId: '', patientId: '' };
const EMPTY_DELIVERY_FORM: RecordDeliveryDto = { deliveryDate: '', deliveryType: 'Normal', babyCount: 1 };

@Component({
  imports: [DatePipe, RouterModule, FormsModule, TableModule, ButtonModule, TagModule, DialogModule, InputTextModule, InputNumberModule, SelectModule, EntityName],
  selector: 'hms-maternity-list',
  templateUrl: './maternity-list.html',
})
export class MaternityList {
  private readonly api = inject(MaternityApiService);
  private readonly messageService = inject(MessageService);
  private readonly confirmationService = inject(ConfirmationService);
  readonly auth = inject(AuthService);
  readonly canManage = this.auth.hasPermission('maternity.manage');

  readonly deliveryTypes: DeliveryType[] = DELIVERY_TYPES;

  readonly records = signal<MaternityRecord[]>([]);
  readonly totalRecords = signal(0);
  readonly loading = signal(false);
  readonly pageSize = signal(DEFAULT_PAGE_SIZE);
  readonly firstRecord = signal(0);
  readonly patientIdFilter = signal('');

  readonly showCreateModal = signal(false);
  readonly createForm = signal<CreateMaternityRecordDto>(EMPTY_CREATE_FORM);
  readonly createSaving = signal(false);
  readonly createError = signal<string | null>(null);

  readonly showDeliveryModal = signal(false);
  readonly deliveryRecordId = signal<string | null>(null);
  readonly deliveryForm = signal<RecordDeliveryDto>(EMPTY_DELIVERY_FORM);
  readonly deliverySaving = signal(false);
  readonly deliveryError = signal<string | null>(null);

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
        this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Could not load maternity records.' });
      },
    });
  }

  openCreateModal(): void {
    this.createForm.set(EMPTY_CREATE_FORM);
    this.createError.set(null);
    this.showCreateModal.set(true);
  }

  submitCreate(): void {
    this.createSaving.set(true);
    this.createError.set(null);
    this.api.create(this.createForm()).subscribe({
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
    this.load(1, this.pageSize());
  }
}
