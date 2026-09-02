import { Component, computed, inject, signal } from '@angular/core';
import { CommonModule, CurrencyPipe, DatePipe, DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TableLazyLoadEvent, TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { TagModule } from 'primeng/tag';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { TabsModule } from 'primeng/tabs';
import { MessageService } from 'primeng/api';
import { ToastModule } from 'primeng/toast';
import { AuthService } from '@org/auth';

import { ReportingApiService } from '../reporting-api.service.js';
import {
  EventCountRow,
  ReportingEvent,
  RevenueRow,
  REPORTING_EVENT_TYPES,
  aggregateEventCounts,
  eventTypeSeverity,
  reportingEventSubjectRef,
  sumRevenue,
  totalEventCount,
} from '../reporting.model.js';
import { EntityName } from '../../directory/entity-name.js';
import { openPdfBlobInNewTab } from '../../shared/pdf-blob.util.js';
import { downloadBlob } from '../../shared/download-blob.util.js';

const PAGE_SIZE = 20;

@Component({
  selector: 'hms-reporting-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    CurrencyPipe,
    DatePipe,
    DecimalPipe,
    FormsModule,
    TableModule,
    ButtonModule,
    TagModule,
    InputTextModule,
    SelectModule,
    TabsModule,
    EntityName,
    ToastModule,
  ],
  providers: [MessageService],
  templateUrl: './reporting-dashboard.html',
})
export class ReportingDashboard {
  private readonly reportingApi = inject(ReportingApiService);
  private readonly messageService = inject(MessageService);
  readonly auth = inject(AuthService);
  readonly subjectRef = reportingEventSubjectRef;

  readonly activeTab = signal('overview');

  readonly eventCounts = signal<EventCountRow[]>([]);
  readonly eventCountsLoading = signal(false);
  readonly revenue = signal<RevenueRow[]>([]);
  readonly revenueLoading = signal(false);

  readonly events = signal<ReportingEvent[]>([]);
  readonly eventsLoading = signal(false);
  readonly totalRecords = signal(0);
  readonly pageSize = signal(PAGE_SIZE);
  readonly firstRecord = signal(0);
  readonly eventTypeFilter = signal('');

  readonly exportingEventsCsv = signal(false);
  readonly exportingEventsPdf = signal(false);
  readonly exportingEventsExcel = signal(false);
  readonly exportingRevenueCsv = signal(false);
  readonly exportingRevenueExcel = signal(false);

  readonly eventTypes = REPORTING_EVENT_TYPES.map((type) => ({ label: type, value: type }));
  readonly eventCountsByType = computed(() => aggregateEventCounts(this.eventCounts()));
  readonly totalEvents = computed(() => totalEventCount(this.eventCounts()));
  readonly totalRevenue = computed(() => sumRevenue(this.revenue()));
  readonly severity = eventTypeSeverity;

  constructor() {
    this.loadDashboard();
    this.loadEvents(0);
  }

  private loadDashboard(): void {
    this.eventCountsLoading.set(true);
    this.revenueLoading.set(true);
    this.reportingApi.getEventCounts().subscribe({
      next: (rows) => {
        this.eventCounts.set(rows);
        this.eventCountsLoading.set(false);
      },
      error: () => this.eventCountsLoading.set(false),
    });
    this.reportingApi.getRevenue().subscribe({
      next: (rows) => {
        this.revenue.set(rows);
        this.revenueLoading.set(false);
      },
      error: () => this.revenueLoading.set(false),
    });
  }

  loadEvents(first: number): void {
    this.eventsLoading.set(true);
    const page = Math.floor(first / this.pageSize()) + 1;
    this.reportingApi
      .listEvents({
        eventType: this.eventTypeFilter() || undefined,
        page,
        limit: this.pageSize(),
      })
      .subscribe({
        next: (res) => {
          this.events.set(res.items);
          this.totalRecords.set(res.total);
          this.eventsLoading.set(false);
        },
        error: () => this.eventsLoading.set(false),
      });
  }

  onLazyLoad(event: TableLazyLoadEvent): void {
    this.firstRecord.set(event.first || 0);
    this.loadEvents(event.first || 0);
  }

  applyEventFilter(): void {
    this.firstRecord.set(0);
    this.loadEvents(0);
  }

  private exportFailed(): void {
    this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Failed to generate the export.' });
  }

  exportEventsCsv(): void {
    this.exportingEventsCsv.set(true);
    this.reportingApi.exportEventsCsv(this.eventTypeFilter() || undefined).subscribe({
      next: (blob) => {
        this.exportingEventsCsv.set(false);
        downloadBlob(blob, 'reporting-events.csv');
      },
      error: () => {
        this.exportingEventsCsv.set(false);
        this.exportFailed();
      },
    });
  }

  exportEventsPdf(): void {
    this.exportingEventsPdf.set(true);
    this.reportingApi.exportEventsPdf(this.eventTypeFilter() || undefined).subscribe({
      next: (blob) => {
        this.exportingEventsPdf.set(false);
        openPdfBlobInNewTab(blob);
      },
      error: () => {
        this.exportingEventsPdf.set(false);
        this.exportFailed();
      },
    });
  }

  exportEventsExcel(): void {
    this.exportingEventsExcel.set(true);
    this.reportingApi.exportEventsExcel(this.eventTypeFilter() || undefined).subscribe({
      next: (blob) => {
        this.exportingEventsExcel.set(false);
        downloadBlob(blob, 'reporting-events.xlsx');
      },
      error: () => {
        this.exportingEventsExcel.set(false);
        this.exportFailed();
      },
    });
  }

  exportRevenueCsv(): void {
    this.exportingRevenueCsv.set(true);
    this.reportingApi.exportRevenueCsv().subscribe({
      next: (blob) => {
        this.exportingRevenueCsv.set(false);
        downloadBlob(blob, 'revenue.csv');
      },
      error: () => {
        this.exportingRevenueCsv.set(false);
        this.exportFailed();
      },
    });
  }

  exportRevenueExcel(): void {
    this.exportingRevenueExcel.set(true);
    this.reportingApi.exportRevenueExcel().subscribe({
      next: (blob) => {
        this.exportingRevenueExcel.set(false);
        downloadBlob(blob, 'revenue.xlsx');
      },
      error: () => {
        this.exportingRevenueExcel.set(false);
        this.exportFailed();
      },
    });
  }
}
