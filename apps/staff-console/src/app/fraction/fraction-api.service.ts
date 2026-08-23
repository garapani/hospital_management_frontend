import { Injectable, inject } from '@angular/core';
import { ApiClientService } from '@org/api-client';
import { Observable } from 'rxjs';
import { CreateEntryDto, CreateRuleDto, FractionEntry, FractionRule, PaginatedResult } from './fraction.model.js';

@Injectable({ providedIn: 'root' })
export class FractionApiService {
  private readonly apiClient = inject(ApiClientService);

  listRules(doctorId?: string): Observable<PaginatedResult<FractionRule>> {
    const query: Record<string, string> = {};
    if (doctorId) query['doctorId'] = doctorId;
    return this.apiClient.get<PaginatedResult<FractionRule>>('/fraction/rules', { params: query });
  }

  createRule(dto: CreateRuleDto): Observable<FractionRule> {
    return this.apiClient.post<FractionRule>('/fraction/rules', dto);
  }

  deactivateRule(id: string): Observable<FractionRule> {
    return this.apiClient.patch<FractionRule>(`/fraction/rules/${id}/deactivate`, {});
  }

  reactivateRule(id: string): Observable<FractionRule> {
    return this.apiClient.patch<FractionRule>(`/fraction/rules/${id}/reactivate`, {});
  }

  listEntries(invoiceId?: string): Observable<PaginatedResult<FractionEntry>> {
    const query: Record<string, string> = {};
    if (invoiceId) query['invoiceId'] = invoiceId;
    return this.apiClient.get<PaginatedResult<FractionEntry>>('/fraction/entries', { params: query });
  }

  recordEntry(dto: CreateEntryDto): Observable<FractionEntry> {
    return this.apiClient.post<FractionEntry>('/fraction/entries', dto);
  }
}
