export type Severity = 'success' | 'warn' | 'danger' | 'info' | 'secondary';

const STATUS_SEVERITY: Record<string, Severity> = {
  Admitted: 'info',
  Discharged: 'success',
};

export function admissionStatusSeverity(status: string): Severity {
  return STATUS_SEVERITY[status] ?? 'secondary';
}

const SOURCE_SEVERITY: Record<string, Severity> = {
  OPD: 'info',
  ER: 'danger',
  Direct: 'warn',
};

export function admissionSourceSeverity(source: string): Severity {
  return SOURCE_SEVERITY[source] ?? 'secondary';
}

export function summaryReviewSeverity(summary: { reviewedBy: string | null } | null): Severity {
  return summary?.reviewedBy ? 'success' : 'warn';
}

export const ADMISSION_STATUSES = ['Admitted', 'Discharged'];
export const ADMISSION_SOURCES = ['OPD', 'ER', 'Direct'];

const BED_STATUS_SEVERITY: Record<string, Severity> = {
  Available: 'success',
  Occupied: 'info',
  Maintenance: 'warn',
};

export function bedStatusSeverity(status: string): Severity {
  return BED_STATUS_SEVERITY[status] ?? 'secondary';
}
