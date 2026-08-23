export interface FixedAssetCategory {
  id: string;
  name: string;
  isActive: boolean;
}

export type FixedAssetCondition = 'In Service' | 'Under Repair' | 'Retired';
export const FIXED_ASSET_CONDITIONS: FixedAssetCondition[] = ['In Service', 'Under Repair', 'Retired'];

export interface FixedAsset {
  id: string;
  assetCode: string;
  categoryId: string;
  name: string;
  description: string | null;
  purchaseDate: string;
  purchaseCost: number;
  supplierName: string | null;
  departmentId: string | null;
  condition: FixedAssetCondition;
  depreciationMethod: string;
  usefulLifeYears: number | null;
  salvageValue: number;
  isActive: boolean;
}

export interface CreateFixedAssetDto {
  categoryId: string;
  name: string;
  description?: string;
  purchaseDate: string;
  purchaseCost: number;
  supplierName?: string;
  departmentId?: string;
  condition?: FixedAssetCondition;
  usefulLifeYears?: number;
  salvageValue?: number;
}

export interface FixedAssetValuation {
  purchaseCost: number;
  salvageValue: number;
  usefulLifeYears: number | null;
  monthsInService: number;
  annualDepreciation: number | null;
  accumulatedDepreciation: number;
  bookValue: number;
}

export interface PaginatedResult<T> {
  data: T[];
  total: number;
}
