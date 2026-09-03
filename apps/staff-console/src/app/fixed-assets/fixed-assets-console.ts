import { CurrencyPipe } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TableLazyLoadEvent, TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { TagModule } from 'primeng/tag';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { InputNumberModule } from 'primeng/inputnumber';
import { SelectModule } from 'primeng/select';
import { TabsModule } from 'primeng/tabs';
import { MessageService, ConfirmationService } from 'primeng/api';
import { ApiError } from '@org/api-client';
import { AuthService } from '@org/auth';
import { FixedAssetsApiService } from './fixed-assets-api.service.js';
import { CreateFixedAssetDto, FixedAsset, FixedAssetCategory, FixedAssetValuation, fixedAssetStatusSeverity } from './fixed-assets.model.js';

const EMPTY_ASSET_FORM: CreateFixedAssetDto = { categoryId: '', name: '', purchaseDate: '', purchaseCost: 0 };

@Component({
  imports: [CurrencyPipe, FormsModule, TableModule, ButtonModule, TagModule, DialogModule, InputTextModule, InputNumberModule, SelectModule, TabsModule],
  selector: 'hms-fixed-assets-console',
  templateUrl: './fixed-assets-console.html',
})
export class FixedAssetsConsole {
  private readonly api = inject(FixedAssetsApiService);
  private readonly messageService = inject(MessageService);
  private readonly confirmationService = inject(ConfirmationService);
  readonly auth = inject(AuthService);
  readonly canManage = this.auth.hasPermission('fixed-asset.manage');
  readonly statusSeverity = fixedAssetStatusSeverity;

  readonly categories = signal<FixedAssetCategory[]>([]);
  readonly categoriesLoading = signal(false);
  readonly newCategoryName = signal('');
  readonly categorySaving = signal(false);

  readonly assets = signal<FixedAsset[]>([]);
  readonly assetsTotalRecords = signal(0);
  readonly assetsPageSize = signal(20);
  readonly assetsFirstRecord = signal(0);
  readonly assetsLoading = signal(false);
  readonly showAssetModal = signal(false);
  readonly assetForm = signal<CreateFixedAssetDto>(EMPTY_ASSET_FORM);
  readonly assetSaving = signal(false);
  readonly assetError = signal<string | null>(null);

  readonly showValuation = signal(false);
  readonly valuation = signal<FixedAssetValuation | null>(null);
  readonly valuationLoading = signal(false);
  readonly valuationAssetName = signal('');

  get categoryOptions(): { label: string; value: string }[] {
    return this.categories()
      .filter((c) => c.isActive)
      .map((c) => ({ label: c.name, value: c.id }));
  }

  categoryNameFor(categoryId: string): string {
    return this.categories().find((c) => c.id === categoryId)?.name ?? categoryId;
  }

  constructor() {
    this.loadCategories();
    this.loadAssets(1, this.assetsPageSize());
  }

  // --- Categories ---

  loadCategories(): void {
    this.categoriesLoading.set(true);
    this.api.listCategories().subscribe({
      next: (data) => {
        this.categories.set(data);
        this.categoriesLoading.set(false);
      },
      error: () => {
        this.categoriesLoading.set(false);
        this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Could not load asset categories.' });
      },
    });
  }

  addCategory(): void {
    const name = this.newCategoryName().trim();
    if (!name) return;
    this.categorySaving.set(true);
    this.api.createCategory(name).subscribe({
      next: () => {
        this.categorySaving.set(false);
        this.newCategoryName.set('');
        this.loadCategories();
        this.messageService.add({ severity: 'success', summary: 'Category added', detail: name });
      },
      error: (err: ApiError) => {
        this.categorySaving.set(false);
        this.messageService.add({ severity: 'error', summary: 'Action failed', detail: err.message || 'Please try again.' });
      },
    });
  }

