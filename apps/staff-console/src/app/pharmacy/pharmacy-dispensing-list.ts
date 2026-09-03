import { Component, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { TableLazyLoadEvent, TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { TagModule } from 'primeng/tag';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { MessageService } from 'primeng/api';
import { ToastModule } from 'primeng/toast';
import { AuthService } from '@org/auth';
import { EMPTY, Subject, catchError, forkJoin, of, switchMap } from 'rxjs';

import { CreatePharmacyDispensingDto, PharmacyDispensingApiService } from './pharmacy-dispensing-api.service.js';
import { DISPENSING_STATUSES, dispensingStatusSeverity, PendingPharmacyItem, PharmacyDispensing } from './pharmacy-dispensing.model.js';
import { InventoryApiService, InventoryItem, InventoryItemCategory, InventoryItemSubCategory } from '../inventory/inventory-api.service.js';
import { DirectoryResolverService } from '../directory/directory-resolver.service.js';

@Component({
  selector: 'hms-pharmacy-dispensing-list',
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
    ToastModule,
  ],
  providers: [MessageService],
  templateUrl: './pharmacy-dispensing-list.html',
})
export class PharmacyDispensingList {
  private readonly pharmacyApi = inject(PharmacyDispensingApiService);
  private readonly inventoryApi = inject(InventoryApiService);
  private readonly directoryResolver = inject(DirectoryResolverService);
  private readonly messageService = inject(MessageService);
  readonly auth = inject(AuthService);

  readonly dispensings = signal<PharmacyDispensing[]>([]);
  readonly loading = signal(false);
  readonly totalRecords = signal(0);
  readonly pageSize = signal(10);
  readonly firstRecord = signal(0);

  readonly orderItemIdFilter = signal('');
  readonly statusFilter = signal('');

  readonly showCreateModal = signal(false);
  readonly createForm = signal<CreatePharmacyDispensingDto>({
    orderItemId: '',
    inventoryItemId: '',
    quantity: 1,
  });
  readonly saving = signal(false);

  readonly statuses = DISPENSING_STATUSES.map((s) => ({ label: s, value: s }));
  readonly statusSeverity = dispensingStatusSeverity;

  // Add Dispensing modal's Order Item picker — a Pharmacist has no patient search access, so this
  // worklist (Pharmacy order items awaiting dispensing, across all patients) is the only way they
  // can find an orderItemId to dispense against (Development-Standards.md, Order List / Pending
  // Pharmacy Items pattern).
  readonly orderItemOptions = signal<{ label: string; value: string }[]>([]);
  readonly orderItemsLoading = signal(false);

  // Inventory Item picker — cascading Category -> Sub-category -> Item, same shape as
  // purchase-order-list's line-item picker (no free-text item search exists in this codebase).
  readonly dialogCategories = signal<InventoryItemCategory[]>([]);
  readonly dialogSubCategories = signal<InventoryItemSubCategory[]>([]);
  readonly dialogInventoryItems = signal<InventoryItem[]>([]);
  readonly dialogInventoryItemsLoading = signal(false);
  readonly categoryId = signal('');
  readonly subCategoryId = signal('');

  // switchMap cancels a still-in-flight sub-category/item lookup the moment a newer category/
  // sub-category is picked. See Development-Standards.md §120/§125.
  private readonly categoryChangeTrigger = new Subject<string>();
  private readonly subCategoryChangeTrigger = new Subject<string>();

  constructor() {
    this.load(0);

    this.categoryChangeTrigger
      .pipe(
        switchMap((categoryId) => {
          if (!categoryId) {
            return EMPTY;
          }
          return this.inventoryApi.listSubCategories(categoryId).pipe(catchError(() => EMPTY));
        }),
        takeUntilDestroyed(),
      )
      .subscribe((subCategories) => this.dialogSubCategories.set(subCategories));

    this.subCategoryChangeTrigger
      .pipe(
        switchMap((subCategoryId) => {
          if (!subCategoryId) {
            return EMPTY;
          }
          this.dialogInventoryItemsLoading.set(true);
          return this.inventoryApi.listItemsBySubCategory(subCategoryId).pipe(
            catchError(() => {
              this.dialogInventoryItemsLoading.set(false);
              return EMPTY;
            }),
          );
        }),
        takeUntilDestroyed(),
      )
      .subscribe((items) => {
        this.dialogInventoryItems.set(items);
        this.dialogInventoryItemsLoading.set(false);
      });
  }

  load(first: number): void {
    this.loading.set(true);
    const page = Math.floor(first / this.pageSize()) + 1;
    this.pharmacyApi
      .list({
        orderItemId: this.orderItemIdFilter() || undefined,
        status: this.statusFilter() || undefined,
        page,
        limit: this.pageSize(),
      })
      .subscribe({
        next: (res) => {
          this.dispensings.set(res.data);
          this.totalRecords.set(res.meta.total);
          this.loading.set(false);
        },
        error: () => {
          this.loading.set(false);
          this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Could not load pharmacy dispensings.' });
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

  resetFilters(): void {
    this.orderItemIdFilter.set('');
    this.statusFilter.set('');
    this.applyFilters();
  }

  openCreateModal(): void {
    this.createForm.set({ orderItemId: '', inventoryItemId: '', quantity: 1 });
    this.categoryId.set('');
    this.subCategoryId.set('');
    this.dialogSubCategories.set([]);
    this.dialogInventoryItems.set([]);
    this.showCreateModal.set(true);
    this.loadOrderItemOptions();
    this.loadDialogCategories();
  }

  private loadOrderItemOptions(): void {
    this.orderItemsLoading.set(true);
    this.pharmacyApi.listPendingItems({ status: 'Pending', limit: 50 }).subscribe({
      next: (res) => this.resolveOrderItemOptions(res.data),
      error: () => {
        this.orderItemsLoading.set(false);
        this.orderItemOptions.set([]);
      },
    });
  }

  private resolveOrderItemOptions(items: PendingPharmacyItem[]): void {
    if (items.length === 0) {
      this.orderItemOptions.set([]);
      this.orderItemsLoading.set(false);
      return;
    }
    forkJoin(
      items.map((item) =>
        item.patientId
          ? this.directoryResolver.resolve('patient', item.patientId)
          : of(null),
      ),
    ).subscribe((names) => {
      this.orderItemOptions.set(
        items.map((item, i) => ({
          label: `${names[i] ?? 'Unknown patient'} — ${item.itemDescription}`,
          value: item.id,
        })),
      );
      this.orderItemsLoading.set(false);
    });
  }

  private loadDialogCategories(): void {
    this.inventoryApi.listCategories().subscribe({
      next: (categories) => this.dialogCategories.set(categories),
      error: () => this.dialogCategories.set([]),
    });
  }

  onOrderItemChange(orderItemId: string | null): void {
    this.createForm.set({ ...this.createForm(), orderItemId: orderItemId ?? '' });
  }

  onCategoryChange(categoryId: string | null): void {
    this.categoryId.set(categoryId ?? '');
    this.subCategoryId.set('');
    this.createForm.set({ ...this.createForm(), inventoryItemId: '' });
    this.dialogSubCategories.set([]);
    this.dialogInventoryItems.set([]);
    this.categoryChangeTrigger.next(categoryId ?? '');
  }

  onSubCategoryChange(subCategoryId: string | null): void {
    this.subCategoryId.set(subCategoryId ?? '');
    this.createForm.set({ ...this.createForm(), inventoryItemId: '' });
    this.dialogInventoryItems.set([]);
    this.subCategoryChangeTrigger.next(subCategoryId ?? '');
  }

  onInventoryItemChange(inventoryItemId: string | null): void {
    this.createForm.set({ ...this.createForm(), inventoryItemId: inventoryItemId ?? '' });
  }

  setQuantity(value: string): void {
    const quantity = Number(value);
    this.createForm.set({ ...this.createForm(), quantity: Number.isFinite(quantity) ? quantity : 0 });
  }

  submitCreate(): void {
    this.saving.set(true);
    this.pharmacyApi.create(this.createForm()).subscribe({
      next: () => {
        this.saving.set(false);
        this.showCreateModal.set(false);
        this.firstRecord.set(0);
        this.load(0);
      },
      error: () => {
        this.saving.set(false);
        this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Failed to create the dispensing.' });
      },
    });
  }
}
