import api from "@/lib/api";
import { isAxiosError } from "axios";
import type {
  Product,
  ProductFilters,
  ProductListResponse,
  ProductStatsSummary,
} from "@/types/product";
import type { ProductFormPayload } from "@/components/products/ProductFormDialog";

const BASE_ENDPOINT = "/product/products";

const toBackendPayload = (payload: ProductFormPayload): ProductFormPayload => {
  const normalizedDepots = Array.isArray(payload.depot_ids)
    ? payload.depot_ids.filter((id): id is string => Boolean(id))
    : [];

  if (payload.product_type === "MANUFACTURED") {
    return {
      ...payload,
      depot_ids: normalizedDepots,
    };
  }

  return {
    ...payload,
    depot_ids: [],
  };
};

export interface ProductListParams extends ProductFilters {
  page?: number;
  limit?: number;
  sort?: string;
}

const normalizeParams = (params?: ProductListParams) => {
  if (!params) return undefined;
  const sanitized: Record<string, string | number> = {};
  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null || value === "") {
      return;
    }
    if (typeof value === "string") {
      sanitized[key] = value;
    } else {
      sanitized[key] = value;
    }
  });
  return sanitized;
};

export const productsApi = {
  async list(params?: ProductListParams): Promise<ProductListResponse> {
    try {
      const response = await api.get(BASE_ENDPOINT, {
        params: normalizeParams(params),
      });
      return response.data as ProductListResponse;
    } catch (error) {
      if (isAxiosError(error) && error.response?.status === 404) {
        return {
          success: true,
          data: [],
          pagination: {
            page: params?.page ?? 1,
            limit: params?.limit ?? 0,
            total: 0,
            pages: 0,
          },
        };
      }
      throw error;
    }
  },

  async getById(id: string): Promise<Product> {
    const response = await api.get(`${BASE_ENDPOINT}/${id}`);
    const { data } = response.data as { success: boolean; data: Product };
    return data;
  },

  async summary(): Promise<ProductStatsSummary[]> {
    try {
      const response = await api.get(`${BASE_ENDPOINT}/stats/summary`);
      const { data } = response.data as { success: boolean; data: ProductStatsSummary[] };
      return data;
    } catch (error) {
      if (isAxiosError(error) && error.response?.status === 404) {
        return [];
      }
      throw error;
    }
  },

  async create(payload: ProductFormPayload) {
    const backendPayload = toBackendPayload(payload);
    const response = await api.post(BASE_ENDPOINT, backendPayload);
    return response.data;
  },

  async update(id: string, payload: ProductFormPayload) {
    const backendPayload = toBackendPayload(payload);
    const response = await api.put(`${BASE_ENDPOINT}/${id}`, backendPayload);
    return response.data;
  },

  async deactivate(id: string) {
    const response = await api.delete(`${BASE_ENDPOINT}/${id}`);
    return response.data;
  },

  async activate(id: string) {
    const response = await api.patch(`${BASE_ENDPOINT}/${id}/activate`);
    return response.data;
  },
};
