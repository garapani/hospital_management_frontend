import { Injectable, inject } from '@angular/core';
import { ApiClientService } from '@org/api-client';
import { Observable } from 'rxjs';
import {
  ApproveCaseDto,
  CaseListResult,
  CreateCaseDto,
  RejectCaseDto,
  SsuCase,
  SsuCaseStatus,
} from './ssu.model.js';

export interface ListCasesParams {
  patientId?: string;
  status?: SsuCaseStatus;
  page?: number;
  limit?: number;
}

@Injectable({ providedIn: 'root' })
export class SsuApiService {
  private readonly apiClient = inject(ApiClientService);

  listCases(params: ListCasesParams = {}): Observable<CaseListResult> {
    const query: Record<string, string | number> = {};
    if (params.patientId) query['patientId'] = params.patientId;
    if (params.status) query['status'] = params.status;
    if (params.page !== undefined) query['page'] = params.page;
    if (params.limit !== undefined) query['limit'] = params.limit;
    return this.apiClient.get<CaseListResult>('/ssu/cases', { params: query });
  }

  getCase(id: string): Observable<SsuCase> {
    return this.apiClient.get<SsuCase>(`/ssu/cases/${id}`);
  }

  createCase(dto: CreateCaseDto): Observable<SsuCase> {
    return this.apiClient.post<SsuCase>('/ssu/cases', dto);
  }

  approveCase(id: string, dto: ApproveCaseDto = {}): Observable<SsuCase> {
    return this.apiClient.post<SsuCase>(`/ssu/cases/${id}/approve`, dto);
  }

  rejectCase(id: string, dto: RejectCaseDto): Observable<SsuCase> {
    return this.apiClient.post<SsuCase>(`/ssu/cases/${id}/reject`, dto);
  }

  closeCase(id: string): Observable<SsuCase> {
    return this.apiClient.post<SsuCase>(`/ssu/cases/${id}/close`, {});
  }
}
