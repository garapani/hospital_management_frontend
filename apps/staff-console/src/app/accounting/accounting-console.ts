import { DatePipe, DecimalPipe } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { TagModule } from 'primeng/tag';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { InputNumberModule } from 'primeng/inputnumber';
import { SelectModule } from 'primeng/select';
import { TabsModule } from 'primeng/tabs';
import { DatePickerModule } from 'primeng/datepicker';
import { MessageService } from 'primeng/api';
import { ApiError } from '@org/api-client';
import { AccountingApiService } from './accounting-api.service.js';
import {
  ACCOUNT_TYPES,
  BalanceSheet,
  CreateAccountDto,
  IncomeStatement,
  JournalEntry,
  JournalLineInput,
  JournalStatus,
  JournalWithLines,
  LedgerAccount,
  TrialBalanceRow,
} from './accounting.model.js';

type ReportKind = 'trial-balance' | 'income-statement' | 'balance-sheet';

function toIsoDate(value: Date | string | null): string | undefined {
  if (!value) return undefined;
  if (typeof value === 'string') return value;
  return value.toISOString().slice(0, 10);
}

interface JournalLineFormRow {
  accountId: string | null;
  debit: number | null;
  credit: number | null;
  lineNarration: string;
}

function emptyLineRow(): JournalLineFormRow {
  return { accountId: null, debit: null, credit: null, lineNarration: '' };
}

@Component({
  imports: [
    DecimalPipe,
    DatePipe,
    FormsModule,
    TableModule,
    ButtonModule,
    TagModule,
    DialogModule,
    InputTextModule,
    InputNumberModule,
    SelectModule,
    TabsModule,
    DatePickerModule,
  ],
  selector: 'hms-accounting-console',
  templateUrl: './accounting-console.html',
})
export class AccountingConsole {
  private readonly api = inject(AccountingApiService);
  private readonly messageService = inject(MessageService);

  readonly accountTypes = ACCOUNT_TYPES;
  readonly accountTypeOptions = ACCOUNT_TYPES.map((type) => ({ label: type, value: type }));
  readonly journalStatusOptions: { label: string; value: JournalStatus | null }[] = [
    { label: 'All', value: null },
    { label: 'Draft', value: 'Draft' },
    { label: 'Posted', value: 'Posted' },
  ];
  readonly reportKindOptions: { label: string; value: ReportKind }[] = [
    { label: 'Trial Balance', value: 'trial-balance' },
    { label: 'Income Statement', value: 'income-statement' },
    { label: 'Balance Sheet', value: 'balance-sheet' },
  ];

  get accountOptions(): { label: string; value: string }[] {
    return this.accounts()
      .filter((account) => account.isActive)
      .map((account) => ({ label: `${account.accountCode} — ${account.name}`, value: account.id }));
  }

  // Chart of accounts
  readonly accounts = signal<LedgerAccount[]>([]);
  readonly accountsLoading = signal(false);
  readonly showAccountModal = signal(false);
  readonly accountForm = signal<CreateAccountDto>({ accountCode: '', name: '', type: 'Asset' });
  readonly accountSaving = signal(false);
  readonly accountError = signal<string | null>(null);

  // Journals
  readonly journals = signal<JournalEntry[]>([]);
  readonly journalsLoading = signal(false);
  readonly journalStatusFilter = signal<JournalStatus | null>(null);
  readonly showJournalModal = signal(false);
  readonly journalEntryDate = signal<Date>(new Date());
  readonly journalNarration = signal('');
  readonly journalLines = signal<JournalLineFormRow[]>([emptyLineRow(), emptyLineRow()]);
  readonly journalSaving = signal(false);
  readonly journalError = signal<string | null>(null);
  readonly showJournalDetail = signal(false);
  readonly journalDetail = signal<JournalWithLines | null>(null);
  readonly journalDetailLoading = signal(false);
  readonly postingJournalId = signal<string | null>(null);

  // Reports
  readonly reportKind = signal<ReportKind>('trial-balance');
  readonly reportFrom = signal<Date | null>(null);
  readonly reportTo = signal<Date | null>(null);
  readonly reportLoading = signal(false);
  readonly trialBalanceRows = signal<TrialBalanceRow[]>([]);
  readonly incomeStatement = signal<IncomeStatement | null>(null);
  readonly balanceSheet = signal<BalanceSheet | null>(null);

  accountNameFor(accountId: string): string {
    const account = this.accounts().find((a) => a.id === accountId);
    return account ? `${account.accountCode} — ${account.name}` : accountId;
  }

  constructor() {
    this.loadAccounts();
    this.loadJournals();
    this.runReport();
  }

  // --- Chart of accounts ---

  loadAccounts(): void {
    this.accountsLoading.set(true);
    this.api.listAccounts().subscribe({
      next: (data) => {
        this.accounts.set(data);
        this.accountsLoading.set(false);
      },
      error: () => {
        this.accountsLoading.set(false);
        this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Could not load the chart of accounts.' });
      },
    });
  }

  openAccountModal(): void {
    this.accountForm.set({ accountCode: '', name: '', type: 'Asset' });
    this.accountError.set(null);
    this.showAccountModal.set(true);
  }

  submitAccount(): void {
    this.accountSaving.set(true);
    this.accountError.set(null);
    this.api.createAccount(this.accountForm()).subscribe({
      next: () => {
        this.accountSaving.set(false);
        this.showAccountModal.set(false);
        this.loadAccounts();
        this.messageService.add({ severity: 'success', summary: 'Account created', detail: `${this.accountForm().name} added to the chart of accounts.` });
      },
      error: (err: ApiError) => {
        this.accountSaving.set(false);
        this.accountError.set(err.message || 'Failed to save the account.');
      },
    });
  }

