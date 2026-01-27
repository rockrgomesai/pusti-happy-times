export interface Category {
  _id: string;
  name: string;
  active: boolean;
}

export interface OutletMarketSize {
  _id: string;
  category: Category;
  mkt_size: number;
  active: boolean;
  created_by: string;
  updated_by: string;
  created_at: string;
  updated_at: string;
}

export interface OutletMarketSizeFormData {
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
