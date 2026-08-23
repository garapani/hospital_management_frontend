export type ReferralSourceType = 'Doctor' | 'Walk-in' | 'Advertising' | 'Social Media' | 'Other';
export const REFERRAL_SOURCE_TYPES: ReferralSourceType[] = ['Doctor', 'Walk-in', 'Advertising', 'Social Media', 'Other'];

export interface ReferralSource {
  id: string;
  name: string;
  sourceType: ReferralSourceType;
  isActive: boolean;
}

export interface CreateSourceDto {
  name: string;
  sourceType?: ReferralSourceType;
}

export interface PatientReferral {
  id: string;
  patientId: string;
  sourceId: string;
  referredByDoctorId: string | null;
  referredAt: string;
  notes: string | null;
  recordedBy: string;
}

export interface RecordReferralDto {
  patientId: string;
  sourceId: string;
  referredByDoctorId?: string;
  notes?: string;
}

export interface PaginatedResult<T> {
  data: T[];
  total: number;
}
