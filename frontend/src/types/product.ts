export type ProductType = "MANUFACTURED" | "PROCURED";

export interface ProductReference {
  _id: string;
  name?: string;
  brand?: string;
  product_segment?: string;
}

export interface Product {
  _id: string;
  product_type: ProductType;
  brand_id: string | ProductReference;
  category_id: string | (ProductReference & { name: string; product_segment?: string });
  depot_ids?: Array<string | ProductReference>;
  sku: string;
  unit: string;
  trade_price: number;
  db_price?: number | null;
  mrp?: number | null;
  wt_pcs: number;
  ctn_pcs?: number | null;
  bangla_name?: string | null;
  active: boolean;
  launch_date?: string | null;
  decommission_date?: string | null;
  image_url?: string | null;
  erp_id?: number | null;
  created_at?: string;
  created_by?: string;
  updated_at?: string;
  updated_by?: string;
}

export interface ProductFilters {
  product_type?: ProductType | "ALL";
  brand_id?: string;
  category_id?: string;
  depot_id?: string;
  unit?: string;
  active?: "ALL" | "true" | "false";
  search?: string;
}

export interface ProductPagination {
  page: number;
  limit: number;
  total: number;
  pages: number;
}

export interface ProductListResponse {
  success: boolean;
  data: Product[];
  pagination: ProductPagination;
}

export interface ProductStatsSummary {
  product_type: ProductType;
  total: number;
  active: number;
  inactive: number;
  avgTradePrice: number;
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
  pagination?: ProductPagination;
}
