export interface FractionRule {
  id: string;
  doctorId: string;
  departmentId: string | null;
  fractionPercent: number;
  isActive: boolean;
}

export type Severity = 'success' | 'warn' | 'danger' | 'info' | 'secondary';

export function ruleStatusSeverity(isActive: boolean): Severity {
  return isActive ? 'success' : 'warn';
}

export interface CreateRuleDto {
  doctorId: string;
  departmentId?: string;
  fractionPercent: number;
}

export interface FractionEntry {
  id: string;
  invoiceId: string;
  doctorId: string;
  fractionPercent: number;
  baseAmount: number;
  shareAmount: number;
  recordedBy: string;
  createdAt: string;
}

export interface CreateEntryDto {
  invoiceId: string;
  doctorId: string;
  ruleId?: string;
  baseAmount?: number;
}

export interface PaginatedResult<T> {
  data: T[];
  total: number;
}
