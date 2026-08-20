import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TabsModule } from 'primeng/tabs';
import { TableModule } from 'primeng/table';

import { LabApiService, LabTest, LabTestCategory } from '../lab-api.service.js';
import { labTestPrice } from '../lab.model.js';

@Component({
  selector: 'hms-lab-tests',
  standalone: true,
  imports: [CommonModule, TabsModule, TableModule],
  templateUrl: './lab-tests.html',
})
export class LabTests {
  private readonly labApi = inject(LabApiService);

  readonly categories = signal<LabTestCategory[]>([]);
  readonly loadingCategories = signal(false);
  readonly selectedCategoryId = signal<string | undefined>(undefined);
  readonly tests = signal<LabTest[]>([]);
  readonly loadingTests = signal(false);

  readonly price = labTestPrice;

  constructor() {
    this.loadCategories();
  }

  loadCategories() {
    this.loadingCategories.set(true);
    this.labApi.listCategories().subscribe({
      next: (categories) => {
        this.categories.set(categories);
        this.loadingCategories.set(false);
        const first = categories[0];
        if (first) {
          this.selectCategory(first.id);
        }
      },
      error: () => this.loadingCategories.set(false),
    });
  }

  selectCategory(categoryId: string | number | undefined) {
    if (categoryId === undefined) {
      return;
    }
    const id = String(categoryId);
    this.selectedCategoryId.set(id);
    this.loadTests(id);
  }

  loadTests(categoryId: string) {
    this.loadingTests.set(true);
    this.labApi.listTestsByCategory(categoryId).subscribe({
      next: (tests) => {
        this.tests.set(tests);
        this.loadingTests.set(false);
      },
      error: () => this.loadingTests.set(false),
    });
  }
}
