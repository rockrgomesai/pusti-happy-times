export interface Category {
  _id: string;
  name: string;
  active: boolean;
}

export interface Outlet {
  _id: string;
  outlet_id: string;
  outlet_name: string;
}

export interface OutletMarketSize {
  _id: string;
  outlet: Outlet;
  category: Category;
  mkt_size: number;
  active: boolean;
  created_by: string;
  updated_by: string;
  created_at: string;
  updated_at: string;
}

export interface OutletMarketSizeFormData {
  outlet: string;
  category: string;
  mkt_size: number;
  active: boolean;
}

export interface OutletMarketSizeListParams {
  page?: number;
  limit?: number;
  search?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  active?: boolean;
  category?: string;
  outlet?: string;
}

export interface OutletMarketSizeListResponse {
  data: OutletMarketSize[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    pages: number;
  };
}
