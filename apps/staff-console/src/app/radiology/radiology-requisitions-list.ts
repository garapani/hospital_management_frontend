import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, ActivatedRoute } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { TableLazyLoadEvent, TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { TagModule } from 'primeng/tag';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { AuthService } from '@org/auth';

import { RadiologyApiService } from './radiology-api.service.js';
import { RADIOLOGY_STATUSES, RadiologyRequisition, radiologyStatusSeverity } from './radiology.model.js';

@Component({
  selector: 'hms-radiology-requisitions-list',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    FormsModule,
    TableModule,
    ButtonModule,
    TagModule,
    InputTextModule,
    SelectModule,
  ],
  templateUrl: './radiology-requisitions-list.html',
})
export class RadiologyRequisitionsList {
  private readonly radiologyApi = inject(RadiologyApiService);
  private readonly route = inject(ActivatedRoute);
  readonly auth = inject(AuthService);

  readonly requisitions = signal<RadiologyRequisition[]>([]);
  readonly loading = signal(false);
  readonly totalRecords = signal(0);
  readonly pageSize = signal(10);
  readonly firstRecord = signal(0);

  readonly statusFilter = signal('');
  readonly orderItemIdFilter = signal('');
  readonly imagingItemIdFilter = signal('');

  readonly statuses = RADIOLOGY_STATUSES.map((s) => ({ label: s, value: s }));
  readonly statusSeverity = radiologyStatusSeverity;

  constructor() {
    // Pre-fill the orderItemId filter from the query param (e.g. when this list is reached
    // from an order context), then fetch page 1 with whatever filters are set. `of(...)` in
    // specs and the real queryParamMap both emit synchronously, so the filter is set before
    // the initial load below — no double fetch.
    this.route.queryParamMap.subscribe((params) => {
      const orderItemId = params.get('orderItemId');
      if (orderItemId) {
        this.orderItemIdFilter.set(orderItemId);
      }
    });

    this.load(0);
  }

  load(first: number): void {
    this.loading.set(true);
    const page = Math.floor(first / this.pageSize()) + 1;
    this.radiologyApi
      .list({
        orderItemId: this.orderItemIdFilter() || undefined,
        status: this.statusFilter() || undefined,
        imagingItemId: this.imagingItemIdFilter() || undefined,
        page,
        limit: this.pageSize(),
      })
      .subscribe({
        next: (res) => {
          this.requisitions.set(res.data);
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
}
