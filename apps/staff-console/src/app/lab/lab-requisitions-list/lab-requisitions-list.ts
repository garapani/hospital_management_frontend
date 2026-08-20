import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { TableLazyLoadEvent, TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { TagModule } from 'primeng/tag';
import { InputTextModule } from 'primeng/inputtext';
import { AuthService } from '@org/auth';

import { LabApiService, LabRequisition } from '../lab-api.service.js';
import { labRequisitionStatusSeverity } from '../lab.model.js';

@Component({
  selector: 'hms-lab-requisitions-list',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule, TableModule, ButtonModule, TagModule, InputTextModule],
  templateUrl: './lab-requisitions-list.html',
})
export class LabRequisitionsList {
  private readonly labApi = inject(LabApiService);
  readonly auth = inject(AuthService);

  readonly requisitions = signal<LabRequisition[]>([]);
  readonly loading = signal(false);
  readonly totalRecords = signal(0);
  readonly pageSize = signal(10);
  readonly firstRecord = signal(0);

  readonly orderItemIdFilter = signal('');
  readonly hasSearched = signal(false);

  readonly statusSeverity = labRequisitionStatusSeverity;

  load(first: number): void {
    const orderItemId = this.orderItemIdFilter().trim();
    if (!orderItemId) {
      // The backend rejects GET /lab/requisitions without orderItemId (400), so never call
      // it empty — clear the table instead and wait for a valid filter.
      this.requisitions.set([]);
      this.totalRecords.set(0);
      this.firstRecord.set(0);
      this.loading.set(false);
      return;
    }

    this.loading.set(true);
    const page = Math.floor(first / this.pageSize()) + 1;
    this.labApi
      .listRequisitions({ orderItemId, page, limit: this.pageSize() })
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
    this.hasSearched.set(this.orderItemIdFilter().trim().length > 0);
    this.load(0);
  }
}
