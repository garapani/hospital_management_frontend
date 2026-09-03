import { DatePipe, DecimalPipe } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { DialogModule } from 'primeng/dialog';
import { InputNumberModule } from 'primeng/inputnumber';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { TextareaModule } from 'primeng/textarea';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';
import { ApiError } from '@org/api-client';
import { AuthService } from '@org/auth';
import {
  CashierShift,
  CashierShiftApiService,
  DenominationCounts,
  ModeDeclaredTotals,
  ShiftReconciliation,
} from '../cashier-shift-api.service.js';

const CASH_DENOMINATIONS = [500, 200, 100, 50, 20, 10, 5, 2, 1] as const;
const DECLARABLE_MODES = ['Card', 'UPI', 'Cheque'] as const;

@Component({
  imports: [
    DecimalPipe,
    DatePipe,
    FormsModule,
    ButtonModule,
    CardModule,
    DialogModule,
    InputNumberModule,
    TableModule,
    TagModule,
    TextareaModule,
    ToastModule,
  ],
  providers: [MessageService],
  selector: 'hms-cashier-shift',
  templateUrl: './cashier-shift.html',
})
export class CashierShiftComponent {
  private readonly api = inject(CashierShiftApiService);
  private readonly messageService = inject(MessageService);
  readonly auth = inject(AuthService);

  readonly denominations = CASH_DENOMINATIONS;
  readonly declarableModes = DECLARABLE_MODES;

  readonly canManage = computed(() => this.auth.hasPermission('billing.manage'));

  readonly loading = signal(true);
  readonly currentShift = signal<CashierShift | null>(null);
  readonly history = signal<CashierShift[]>([]);

  readonly showOpenModal = signal(false);
  readonly floatAmount = signal<number | null>(null);
  readonly openNotes = signal('');
  readonly opening = signal(false);
  readonly openError = signal<string | null>(null);

  readonly showCloseModal = signal(false);
  readonly denominationCounts = signal<Record<number, number | null>>({});
  readonly modeTotals = signal<Record<string, number | null>>({});
  readonly closeNotes = signal('');
  readonly closing = signal(false);
  readonly closeError = signal<string | null>(null);

  readonly lastReconciliation = signal<ShiftReconciliation | null>(null);

  constructor() {
    this.refresh();
  }

  private refresh(): void {
    this.loading.set(true);
    this.api.current().subscribe({
      next: (shift) => {
        this.currentShift.set(shift);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
    this.refreshHistory();
  }

  // Deliberately does not re-fetch currentShift: the open/close mutation responses below already
  // carry the authoritative post-mutation shift, so a full refresh() here would just replace that
  // known-fresh value with another round-trip's result for no benefit.
  private refreshHistory(): void {
    this.api.list({ limit: 20 }).subscribe({
      next: (result) => this.history.set(result.data),
      error: () => this.history.set([]),
    });
  }

  cashCountedTotal(): number {
    const counts = this.denominationCounts();
    return this.denominations.reduce((sum, denomination) => sum + denomination * (counts[denomination] ?? 0), 0);
  }

  openOpenModal(): void {
    this.floatAmount.set(null);
    this.openNotes.set('');
    this.openError.set(null);
    this.showOpenModal.set(true);
  }

  submitOpen(): void {
    const floatAmount = this.floatAmount();
    if (floatAmount === null || floatAmount < 0) {
      return;
    }
    this.opening.set(true);
    this.openError.set(null);
    this.api.open({ floatAmount, notes: this.openNotes().trim() || undefined }).subscribe({
      next: (shift) => {
        this.opening.set(false);
        this.showOpenModal.set(false);
        this.currentShift.set(shift);
        this.messageService.add({ severity: 'success', summary: 'Shift opened' });
        this.refreshHistory();
      },
      error: (err: ApiError) => {
        this.opening.set(false);
        this.openError.set(err.message || 'Failed to open the shift.');
      },
    });
  }

  openCloseModal(): void {
    this.denominationCounts.set({});
    this.modeTotals.set({});
    this.closeNotes.set('');
    this.closeError.set(null);
    this.lastReconciliation.set(null);
    this.showCloseModal.set(true);
  }

  setDenominationCount(denomination: number, count: number | null): void {
    this.denominationCounts.set({ ...this.denominationCounts(), [denomination]: count });
  }

  setModeTotal(mode: string, amount: number | null): void {
    this.modeTotals.set({ ...this.modeTotals(), [mode]: amount });
  }

  submitClose(): void {
    const shift = this.currentShift();
    if (!shift) return;

    const cashDenominationCounts: DenominationCounts = {};
    for (const [denomination, count] of Object.entries(this.denominationCounts())) {
      if (count) {
        cashDenominationCounts[denomination] = count;
      }
    }
    const modeDeclaredTotals: ModeDeclaredTotals = {};
    for (const [mode, amount] of Object.entries(this.modeTotals())) {
      if (amount !== null && amount !== undefined) {
        modeDeclaredTotals[mode] = amount;
      }
    }

    this.closing.set(true);
    this.closeError.set(null);
    this.api
      .close(shift.id, {
        cashDenominationCounts,
        modeDeclaredTotals,
        notes: this.closeNotes().trim() || undefined,
      })
      .subscribe({
        next: (reconciliation) => {
          this.closing.set(false);
          this.showCloseModal.set(false);
          this.currentShift.set(null);
          this.lastReconciliation.set(reconciliation);
          this.messageService.add({ severity: 'success', summary: 'Shift closed' });
          this.refreshHistory();
        },
        error: (err: ApiError) => {
          this.closing.set(false);
          this.closeError.set(err.message || 'Failed to close the shift.');
        },
      });
  }
}
