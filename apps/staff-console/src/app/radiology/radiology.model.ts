/**
 * Radiology domain model — field names mirror the backend radiology module
 * (entities/radiology-requisition.entity.ts, entities/radiology-imaging-type.entity.ts,
 * entities/radiology-imaging-item.entity.ts, dto/enter-report.dto.ts).
 */

export interface RadiologyOrderItem {
  id: string;
  orderId: string;
  itemType: string;
  itemDescription: string;
  priority: string;
  status: string;
  completedBy: string | null;
  completedAt: string | null;
  cancelReason: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface RadiologyRequisition {
  id: string;
  orderItemId: string;
  imagingItemId: string;
  requisitionNumber: string;
  status: string; // 'Pending' | 'Scanned' | 'ReportEntered' | 'Verified' | 'Cancelled'
  scannedBy: string | null;
  scannedAt: string | null;
  reportText: string | null;
  indication: string | null;
  performerId: string | null;
  reportEnteredBy: string | null;
  reportEnteredAt: string | null;
  verifiedBy: string | null;
  verifiedAt: string | null;
  cancelReason: string | null;
  createdAt: string;
  updatedAt: string;
  /** Joined by the list endpoint (leftJoinAndSelect orderItem); not present on getById. */
  orderItem?: RadiologyOrderItem | null;
}

export interface RadiologyImagingType {
  id: string;
  name: string;
  procedureCoding: string | null;
  displaySequence: number;
  createdAt: string;
  updatedAt: string;
}

export interface RadiologyImagingItem {
  id: string;
  imagingTypeId: string;
  name: string;
  procedureCode: string | null;
  displaySequence: number;
  price: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface EnterReportDto {
  reportText: string;
  indication?: string;
  reportEnteredBy?: string;
}

export interface RadiologyListFilters {
  orderItemId?: string;
  status?: string;
  imagingItemId?: string;
  page?: number;
  limit?: number;
}

export interface PaginatedRadiologyRequisitions {
  data: RadiologyRequisition[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export const RADIOLOGY_STATUSES = ['Pending', 'Scanned', 'ReportEntered', 'Verified', 'Cancelled'];

export const NON_TERMINAL_RADIOLOGY_STATUSES = ['Pending', 'Scanned', 'ReportEntered'];

const STATUS_SEVERITY: Record<string, 'success' | 'warn' | 'danger' | 'info' | 'secondary'> = {
  Pending: 'warn',
  Scanned: 'info',
  ReportEntered: 'info',
  Verified: 'success',
  Cancelled: 'danger',
};

export function radiologyStatusSeverity(status: string): 'success' | 'warn' | 'danger' | 'info' | 'secondary' {
  return STATUS_SEVERITY[status] ?? 'secondary';
}
