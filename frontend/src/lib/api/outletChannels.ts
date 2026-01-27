import api from '@/lib/api';
import type {
  OutletChannel,
  OutletChannelFormData,
  OutletChannelListParams,
  OutletChannelListResponse,
} from '@/types/outletChannel';

export const outletChannelsApi = {
  list: async (params?: OutletChannelListParams): Promise<OutletChannelListResponse> => {
    const response = await api.get('/outlet-channels', { params });
    return response.data;
  },

  getById: async (id: string): Promise<OutletChannel> => {
    const response = await api.get(`/outlet-channels/${id}`);
    return response.data;
  },

  create: async (data: OutletChannelFormData): Promise<OutletChannel> => {
    const response = await api.post('/outlet-channels', data);
    return response.data;
  },

  update: async (id: string, data: OutletChannelFormData): Promise<OutletChannel> => {
    const response = await api.put(`/outlet-channels/${id}`, data);
    return response.data;
  },

  delete: async (id: string): Promise<void> => {
    await api.delete(`/outlet-channels/${id}`);
  },

  activate: async (id: string): Promise<OutletChannel> => {
    const response = await api.patch(`/outlet-channels/${id}/activate`);
    return response.data;
  },
};
