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
  role: {
    id: string;
    role: string;
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
          role: {
            id: 'temp-role',
            role: 'SuperAdmin'
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
        
        // Use setTimeout to ensure state updates have been processed
        setTimeout(() => {
          router.push('/dashboard');
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

  const logout = async (): Promise<void> => {
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
