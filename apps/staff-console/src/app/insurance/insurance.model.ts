/**
 * Models mirroring the backend insurance module
 * (`new/code/apps/api/src/insurance`). Field names are copied exactly from the entities and
 * `InsuranceClaimsService`'s DTOs/result shapes.
 */

export type InsurancePayerType = 'Government' | 'Private';

export interface InsurancePayer {
  id: string;
  name: string;
  type: InsurancePayerType;
  contactPerson: string | null;
  phone: string | null;
  address: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreatePayerDto {
  name: string;
  type: InsurancePayerType;
  contactPerson?: string;
  phone?: string;
  address?: string;
}

export interface UpdatePayerDto {
  name?: string;
  type?: InsurancePayerType;
  contactPerson?: string;
  phone?: string;
  address?: string;
}

export interface PatientPolicy {
  id: string;
  patientId: string;
  payerId: string;
  policyNumber: string;
  insuredName: string | null;
  relationshipToInsured: string | null;
  coverageStartDate: string;
  coverageEndDate: string;
  sumInsured: number;
  copayPercent: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreatePolicyDto {
  patientId: string;
  payerId: string;
  policyNumber: string;
  insuredName?: string;
  relationshipToInsured?: string;
  coverageStartDate: string;
  coverageEndDate: string;
  sumInsured: number;
  copayPercent?: number;
}

export interface CoverageResult {
  eligible: boolean;
  policyId: string;
  payerName: string;
  coverageStartDate: string;
  coverageEndDate: string;
  copayPercent: number;
  sumInsured: number;
  reason?: string;
}

export type InsuranceClaimStatus = 'Draft' | 'Submitted' | 'Approved' | 'Paid' | 'Rejected';

export interface InsuranceClaim {
  id: string;
  claimNumber: string;
  patientId: string;
  policyId: string;
  invoiceId: string;
  amountClaimed: number;
  amountApproved: number | null;
  status: InsuranceClaimStatus;
  remarks: string | null;
  submittedBy: string;
  processedBy: string | null;
  submittedAt: string | null;
  processedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateClaimDto {
  patientId: string;
  policyId: string;
  invoiceId: string;
  amountClaimed: number;
  remarks?: string;
}

/** `{ data, meta }` envelope shared by every `@hospital/pagination`-backed list endpoint. */
export interface PaginatedResponse<T> {
  data: T[];
  meta: { total: number; page: number; limit: number; totalPages: number };
}

const CLAIM_STATUS_SEVERITY: Record<InsuranceClaimStatus, 'success' | 'warn' | 'danger' | 'info' | 'secondary'> = {
  Draft: 'secondary',
  Submitted: 'info',
  Approved: 'warn',
  Paid: 'success',
  Rejected: 'danger',
};

export function claimStatusSeverity(
  status: InsuranceClaimStatus,
): 'success' | 'warn' | 'danger' | 'info' | 'secondary' {
  return CLAIM_STATUS_SEVERITY[status];
}

export function payerTypeSeverity(type: InsurancePayerType): 'info' | 'secondary' {
  return type === 'Government' ? 'info' : 'secondary';
}
