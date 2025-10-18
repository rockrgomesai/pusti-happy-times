import { useMemo } from 'react';

import { useAuth } from '@/contexts/AuthContext';
import { hasPermission as hasPermissionToken, normalizePermissions, type PermissionToken } from '@/lib/permissions';

export const usePermissions = () => {
  const { user } = useAuth();
  const permissions = useMemo(() => normalizePermissions(user?.permissions), [user?.permissions]);

  const hasPermission = (token: PermissionToken): boolean => hasPermissionToken(permissions, token);

  return {
    permissions,
    hasPermission,
  };
};
