import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_BASE_URL as API_URL } from '../config/api';

interface RouteAPIResponse {
  success: boolean;
  message?: string;
  data?: any;
}

class RouteAPI {
  private axiosInstance;

  constructor() {
    this.axiosInstance = axios.create({
      baseURL: API_URL,
      timeout: 10000,
    });

    // Token refresh interceptor
    this.axiosInstance.interceptors.response.use(
      response => response,
      async error => {
        const originalRequest = error.config;

        if (error.response?.status === 401 && !originalRequest._retry) {
          originalRequest._retry = true;

          try {
            const refreshToken = await AsyncStorage.getItem('refreshToken');

            if (!refreshToken) {
              throw new Error('No refresh token');
            }

            const response = await axios.post(`${API_URL}/auth/refresh`, {
              refreshToken,
            });

            const { accessToken, refreshToken: newRefreshToken } = response.data;

            await AsyncStorage.setItem('accessToken', accessToken);
            await AsyncStorage.setItem('refreshToken', newRefreshToken);

            originalRequest.headers.Authorization = `Bearer ${accessToken}`;
            return this.axiosInstance(originalRequest);
          } catch (refreshError) {
            await AsyncStorage.multiRemove(['accessToken', 'refreshToken', 'user']);
            throw refreshError;
          }
        }

        return Promise.reject(error);
      }
    );
  }

  async getMyRoute(day?: string): Promise<RouteAPIResponse> {
    try {
      const token = await AsyncStorage.getItem('accessToken');

      const params = day ? { day } : {};

      const response = await this.axiosInstance.get('/routes/my-route', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
        params,
      });

      return response.data;
    } catch (error: any) {
      console.error('Error fetching my route:', error);
      throw error;
    }
  }
}

export const routeAPI = new RouteAPI();
export default routeAPI;
