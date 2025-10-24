"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useAuth } from './AuthContext';
import api from '@/lib/api';

interface Notification {
  _id: string;
  user_id: string;
  type: string;
  title: string;
  message: string;
  offer_id?: {
    _id: string;
    name: string;
    offer_type: string;
    start_date: string;
    end_date: string;
    status: string;
  };
  read: boolean;
  read_at?: string;
  action_url?: string;
  action_label?: string;
  metadata?: any;
  createdAt: string;
  updatedAt: string;
}

interface NotificationContextType {
  notifications: Notification[];
  unreadCount: number;
  loading: boolean;
  error: string | null;
  fetchNotifications: () => Promise<void>;
  fetchUnreadCount: () => Promise<void>;
  markAsRead: (notificationId: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  refetch: () => Promise<void>;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
};

interface NotificationProviderProps {
  children: React.ReactNode;
}

export const NotificationProvider: React.FC<NotificationProviderProps> = ({ children }) => {
  const { user, isAuthenticated } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchUnreadCount = useCallback(async () => {
    if (!isAuthenticated) return;

    try {
      const response = await api.get('/notifications/unread-count');
      if (response.data.success) {
        setUnreadCount(response.data.count);
      }
    } catch (err: any) {
      console.error('Error fetching unread count:', err);
    }
  }, [isAuthenticated]);

  const fetchNotifications = useCallback(async () => {
    if (!isAuthenticated) return;

    setLoading(true);
    setError(null);

    try {
      const response = await api.get('/notifications/unread', {
        params: { limit: 50 }
      });

      if (response.data.success) {
        setNotifications(response.data.data);
        setUnreadCount(response.data.count);
      }
    } catch (err: any) {
      console.error('Error fetching notifications:', err);
      setError(err.response?.data?.message || 'Failed to fetch notifications');
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated]);

  const markAsRead = useCallback(async (notificationId: string) => {
    try {
      const response = await api.patch(`/notifications/${notificationId}/read`);

      if (response.data.success) {
        // Update local state
        setNotifications(prev =>
          prev.map(notif =>
            notif._id === notificationId
              ? { ...notif, read: true, read_at: new Date().toISOString() }
              : notif
          )
        );
        setUnreadCount(prev => Math.max(0, prev - 1));
      }
    } catch (err: any) {
      console.error('Error marking notification as read:', err);
      throw err;
    }
  }, []);

  const markAllAsRead = useCallback(async () => {
    try {
      const response = await api.patch('/notifications/read-all');

      if (response.data.success) {
        // Update local state
        setNotifications(prev =>
          prev.map(notif => ({ ...notif, read: true, read_at: new Date().toISOString() }))
        );
        setUnreadCount(0);
      }
    } catch (err: any) {
      console.error('Error marking all notifications as read:', err);
      throw err;
    }
  }, []);

  const refetch = useCallback(async () => {
    await Promise.all([fetchNotifications(), fetchUnreadCount()]);
  }, [fetchNotifications, fetchUnreadCount]);

  // Fetch unread count on mount and when user changes
  useEffect(() => {
    if (isAuthenticated) {
      fetchUnreadCount();
    } else {
      setNotifications([]);
      setUnreadCount(0);
    }
  }, [isAuthenticated, fetchUnreadCount]);

  // Poll for new notifications every 30 seconds
  useEffect(() => {
    if (!isAuthenticated) return;

    const interval = setInterval(() => {
      fetchUnreadCount();
    }, 30000); // 30 seconds

    return () => clearInterval(interval);
  }, [isAuthenticated, fetchUnreadCount]);

  const value: NotificationContextType = {
    notifications,
    unreadCount,
    loading,
    error,
    fetchNotifications,
    fetchUnreadCount,
    markAsRead,
    markAllAsRead,
    refetch
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
};
