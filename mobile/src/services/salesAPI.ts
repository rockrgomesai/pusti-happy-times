/**
 * Sales API Service
 * Handle catalog browsing and order creation for secondary sales
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

const API_BASE_URL = 'http://192.168.0.103:8080/api/v1';

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
}

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
      const token = await AsyncStorage.getItem('@auth_token');
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
      const token = await AsyncStorage.getItem('@auth_token');
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
      const token = await AsyncStorage.getItem('@auth_token');
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
   * Place secondary order
   */
  async placeOrder(orderData: OrderSubmission): Promise<any> {
    try {
      const token = await AsyncStorage.getItem('@auth_token');
      const url = `${API_BASE_URL}/mobile/orders`;

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(orderData),
      });

      const result = await response.json();

      if (result.success) {
        return result;
      } else {
        const error: any = new Error(result.message || 'Failed to place order');
        error.code = result.code;
        error.conflicts = result.conflicts;
        throw error;
      }
    } catch (error) {
      console.error('placeOrder error:', error);
      throw error;
    }
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
      const token = await AsyncStorage.getItem('@auth_token');
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
      const token = await AsyncStorage.getItem('@auth_token');
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
