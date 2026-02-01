/**
 * Secondary Offer Types
 * Type definitions for secondary offers module
 */

export type OfferType =
  | "FLAT_DISCOUNT_PCT"
  | "FLAT_DISCOUNT_AMT"
  | "DISCOUNT_SLAB_PCT"
  | "DISCOUNT_SLAB_AMT"
  | "SKU_DISCOUNT_AMOUNT"
  | "FREE_PRODUCT"
  | "BUNDLE_OFFER"
  | "BOGO"
  | "BOGO_DIFFERENT_SKU"
  | "CASHBACK"
  | "VOLUME_DISCOUNT"
  | "CROSS_CATEGORY"
  | "FIRST_ORDER"
  | "LOYALTY_POINTS"
  | "FLASH_SALE";

export type OfferStatus = "Draft" | "Active" | "Paused" | "Expired" | "Completed";
export type ProductSegment = "BIS" | "BEV";
export type SelectionMode = "include" | "exclude";
export type OutletSelectionMode = "all" | "specific" | "filtered";

export interface TerritorySelection {
  ids: string[];
  mode: SelectionMode;
}

export interface DistributorSelection {
  ids: string[];
  mode: SelectionMode;
  applyToAllRoutes: boolean;
}

export interface RouteSelection {
  ids: string[];
  mode: SelectionMode;
  applyToAllOutlets: boolean;
}

export interface OutletFilters {
  outletTypes?: string[];
  channels?: string[];
  minMarketSize?: number;
  maxMarketSize?: number;
}

export interface OutletSelection {
  selectionMode: OutletSelectionMode;
  ids: string[];
  mode: SelectionMode;
  filters?: OutletFilters;
}

export interface TerritoryScope {
  zones?: TerritorySelection;
  regions?: TerritorySelection;
  areas?: TerritorySelection;
  db_points?: TerritorySelection;
}

export interface Targeting {
  distributors?: DistributorSelection;
  routes?: RouteSelection;
}

export interface DiscountSlab {
  minValue: number;
  maxValue: number;
  discountPercentage?: number;
  discountAmount?: number;
}

export interface VolumeSlab {
  minQuantity: number;
  maxQuantity: number;
  discountPercentage: number;
}

export interface BuyProduct {
  productId: string;
  quantity: number;
}

export interface GetProduct {
  productId: string;
  quantity: number;
  discountPercentage?: number;
  isPromotionalGift?: boolean;
}

export interface QualifierProduct {
  productId: string;
  minQuantity: number;
}

export interface RewardProduct {
  productId: string;
  freeQuantity: number;
  maxValueCap?: number;
}

export interface SKUDiscount {
  productId: string;
  discountAmount: number;
  startDate: Date | string;
  endDate: Date | string;
}

export interface OfferConfig {
  selectedProducts?: string[];
  applyToAllProducts?: boolean;
  discountPercentage?: number;
  discountAmount?: number;
  minOrderValue?: number;
  maxDiscountAmount?: number;
  slabs?: DiscountSlab[];
  volumeSlabs?: VolumeSlab[];
  buyProducts?: BuyProduct[];
  getProducts?: GetProduct[];
  bundlePrice?: number;
  buyQuantity?: number;
  getQuantity?: number;
  skuDiscounts?: SKUDiscount[];
  cashbackPercentage?: number;
  cashbackAmount?: number;
  maxCashback?: number;
  pointsPerUnit?: number;
  pointsValue?: number;
  stockLimit?: number;
  orderLimit?: number;
  requiredCategories?: string[];
  minCategoriesRequired?: number;
  firstOrderOnly?: boolean;
  qualifierProducts?: QualifierProduct[];
  rewardProducts?: RewardProduct[];
  qualifierLogic?: "AND" | "OR";
  distributionMode?: "all" | "choice";
  allowRepetition?: boolean;
  maxRewardSets?: number;
}

export interface OfferStats {
  totalOrders: number;
  totalRevenue: number;
  totalDiscount: number;
  uniqueOutlets: number;
  uniqueDistributors: number;
}

