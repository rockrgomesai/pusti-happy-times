import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_BASE_URL as API_URL } from '../config/api';

interface StartSessionResponse {
  success: boolean;
  data: {
    session_id: string;
    start_time: string;
    status: string;
  };
}

interface UploadLocationsResponse {
  success: boolean;
  data: {
    session_id: string;
    received: number;
    inserted: number;
  };
}

interface StopSessionResponse {
  success: boolean;
  data: {
    session_id: string;
    start_time: string;
    end_time: string;
    total_distance_km: number;
    total_duration_seconds: number;
    total_points: number;
    status: string;
  };
}

class TrackingAPI {
  private async getAuthToken(): Promise<string | null> {
    return await AsyncStorage.getItem('accessToken');
  }

  async startSession(deviceInfo: {
    device_model: string;
    os_version: string;
    app_version: string;
    battery_level?: number;
  }): Promise<StartSessionResponse> {
    const token = await this.getAuthToken();

    try {
      const response = await axios.post(
        `${API_URL}/tracking/sessions/start`,
        deviceInfo,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
          timeout: 10000, // 10 second timeout
        }
      );

      return response.data;
    } catch (error: any) {
      if (error.code === 'ECONNREFUSED' || error.code === 'ERR_NETWORK') {
        throw new Error('Cannot connect to server. Please check your network connection.');
      }
      if (error.response?.status === 401) {
        throw new Error('Authentication failed. Please login again.');
      }
      throw error;
    }
  }

  async uploadLocations(
    sessionId: string,
    points: Array<{
      latitude: number;
      longitude: number;
      timestamp: string | number;
      accuracy?: number;
      speed?: number;
      altitude?: number;
      heading?: number;
      is_mock?: boolean;
      provider?: string;
      battery_level?: number;
      network_type?: string;
    }>
  ): Promise<UploadLocationsResponse> {
    const token = await this.getAuthToken();

    const response = await axios.post(
      `${API_URL}/tracking/sessions/${sessionId}/locations/batch`,
      {
        points: points.map(p => ({
          ...p,
          timestamp: typeof p.timestamp === 'number'
            ? new Date(p.timestamp).toISOString()
            : p.timestamp,
        })),
      },
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    return response.data;
  }

  async stopSession(sessionId: string): Promise<StopSessionResponse> {
    const token = await this.getAuthToken();

    const response = await axios.put(
      `${API_URL}/tracking/sessions/${sessionId}/stop`,
      {},
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    return response.data;
  }
}

export const trackingAPI = new TrackingAPI();
export default trackingAPI;
