'use client';

import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  TextField,
  Button,
  Alert,
  IconButton,
  InputAdornment,
} from '@mui/material';
import {
  Lock as LockIcon,
  Visibility,
  VisibilityOff,
} from '@mui/icons-material';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'react-hot-toast';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import api from '@/lib/api';

// Password change schema
const passwordChangeSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: z.string()
    .min(6, 'New password must be at least 6 characters')
    .regex(/^(?=.*[a-zA-Z])(?=.*\d)/, 'New password must contain at least one letter and one number'),
});

type PasswordChangeFormData = z.infer<typeof passwordChangeSchema>;

export default function AdminPasswordPage() {
  const router = useRouter();
  const { logout } = useAuth();
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [submitError, setSubmitError] = useState<string>('');

  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
  } = useForm<PasswordChangeFormData>({
    resolver: zodResolver(passwordChangeSchema),
    defaultValues: {
      currentPassword: '',
      newPassword: '',
    },
  });

  // Check authentication status on component mount
  useEffect(() => {
    const checkAuth = () => {
      // Check if user has access token in cookies or localStorage
      const hasToken = document.cookie.includes('accessToken') || localStorage.getItem('accessToken');
      if (!hasToken) {
        router.push('/login?redirectTo=/admin/password');
      }
    };
    
    checkAuth();
  }, [router]);

  const onSubmit = async (data: PasswordChangeFormData) => {
    try {
      setSubmitError('');
      
      // Call API to change password
      const response = await api.put('/api/auth/change-password', {
        currentPassword: data.currentPassword,
        newPassword: data.newPassword,
      });

      // Check if backend indicates forced logout is required
      const forceLogout = response.data?.data?.forceLogout;
      
      toast.success('Password changed successfully! You will be logged out.');
      
      // Clear form
      reset();
      
      if (forceLogout) {
        // Use AuthContext logout for proper cleanup
        await logout();
      } else {
        // Fallback: manual cleanup and redirect
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        router.push('/login');
      }
      
    } catch (error: unknown) {
      console.error('Password change error:', error);
      
      const apiError = error as { 
        response?: { status?: number; data?: { message?: string } };
        request?: unknown;
        message?: string;
      };
      
      // Check if it's a network error (no response received)
      if (apiError.request && !apiError.response) {
        setSubmitError('Unable to connect to server. Please check your connection and try again.');
      } else if (apiError.response?.status === 400) {
        setSubmitError(apiError.response.data?.message || 'Current password is incorrect');
      } else if (apiError.response?.status === 401) {
        setSubmitError('Session expired. Please log in again.');
        router.push('/login');
      } else if (apiError.message?.toLowerCase().includes('network')) {
        setSubmitError('Network error. Please check your connection and try again.');
      } else {
        setSubmitError('Failed to change password. Please try again.');
      }
    }
  };

  return (
    <Box sx={{ p: 3, maxWidth: 600, mx: 'auto' }}>
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 4 }}>
        <LockIcon sx={{ mr: 2, color: 'primary.main', fontSize: 32 }} />
        <Typography variant="h4" component="h1" fontWeight="bold">
          Change Password
        </Typography>
      </Box>

      <Card>
        <CardContent sx={{ p: 4 }}>
          <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
            For your security, please enter your current password and choose a new one.
            You will be logged out after successfully changing your password.
          </Typography>

          {submitError && (
            <Alert severity="error" sx={{ mb: 3 }}>
              {submitError}
            </Alert>
          )}

          <form onSubmit={handleSubmit(onSubmit)} noValidate>
            {/* Current Password */}
            <Controller
              name="currentPassword"
              control={control}
              render={({ field }) => (
                <TextField
                  {...field}
                  label="Current Password"
                  type={showCurrentPassword ? 'text' : 'password'}
                  fullWidth
                  margin="normal"
                  error={!!errors.currentPassword}
                  helperText={errors.currentPassword?.message}
                  InputProps={{
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton
                          aria-label="toggle current password visibility"
                          onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                          edge="end"
                        >
                          {showCurrentPassword ? <VisibilityOff /> : <Visibility />}
                        </IconButton>
                      </InputAdornment>
                    ),
                  }}
                />
              )}
            />

            {/* New Password */}
            <Controller
              name="newPassword"
              control={control}
              render={({ field }) => (
                <TextField
                  {...field}
                  label="New Password"
                  type={showNewPassword ? 'text' : 'password'}
                  fullWidth
                  margin="normal"
                  error={!!errors.newPassword}
                  helperText={
                    errors.newPassword?.message || 
                    'Minimum 6 characters with at least one letter and one number'
                  }
                  InputProps={{
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton
                          aria-label="toggle new password visibility"
                          onClick={() => setShowNewPassword(!showNewPassword)}
                          edge="end"
                        >
                          {showNewPassword ? <VisibilityOff /> : <Visibility />}
                        </IconButton>
                      </InputAdornment>
                    ),
                  }}
                />
              )}
            />

            {/* Submit Button */}
            <Box sx={{ mt: 4, display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
              <Button
                variant="outlined"
                onClick={() => router.back()}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="contained"
                disabled={isSubmitting}
                sx={{ minWidth: 120 }}
              >
                {isSubmitting ? 'Changing...' : 'Change Password'}
              </Button>
            </Box>
          </form>
        </CardContent>
      </Card>

      {/* Security Notice */}
      <Alert severity="info" sx={{ mt: 3 }}>
        <Typography variant="body2">
          <strong>Security Notice:</strong> After changing your password, you will be automatically 
          logged out for security reasons. Please log in again with your new password.
        </Typography>
      </Alert>
    </Box>
  );
}