export interface SecondaryOffer {
  _id: string;
  name: string;
  offer_type: OfferType;
  product_segments: ProductSegment[];
  start_date: string | Date;
  end_date: string | Date;
  status: OfferStatus;
  active: boolean;
  territories: TerritoryScope;
  targeting: Targeting;
  outlets: OutletSelection;
  config: OfferConfig;
  resolvedOutlets: string[];
  stats: OfferStats;
  created_by?: {
    _id: string;
    name: string;
    email: string;
  };
  updated_by?: {
    _id: string;
    name: string;
    email: string;
  };
  approved_by?: {
    _id: string;
    name: string;
    email: string;
  };
  approved_at?: string | Date;
  description?: string;
  internal_notes?: string;
  createdAt: string | Date;
  updatedAt: string | Date;
  isCurrentlyActive?: boolean;
  hasExpired?: boolean;
}

export interface CreateSecondaryOfferInput {
  name: string;
  offer_type: OfferType;
  product_segments: ProductSegment[];
  start_date: Date | string;
  end_date: Date | string;
  status?: OfferStatus;
  active?: boolean;
  territories?: TerritoryScope;
  targeting?: Targeting;
  outlets?: OutletSelection;
  config?: OfferConfig;
  appliesToDistributorStock?: boolean; // Default: true
  description?: string;
  internal_notes?: string;
}

export interface UpdateSecondaryOfferInput extends Partial<CreateSecondaryOfferInput> {}

export interface SecondaryOfferFilters {
  status?: OfferStatus;
  offer_type?: OfferType;
  active?: boolean;
  search?: string;
  page?: number;
  limit?: number;
}

export interface SecondaryOfferListResponse {
  success: boolean;
  data: SecondaryOffer[];
  total: number;
  pagination?: {
    page: number;
    limit: number;
    totalPages: number;
  };
}

export interface SecondaryOfferResponse {
  success: boolean;
  data: SecondaryOffer;
  message?: string;
}

export interface OutletResolutionResponse {
  success: boolean;
  data: {
    totalOutlets: number;
    outlets: any[];
    outletIds: string[];
  };
}

export interface EligibleRoutesResponse {
  success: boolean;
  data: any[];
  count: number;
}

// Form data interfaces for wizard steps
export interface SecondaryOfferFormData {
  // Step 1: Basic Info
  name: string;
  offer_type: OfferType;
  product_segments: ProductSegment[];
  start_date: Date | null;
  end_date: Date | null;
  status: OfferStatus;
  active: boolean;
  description: string;

  // Step 2: Territories (inherited from primary offers)
  territories: TerritoryScope;

  // Step 3: Distributors & Routes
  targeting: Targeting;

  // Step 4: Outlet Targeting
  outlets: OutletSelection;

  // Step 5: Offer Configuration (same as primary offers)
  config: OfferConfig;

  // Stock Application
  appliesToDistributorStock: boolean;

  // Additional
  internal_notes: string;
}

export const OFFER_TYPE_LABELS: Record<OfferType, string> = {
  FLAT_DISCOUNT_PCT: "Flat Discount (%)",
  FLAT_DISCOUNT_AMT: "Flat Discount (Amount)",
  DISCOUNT_SLAB_PCT: "Discount Slab (%)",
  DISCOUNT_SLAB_AMT: "Discount Slab (Amount)",
  SKU_DISCOUNT_AMOUNT: "SKU Discount",
  FREE_PRODUCT: "Free Product",
  BUNDLE_OFFER: "Bundle Offer",
  BOGO: "BOGO (Buy One Get One)",
  BOGO_DIFFERENT_SKU: "BOGO (Different SKU)",
  CASHBACK: "Cashback",
  VOLUME_DISCOUNT: "Volume Discount",
  CROSS_CATEGORY: "Cross Category",
  FIRST_ORDER: "First Order",
  LOYALTY_POINTS: "Loyalty Points",
  FLASH_SALE: "Flash Sale",
};

export const STATUS_COLORS: Record<OfferStatus, string> = {
  Draft: "default",
  Active: "success",
  Paused: "warning",
  Expired: "error",
  Completed: "info",
};
