'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { authAPI, tokenManager } from '@/lib/api';
import { normalizePermissions } from '@/lib/permissions';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';

interface User {
  id: string;
  username: string;
  email: string;
  active: boolean;
  user_type: 'employee' | 'distributor';
  role: {
    id: string;
    role: string;
  };
  context: {
    // Employee context
    employee_type?: 'system_admin' | 'field' | 'facility' | 'hq';
    employee_code?: string;
    employee_name?: string;
    designation_id?: string;
    territory_assignments?: {
      zone_ids?: string[];
      region_ids?: string[];
      area_ids?: string[];
      db_point_ids?: string[];
      all_territory_ids?: string[];
    };
    facility_assignments?: {
      factory_ids?: string[];
      depot_ids?: string[];
    };
    department?: string;
    
    // Distributor context
    distributor_name?: string;
    db_point_id?: string;
    territorries?: any[];
    product_segment?: string[];
    skus_exclude?: string[];
  };
  permissions?: string[];
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  changePassword: (passwordData: {
    currentPassword: string;
    newPassword: string;
    confirmPassword: string;
  }) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: React.ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isMounted, setIsMounted] = useState(false);
  const router = useRouter();

  const isAuthenticated = isMounted && !!user && tokenManager.isAuthenticated();

  // Handle client-side mounting
  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Initialize authentication state
  useEffect(() => {
    if (isMounted) {
      initializeAuth();
    }
  }, [isMounted]);

  const initializeAuth = async () => {
    try {
      if (tokenManager.isAuthenticated()) {
        // TODO: Fetch user profile when endpoint is available
        // For now, we'll assume the user is authenticated if token exists
        // const userProfile = await fetchUserProfile();
        // setUser(userProfile);
        
        // Temporary: Set a placeholder user if token exists
        setUser({
          id: 'temp',
          username: 'user',
          email: 'user@example.com',
          active: true,
          user_type: 'employee',
          role: {
            id: 'temp-role',
            role: 'SuperAdmin'
          },
          context: {
            employee_type: 'system_admin'
          },
          permissions: ['offers:create', 'offers:read', 'offers:update', 'offers:delete']
        });
      }
    } catch (error) {
      console.error('Auth initialization error:', error);
      tokenManager.clearTokens();
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Determine redirect path based on user type and role
   */
  const determineRedirectPath = (userData: any): string => {
    // SuperAdmin always goes to dashboard
    if (userData.role?.role === 'SuperAdmin') {
      return '/dashboard';
    }
    
    // Route based on user_type
    if (userData.user_type === 'employee') {
      const employeeType = userData.context?.employee_type;
      
      switch (employeeType) {
        case 'system_admin':
          return '/dashboard';
        case 'field':
          return '/sales/field-dashboard';
        case 'facility':
          return '/operations/facility-dashboard';
        case 'hq':
          const dept = userData.context?.department;
          return dept ? `/hq/${dept}/dashboard` : '/dashboard';
        default:
          return '/dashboard';
      }
    } else if (userData.user_type === 'distributor') {
      return '/distributor/catalog';
    }
    
    // Default fallback
    return '/dashboard';
  };

  const login = async (username: string, password: string): Promise<void> => {
    try {
      setIsLoading(true);
      const response = await authAPI.login({ username, password });
      
      if (response.success) {
        const { user: userData, tokens } = response.data;
        const { accessToken, refreshToken } = tokens;
        
        // Store tokens first
        tokenManager.setTokens(accessToken, refreshToken);
        
        // Set user data
        setUser({
          ...userData,
          permissions: normalizePermissions((userData as { permissions?: unknown })?.permissions),
        } as User);
        
        toast.success('Login successful!');
        
        // Determine redirect path based on user type
        const redirectPath = determineRedirectPath(userData);
        
        // Use setTimeout to ensure state updates have been processed
        setTimeout(() => {
          router.push(redirectPath);
        }, 100);
      } else {
        throw new Error(response.message || 'Login failed');
      }
    } catch (error: unknown) {
      const errorMessage = 
        error instanceof Error 
          ? error.message 
          : typeof error === 'object' && error !== null && 'response' in error
            ? (error as { response?: { data?: { message?: string } } }).response?.data?.message || 'Login failed'
            : 'Login failed';
      toast.error(errorMessage);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    try {
      setIsLoading(true);
      await authAPI.logout();
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      // Clear local state regardless of API call success
      setUser(null);
      tokenManager.clearTokens();
      toast.success('Logged out successfully');
      router.push('/login');
      setIsLoading(false);
    }
  };

  const changePassword = async (passwordData: {
    currentPassword: string;
    newPassword: string;
    confirmPassword: string;
  }): Promise<void> => {
    try {
      setIsLoading(true);
      const response = await authAPI.changePassword(passwordData);
      
      if (response.success) {
        toast.success('Password changed successfully!');
      } else {
        throw new Error(response.message || 'Password change failed');
      }
    } catch (error: unknown) {
      const errorMessage = 
        error instanceof Error 
          ? error.message 
          : typeof error === 'object' && error !== null && 'response' in error
            ? (error as { response?: { data?: { message?: string } } }).response?.data?.message || 'Password change failed'
            : 'Password change failed';
      toast.error(errorMessage);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const value: AuthContextType = {
    user,
    isLoading,
    isAuthenticated,
    login,
    logout,
    changePassword,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