  toggleCategoryActive(category: FixedAssetCategory): void {
    const doToggle = () => {
      const action = category.isActive ? this.api.deactivateCategory(category.id) : this.api.reactivateCategory(category.id);
      action.subscribe({
        next: () => {
          this.loadCategories();
          this.messageService.add({
            severity: 'success',
            summary: category.isActive ? 'Category deactivated' : 'Category reactivated',
            detail: category.name,
          });
        },
        error: (err: ApiError) => {
          this.messageService.add({ severity: 'error', summary: 'Action failed', detail: err.message || 'Please try again.' });
        },
      });
    };

    if (!category.isActive) {
      doToggle();
      return;
    }
    this.confirmationService.confirm({
      header: 'Deactivate Category',
      message: `Deactivate "${category.name}"? It will no longer be selectable for new assets.`,
      icon: 'pi pi-exclamation-triangle',
      acceptButtonProps: { label: 'Deactivate', severity: 'danger' },
      rejectButtonProps: { label: 'Cancel', severity: 'secondary', outlined: true },
      accept: doToggle,
    });
  }

  // --- Assets ---

  onAssetsLazyLoad(event: TableLazyLoadEvent): void {
    const rows = event.rows ?? this.assetsPageSize();
    const page = Math.floor((event.first ?? 0) / rows) + 1;
    this.loadAssets(page, rows);
  }

  loadAssets(page: number, limit: number): void {
    this.assetsLoading.set(true);
    this.assetsFirstRecord.set((page - 1) * limit);
    this.api.listAssets({ page, limit }).subscribe({
      next: (result) => {
        this.assets.set(result.data);
        this.assetsTotalRecords.set(result.meta.total);
        this.assetsLoading.set(false);
      },
      error: () => {
        this.assetsLoading.set(false);
        this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Could not load fixed assets.' });
      },
    });
  }

  openAssetModal(): void {
    this.assetForm.set(EMPTY_ASSET_FORM);
    this.assetError.set(null);
    this.showAssetModal.set(true);
  }

  submitAsset(): void {
    this.assetSaving.set(true);
    this.assetError.set(null);
    this.api.createAsset(this.assetForm()).subscribe({
      next: (asset) => {
        this.assetSaving.set(false);
        this.showAssetModal.set(false);
        this.loadAssets(1, this.assetsPageSize());
        this.messageService.add({ severity: 'success', summary: 'Asset registered', detail: asset.assetCode });
      },
      error: (err: ApiError) => {
        this.assetSaving.set(false);
        this.assetError.set(err.message || 'Failed to register the asset.');
      },
    });
  }

  toggleAssetActive(asset: FixedAsset): void {
    const doToggle = () => {
      const action = asset.isActive ? this.api.deactivateAsset(asset.id) : this.api.reactivateAsset(asset.id);
      action.subscribe({
        next: () => {
          this.loadAssets(1, this.assetsPageSize());
          this.messageService.add({
            severity: 'success',
            summary: asset.isActive ? 'Asset deactivated' : 'Asset reactivated',
            detail: asset.name,
          });
        },
        error: (err: ApiError) => {
          this.messageService.add({ severity: 'error', summary: 'Action failed', detail: err.message || 'Please try again.' });
        },
      });
    };

    if (!asset.isActive) {
      doToggle();
      return;
    }
    this.confirmationService.confirm({
      header: 'Deactivate Asset',
      message: `Deactivate "${asset.assetCode} — ${asset.name}"?`,
      icon: 'pi pi-exclamation-triangle',
      acceptButtonProps: { label: 'Deactivate', severity: 'danger' },
      rejectButtonProps: { label: 'Cancel', severity: 'secondary', outlined: true },
      accept: doToggle,
    });
  }

  viewValuation(asset: FixedAsset): void {
    this.valuationAssetName.set(`${asset.assetCode} — ${asset.name}`);
    this.valuationLoading.set(true);
    this.valuation.set(null);
    this.showValuation.set(true);
    this.api.getValuation(asset.id).subscribe({
      next: (data) => {
        this.valuation.set(data);
        this.valuationLoading.set(false);
      },
      error: () => {
        this.valuationLoading.set(false);
        this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Could not load the valuation.' });
      },
    });
  }
}
