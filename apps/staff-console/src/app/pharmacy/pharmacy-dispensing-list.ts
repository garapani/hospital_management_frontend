import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { TableLazyLoadEvent, TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { TagModule } from 'primeng/tag';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { AuthService } from '@org/auth';

import { CreatePharmacyDispensingDto, PharmacyDispensingApiService } from './pharmacy-dispensing-api.service.js';
import { DISPENSING_STATUSES, dispensingStatusSeverity, PharmacyDispensing } from './pharmacy-dispensing.model.js';

@Component({
  selector: 'hms-pharmacy-dispensing-list',
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
  ],
  templateUrl: './pharmacy-dispensing-list.html',
})
export class PharmacyDispensingList {
  private readonly pharmacyApi = inject(PharmacyDispensingApiService);
  readonly auth = inject(AuthService);

  readonly dispensings = signal<PharmacyDispensing[]>([]);
  readonly loading = signal(false);
  readonly totalRecords = signal(0);
  readonly pageSize = signal(10);
  readonly firstRecord = signal(0);

  readonly orderItemIdFilter = signal('');
  readonly statusFilter = signal('');

  readonly showCreateModal = signal(false);
  readonly createForm = signal<CreatePharmacyDispensingDto>({
    orderItemId: '',
    inventoryItemId: '',
    quantity: 1,
  });
  readonly saving = signal(false);

  readonly statuses = DISPENSING_STATUSES.map((s) => ({ label: s, value: s }));
  readonly statusSeverity = dispensingStatusSeverity;

  constructor() {
    this.load(0);
  }

  load(first: number): void {
    this.loading.set(true);
    const page = Math.floor(first / this.pageSize()) + 1;
    this.pharmacyApi
      .list({
        orderItemId: this.orderItemIdFilter() || undefined,
        status: this.statusFilter() || undefined,
        page,
        limit: this.pageSize(),
      })
      .subscribe({
        next: (res) => {
          this.dispensings.set(res.data);
          this.totalRecords.set(res.meta.total);
          this.loading.set(false);
        },
        error: () => this.loading.set(false),
      });
  }

  onLazyLoad(event: TableLazyLoadEvent): void {
    this.firstRecord.set(event.first || 0);
    this.load(event.first || 0);
  }

  applyFilters(): void {
    this.firstRecord.set(0);
    this.load(0);
  }

  openCreateModal(): void {
    this.createForm.set({ orderItemId: '', inventoryItemId: '', quantity: 1 });
    this.showCreateModal.set(true);
  }

  setQuantity(value: string): void {
    const quantity = Number(value);
    this.createForm.set({ ...this.createForm(), quantity: Number.isFinite(quantity) ? quantity : 0 });
  }

  submitCreate(): void {
    this.saving.set(true);
    this.pharmacyApi.create(this.createForm()).subscribe({
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
