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

import {
  InventoryApiService,
  InventoryItem,
  InventoryItemCategory,
  InventoryItemSubCategory,
  StockRequisition,
} from '../inventory-api.service.js';
import { requisitionStatusSeverity } from '../inventory.model.js';
import { MasterDataApiService } from '../../master-data/master-data-api.service.js';
import { Department } from '../../master-data/master-data.model.js';

/** A draft requisition line in the create dialog (itemName only for display). */
interface CreateLine {
  itemId: string;
  itemName: string;
  requestedQuantity: number;
}

@Component({
  selector: 'hms-stock-requisition-list',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule, TableModule, ButtonModule, TagModule, DialogModule, InputTextModule, SelectModule],
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

  // Create dialog state.
  readonly showCreateModal = signal(false);
  readonly saving = signal(false);
  readonly createDepartmentId = signal('');
  readonly createNotes = signal('');
  readonly dialogCategories = signal<InventoryItemCategory[]>([]);
  readonly dialogSubCategories = signal<InventoryItemSubCategory[]>([]);
  readonly dialogItems = signal<InventoryItem[]>([]);
  readonly dialogItemsLoading = signal(false);
  readonly lineCategoryId = signal('');
  readonly lineSubCategoryId = signal('');
  readonly lineItemId = signal('');
  readonly lineQuantity = signal(1);
  readonly createLines = signal<CreateLine[]>([]);

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

  onDepartmentFilterChange(departmentId: string | null): void {
    this.departmentFilter.set(departmentId ?? '');
    this.hasSearched.set(!!departmentId);
    this.firstRecord.set(0);
    this.load(0);
  }

  openCreateModal(): void {
    this.createDepartmentId.set(this.departmentFilter());
    this.createNotes.set('');
    this.createLines.set([]);
    this.lineCategoryId.set('');
    this.lineSubCategoryId.set('');
    this.lineItemId.set('');
    this.lineQuantity.set(1);
    this.dialogSubCategories.set([]);
    this.dialogItems.set([]);
    this.showCreateModal.set(true);
    this.loadDialogCategories();
  }

  private loadDialogCategories(): void {
    this.inventoryApi.listCategories().subscribe({
      next: (categories) => this.dialogCategories.set(categories),
      error: () => this.dialogCategories.set([]),
    });
  }

  onLineCategoryChange(categoryId: string | null): void {
    this.lineCategoryId.set(categoryId ?? '');
    this.lineSubCategoryId.set('');
    this.lineItemId.set('');
    this.dialogSubCategories.set([]);
    this.dialogItems.set([]);
    if (!categoryId) {
      return;
    }
    this.inventoryApi.listSubCategories(categoryId).subscribe({
      next: (subCategories) => this.dialogSubCategories.set(subCategories),
      error: () => this.dialogSubCategories.set([]),
    });
  }

  onLineSubCategoryChange(subCategoryId: string | null): void {
    this.lineSubCategoryId.set(subCategoryId ?? '');
    this.lineItemId.set('');
    this.dialogItems.set([]);
    if (!subCategoryId) {
      return;
    }
    this.dialogItemsLoading.set(true);
    this.inventoryApi.listItemsBySubCategory(subCategoryId).subscribe({
      next: (items) => {
        this.dialogItems.set(items);
        this.dialogItemsLoading.set(false);
      },
      error: () => this.dialogItemsLoading.set(false),
    });
  }

  onLineItemChange(itemId: string | null): void {
    this.lineItemId.set(itemId ?? '');
  }

  setLineQuantity(value: string): void {
    const quantity = Number(value);
    this.lineQuantity.set(Number.isFinite(quantity) ? quantity : 0);
  }

  addLine(): void {
    const item = this.dialogItems().find((i) => i.id === this.lineItemId());
    if (!item || this.lineQuantity() <= 0) {
      return;
    }
    this.createLines.set([
      ...this.createLines(),
      { itemId: item.id, itemName: item.name, requestedQuantity: this.lineQuantity() },
    ]);
    this.lineSubCategoryId.set('');
    this.lineItemId.set('');
    this.lineQuantity.set(1);
    this.dialogSubCategories.set([]);
    this.dialogItems.set([]);
  }

  removeLine(index: number): void {
    this.createLines.set(this.createLines().filter((_, i) => i !== index));
  }

  canAddLine(): boolean {
    return this.lineItemId() !== '' && this.lineQuantity() > 0;
  }

  isCreateValid(): boolean {
    return (
      this.createDepartmentId() !== '' &&
      this.createLines().length > 0 &&
      this.createLines().every((l) => l.itemId !== '' && l.requestedQuantity > 0)
    );
  }

  submitCreate(): void {
    if (!this.isCreateValid()) {
      return;
    }
    this.saving.set(true);
    this.inventoryApi
      .createRequisition({
        departmentId: this.createDepartmentId(),
        notes: this.createNotes().trim() || undefined,
        items: this.createLines().map((l) => ({ itemId: l.itemId, requestedQuantity: l.requestedQuantity })),
      })
      .subscribe({
        next: () => {
          this.saving.set(false);
          this.showCreateModal.set(false);
          this.firstRecord.set(0);
          this.load(0);
        },
        error: () => this.saving.set(false),
      });
  }
}
