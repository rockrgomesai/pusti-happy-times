import axios, { AxiosResponse, AxiosError } from 'axios';
import Cookies from 'js-cookie';

// API base configuration
const isDevelopment = process.env.NODE_ENV === 'development';
const RAW_API_URL = isDevelopment ? 'http://localhost:8080/api/v1' : '/api/v1';

const trimTrailingSlash = (url: string) => url.replace(/\/+$/, '');

const sanitizedRawUrl = trimTrailingSlash(RAW_API_URL);

export const API_ORIGIN_URL = isDevelopment ? sanitizedRawUrl.replace(/\/api\/v1$/, '') : '';
export const API_BASE_URL = sanitizedRawUrl;

// Simple API online/offline status broadcaster
type ApiStatusListener = (online: boolean) => void;
export const apiStatus = {
  online: true,
  listeners: [] as ApiStatusListener[],
  set(online: boolean) {
    if (this.online !== online) {
      this.online = online;
      this.listeners.forEach((fn) => {
        try { fn(online); } catch { /* noop */ }
      });
    }
  },
  onChange(fn: ApiStatusListener) {
    this.listeners.push(fn);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== fn);
    };
  },
};

// Create axios instance
const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Token management
export const tokenManager = {
  getAccessToken: (): string | undefined => {
    if (typeof window === 'undefined') return undefined;
    return Cookies.get('accessToken');
  },
  
  getRefreshToken: (): string | undefined => {
    if (typeof window === 'undefined') return undefined;
    return Cookies.get('refreshToken');
  },
  
  setTokens: (accessToken: string, refreshToken: string): void => {
    if (typeof window === 'undefined') return;
    Cookies.set('accessToken', accessToken, { 
      expires: 1, // 1 day
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict'
    });
    Cookies.set('refreshToken', refreshToken, { 
      expires: 7, // 7 days
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict'
    });
  },
  
  clearTokens: (): void => {
    if (typeof window === 'undefined') return;
    Cookies.remove('accessToken');
    Cookies.remove('refreshToken');
  },
  
  isAuthenticated: (): boolean => {
    if (typeof window === 'undefined') return false;
    return !!tokenManager.getAccessToken();
  }
};

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = tokenManager.getAccessToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle token refresh
api.interceptors.response.use(
  (response: AxiosResponse) => {
    // mark API online on any successful response
    apiStatus.set(true);
    return response;
  },
  async (error: AxiosError) => {
    const originalRequest = error.config as AxiosError['config'] & { _retry?: boolean; _retryCount?: number };

    // Detect network error (no response object)
  const isNetworkErr = !error.response || error.message === 'Network Error';
    if (isNetworkErr) {
      apiStatus.set(false);
      const method = (originalRequest?.method || 'get').toString().toUpperCase();
      // Retry only idempotent requests (GET/HEAD/OPTIONS) up to 3 times with backoff
      const canRetry = method === 'GET' || method === 'HEAD' || method === 'OPTIONS';
      if (canRetry && originalRequest) {
        originalRequest._retryCount = (originalRequest._retryCount || 0) + 1;
        if (originalRequest._retryCount <= 3) {
          const delayMs = 500 * originalRequest._retryCount; // 500ms, 1000ms, 1500ms
          await new Promise((r) => setTimeout(r, delayMs));
          return api(originalRequest);
        }
      }
    }

    if (error.response?.status === 401 && !originalRequest?._retry) {
      if (originalRequest) {
        originalRequest._retry = true;
      }
      
      const refreshToken = tokenManager.getRefreshToken();
      console.log('🔄 Got 401, attempting refresh with token:', refreshToken?.substring(0, 30) + '...');
      
      if (refreshToken) {
        try {
          const response = await axios.post(`${API_BASE_URL}/auth/refresh`, {
            refreshToken
          });
          
          console.log('🔄 Refresh response:', response.data);
          const { tokens } = response.data.data;
          const { accessToken, refreshToken: newRefreshToken } = tokens;
          
          console.log('🔄 New accessToken:', accessToken?.substring(0, 30) + '...');
          console.log('🔄 Storing new tokens in cookies');
          tokenManager.setTokens(accessToken, newRefreshToken);
          
          console.log('🔄 Token stored, verifying:', tokenManager.getAccessToken()?.substring(0, 30) + '...');
          
          // Retry the original request with new token
          if (originalRequest) {
            originalRequest.headers = originalRequest.headers || {};
            originalRequest.headers.Authorization = `Bearer ${accessToken}`;
            console.log('🔄 Retrying original request with new token');
          }
          return api(originalRequest);
        } catch (refreshError) {
          // Refresh failed, redirect to login
          tokenManager.clearTokens();
          window.location.href = '/login';
          return Promise.reject(refreshError);
        }
      } else {
        // No refresh token, redirect to login
        tokenManager.clearTokens();
        window.location.href = '/login';
      }
    }
    
    return Promise.reject(error);
  }
);

