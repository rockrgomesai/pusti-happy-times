/**
 * Outlet Type Definitions
 */

export interface Route {
  _id: string;
  route_id: string;
  route_name: string;
  area_id?: {
    _id: string;
    name: string;
    territory_type: string;
  };
  db_point_id?: {
    _id: string;
    name: string;
    territory_type: string;
  };
  distributor_id?: {
    _id: string;
    name: string;
  };
}

export interface OutletType {
  _id: string;
  name: string;
  active: boolean;
}

export interface OutletChannel {
  _id: string;
  name: string;
  active: boolean;
}

export interface Outlet {
  _id: string;
  outlet_id: string;
  outlet_name: string;
  outlet_name_bangla?: string;

  // Foreign references
  route_id: Route | string;
  outlet_type: OutletType | string;
  outlet_channel_id: OutletChannel | string;

  // Address
  address?: string;
  address_bangla?: string;

  // GPS Location
  location?: {
    type: "Point";
    coordinates: [number, number]; // [longitude, latitude]
  };
  lati?: number;
  longi?: number;

  // Contact
  contact_person?: string;
  mobile?: string;

  // Business metrics
  market_size?: number;
  avg_sales?: number;
  credit_sales?: number;
  polyfab_sales?: number;

  // Shop details
  shop_sign?: number; // 0 or 1
  shop_sign_amount?: number;
  shop_type?: number;
  sales_group?: string;

  // Credit management
  credit_limit: number;
  current_credit_balance: number;

  // Classification
  b_f_both?: number;
  food_outlet?: number;
  key_outlet?: number;

  // Verification (mobile app)
  verification_status: "PENDING" | "VERIFIED" | "REJECTED";
  verified_at?: string;
  verified_by?: {
    _id: string;
    username: string;
    email: string;
  };
  shop_photo_url?: string;
  last_visit_date?: string;
  visit_frequency?: number;

  // Status
  status?: number;
  comments?: string;
  active: boolean;

  // Sync metadata
  sync_version?: number;
  last_synced_at?: string;

  // Audit
  created_by?: {
    _id: string;
    username: string;
    email: string;
  };
  updated_by?: {
    _id: string;
    username: string;
    email: string;
  };
  created_date: string;
  update_date_time: string;

  // Virtual field
  display_name?: string;
}

export interface OutletFormData {
  outlet_name: string;
  outlet_name_bangla?: string;
  route_id: string;
  outlet_type: string;
  outlet_channel_id: string;
  address?: string;
  address_bangla?: string;
  lati?: number;
  longi?: number;
  contact_person?: string;
  mobile?: string;
  market_size?: number;
  avg_sales?: number;
  credit_sales?: number;
  polyfab_sales?: number;
  shop_sign?: number;
  shop_sign_amount?: number;
  shop_type?: number;
  sales_group?: string;
  credit_limit?: number;
  b_f_both?: number;
  food_outlet?: number;
  key_outlet?: number;
  verification_status?: "PENDING" | "VERIFIED" | "REJECTED";
  status?: number;
  comments?: string;
  active?: boolean;
}

export interface OutletListParams {
  page?: number;
  limit?: number;
  search?: string;
  route_id?: string;
  outlet_type?: string;
  outlet_channel_id?: string;
  verification_status?: "PENDING" | "VERIFIED" | "REJECTED" | "all";
  active?: "true" | "false" | "all";
  sortBy?: "outlet_name" | "outlet_id" | "created_date" | "update_date_time";
  sortOrder?: "asc" | "desc";
}

export interface OutletListResponse {
  success: boolean;
  data: Outlet[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

export interface NearbyOutletsParams {
  lat: number;
  lon: number;
  radius?: number; // km
}

export interface NearbyOutletsResponse {
  success: boolean;
  data: Outlet[];
  count: number;
}
