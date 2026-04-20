/**
 * Sales API Service
 * Handle catalog browsing and order creation for secondary sales
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_BASE_URL } from '../config/api';

// TypeScript interfaces
export interface Category {
  _id: string;
  name: string;
  product_segment: 'BIS' | 'BEV';
  image_url?: string;
  product_count: number;
}

export interface Product {
  _id: string;
  sku: string;
  english_name: string;
  bangla_name: string;
  trade_price: number;
  unit_per_case: number;
  image_url?: string;
  available_qty: number;
}

export interface Offer {
  _id: string;
  name: string;
  offer_type: string;
  description: string;
  start_date: string;
  end_date: string;
  config: {
    minOrderValue?: number;
    discountPercentage?: number;
    discountAmount?: number;
  };
}

export interface CartItem {
  product_id: string;
  sku: string;
  bangla_name: string;
  english_name: string;
  quantity: number;
  unit_price: number;
  subtotal: number;
}

export interface OrderSubmission {
  outlet_id: string;
  distributor_id: string;
  dsr_id: string;
  route_id?: string;
  items: {
    product_id: string;
    sku: string;
    quantity: number;
    unit_price: number;
  }[];
  gps_location?: {
    type: string;
    coordinates: number[];
  };
  gps_accuracy?: number;
  so_notes?: string;
  /** Client-generated uid for idempotent offline resubmission. */
  client_order_uid?: string;
  /** "online" | "offline" | "manual" — tagged by the mobile app. */
  entry_mode?: 'online' | 'offline' | 'manual';
  /** ISO timestamp captured at the moment the order was taken. */
  order_date?: string;
}

export interface PendingOrder extends OrderSubmission {
  client_order_uid: string;
  queued_at: string;
  last_error?: string;
  retry_count: number;
}

const PENDING_ORDERS_KEY = '@pending_orders_v1';

export interface Order {
  _id: string;
  order_number: string;
  outlet: {
    _id: string;
    name: string;
    address: string;
  };
  order_date: string;
  total_amount: number;
  order_status: 'Submitted' | 'Approved' | 'Cancelled' | 'Delivered';
  delivery_chalan_no?: string;
}

class SalesAPI {
  /**
   * Get categories with product counts
   */
  async getCategories(distributorId: string, segment?: 'BIS' | 'BEV'): Promise<Category[]> {
    try {
      const token = await AsyncStorage.getItem('accessToken');
      let url = `${API_BASE_URL}/mobile/catalog/categories?distributor_id=${distributorId}`;
      if (segment) url += `&segment=${segment}`;

      const response = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const result = await response.json();

      if (result.success) {
        return result.data;
      } else {
        throw new Error(result.message || 'Failed to fetch categories');
      }
    } catch (error) {
      console.error('getCategories error:', error);
      throw error;
    }
  }

  /**
   * Get products by category with stock
   */
  async getProducts(categoryId: string, distributorId: string): Promise<Product[]> {
    try {
      const token = await AsyncStorage.getItem('accessToken');
      const url = `${API_BASE_URL}/mobile/catalog/products?category_id=${categoryId}&distributor_id=${distributorId}`;

      const response = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const result = await response.json();

      if (result.success) {
        return result.data;
      } else {
        throw new Error(result.message || 'Failed to fetch products');
      }
    } catch (error) {
      console.error('getProducts error:', error);
      throw error;
    }
  }

  /**
   * Get eligible offers for outlet
   */
  async getOffers(outletId: string, distributorId: string): Promise<Offer[]> {
    try {
      const token = await AsyncStorage.getItem('accessToken');
      const url = `${API_BASE_URL}/mobile/catalog/offers?outlet_id=${outletId}&distributor_id=${distributorId}`;

      const response = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const result = await response.json();

      if (result.success) {
        return result.data;
      } else {
        throw new Error(result.message || 'Failed to fetch offers');
      }
    } catch (error) {
      console.error('getOffers error:', error);
      throw error;
    }
  }

