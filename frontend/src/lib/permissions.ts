export const OFFER_PERMISSIONS = {
  create: 'offers:create',
  read: 'offers:read',
  update: 'offers:update',
  remove: 'offers:delete',
} as const;

export type OfferPermission = typeof OFFER_PERMISSIONS[keyof typeof OFFER_PERMISSIONS];

export type PermissionToken = OfferPermission | string;

export const normalizePermissions = (permissionLike: unknown): string[] => {
  if (!permissionLike) {
    return [];
  }
  if (Array.isArray(permissionLike)) {
    return permissionLike.filter((token): token is string => typeof token === 'string').map((token) => token.trim());
  }
  if (typeof permissionLike === 'string') {
    return permissionLike
      .split(',')
      .map((token) => token.trim())
      .filter((token) => token.length);
  }
  if (permissionLike && typeof permissionLike === 'object' && 'permissions' in permissionLike) {
    return normalizePermissions((permissionLike as { permissions?: unknown }).permissions);
  }
  return [];
};

export const hasPermission = (permissions: string[] | undefined | null, token: PermissionToken): boolean => {
  if (!permissions || !permissions.length) {
    return false;
  }
  return permissions.includes(token);
};
