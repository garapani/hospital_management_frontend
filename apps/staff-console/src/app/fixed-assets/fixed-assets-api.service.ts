import { Injectable, inject } from '@angular/core';
import { ApiClientService } from '@org/api-client';
import { Observable } from 'rxjs';
import {
  CreateFixedAssetDto,
  FixedAsset,
  FixedAssetCategory,
  FixedAssetCondition,
  FixedAssetValuation,
  PaginatedResult,
} from './fixed-assets.model.js';

export interface ListAssetsParams {
  categoryId?: string;
  condition?: FixedAssetCondition;
  page?: number;
  limit?: number;
}

@Injectable({ providedIn: 'root' })
export class FixedAssetsApiService {
  private readonly apiClient = inject(ApiClientService);

  listCategories(): Observable<FixedAssetCategory[]> {
    return this.apiClient.get<FixedAssetCategory[]>('/fixed-assets/categories');
  }

  createCategory(name: string): Observable<FixedAssetCategory> {
    return this.apiClient.post<FixedAssetCategory>('/fixed-assets/categories', { name });
  }

  deactivateCategory(id: string): Observable<FixedAssetCategory> {
    return this.apiClient.patch<FixedAssetCategory>(`/fixed-assets/categories/${id}/deactivate`, {});
  }

  reactivateCategory(id: string): Observable<FixedAssetCategory> {
    return this.apiClient.patch<FixedAssetCategory>(`/fixed-assets/categories/${id}/reactivate`, {});
  }

  listAssets(params: ListAssetsParams = {}): Observable<PaginatedResult<FixedAsset>> {
    const query: Record<string, string | number> = {};
    if (params.categoryId) query['categoryId'] = params.categoryId;
    if (params.condition) query['condition'] = params.condition;
    if (params.page !== undefined) query['page'] = params.page;
    if (params.limit !== undefined) query['limit'] = params.limit;
    return this.apiClient.get<PaginatedResult<FixedAsset>>('/fixed-assets', { params: query });
  }

  createAsset(dto: CreateFixedAssetDto): Observable<FixedAsset> {
    return this.apiClient.post<FixedAsset>('/fixed-assets', dto);
  }

  getValuation(id: string): Observable<FixedAssetValuation> {
    return this.apiClient.get<FixedAssetValuation>(`/fixed-assets/${id}/valuation`);
  }

  deactivateAsset(id: string): Observable<FixedAsset> {
    return this.apiClient.patch<FixedAsset>(`/fixed-assets/${id}/deactivate`, {});
  }

  reactivateAsset(id: string): Observable<FixedAsset> {
    return this.apiClient.patch<FixedAsset>(`/fixed-assets/${id}/reactivate`, {});
  }
}
