/**
 * Outlet Type Type Definitions
 */

export interface OutletType {
  _id: string;
  name: string;
  active: boolean;
  created_at: string;
  created_by: string;
  updated_at: string;
  updated_by: string;
}

export interface OutletTypeFormData {
  name: string;
  active?: boolean;
}

export interface OutletTypeListParams {
  page?: number;
  limit?: number;
  search?: string;
  active?: 'true' | 'false' | 'all';
  sortBy?: 'name' | 'created_at' | 'updated_at';
  sortOrder?: 'asc' | 'desc';
}

export interface OutletTypeListResponse {
  success: boolean;
  data: OutletType[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}
