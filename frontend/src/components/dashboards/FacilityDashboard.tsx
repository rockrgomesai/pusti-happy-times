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
  Chip,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Divider,
} from '@mui/material';
import {
  Warehouse,
  Inventory,
  LocalShipping,
  TrendingUp,
  LocationOn,
  CheckCircle,
  Warning,
  Add as AddIcon,
} from '@mui/icons-material';
import StatCard from './shared/StatCard';
import api from '@/lib/api';
import { toast } from 'react-hot-toast';
import Link from 'next/link';

interface User {
  id: string;
  username: string;
  context?: {
    employee_name?: string;
    employee_code?: string;
    employee_type?: string;
    facility_assignments?: {
      depot_ids?: string[];
      factory_ids?: string[];
    };
  };
}

interface FacilityDashboardProps {
  user: User;
}

interface Depot {
  _id: string;
  depot_id: string;
  name: string;
  location?: string;
  active: boolean;
  contact_person?: string;
  contact_mobile?: string;
}

interface FacilityStats {
  totalInventory: number;
  pendingOrders: number;
  todayShipments: number;
  lowStockItems: number;
}

export default function FacilityDashboard({ user }: FacilityDashboardProps) {
  const theme = useTheme();
  const [depots, setDepots] = useState<Depot[]>([]);
  const [factories, setFactories] = useState<any[]>([]);
  const [stats, setStats] = useState<FacilityStats>({
    totalInventory: 0,
    pendingOrders: 0,
    todayShipments: 0,
    lowStockItems: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const depotCount = user.context?.facility_assignments?.depot_ids?.length || 0;
  const factoryCount = user.context?.facility_assignments?.factory_ids?.length || 0;

  useEffect(() => {
    loadFacilityData();
  }, []);

  const loadFacilityData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch assigned facilities
      const facilitiesRes = await api.get('/depots/my-facilities');
      if (facilitiesRes.data.success) {
        setDepots(facilitiesRes.data.data.depots || []);
        setFactories(facilitiesRes.data.data.factories || []);
      }

      // Fetch facility stats
      const statsRes = await api.get('/depots/stats');
      if (statsRes.data.success) {
        setStats(statsRes.data.data);
      }
    } catch (err: any) {
      console.error('Failed to load facility data:', err);
      const message = err.response?.data?.message || 'Failed to load facility data';
      setError(message);
      toast.error(message);
      
      // Set mock data for development if API not available
      if (err.response?.status === 404) {
        setStats({
          totalInventory: 15240,
          pendingOrders: 23,
          todayShipments: 12,
          lowStockItems: 5,
        });
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box>
      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1 }}>
          <Warehouse sx={{ fontSize: 40, color: theme.palette.primary.main }} />
          <Box>
            <Typography variant="h3" component="h1">
              Facility Operations Dashboard
            </Typography>
            <Typography variant="body1" color="text.secondary">
              Welcome, {user.context?.employee_name || user.username}!
            </Typography>
          </Box>
        </Box>
        <Box sx={{ display: 'flex', gap: 1, mt: 2 }}>
          <Chip 
            label={`${depotCount} Depot${depotCount !== 1 ? 's' : ''}`}
            color="primary" 
            size="small"
          />
          {factoryCount > 0 && (
            <Chip 
              label={`${factoryCount} Factor${factoryCount !== 1 ? 'ies' : 'y'}`}
              color="secondary" 
              size="small"
            />
          )}
          <Chip 
            label={user.context?.employee_code || ''}
            variant="outlined" 
            size="small"
          />
        </Box>
      </Box>

      {/* Error Alert */}
      {error && (
        <Alert 
          severity="warning" 
          sx={{ mb: 3 }}
          action={
            <Button size="small" onClick={loadFacilityData}>
              Retry
            </Button>
          }
        >
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
          title="Total Inventory"
          value={stats.totalInventory.toLocaleString()}
          icon={<Inventory fontSize="large" />}
          color={theme.palette.primary.main}
          subtitle="items in stock"
        />
        <StatCard
          title="Pending Orders"
          value={stats.pendingOrders}
          icon={<Warning fontSize="large" />}
          color={theme.palette.warning.main}
          subtitle="awaiting processing"
        />
        <StatCard
          title="Today's Shipments"
          value={stats.todayShipments}
          icon={<LocalShipping fontSize="large" />}
          color={theme.palette.success.main}
          subtitle="dispatched today"
        />
        <StatCard
          title="Low Stock Items"
          value={stats.lowStockItems}
          icon={<TrendingUp fontSize="large" />}
          color={theme.palette.error.main}
          subtitle="need reordering"
        />
      </Box>

      {/* Main Content Grid */}
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: {
            xs: '1fr',
            md: '2fr 1fr',
          },
          gap: 3,
        }}
      >
        {/* Assigned Depots */}
        <Card>
          <CardContent>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="h6" component="h2">
                Your Assigned Depots
              </Typography>
              <Chip 
                label={`${depots.length} Active`} 
                color="primary" 
                size="small" 
              />
            </Box>

            {depots.length === 0 ? (
              <Box sx={{ textAlign: 'center', py: 4 }}>
                <Warehouse sx={{ fontSize: 60, color: 'text.disabled', mb: 2 }} />
                <Typography color="text.secondary">
                  No depots assigned yet
                </Typography>
              </Box>
            ) : (
              <List>
                {depots.map((depot, index) => (
                  <React.Fragment key={depot._id}>
                    {index > 0 && <Divider />}
                    <ListItem
                      sx={{
                        '&:hover': {
                          backgroundColor: 'action.hover',
                          cursor: 'pointer',
                        },
                      }}
                      component={Link}
                      href={`/operations/depots/${depot._id}`}
                    >
                      <ListItemIcon>
                        <LocationOn color="primary" />
                      </ListItemIcon>
                      <ListItemText
                        primary={
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Typography variant="body1" fontWeight="medium">
                              {depot.name}
                            </Typography>
                            {depot.active && (
                              <CheckCircle 
                                sx={{ fontSize: 16, color: 'success.main' }} 
                              />
                            )}
                          </Box>
                        }
                        secondary={
                          <>
                            <Typography variant="caption" component="span" display="block">
                              ID: {depot.depot_id}
                            </Typography>
                            {depot.location && (
                              <Typography variant="caption" component="span" display="block">
                                {depot.location}
                              </Typography>
                            )}
                            {depot.contact_person && (
                              <Typography variant="caption" component="span" display="block">
                                Contact: {depot.contact_person}
                                {depot.contact_mobile && ` • ${depot.contact_mobile}`}
                              </Typography>
                            )}
                          </>
                        }
                      />
                    </ListItem>
                  </React.Fragment>
                ))}
              </List>
            )}
          </CardContent>
        </Card>

        {/* Quick Actions & Alerts */}
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          {/* Quick Actions */}
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Quick Actions
              </Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, mt: 2 }}>
                <Button
                  variant="contained"
                  startIcon={<Inventory />}
                  fullWidth
                  component={Link}
                  href="/operations/inventory"
                >
                  Update Inventory
                </Button>
                <Button
                  variant="outlined"
                  startIcon={<LocalShipping />}
                  fullWidth
                  component={Link}
                  href="/operations/shipments"
                >
                  Process Shipment
                </Button>
                <Button
                  variant="outlined"
                  startIcon={<AddIcon />}
                  fullWidth
                  component={Link}
                  href="/operations/orders"
                >
                  View Orders
                </Button>
              </Box>
            </CardContent>
          </Card>

          {/* Alerts */}
          {stats.lowStockItems > 0 && (
            <Card sx={{ borderLeft: 4, borderColor: 'error.main' }}>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                  <Warning color="error" />
                  <Typography variant="h6" color="error.main">
                    Low Stock Alert
                  </Typography>
                </Box>
                <Typography variant="body2" color="text.secondary">
                  {stats.lowStockItems} item{stats.lowStockItems !== 1 ? 's' : ''} running low on stock. 
                  Review inventory levels to prevent stockouts.
                </Typography>
                <Button
                  size="small"
                  sx={{ mt: 2 }}
                  component={Link}
                  href="/operations/inventory?filter=low-stock"
                >
                  View Items
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Pending Actions */}
          {stats.pendingOrders > 0 && (
            <Card sx={{ borderLeft: 4, borderColor: 'warning.main' }}>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                  <Warning color="warning" />
                  <Typography variant="h6" color="warning.main">
                    Pending Orders
                  </Typography>
                </Box>
                <Typography variant="body2" color="text.secondary">
                  {stats.pendingOrders} order{stats.pendingOrders !== 1 ? 's' : ''} waiting for processing.
                </Typography>
                <Button
                  size="small"
                  sx={{ mt: 2 }}
                  component={Link}
                  href="/operations/orders?status=pending"
                >
                  Process Orders
                </Button>
              </CardContent>
            </Card>
          )}
        </Box>
      </Box>

      {/* Factories Section (if assigned) */}
      {factories.length > 0 && (
        <Card sx={{ mt: 3 }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Assigned Factories
            </Typography>
            <List>
              {factories.map((factory, index) => (
                <React.Fragment key={factory._id}>
                  {index > 0 && <Divider />}
                  <ListItem>
                    <ListItemIcon>
                      <Warehouse color="secondary" />
                    </ListItemIcon>
                    <ListItemText
                      primary={factory.name}
                      secondary={`ID: ${factory.factory_id}`}
                    />
                  </ListItem>
                </React.Fragment>
              ))}
            </List>
          </CardContent>
        </Card>
      )}
    </Box>
  );
}
