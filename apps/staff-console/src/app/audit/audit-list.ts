import { Component, inject, signal } from '@angular/core';
import { DatePipe, JsonPipe } from '@angular/common';
import { TableLazyLoadEvent, TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { TagModule } from 'primeng/tag';
import { DialogModule } from 'primeng/dialog';
import { FormsModule } from '@angular/forms';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { MessageService } from 'primeng/api';
import { AuditApiService } from './audit-api.service.js';
import { AuditRecord } from './audit.model.js';

@Component({
  imports: [
    DatePipe,
    JsonPipe,
    TableModule,
    ButtonModule,
    TagModule,
    DialogModule,
    FormsModule,
    InputTextModule,
    SelectModule,
  ],
  selector: 'hms-audit-list',
  templateUrl: './audit-list.html',
})
export class AuditList {
  private readonly auditApi = inject(AuditApiService);
  private readonly messageService = inject(MessageService);

  readonly records = signal<AuditRecord[]>([]);
  readonly totalRecords = signal(0);
  readonly loading = signal(false);

  // Filters (Default to last 24 hours)
  readonly filters = signal({
    startDate: new Date(Date.now() - 24 * 60 * 60 * 1000)
      .toISOString()
      .slice(0, 16),
    endDate: new Date().toISOString().slice(0, 16),
    tableName: '',
    action: '' as 'create' | 'update' | 'delete' | '',
    correlationId: '',
  });

  // Action options
  readonly actionOptions = [
    { label: 'All Actions', value: '' },
    { label: 'Create', value: 'create' },
    { label: 'Update', value: 'update' },
    { label: 'Delete', value: 'delete' },
  ];

  readonly pageSize = signal(20);
  readonly firstRecord = signal(0);

  // Detail Modal
  readonly showDetailModal = signal(false);
  readonly selectedRecord = signal<AuditRecord | null>(null);

  onLazyLoad(event: TableLazyLoadEvent): void {
    const rows = event.rows ?? this.pageSize();
    const page = Math.floor((event.first ?? 0) / rows) + 1;
    this.pageSize.set(rows);
    this.load(page, rows);
  }

  applyFilters(): void {
    this.firstRecord.set(0); // Reset to first page
    this.load(1, this.pageSize());
  }

  private load(page: number, limit: number): void {
    const f = this.filters();
    // Enforce bounded date range per spec if they deleted it somehow
    if (!f.startDate || !f.endDate) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Date range required',
        detail: 'A bounded date range is required for audit trail queries.',
      });
      return;
    }

    this.loading.set(true);
    this.auditApi
      .search({
        page,
        limit,
        startDate: new Date(f.startDate).toISOString(),
        endDate: new Date(f.endDate).toISOString(),
        tableName: f.tableName || undefined,
        action: f.action || undefined,
        correlationId: f.correlationId || undefined,
      })
      .subscribe({
        next: (result) => {
          this.records.set(result.data);
          this.totalRecords.set(result.meta.total);
          this.loading.set(false);
        },
        error: () => {
          this.loading.set(false);
          this.messageService.add({
            severity: 'error',
            summary: 'Search failed',
            detail: 'Could not load audit records. Please try again.',
          });
        },
      });
  }

  viewDetail(record: AuditRecord): void {
    this.selectedRecord.set(record);
    this.showDetailModal.set(true);
  }

  viewRelatedEvents(): void {
    const record = this.selectedRecord();
    if (record?.correlationId) {
      this.filters.set({
        ...this.filters(),
        correlationId: record.correlationId,
      });
      this.showDetailModal.set(false);
      this.applyFilters();
    }
  }
}
