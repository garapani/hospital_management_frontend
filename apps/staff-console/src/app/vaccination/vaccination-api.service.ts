import { Injectable, inject } from '@angular/core';
import { ApiClientService } from '@org/api-client';
import { Observable } from 'rxjs';
import { CreateVaccinationRecordDto, VaccinationListResult, VaccinationRecord } from './vaccination.model.js';

export interface ListVaccinationParams {
  patientId?: string;
  vaccine?: string;
  page?: number;
  limit?: number;
}

@Injectable({ providedIn: 'root' })
export class VaccinationApiService {
  private readonly apiClient = inject(ApiClientService);

  list(params: ListVaccinationParams = {}): Observable<VaccinationListResult> {
    const query: Record<string, string | number> = {};
    if (params.patientId) query['patientId'] = params.patientId;
    if (params.vaccine) query['vaccine'] = params.vaccine;
    if (params.page !== undefined) query['page'] = params.page;
    if (params.limit !== undefined) query['limit'] = params.limit;
    return this.apiClient.get<VaccinationListResult>('/vaccination/records', { params: query });
  }

  record(dto: CreateVaccinationRecordDto): Observable<VaccinationRecord> {
    return this.apiClient.post<VaccinationRecord>('/vaccination/records', dto);
  }
}
