import api from '@/lib/api';
import type {
  OutletMarketSize,
  OutletMarketSizeFormData,
  OutletMarketSizeListParams,
  OutletMarketSizeListResponse,
} from '@/types/outletMarketSize';

export const outletMarketSizesApi = {
  list: async (params?: OutletMarketSizeListParams): Promise<OutletMarketSizeListResponse> => {
    const response = await api.get('/outlet-market-sizes', { params });
    return response.data;
  },

  getById: async (id: string): Promise<OutletMarketSize> => {
    const response = await api.get(`/outlet-market-sizes/${id}`);
    return response.data;
  },

  create: async (data: OutletMarketSizeFormData): Promise<OutletMarketSize> => {
    const response = await api.post('/outlet-market-sizes', data);
    return response.data;
  },

  update: async (id: string, data: OutletMarketSizeFormData): Promise<OutletMarketSize> => {
    const response = await api.put(`/outlet-market-sizes/${id}`, data);
    return response.data;
  },

  delete: async (id: string): Promise<void> => {
    await api.delete(`/outlet-market-sizes/${id}`);
  },

  activate: async (id: string): Promise<OutletMarketSize> => {
    const response = await api.patch(`/outlet-market-sizes/${id}/activate`);
    return response.data;
  },
};
