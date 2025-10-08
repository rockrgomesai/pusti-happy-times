'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Box,
  Typography,
  Button,
  Card,
  CardContent,
  CardActions,
  IconButton,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Alert,
  Fab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Skeleton,
  TableSortLabel,
  InputAdornment,
  ToggleButton,
  ToggleButtonGroup,
  FormControlLabel,
  Switch,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TablePagination,
} from '@mui/material';
// Using Box for grid layout to avoid Grid version/type conflicts
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  ViewList as ViewListIcon,
  ViewModule as ViewModuleIcon,
  Search as SearchIcon,
  Layers as LayersIcon,
} from '@mui/icons-material';
import { useForm, Controller } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'react-hot-toast';
import api from '@/lib/api';
import ExportMenu from '@/components/common/ExportMenu';
import ColumnVisibilityMenu from '@/components/common/ColumnVisibilityMenu';
import { ExportColumn, formatDateForExport } from '@/lib/exportUtils';
import { calculateTableMinWidth } from '@/lib/tableUtils';
import { useAuth } from '@/contexts/AuthContext';

// Backend model shape (fields used by UI)
interface UserRef { username: string }
interface Category {
  _id: string;
  category: string;
  slug: string;
  parent: string | null;
  ancestors: string[];
  hasChildren: boolean;
  depth: number;
  fullSlug: string;
  sortOrder: number;
  isActive: boolean;
  createdBy?: UserRef | null;
  updatedBy?: UserRef | null;
  createdAt?: string; created_at?: string;
  updatedAt?: string; updated_at?: string;
}

type PermissionSource =
  | string
  | {
      api_permissions?: string;
      permission?: string;
      key?: string;
      name?: string;
    };

const extractPermissionName = (entry: PermissionSource): string | undefined => {
  if (typeof entry === 'string') {
    return entry;
  }
  return (
    entry.api_permissions ||
    entry.permission ||
    entry.key ||
    entry.name
  );
};

const getErrorMessage = (error: unknown, fallback: string): string => {
  if (error && typeof error === 'object' && 'response' in error) {
    const response = (error as { response?: { data?: { message?: string } } }).response;
    const message = response?.data?.message;
    if (typeof message === 'string' && message.trim()) {
      return message;
    }
  }
  if (error instanceof Error && error.message) {
    return error.message;
  }
  return fallback;
};

const getComparableValue = (item: Category, key: keyof Category): string | number | boolean | null => {
  if (key === 'createdAt') {
    const source = item.createdAt || item.created_at;
    const timestamp = source ? new Date(source).getTime() : Number.NaN;
    return Number.isNaN(timestamp) ? null : timestamp;
  }
  if (key === 'updatedAt') {
    const source = item.updatedAt || item.updated_at;
    const timestamp = source ? new Date(source).getTime() : Number.NaN;
    return Number.isNaN(timestamp) ? null : timestamp;
  }
  const value = item[key];
  if (value == null) {
    return null;
  }
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    return value;
  }
  return String(value);
};

