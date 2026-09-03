export type OtSurgeryStatus = 'Scheduled' | 'InProgress' | 'Completed' | 'Cancelled';

export type Severity = 'success' | 'warn' | 'danger' | 'info' | 'secondary';

export function otSurgeryStatusSeverity(status: string): Severity {
  switch (status) {
    case 'Completed':
      return 'success';
    case 'InProgress':
      return 'info';
    case 'Scheduled':
      return 'warn';
    case 'Cancelled':
      return 'danger';
    default:
      return 'secondary';
  }
}

export interface OtSurgery {
  id: string;
  surgeryNumber: string;
  patientId: string;
  admissionId: string | null;
  procedureName: string;
  otRoom: string | null;
  scheduledAt: string | null;
  surgeonId: string | null;
  anesthesiologistId: string | null;
  status: OtSurgeryStatus;
  startedAt: string | null;
  endedAt: string | null;
  notes: string | null;
}

export interface CreateSurgeryDto {
  patientId: string;
  admissionId?: string;
  procedureName: string;
  otRoom?: string;
  scheduledAt?: string;
  surgeonId?: string;
  anesthesiologistId?: string;
  notes?: string;
}

export interface SurgeryListResult {
  data: OtSurgery[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}
