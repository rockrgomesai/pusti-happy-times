'use client';

import React, { useEffect, useState } from 'react';
import {
  Box,
  Grid as Grid,
  Card,
  CardContent,
  Typography,
  Button,
  useTheme,
  useMediaQuery,
} from '@mui/material';
import {
  People,
  Business,
  Dashboard as DashboardIcon,
  TrendingUp,
} from '@mui/icons-material';
import { useAuth } from '@/contexts/AuthContext';
import api, { apiStatus } from '@/lib/api';

interface StatCardProps {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  color: string;
}

function StatCard({ title, value, icon, color }: StatCardProps) {
  return (
    <Card
      sx={{
        height: '100%',
        background: `linear-gradient(135deg, ${color}15 0%, ${color}05 100%)`,
        border: `1px solid ${color}30`,
        '&:hover': {
          transform: 'translateY(-2px)',
          transition: 'transform 0.3s ease-in-out',
          boxShadow: 4,
        },
      }}
    >
      <CardContent>
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <Box>
            <Typography color="text.secondary" gutterBottom variant="h6">
              {title}
            </Typography>
            <Typography variant="h4" component="div" sx={{ color, fontWeight: 700 }}>
              {value}
            </Typography>
          </Box>
          <Box
            sx={{
              p: 2,
              borderRadius: 2,
              backgroundColor: `${color}20`,
              color: color,
            }}
          >
            {icon}
          </Box>
        </Box>
      </CardContent>
    </Card>
  );
}

export default function DashboardPage() {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const { user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState([
    { title: 'Total Users', value: '—', icon: <People fontSize="large" />, color: theme.palette.primary.main },
    { title: 'Active Brands', value: '—', icon: <Business fontSize="large" />, color: theme.palette.success.main },
    { title: 'System Health', value: '—', icon: <TrendingUp fontSize="large" />, color: theme.palette.warning.main },
    { title: 'Roles', value: '—', icon: <DashboardIcon fontSize="large" />, color: theme.palette.secondary.main },
  ]);
  const [apiOnline, setApiOnline] = useState(true);

  useEffect(() => {
    // subscribe to API status changes
    const off = apiStatus.onChange((online) => setApiOnline(online));
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError(null);
      try {
  console.log('[Dashboard] Fetching /api/stats/public ...');
  const res = await api.get('/stats/public');
  console.log('[Dashboard] Public stats response:', res.status, res.data);
  const d = res.data?.data || {};
        if (cancelled) return;
        setStats([
          { title: 'Total Users', value: d.users ?? 0, icon: <People fontSize="large" />, color: theme.palette.primary.main },
          { title: 'Active Brands', value: d.brands ?? 0, icon: <Business fontSize="large" />, color: theme.palette.success.main },
          { title: 'System Health', value: d.systemHealth === 'OK' ? '100%' : '—', icon: <TrendingUp fontSize="large" />, color: theme.palette.warning.main },
          { title: 'Roles', value: d.roles ?? 0, icon: <DashboardIcon fontSize="large" />, color: theme.palette.secondary.main },
        ]);
      } catch (e: unknown) {
        if (cancelled) return;
        let msg = 'Failed to load stats';
        if (typeof e === 'object' && e && 'response' in e) {
          interface AxiosLikeError { response?: { data?: { message?: string } } }
          const resp = (e as AxiosLikeError).response;
          msg = resp?.data?.message || msg;
        }
        console.error('[Dashboard] Stats fetch error:', e);
        setError(msg);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    const interval = setInterval(load, 30000); // refresh every 30s
    return () => { cancelled = true; clearInterval(interval); off(); };
  }, [theme.palette]);

  return (
    <Box>
      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Typography variant={isMobile ? 'h4' : 'h3'} component="h1" gutterBottom>
          Dashboard
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Welcome back, {user?.username}! Here&apos;s what&apos;s happening with your system today.
        </Typography>
      </Box>

      {/* API Offline Banner */}
      {!apiOnline && (
        <Card sx={{ mb: 2, borderColor: 'warning.main' }} variant="outlined">
          <CardContent>
            <Box display="flex" alignItems="center" justifyContent="space-between" gap={2}>
              <Typography color="warning.main" fontWeight={600}>
                API is currently unreachable. Retrying in background...
              </Typography>
              <Button variant="contained" color="warning" size="small" onClick={() => window.location.reload()}>
                Retry Now
              </Button>
            </Box>
          </CardContent>
        </Card>
      )}

      {/* Stats Grid */}
      {error && (
        <Box sx={{ mb: 2 }}>
          <Typography variant="body2" color="error">{error}</Typography>
        </Box>
      )}
      <Grid container spacing={3} sx={{ mb: 4, opacity: loading ? 0.6 : 1, transition: 'opacity 0.3s ease' }}>
        {stats.map((stat, index) => (
          <Grid key={index} size={{ xs: 12, sm: 6, lg: 3 }}>
            <StatCard
              title={stat.title}
              value={stat.value}
              icon={stat.icon}
              color={stat.color}
            />
          </Grid>
        ))}
      </Grid>

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
              startIcon={<People />}
              sx={{ flex: { sm: 1 } }}
            >
              Add User
            </Button>
            <Button
              variant="outlined"
              startIcon={<Business />}
              sx={{ flex: { sm: 1 } }}
            >
              Manage Brands
            </Button>
            <Button
              variant="outlined"
              startIcon={<DashboardIcon />}
              sx={{ flex: { sm: 1 } }}
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