// Lightweight API permissions hook
function useApiPermissions() {
  const { user } = useAuth();
  const [perms, setPerms] = useState<Set<string>>(new Set());
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        // Prefer AuthContext user if available
        if (user) {
          const roleNameCtx = user?.role?.role;
          if (roleNameCtx && /super\s*admin/i.test(String(roleNameCtx))) {
            if (!cancelled) setIsSuperAdmin(true);
          }
        }

        const me = await api.get('/auth/me');
        const apiUser = me?.data?.data?.user || me?.data?.user || me?.data?.data;
        const role = apiUser?.role ?? apiUser?.roles ?? apiUser?.Role ?? apiUser?.Roles;
        const roleObj = Array.isArray(role) ? role[0] : role;
        const roleId = roleObj?.id || roleObj?._id || apiUser?.roleId || apiUser?.role_id;
        const roleName: string | undefined =
          roleObj?.name || roleObj?.key || roleObj?.title || roleObj?.role || apiUser?.roleName || apiUser?.role_name ||
          (typeof roleObj === 'string' ? roleObj : undefined);
        const superFlag = Boolean(
          apiUser?.isSuperAdmin || apiUser?.superAdmin || apiUser?.is_super_admin ||
          (roleName && /super\s*admin/i.test(String(roleName))) ||
          (typeof roleObj === 'string' && /super\s*admin/i.test(roleObj))
        );
        if (superFlag) {
          if (!cancelled) setIsSuperAdmin(true);
        }
        if (roleId) {
          const res = await api.get(`/api/permissions/api-permissions?roleId=${roleId}`);
          let list: string[] = [];
          const d = res?.data;
          const dd = d?.data ?? d;
          if (Array.isArray(dd)) {
            list = dd
              .map((p) => extractPermissionName(p as PermissionSource))
              .filter((value): value is string => Boolean(value));
          } else if (Array.isArray(dd?.permissions)) {
            const permissions = dd.permissions as unknown[];
            list = permissions.filter((value): value is string => typeof value === 'string');
          } else if (Array.isArray(d?.permissions)) {
            const permissions = d.permissions as unknown[];
            list = permissions.filter((value): value is string => typeof value === 'string');
          }
          if (!cancelled) setPerms(new Set(list));
          return;
        }
      } catch {}
      try {
        const ls = JSON.parse(globalThis.localStorage?.getItem('api_permissions') || '[]');
        if (!cancelled) setPerms(new Set(Array.isArray(ls) ? ls : []));
      } catch {
        if (!cancelled) setPerms(new Set());
      }
    })();
    return () => { cancelled = true; };
  }, [user]);
  const has = useMemo(() => (p: string) => isSuperAdmin || perms.has(p), [perms, isSuperAdmin]);
  return { has, permissions: perms };
}

// Form schema
const categorySchema = z.object({
  category: z.string().min(2, 'Category must be at least 2 characters'),
  parent: z.string().nullable(),
  isActive: z.boolean(),
  sortOrder: z.number().int().min(0),
  slug: z.string().min(1, 'Slug is required').regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Only lowercase letters, numbers, and hyphens'),
});

type CategoryFormData = z.infer<typeof categorySchema>;

type CategoryPayload = Pick<CategoryFormData, 'category' | 'parent' | 'isActive' | 'slug'> & {
  sortOrder: number;
};

type CategoryOrderKey = 'category' | 'depth' | 'isActive' | 'sortOrder';

interface CategoryColumnDefinition {
  id: string;
  label: string;
  sortableKey?: CategoryOrderKey;
  align?: 'inherit' | 'left' | 'center' | 'right' | 'justify';
  alwaysVisible?: boolean;
  minWidth?: number;
  renderCell: (category: Category) => React.ReactNode;
}

const CATEGORY_COLUMN_STORAGE_KEY = 'master:categories:visibleColumns';

// Simple slugify utility
function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
}