  /**
   * Place secondary order with transparent offline queueing.
   *
   * Behavior:
   *   - Always stamps `client_order_uid` + `order_date` + `entry_mode`.
   *   - If the POST fails with a network error (offline / DNS / timeout),
   *     the order is saved to AsyncStorage and returned with `queued: true`.
   *   - If the server returns a 4xx/5xx, the caller sees the original error
   *     (stock conflicts, validation, etc) — we do NOT queue those.
   *   - Callers should invoke `syncPendingOrders()` when connectivity returns.
   */
  async placeOrder(orderData: OrderSubmission): Promise<any> {
    const payload: OrderSubmission = {
      ...orderData,
      client_order_uid: orderData.client_order_uid || this.generateOrderUid(),
      order_date: orderData.order_date || new Date().toISOString(),
      entry_mode: orderData.entry_mode || 'online',
    };

    try {
      const token = await AsyncStorage.getItem('accessToken');
      const url = `${API_BASE_URL}/mobile/orders`;

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      // Network succeeded — server responded with JSON
      const result = await response.json();

      if (result.success) {
        return result;
      }
      const error: any = new Error(result.message || 'Failed to place order');
      error.code = result.code;
      error.conflicts = result.conflicts;
      throw error;
    } catch (error: any) {
      // Network-level failure → queue for later sync.
      if (this.isNetworkError(error)) {
        await this.enqueueOrder({ ...payload, entry_mode: 'offline' } as any);
        return {
          success: true,
          queued: true,
          offline: true,
          message: 'No network — order saved offline and will sync automatically.',
          client_order_uid: payload.client_order_uid,
        };
      }
      console.error('placeOrder error:', error);
      throw error;
    }
  }

  // ====================================================================
  // Offline queue helpers
  // ====================================================================

  private generateOrderUid(): string {
    // Short, collision-resistant enough for per-user offline queues.
    const rand = Math.random().toString(36).slice(2, 10);
    return `ord-${Date.now().toString(36)}-${rand}`;
  }

  private isNetworkError(error: any): boolean {
    if (!error) return false;
    const msg = String(error.message || '').toLowerCase();
    return (
      msg.includes('network request failed') ||
      msg.includes('failed to fetch') ||
      msg.includes('timeout') ||
      msg.includes('timed out') ||
      error.name === 'TypeError' && msg.includes('network')
    );
  }

