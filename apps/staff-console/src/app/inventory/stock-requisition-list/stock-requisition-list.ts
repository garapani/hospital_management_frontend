import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { TableLazyLoadEvent, TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { TagModule } from 'primeng/tag';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { AuthService } from '@org/auth';

import { InventoryApiService, StockRequisition } from '../inventory-api.service.js';
import { requisitionStatusSeverity } from '../inventory.model.js';
import { MasterDataApiService } from '../../master-data/master-data-api.service.js';
import { Department } from '../../master-data/master-data.model.js';

@Component({
  selector: 'hms-stock-requisition-list',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule, TableModule, ButtonModule, TagModule, InputTextModule, SelectModule],
  templateUrl: './stock-requisition-list.html',
})
export class StockRequisitionList {
  private readonly inventoryApi = inject(InventoryApiService);
  private readonly masterDataApi = inject(MasterDataApiService);
  readonly auth = inject(AuthService);

  readonly requisitions = signal<StockRequisition[]>([]);
  readonly loading = signal(false);
  readonly totalRecords = signal(0);
  readonly pageSize = signal(10);
  readonly firstRecord = signal(0);

  readonly departments = signal<Department[]>([]);
  readonly departmentFilter = signal('');
  readonly hasSearched = signal(false);

  readonly statusSeverity = requisitionStatusSeverity;

  constructor() {
    this.loadDepartments();
  }

  loadDepartments(): void {
    this.masterDataApi.listDepartments().subscribe({
      next: (departments) => this.departments.set(departments),
      error: () => this.departments.set([]),
    });
  }

  /** The list endpoint returns only departmentId — resolve a display name from the loaded catalog. */
  departmentName(departmentId: string): string {
    return this.departments().find((d) => d.id === departmentId)?.departmentName ?? departmentId;
  }

  load(first: number): void {
    const departmentId = this.departmentFilter();
    if (!departmentId) {
      // The backend rejects GET /inventory/requisitions without departmentId (400) — never call
      // it empty; clear the table instead and wait for a valid department filter.
      this.requisitions.set([]);
      this.totalRecords.set(0);
      this.firstRecord.set(0);
      this.loading.set(false);
      return;
    }

    this.loading.set(true);
    const page = Math.floor(first / this.pageSize()) + 1;
    this.inventoryApi
      .listRequisitions({ departmentId, page, limit: this.pageSize() })
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

  onDepartmentFilterChange(departmentId: string): void {
    this.departmentFilter.set(departmentId);
    this.hasSearched.set(departmentId.length > 0);
    this.firstRecord.set(0);
    this.load(0);
  }
}
