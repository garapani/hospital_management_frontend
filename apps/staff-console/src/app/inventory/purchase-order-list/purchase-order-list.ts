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
  InventoryVendor,
  PurchaseOrder,
} from '../inventory-api.service.js';
import { purchaseOrderStatusSeverity } from '../inventory.model.js';

/** A draft purchase order line in the create dialog (itemName only for display). */
interface CreateLine {
  subCategoryId: string;
  itemId: string;
  itemName: string;
  orderedQuantity: number;
  unitCost: number;
}

@Component({
  selector: 'hms-purchase-order-list',
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
  templateUrl: './purchase-order-list.html',
})
export class PurchaseOrderList {
  private readonly inventoryApi = inject(InventoryApiService);
  readonly auth = inject(AuthService);

  readonly purchaseOrders = signal<PurchaseOrder[]>([]);
  readonly loading = signal(false);
  readonly totalRecords = signal(0);
  readonly pageSize = signal(10);
  readonly firstRecord = signal(0);

  readonly vendors = signal<InventoryVendor[]>([]);
  readonly vendorsLoading = signal(false);
  readonly vendorFilter = signal('');
  readonly hasSearched = signal(false);

  // Create dialog state.
  readonly showCreateModal = signal(false);
  readonly saving = signal(false);
  readonly createVendorId = signal('');
  readonly createNotes = signal('');
  readonly dialogCategories = signal<InventoryItemCategory[]>([]);
  readonly dialogSubCategories = signal<InventoryItemSubCategory[]>([]);
  readonly dialogItems = signal<InventoryItem[]>([]);
  readonly dialogItemsLoading = signal(false);
  readonly lineCategoryId = signal('');
  readonly lineSubCategoryId = signal('');
  readonly lineItemId = signal('');
  readonly lineQuantity = signal(1);
  readonly lineUnitCost = signal(0);
  readonly createLines = signal<CreateLine[]>([]);

  readonly statusSeverity = purchaseOrderStatusSeverity;

  constructor() {
    this.loadVendors();
  }

  vendorName(vendorId: string): string {
    return this.vendors().find((v) => v.id === vendorId)?.name ?? vendorId;
  }

  loadVendors(): void {
    this.vendorsLoading.set(true);
    this.inventoryApi.listVendors().subscribe({
      next: (vendors) => {
        this.vendors.set(vendors);
        this.vendorsLoading.set(false);
      },
      error: () => this.vendorsLoading.set(false),
    });
  }

  load(first: number): void {
    const vendorId = this.vendorFilter();
    if (!vendorId) {
      // The backend rejects GET /inventory/purchase-orders without vendorId (400) — never call
      // it empty; clear the table instead and wait for a valid vendor filter.
      this.purchaseOrders.set([]);
      this.totalRecords.set(0);
      this.firstRecord.set(0);
      this.loading.set(false);
      return;
    }

    this.loading.set(true);
    const page = Math.floor(first / this.pageSize()) + 1;
    this.inventoryApi
      .listPurchaseOrders({ vendorId, page, limit: this.pageSize() })
      .subscribe({
        next: (res) => {
          this.purchaseOrders.set(res.data);
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

  onVendorFilterChange(vendorId: string | null): void {
    this.vendorFilter.set(vendorId ?? '');
    this.hasSearched.set(!!vendorId);
    this.firstRecord.set(0);
    this.load(0);
  }

  openCreateModal(): void {
    this.createVendorId.set(this.vendorFilter());
    this.createNotes.set('');
    this.createLines.set([]);
    this.lineCategoryId.set('');
    this.lineSubCategoryId.set('');
    this.lineItemId.set('');
    this.lineQuantity.set(1);
    this.lineUnitCost.set(0);
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

  setLineUnitCost(value: string): void {
    const cost = Number(value);
    this.lineUnitCost.set(Number.isFinite(cost) ? cost : 0);
  }

  addLine(): void {
    const item = this.dialogItems().find((i) => i.id === this.lineItemId());
    if (!item || this.lineQuantity() <= 0) {
      return;
    }
    this.createLines.set([
      ...this.createLines(),
      {
        subCategoryId: this.lineSubCategoryId(),
        itemId: item.id,
        itemName: item.name,
        orderedQuantity: this.lineQuantity(),
        unitCost: this.lineUnitCost(),
      },
    ]);
    this.lineSubCategoryId.set('');
    this.lineItemId.set('');
    this.lineQuantity.set(1);
    this.lineUnitCost.set(0);
    this.dialogSubCategories.set([]);
    this.dialogItems.set([]);
  }

  removeLine(index: number): void {
    this.createLines.set(this.createLines().filter((_, i) => i !== index));
  }

  canAddLine(): boolean {
    return this.lineSubCategoryId() !== '' && this.lineItemId() !== '' && this.lineQuantity() > 0;
  }

  isCreateValid(): boolean {
    return (
      this.createVendorId() !== '' &&
      this.createLines().length > 0 &&
      this.createLines().every((l) => l.itemId !== '' && l.orderedQuantity > 0 && l.unitCost >= 0)
    );
  }

  submitCreate(): void {
    if (!this.isCreateValid()) {
      return;
    }
    this.saving.set(true);
    this.inventoryApi
      .createPurchaseOrder({
        vendorId: this.createVendorId(),
        notes: this.createNotes().trim() || undefined,
        items: this.createLines().map((l) => ({
          itemId: l.itemId,
          orderedQuantity: l.orderedQuantity,
          unitCost: l.unitCost,
        })),
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