  /** Read the pending queue. */
  async getPendingOrders(): Promise<PendingOrder[]> {
    try {
      const raw = await AsyncStorage.getItem(PENDING_ORDERS_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch (e) {
      console.error('getPendingOrders error:', e);
      return [];
    }
  }

  /** Count pending orders (for the sync badge). */
  async getPendingCount(): Promise<number> {
    const q = await this.getPendingOrders();
    return q.length;
  }

  /** Add an order to the pending queue. */
  async enqueueOrder(order: OrderSubmission & { client_order_uid: string }): Promise<void> {
    const queue = await this.getPendingOrders();
    // De-dupe by client_order_uid
    if (queue.some((o) => o.client_order_uid === order.client_order_uid)) return;
    queue.push({
      ...order,
      queued_at: new Date().toISOString(),
      retry_count: 0,
    } as PendingOrder);
    await AsyncStorage.setItem(PENDING_ORDERS_KEY, JSON.stringify(queue));
  }

  /** Manually add an order that was collected on paper (offline-first entry). */
  async saveManualOrder(order: OrderSubmission): Promise<string> {
    const uid = order.client_order_uid || this.generateOrderUid();
    await this.enqueueOrder({
      ...order,
      client_order_uid: uid,
      order_date: order.order_date || new Date().toISOString(),
      entry_mode: 'manual',
    } as any);
    return uid;
  }

  /**
   * Attempt to POST every queued order. Succeeded ones are removed.
   * Returns a summary. Safe to call repeatedly.
   */
  async syncPendingOrders(): Promise<{ synced: number; failed: number; remaining: number; conflicts: any[] }> {
    const queue = await this.getPendingOrders();
    if (queue.length === 0) return { synced: 0, failed: 0, remaining: 0, conflicts: [] };

    const token = await AsyncStorage.getItem('accessToken');
    const url = `${API_BASE_URL}/mobile/orders`;
    const still: PendingOrder[] = [];
    const conflicts: any[] = [];
    let synced = 0;
    let failed = 0;

    for (const pending of queue) {
      try {
        const response = await fetch(url, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(pending),
        });
        const result = await response.json().catch(() => ({}));
        if (result && result.success) {
          synced += 1;
          continue; // drop from queue
        }
        // Server rejected (stock, validation, etc). Keep queued but record.
        still.push({
          ...pending,
          retry_count: (pending.retry_count || 0) + 1,
          last_error: result?.message || `HTTP ${response.status}`,
        });
        conflicts.push({
          client_order_uid: pending.client_order_uid,
          code: result?.code,
          message: result?.message,
          conflicts: result?.conflicts,
        });
        failed += 1;
      } catch (e: any) {
        // Network still down → keep queued
        still.push({
          ...pending,
          retry_count: (pending.retry_count || 0) + 1,
          last_error: e?.message || 'Network error',
        });
        failed += 1;
      }
    }

    await AsyncStorage.setItem(PENDING_ORDERS_KEY, JSON.stringify(still));
    return { synced, failed, remaining: still.length, conflicts };
  }

  /** Remove a specific queued order (e.g. user discards it from Pending Sync screen). */
  async discardPendingOrder(clientOrderUid: string): Promise<void> {
    const queue = await this.getPendingOrders();
    const next = queue.filter((o) => o.client_order_uid !== clientOrderUid);
    await AsyncStorage.setItem(PENDING_ORDERS_KEY, JSON.stringify(next));
  }

  /**
   * Get order history
   */
  async getOrders(
    dsrId: string,
    filters?: {
      outlet_id?: string;
      status?: string;
      date_from?: string;
      date_to?: string;
      page?: number;
      limit?: number;
    }
  ): Promise<{ data: Order[]; pagination: any }> {
    try {
      const token = await AsyncStorage.getItem('accessToken');
      let url = `${API_BASE_URL}/mobile/orders?dsr_id=${dsrId}`;

      if (filters) {
        if (filters.outlet_id) url += `&outlet_id=${filters.outlet_id}`;
        if (filters.status) url += `&status=${filters.status}`;
        if (filters.date_from) url += `&date_from=${filters.date_from}`;
        if (filters.date_to) url += `&date_to=${filters.date_to}`;
        if (filters.page) url += `&page=${filters.page}`;
        if (filters.limit) url += `&limit=${filters.limit}`;
      }

      const response = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const result = await response.json();

      if (result.success) {
        return {
          data: result.data,
          pagination: result.pagination,
        };
      } else {
        throw new Error(result.message || 'Failed to fetch orders');
      }
    } catch (error) {
      console.error('getOrders error:', error);
      throw error;
    }
  }

  /**
   * Get single order details
   */
  async getOrderById(orderId: string): Promise<any> {
    try {
      const token = await AsyncStorage.getItem('accessToken');
      const url = `${API_BASE_URL}/mobile/orders/${orderId}`;

      const response = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const result = await response.json();

      if (result.success) {
        return result.data;
      } else {
        throw new Error(result.message || 'Failed to fetch order details');
      }
    } catch (error) {
      console.error('getOrderById error:', error);
      throw error;
    }
  }

  /**
   * Save cart to AsyncStorage
   */
  async saveCart(outletId: string, cart: CartItem[]): Promise<void> {
    try {
      const cartKey = `@sales_cart_${outletId}`;
      await AsyncStorage.setItem(cartKey, JSON.stringify(cart));
    } catch (error) {
      console.error('saveCart error:', error);
    }
  }

  /**
   * Load cart from AsyncStorage
   */
  async loadCart(outletId: string): Promise<CartItem[]> {
    try {
      const cartKey = `@sales_cart_${outletId}`;
      const cartData = await AsyncStorage.getItem(cartKey);
      return cartData ? JSON.parse(cartData) : [];
    } catch (error) {
      console.error('loadCart error:', error);
      return [];
    }
  }

  /**
   * Clear cart from AsyncStorage
   */
  async clearCart(outletId: string): Promise<void> {
    try {
      const cartKey = `@sales_cart_${outletId}`;
      await AsyncStorage.removeItem(cartKey);
    } catch (error) {
      console.error('clearCart error:', error);
    }
  }
}

export default new SalesAPI();
