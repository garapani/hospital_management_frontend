import { Injectable, inject } from '@angular/core';
import { ApiClientService } from '@org/api-client';
import { Observable } from 'rxjs';

/**
 * Field names below mirror the backend inventory module exactly
 * (new/code/apps/api/src/inventory — entities/*.entity.ts and dto/*.dto.ts).
 * Numeric columns without a transformer (purchase order items, requisition items,
 * reorder levels) serialize from Postgres as strings — copied as-is.
 */

export interface InventoryItemCategory {
  id: string;
  name: string;
  displaySequence: number;
  createdAt: string;
  updatedAt: string;
}

export interface InventoryItemSubCategory {
  id: string;
  categoryId: string;
  name: string;
  isConsumable: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface InventoryItem {
  id: string;
  subCategoryId: string;
  name: string;
  code: string;
  unitOfMeasure: string;
  reorderLevel: string;
  minimumStock: string;
  /** Selling price in INR; null = not priced yet. Transformed to a number by the backend. */
  salePrice: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface InventoryVendor {
  id: string;
  name: string;
  contactPerson: string | null;
  phone: string | null;
  address: string | null;
  createdAt: string;
  updatedAt: string;
}

export type PurchaseOrderStatus = 'Ordered' | 'PartiallyReceived' | 'Received' | 'Cancelled';

export interface PurchaseOrder {
  id: string;
  vendorId: string;
  purchaseOrderNumber: string;
  orderedBy: string;
  orderedAt: string;
  status: PurchaseOrderStatus;
  notes: string | null;
  cancelReason: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface PurchaseOrderItem {
  id: string;
  purchaseOrderId: string;
  itemId: string;
  orderedQuantity: string;
  receivedQuantity: string;
  unitCost: string;
  createdAt: string;
  updatedAt: string;
}

/** GET /inventory/purchase-orders/:id returns the order with its lines. */
export type PurchaseOrderDetail = PurchaseOrder & { items: PurchaseOrderItem[] };

export type StockRequisitionStatus = 'Pending' | 'PartiallyFulfilled' | 'Fulfilled' | 'Cancelled';

export interface StockRequisition {
  id: string;
  departmentId: string;
  requestedBy: string;
  requisitionNumber: string;
  status: StockRequisitionStatus;
  notes: string | null;
  cancelReason: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface StockRequisitionItem {
  id: string;
  requisitionId: string;
  itemId: string;
  requestedQuantity: string;
  fulfilledQuantity: string;
  createdAt: string;
  updatedAt: string;
}

/** GET /inventory/requisitions/:id returns the requisition with its lines. */
export type StockRequisitionDetail = StockRequisition & { items: StockRequisitionItem[] };

export interface CreatePurchaseOrderItemDto {
  itemId: string;
  orderedQuantity: number;
  unitCost: number;
}

export interface CreatePurchaseOrderDto {
  vendorId: string;
  notes?: string;
  items: CreatePurchaseOrderItemDto[];
}

export interface FulfillRequisitionItemDto {
  quantity: number;
}

export interface CreateStockRequisitionItemDto {
  itemId: string;
  requestedQuantity: number;
}

export interface CreateStockRequisitionDto {
  departmentId: string;
  notes?: string;
  items: CreateStockRequisitionItemDto[];
}

export interface RecordGoodsReceiptDto {
  batchNumber: string;
  expiryDate?: string;
  unitCost: number;
  mrp?: number;
  receivedQuantity: number;
}

export interface PurchaseOrderFilters {
  vendorId?: string;
  page?: number;
  limit?: number;
}

export interface StockRequisitionFilters {
  departmentId?: string;
  page?: number;
  limit?: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

@Injectable({ providedIn: 'root' })
export class InventoryApiService {
  private readonly api = inject(ApiClientService);

  // ---- Catalog (categories / sub-categories / items / vendors) ----

  listCategories(): Observable<InventoryItemCategory[]> {
    return this.api.get<InventoryItemCategory[]>('/inventory/categories');
  }

  listSubCategories(categoryId: string): Observable<InventoryItemSubCategory[]> {
    return this.api.get<InventoryItemSubCategory[]>(`/inventory/categories/${categoryId}/sub-categories`);
  }

  listItemsBySubCategory(subCategoryId: string): Observable<InventoryItem[]> {
    return this.api.get<InventoryItem[]>(`/inventory/sub-categories/${subCategoryId}/items`);
  }

  listVendors(): Observable<InventoryVendor[]> {
    return this.api.get<InventoryVendor[]>('/inventory/vendors');
  }

  // ---- Procurement (purchase orders) ----

  listPurchaseOrders(filters: PurchaseOrderFilters) {
    return this.api.get<PaginatedResponse<PurchaseOrder>>('/inventory/purchase-orders', {
      params: {
        ...(filters.vendorId ? { vendorId: filters.vendorId } : {}),
        ...(filters.page !== undefined ? { page: filters.page } : {}),
        ...(filters.limit !== undefined ? { limit: filters.limit } : {}),
      },
    });
  }

  getPurchaseOrder(id: string): Observable<PurchaseOrderDetail> {
    return this.api.get<PurchaseOrderDetail>(`/inventory/purchase-orders/${id}`);
  }

  createPurchaseOrder(data: CreatePurchaseOrderDto): Observable<PurchaseOrderDetail> {
    return this.api.post<PurchaseOrderDetail>('/inventory/purchase-orders', data);
  }

  cancelPurchaseOrder(id: string, cancelReason?: string): Observable<PurchaseOrderDetail> {
    return this.api.patch<PurchaseOrderDetail>(`/inventory/purchase-orders/${id}/cancel`, { cancelReason });
  }

  recordGoodsReceipt(
    purchaseOrderItemId: string,
    data: RecordGoodsReceiptDto,
  ): Observable<PurchaseOrderItem> {
    return this.api.post<PurchaseOrderItem>(
      `/inventory/purchase-orders/items/${purchaseOrderItemId}/goods-receipt`,
      data,
    );
  }

  // ---- Requisitions (dispatch) ----

  createRequisition(data: CreateStockRequisitionDto): Observable<StockRequisitionDetail> {
    return this.api.post<StockRequisitionDetail>('/inventory/requisitions', data);
  }

  cancelRequisition(id: string, cancelReason?: string): Observable<StockRequisitionDetail> {
    return this.api.patch<StockRequisitionDetail>(`/inventory/requisitions/${id}/cancel`, { cancelReason });
  }

  listRequisitions(filters: StockRequisitionFilters) {
    return this.api.get<PaginatedResponse<StockRequisition>>('/inventory/requisitions', {
      params: {
        ...(filters.departmentId ? { departmentId: filters.departmentId } : {}),
        ...(filters.page !== undefined ? { page: filters.page } : {}),
        ...(filters.limit !== undefined ? { limit: filters.limit } : {}),
      },
    });
  }

  getRequisition(id: string): Observable<StockRequisitionDetail> {
    return this.api.get<StockRequisitionDetail>(`/inventory/requisitions/${id}`);
  }

  fulfillRequisitionItem(
    stockRequisitionItemId: string,
    data: FulfillRequisitionItemDto,
  ): Observable<StockRequisitionItem> {
    return this.api.post<StockRequisitionItem>(
      `/inventory/requisitions/items/${stockRequisitionItemId}/fulfill`,
      data,
    );
  }
}
