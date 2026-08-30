export type OtSurgeryStatus = 'Scheduled' | 'InProgress' | 'Completed' | 'Cancelled';

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
