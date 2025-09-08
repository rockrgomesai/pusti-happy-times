'use client';

import React from 'react';
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

  const stats = [
    {
      title: 'Total Users',
      value: 156,
      icon: <People fontSize="large" />,
      color: theme.palette.primary.main,
    },
    {
      title: 'Active Brands',
      value: 12,
      icon: <Business fontSize="large" />,
      color: theme.palette.success.main,
    },
    {
      title: 'System Health',
      value: '99.9%',
      icon: <TrendingUp fontSize="large" />,
      color: theme.palette.warning.main,
    },
    {
      title: 'Online Users',
      value: 24,
      icon: <DashboardIcon fontSize="large" />,
      color: theme.palette.secondary.main,
    },
  ];

  return (
    <Box>
      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Typography variant={isMobile ? 'h4' : 'h3'} component="h1" gutterBottom>
          Dashboard
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Welcome back, {user?.firstName}! Here&apos;s what&apos;s happening with your system today.
        </Typography>
      </Box>

      {/* Stats Grid */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
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
