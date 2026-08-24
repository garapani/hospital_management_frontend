export type SsuCaseStatus = 'Open' | 'Approved' | 'Rejected' | 'Closed';
export const SSU_CASE_STATUSES: SsuCaseStatus[] = ['Open', 'Approved', 'Rejected', 'Closed'];

export interface SsuCase {
  id: string;
  caseNumber: string;
  patientId: string;
  caseType: string;
  eligibilityNotes: string | null;
  subsidyPercent: number;
  status: SsuCaseStatus;
  appliedBy: string;
  approvedBy: string | null;
  approvedAt: string | null;
  decisionNotes: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateCaseDto {
  patientId: string;
  caseType: string;
  eligibilityNotes?: string;
  subsidyPercent?: number;
  appliedBy?: string;
}

export interface ApproveCaseDto {
  decisionNotes?: string;
  approvedBy?: string;
}

export interface RejectCaseDto {
  decisionNotes: string;
  approvedBy?: string;
}

export interface CaseListResult {
  data: SsuCase[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export function ssuStatusSeverity(
  status: SsuCaseStatus,
): 'success' | 'info' | 'warn' | 'danger' | 'secondary' {
  switch (status) {
    case 'Approved':
      return 'success';
    case 'Rejected':
      return 'danger';
    case 'Open':
      return 'info';
    case 'Closed':
      return 'secondary';
    default:
      return 'secondary';
  }
}
