'use client';

import React from 'react';
import { Box, Card, CardContent, Typography, Chip } from '@mui/material';
import { Store } from '@mui/icons-material';

interface User {
  id: string;
  username: string;
  context?: {
    distributor_name?: string;
    db_point_id?: string;
  };
}

interface DistributorDashboardProps {
  user: User;
}

export default function DistributorDashboard({ user }: DistributorDashboardProps) {
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
        {user.context?.db_point_id && (
          <Box sx={{ display: 'flex', gap: 1, mt: 2 }}>
            <Chip 
              label={`DB Point: ${user.context.db_point_id}`}
              color="primary" 
              size="small"
            />
          </Box>
        )}
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
