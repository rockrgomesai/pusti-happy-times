import { z } from 'zod';

// Login form validation schema
export const loginSchema = z.object({
  username: z
    .string()
    .min(1, 'Username is required')
    .min(3, 'Username must be at least 3 characters')
    .max(50, 'Username must not exceed 50 characters'),
  password: z
    .string()
    .min(1, 'Password is required')
    .min(6, 'Password must be at least 6 characters')
    .max(100, 'Password must not exceed 100 characters'),
});

export type LoginFormData = z.infer<typeof loginSchema>;

// Change password form validation schema
export const changePasswordSchema = z
  .object({
    currentPassword: z
      .string()
      .min(1, 'Current password is required'),
    newPassword: z
      .string()
      .min(6, 'New password must be at least 6 characters')
      .max(100, 'Password must not exceed 100 characters')
      .regex(
        /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
        'Password must contain at least one uppercase letter, one lowercase letter, and one number'
      ),
    confirmPassword: z
      .string()
      .min(1, 'Please confirm your password'),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

export type ChangePasswordFormData = z.infer<typeof changePasswordSchema>;

// User form validation schema
export const userSchema = z.object({
  username: z
    .string()
    .min(1, 'Username is required')
    .min(3, 'Username must be at least 3 characters')
    .max(50, 'Username must not exceed 50 characters')
    .regex(/^[a-zA-Z0-9_]+$/, 'Username can only contain letters, numbers, and underscores'),
  firstName: z
    .string()
    .min(1, 'First name is required')
    .max(50, 'First name must not exceed 50 characters'),
  lastName: z
    .string()
    .min(1, 'Last name is required')
    .max(50, 'Last name must not exceed 50 characters'),
  email: z
    .string()
    .email('Invalid email address')
    .optional()
    .or(z.literal('')),
  phone: z
    .string()
    .regex(/^(\+88)?01[3-9]\d{8}$/, 'Invalid Bangladeshi phone number')
    .optional()
    .or(z.literal('')),
  roleId: z
    .string()
    .min(1, 'Role is required'),
  isActive: z.boolean().default(true),
});

export type UserFormData = z.infer<typeof userSchema>;

// Role form validation schema
export const roleSchema = z.object({
  name: z
    .string()
    .min(1, 'Role name is required')
    .max(50, 'Role name must not exceed 50 characters')
    .regex(/^[a-zA-Z0-9_]+$/, 'Role name can only contain letters, numbers, and underscores'),
  displayName: z
    .string()
    .min(1, 'Display name is required')
    .max(100, 'Display name must not exceed 100 characters'),
  description: z
    .string()
    .max(500, 'Description must not exceed 500 characters')
    .optional()
    .or(z.literal('')),
  isActive: z.boolean().default(true),
});

export type RoleFormData = z.infer<typeof roleSchema>;

// Brand form validation schema
export const brandSchema = z.object({
  name: z
    .string()
    .min(1, 'Brand name is required')
    .max(100, 'Brand name must not exceed 100 characters'),
  code: z
    .string()
    .min(1, 'Brand code is required')
    .max(20, 'Brand code must not exceed 20 characters')
    .regex(/^[A-Z0-9_]+$/, 'Brand code must be uppercase letters, numbers, and underscores only'),
  description: z
    .string()
    .max(500, 'Description must not exceed 500 characters')
    .optional()
    .or(z.literal('')),
  parentId: z
    .string()
    .optional()
    .or(z.literal('')),
  isActive: z.boolean().default(true),
  metadata: z
    .object({
      website: z.string().url('Invalid website URL').optional().or(z.literal('')),
      logo: z.string().optional().or(z.literal('')),
      color: z.string().optional().or(z.literal('')),
    })
    .optional(),
});

export type BrandFormData = z.infer<typeof brandSchema>;

// Menu item form validation schema
export const menuItemSchema = z.object({
  label: z
    .string()
    .min(1, 'Label is required')
    .max(100, 'Label must not exceed 100 characters'),
  href: z
    .string()
    .optional()
    .or(z.literal('')),
  icon: z
    .string()
    .min(1, 'Icon is required')
    .max(50, 'Icon name must not exceed 50 characters'),
  mOrder: z
    .number()
    .min(0, 'Order must be a positive number'),
  parentId: z
    .string()
    .optional()
    .or(z.literal('')),
  isSubmenu: z.boolean().default(false),
  isActive: z.boolean().default(true),
});

export type MenuItemFormData = z.infer<typeof menuItemSchema>;

// Generic search/filter schema
export const searchSchema = z.object({
  query: z
    .string()
    .max(100, 'Search query must not exceed 100 characters')
    .optional()
    .or(z.literal('')),
  page: z.number().min(1).default(1),
  limit: z.number().min(1).max(500).default(10),
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).default('asc'),
});

export type SearchParams = z.infer<typeof searchSchema>;

// Date range filter schema
export const dateRangeSchema = z.object({
  startDate: z.string().optional().or(z.literal('')),
  endDate: z.string().optional().or(z.literal('')),
}).refine((data) => {
  if (data.startDate && data.endDate) {
    return new Date(data.startDate) <= new Date(data.endDate);
  }
  return true;
}, {
  message: 'Start date must be before or equal to end date',
  path: ['endDate'],
});

export type DateRangeFilter = z.infer<typeof dateRangeSchema>;
