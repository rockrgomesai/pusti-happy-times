/**
 * Notification API Client
 * Functions for managing user notifications
 */

import { apiClient } from './api';

export interface Notification {
  _id: string;
  user_id: string;
  type: string;
  title: string;
  message: string;
  shipment_id?: string;
  transfer_id?: string;
  inventory_id?: string;
  offer_id?: string;
  order_id?: string;
  target_role?: string;
  target_facility_id?: string;
  priority: 'low' | 'normal' | 'high' | 'urgent';
  read: boolean;
  read_at?: string;
  action_url?: string;
  action_label?: string;
  metadata?: any;
  expires_at?: string;
  createdAt: string;
  updatedAt: string;
}

export interface NotificationResponse {
  success: boolean;
  data: Notification[];
  count?: number;
  pagination?: {
    total: number;
    page: number;
    limit: number;
    pages: number;
  };
}

export interface UnreadCountResponse {
  success: boolean;
  count: number;
}

/**
 * Get unread notification count
 */
export const getUnreadNotificationCount = async (): Promise<number> => {
  try {
    const response = await apiClient.get<UnreadCountResponse>('/notifications/unread-count');
    return response.data.count;
  } catch (error) {
    console.error('Error fetching unread notification count:', error);
    return 0;
  }
};

/**
 * Get unread notifications
 */
export const getUnreadNotifications = async (limit = 10): Promise<Notification[]> => {
  try {
    const response = await apiClient.get<NotificationResponse>('/notifications/unread', {
      params: { limit },
    });
    return response.data.data;
  } catch (error) {
    console.error('Error fetching unread notifications:', error);
    return [];
  }
};

/**
 * Get all notifications (paginated)
 */
export const getAllNotifications = async (page = 1, limit = 20): Promise<NotificationResponse> => {
  try {
    const response = await apiClient.get<NotificationResponse>('/notifications', {
      params: { page, limit },
    });
    return response.data;
  } catch (error) {
    console.error('Error fetching notifications:', error);
    throw error;
  }
};

/**
 * Mark notification as read
 */
export const markNotificationAsRead = async (notificationId: string): Promise<void> => {
  try {
    await apiClient.patch(`/notifications/${notificationId}/read`);
  } catch (error) {
    console.error('Error marking notification as read:', error);
    throw error;
  }
};

/**
 * Mark all notifications as read
 */
export const markAllNotificationsAsRead = async (): Promise<void> => {
  try {
    await apiClient.patch('/notifications/read-all');
  } catch (error) {
    console.error('Error marking all notifications as read:', error);
    throw error;
  }
};

/**
 * Get notification priority color
 */
export const getNotificationPriorityColor = (priority: string): 'default' | 'primary' | 'secondary' | 'error' | 'info' | 'success' | 'warning' => {
  switch (priority) {
    case 'urgent':
      return 'error';
    case 'high':
      return 'warning';
    case 'normal':
      return 'info';
    case 'low':
      return 'default';
    default:
      return 'default';
  }
};

/**
 * Get notification type icon
 */
export const getNotificationTypeIcon = (type: string): string => {
  switch (type) {
    case 'shipment_pending':
    case 'shipment_received':
      return '📦';
    case 'transfer_pending':
    case 'transfer_received':
      return '🚚';
    case 'low_stock_alert':
    case 'stock_out':
      return '⚠️';
    case 'expiry_alert':
      return '⏰';
    case 'adjustment_approved':
      return '✅';
    case 'adjustment_rejected':
      return '❌';
    case 'offer':
    case 'offer_ending':
      return '🎁';
    case 'order_status':
      return '📋';
    case 'payment':
      return '💰';
    case 'system':
      return 'ℹ️';
    case 'alert':
      return '🔔';
    default:
      return '📢';
  }
};

/**
 * Format time ago
 */
export const formatTimeAgo = (dateString: string): string => {
  const date = new Date(dateString);
  const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000);

  if (seconds < 60) return 'just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
  return date.toLocaleDateString();
};
