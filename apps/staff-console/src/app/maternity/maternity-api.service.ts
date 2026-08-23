import { Injectable, inject } from '@angular/core';
import { ApiClientService } from '@org/api-client';
import { Observable } from 'rxjs';
import { CreateMaternityRecordDto, MaternityListResult, MaternityRecord, RecordDeliveryDto } from './maternity.model.js';

export interface ListMaternityParams {
  patientId?: string;
  admissionId?: string;
  page?: number;
  limit?: number;
}

@Injectable({ providedIn: 'root' })
export class MaternityApiService {
  private readonly apiClient = inject(ApiClientService);

  list(params: ListMaternityParams = {}): Observable<MaternityListResult> {
    const query: Record<string, string | number> = {};
    if (params.patientId) query['patientId'] = params.patientId;
    if (params.admissionId) query['admissionId'] = params.admissionId;
    if (params.page !== undefined) query['page'] = params.page;
    if (params.limit !== undefined) query['limit'] = params.limit;
    return this.apiClient.get<MaternityListResult>('/maternity/records', { params: query });
  }

  findOne(id: string): Observable<MaternityRecord> {
    return this.apiClient.get<MaternityRecord>(`/maternity/records/${id}`);
  }

  create(dto: CreateMaternityRecordDto): Observable<MaternityRecord> {
    return this.apiClient.post<MaternityRecord>('/maternity/records', dto);
  }

  recordDelivery(id: string, dto: RecordDeliveryDto): Observable<MaternityRecord> {
    return this.apiClient.post<MaternityRecord>(`/maternity/records/${id}/delivery`, dto);
  }
}
