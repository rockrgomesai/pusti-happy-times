/**
 * Outlet Types API Client
 */

import api from '@/lib/api';
import type {
  OutletType,
  OutletTypeFormData,
  OutletTypeListParams,
  OutletTypeListResponse,
} from '@/types/outletType';

const BASE_ENDPOINT = '/outlet-types';

export const outletTypesApi = {
  async list(params?: OutletTypeListParams): Promise<OutletTypeListResponse> {
    const response = await api.get(BASE_ENDPOINT, { params });
    return response.data;
  },

  async getById(id: string): Promise<OutletType> {
    const response = await api.get(`${BASE_ENDPOINT}/${id}`);
    return response.data.data;
  },

  async create(data: OutletTypeFormData) {
    const response = await api.post(BASE_ENDPOINT, data);
    return response.data;
  },

  async update(id: string, data: Partial<OutletTypeFormData>) {
    const response = await api.put(`${BASE_ENDPOINT}/${id}`, data);
    return response.data;
  },

  async delete(id: string) {
    const response = await api.delete(`${BASE_ENDPOINT}/${id}`);
    return response.data;
  },

  async activate(id: string) {
    const response = await api.patch(`${BASE_ENDPOINT}/${id}/activate`);
    return response.data;
  },
};
