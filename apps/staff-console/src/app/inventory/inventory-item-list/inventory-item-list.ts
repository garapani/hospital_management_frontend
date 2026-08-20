import { Component, inject, signal } from '@angular/core';
import { CommonModule, DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SelectModule } from 'primeng/select';
import { TableModule } from 'primeng/table';
import { InputTextModule } from 'primeng/inputtext';
import { ButtonModule } from 'primeng/button';

import {
  InventoryApiService,
  InventoryItem,
  InventoryItemCategory,
  InventoryItemSubCategory,
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

  constructor() {
    this.loadCategories();
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

  onCategoryChange(categoryId: string): void {
    this.selectedCategoryId.set(categoryId);
    // Reset the dependent selects — sub-categories and items are scoped to the new category.
    this.subCategories.set([]);
    this.items.set([]);
    this.selectedSubCategoryId.set('');
    if (!categoryId) {
      return;
    }
    this.subCategoriesLoading.set(true);
    this.inventoryApi.listSubCategories(categoryId).subscribe({
      next: (subCategories) => {
        this.subCategories.set(subCategories);
        this.subCategoriesLoading.set(false);
      },
      error: () => this.subCategoriesLoading.set(false),
    });
  }

  onSubCategoryChange(subCategoryId: string): void {
    this.selectedSubCategoryId.set(subCategoryId);
    this.items.set([]);
    if (!subCategoryId) {
      return;
    }
    this.itemsLoading.set(true);
    this.inventoryApi.listItemsBySubCategory(subCategoryId).subscribe({
      next: (items) => {
        this.items.set(items);
        this.itemsLoading.set(false);
      },
      error: () => this.itemsLoading.set(false),
    });
  }
}
