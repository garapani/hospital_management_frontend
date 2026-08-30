export type WardStockTransactionType = 'Receive' | 'Consume';

export interface WardStockBalance {
  id: string;
  departmentId: string;
  itemId: string;
  availableQuantity: number;
}

export interface WardStockTransaction {
  id: string;
  departmentId: string;
  itemId: string;
  transactionType: WardStockTransactionType;
  quantity: number;
  patientId: string | null;
  admissionId: string | null;
  performedBy: string;
  performedAt: string;
  remarks: string | null;
}

export interface StockMovementDto {
  departmentId: string;
  itemId: string;
  quantity: number;
  patientId?: string;
  admissionId?: string;
  remarks?: string;
  batchNumber?: string;
  expiryDate?: string;
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
