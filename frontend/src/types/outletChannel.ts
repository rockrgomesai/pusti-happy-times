export interface OutletChannel {
  _id: string;
  name: string;
  active: boolean;
  created_by: string;
  updated_by: string;
  created_at: string;
  updated_at: string;
}

export interface OutletChannelFormData {
  name: string;
  active: boolean;
}

export interface OutletChannelListParams {
  page?: number;
  limit?: number;
  search?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  active?: boolean;
}

export interface OutletChannelListResponse {
  data: OutletChannel[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    pages: number;
  };
}
