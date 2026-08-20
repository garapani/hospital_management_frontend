import { Injectable, inject } from '@angular/core';
import { ApiClientService } from '@org/api-client';
import { Observable } from 'rxjs';

import {
  EnterReportDto,
  PaginatedRadiologyRequisitions,
  RadiologyImagingItem,
  RadiologyImagingType,
  RadiologyListFilters,
  RadiologyRequisition,
} from './radiology.model.js';

/**
 * Thin wrapper over ApiClientService for the radiology module. ApiClientService already
 * prefixes '/api' and attaches auth/tenant headers — no prefix added here.
 */
@Injectable({ providedIn: 'root' })
export class RadiologyApiService {
  private readonly apiClient = inject(ApiClientService);

  list(filters: RadiologyListFilters = {}): Observable<PaginatedRadiologyRequisitions> {
    const query: Record<string, string | number> = {};
    if (filters.orderItemId) {
      query['orderItemId'] = filters.orderItemId;
    }
    if (filters.status) {
      query['status'] = filters.status;
    }
    if (filters.imagingItemId) {
      query['imagingItemId'] = filters.imagingItemId;
    }
    if (filters.page !== undefined) {
      query['page'] = filters.page;
    }
    if (filters.limit !== undefined) {
      query['limit'] = filters.limit;
    }
    return this.apiClient.get<PaginatedRadiologyRequisitions>('/radiology/requisitions', { params: query });
  }

  getById(id: string): Observable<RadiologyRequisition> {
    return this.apiClient.get<RadiologyRequisition>(`/radiology/requisitions/${id}`);
  }

  markScanned(id: string): Observable<RadiologyRequisition> {
    // The backend resolves the actor from the authenticated tenant context; MarkScannedDto is
    // only a fallback for non-HTTP callers, so no scannedBy is sent.
    return this.apiClient.patch<RadiologyRequisition>(`/radiology/requisitions/${id}/mark-scanned`, {});
  }

  enterReport(id: string, dto: EnterReportDto): Observable<RadiologyRequisition> {
    return this.apiClient.post<RadiologyRequisition>(`/radiology/requisitions/${id}/report`, dto);
  }

  verify(id: string): Observable<RadiologyRequisition> {
    // Same actor-resolution note as markScanned: verifiedBy is resolved from the tenant context.
    return this.apiClient.patch<RadiologyRequisition>(`/radiology/requisitions/${id}/verify`, {});
  }

  cancel(id: string, cancelReason?: string): Observable<RadiologyRequisition> {
    return this.apiClient.patch<RadiologyRequisition>(`/radiology/requisitions/${id}/cancel`, { cancelReason });
  }

  listImagingTypes(): Observable<RadiologyImagingType[]> {
    return this.apiClient.get<RadiologyImagingType[]>('/radiology/types');
  }

  listItemsByType(imagingTypeId: string): Observable<RadiologyImagingItem[]> {
    return this.apiClient.get<RadiologyImagingItem[]>(`/radiology/types/${imagingTypeId}/items`);
  }
}
