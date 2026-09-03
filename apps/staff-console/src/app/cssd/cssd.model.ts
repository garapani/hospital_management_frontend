export interface CssdInstrument {
  id: string;
  code: string;
  name: string;
  category: string | null;
  quantity: number;
  isActive: boolean;
}

export interface CreateInstrumentDto {
  code: string;
  name: string;
  category?: string;
  quantity?: number;
}

export interface UpdateInstrumentDto {
  name?: string;
  category?: string;
  quantity?: number;
}

export type SterilizationCycleStatus = 'InProgress' | 'Completed' | 'Failed';
export type SterilizationMethod = 'Steam' | 'ETO' | 'Chemical';
export const STERILIZATION_METHODS: SterilizationMethod[] = ['Steam', 'ETO', 'Chemical'];

export type Severity = 'success' | 'warn' | 'danger' | 'info' | 'secondary';

export function cycleStatusSeverity(status: string | null): Severity {
  switch (status) {
    case 'Completed':
      return 'success';
    case 'Failed':
      return 'danger';
    case 'InProgress':
      return 'info';
    default:
      return 'secondary';
  }
}

export interface CssdSterilizationCycle {
  id: string;
  instrumentId: string;
  method: SterilizationMethod;
  startedAt: string | null;
  completedAt: string | null;
  status: SterilizationCycleStatus;
  sterileExpiryAt: string | null;
  operatedBy: string;
  failureReason: string | null;
}

export interface StartCycleDto {
  instrumentId: string;
  method: SterilizationMethod;
}

export interface CompleteCycleDto {
  sterileHours: number;
}

export interface FailCycleDto {
  failureReason: string;
}

export interface PaginatedResult<T> {
  data: T[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}
