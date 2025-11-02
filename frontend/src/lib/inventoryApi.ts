/**
 * Inventory API Client
 * Functions for inventory management operations
 */

import { apiClient } from './api';

export interface ProductDetail {
  product_id: {
    _id: string;
    sku: string;
    name?: string;
    bangla_name?: string;
    english_name?: string;
    erp_id?: string;
    ctn_pcs?: number;
    wt_pcs?: number;
    category_id?: {
      _id: string;
      name: string;
    };
  } | string; // Can be just ObjectId string when edited
  qty: number | { $numberDecimal?: string };
  batch_no: string;
  production_date: string;
  expiry_date: string;
  note?: string;
}

export interface PendingShipment {
  _id: string;
  ref: string;
  facility_id: {
    _id: string;
    name: string;
    type: string;
  };
  facility_store_id: {
    _id: string;
    name: string;
    type: string;
  };
  user_id: {
    _id: string;
    username: string;
  };
  details: ProductDetail[];
  status: string;
  created_at: string;
  updated_at: string;
}

export interface PendingReceiptsResponse {
  success: boolean;
  data: {
    shipments: PendingShipment[];
    pagination: {
      total: number;
      page: number;
      limit: number;
      pages: number;
    };
  };
}

export interface ReceiveGoodsRequest {
  shipment_id: string;
  location?: string;
  notes?: string;
  details?: ProductDetail[]; // Edited details from receiver
}

export interface ReceiveGoodsResponse {
  success: boolean;
  message: string;
  data: {
    shipment: PendingShipment;
    inventory_records: any[];
    transactions: any[];
  };
}

/**
 * Get pending receipts from production
 */
export const getPendingReceipts = async (
  page = 1,
  limit = 20,
  search = ''
): Promise<PendingReceiptsResponse> => {
  try {
    const response = await apiClient.get<PendingReceiptsResponse>(
      '/inventory/factory-to-store/pending-receipts',
      { page, limit, search }
    );
    return response;
  } catch (error) {
    console.error('Error fetching pending receipts:', error);
    throw error;
  }
};

/**
 * Get received shipments list
 */
export const getReceivedShipments = async (
  page = 1,
  limit = 20,
  search = ''
): Promise<PendingReceiptsResponse> => {
  try {
    const response = await apiClient.get<PendingReceiptsResponse>(
      '/inventory/factory-to-store/received-shipments',
      { page, limit, search }
    );
    return response;
  } catch (error) {
    console.error('Error fetching received shipments:', error);
    throw error;
  }
};

/**
 * Receive goods from production shipment
 */
export const receiveFromProduction = async (
  requestData: ReceiveGoodsRequest
): Promise<ReceiveGoodsResponse> => {
  try {
    const response = await apiClient.post<ReceiveGoodsResponse>(
      '/inventory/factory-to-store/receive-from-production',
      { ...requestData }
    );
    return response as ReceiveGoodsResponse;
  } catch (error) {
    console.error('Error receiving goods:', error);
    throw error;
  }
};

/**
 * Get quantity value from Decimal128 or number
 */
export const getQtyValue = (qty: number | { $numberDecimal?: string } | any): number => {
  if (qty && typeof qty === 'object' && '$numberDecimal' in qty) {
    return parseFloat(qty.$numberDecimal || '0');
  } else if (typeof qty === 'number') {
    return qty;
  } else if (typeof qty === 'string') {
    return parseFloat(qty);
  }
  return 0;
};

/**
 * Calculate total quantity from product details
 */
export const calculateTotalQuantity = (details: ProductDetail[]): number => {
  return details.reduce((sum, detail) => sum + getQtyValue(detail.qty), 0);
};
