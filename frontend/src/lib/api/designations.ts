/**
 * Designations API Service
 * Frontend service for managing designation-related API calls
 * 
 * This service handles all HTTP requests to the designations API endpoints,
 * providing a clean interface for frontend components to interact with
 * the backend designation management system.
 */

import { API_BASE_URL } from '@/lib/api';
import { ApiResponse } from '@/lib/types/api';
const ENDPOINTS = {
  DESIGNATIONS: '/designations',
  ACTIVE: '/designations/active',
  SEARCH: '/designations/search',
  STATS: '/designations/stats'
} as const;

/**
 * Designation interface
 */
export interface Designation {
  _id: string;
  name: string;
  active: boolean;
  createdBy?: {
    _id: string;
    username: string;
  };
  updatedBy?: {
    _id: string;
    username: string;
  };
  createdAt: string;
  updatedAt: string;
}

/**
 * API request/response types
 */
export interface CreateDesignationRequest {
  name: string;
}

export interface UpdateDesignationRequest {
  name: string;
}

export interface DesignationListParams {
  page?: number;
  limit?: number;
  search?: string;
  sortBy?: 'name' | 'createdAt' | 'updatedAt';
  sortOrder?: 'asc' | 'desc';
  includeInactive?: boolean;
}

export interface DesignationListResponse {
  data: Designation[];
  pagination: {
    current: number;
    pages: number;
    total: number;
    limit: number;
  };
}

export interface DesignationStats {
  total: number;
  active: number;
  inactive: number;
  activePercentage: number;
}

/**
 * HTTP client utility with authentication
 */
const createHttpClient = () => {
  const getAuthHeaders = () => {
    const token = localStorage.getItem('token');
    return {
      'Content-Type': 'application/json',
      ...(token && { 'Authorization': `Bearer ${token}` })
    };
  };

  const handleResponse = async <T>(response: Response): Promise<ApiResponse<T>> => {
    const contentType = response.headers.get('content-type');
    
    if (!contentType || !contentType.includes('application/json')) {
      throw new Error('Invalid response format');
    }

    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.message || `HTTP ${response.status}: ${response.statusText}`);
    }
    
    return data;
  };

  return {
    get: async <T>(url: string): Promise<ApiResponse<T>> => {
      const response = await fetch(`${API_BASE_URL}${url}`, {
        method: 'GET',
        headers: getAuthHeaders(),
      });
      return handleResponse<T>(response);
    },

    post: async <T>(url: string, body: unknown): Promise<ApiResponse<T>> => {
      const response = await fetch(`${API_BASE_URL}${url}`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(body),
      });
      return handleResponse<T>(response);
    },

    put: async <T>(url: string, body: unknown): Promise<ApiResponse<T>> => {
      const response = await fetch(`${API_BASE_URL}${url}`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify(body),
      });
      return handleResponse<T>(response);
    },

    delete: async <T>(url: string): Promise<ApiResponse<T>> => {
      const response = await fetch(`${API_BASE_URL}${url}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
      });
      return handleResponse<T>(response);
    },

    patch: async <T>(url: string, body?: unknown): Promise<ApiResponse<T>> => {
      const options: RequestInit = {
        method: 'PATCH',
        headers: getAuthHeaders(),
      };

      if (body) {
        options.body = JSON.stringify(body);
      }

      const response = await fetch(`${API_BASE_URL}${url}`, options);
      return handleResponse<T>(response);
    },
  };
};

// Create HTTP client instance
const http = createHttpClient();

/**
 * Designations API Service
 */
export const designationsApi = {
  /**
   * Get all designations with pagination and filtering
   */
  getAll: async (params: DesignationListParams = {}): Promise<DesignationListResponse> => {
    const searchParams = new URLSearchParams();
    
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        searchParams.append(key, String(value));
      }
    });

    const queryString = searchParams.toString();
    const url = `${ENDPOINTS.DESIGNATIONS}${queryString ? `?${queryString}` : ''}`;
    
    const response = await http.get<DesignationListResponse>(url);
    return response.data;
  },

  /**
   * Get all active designations (simple list)
   */
  getActive: async (): Promise<Designation[]> => {
    const response = await http.get<Designation[]>(ENDPOINTS.ACTIVE);
    return response.data;
  },

  /**
   * Get designation by ID
   */
  getById: async (id: string): Promise<Designation> => {
    const response = await http.get<Designation>(`${ENDPOINTS.DESIGNATIONS}/${id}`);
    return response.data;
  },

  /**
   * Create new designation
   */
  create: async (data: CreateDesignationRequest): Promise<Designation> => {
    const response = await http.post<Designation>(ENDPOINTS.DESIGNATIONS, data);
    return response.data;
  },

  /**
   * Update designation
   */
  update: async (id: string, data: UpdateDesignationRequest): Promise<Designation> => {
    const response = await http.put<Designation>(`${ENDPOINTS.DESIGNATIONS}/${id}`, data);
    return response.data;
  },

  /**
   * Soft delete designation
   */
  delete: async (id: string): Promise<void> => {
    await http.delete(`${ENDPOINTS.DESIGNATIONS}/${id}`);
  },

  /**
   * Restore soft deleted designation
   */
  restore: async (id: string): Promise<Designation> => {
    const response = await http.patch<Designation>(`${ENDPOINTS.DESIGNATIONS}/${id}/restore`);
    return response.data;
  },

  /**
   * Search designations
   */
  search: async (query: string, options: { includeInactive?: boolean; limit?: number } = {}): Promise<Designation[]> => {
    const searchParams = new URLSearchParams({ q: query });
    
    if (options.includeInactive !== undefined) {
      searchParams.append('includeInactive', String(options.includeInactive));
    }
    if (options.limit !== undefined) {
      searchParams.append('limit', String(options.limit));
    }

    const response = await http.get<Designation[]>(`${ENDPOINTS.SEARCH}?${searchParams.toString()}`);
    return response.data;
  },

  /**
   * Get designation statistics
   */
  getStats: async (): Promise<DesignationStats> => {
    const response = await http.get<DesignationStats>(ENDPOINTS.STATS);
    return response.data;
  }
};

export default designationsApi;