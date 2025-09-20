'use client';

import React, { useEffect, useMemo, useState } from 'react';
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
            list = dd.map((p: any) => typeof p === 'string' ? p : (p?.api_permissions || p?.permission || p?.key || p?.name)).filter(Boolean);
          } else if (Array.isArray(dd?.permissions)) {
            list = dd.permissions as string[];
          } else if (Array.isArray(d?.permissions)) {
            list = d.permissions as string[];
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
  const canCreate = has('create:category');
  const canUpdate = has('update:category');
  const canDelete = has('delete:category');

  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'cards' | 'list'>('cards');
  const [searchTerm, setSearchTerm] = useState('');
  const [openDialog, setOpenDialog] = useState(false);
  const [editing, setEditing] = useState<Category | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [toDelete, setToDelete] = useState<string | null>(null);

  // Sorting and pagination
  const [orderBy, setOrderBy] = useState<keyof Category>('category');
  const [order, setOrder] = useState<'asc' | 'desc'>('asc');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  const { control, handleSubmit, reset, formState: { errors, isSubmitting }, watch, setValue } = useForm<CategoryFormData>({
    resolver: zodResolver(categorySchema),
    defaultValues: { category: '', parent: null, isActive: true, sortOrder: 0, slug: '' },
  });

  const [slugTouched, setSlugTouched] = useState(false);

  // Auto-generate slug from category if not manually edited
  const watchCategory = watch('category');
  const watchParent = watch('parent');
  const watchSlug = watch('slug');
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
    } catch (err) {
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

  const handleSort = (prop: keyof Category) => {
    const isAsc = orderBy === prop && order === 'asc';
    setOrder(isAsc ? 'desc' : 'asc');
    setOrderBy(prop);
    setPage(0);
  };

  const sorted = useMemo(() => {
    const arr = [...filtered];
    arr.sort((a, b) => {
      let av: any = a[orderBy];
      let bv: any = b[orderBy];
      if (orderBy === 'createdAt' || orderBy === 'updatedAt') {
        av = new Date(a.createdAt || a.created_at || '').getTime() || 0;
        bv = new Date(b.updatedAt || b.updated_at || '').getTime() || 0;
      }
      if (av == null && bv == null) return 0;
      if (av == null) return order === 'asc' ? -1 : 1;
      if (bv == null) return order === 'asc' ? 1 : -1;
      if (typeof av === 'string' && typeof bv === 'string') { av = av.toLowerCase(); bv = bv.toLowerCase(); }
      return order === 'asc' ? (av < bv ? -1 : av > bv ? 1 : 0) : (av > bv ? -1 : av < bv ? 1 : 0);
    });
    return arr;
  }, [filtered, order, orderBy]);

  const paginated = sorted.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);
  const handleChangePage = (_: unknown, newPage: number) => setPage(newPage);
  const handleChangeRowsPerPage = (e: React.ChangeEvent<HTMLInputElement>) => { setRowsPerPage(parseInt(e.target.value, 10)); setPage(0); };

  // CRUD
  const onSubmit = async (data: CategoryFormData) => {
    try {
      const payload: any = { category: data.category, parent: data.parent, isActive: data.isActive, sortOrder: Number(data.sortOrder ?? 0), slug: data.slug };
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
    } catch (err: any) {
      toast.error(err?.response?.data?.message || err?.message || 'Failed to save category');
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
    } catch (err: any) {
      toast.error(err?.response?.data?.message || err?.message || 'Failed to delete category');
    }
  };

  const beginEdit = (c: Category) => {
    setEditing(c);
    setSlugTouched(true);
    reset({ category: c.category, parent: c.parent || null, isActive: !!c.isActive, sortOrder: c.sortOrder ?? 0, slug: c.slug || '' });
    setOpenDialog(true);
  };
  const beginAdd = () => { setEditing(null); setSlugTouched(false); reset({ category: '', parent: null, isActive: true, sortOrder: 0, slug: '' }); setOpenDialog(true); };

  const fmtDate = (v?: string) => { if (!v) return '-'; const d = new Date(v); return Number.isNaN(d.getTime()) ? '-' : d.toLocaleDateString('en-BD', { year: 'numeric', month: 'short', day: 'numeric' }); };

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
      <Table>
        <TableHead>
          <TableRow>
            <TableCell><TableSortLabel active={orderBy === 'category'} direction={orderBy === 'category' ? order : 'asc'} onClick={() => handleSort('category')}>Category</TableSortLabel></TableCell>
            <TableCell>Slug</TableCell>
            <TableCell>Full Slug</TableCell>
            <TableCell><TableSortLabel active={orderBy === 'depth'} direction={orderBy === 'depth' ? order : 'asc'} onClick={() => handleSort('depth')}>Depth</TableSortLabel></TableCell>
            <TableCell>Has Children</TableCell>
            <TableCell><TableSortLabel active={orderBy === 'isActive'} direction={orderBy === 'isActive' ? order : 'asc'} onClick={() => handleSort('isActive')}>Active</TableSortLabel></TableCell>
            <TableCell><TableSortLabel active={orderBy === 'sortOrder'} direction={orderBy === 'sortOrder' ? order : 'asc'} onClick={() => handleSort('sortOrder')}>Sort</TableSortLabel></TableCell>
            <TableCell>Parent</TableCell>
            <TableCell align="right" sx={{
              position: 'sticky',
              right: 0,
              backgroundColor: 'background.paper',
              zIndex: 3,
              minWidth: 120,
            }}>Actions</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {paginated.map((c) => (
            <TableRow key={c._id} hover>
              <TableCell><Typography variant="body1" fontWeight="medium">{c.category}</Typography></TableCell>
              <TableCell>{c.slug}</TableCell>
              <TableCell>{c.fullSlug}</TableCell>
              <TableCell>{c.depth}</TableCell>
              <TableCell>{c.hasChildren ? 'Yes' : 'No'}</TableCell>
              <TableCell>{c.isActive ? 'Yes' : 'No'}</TableCell>
              <TableCell>{c.sortOrder ?? 0}</TableCell>
              <TableCell>{c.parent ? (idToCategory.get(c.parent)?.fullSlug || c.parent) : '-'}</TableCell>
              <TableCell align="right" sx={{
                position: 'sticky',
                right: 0,
                backgroundColor: 'background.paper',
                zIndex: 2,
                minWidth: 120,
              }}>
                {canUpdate && (<Tooltip title="Edit Category"><IconButton size="small" onClick={() => beginEdit(c)} color="primary"><EditIcon /></IconButton></Tooltip>)}
                {canDelete && (<Tooltip title="Delete Category"><IconButton size="small" onClick={() => { setToDelete(c._id); setDeleteConfirmOpen(true); }} color="error"><DeleteIcon /></IconButton></Tooltip>)}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      <TablePagination rowsPerPageOptions={[5, 10, 25, 50]} component="div" count={sorted.length} rowsPerPage={rowsPerPage} page={page} onPageChange={handleChangePage} onRowsPerPageChange={handleChangeRowsPerPage} />
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

      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
        <TextField size="small" placeholder="Search categories (name, slug, full slug)" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} InputProps={{ startAdornment: (<InputAdornment position="start"><SearchIcon /></InputAdornment>) }} sx={{ minWidth: 280 }} />
        <ToggleButtonGroup value={viewMode} exclusive onChange={(_, v) => { if (v) setViewMode(v); }} aria-label="view mode" size="small">
          <ToggleButton value="cards" aria-label="card view"><Tooltip title="Card View"><ViewModuleIcon /></Tooltip></ToggleButton>
          <ToggleButton value="list" aria-label="list view"><Tooltip title="List View"><ViewListIcon /></Tooltip></ToggleButton>
        </ToggleButtonGroup>
      </Box>

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