export interface VaccinationRecord {
  id: string;
  patientId: string;
  vaccine: string;
  doseNumber: number;
  administeredDate: string;
  batchNumber: string | null;
  administeredBy: string;
  notes: string | null;
}

export interface CreateVaccinationRecordDto {
  patientId: string;
  vaccine: string;
  doseNumber?: number;
  administeredDate: string;
  batchNumber?: string;
  notes?: string;
}

export interface VaccinationListResult {
  data: VaccinationRecord[];
  total: number;
}