export default function CategoriesPage() {
  const { has } = useApiPermissions();
  const canCreate = has('categories:create');
  const canUpdate = has('categories:update');
  const canDelete = has('categories:delete');

  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'cards' | 'list'>('cards');
  const [searchTerm, setSearchTerm] = useState('');
  const [openDialog, setOpenDialog] = useState(false);
  const [editing, setEditing] = useState<Category | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [toDelete, setToDelete] = useState<string | null>(null);

  // Sorting and pagination
  const [orderBy, setOrderBy] = useState<CategoryOrderKey>('category');
  const [order, setOrder] = useState<'asc' | 'desc'>('asc');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [visibleCategoryColumnIds, setVisibleCategoryColumnIds] = useState<string[]>([]);
  const [persistedCategoryColumnIds, setPersistedCategoryColumnIds] = useState<string[]>([]);
  const categoryColumnStateHydratedRef = useRef(false);

  const categoryExportColumns = useMemo<ExportColumn<Category>[]>(
    () => [
      {
        header: 'Category',
        accessor: (row) => row.category,
      },
      {
        header: 'Slug',
        accessor: (row) => row.slug,
      },
      {
        header: 'Parent',
        accessor: (row) => row.parent ?? '',
      },
      {
        header: 'Active',
        accessor: (row) => (row.isActive ? 'Yes' : 'No'),
      },
      {
        header: 'Sort Order',
        accessor: (row) => String(row.sortOrder ?? ''),
      },
      {
        header: 'Created Date',
        accessor: (row) => formatDateForExport(row.createdAt ?? row.created_at ?? ''),
      },
      {
        header: 'Updated Date',
        accessor: (row) => formatDateForExport(row.updatedAt ?? row.updated_at ?? ''),
      },
    ],
    []
  );

  const { control, handleSubmit, reset, formState: { errors, isSubmitting }, watch, setValue } = useForm<CategoryFormData>({
    resolver: zodResolver(categorySchema),
    defaultValues: { category: '', parent: null, isActive: true, sortOrder: 0, slug: '' },
  });

  const [slugTouched, setSlugTouched] = useState(false);

  // Auto-generate slug from category if not manually edited
  const watchCategory = watch('category');
  useEffect(() => {
    if (!slugTouched) {
      const nextSlug = slugify(watchCategory || '');
      setValue('slug', nextSlug, { shouldValidate: true });
    }
  }, [watchCategory, slugTouched, setValue]);

  // Load categories
  const loadCategories = async () => {
    try {
      setLoading(true);
      const res = await api.get('/categories', { params: { page: 1, limit: 1000, sort: 'category' } });
      const arr = Array.isArray(res?.data?.data) ? res.data.data : (Array.isArray(res?.data) ? res.data : []);
      setCategories(arr as Category[]);
    } catch (err: unknown) {
      console.error('Error loading categories', err);
      toast.error('Failed to load categories');
      setCategories([]);
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { loadCategories(); }, []);

  const idToCategory = useMemo(() => {
    const m = new Map<string, Category>();
    categories.forEach(c => m.set(c._id, c));
    return m;
  }, [categories]);

  const parentOptions = useMemo(() => categories
    .filter(c => !editing || c._id !== editing._id)
    .sort((a, b) => a.fullSlug.localeCompare(b.fullSlug)), [categories, editing]);

  const filtered = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    if (!q) return categories;
    return categories.filter(c =>
      c.category.toLowerCase().includes(q) ||
      c.slug.toLowerCase().includes(q) ||
      c.fullSlug.toLowerCase().includes(q)
    );
  }, [categories, searchTerm]);

  const handleSort = (prop: CategoryOrderKey) => {
    const isAsc = orderBy === prop && order === 'asc';
    setOrder(isAsc ? 'desc' : 'asc');
    setOrderBy(prop);
    setPage(0);
  };

  const sorted = useMemo(() => {
    const arr = [...filtered];
    arr.sort((a, b) => {
      const av = getComparableValue(a, orderBy);
      const bv = getComparableValue(b, orderBy);

      if (av == null && bv == null) return 0;
      if (av == null) return order === 'asc' ? -1 : 1;
      if (bv == null) return order === 'asc' ? 1 : -1;

      const valueA = typeof av === 'string' ? av.toLowerCase() : av;
      const valueB = typeof bv === 'string' ? bv.toLowerCase() : bv;

      if (valueA < valueB) {
        return order === 'asc' ? -1 : 1;
      }
      if (valueA > valueB) {
        return order === 'asc' ? 1 : -1;
      }
      return 0;
    });
    return arr;
  }, [filtered, order, orderBy]);

  const fetchAllCategories = useCallback(async () => [...sorted], [sorted]);

  const paginated = sorted.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);
  const handleChangePage = (_: unknown, newPage: number) => setPage(newPage);
  const handleChangeRowsPerPage = (e: React.ChangeEvent<HTMLInputElement>) => { setRowsPerPage(parseInt(e.target.value, 10)); setPage(0); };

  // CRUD
  const onSubmit = async (data: CategoryFormData) => {
    try {
      const payload: CategoryPayload = {
        category: data.category,
        parent: data.parent,
        isActive: data.isActive,
        sortOrder: Number(data.sortOrder ?? 0),
        slug: data.slug,
      };
      if (editing) {
        await api.put(`/api/categories/${editing._id}`, payload);
        toast.success('Category updated');
      } else {
        await api.post('/categories', payload);
        toast.success('Category created');
      }
      setOpenDialog(false);
      setEditing(null);
      setSlugTouched(false);
      reset({ category: '', parent: null, isActive: true, sortOrder: 0, slug: '' });
      loadCategories();
    } catch (err: unknown) {
      toast.error(getErrorMessage(err, 'Failed to save category'));
    }
  };

  const handleDelete = async () => {
    if (!toDelete) return;
    try {
      await api.delete(`/api/categories/${toDelete}`);
      toast.success('Category deleted');
      setDeleteConfirmOpen(false);
      setToDelete(null);
      loadCategories();
    } catch (err: unknown) {
      toast.error(getErrorMessage(err, 'Failed to delete category'));
    }
  };

  const beginEdit = useCallback(
    (c: Category) => {
      setEditing(c);
      setSlugTouched(true);
      reset({
        category: c.category,
        parent: c.parent || null,
        isActive: !!c.isActive,
        sortOrder: c.sortOrder ?? 0,
        slug: c.slug || '',
      });
      setOpenDialog(true);
    },
    [reset]
  );

  const beginAdd = useCallback(() => {
    setEditing(null);
    setSlugTouched(false);
    reset({ category: '', parent: null, isActive: true, sortOrder: 0, slug: '' });
    setOpenDialog(true);
  }, [reset]);

  const fmtDate = (v?: string) => { if (!v) return '-'; const d = new Date(v); return Number.isNaN(d.getTime()) ? '-' : d.toLocaleDateString('en-BD', { year: 'numeric', month: 'short', day: 'numeric' }); };

  const categoryColumns = useMemo<CategoryColumnDefinition[]>(
    () => [
      {
        id: 'category',
        label: 'Category',
        sortableKey: 'category',
        minWidth: 200,
        renderCell: (category) => (
          <Typography variant="body1" fontWeight="medium">
            {category.category}
          </Typography>
        ),
      },
      {
        id: 'slug',
        label: 'Slug',
        minWidth: 180,
        renderCell: (category) => category.slug,
      },
      {
        id: 'fullSlug',
        label: 'Full Slug',
        minWidth: 220,
        renderCell: (category) => category.fullSlug,
      },
      {
        id: 'depth',
        label: 'Depth',
        sortableKey: 'depth',
        renderCell: (category) => category.depth,
      },
      {
        id: 'hasChildren',
        label: 'Has Children',
        renderCell: (category) => (category.hasChildren ? 'Yes' : 'No'),
      },
      {
        id: 'isActive',
        label: 'Active',
        sortableKey: 'isActive',
        renderCell: (category) => (category.isActive ? 'Yes' : 'No'),
      },
      {
        id: 'sortOrder',
        label: 'Sort',
        sortableKey: 'sortOrder',
        renderCell: (category) => category.sortOrder ?? 0,
      },
      {
        id: 'parent',
        label: 'Parent',
        minWidth: 220,
        renderCell: (category) =>
          category.parent ? idToCategory.get(category.parent)?.fullSlug ?? category.parent : '-',
      },
      {
        id: 'actions',
        label: 'Actions',
        alwaysVisible: true,
        align: 'right',
        minWidth: 140,
        renderCell: (category) => (
          <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1 }}>
            {canUpdate && (
              <Tooltip title="Edit Category">
                <IconButton size="small" onClick={() => beginEdit(category)} color="primary">
                  <EditIcon />
                </IconButton>
              </Tooltip>
            )}
            {canDelete && (
              <Tooltip title="Delete Category">
                <IconButton
                  size="small"
                  onClick={() => {
                    setToDelete(category._id);
                    setDeleteConfirmOpen(true);
                  }}
                  color="error"
                >
                  <DeleteIcon />
                </IconButton>
              </Tooltip>
            )}
          </Box>
        ),
      },
    ],
    [beginEdit, canDelete, canUpdate, idToCategory]
  );

  const selectableCategoryColumnIds = useMemo(
    () => categoryColumns.filter((column) => !column.alwaysVisible).map((column) => column.id),
    [categoryColumns]
  );

  const handleVisibleCategoryColumnsChange = useCallback(
    (nextSelected: string[]) => {
      const sanitized = selectableCategoryColumnIds.filter((id) => nextSelected.includes(id));
      setVisibleCategoryColumnIds(sanitized.length ? sanitized : selectableCategoryColumnIds);
    },
    [selectableCategoryColumnIds]
  );

  const sanitizeCategorySelection = useCallback(
    (ids: string[]) => selectableCategoryColumnIds.filter((id) => ids.includes(id)),
    [selectableCategoryColumnIds]
  );

  const categoryColumnVisibilityOptions = useMemo(
    () => categoryColumns.map(({ id, label, alwaysVisible }) => ({ id, label, alwaysVisible })),
    [categoryColumns]
  );

  useEffect(() => {
    if (!selectableCategoryColumnIds.length) {
      setVisibleCategoryColumnIds([]);
      setPersistedCategoryColumnIds([]);
      return;
    }

    if (!categoryColumnStateHydratedRef.current) {
      categoryColumnStateHydratedRef.current = true;

      let initialSelection = selectableCategoryColumnIds;

      try {
        const stored = window.localStorage.getItem(CATEGORY_COLUMN_STORAGE_KEY);
        if (stored) {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed)) {
            const sanitized = sanitizeCategorySelection(parsed);
            if (sanitized.length) {
              initialSelection = sanitized;
            }
          }
        }
      } catch (error) {
        console.warn('Failed to read category column preferences', error);
      }

      setVisibleCategoryColumnIds(initialSelection);
      setPersistedCategoryColumnIds(initialSelection);
      return;
    }

    setVisibleCategoryColumnIds((previous) => {
      const sanitizedPrevious = sanitizeCategorySelection(previous);
      if (sanitizedPrevious.length) {
        return sanitizedPrevious;
      }
      return selectableCategoryColumnIds;
    });

    setPersistedCategoryColumnIds((previous) => {
      const sanitizedPrevious = sanitizeCategorySelection(previous);
      if (sanitizedPrevious.length) {
        return sanitizedPrevious;
      }
      return selectableCategoryColumnIds;
    });
  }, [sanitizeCategorySelection, selectableCategoryColumnIds]);

  const categoryHasUnsavedChanges = useMemo(() => {
    if (visibleCategoryColumnIds.length !== persistedCategoryColumnIds.length) {
      return true;
    }
    const persistedSet = new Set(persistedCategoryColumnIds);
    return visibleCategoryColumnIds.some((id) => !persistedSet.has(id));
  }, [persistedCategoryColumnIds, visibleCategoryColumnIds]);

  const handleSaveCategoryColumnSelection = useCallback(() => {
    const sanitized = sanitizeCategorySelection(visibleCategoryColumnIds);
    setVisibleCategoryColumnIds(sanitized);
    setPersistedCategoryColumnIds(sanitized);
    try {
      window.localStorage.setItem(CATEGORY_COLUMN_STORAGE_KEY, JSON.stringify(sanitized));
      toast.success('Column selection saved');
    } catch (error) {
      console.warn('Failed to persist category column preferences', error);
      toast.error('Failed to save column selection');
    }
  }, [sanitizeCategorySelection, visibleCategoryColumnIds]);

  const visibleCategoryColumns = useMemo(
    () =>
      categoryColumns.filter(
        (column) => column.alwaysVisible || visibleCategoryColumnIds.includes(column.id)
      ),
    [categoryColumns, visibleCategoryColumnIds]
  );

  const categoryTableMinWidth = useMemo(
    () => calculateTableMinWidth(visibleCategoryColumns.length, 180, 1160),
    [visibleCategoryColumns.length]
  );

  const renderCards = () => (
    <>
      <Box sx={{
        display: 'grid',
        gap: 2,
        gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(3, 1fr)' },
      }}>
        {paginated.map((c) => (
          <Box key={c._id}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>{c.category}</Typography>
                <Typography variant="body2" color="text.secondary">Slug: {c.slug}</Typography>
                <Typography variant="body2" color="text.secondary">Full Slug: {c.fullSlug}</Typography>
                <Typography variant="body2" color="text.secondary">Depth: {c.depth}</Typography>
                <Typography variant="body2" color="text.secondary">Active: {c.isActive ? 'Yes' : 'No'}</Typography>
                <Typography variant="body2" color="text.secondary">Sort: {c.sortOrder ?? 0}</Typography>
                <Typography variant="body2" color="text.secondary">Created: {fmtDate(c.createdAt || c.created_at)}</Typography>
                <Typography variant="body2" color="text.secondary">Updated: {fmtDate(c.updatedAt || c.updated_at)}</Typography>
                {c.createdBy && (<Typography variant="body2" color="text.secondary">By: {c.createdBy.username}</Typography>)}
              </CardContent>
              <CardActions sx={{ justifyContent: 'flex-end', pt: 0 }}>
                {canUpdate && (<Tooltip title="Edit Category"><IconButton size="small" onClick={() => beginEdit(c)} color="primary"><EditIcon /></IconButton></Tooltip>)}
                {canDelete && (<Tooltip title="Delete Category"><IconButton size="small" onClick={() => { setToDelete(c._id); setDeleteConfirmOpen(true); }} color="error"><DeleteIcon /></IconButton></Tooltip>)}
              </CardActions>
            </Card>
          </Box>
        ))}
      </Box>
      <Box sx={{ display: 'flex', justifyContent: 'center', mt: 3 }}>
        <TablePagination rowsPerPageOptions={[5, 10, 25, 50]} component="div" count={sorted.length} rowsPerPage={rowsPerPage} page={page} onPageChange={handleChangePage} onRowsPerPageChange={handleChangeRowsPerPage} />
      </Box>
    </>
  );

  const renderList = () => (
    <TableContainer component={Paper} sx={{ overflowX: 'auto', position: 'relative' }}>
      <Table sx={{ minWidth: categoryTableMinWidth }}>
        <TableHead>
          <TableRow>
            {visibleCategoryColumns.map((column) => {
              const isActions = column.id === 'actions';
              const sortableKey = column.sortableKey;
              return (
                <TableCell
                  key={column.id}
                  align={column.align}
                  sx={{
                    fontWeight: 'bold',
                    backgroundColor: 'background.paper',
                    whiteSpace: 'nowrap',
                    minWidth: column.minWidth,
                    ...(isActions
                      ? {
                          position: 'sticky',
                          right: 0,
                          zIndex: 4,
                          boxShadow: (theme) => `-4px 0 8px -4px ${theme.palette.grey[300]}`,
                        }
                      : {}),
                  }}
                >
                  {sortableKey ? (
                    <TableSortLabel
                      active={orderBy === sortableKey}
                      direction={orderBy === sortableKey ? order : 'asc'}
                      onClick={() => handleSort(sortableKey)}
                      sx={{ fontWeight: 'bold' }}
                    >
                      {column.label}
                    </TableSortLabel>
                  ) : (
                    column.label
                  )}
                </TableCell>
              );
            })}
          </TableRow>
        </TableHead>
        <TableBody>
          {paginated.map((category) => (
            <TableRow key={category._id} hover>
              {visibleCategoryColumns.map((column) => {
                const isActions = column.id === 'actions';
                return (
                  <TableCell
                    key={column.id}
                    align={column.align}
                    sx={{
                      backgroundColor: 'background.paper',
                      minWidth: column.minWidth,
                      ...(isActions
                        ? {
                            position: 'sticky',
                            right: 0,
                            zIndex: 3,
                            boxShadow: (theme) => `-4px 0 8px -4px ${theme.palette.grey[200]}`,
                          }
                        : {}),
                    }}
                  >
                    {column.renderCell(category)}
                  </TableCell>
                );
              })}
            </TableRow>
          ))}
        </TableBody>
      </Table>
      <TablePagination
        rowsPerPageOptions={[5, 10, 25, 50]}
        component="div"
        count={sorted.length}
        rowsPerPage={rowsPerPage}
        page={page}
        onPageChange={handleChangePage}
        onRowsPerPageChange={handleChangeRowsPerPage}
      />
    </TableContainer>
  );

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <LayersIcon sx={{ mr: 2, color: 'primary.main' }} />
          <Typography variant="h4" component="h1" fontWeight="bold">Category Management</Typography>
        </Box>
        {canCreate && (<Button variant="contained" startIcon={<AddIcon />} onClick={beginAdd}>Add Category</Button>)}
      </Box>

      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3, flexWrap: 'wrap', gap: 2 }}>
        <TextField
          size="small"
          placeholder="Search categories (name, slug, full slug)"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          InputProps={{ startAdornment: (<InputAdornment position="start"><SearchIcon /></InputAdornment>) }}
          sx={{ minWidth: 280 }}
        />
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <ExportMenu
            title="Category Report"
            fileBaseName="categories"
            currentRows={paginated}
            columns={categoryExportColumns}
            onFetchAll={fetchAllCategories}
            disabled={loading || (categories.length === 0 && paginated.length === 0)}
          />
          <ColumnVisibilityMenu
            options={categoryColumnVisibilityOptions}
            selected={visibleCategoryColumnIds}
            onChange={handleVisibleCategoryColumnsChange}
            onSaveSelection={handleSaveCategoryColumnSelection}
            saveDisabled={!categoryHasUnsavedChanges}
            minSelectable={1}
          />
          <ToggleButtonGroup value={viewMode} exclusive onChange={(_, v) => { if (v) setViewMode(v); }} aria-label="view mode" size="small">
            <ToggleButton value="cards" aria-label="card view"><Tooltip title="Card View"><ViewModuleIcon /></Tooltip></ToggleButton>
            <ToggleButton value="list" aria-label="list view"><Tooltip title="List View"><ViewListIcon /></Tooltip></ToggleButton>
          </ToggleButtonGroup>
        </Box>
      </Box>

      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Showing {filtered.length} of {categories.length} categories
      </Typography>

      {loading ? (
        <Box sx={{
          display: 'grid',
          gap: 2,
          gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(3, 1fr)' },
        }}>
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i}>
              <CardContent>
                <Skeleton variant="text" width="60%" height={32} />
                <Skeleton variant="text" width="40%" height={20} sx={{ mt: 1 }} />
                <Skeleton variant="text" width="80%" height={20} sx={{ mt: 1 }} />
              </CardContent>
            </Card>
          ))}
        </Box>
      ) : sorted.length === 0 ? (
        <Alert severity="info">{searchTerm ? `No categories match "${searchTerm}".` : 'No categories yet. Click "Add Category" to create one.'}</Alert>
      ) : viewMode === 'cards' ? (
        renderCards()
      ) : (
        renderList()
      )}

      <Dialog open={openDialog} onClose={() => setOpenDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{editing ? 'Edit Category' : 'Add New Category'}</DialogTitle>
        <form onSubmit={handleSubmit(onSubmit)}>
          <DialogContent>
            {/* Category (matches first column) */}
            <Controller name="category" control={control} render={({ field }) => (
              <TextField
                {...field}
                label="Category Name"
                fullWidth
                error={!!errors.category}
                helperText={errors.category?.message}
                margin="normal"
                placeholder="Enter category name"
                onChange={(e) => {
                  field.onChange(e);
                  if (!slugTouched) {
                    const generated = slugify(e.target.value || '');
                    setValue('slug', generated, { shouldValidate: true });
                  }
                }}
              />
            )} />

            {/* Slug (matches second column) */}
            <Controller name="slug" control={control} render={({ field }) => (
              <TextField
                {...field}
                id="category-slug-input"
                label="Slug"
                fullWidth
                error={!!errors.slug}
                helperText={errors.slug?.message || 'Only lowercase letters, numbers, and hyphens. Auto-generated from name, editable.'}
                margin="normal"
                placeholder="auto-generated-from-name"
                onChange={(e) => {
                  setSlugTouched(true);
                  field.onChange(slugify(e.target.value));
                }}
                onBlur={() => setSlugTouched(true)}
              />
            )} />

            {/* Full Slug is logic-driven on the backend; no input/preview here. */}

            {/* Sort (column after Active in list, but Active is always last in form) */}
            <Controller name="sortOrder" control={control} render={({ field }) => (
              <TextField
                {...field}
                type="number"
                label="Sort Order"
                inputProps={{ min: 0 }}
                error={!!errors.sortOrder}
                helperText={errors.sortOrder?.message || 'Controls display order among siblings (lower appears first).'}
                margin="normal"
                sx={{ width: 320, maxWidth: '100%' }}
              />
            )} />

            {/* Parent (matches list view column position) */}
            <FormControl fullWidth margin="normal">
              <InputLabel id="parent-label">Parent (optional)</InputLabel>
              <Controller name="parent" control={control} render={({ field }) => (
                <Select {...field} labelId="parent-label" label="Parent (optional)" value={field.value ?? ''} onChange={(e) => field.onChange(e.target.value === '' ? null : String(e.target.value))}>
                  <MenuItem value=""><em>None (root)</em></MenuItem>
                  {parentOptions.map((opt) => (<MenuItem key={opt._id} value={opt._id}>{opt.fullSlug}</MenuItem>))}
                </Select>
              )} />
            </FormControl>

            {/* Active (always last in form) */}
            <Box sx={{ mt: 1 }}>
              <Controller name="isActive" control={control} render={({ field }) => (
                <FormControlLabel control={<Switch checked={field.value} onChange={(_, v) => field.onChange(v)} />} label="Active" />
              )} />
            </Box>
          </DialogContent>
          <DialogActions sx={{ p: 3 }}>
            <Button onClick={() => setOpenDialog(false)}>Cancel</Button>
            <Button type="submit" variant="contained" disabled={isSubmitting}>{isSubmitting ? 'Saving...' : (editing ? 'Update' : 'Create')}</Button>
          </DialogActions>
        </form>
      </Dialog>

      <Dialog open={deleteConfirmOpen} onClose={() => setDeleteConfirmOpen(false)}>
        <DialogTitle>Confirm Delete</DialogTitle>
        <DialogContent><Typography>Delete this category? This action cannot be undone.</Typography></DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteConfirmOpen(false)}>Cancel</Button>
          <Button onClick={handleDelete} color="error" variant="contained">Delete</Button>
        </DialogActions>
      </Dialog>

      {canCreate && (
        <Fab color="primary" aria-label="add category" onClick={beginAdd} sx={{ position: 'fixed', bottom: 16, right: 16, display: { xs: 'flex', sm: 'none' } }}>
          <AddIcon />
        </Fab>
      )}
    </Box>
  );
}