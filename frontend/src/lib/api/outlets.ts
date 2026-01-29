/**
 * Outlets API Client
 */

import api from '@/lib/api';
import type {
  Outlet,
  OutletFormData,
  OutletListParams,
  OutletListResponse,
  NearbyOutletsParams,
  NearbyOutletsResponse,
} from '@/types/outlet';

const BASE_ENDPOINT = '/outlets';

export const outletsApi = {
  /**
   * Get list of outlets with filtering and pagination
   */
  async list(params?: OutletListParams): Promise<OutletListResponse> {
    const response = await api.get(BASE_ENDPOINT, { params });
    return response.data;
  },

  /**
   * Get nearby outlets based on GPS coordinates
   */
  async nearby(params: NearbyOutletsParams): Promise<NearbyOutletsResponse> {
    const response = await api.get(`${BASE_ENDPOINT}/nearby`, { params });
    return response.data;
  },

  /**
   * Get outlet by ID
   */
  async getById(id: string): Promise<Outlet> {
    const response = await api.get(`${BASE_ENDPOINT}/${id}`);
    return response.data.data;
  },

  /**
   * Create new outlet
   */
  async create(data: OutletFormData) {
    const response = await api.post(BASE_ENDPOINT, data);
    return response.data;
  },

  /**
   * Update outlet
   */
  async update(id: string, data: Partial<OutletFormData>) {
    const response = await api.put(`${BASE_ENDPOINT}/${id}`, data);
    return response.data;
  },

  /**
   * Deactivate outlet (soft delete)
   */
  async delete(id: string) {
    const response = await api.delete(`${BASE_ENDPOINT}/${id}`);
    return response.data;
  },

  /**
   * Activate outlet
   */
  async activate(id: string) {
    const response = await api.patch(`${BASE_ENDPOINT}/${id}/activate`);
    return response.data;
  },

  /**
   * Verify outlet (for mobile app usage)
   */
  async verify(id: string, data: { verification_status: 'VERIFIED' | 'REJECTED'; shop_photo_url?: string }) {
    const response = await api.patch(`${BASE_ENDPOINT}/${id}/verify`, data);
    return response.data;
  },
};
