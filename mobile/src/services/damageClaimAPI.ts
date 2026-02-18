/**
 * Damage Claim API Service
 * Handles damage/expired product claims from mobile app
 */

import axios from 'axios';
import Config from 'react-native-config';
import AsyncStorage from '@react-native-async-storage/async-storage';

const API_BASE_URL = Config.API_BASE_URL || 'http://10.0.2.2:8080/api/v1';

// Create axios instance with interceptors
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
apiClient.interceptors.request.use(
  async (config) => {
    try {
      const token = await AsyncStorage.getItem('@auth_token');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    } catch (error) {
      console.error('Error getting auth token:', error);
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor for token refresh
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // If 401 and not already retried, try to refresh token
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const refreshToken = await AsyncStorage.getItem('@refresh_token');
        if (!refreshToken) {
          throw new Error('No refresh token available');
        }

        // Refresh the token
        const response = await axios.post(`${API_BASE_URL}/auth/refresh`, {
          refreshToken,
        });

        const { accessToken } = response.data;
        await AsyncStorage.setItem('@auth_token', accessToken);

        // Retry original request with new token
        originalRequest.headers.Authorization = `Bearer ${accessToken}`;
        return apiClient(originalRequest);
      } catch (refreshError) {
        // Refresh failed, logout user
        await AsyncStorage.multiRemove(['@auth_token', '@refresh_token', '@user_data']);
        // Optionally navigate to login screen here
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

export interface DamageClaimItem {
  product_id: string;
  qty_claimed_pcs: number;
  damage_reason: 'physical_damage' | 'expired' | 'defective' | 'near_expiry' | 'wrong_product' | 'packaging_damage' | 'quality_issue';
  notes?: string;
  batch_number?: string;
}

export interface DamageClaimSubmission {
  outlet_id: string;
  distributor_id: string;
  items: DamageClaimItem[];
  gps_location: {
    coordinates: [number, number]; // [longitude, latitude]
  };
  gps_accuracy?: number;
  so_notes?: string;
}

export interface ProductForClaim {
  _id: string;
  sku: string;
  english_name: string;
  bangla_name?: string;
  unit_per_case: number;
  trade_price: number;
  category_id?: string;
  brand_id?: string;
  image_url?: string;
  last_delivered?: string;
}

export interface CategoryGroup {
  category: string;
  products: ProductForClaim[];
}

export interface DamageClaim {
  _id: string;
  claim_id: string;
  outlet_id: any;
  distributor_id: any;
  so_id: any;
  route_id?: any;
  claim_date: string;
  items: Array<{
    product_id: any;
    qty_claimed_pcs: number;
    damage_reason: string;
    notes?: string;
    batch_number?: string;
    estimated_value_bdt?: number;
  }>;
  total_items: number;
  total_qty_pcs: number;
  total_value_bdt: number;
  status: 'Pending' | 'Under Review' | 'Verified' | 'Approved' | 'Rejected' | 'Replaced' | 'Closed';
  gps_location: {
    type: string;
    coordinates: [number, number];
  };
  so_notes?: string;
  created_at: string;
  updated_at: string;
}

const damageClaimAPI = {
  /**
   * Get products previously delivered to outlet (for damage claim)
   */
  async getProductsForClaim(outletId: string, distributorId?: string): Promise<{
    data: CategoryGroup[];
    total_products: number;
    outlet_name: string;
  }> {
    try {
      const params: any = { outlet_id: outletId };
      if (distributorId) {
        params.distributor_id = distributorId;
      }

      const response = await apiClient.get('/damage-claims/products', { params });
      return response.data;
    } catch (error: any) {
      console.error('Error fetching products for claim:', error.response?.data || error.message);
      throw new Error(
        error.response?.data?.message || 'Failed to fetch products for damage claim'
      );
    }
  },

  /**
   * Submit a damage claim
   */
  async submitClaim(claimData: DamageClaimSubmission): Promise<{ data: DamageClaim }> {
    try {
      const response = await apiClient.post('/damage-claims', claimData);
      return response.data;
    } catch (error: any) {
      console.error('Error submitting damage claim:', error.response?.data || error.message);
      throw new Error(
        error.response?.data?.message || 'Failed to submit damage claim'
      );
    }
  },

  /**
   * Get claim history for an outlet
   */
  async getClaimHistory(outletId: string, limit: number = 20): Promise<{
    data: DamageClaim[];
    count: number;
  }> {
    try {
      const response = await apiClient.get('/damage-claims/history', {
        params: { outlet_id: outletId, limit },
      });
      return response.data;
    } catch (error: any) {
      console.error('Error fetching claim history:', error.response?.data || error.message);
      throw new Error(
        error.response?.data?.message || 'Failed to fetch claim history'
      );
    }
  },

  /**
   * Get single claim details
   */
  async getClaimById(claimId: string): Promise<{ data: DamageClaim }> {
    try {
      const response = await apiClient.get(`/damage-claims/${claimId}`);
      return response.data;
    } catch (error: any) {
      console.error('Error fetching claim details:', error.response?.data || error.message);
      throw new Error(
        error.response?.data?.message || 'Failed to fetch claim details'
      );
    }
  },

  /**
   * Save draft to AsyncStorage
   */
  async saveDraft(outletId: string, items: DamageClaimItem[], notes?: string): Promise<void> {
    try {
      const draft = {
        items,
        notes,
        savedAt: new Date().toISOString(),
      };
      await AsyncStorage.setItem(`@damage_claim_draft_${outletId}`, JSON.stringify(draft));
    } catch (error) {
      console.error('Error saving draft:', error);
      throw new Error('Failed to save draft');
    }
  },

  /**
   * Load draft from AsyncStorage
   */
  async loadDraft(outletId: string): Promise<{
    items: DamageClaimItem[];
    notes?: string;
    savedAt: string;
  } | null> {
    try {
      const draftJson = await AsyncStorage.getItem(`@damage_claim_draft_${outletId}`);
      if (draftJson) {
        return JSON.parse(draftJson);
      }
      return null;
    } catch (error) {
      console.error('Error loading draft:', error);
      return null;
    }
  },

  /**
   * Clear draft from AsyncStorage
   */
  async clearDraft(outletId: string): Promise<void> {
    try {
      await AsyncStorage.removeItem(`@damage_claim_draft_${outletId}`);
    } catch (error) {
      console.error('Error clearing draft:', error);
    }
  },
};

export default damageClaimAPI;
