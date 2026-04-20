/**
 * Outlet API Service
 * Handles SO-initiated outlet registration from the mobile app.
 * Talks to the field-register endpoints added in backend/src/routes/outlets.js.
 */

import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_BASE_URL as API_URL } from '../config/api';

export interface OutletTypeOption {
    _id: string;
    name: string;
}

export interface OutletChannelOption {
    _id: string;
    name: string;
}

export interface RegistrationMetadata {
    outlet_types: OutletTypeOption[];
    outlet_channels: OutletChannelOption[];
}

export interface RegisterOutletPayload {
    outlet_name: string;
    outlet_name_bangla?: string;
    outlet_type: string; // ObjectId
    outlet_channel_id: string; // ObjectId
    address?: string;
    address_bangla?: string;
    contact_person?: string;
    mobile?: string;
    lati: number;
    longi: number;
    gps_accuracy?: number;
    market_size?: number;
    credit_limit?: number;
    shop_photo_url?: string;
    comments?: string;
    day?: 'SUN' | 'MON' | 'TUE' | 'WED' | 'THU' | 'FRI' | 'SAT';
}

export interface RegisteredOutlet {
    _id: string;
    outlet_id: string;
    outlet_name: string;
    outlet_name_bangla?: string;
    verification_status: 'PENDING' | 'VERIFIED' | 'REJECTED';
    lati: number;
    longi: number;
    route_id?: { _id: string; route_id: string; route_name: string };
    outlet_type?: { _id: string; name: string };
    outlet_channel_id?: { _id: string; name: string };
    created_date: string;
}

class OutletAPI {
    private client;

    constructor() {
        this.client = axios.create({ baseURL: API_URL, timeout: 15000 });

        // 401 → refresh → retry once
        this.client.interceptors.response.use(
            res => res,
            async err => {
                const original = err.config;
                if (err.response?.status === 401 && !original._retry) {
                    original._retry = true;
                    try {
                        const refreshToken = await AsyncStorage.getItem('refreshToken');
                        if (!refreshToken) throw new Error('No refresh token');
                        const r = await axios.post(`${API_URL}/auth/refresh`, { refreshToken });
                        const newAccess = r.data?.data?.accessToken || r.data?.accessToken;
                        const newRefresh = r.data?.data?.refreshToken || r.data?.refreshToken;
                        if (newAccess) await AsyncStorage.setItem('accessToken', newAccess);
                        if (newRefresh) await AsyncStorage.setItem('refreshToken', newRefresh);
                        original.headers.Authorization = `Bearer ${newAccess}`;
                        return this.client(original);
                    } catch (e) {
                        await AsyncStorage.multiRemove(['accessToken', 'refreshToken', 'user']);
                        throw e;
                    }
                }
                return Promise.reject(err);
            }
        );
    }

    private async authHeader() {
        const token = await AsyncStorage.getItem('accessToken');
        return { Authorization: `Bearer ${token}` };
    }

    async getMetadata(): Promise<RegistrationMetadata> {
        const headers = await this.authHeader();
        const res = await this.client.get('/outlets/field-register/metadata', { headers });
        if (!res.data?.success) throw new Error(res.data?.message || 'Failed to load form data');
        return res.data.data as RegistrationMetadata;
    }

    async registerOutlet(payload: RegisterOutletPayload): Promise<RegisteredOutlet> {
        const headers = await this.authHeader();
        const res = await this.client.post('/outlets/field-register', payload, { headers });
        if (!res.data?.success) throw new Error(res.data?.message || 'Failed to register outlet');
        return res.data.data as RegisteredOutlet;
    }

    async getMyRegistrations(
        status?: 'PENDING' | 'VERIFIED' | 'REJECTED'
    ): Promise<RegisteredOutlet[]> {
        const headers = await this.authHeader();
        const res = await this.client.get('/outlets/field-register/my-registrations', {
            headers,
            params: status ? { status } : {},
        });
        if (!res.data?.success) throw new Error(res.data?.message || 'Failed to fetch registrations');
        return res.data.data as RegisteredOutlet[];
    }
}

export const outletAPI = new OutletAPI();
export default outletAPI;
