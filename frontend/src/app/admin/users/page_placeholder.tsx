'use client';

import React from 'react';
import { Box, Typography, Alert } from '@mui/material';
import { Person as PersonIcon } from '@mui/icons-material';

export default function AdminUsersPage() {
  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
        <PersonIcon sx={{ mr: 2, color: 'primary.main' }} />
        <Typography variant="h4" component="h1" fontWeight="bold">
          User Management
        </Typography>
      </Box>

      {/* Content */}
      <Alert severity="info" sx={{ mb: 3 }}>
        Admin User Management page is under construction. This will include user creation, 
        editing, role assignment, and access control management.
      </Alert>

      <Typography variant="body1" color="text.secondary">
        Features coming soon:
      </Typography>
      <ul>
        <li>Create and edit user accounts</li>
        <li>Assign roles and permissions</li>
        <li>Manage user status (active/inactive)</li>
        <li>Password reset functionality</li>
        <li>User activity monitoring</li>
      </ul>
    </Box>
  );
}
