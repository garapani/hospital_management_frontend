import { Injectable, inject } from '@angular/core';
import { ApiClientService } from '@org/api-client';
import { Observable } from 'rxjs';
import { CreateSurgeryDto, OtSurgery, OtSurgeryStatus, SurgeryListResult } from './ot.model.js';

export interface ListSurgeriesParams {
  status?: OtSurgeryStatus;
  patientId?: string;
  page?: number;
  limit?: number;
}

@Injectable({ providedIn: 'root' })
export class OtApiService {
  private readonly apiClient = inject(ApiClientService);

  list(params: ListSurgeriesParams = {}): Observable<SurgeryListResult> {
    const query: Record<string, string | number> = {};
    if (params.status) query['status'] = params.status;
    if (params.patientId) query['patientId'] = params.patientId;
    if (params.page !== undefined) query['page'] = params.page;
    if (params.limit !== undefined) query['limit'] = params.limit;
    return this.apiClient.get<SurgeryListResult>('/ot/surgeries', { params: query });
  }

  findOne(id: string): Observable<OtSurgery> {
    return this.apiClient.get<OtSurgery>(`/ot/surgeries/${id}`);
  }

  schedule(dto: CreateSurgeryDto): Observable<OtSurgery> {
    return this.apiClient.post<OtSurgery>('/ot/surgeries', dto);
  }

  start(id: string): Observable<OtSurgery> {
    return this.apiClient.post<OtSurgery>(`/ot/surgeries/${id}/start`, {});
  }

  complete(id: string): Observable<OtSurgery> {
    return this.apiClient.post<OtSurgery>(`/ot/surgeries/${id}/complete`, {});
  }

  cancel(id: string): Observable<OtSurgery> {
    return this.apiClient.post<OtSurgery>(`/ot/surgeries/${id}/cancel`, {});
  }
}
