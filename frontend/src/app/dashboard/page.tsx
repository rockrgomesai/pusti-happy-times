'use client';

import React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import SystemAdminDashboard from '@/components/dashboards/SystemAdminDashboard';
import FacilityDashboard from '@/components/dashboards/FacilityDashboard';
import HQDashboard from '@/components/dashboards/HQDashboard';
import FieldDashboard from '@/components/dashboards/FieldDashboard';
import DistributorDashboard from '@/components/dashboards/DistributorDashboard';
import DashboardSkeleton from '@/components/dashboards/shared/DashboardSkeleton';

export default function DashboardPage() {
  const { user, isLoading } = useAuth();

  // Show loading state
  if (isLoading) {
    return <DashboardSkeleton />;
  }

  // No user - shouldn't happen due to protected route, but handle gracefully
  if (!user) {
    return <DashboardSkeleton />;
  }

  // Route based on user type and employee type
  if (user.user_type === 'employee') {
    const employeeType = user.context?.employee_type;

    switch (employeeType) {
      case 'system_admin':
        return <SystemAdminDashboard user={user} />;

      case 'facility':
        return <FacilityDashboard user={user} />;

      case 'hq':
        return <HQDashboard user={user} />;

      case 'field':
        return <FieldDashboard user={user} />;

      default:
        // Fallback for unknown employee types
        return <SystemAdminDashboard user={user} />;
    }
  }

  if (user.user_type === 'distributor') {
    return <DistributorDashboard user={user} />;
  }

  // Fallback for SuperAdmin or unknown types
  return <SystemAdminDashboard user={user} />;
}
