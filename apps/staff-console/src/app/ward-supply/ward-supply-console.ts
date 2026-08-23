import { DatePipe, DecimalPipe } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { TagModule } from 'primeng/tag';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { InputNumberModule } from 'primeng/inputnumber';
import { TabsModule } from 'primeng/tabs';
import { MessageService } from 'primeng/api';
import { ApiError } from '@org/api-client';
import { WardSupplyApiService } from './ward-supply-api.service.js';
import { StockMovementDto, WardStockBalance, WardStockTransaction } from './ward-supply.model.js';

const EMPTY_FORM: StockMovementDto = { departmentId: '', itemId: '', quantity: 0 };

@Component({
  imports: [DecimalPipe, DatePipe, FormsModule, TableModule, ButtonModule, TagModule, DialogModule, InputTextModule, InputNumberModule, TabsModule],
  selector: 'hms-ward-supply-console',
  templateUrl: './ward-supply-console.html',
})
export class WardSupplyConsole {
  private readonly api = inject(WardSupplyApiService);
  private readonly messageService = inject(MessageService);

  readonly departmentIdFilter = signal('');

  readonly balances = signal<WardStockBalance[]>([]);
  readonly balancesLoading = signal(false);

  readonly transactions = signal<WardStockTransaction[]>([]);
  readonly transactionsLoading = signal(false);

  readonly showReceiveModal = signal(false);
  readonly receiveForm = signal<StockMovementDto>(EMPTY_FORM);
  readonly receiveSaving = signal(false);
  readonly receiveError = signal<string | null>(null);

  readonly showConsumeModal = signal(false);
  readonly consumeForm = signal<StockMovementDto>(EMPTY_FORM);
  readonly consumeSaving = signal(false);
  readonly consumeError = signal<string | null>(null);

  constructor() {
    this.loadBalances();
    this.loadTransactions();
  }

  applyFilter(): void {
    this.loadBalances();
    this.loadTransactions();
  }

  loadBalances(): void {
    this.balancesLoading.set(true);
    this.api.listBalances(this.departmentIdFilter() || undefined).subscribe({
      next: (data) => {
        this.balances.set(data);
        this.balancesLoading.set(false);
      },
      error: () => {
        this.balancesLoading.set(false);
        this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Could not load stock balances.' });
      },
    });
  }

  loadTransactions(): void {
    this.transactionsLoading.set(true);
    this.api.listTransactions({ departmentId: this.departmentIdFilter() || undefined }).subscribe({
      next: (result) => {
        this.transactions.set(result.data);
        this.transactionsLoading.set(false);
      },
      error: () => {
        this.transactionsLoading.set(false);
        this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Could not load transactions.' });
      },
    });
  }

  openReceiveModal(): void {
    this.receiveForm.set({ ...EMPTY_FORM, departmentId: this.departmentIdFilter() });
    this.receiveError.set(null);
    this.showReceiveModal.set(true);
  }

  submitReceive(): void {
    this.receiveSaving.set(true);
    this.receiveError.set(null);
    this.api.receiveStock(this.receiveForm()).subscribe({
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
    this.showConsumeModal.set(true);
  }

  submitConsume(): void {
    this.consumeSaving.set(true);
    this.consumeError.set(null);
    this.api.consumeStock(this.consumeForm()).subscribe({
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
