import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiClientService } from '@org/api-client';

export type LabRequisitionStatus = 'Pending' | 'SampleCollected' | 'ResultsEntered' | 'Verified' | 'Cancelled';

export interface LabRequisition {
  id: string;
  orderItemId: string;
  /** Resolved server-side via the order item's order — null only if the join somehow misses. */
  patientId: string | null;
  testId: string;
  requisitionNumber: string;
  specimenType: string;
  status: LabRequisitionStatus;
  sampleCollectedBy: string | null;
  sampleCollectedAt: string | null;
  verifiedBy: string | null;
  verifiedAt: string | null;
  cancelReason: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface LabResult {
  id: string;
  requisitionId: string;
  componentId: string;
  value: string;
  isAbnormal: boolean;
  enteredBy: string;
  enteredAt: string;
}

export interface LabTestCategory {
  id: string;
  name: string;
  displaySequence: number;
  createdAt: string;
  updatedAt: string;
}

export interface LabTest {
  id: string;
  categoryId: string;
  name: string;
  code: string;
  specimenType: string;
  price: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface LabTestComponent {
  id: string;
  testId: string;
  name: string;
  unit: string | null;
  referenceRangeLow: string | null;
  referenceRangeHigh: string | null;
  referenceRangeText: string | null;
  displaySequence: number;
  createdAt: string;
  updatedAt: string;
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

export interface ListRequisitionsParams {
  orderItemId?: string;
  status?: LabRequisitionStatus;
  page?: number;
  limit?: number;
}

export interface EnterResultDto {
  componentId: string;
  value: string;
  isAbnormal?: boolean;
  enteredBy?: string;
}

export interface CreateRequisitionDto {
  orderItemId: string;
  testId: string;
  specimenType: string;
}

@Injectable({ providedIn: 'root' })
export class LabApiService {
  private readonly apiClient = inject(ApiClientService);

  listRequisitions(params: ListRequisitionsParams): Observable<PaginatedResponse<LabRequisition>> {
    return this.apiClient.get<PaginatedResponse<LabRequisition>>('/lab/requisitions', {
      params: {
        ...(params.orderItemId ? { orderItemId: params.orderItemId } : {}),
        ...(params.status ? { status: params.status } : {}),
        ...(params.page !== undefined ? { page: params.page } : {}),
        ...(params.limit !== undefined ? { limit: params.limit } : {}),
      },
    });
  }

  getRequisition(id: string): Observable<LabRequisition> {
    return this.apiClient.get<LabRequisition>(`/lab/requisitions/${id}`);
  }

  createRequisition(dto: CreateRequisitionDto): Observable<LabRequisition> {
    return this.apiClient.post<LabRequisition>('/lab/requisitions', dto);
  }

  collectSample(id: string, sampleCollectedBy?: string): Observable<LabRequisition> {
    return this.apiClient.patch<LabRequisition>(`/lab/requisitions/${id}/collect-sample`, {
      ...(sampleCollectedBy ? { sampleCollectedBy } : {}),
    });
  }

  enterResult(id: string, dto: EnterResultDto): Observable<LabResult> {
    return this.apiClient.post<LabResult>(`/lab/requisitions/${id}/results`, dto);
  }

  getResults(id: string): Observable<LabResult[]> {
    return this.apiClient.get<LabResult[]>(`/lab/requisitions/${id}/results`);
  }

  verify(id: string, verifiedBy?: string): Observable<LabRequisition> {
    return this.apiClient.patch<LabRequisition>(`/lab/requisitions/${id}/verify`, {
      ...(verifiedBy ? { verifiedBy } : {}),
    });
  }

  cancel(id: string, cancelReason?: string): Observable<LabRequisition> {
    return this.apiClient.patch<LabRequisition>(`/lab/requisitions/${id}/cancel`, {
      ...(cancelReason ? { cancelReason } : {}),
    });
  }

  listCategories(): Observable<LabTestCategory[]> {
    return this.apiClient.get<LabTestCategory[]>('/lab/categories');
  }

  listTestsByCategory(categoryId: string): Observable<LabTest[]> {
    return this.apiClient.get<LabTest[]>(`/lab/categories/${categoryId}/tests`);
  }

  listComponentsByTest(testId: string): Observable<LabTestComponent[]> {
    return this.apiClient.get<LabTestComponent[]>(`/lab/tests/${testId}/components`);
  }
}
