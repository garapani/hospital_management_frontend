import { DatePipe, DecimalPipe } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { EMPTY, Subject, catchError, switchMap } from 'rxjs';
import { TableLazyLoadEvent, TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { TagModule } from 'primeng/tag';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { InputNumberModule } from 'primeng/inputnumber';
import { SelectModule } from 'primeng/select';
import { TabsModule } from 'primeng/tabs';
import { MessageService } from 'primeng/api';
import { ApiError } from '@org/api-client';
import { AuthService } from '@org/auth';
import { WardSupplyApiService } from './ward-supply-api.service.js';
import { StockMovementDto, WardStockBalance, WardStockTransaction } from './ward-supply.model.js';
import { InventoryApiService, InventoryItem, InventoryItemCategory, InventoryItemSubCategory } from '../inventory/inventory-api.service.js';
import { MasterDataApiService } from '../master-data/master-data-api.service.js';
import { Department } from '../master-data/master-data.model.js';
import { EntityName } from '../directory/entity-name.js';

interface MovementForm {
  departmentId: string;
  itemId: string;
  quantity: number;
  patientId: string;
  remarks: string;
  batchNumber: string;
  expiryDate: string;
}

const EMPTY_FORM: MovementForm = {
  departmentId: '',
  itemId: '',
  quantity: 0,
  patientId: '',
  remarks: '',
  batchNumber: '',
  expiryDate: '',
};

@Component({
  imports: [DecimalPipe, DatePipe, FormsModule, TableModule, ButtonModule, TagModule, DialogModule, InputTextModule, InputNumberModule, SelectModule, TabsModule, EntityName],
  selector: 'hms-ward-supply-console',
  templateUrl: './ward-supply-console.html',
})
export class WardSupplyConsole {
  private readonly api = inject(WardSupplyApiService);
  private readonly inventoryApi = inject(InventoryApiService);
  private readonly masterDataApi = inject(MasterDataApiService);
  private readonly messageService = inject(MessageService);
  readonly auth = inject(AuthService);
  readonly canManage = this.auth.hasPermission('ward-supply.manage');

  readonly departments = signal<Department[]>([]);
  readonly departmentIdFilter = signal('');

  readonly balances = signal<WardStockBalance[]>([]);
  readonly balancesLoading = signal(false);

  readonly transactions = signal<WardStockTransaction[]>([]);
  readonly transactionsLoading = signal(false);
  readonly transactionsTotalRecords = signal(0);
  readonly transactionsPageSize = signal(20);
  readonly transactionsFirstRecord = signal(0);

  // Movement dialog catalog state (shared category -> sub-category -> item cascade).
  readonly dialogCategories = signal<InventoryItemCategory[]>([]);
  readonly dialogSubCategories = signal<InventoryItemSubCategory[]>([]);
  readonly dialogItems = signal<InventoryItem[]>([]);
  readonly dialogItemsLoading = signal(false);
  readonly lineCategoryId = signal('');
  readonly lineSubCategoryId = signal('');

  readonly showReceiveModal = signal(false);
  readonly receiveForm = signal<MovementForm>(EMPTY_FORM);
  readonly receiveSaving = signal(false);
  readonly receiveError = signal<string | null>(null);

  readonly showConsumeModal = signal(false);
  readonly consumeForm = signal<MovementForm>(EMPTY_FORM);
  readonly consumeSaving = signal(false);
  readonly consumeError = signal<string | null>(null);

  // switchMap cancels a still-in-flight sub-category/item lookup the moment a newer category/
  // sub-category is picked, so a slow response to an earlier pick can never land after — and
  // overwrite — a faster response to a later one. See Development-Standards.md §120/§125.
  private readonly categoryChangeTrigger = new Subject<string>();
  private readonly subCategoryChangeTrigger = new Subject<string>();

  constructor() {
    this.loadDepartments();
    this.loadBalances();
    this.loadTransactions(0);

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
          this.dialogItemsLoading.set(true);
          return this.inventoryApi.listItemsBySubCategory(subCategoryId).pipe(
            catchError(() => {
              this.dialogItemsLoading.set(false);
              return EMPTY;
            }),
          );
        }),
        takeUntilDestroyed(),
      )
      .subscribe((items) => {
        this.dialogItems.set(items);
        this.dialogItemsLoading.set(false);
      });
  }

  loadDepartments(): void {
    this.masterDataApi.listDepartments().subscribe({
      next: (departments) => this.departments.set(departments),
      error: () => this.departments.set([]),
    });
  }

  departmentName(departmentId: string): string {
    return this.departments().find((d) => d.id === departmentId)?.departmentName ?? departmentId;
  }

  applyFilter(): void {
    this.loadBalances();
    this.transactionsFirstRecord.set(0);
    this.loadTransactions(0);
  }

  loadBalances(): void {
    this.balancesLoading.set(true);
    this.api.listBalances(this.departmentIdFilter() || undefined).subscribe({
      next: (result) => {
        this.balances.set(result.data);
        this.balancesLoading.set(false);
      },
      error: () => {
        this.balancesLoading.set(false);
        this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Could not load stock balances.' });
      },
    });
  }

  loadTransactions(first: number): void {
    this.transactionsLoading.set(true);
    const page = Math.floor(first / this.transactionsPageSize()) + 1;
    this.api
      .listTransactions({
        departmentId: this.departmentIdFilter() || undefined,
        page,
        limit: this.transactionsPageSize(),
      })
      .subscribe({
        next: (result) => {
          this.transactions.set(result.data);
          this.transactionsTotalRecords.set(result.meta.total);
          this.transactionsLoading.set(false);
        },
        error: () => {
          this.transactionsLoading.set(false);
          this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Could not load transactions.' });
        },
      });
  }

  onTransactionsLazyLoad(event: TableLazyLoadEvent): void {
    const first = event.first ?? 0;
    this.transactionsFirstRecord.set(first);
    this.loadTransactions(first);
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
    this.dialogSubCategories.set([]);
    this.dialogItems.set([]);
    this.categoryChangeTrigger.next(categoryId ?? '');
  }

  onLineSubCategoryChange(subCategoryId: string | null): void {
    this.lineSubCategoryId.set(subCategoryId ?? '');
    this.dialogItems.set([]);
    this.subCategoryChangeTrigger.next(subCategoryId ?? '');
  }

  private resetDialogCatalogState(): void {
    this.lineCategoryId.set('');
    this.lineSubCategoryId.set('');
    this.dialogSubCategories.set([]);
    this.dialogItems.set([]);
    this.loadDialogCategories();
  }

  openReceiveModal(): void {
    this.receiveForm.set({ ...EMPTY_FORM, departmentId: this.departmentIdFilter() });
    this.receiveError.set(null);
    this.resetDialogCatalogState();
    this.showReceiveModal.set(true);
  }

  submitReceive(): void {
    this.receiveSaving.set(true);
    this.receiveError.set(null);
    const form = this.receiveForm();
    this.api
      .receiveStock({
        departmentId: form.departmentId,
        itemId: form.itemId,
        quantity: form.quantity,
        batchNumber: form.batchNumber.trim() || undefined,
        expiryDate: form.expiryDate || undefined,
        patientId: form.patientId.trim() || undefined,
        remarks: form.remarks.trim() || undefined,
      })
      .subscribe({
        next: () => {
          this.receiveSaving.set(false);
          this.showReceiveModal.set(false);
          this.applyFilter();
          this.messageService.add({ severity: 'success', summary: 'Stock received' });
        },
        error: (err: ApiError) => {
          this.receiveSaving.set(false);
          this.receiveError.set(err.message || 'Failed to receive stock.');
        },
      });
  }

  openConsumeModal(): void {
    this.consumeForm.set({ ...EMPTY_FORM, departmentId: this.departmentIdFilter() });
    this.consumeError.set(null);
    this.resetDialogCatalogState();
    this.showConsumeModal.set(true);
  }

  submitConsume(): void {
    this.consumeSaving.set(true);
    this.consumeError.set(null);
    const form = this.consumeForm();
    this.api
      .consumeStock({
        departmentId: form.departmentId,
        itemId: form.itemId,
        quantity: form.quantity,
        patientId: form.patientId.trim() || undefined,
        remarks: form.remarks.trim() || undefined,
      } satisfies StockMovementDto)
      .subscribe({
        next: () => {
          this.consumeSaving.set(false);
          this.showConsumeModal.set(false);
          this.applyFilter();
          this.messageService.add({ severity: 'success', summary: 'Stock consumed' });
        },
        error: (err: ApiError) => {
          this.consumeSaving.set(false);
          this.consumeError.set(err.message || 'Failed to consume stock.');
        },
      });
  }
}
