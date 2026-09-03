import { DatePipe, DecimalPipe } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { TableLazyLoadEvent, TableModule } from 'primeng/table';
import { SelectModule } from 'primeng/select';
import { ButtonModule } from 'primeng/button';
import { TagModule } from 'primeng/tag';
import { MessageService } from 'primeng/api';
import { ToastModule } from 'primeng/toast';
import { InvoicesApiService } from '../invoices-api.service.js';
import { Invoice, invoiceReference, statusSeverity } from '../invoice.model.js';
import { EntityName } from '../../directory/entity-name.js';
import { PatientsApiService } from '../../patients/patients-api.service.js';

const DEFAULT_PAGE_SIZE = 20;
const PATIENT_SEARCH_DEBOUNCE_MS = 300;

function patientLabel(p: { firstName: string; lastName: string; patientNo: string }): string {
  return `${p.firstName} ${p.lastName} (${p.patientNo})`;
}

@Component({
  imports: [DecimalPipe, DatePipe, FormsModule, RouterModule, TableModule, SelectModule, ButtonModule, TagModule, ToastModule, EntityName],
  providers: [MessageService],
  selector: 'hms-invoice-list',
  templateUrl: './invoice-list.html',
})
export class InvoiceList {
  private readonly invoicesApi = inject(InvoicesApiService);
  private readonly patientsApi = inject(PatientsApiService);
  private readonly messageService = inject(MessageService);

  readonly invoices = signal<Invoice[]>([]);
  readonly totalRecords = signal(0);
  readonly loading = signal(false);
  readonly patientIdFilter = signal('');
  readonly pageSize = signal(DEFAULT_PAGE_SIZE);
  readonly firstRecord = signal(0);

  readonly patientOptions = signal<{ label: string; value: string }[]>([]);
  readonly patientSearching = signal(false);
  private patientSearchTimer?: ReturnType<typeof setTimeout>;

  readonly reference = invoiceReference;
  readonly statusSeverity = statusSeverity;

  onLazyLoad(event: TableLazyLoadEvent): void {
    const rows = event.rows ?? this.pageSize();
    const page = Math.floor((event.first ?? 0) / rows) + 1;
    this.load(page, rows);
  }

  applyPatientFilter(): void {
    this.load(1, this.pageSize());
  }

  resetPatientFilter(): void {
    this.patientIdFilter.set('');
    this.applyPatientFilter();
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

  private load(page: number, limit: number): void {
    this.loading.set(true);
    this.firstRecord.set((page - 1) * limit);
    this.invoicesApi.list({ patientId: this.patientIdFilter() || undefined, page, limit }).subscribe({
      next: (result) => {
        this.invoices.set(result.data);
        this.totalRecords.set(result.meta.total);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Could not load invoices.' });
      },
    });
  }

  constructor() {
    this.load(1, this.pageSize());
  }
}
