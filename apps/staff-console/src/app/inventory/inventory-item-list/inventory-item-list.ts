import { Component, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CommonModule, DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SelectModule } from 'primeng/select';
import { TableModule } from 'primeng/table';
import { InputTextModule } from 'primeng/inputtext';
import { ButtonModule } from 'primeng/button';
import { EMPTY, Subject, catchError, switchMap } from 'rxjs';

import {
  InventoryApiService,
  InventoryItem,
  InventoryItemCategory,
  InventoryItemSubCategory,
  LowStockItem,
} from '../inventory-api.service.js';

@Component({
  selector: 'hms-inventory-item-list',
  standalone: true,
  imports: [CommonModule, FormsModule, SelectModule, TableModule, InputTextModule, ButtonModule, DecimalPipe],
  templateUrl: './inventory-item-list.html',
})
export class InventoryItemList {
  private readonly inventoryApi = inject(InventoryApiService);

  readonly categories = signal<InventoryItemCategory[]>([]);
  readonly subCategories = signal<InventoryItemSubCategory[]>([]);
  readonly items = signal<InventoryItem[]>([]);

  readonly categoriesLoading = signal(false);
  readonly subCategoriesLoading = signal(false);
  readonly itemsLoading = signal(false);

  readonly selectedCategoryId = signal('');
  readonly selectedSubCategoryId = signal('');

  readonly lowStockItems = signal<LowStockItem[]>([]);

  // switchMap cancels a still-in-flight sub-category/item lookup the moment a newer category/
  // sub-category is picked, so a slow response to an earlier pick can never land after — and
  // overwrite — a faster response to a later one. See Development-Standards.md §120/§125.
  private readonly categoryChangeTrigger = new Subject<string>();
  private readonly subCategoryChangeTrigger = new Subject<string>();

  constructor() {
    this.loadCategories();
    this.loadLowStockItems();

    this.categoryChangeTrigger
      .pipe(
        switchMap((categoryId) => {
          if (!categoryId) {
            return EMPTY;
          }
          this.subCategoriesLoading.set(true);
          return this.inventoryApi.listSubCategories(categoryId).pipe(
            catchError(() => {
              this.subCategoriesLoading.set(false);
              return EMPTY;
            }),
          );
        }),
        takeUntilDestroyed(),
      )
      .subscribe((subCategories) => {
        this.subCategories.set(subCategories);
        this.subCategoriesLoading.set(false);
      });

    this.subCategoryChangeTrigger
      .pipe(
        switchMap((subCategoryId) => {
          if (!subCategoryId) {
            return EMPTY;
          }
          this.itemsLoading.set(true);
          return this.inventoryApi.listItemsBySubCategory(subCategoryId).pipe(
            catchError(() => {
              this.itemsLoading.set(false);
              return EMPTY;
            }),
          );
        }),
        takeUntilDestroyed(),
      )
      .subscribe((items) => {
        this.items.set(items);
        this.itemsLoading.set(false);
      });
  }

  loadCategories(): void {
    this.categoriesLoading.set(true);
    this.inventoryApi.listCategories().subscribe({
      next: (categories) => {
        this.categories.set(categories);
        this.categoriesLoading.set(false);
      },
      error: () => this.categoriesLoading.set(false),
    });
  }

  loadLowStockItems(): void {
    // Best-effort: a failed low-stock lookup shouldn't block the rest of the screen, so it just
    // leaves the banner hidden rather than surfacing an error of its own.
    this.inventoryApi.listLowStockItems().subscribe({
      next: (items) => this.lowStockItems.set(items),
      error: () => this.lowStockItems.set([]),
    });
  }

  onCategoryChange(categoryId: string): void {
    this.selectedCategoryId.set(categoryId);
    // Reset the dependent selects — sub-categories and items are scoped to the new category.
    this.subCategories.set([]);
    this.items.set([]);
    this.selectedSubCategoryId.set('');
    this.categoryChangeTrigger.next(categoryId);
  }

  onSubCategoryChange(subCategoryId: string): void {
    this.selectedSubCategoryId.set(subCategoryId);
    this.items.set([]);
    this.subCategoryChangeTrigger.next(subCategoryId);
  }
}
