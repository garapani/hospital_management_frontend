export type NursingTaskStatus = 'Pending' | 'InProgress' | 'Completed' | 'Cancelled';

export interface NursingTask {
  id: string;
  admissionId: string;
  taskType: string;
  description: string;
  dueAt: string | null;
  status: NursingTaskStatus;
  assignedTo: string | null;
  completedBy: string | null;
  completedAt: string | null;
}

export interface CreateTaskDto {
  admissionId: string;
  taskType: string;
  description: string;
  dueAt?: string;
  assignedTo?: string;
}

export type MedicationAdministrationStatus = 'Scheduled' | 'Administered' | 'Skipped';

export interface MedicationAdministration {
  id: string;
  admissionId: string;
  drugName: string;
  dose: string;
  route: string | null;
  scheduledAt: string | null;
  status: MedicationAdministrationStatus;
  administeredBy: string | null;
  administeredAt: string | null;
  notes: string | null;
}

export interface CreateAdministrationDto {
  admissionId: string;
  drugName: string;
  dose: string;
  route?: string;
  scheduledAt?: string;
  notes?: string;
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
