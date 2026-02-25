import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Geolocation from 'react-native-geolocation-service';
import { PermissionsAndroid, Platform } from 'react-native';

// Production API
const API_BASE_URL = 'https://tkgerp.com/api/v1';

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add response interceptor to handle token expiration
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // If error is 401 and we haven't retried yet
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        // Try to refresh the token
        const refreshToken = await AsyncStorage.getItem('refreshToken');
        if (refreshToken) {
          const response = await axios.post(`${API_BASE_URL}/auth/refresh`, {
            refreshToken,
          });

          if (response.data.success) {
            const newAccessToken = response.data.data.accessToken;
            await AsyncStorage.setItem('accessToken', newAccessToken);

            // Retry the original request with new token
            originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
            return api(originalRequest);
          }
        }
      } catch (refreshError) {
        // Refresh failed, user needs to log in again
        await AsyncStorage.multiRemove(['accessToken', 'refreshToken', 'user']);
        return Promise.reject(new Error('Session expired. Please log in again.'));
      }
    }

    return Promise.reject(error);
  }
);

export interface AttendanceCheckInResponse {
  success: boolean;
  message: string;
  data?: {
    attendance_date: string;
    check_in_time: string;
    matched_location: string;
    distance_meters: number;
  };
}

export interface AttendanceStatusResponse {
  success: boolean;
  marked: boolean;
  message?: string;
  data?: {
    attendance_date: string;
    check_in_time: string;
    matched_location: string;
    matched_location_type: 'outlet' | 'distributor';
    status: string;
  };
}

export interface AttendanceHistoryItem {
  attendance_date: string;
  check_in_time: string;
  matched_location_name: string;
  matched_location_type: 'outlet' | 'distributor';
  proximity_distance_meters: number;
  status: string;
}

export interface AttendanceHistoryResponse {
  success: boolean;
  count: number;
  data: AttendanceHistoryItem[];
}

class AttendanceAPI {
  private async getAuthToken(): Promise<string | null> {
    return await AsyncStorage.getItem('accessToken');
  }

  /**
   * Request location permission
   */
  async requestLocationPermission(): Promise<boolean> {
    if (Platform.OS === 'android') {
      const granted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
        {
          title: 'Location Permission',
          message: 'This app needs access to your location to mark attendance.',
          buttonNeutral: 'Ask Me Later',
          buttonNegative: 'Cancel',
          buttonPositive: 'OK',
        }
      );
      return granted === PermissionsAndroid.RESULTS.GRANTED;
    }
    // iOS: Already handled in Info.plist
    return true;
  }

  /**
   * Get current GPS location
   */
  async getCurrentLocation(): Promise<{
    latitude: number;
    longitude: number;
    accuracy: number;
  }> {
    return new Promise((resolve, reject) => {
      Geolocation.getCurrentPosition(
        (position) => {
          resolve({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy,
          });
        },
        (error) => {
          console.error('Error getting location:', error);
          reject(new Error('Failed to get current location'));
        },
        {
          enableHighAccuracy: true,
          timeout: 15000,
          maximumAge: 10000,
        }
      );
    });
  }

  /**
   * Mark attendance (check-in)
   */
  async checkIn(): Promise<AttendanceCheckInResponse> {
    try {
      // Request location permission
      const hasPermission = await this.requestLocationPermission();
      if (!hasPermission) {
        throw new Error('Location permission denied');
      }

      // Get current location
      const location = await this.getCurrentLocation();

      // Get auth token
      const token = await this.getAuthToken();

      // Send check-in request
      const response = await api.post<AttendanceCheckInResponse>(
        '/attendance/check-in',
        {
          latitude: location.latitude,
          longitude: location.longitude,
          accuracy: location.accuracy,
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      return response.data;
    } catch (error: any) {
      console.error('Attendance check-in error:', error);

      // Return proper error response
      return {
        success: false,
        message: error.response?.data?.message || error.message || 'Failed to mark attendance',
      };
    }
  }

  /**
   * Check attendance status for today
   */
  async getStatus(): Promise<AttendanceStatusResponse> {
    try {
      const token = await this.getAuthToken();
      const response = await api.get<AttendanceStatusResponse>('/attendance/status', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      return response.data;
    } catch (error: any) {
      console.error('Error fetching attendance status:', error);
      return {
        success: false,
        marked: false,
        message: 'Failed to fetch attendance status',
      };
    }
  }

  /**
   * Get attendance history
   */
  async getHistory(params?: {
    startDate?: string;
    endDate?: string;
    limit?: number;
  }): Promise<AttendanceHistoryResponse> {
    try {
      const token = await this.getAuthToken();
      const response = await api.get<AttendanceHistoryResponse>(
        '/attendance/history',
        {
          params,
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      return response.data;
    } catch (error: any) {
      console.error('Error fetching attendance history:', error);
      return {
        success: false,
        count: 0,
        data: [],
      };
    }
  }
}

export default new AttendanceAPI();
