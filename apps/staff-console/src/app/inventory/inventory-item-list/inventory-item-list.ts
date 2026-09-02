import { Component, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CommonModule, DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SelectModule } from 'primeng/select';
import { TableModule } from 'primeng/table';
import { InputTextModule } from 'primeng/inputtext';
import { InputNumberModule } from 'primeng/inputnumber';
import { CheckboxModule } from 'primeng/checkbox';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { EMPTY, Subject, catchError, switchMap } from 'rxjs';
import { ApiError } from '@org/api-client';
import { AuthService } from '@org/auth';

import {
  InventoryApiService,
  InventoryItem,
  InventoryItemCategory,
  InventoryItemSubCategory,
  LowStockItem,
} from '../inventory-api.service.js';

interface NewItemForm {
  name: string;
  code: string;
  unitOfMeasure: string;
  reorderLevel: number | null;
  minimumStock: number | null;
  salePrice: number | null;
}

const EMPTY_ITEM_FORM: NewItemForm = {
  name: '',
  code: '',
  unitOfMeasure: '',
  reorderLevel: null,
  minimumStock: null,
  salePrice: null,
};

@Component({
  selector: 'hms-inventory-item-list',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    SelectModule,
    TableModule,
    InputTextModule,
    InputNumberModule,
    CheckboxModule,
    ButtonModule,
    DialogModule,
    DecimalPipe,
  ],
  templateUrl: './inventory-item-list.html',
})
export class InventoryItemList {
  private readonly inventoryApi = inject(InventoryApiService);
  readonly auth = inject(AuthService);
  readonly canManageCatalog = this.auth.hasPermission('inventory.catalog.manage');

  readonly categories = signal<InventoryItemCategory[]>([]);
  readonly subCategories = signal<InventoryItemSubCategory[]>([]);
  readonly items = signal<InventoryItem[]>([]);

  readonly categoriesLoading = signal(false);
  readonly subCategoriesLoading = signal(false);
  readonly itemsLoading = signal(false);

  readonly selectedCategoryId = signal('');
  readonly selectedSubCategoryId = signal('');

  readonly lowStockItems = signal<LowStockItem[]>([]);

  readonly showAddCategoryModal = signal(false);
  readonly categoryName = signal('');
  readonly categorySaving = signal(false);
  readonly categoryError = signal<string | null>(null);

  readonly showAddSubCategoryModal = signal(false);
  readonly subCategoryName = signal('');
  readonly subCategoryIsConsumable = signal(false);
  readonly subCategorySaving = signal(false);
  readonly subCategoryError = signal<string | null>(null);

  readonly showAddItemModal = signal(false);
  readonly itemForm = signal<NewItemForm>(EMPTY_ITEM_FORM);
  readonly itemSaving = signal(false);
  readonly itemError = signal<string | null>(null);

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

  openAddCategoryModal(): void {
    this.categoryName.set('');
    this.categoryError.set(null);
    this.showAddCategoryModal.set(true);
  }

  submitAddCategory(): void {
    const name = this.categoryName().trim();
    if (!name) {
      return;
    }
    this.categorySaving.set(true);
    this.categoryError.set(null);
    this.inventoryApi.createCategory({ name }).subscribe({
      next: (category) => {
        this.categorySaving.set(false);
        this.showAddCategoryModal.set(false);
        this.categories.update((categories) => [...categories, category]);
      },
      error: (err: ApiError) => {
        this.categorySaving.set(false);
        this.categoryError.set(err.message || 'Failed to add the category.');
      },
    });
  }

  openAddSubCategoryModal(): void {
    this.subCategoryName.set('');
    this.subCategoryIsConsumable.set(false);
    this.subCategoryError.set(null);
    this.showAddSubCategoryModal.set(true);
  }

  submitAddSubCategory(): void {
    const categoryId = this.selectedCategoryId();
    const name = this.subCategoryName().trim();
    if (!categoryId || !name) {
      return;
    }
    this.subCategorySaving.set(true);
    this.subCategoryError.set(null);
    this.inventoryApi
      .createSubCategory({ categoryId, name, isConsumable: this.subCategoryIsConsumable() })
      .subscribe({
        next: (subCategory) => {
          this.subCategorySaving.set(false);
          this.showAddSubCategoryModal.set(false);
          this.subCategories.update((subCategories) => [...subCategories, subCategory]);
        },
        error: (err: ApiError) => {
          this.subCategorySaving.set(false);
          this.subCategoryError.set(err.message || 'Failed to add the sub-category.');
        },
      });
  }

  openAddItemModal(): void {
    this.itemForm.set(EMPTY_ITEM_FORM);
    this.itemError.set(null);
    this.showAddItemModal.set(true);
  }

  submitAddItem(): void {
    const subCategoryId = this.selectedSubCategoryId();
    const form = this.itemForm();
    const name = form.name.trim();
    const code = form.code.trim();
    const unitOfMeasure = form.unitOfMeasure.trim();
    if (!subCategoryId || !name || !code || !unitOfMeasure) {
      return;
    }
    this.itemSaving.set(true);
    this.itemError.set(null);
    this.inventoryApi
      .createItem({
        subCategoryId,
        name,
        code,
        unitOfMeasure,
        reorderLevel: form.reorderLevel ?? undefined,
        minimumStock: form.minimumStock ?? undefined,
        salePrice: form.salePrice ?? undefined,
      })
      .subscribe({
        next: (item) => {
          this.itemSaving.set(false);
          this.showAddItemModal.set(false);
          this.items.update((items) => [...items, item]);
        },
        error: (err: ApiError) => {
          this.itemSaving.set(false);
          this.itemError.set(err.message || 'Failed to add the item.');
        },
      });
  }
}
