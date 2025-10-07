/**
 * API Types
 * Common TypeScript interfaces and types for API responses
 */

export interface ApiResponse<T = unknown> {
  success: boolean;
  message: string;
  data: T;
  error?: string;
  errors?: Array<{
    field: string;
    message: string;
  }>;
}

export interface PaginationInfo {
  current: number;
  pages: number;
  total: number;
  limit: number;
}

export interface PaginatedResponse<T> extends ApiResponse<T> {
  pagination: PaginationInfo;
}

export interface ApiError {
  success: false;
  message: string;
  error?: string;
  errors?: Array<{
    field: string;
    message: string;
  }>;
}

export type ApiResult<T> = ApiResponse<T> | ApiError;