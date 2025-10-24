'use client';

import React, { useEffect, useState } from 'react';
import { Box, Card, CardContent, Typography, Chip, CircularProgress } from '@mui/material';
import { Store, LocationOn } from '@mui/icons-material';
import apiClient from '@/lib/api';

interface User {
  id: string;
  username: string;
  context?: {
    distributor_name?: string;
    db_point_id?: string;
    territory_assignments?: {
      zone_ids?: string[];
      region_ids?: string[];
      area_ids?: string[];
    };
  };
}

interface DistributorDashboardProps {
  user: User;
}

interface TerritoryNames {
  dbPointName: string;
  zoneName: string;
  regionName: string;
  areaName: string;
}

export default function DistributorDashboard({ user }: DistributorDashboardProps) {
  const [territoryNames, setTerritoryNames] = useState<TerritoryNames | null>(null);
  const [loadingTerritories, setLoadingTerritories] = useState(true);

  useEffect(() => {
    loadTerritoryNames();
  }, []);

  const loadTerritoryNames = async () => {
    try {
      setLoadingTerritories(true);
      const names: TerritoryNames = {
        dbPointName: '',
        zoneName: '',
        regionName: '',
        areaName: '',
      };

      // Fetch DB Point name
      if (user.context?.db_point_id) {
        try {
          const dbPointRes = await apiClient.get(`/territories/${user.context.db_point_id}`);
          if (dbPointRes.success && dbPointRes.data) {
            names.dbPointName = dbPointRes.data.name || user.context.db_point_id;
          }
        } catch (error) {
          console.error('Error fetching DB Point:', error);
          names.dbPointName = user.context.db_point_id.substring(0, 8);
        }
      }

      // Fetch Zone name
      const zoneId = user.context?.territory_assignments?.zone_ids?.[0];
      if (zoneId) {
        try {
          const zoneRes = await apiClient.get(`/territories/${zoneId}`);
          if (zoneRes.success && zoneRes.data) {
            names.zoneName = zoneRes.data.name || zoneId.substring(0, 8);
          }
        } catch (error) {
          console.error('Error fetching Zone:', error);
          names.zoneName = zoneId.substring(0, 8);
        }
      }

      // Fetch Region name
      const regionId = user.context?.territory_assignments?.region_ids?.[0];
      if (regionId) {
        try {
          const regionRes = await apiClient.get(`/territories/${regionId}`);
          if (regionRes.success && regionRes.data) {
            names.regionName = regionRes.data.name || regionId.substring(0, 8);
          }
        } catch (error) {
          console.error('Error fetching Region:', error);
          names.regionName = regionId.substring(0, 8);
        }
      }

      // Fetch Area name
      const areaId = user.context?.territory_assignments?.area_ids?.[0];
      if (areaId) {
        try {
          const areaRes = await apiClient.get(`/territories/${areaId}`);
          if (areaRes.success && areaRes.data) {
            names.areaName = areaRes.data.name || areaId.substring(0, 8);
          }
        } catch (error) {
          console.error('Error fetching Area:', error);
          names.areaName = areaId.substring(0, 8);
        }
      }

      setTerritoryNames(names);
    } catch (error) {
      console.error('Error loading territory names:', error);
    } finally {
      setLoadingTerritories(false);
    }
  };

  return (
    <Box>
      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1 }}>
          <Store sx={{ fontSize: 40, color: 'primary.main' }} />
          <Box>
            <Typography variant="h3" component="h1">
              Distributor Dashboard
            </Typography>
            <Typography variant="body1" color="text.secondary">
              Welcome, {user.context?.distributor_name || user.username}!
            </Typography>
          </Box>
        </Box>
        <Box sx={{ display: 'flex', gap: 1, mt: 2, flexWrap: 'wrap' }}>
          {loadingTerritories ? (
            <CircularProgress size={20} />
          ) : (
            <>
              {territoryNames?.dbPointName && (
                <Chip 
                  icon={<LocationOn />}
                  label={`DB Point: ${territoryNames.dbPointName}`}
                  color="primary" 
                  size="small"
                />
              )}
              {territoryNames?.zoneName && (
                <Chip 
                  label={`Zone: ${territoryNames.zoneName}`}
                  variant="outlined"
                  size="small"
                />
              )}
              {territoryNames?.regionName && (
                <Chip 
                  label={`Region: ${territoryNames.regionName}`}
                  variant="outlined"
                  size="small"
                />
              )}
              {territoryNames?.areaName && (
                <Chip 
                  label={`Area: ${territoryNames.areaName}`}
                  variant="outlined"
                  size="small"
                />
              )}
            </>
          )}
        </Box>
      </Box>

      {/* Placeholder Content */}
      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Distributor Dashboard - Coming Soon
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Order management and catalog features will be displayed here.
          </Typography>
          <Box sx={{ mt: 3 }}>
            <Typography variant="body2" color="text.secondary">
              Features in development:
            </Typography>
            <ul>
              <li>Pending orders</li>
              <li>Order history</li>
              <li>Product catalog</li>
              <li>Account balance</li>
              <li>Invoices and payments</li>
            </ul>
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
}
