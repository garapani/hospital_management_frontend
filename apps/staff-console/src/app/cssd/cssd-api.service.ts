import { Injectable, inject } from '@angular/core';
import { ApiClientService } from '@org/api-client';
import { Observable } from 'rxjs';
import {
  CompleteCycleDto,
  CreateInstrumentDto,
  CssdInstrument,
  CssdSterilizationCycle,
  FailCycleDto,
  PaginatedResult,
  StartCycleDto,
  SterilizationCycleStatus,
  UpdateInstrumentDto,
} from './cssd.model.js';

export interface ListCyclesParams {
  instrumentId?: string;
  status?: SterilizationCycleStatus;
  page?: number;
  limit?: number;
}

@Injectable({ providedIn: 'root' })
export class CssdApiService {
  private readonly apiClient = inject(ApiClientService);

  listInstruments(): Observable<CssdInstrument[]> {
    return this.apiClient.get<CssdInstrument[]>('/cssd/instruments');
  }

  createInstrument(dto: CreateInstrumentDto): Observable<CssdInstrument> {
    return this.apiClient.post<CssdInstrument>('/cssd/instruments', dto);
  }

  updateInstrument(id: string, dto: UpdateInstrumentDto): Observable<CssdInstrument> {
    return this.apiClient.patch<CssdInstrument>(`/cssd/instruments/${id}`, dto);
  }

  deactivateInstrument(id: string): Observable<CssdInstrument> {
    return this.apiClient.patch<CssdInstrument>(`/cssd/instruments/${id}/deactivate`, {});
  }

  reactivateInstrument(id: string): Observable<CssdInstrument> {
    return this.apiClient.patch<CssdInstrument>(`/cssd/instruments/${id}/reactivate`, {});
  }

  listCycles(params: ListCyclesParams = {}): Observable<PaginatedResult<CssdSterilizationCycle>> {
    const query: Record<string, string | number> = {};
    if (params.instrumentId) query['instrumentId'] = params.instrumentId;
    if (params.status) query['status'] = params.status;
    if (params.page !== undefined) query['page'] = params.page;
    if (params.limit !== undefined) query['limit'] = params.limit;
    return this.apiClient.get<PaginatedResult<CssdSterilizationCycle>>('/cssd/cycles', { params: query });
  }

  startCycle(dto: StartCycleDto): Observable<CssdSterilizationCycle> {
    return this.apiClient.post<CssdSterilizationCycle>('/cssd/cycles', dto);
  }

  completeCycle(id: string, dto: CompleteCycleDto): Observable<CssdSterilizationCycle> {
    return this.apiClient.post<CssdSterilizationCycle>(`/cssd/cycles/${id}/complete`, dto);
  }

  failCycle(id: string, dto: FailCycleDto): Observable<CssdSterilizationCycle> {
    return this.apiClient.post<CssdSterilizationCycle>(`/cssd/cycles/${id}/fail`, dto);
  }
}
