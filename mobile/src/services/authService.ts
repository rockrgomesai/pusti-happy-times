import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_BASE_URL } from '../config/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

export const authService = {
  login: async (username: string, password: string) => {
    try {
      console.log('🔐 Login attempt:', username);
      console.log('🌐 API URL:', API_BASE_URL + '/auth/login');

      const response = await api.post('/auth/login', {
        username,
        password,
      });

      console.log('✅ Response received:', response.status);
      console.log('📦 Response data:', JSON.stringify(response.data, null, 2));

      // Backend returns: { success, message, data: { user, tokens } }
      if (response.data.success && response.data.data) {
        return {
          accessToken: response.data.data.tokens.accessToken,
          refreshToken: response.data.data.tokens.refreshToken,
          user: response.data.data.user,
        };
      }

      throw new Error(response.data.message || 'Login failed');
    } catch (error: any) {
      console.error('❌ Login error:', error);
      console.error('❌ Error response:', error.response?.data);
      console.error('❌ Error message:', error.message);
      console.error('❌ Network error:', error.code);

      throw new Error(
        error.response?.data?.message || error.message || 'Login failed. Please try again.',
      );
    }
  },

  logout: async () => {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const toRemove = keys.filter(
        (k) =>
          k === 'accessToken' ||
          k === 'refreshToken' ||
          k === 'user' ||
          k === '@pending_orders_v1' ||
          k.startsWith('@sales_cart_'),
      );
      if (toRemove.length > 0) {
        await AsyncStorage.multiRemove(toRemove);
      }
    } catch (e) {
      // Best-effort cleanup; proceed regardless.
    }
    return true;
  },
};

export default api;
