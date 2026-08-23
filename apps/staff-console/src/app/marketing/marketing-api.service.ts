import { Injectable, inject } from '@angular/core';
import { ApiClientService } from '@org/api-client';
import { Observable } from 'rxjs';
import { CreateSourceDto, PaginatedResult, PatientReferral, RecordReferralDto, ReferralSource } from './marketing.model.js';

@Injectable({ providedIn: 'root' })
export class MarketingApiService {
  private readonly apiClient = inject(ApiClientService);

  listSources(): Observable<ReferralSource[]> {
    return this.apiClient.get<ReferralSource[]>('/marketing/sources');
  }

  createSource(dto: CreateSourceDto): Observable<ReferralSource> {
    return this.apiClient.post<ReferralSource>('/marketing/sources', dto);
  }

  deactivateSource(id: string): Observable<ReferralSource> {
    return this.apiClient.patch<ReferralSource>(`/marketing/sources/${id}/deactivate`, {});
  }

  reactivateSource(id: string): Observable<ReferralSource> {
    return this.apiClient.patch<ReferralSource>(`/marketing/sources/${id}/reactivate`, {});
  }

  listReferrals(patientId?: string): Observable<PaginatedResult<PatientReferral>> {
    const query: Record<string, string> = {};
    if (patientId) query['patientId'] = patientId;
    return this.apiClient.get<PaginatedResult<PatientReferral>>('/marketing/referrals', { params: query });
  }

  recordReferral(dto: RecordReferralDto): Observable<PatientReferral> {
    return this.apiClient.post<PatientReferral>('/marketing/referrals', dto);
  }
}