  toggleAccountActive(account: LedgerAccount): void {
    const action = account.isActive ? this.api.deactivateAccount(account.id) : this.api.reactivateAccount(account.id);
    action.subscribe({
      next: () => {
        this.loadAccounts();
        this.messageService.add({
          severity: 'success',
          summary: account.isActive ? 'Account deactivated' : 'Account reactivated',
          detail: account.name,
        });
      },
      error: (err: ApiError) => {
        this.messageService.add({ severity: 'error', summary: 'Action failed', detail: err.message || 'Please try again.' });
      },
    });
  }

  // --- Journals ---

  loadJournals(): void {
    this.journalsLoading.set(true);
    this.api.listJournals({ status: this.journalStatusFilter() ?? undefined }).subscribe({
      next: (result) => {
        this.journals.set(result.data);
        this.journalsLoading.set(false);
      },
      error: () => {
        this.journalsLoading.set(false);
        this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Could not load journal entries.' });
      },
    });
  }

  setJournalStatusFilter(status: JournalStatus | null): void {
    this.journalStatusFilter.set(status);
    this.loadJournals();
  }

  openJournalModal(): void {
    this.journalEntryDate.set(new Date());
    this.journalNarration.set('');
    this.journalLines.set([emptyLineRow(), emptyLineRow()]);
    this.journalError.set(null);
    this.showJournalModal.set(true);
  }

  addJournalLine(): void {
    this.journalLines.update((lines) => [...lines, emptyLineRow()]);
  }

  removeJournalLine(index: number): void {
    this.journalLines.update((lines) => lines.filter((_, i) => i !== index));
  }

  updateJournalLine(index: number, patch: Partial<JournalLineFormRow>): void {
    this.journalLines.update((lines) => lines.map((line, i) => (i === index ? { ...line, ...patch } : line)));
  }

  get journalDebitTotal(): number {
    return this.journalLines().reduce((sum, line) => sum + (line.debit ?? 0), 0);
  }

  get journalCreditTotal(): number {
    return this.journalLines().reduce((sum, line) => sum + (line.credit ?? 0), 0);
  }

  get journalIsBalanced(): boolean {
    return this.journalDebitTotal > 0 && this.journalDebitTotal === this.journalCreditTotal;
  }

  submitJournal(): void {
    const lines: JournalLineInput[] = this.journalLines()
      .filter((line) => line.accountId)
      .map((line) => ({
        accountId: line.accountId as string,
        debit: line.debit ?? undefined,
        credit: line.credit ?? undefined,
        lineNarration: line.lineNarration || undefined,
      }));

    this.journalSaving.set(true);
    this.journalError.set(null);
    this.api
      .createJournal({
        entryDate: toIsoDate(this.journalEntryDate()) as string,
        narration: this.journalNarration() || undefined,
        lines,
      })
      .subscribe({
        next: (journal) => {
          this.journalSaving.set(false);
          this.showJournalModal.set(false);
          this.loadJournals();
          this.messageService.add({ severity: 'success', summary: 'Journal entry created', detail: journal.journalNumber });
        },
        error: (err: ApiError) => {
          this.journalSaving.set(false);
          this.journalError.set(err.message || 'Failed to save the journal entry — debits and credits must balance.');
        },
      });
  }

  viewJournal(journal: JournalEntry): void {
    this.journalDetailLoading.set(true);
    this.journalDetail.set(null);
    this.showJournalDetail.set(true);
    this.api.getJournal(journal.id).subscribe({
      next: (detail) => {
        this.journalDetail.set(detail);
        this.journalDetailLoading.set(false);
      },
      error: () => {
        this.journalDetailLoading.set(false);
        this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Could not load the journal entry.' });
      },
    });
  }

  postJournal(journal: JournalEntry): void {
    this.postingJournalId.set(journal.id);
    this.api.postJournal(journal.id).subscribe({
      next: () => {
        this.postingJournalId.set(null);
        this.loadJournals();
        this.messageService.add({ severity: 'success', summary: 'Journal posted', detail: journal.journalNumber });
      },
      error: (err: ApiError) => {
        this.postingJournalId.set(null);
        this.messageService.add({ severity: 'error', summary: 'Post failed', detail: err.message || 'Please try again.' });
      },
    });
  }

  // --- Reports ---

  setReportKind(kind: ReportKind): void {
    this.reportKind.set(kind);
    this.runReport();
  }

  runReport(): void {
    const from = toIsoDate(this.reportFrom());
    const to = toIsoDate(this.reportTo());
    this.reportLoading.set(true);
    const kind = this.reportKind();
    const onError = () => {
      this.reportLoading.set(false);
      this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Could not load the report.' });
    };
    if (kind === 'trial-balance') {
      this.api.trialBalance(from, to).subscribe({
        next: (rows) => {
          this.trialBalanceRows.set(rows);
          this.reportLoading.set(false);
        },
        error: onError,
      });
    } else if (kind === 'income-statement') {
      this.api.incomeStatement(from, to).subscribe({
        next: (statement) => {
          this.incomeStatement.set(statement);
          this.reportLoading.set(false);
        },
        error: onError,
      });
    } else {
      this.api.balanceSheet(to).subscribe({
        next: (sheet) => {
          this.balanceSheet.set(sheet);
          this.reportLoading.set(false);
        },
        error: onError,
      });
    }
  }
}
