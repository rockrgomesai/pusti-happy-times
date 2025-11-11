/**
 * Offers API Client
 * Handles all API calls for offers module
 */

import api from '@/lib/api';
import type { Territory, Distributor, Product, ProductSegment } from '@/types/offer';

const BASE_URL = '/product/offers';

// Territory APIs
export const territoriesApi = {
  getByType: async (type: 'zone' | 'region' | 'area' | 'db_point', parentId?: string) => {
    const params = parentId ? `?parent_id=${parentId}` : '';
    const response = await api.get<{ success: boolean; data: Territory[] }>(`${BASE_URL}/territories/${type}${params}`);
    return response.data.data;
  },

  getAll: async () => {
    const response = await api.get<{ success: boolean; data: Territory[] }>(`${BASE_URL}/territories`);
    return response.data.data;
  },

  // Get all descendant territories in single query - PERFORMANT
  getDescendants: async (parentIds: string[], startLevel: number) => {
    const response = await api.post<{
      success: boolean;
      data: {
        all: Territory[];
        grouped: {
          regions: Territory[];
          areas: Territory[];
          db_points: Territory[];
        };
        counts: {
          total: number;
          regions: number;
          areas: number;
          db_points: number;
        };
      };
    }>(`${BASE_URL}/territories/descendants`, { parentIds, startLevel });
    return response.data.data;
  }
};

// Distributor APIs
export const distributorsApi = {
  getEligible: async (dbPointIds: string[], segments: string[]) => {
    const response = await api.post<{ success: boolean; data: Distributor[]; count: number }>(`${BASE_URL}/distributors/eligible`, {
      dbPointIds,
      segments
    });
    return response.data.data;
  },

  getByDbPoint: async (dbPointId: string) => {
    const response = await api.get<{ success: boolean; data: Distributor[] }>(`${BASE_URL}/distributors/by-dbpoint/${dbPointId}`);
    return response.data.data;
  }
};

// Product APIs
export const productsApi = {
  getBySegment: async (segments: string[], type: 'MANUFACTURED' | 'PROCURED') => {
    const response = await api.post<{ success: boolean; data: Product[] }>(`${BASE_URL}/products/by-segment`, {
      segments,
      type
    });
    return response.data.data;
  },

  getManufactured: async (segments: string[]) => {
    return productsApi.getBySegment(segments, 'MANUFACTURED');
  },

  getProcured: async () => {
    const response = await api.get<{ success: boolean; data: Product[] }>(`${BASE_URL}/products/procured`);
    return response.data.data;
  }
};

// Offer APIs
export const offersApi = {
  create: async (offerData: any) => {
    const response = await api.post<{ success: boolean; data: any }>(BASE_URL, offerData);
    return response.data.data;
  },

  // Alias for create
  createOffer: async (offerData: any) => {
    return offersApi.create(offerData);
  },

  getAll: async (params?: {
    page?: number;
    limit?: number;
    status?: string;
    offer_type?: string;
    active?: boolean;
    search?: string;
  }) => {
    const response = await api.get<{ 
      success: boolean; 
      data: any[];
      pagination: {
        page: number;
        limit: number;
        total: number;
        pages: number;
      }
    }>(BASE_URL, { params });
    return response.data;
  },

  getById: async (id: string) => {
    const response = await api.get<{ success: boolean; data: any }>(`${BASE_URL}/${id}`);
    return response.data.data;
  },

  update: async (id: string, offerData: any) => {
    const response = await api.put<{ success: boolean; data: any }>(`${BASE_URL}/${id}`, offerData);
    return response.data.data;
  },

  delete: async (id: string) => {
    const response = await api.delete<{ success: boolean; data: any }>(`${BASE_URL}/${id}`);
    return response.data.data;
  },

  toggleStatus: async (id: string, active: boolean) => {
    const response = await api.patch<{ success: boolean; data: any }>(`${BASE_URL}/${id}/status`, { active });
    return response.data.data;
  },

  duplicate: async (id: string) => {
    const response = await api.post<{ success: boolean; data: any }>(`${BASE_URL}/${id}/duplicate`);
    return response.data.data;
  },

  getProductsGroupedByCategory: async (segments: ProductSegment[]) => {
    const response = await api.post<{ success: boolean; data: any[] }>(`${BASE_URL}/products/grouped-by-category`, { segments });
    return response.data.data;
  },

  calculateDiscount: async (offerId: string, cartItems: any[]) => {
    const response = await api.post<{ success: boolean; data: any }>(`${BASE_URL}/calculate-discount`, {
      offerId,
      cartItems,
    });
    return response.data.data;
  }
};
