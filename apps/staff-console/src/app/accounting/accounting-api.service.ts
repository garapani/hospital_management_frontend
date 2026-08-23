import { Injectable, inject } from '@angular/core';
import { ApiClientService } from '@org/api-client';
import { Observable } from 'rxjs';
import {
  BalanceSheet,
  CreateAccountDto,
  CreateJournalDto,
  IncomeStatement,
  JournalEntry,
  JournalListResult,
  JournalStatus,
  JournalWithLines,
  LedgerAccount,
  TrialBalanceRow,
  UpdateAccountDto,
} from './accounting.model.js';

export interface ListJournalsParams {
  status?: JournalStatus;
  from?: string;
  to?: string;
  page?: number;
  limit?: number;
}

@Injectable({ providedIn: 'root' })
export class AccountingApiService {
  private readonly apiClient = inject(ApiClientService);

  listAccounts(): Observable<LedgerAccount[]> {
    return this.apiClient.get<LedgerAccount[]>('/accounting/accounts');
  }

  createAccount(dto: CreateAccountDto): Observable<LedgerAccount> {
    return this.apiClient.post<LedgerAccount>('/accounting/accounts', dto);
  }

  updateAccount(id: string, dto: UpdateAccountDto): Observable<LedgerAccount> {
    return this.apiClient.patch<LedgerAccount>(`/accounting/accounts/${id}`, dto);
  }

  deactivateAccount(id: string): Observable<LedgerAccount> {
    return this.apiClient.patch<LedgerAccount>(`/accounting/accounts/${id}/deactivate`, {});
  }

  reactivateAccount(id: string): Observable<LedgerAccount> {
    return this.apiClient.patch<LedgerAccount>(`/accounting/accounts/${id}/reactivate`, {});
  }

  listJournals(params: ListJournalsParams = {}): Observable<JournalListResult> {
    const query: Record<string, string | number> = {};
    if (params.status) {
      query['status'] = params.status;
    }
    if (params.from) {
      query['from'] = params.from;
    }
    if (params.to) {
      query['to'] = params.to;
    }
    if (params.page !== undefined) {
      query['page'] = params.page;
    }
    if (params.limit !== undefined) {
      query['limit'] = params.limit;
    }
    return this.apiClient.get<JournalListResult>('/accounting/journals', { params: query });
  }

  getJournal(id: string): Observable<JournalWithLines> {
    return this.apiClient.get<JournalWithLines>(`/accounting/journals/${id}`);
  }

  createJournal(dto: CreateJournalDto): Observable<JournalEntry> {
    return this.apiClient.post<JournalEntry>('/accounting/journals', dto);
  }

  postJournal(id: string): Observable<JournalEntry> {
    return this.apiClient.post<JournalEntry>(`/accounting/journals/${id}/post`, {});
  }

  trialBalance(from?: string, to?: string): Observable<TrialBalanceRow[]> {
    const query: Record<string, string> = {};
    if (from) query['from'] = from;
    if (to) query['to'] = to;
    return this.apiClient.get<TrialBalanceRow[]>('/accounting/reports/trial-balance', { params: query });
  }

  incomeStatement(from?: string, to?: string): Observable<IncomeStatement> {
    const query: Record<string, string> = {};
    if (from) query['from'] = from;
    if (to) query['to'] = to;
    return this.apiClient.get<IncomeStatement>('/accounting/reports/income-statement', { params: query });
  }

  balanceSheet(asOf?: string): Observable<BalanceSheet> {
    const query: Record<string, string> = {};
    if (asOf) query['asOf'] = asOf;
    return this.apiClient.get<BalanceSheet>('/accounting/reports/balance-sheet', { params: query });
  }
}
