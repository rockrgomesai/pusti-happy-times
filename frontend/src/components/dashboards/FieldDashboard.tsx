'use client';

import React, { useEffect, useState } from 'react';
import { Box, Typography, Paper, CircularProgress } from '@mui/material';
import { Person } from '@mui/icons-material';
import { apiClient } from '@/lib/api';

interface User {
  id: string;
  username: string;
  context?: {
    employee_name?: string;
    employee_code?: string;
    employee_type?: string;
    territory_assignments?: {
      zone_ids?: string[];
      region_ids?: string[];
      area_ids?: string[];
    };
  };
}

interface FieldDashboardProps {
  user: User;
}

interface TerritoryNames {
  zone?: string;
  region?: string;
  area?: string;
}

export default function FieldDashboard({ user }: FieldDashboardProps) {
  const employeeName = user.context?.employee_name || user.username;
  const zoneIds = user.context?.territory_assignments?.zone_ids || [];
  const regionIds = user.context?.territory_assignments?.region_ids || [];
  const areaIds = user.context?.territory_assignments?.area_ids || [];

  const [territoryNames, setTerritoryNames] = useState<TerritoryNames>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTerritoryNames = async () => {
      const names: TerritoryNames = {};

      try {
        // Fetch zone name
        if (zoneIds[0]) {
          try {
            const response = await apiClient.get<any>(`/territories/${zoneIds[0]}`);
            if (response.success && response.data) {
              names.zone = response.data.name;
            }
          } catch (err: any) {
            // If 403, user doesn't have permission - show ID instead
            if (err.response?.status === 403) {
              names.zone = `Zone (${zoneIds[0].substring(0, 8)}...)`;
            } else {
              console.error('Failed to fetch zone:', err);
            }
          }
        }

        // Fetch region name
        if (regionIds[0]) {
          try {
            const response = await apiClient.get<any>(`/territories/${regionIds[0]}`);
            if (response.success && response.data) {
              names.region = response.data.name;
            }
          } catch (err: any) {
            // If 403, user doesn't have permission - show ID instead
            if (err.response?.status === 403) {
              names.region = `Region (${regionIds[0].substring(0, 8)}...)`;
            } else {
              console.error('Failed to fetch region:', err);
            }
          }
        }

        // Fetch area name
        if (areaIds[0]) {
          try {
            const response = await apiClient.get<any>(`/territories/${areaIds[0]}`);
            if (response.success && response.data) {
              names.area = response.data.name;
            }
          } catch (err: any) {
            // If 403, user doesn't have permission - show ID instead
            if (err.response?.status === 403) {
              names.area = `Area (${areaIds[0].substring(0, 8)}...)`;
            } else {
              console.error('Failed to fetch area:', err);
            }
          }
        }

        setTerritoryNames(names);
      } catch (error) {
        console.error('Error fetching territories:', error);
      } finally {
        setLoading(false);
      }
    };

    if (zoneIds.length > 0 || regionIds.length > 0 || areaIds.length > 0) {
      fetchTerritoryNames();
    } else {
      setLoading(false);
    }
  }, [zoneIds, regionIds, areaIds]);

  return (
    <Box sx={{ p: 3 }}>
      {/* Welcome Header */}
      <Typography variant="h4" component="h1" gutterBottom>
        Dashboard
      </Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
        Welcome back!
      </Typography>

      {/* Employee Info Card - Top Right */}
      <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 3 }}>
        <Paper 
          elevation={2} 
          sx={{ 
            p: 3, 
            minWidth: 300,
            backgroundColor: 'background.paper',
            border: '1px solid',
            borderColor: 'divider'
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
            <Person sx={{ color: 'primary.main' }} />
            <Typography variant="h6">
              {employeeName}
            </Typography>
          </Box>

          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 2 }}>
              <CircularProgress size={24} />
            </Box>
          ) : (
            <Box sx={{ mt: 2 }}>
              {territoryNames.zone && (
                <Box sx={{ mb: 1.5 }}>
                  <Typography variant="caption" color="text.secondary" display="block">
                    Zone
                  </Typography>
                  <Typography variant="body2">
                    {territoryNames.zone}
                  </Typography>
                </Box>
              )}

              {territoryNames.region && (
                <Box sx={{ mb: 1.5 }}>
                  <Typography variant="caption" color="text.secondary" display="block">
                    Region
                  </Typography>
                  <Typography variant="body2">
                    {territoryNames.region}
                  </Typography>
                </Box>
              )}

              {territoryNames.area && (
                <Box sx={{ mb: 1.5 }}>
                  <Typography variant="caption" color="text.secondary" display="block">
                    Area
                  </Typography>
                  <Typography variant="body2">
                    {territoryNames.area}
                  </Typography>
                </Box>
              )}

              {!territoryNames.zone && !territoryNames.region && !territoryNames.area && (
                <Typography variant="body2" color="text.secondary">
                  No territory assigned
                </Typography>
              )}
            </Box>
          )}
        </Paper>
      </Box>
    </Box>
  );
}


