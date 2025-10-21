'use client';

import React from 'react';
import { Box, Card, CardContent, Typography, Chip } from '@mui/material';
import { Business } from '@mui/icons-material';

interface User {
  id: string;
  username: string;
  context?: {
    employee_name?: string;
    employee_code?: string;
    department?: string;
  };
}

interface HQDashboardProps {
  user: User;
}

export default function HQDashboard({ user }: HQDashboardProps) {
  const department = user.context?.department || 'Unknown';
  const departmentTitle = department.charAt(0).toUpperCase() + department.slice(1);

  return (
    <Box>
      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1 }}>
          <Business sx={{ fontSize: 40, color: 'primary.main' }} />
          <Box>
            <Typography variant="h3" component="h1">
              {departmentTitle} Dashboard
            </Typography>
            <Typography variant="body1" color="text.secondary">
              Welcome, {user.context?.employee_name || user.username}!
            </Typography>
          </Box>
        </Box>
        <Box sx={{ display: 'flex', gap: 1, mt: 2 }}>
          <Chip 
            label={`Department: ${departmentTitle}`}
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
            HQ Dashboard - Coming Soon
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Department-specific metrics and analytics will be displayed here.
          </Typography>
          <Box sx={{ mt: 3 }}>
            <Typography variant="body2" color="text.secondary">
              Features in development:
            </Typography>
            <ul>
              <li>Department performance metrics</li>
              <li>Team analytics</li>
              <li>Budget tracking</li>
              <li>Reports and insights</li>
            </ul>
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
}
