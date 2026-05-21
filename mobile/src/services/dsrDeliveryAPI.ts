import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_BASE_URL } from '../config/api';

export interface DeliveryOrderItem {
    product_id: string;
    sku: string;
    bangla_name: string;
    english_name: string;
    image_url?: string;
    ordered_qty: number;
    unit_price: number;
    extra_discount?: number;
    ctn_pcs?: number;
}

export interface ScheduleOrder {
    _id: string;
    order_number: string;
    order_status: 'Approved' | 'Hold' | 'Delivered' | 'Bounced';
    order_date: string;
    total_amount: number;
    credit_balance_after: number;
    outlet_id: {
        _id: string;
        outlet_name: string;
        code: string;
        address?: string;
        phone?: string;
    };
    items: (DeliveryOrderItem & { product_id: any })[];
}

export interface DeliveryItemInput {
    product_id: string;
    sku: string;
    ordered_qty: number;
    delivered_qty: number;
    damage_qty: number;
    unit_price: number;
    extra_item_discount: number;
    is_extra_item: boolean;
}

export interface ConfirmDeliveryPayload {
    delivery_items: DeliveryItemInput[];
    extra_delivery_discount: number;
    cash_collected: number;
    credit_balance_before: number;
}

export interface CatalogProduct {
    _id: string;
    sku: string;
    bangla_name: string;
    english_name: string;
    image_url?: string;
    trade_price: number;
    ctn_pcs?: number;
    available_qty: number;
}

async function authHeaders() {
    const token = await AsyncStorage.getItem('accessToken');
    return { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
}

export async function fetchSchedule(date?: string): Promise<{ orders: ScheduleOrder[]; distributor_id: string | null }> {
    const headers = await authHeaders();
    const query = date ? `?date=${date}` : '';
    const res = await fetch(`${API_BASE_URL}/mobile/dsr/schedule${query}`, { headers });
    const json = await res.json();
    if (!json.success) throw new Error(json.message);
    return { orders: json.data.orders, distributor_id: json.data.distributor_id ?? null };
}

export async function fetchOutletCredit(outletId: string): Promise<number> {
    const headers = await authHeaders();
    const res = await fetch(`${API_BASE_URL}/mobile/dsr/outlet-credit/${outletId}`, { headers });
    const json = await res.json();
    if (!json.success) throw new Error(json.message);
    return json.data.credit_balance ?? 0;
}

export async function searchCatalog(q: string): Promise<CatalogProduct[]> {
    const headers = await authHeaders();
    const res = await fetch(`${API_BASE_URL}/mobile/dsr/catalog-search?q=${encodeURIComponent(q)}`, { headers });
    const json = await res.json();
    if (!json.success) throw new Error(json.message);
    return json.data;
}

export async function confirmDelivery(orderId: string, payload: ConfirmDeliveryPayload) {
    const headers = await authHeaders();
    const res = await fetch(`${API_BASE_URL}/mobile/dsr/orders/${orderId}/confirm`, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
    });
    const json = await res.json();
    if (!json.success) throw new Error(json.message);
    return json.data;
}

export async function bounceOrder(orderId: string, reason: string) {
    const headers = await authHeaders();
    const res = await fetch(`${API_BASE_URL}/mobile/dsr/orders/${orderId}/bounce`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ reason }),
    });
    const json = await res.json();
    if (!json.success) throw new Error(json.message);
    return json.data;
}

export async function holdOrder(orderId: string, reason: string) {
    const headers = await authHeaders();
    const res = await fetch(`${API_BASE_URL}/mobile/dsr/orders/${orderId}/hold`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ reason }),
    });
    const json = await res.json();
    if (!json.success) throw new Error(json.message);
    return json.data;
}

export interface DeliveredOrder {
    _id: string;
    order_number: string;
    order_status: 'Delivered' | 'Bounced';
    delivered_at: string;
    order_date: string;
    payable_amount: number;
    cash_collected: number;
    credit_balance_after: number;
    credit_balance_before: number;
    bounced_reason?: string;
    total_amount: number;
    outlet_id: {
        _id: string;
        outlet_name: string;
        code: string;
        address?: string;
    };
    delivery_items: {
        sku: string;
        delivered_qty: number;
        unit_price: number;
        line_total: number;
    }[];
}

export interface DeliveredSummary {
    total: number;
    delivered: number;
    bounced: number;
    total_cash: number;
    total_credit: number;
}

export async function fetchDeliveredOrders(date?: string): Promise<{ orders: DeliveredOrder[]; summary: DeliveredSummary }> {
    const headers = await authHeaders();
    const query = date ? `?date=${date}` : '';
    const res = await fetch(`${API_BASE_URL}/mobile/dsr/delivered-today${query}`, { headers });
    const json = await res.json();
    if (!json.success) throw new Error(json.message);
    return json.data;
}
