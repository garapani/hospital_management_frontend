import { CommonModule } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { TableLazyLoadEvent, TableModule } from 'primeng/table';
import { InputTextModule } from 'primeng/inputtext';
import { ButtonModule } from 'primeng/button';
import { TagModule } from 'primeng/tag';
import { InvoicesApiService } from '../invoices-api.service.js';
import { Invoice, InvoiceStatus } from '../invoice.model.js';

const DEFAULT_PAGE_SIZE = 20;

const STATUS_SEVERITY: Record<InvoiceStatus, 'success' | 'warn' | 'danger' | 'info'> = {
  Paid: 'success',
  PartiallyPaid: 'warn',
  Unpaid: 'info',
  Cancelled: 'danger',
};

@Component({
  imports: [CommonModule, FormsModule, RouterModule, TableModule, InputTextModule, ButtonModule, TagModule],
  selector: 'hms-invoice-list',
  templateUrl: './invoice-list.html',
})
export class InvoiceList {
  private readonly invoicesApi = inject(InvoicesApiService);

  readonly invoices = signal<Invoice[]>([]);
  readonly totalRecords = signal(0);
  readonly loading = signal(false);
  readonly patientIdFilter = signal('');
  readonly pageSize = signal(DEFAULT_PAGE_SIZE);
  readonly firstRecord = signal(0);

  statusSeverity(status: InvoiceStatus) {
    return STATUS_SEVERITY[status];
  }

  reference(invoice: Invoice): string {
    return `${invoice.financialYear}-${invoice.invoiceNumber}`;
  }

  onLazyLoad(event: Partial<TableLazyLoadEvent>): void {
    const rows = event.rows ?? this.pageSize();
    const page = Math.floor((event.first ?? 0) / rows) + 1;
    this.load(page, rows);
  }

  applyPatientFilter(): void {
    this.load(1, this.pageSize());
  }

  private load(page: number, limit: number): void {
    this.loading.set(true);
    this.firstRecord.set((page - 1) * limit);
    this.invoicesApi.list({ patientId: this.patientIdFilter() || undefined, page, limit }).subscribe({
      next: (result) => {
        this.invoices.set(result.data);
        this.totalRecords.set(result.total);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  constructor() {
    this.load(1, this.pageSize());
  }
}
