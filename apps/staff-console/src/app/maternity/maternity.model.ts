export type DeliveryType = 'Normal' | 'C-Section' | 'Instrumental';
export const DELIVERY_TYPES: DeliveryType[] = ['Normal', 'C-Section', 'Instrumental'];

export interface MaternityRecord {
  id: string;
  admissionId: string;
  patientId: string;
  gravida: number;
  para: number;
  lmp: string | null;
  edd: string | null;
  deliveryDate: string | null;
  deliveryType: DeliveryType | null;
  babyCount: number;
  complications: string | null;
  deliveredBy: string | null;
  notes: string | null;
}

export interface CreateMaternityRecordDto {
  admissionId: string;
  patientId: string;
  gravida?: number;
  para?: number;
  lmp?: string;
  edd?: string;
  notes?: string;
}

export interface RecordDeliveryDto {
  deliveryDate: string;
  deliveryType: DeliveryType;
  babyCount: number;
  complications?: string;
  notes?: string;
}

export interface MaternityListResult {
  data: MaternityRecord[];
  total: number;
}
