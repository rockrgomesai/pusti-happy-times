'use client';

import React from 'react';
import { Box, Card, CardContent, Typography, Chip } from '@mui/material';
import { Place } from '@mui/icons-material';

interface User {
  id: string;
  username: string;
  context?: {
    employee_name?: string;
    employee_code?: string;
    territory_assignments?: {
      all_territory_ids?: string[];
    };
  };
}

interface FieldDashboardProps {
  user: User;
}

export default function FieldDashboard({ user }: FieldDashboardProps) {
  const territoryCount = user.context?.territory_assignments?.all_territory_ids?.length || 0;

  return (
    <Box>
      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1 }}>
          <Place sx={{ fontSize: 40, color: 'primary.main' }} />
          <Box>
            <Typography variant="h3" component="h1">
              Field Sales Dashboard
            </Typography>
            <Typography variant="body1" color="text.secondary">
              Welcome, {user.context?.employee_name || user.username}!
            </Typography>
          </Box>
        </Box>
        <Box sx={{ display: 'flex', gap: 1, mt: 2 }}>
          <Chip 
            label={`${territoryCount} Territor${territoryCount !== 1 ? 'ies' : 'y'}`}
            color="primary" 
            size="small"
          />
          <Chip 
            label={user.context?.employee_code || ''}
            variant="outlined" 
            size="small"
          />
        </Box>
      </Box>

      {/* Placeholder Content */}
      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Field Dashboard - Coming Soon
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Territory-based sales metrics and activities will be displayed here.
          </Typography>
          <Box sx={{ mt: 3 }}>
            <Typography variant="body2" color="text.secondary">
              Features in development:
            </Typography>
            <ul>
              <li>Territory performance</li>
              <li>Sales targets vs actuals</li>
              <li>Distributor management</li>
              <li>Visit schedule</li>
              <li>Order tracking</li>
            </ul>
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
}
