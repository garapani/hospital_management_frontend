import { Injectable, inject } from '@angular/core';
import { ApiClientService } from '@org/api-client';
import { Observable } from 'rxjs';
import {
  CoverageResult,
  CreateClaimDto,
  CreatePayerDto,
  CreatePolicyDto,
  InsuranceClaim,
  InsuranceClaimStatus,
  InsurancePayer,
  PaginatedResponse,
  PatientPolicy,
  UpdatePayerDto,
} from './insurance.model.js';

export interface ListPoliciesParams {
  patientId?: string;
  page?: number;
  limit?: number;
}

export interface ListClaimsParams {
  patientId?: string;
  status?: InsuranceClaimStatus;
  page?: number;
  limit?: number;
}

@Injectable({ providedIn: 'root' })
export class InsuranceApiService {
  private readonly api = inject(ApiClientService);

  // Payers
  listPayers(): Observable<InsurancePayer[]> {
    return this.api.get<InsurancePayer[]>('/insurance/payers');
  }

  createPayer(dto: CreatePayerDto): Observable<InsurancePayer> {
    return this.api.post<InsurancePayer>('/insurance/payers', dto);
  }

  updatePayer(id: string, dto: UpdatePayerDto): Observable<InsurancePayer> {
    return this.api.patch<InsurancePayer>(`/insurance/payers/${id}`, dto);
  }

  deactivatePayer(id: string): Observable<InsurancePayer> {
    return this.api.patch<InsurancePayer>(`/insurance/payers/${id}/deactivate`, {});
  }

  reactivatePayer(id: string): Observable<InsurancePayer> {
    return this.api.patch<InsurancePayer>(`/insurance/payers/${id}/reactivate`, {});
  }

  // Policies
  listPolicies(params: ListPoliciesParams = {}): Observable<PaginatedResponse<PatientPolicy>> {
    const query: Record<string, string | number> = {};
    if (params.patientId) query['patientId'] = params.patientId;
    if (params.page !== undefined) query['page'] = params.page;
    if (params.limit !== undefined) query['limit'] = params.limit;
    return this.api.get<PaginatedResponse<PatientPolicy>>('/insurance/policies', { params: query });
  }

  createPolicy(dto: CreatePolicyDto): Observable<PatientPolicy> {
    return this.api.post<PatientPolicy>('/insurance/policies', dto);
  }

  deactivatePolicy(id: string): Observable<PatientPolicy> {
    return this.api.patch<PatientPolicy>(`/insurance/policies/${id}/deactivate`, {});
  }

  reactivatePolicy(id: string): Observable<PatientPolicy> {
    return this.api.patch<PatientPolicy>(`/insurance/policies/${id}/reactivate`, {});
  }

  checkCoverage(policyId: string, date?: string): Observable<CoverageResult> {
    return this.api.get<CoverageResult>(`/insurance/policies/${policyId}/coverage`, {
      params: date ? { date } : {},
    });
  }

  // Claims
  listClaims(params: ListClaimsParams = {}): Observable<PaginatedResponse<InsuranceClaim>> {
    const query: Record<string, string | number> = {};
    if (params.patientId) query['patientId'] = params.patientId;
    if (params.status) query['status'] = params.status;
    if (params.page !== undefined) query['page'] = params.page;
    if (params.limit !== undefined) query['limit'] = params.limit;
    return this.api.get<PaginatedResponse<InsuranceClaim>>('/insurance/claims', { params: query });
  }

  createClaim(dto: CreateClaimDto): Observable<InsuranceClaim> {
    return this.api.post<InsuranceClaim>('/insurance/claims', dto);
  }

  submitClaim(id: string): Observable<InsuranceClaim> {
    return this.api.post<InsuranceClaim>(`/insurance/claims/${id}/submit`, {});
  }

  approveClaim(id: string, amountApproved: number): Observable<InsuranceClaim> {
    return this.api.post<InsuranceClaim>(`/insurance/claims/${id}/approve`, { amountApproved });
  }

  rejectClaim(id: string, remarks: string): Observable<InsuranceClaim> {
    return this.api.post<InsuranceClaim>(`/insurance/claims/${id}/reject`, { remarks });
  }

  markClaimPaid(id: string): Observable<InsuranceClaim> {
    return this.api.post<InsuranceClaim>(`/insurance/claims/${id}/pay`, {});
  }
}
