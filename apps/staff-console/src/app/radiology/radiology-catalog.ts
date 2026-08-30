import { Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TableModule } from 'primeng/table';
import { SelectModule } from 'primeng/select';
import { AuthService } from '@org/auth';

import { RadiologyApiService } from './radiology-api.service.js';
import { RadiologyImagingItem, RadiologyImagingType } from './radiology.model.js';

@Component({
  selector: 'hms-radiology-catalog',
  standalone: true,
  imports: [CommonModule, FormsModule, TableModule, SelectModule],
  templateUrl: './radiology-catalog.html',
})
export class RadiologyCatalog {
  private readonly radiologyApi = inject(RadiologyApiService);
  readonly auth = inject(AuthService);

  readonly types = signal<RadiologyImagingType[]>([]);
  readonly items = signal<RadiologyImagingItem[]>([]);
  readonly selectedTypeId = signal('');
  readonly loadingTypes = signal(false);
  readonly loadingItems = signal(false);

  readonly typeOptions = computed(() => this.types().map((t) => ({ label: t.name, value: t.id })));

  private itemsRequestToken = 0;

  constructor() {
    this.loadTypes();
  }

  loadTypes(): void {
    this.loadingTypes.set(true);
    this.radiologyApi.listImagingTypes().subscribe({
      next: (types) => {
        this.types.set(types);
        this.loadingTypes.set(false);
      },
      error: () => this.loadingTypes.set(false),
    });
  }

  onTypeChange(typeId: string): void {
    this.selectedTypeId.set(typeId);
    this.items.set([]);
    const requestToken = ++this.itemsRequestToken;
    if (!typeId) return;

    this.loadingItems.set(true);
    this.radiologyApi.listItemsByType(typeId).subscribe({
      next: (items) => {
        if (requestToken !== this.itemsRequestToken) return;
        this.items.set(items);
        this.loadingItems.set(false);
      },
      error: () => {
        if (requestToken !== this.itemsRequestToken) return;
        this.loadingItems.set(false);
      },
    });
  }
}