// API endpoints
export const authAPI = {
  login: async (credentials: { username: string; password: string }) => {
    try {
  console.log('🔐 Making login request to:', `${API_BASE_URL}/auth/login`);
      console.log('🔐 Frontend origin:', typeof window !== 'undefined' ? window.location.origin : 'SSR');
      console.log('🔐 Credentials username:', credentials.username);
      console.log('🔐 Credentials password length:', credentials.password.length);
      console.log('🔐 Credentials password first 3 chars:', credentials.password.substring(0, 3));
      console.log('🔐 Credentials password last 3 chars:', credentials.password.substring(credentials.password.length - 3));
      console.log('🔐 Raw credentials object:', { username: credentials.username, password: credentials.password });
      
      const response = await api.post('/auth/login', credentials);
      console.log('🔐 Login response status:', response.status);
      console.log('🔐 Login response data:', response.data);
      
      return response.data;
    } catch (error) {
      console.error('🔐 Login error:', error);
            const axiosError = error as AxiosError;
            const status = axiosError.response?.status;
            const backendMsg = (axiosError.response?.data as { message?: string } | undefined)?.message || '';
            const normalized = backendMsg.toLowerCase();
            const isBadCreds =
              status === 401 ||
              normalized.includes('invalid credential') ||
              normalized.includes('wrong password') ||
              normalized.includes('wrong username') ||
              normalized.includes('unauthorized');

            if (isBadCreds) {
              throw new Error('Wrong username or password!');
            }

            if (error instanceof Error && 'response' in error) {
              console.error('🔐 Error response status:', axiosError.response?.status);
              console.error('🔐 Error response data:', axiosError.response?.data);
              console.error('🔐 Error response headers:', axiosError.response?.headers);
              console.error('🔐 Error request config:', axiosError.config);
              console.error('🔐 Error message:', axiosError.message);
            }
            throw error;
    }
  },
  
  logout: async () => {
    const response = await api.post('/auth/logout');
    tokenManager.clearTokens();
    return response.data;
  },
  
  refreshToken: async () => {
    const refreshToken = tokenManager.getRefreshToken();
    const response = await api.post('/auth/refresh', { refreshToken });
    return response.data;
  },
  
  changePassword: async (passwordData: { 
    currentPassword: string; 
    newPassword: string; 
    confirmPassword: string; 
  }) => {
    const response = await api.put('/auth/change-password', passwordData);
    return response.data;
  },

  getProfile: async () => {
    const response = await api.get('/auth/me');
    return response.data;
  }
};

// Generic API functions
// ⚠️ CRITICAL: Always use apiClient in components, NOT the raw 'api' instance
// apiClient automatically unwraps response.data so you get { success, data, message }
// Raw 'api' returns full axios response { data: { success, data, message }, status, headers }
export const apiClient = {
  get: async <T = unknown>(url: string, params?: Record<string, unknown>, config?: any): Promise<T> => {
    const response = await api.get(url, { params, ...config });
    return response.data;
  },
  
  post: async <T = unknown>(url: string, data?: Record<string, unknown>): Promise<T> => {
    const response = await api.post(url, data);
    return response.data;
  },
  
  put: async <T = unknown>(url: string, data?: Record<string, unknown>): Promise<T> => {
    const response = await api.put(url, data);
    return response.data;
  },
  
  delete: async <T = unknown>(url: string): Promise<T> => {
    const response = await api.delete(url);
    return response.data;
  }
};

// Health check
export const healthCheck = async () => {
  const response = await axios.get(`${API_BASE_URL}/health`);
  return response.data;
};

export default api;
