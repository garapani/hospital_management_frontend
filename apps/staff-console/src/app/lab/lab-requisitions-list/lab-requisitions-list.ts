import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { TableLazyLoadEvent, TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { TagModule } from 'primeng/tag';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { MessageService } from 'primeng/api';
import { ToastModule } from 'primeng/toast';
import { AuthService } from '@org/auth';

import { LabApiService, LabRequisition, LabRequisitionStatus } from '../lab-api.service.js';
import { labRequisitionStatusSeverity } from '../lab.model.js';
import { EntityName } from '../../directory/entity-name.js';

const STATUS_OPTIONS: { label: string; value: LabRequisitionStatus | null }[] = [
  { label: 'All', value: null },
  { label: 'Pending', value: 'Pending' },
  { label: 'Sample Collected', value: 'SampleCollected' },
  { label: 'Results Entered', value: 'ResultsEntered' },
  { label: 'Verified', value: 'Verified' },
  { label: 'Cancelled', value: 'Cancelled' },
];

@Component({
  selector: 'hms-lab-requisitions-list',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule, TableModule, ButtonModule, TagModule, InputTextModule, SelectModule, ToastModule, EntityName],
  providers: [MessageService],
  templateUrl: './lab-requisitions-list.html',
})
export class LabRequisitionsList {
  private readonly labApi = inject(LabApiService);
  private readonly messageService = inject(MessageService);
  readonly auth = inject(AuthService);

  readonly requisitions = signal<LabRequisition[]>([]);
  readonly loading = signal(false);
  readonly totalRecords = signal(0);
  readonly pageSize = signal(10);
  readonly firstRecord = signal(0);

  readonly orderItemIdFilter = signal('');
  readonly statusFilter = signal<LabRequisitionStatus | null>('Pending');
  readonly statusOptions = STATUS_OPTIONS;

  readonly statusSeverity = labRequisitionStatusSeverity;

  constructor() {
    this.load(0);
  }

  load(first: number): void {
    this.loading.set(true);
    const page = Math.floor(first / this.pageSize()) + 1;
    this.labApi
      .listRequisitions({
        orderItemId: this.orderItemIdFilter().trim() || undefined,
        status: this.statusFilter() ?? undefined,
        page,
        limit: this.pageSize(),
      })
      .subscribe({
        next: (res) => {
          this.requisitions.set(res.data);
          this.totalRecords.set(res.meta.total);
          this.loading.set(false);
        },
        error: () => {
          this.loading.set(false);
          this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Could not load lab requisitions.' });
        },
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
