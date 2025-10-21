'use client';

import React, { useEffect, useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  useTheme,
  Alert,
} from '@mui/material';
import {
  People,
  Business,
  Dashboard as DashboardIcon,
  TrendingUp,
  Add as AddIcon,
  Settings,
} from '@mui/icons-material';
import StatCard from './shared/StatCard';
import api, { apiStatus } from '@/lib/api';
import Link from 'next/link';

interface User {
  id: string;
  username: string;
  context?: {
    employee_name?: string;
    employee_type?: string;
  };
}

interface SystemAdminDashboardProps {
  user: User;
}

interface Stats {
  users: number;
  brands: number;
  systemHealth: string;
  roles: number;
}

export default function SystemAdminDashboard({ user }: SystemAdminDashboardProps) {
  const theme = useTheme();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<Stats>({
    users: 0,
    brands: 0,
    systemHealth: 'OK',
    roles: 0,
  });
  const [apiOnline, setApiOnline] = useState(true);

  useEffect(() => {
    // Subscribe to API status changes
    const unsubscribe = apiStatus.onChange((online) => setApiOnline(online));
    
    loadStats();
    const interval = setInterval(loadStats, 30000); // Refresh every 30s

    return () => {
      unsubscribe();
      clearInterval(interval);
    };
  }, []);

  const loadStats = async () => {
    try {
      setLoading(true);
      setError(null);

      const res = await api.get('/stats/public');
      const data = res.data?.data || {};

      setStats({
        users: data.users ?? 0,
        brands: data.brands ?? 0,
        systemHealth: data.systemHealth || 'OK',
        roles: data.roles ?? 0,
      });
    } catch (err: any) {
      console.error('[Dashboard] Stats fetch error:', err);
      const message = err.response?.data?.message || 'Failed to load stats';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box>
      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h3" component="h1" gutterBottom>
          Dashboard
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Welcome back, {user.context?.employee_name || user.username}! Here&apos;s what&apos;s happening with your system today.
        </Typography>
      </Box>

      {/* API Offline Banner */}
      {!apiOnline && (
        <Alert 
          severity="warning" 
          sx={{ mb: 3 }}
          action={
            <Button size="small" onClick={() => window.location.reload()}>
              Retry Now
            </Button>
          }
        >
          API is currently unreachable. Retrying in background...
        </Alert>
      )}

      {/* Error Alert */}
      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {/* Stats Grid */}
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: {
            xs: '1fr',
            sm: 'repeat(2, 1fr)',
            lg: 'repeat(4, 1fr)',
          },
          gap: 3,
          mb: 4,
          opacity: loading ? 0.6 : 1,
          transition: 'opacity 0.3s ease',
        }}
      >
        <StatCard
          title="Total Users"
          value={stats.users}
          icon={<People fontSize="large" />}
          color={theme.palette.primary.main}
        />
        <StatCard
          title="Active Brands"
          value={stats.brands}
          icon={<Business fontSize="large" />}
          color={theme.palette.success.main}
        />
        <StatCard
          title="System Health"
          value={stats.systemHealth === 'OK' ? '100%' : '—'}
          icon={<TrendingUp fontSize="large" />}
          color={theme.palette.warning.main}
        />
        <StatCard
          title="Roles"
          value={stats.roles}
          icon={<DashboardIcon fontSize="large" />}
          color={theme.palette.secondary.main}
        />
      </Box>

      {/* Quick Actions */}
      <Card sx={{ mb: 4 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Quick Actions
          </Typography>
          <Box
            sx={{
              display: 'flex',
              flexDirection: { xs: 'column', sm: 'row' },
              gap: 2,
              mt: 2,
            }}
          >
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              sx={{ flex: { sm: 1 } }}
              component={Link}
              href="/users"
            >
              Add User
            </Button>
            <Button
              variant="outlined"
              startIcon={<Business />}
              sx={{ flex: { sm: 1 } }}
              component={Link}
              href="/master/brands"
            >
              Manage Brands
            </Button>
            <Button
              variant="outlined"
              startIcon={<Settings />}
              sx={{ flex: { sm: 1 } }}
              component={Link}
              href="/admin/roles"
            >
              System Settings
            </Button>
          </Box>
        </CardContent>
      </Card>

      {/* Recent Activity */}
      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Recent Activity
          </Typography>
          <Box sx={{ mt: 2 }}>
            <Typography variant="body2" color="text.secondary">
              No recent activity to display. Start by managing users or brands.
            </Typography>
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
}
