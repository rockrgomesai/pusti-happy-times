'use client';

import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
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
  Grid,
  Skeleton,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  InputAdornment,
  ToggleButton,
  ToggleButtonGroup,
  TableSortLabel,
  TablePagination,
  MenuItem,
  Chip,
  FormControlLabel,
  Switch,
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Category as CategoryIcon,
  ViewList as ViewListIcon,
  ViewModule as ViewModuleIcon,
  Search as SearchIcon,
} from '@mui/icons-material';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'react-hot-toast';
import api from '@/lib/api';
import ExportMenu from '@/components/common/ExportMenu';
import ColumnVisibilityMenu from '@/components/common/ColumnVisibilityMenu';
import { ExportColumn, formatDateForExport } from '@/lib/exportUtils';
import { calculateTableMinWidth } from '@/lib/tableUtils';

type ProductSegment = 'BIS' | 'BEV';

type Order = 'asc' | 'desc';

type OrderableKeys =
  | 'name'
  | 'product_segment'
  | 'created_at'
  | 'updated_at'
  | 'active'
  | 'created_by';

interface ActorInfo {
  username?: string;
  email?: string;
}

interface Category {
  _id: string;
  name: string;
  parent_id: string | null;
  product_segment: ProductSegment | string;
  image_url?: string | null;
  active: boolean;
  created_at: string;
  created_by?: ActorInfo | string | null;
  updated_at: string;
  updated_by?: ActorInfo | string | null;
}

interface CategoryColumnDefinition {
  id: string;
  label: string;
  sortableKey?: OrderableKeys;
  align?: 'inherit' | 'left' | 'center' | 'right' | 'justify';
  alwaysVisible?: boolean;
  renderCell: (category: Category) => React.ReactNode;
}

const PRODUCT_SEGMENTS: ProductSegment[] = ['BIS', 'BEV'];
const CATEGORY_COLUMN_STORAGE_KEY = 'master:categories:visibleColumns';

const segmentLabelMap: Record<ProductSegment, string> = {
  BIS: 'Biscuit (BIS)',
  BEV: 'Beverage (BEV)',
};

const formatActor = (actor?: ActorInfo | string | null) => {
  if (!actor) return '-';
  if (typeof actor === 'string') return actor;
  return actor.username || actor.email || '-';
};

const getSegmentDisplay = (segment?: string | null) => {
  if (!segment) return '-';
  const upper = segment.toUpperCase() as ProductSegment;
  return segmentLabelMap[upper] ?? upper;
};

const renderStatusChip = (active: boolean) => (
  <Chip
    label={active ? 'Active' : 'Inactive'}
    color={active ? 'success' : 'default'}
    variant={active ? 'filled' : 'outlined'}
    size="small"
  />
);

const categorySchema = z
  .object({
    name: z.string().trim().min(2, 'Category name must be at least 2 characters').max(120),
    parent_id: z.string().optional(),
    product_segment: z.string().optional(),
    image_url: z.string().trim().max(500, 'Image URL must not exceed 500 characters').optional().or(z.literal('')),
    active: z.boolean(),
  })
  .superRefine((data, ctx) => {
    const parentId = (data.parent_id ?? '').trim();
    const segment = (data.product_segment ?? '').trim();
    const hasParent = Boolean(parentId);

    if (!hasParent) {
      if (!segment || !PRODUCT_SEGMENTS.includes(segment.toUpperCase() as ProductSegment)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Choose a product segment for root categories',
          path: ['product_segment'],
        });
      }
    }
  });

type CategoryFormData = z.infer<typeof categorySchema> & {
  parent_id?: string;
};

export default function CategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'cards' | 'list'>('cards');
  const [searchTerm, setSearchTerm] = useState('');
  const [openDialog, setOpenDialog] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [categoryToDelete, setCategoryToDelete] = useState<string | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  const [orderBy, setOrderBy] = useState<OrderableKeys>('name');
  const [order, setOrder] = useState<Order>('asc');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [visibleCategoryColumnIds, setVisibleCategoryColumnIds] = useState<string[]>([]);
  const [persistedCategoryColumnIds, setPersistedCategoryColumnIds] = useState<string[]>([]);
  const columnStateHydratedRef = useRef(false);

  const {
    control,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<CategoryFormData>({
    resolver: zodResolver(categorySchema),
    defaultValues: {
      name: '',
      parent_id: '',
      product_segment: 'BIS',
      image_url: '',
      active: true,
    },
  });

  const parentIdValue = watch('parent_id');
  const productSegmentValue = watch('product_segment');

  const categoriesById = useMemo(() => {
    const map = new Map<string, Category>();
    categories.forEach((category) => {
      map.set(category._id, category);
    });
    return map;
  }, [categories]);

  const categoryNameLookup = useMemo(() => {
    return categories.reduce<Record<string, string>>((acc, category) => {
      acc[category._id] = category.name;
      return acc;
    }, {});
  }, [categories]);

  const parentOptions = useMemo(() => {
    return [...categories].sort((a, b) => a.name.localeCompare(b.name));
  }, [categories]);

  const descendantIds = useMemo(() => {
    if (!editingCategory) return new Set<string>();
    const result = new Set<string>();
    const stack = [editingCategory._id];
    while (stack.length) {
      const current = stack.pop();
      if (!current) continue;
      categories.forEach((category) => {
        if (category.parent_id === current && !result.has(category._id)) {
          result.add(category._id);
          stack.push(category._id);
        }
      });
    }
    return result;
  }, [categories, editingCategory]);

  useEffect(() => {
    if (parentIdValue) {
      const parent = categoriesById.get(parentIdValue);
      const inheritedSegment = parent?.product_segment ?? '';
      if (inheritedSegment && productSegmentValue !== inheritedSegment) {
        setValue('product_segment', inheritedSegment, { shouldValidate: true, shouldDirty: true });
      }
    } else if (!parentIdValue && !productSegmentValue) {
      setValue('product_segment', 'BIS', { shouldValidate: false, shouldDirty: false });
    }
  }, [parentIdValue, productSegmentValue, categoriesById, setValue]);

  const loadCategories = useCallback(async () => {
    try {
      setLoading(true);
      const response = await api.get('/categories');
      const categoriesData =
        response.data?.data && Array.isArray(response.data.data) ? response.data.data : [];
      setCategories(categoriesData);
    } catch (error) {
      console.error('Error loading categories:', error);
      toast.error('Failed to load categories');
      setCategories([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCategories();
  }, [loadCategories]);

  const formatDate = useCallback((dateString: string) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('en-BD', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  }, []);

  const filteredCategories = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    if (!query) return categories;
    return categories.filter((category) => {
      const nameMatch = category.name.toLowerCase().includes(query);
      const segmentMatch = category.product_segment?.toLowerCase().includes(query);
      const parentName = category.parent_id ? categoryNameLookup[category.parent_id] ?? '' : '';
      const parentMatch = parentName.toLowerCase().includes(query);
      const statusMatch = (category.active ? 'active' : 'inactive').includes(query);
      return nameMatch || segmentMatch || parentMatch || statusMatch;
    });
  }, [categories, categoryNameLookup, searchTerm]);

  const getSortableValue = useCallback(
    (category: Category, key: OrderableKeys): string | number => {
      switch (key) {
        case 'name':
        case 'product_segment':
          return (category[key] ?? '').toString().toLowerCase();
        case 'created_at':
        case 'updated_at':
          return new Date(category[key]).getTime();
        case 'active':
          return category.active ? 1 : 0;
        case 'created_by':
          return formatActor(category.created_by).toLowerCase();
        default:
          return '';
      }
    },
    []
  );

  const handleSort = (property: OrderableKeys) => {
    const isAsc = orderBy === property && order === 'asc';
    setOrder(isAsc ? 'desc' : 'asc');
    setOrderBy(property);
    setPage(0);
  };

  const sortedCategories = useMemo(() => {
    const next = [...filteredCategories];
    next.sort((a, b) => {
      const aValue = getSortableValue(a, orderBy);
      const bValue = getSortableValue(b, orderBy);

      if (typeof aValue === 'number' && typeof bValue === 'number') {
        return order === 'asc' ? aValue - bValue : bValue - aValue;
      }

      const aString = aValue.toString();
      const bString = bValue.toString();

      if (order === 'asc') {
        return aString.localeCompare(bString, undefined, { sensitivity: 'base' });
      }
      return bString.localeCompare(aString, undefined, { sensitivity: 'base' });
    });
    return next;
  }, [filteredCategories, getSortableValue, order, orderBy]);

  const fetchAllCategories = useCallback(async () => [...sortedCategories], [sortedCategories]);

  const paginatedCategories = useMemo(
    () =>
      sortedCategories.slice(
        page * rowsPerPage,
        page * rowsPerPage + rowsPerPage,
      ),
    [page, rowsPerPage, sortedCategories]
  );

  const handleChangePage = (_event: unknown, newPage: number) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const onSubmit = async (formData: CategoryFormData) => {
    const parentId = (formData.parent_id ?? '').trim();
    const productSegment = (formData.product_segment ?? '').trim().toUpperCase() as ProductSegment | '';

    const payload: Record<string, unknown> = {
      name: formData.name.trim(),
      image_url: formData.image_url?.trim() || null,
      active: formData.active,
    };

    if (parentId) {
      payload.parent_id = parentId;
    } else {
      payload.parent_id = null;
      if (productSegment) {
        payload.product_segment = productSegment;
      }
    }

    try {
      if (editingCategory) {
        await api.put(`/categories/${editingCategory._id}`, payload);
        toast.success('Category updated successfully');
      } else {
        await api.post('/categories', payload);
        toast.success('Category created successfully');
      }

      setOpenDialog(false);
      setEditingCategory(null);
      setImagePreview(null);
      reset({ name: '', parent_id: '', product_segment: 'BIS', image_url: '', active: true });
      loadCategories();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to save category';
      toast.error(errorMessage);
    }
  };

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file');
      return;
    }

    // Validate file size (5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image size must be less than 5MB');
      return;
    }

    setUploadingImage(true);

    try {
      const formData = new FormData();
      formData.append('image', file);

      const response = await api.post('/categories/upload-image', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      const imagePath = response.data.data.path;
      setValue('image_url', imagePath);
      setImagePreview(imagePath);
      toast.success('Image uploaded successfully');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to upload image';
      toast.error(errorMessage);
    } finally {
      setUploadingImage(false);
    }
  };

  const handleRemoveImage = () => {
    setValue('image_url', '');
    setImagePreview(null);
  };

  const handleDeleteCategory = async () => {
    if (!categoryToDelete) return;

    try {
      await api.delete(`/categories/${categoryToDelete}`);
      toast.success('Category deleted successfully');
      setDeleteConfirmOpen(false);
      setCategoryToDelete(null);
      if (editingCategory && editingCategory._id === categoryToDelete) {
        setEditingCategory(null);
      }
      loadCategories();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to delete category';
      toast.error(errorMessage);
    }
  };

  const handleEditCategory = useCallback(
    (category: Category) => {
      setEditingCategory(category);
      reset({
        name: category.name,
        parent_id: category.parent_id ?? '',
        product_segment: category.parent_id
          ? categoriesById.get(category.parent_id)?.product_segment ?? category.product_segment
          : category.product_segment,
        image_url: category.image_url ?? '',
        active: category.active,
      });
      setImagePreview(category.image_url ?? null);
      setOpenDialog(true);
    },
    [categoriesById, reset]
  );

  const handleAddCategory = useCallback(() => {
    setEditingCategory(null);
    setImagePreview(null);
    reset({ name: '', parent_id: '', product_segment: 'BIS', image_url: '', active: true });
    setOpenDialog(true);
  }, [reset]);

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setEditingCategory(null);
    setImagePreview(null);
    reset({ name: '', parent_id: '', product_segment: 'BIS', image_url: '', active: true });
  };

  const categoryColumns = useMemo<CategoryColumnDefinition[]>(
    () => [
      {
        id: 'name',
        label: 'Category Name',
        sortableKey: 'name',
        renderCell: (category) => (
          <Typography variant="body1" fontWeight="medium">
            {category.name}
          </Typography>
        ),
      },
      {
        id: 'product_segment',
        label: 'Product Segment',
        sortableKey: 'product_segment',
        renderCell: (category) => (
          <Chip label={getSegmentDisplay(category.product_segment)} size="small" />
        ),
      },
      {
        id: 'parent',
        label: 'Parent Category',
        renderCell: (category) =>
          category.parent_id ? categoryNameLookup[category.parent_id] ?? '-' : 'Root category',
      },
      {
        id: 'active',
        label: 'Status',
        sortableKey: 'active',
        renderCell: (category) => renderStatusChip(category.active),
      },
      {
        id: 'created_by',
        label: 'Created By',
        sortableKey: 'created_by',
        renderCell: (category) => formatActor(category.created_by),
      },
      {
        id: 'updated_by',
        label: 'Updated By',
        renderCell: (category) => formatActor(category.updated_by),
      },
      {
        id: 'created_at',
        label: 'Created Date',
        sortableKey: 'created_at',
        renderCell: (category) => formatDate(category.created_at),
      },
      {
        id: 'updated_at',
        label: 'Updated Date',
        sortableKey: 'updated_at',
        renderCell: (category) => formatDate(category.updated_at),
      },
      {
        id: 'actions',
        label: 'Actions',
        alwaysVisible: true,
        align: 'right',
        renderCell: (category) => (
          <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1 }}>
            <Tooltip title="Edit Category">
              <IconButton size="small" onClick={() => handleEditCategory(category)} color="primary">
                <EditIcon />
              </IconButton>
            </Tooltip>
            <Tooltip title="Delete Category">
              <IconButton
                size="small"
                onClick={() => {
                  setCategoryToDelete(category._id);
                  setDeleteConfirmOpen(true);
                }}
                color="error"
              >
                <DeleteIcon />
              </IconButton>
            </Tooltip>
          </Box>
        ),
      },
    ],
    [categoryNameLookup, formatDate, handleEditCategory]
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

  const categoryColumnVisibilityOptions = useMemo(
    () => categoryColumns.map(({ id, label, alwaysVisible }) => ({ id, label, alwaysVisible })),
    [categoryColumns]
  );

  const sanitizeCategorySelection = useCallback(
    (ids: string[]) => selectableCategoryColumnIds.filter((id) => ids.includes(id)),
    [selectableCategoryColumnIds]
  );

  useEffect(() => {
    if (!selectableCategoryColumnIds.length) {
      setVisibleCategoryColumnIds([]);
      setPersistedCategoryColumnIds([]);
      return;
    }

    if (!columnStateHydratedRef.current) {
      columnStateHydratedRef.current = true;

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
        (column) => column.alwaysVisible || visibleCategoryColumnIds.includes(column.id),
      ),
    [categoryColumns, visibleCategoryColumnIds]
  );

  const categoryTableMinWidth = useMemo(
    () => calculateTableMinWidth(visibleCategoryColumns.length),
    [visibleCategoryColumns.length]
  );

  const categoryExportColumns = useMemo<ExportColumn<Category>[]>(
    () => [
      {
        header: 'Name',
        accessor: (row) => row.name,
      },
      {
        header: 'Product Segment',
        accessor: (row) => getSegmentDisplay(row.product_segment),
      },
      {
        header: 'Parent Category',
        accessor: (row) => (row.parent_id ? categoryNameLookup[row.parent_id] ?? '' : 'Root'),
      },
      {
        header: 'Status',
        accessor: (row) => (row.active ? 'Active' : 'Inactive'),
      },
      {
        header: 'Created By',
        accessor: (row) => formatActor(row.created_by),
      },
      {
        header: 'Created Date',
        accessor: (row) => formatDateForExport(row.created_at),
      },
      {
        header: 'Updated Date',
        accessor: (row) => formatDateForExport(row.updated_at),
      },
    ],
    [categoryNameLookup]
  );

  const renderCardsView = () => (
    <>
      <Grid container spacing={2}>
        {paginatedCategories.map((category) => {
          const parentName = category.parent_id
            ? categoryNameLookup[category.parent_id] ?? 'Unknown'
            : 'Root category';
          return (
            <Grid size={{ xs: 12, sm: 6, md: 4 }} key={category._id}>
              <Card>
                {category.image_url && (
                  <Box
                    component="img"
                    src={category.image_url}
                    alt={category.name}
                    sx={{
                      width: '100%',
                      height: 140,
                      objectFit: 'cover',
                    }}
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = 'none';
                    }}
                  />
                )}
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                    <Typography variant="h6" component="h2">
                      {category.name}
                    </Typography>
                    {renderStatusChip(category.active)}
                  </Box>
                  <Typography variant="body2" color="text.secondary">
                    Segment: {getSegmentDisplay(category.product_segment)}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Parent: {parentName}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Updated: {formatDate(category.updated_at)}
                  </Typography>
                </CardContent>
                <CardActions sx={{ justifyContent: 'flex-end', pt: 0 }}>
                  <Tooltip title="Edit Category">
                    <IconButton size="small" onClick={() => handleEditCategory(category)} color="primary">
                      <EditIcon />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Delete Category">
                    <IconButton
                      size="small"
                      onClick={() => {
                        setCategoryToDelete(category._id);
                        setDeleteConfirmOpen(true);
                      }}
                      color="error"
                    >
                      <DeleteIcon />
                    </IconButton>
                  </Tooltip>
                </CardActions>
              </Card>
            </Grid>
          );
        })}
      </Grid>
      <Box sx={{ display: 'flex', justifyContent: 'center', mt: 3 }}>
        <TablePagination
          rowsPerPageOptions={[5, 10, 25, 50]}
          component="div"
          count={sortedCategories.length}
          rowsPerPage={rowsPerPage}
          page={page}
          onPageChange={handleChangePage}
          onRowsPerPageChange={handleChangeRowsPerPage}
          sx={{
            '& .MuiTablePagination-toolbar': {
              paddingLeft: 2,
              paddingRight: 2,
            },
            '& .MuiTablePagination-selectLabel, & .MuiTablePagination-displayedRows': {
              fontSize: '0.875rem',
              fontWeight: 500,
            },
          }}
        />
      </Box>
    </>
  );

  const renderListView = () => (
    <TableContainer component={Paper} sx={{ overflowX: 'auto' }}>
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
                    whiteSpace: 'nowrap',
                    backgroundColor: 'background.paper',
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
          {paginatedCategories.map((category) => (
            <TableRow key={category._id} hover>
              {visibleCategoryColumns.map((column) => {
                const isActions = column.id === 'actions';
                return (
                  <TableCell
                    key={column.id}
                    align={column.align}
                    sx={{
                      backgroundColor: 'background.paper',
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
        count={sortedCategories.length}
        rowsPerPage={rowsPerPage}
        page={page}
        onPageChange={handleChangePage}
        onRowsPerPageChange={handleChangeRowsPerPage}
        sx={{
          '& .MuiTablePagination-toolbar': {
            paddingLeft: 2,
            paddingRight: 2,
          },
          '& .MuiTablePagination-selectLabel, & .MuiTablePagination-displayedRows': {
            fontSize: '0.875rem',
            fontWeight: 500,
          },
        }}
      />
    </TableContainer>
  );

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <CategoryIcon sx={{ mr: 2, color: 'primary.main' }} />
          <Typography variant="h4" component="h1" gutterBottom>
            Category Management
          </Typography>
        </Box>
        <Button variant="contained" startIcon={<AddIcon />} onClick={handleAddCategory}>
          Add Category
        </Button>
      </Box>

      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          mb: 3,
          flexWrap: 'wrap',
          gap: 2,
        }}
      >
        <TextField
          size="small"
          placeholder="Search categories..."
          value={searchTerm}
          onChange={(event) => setSearchTerm(event.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon />
              </InputAdornment>
            ),
          }}
          sx={{ minWidth: 250 }}
        />
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <ExportMenu
            title="Category Report"
            fileBaseName="categories"
            currentRows={paginatedCategories}
            columns={categoryExportColumns}
            onFetchAll={fetchAllCategories}
            disabled={loading || (categories.length === 0 && paginatedCategories.length === 0)}
          />

          <ColumnVisibilityMenu
            options={categoryColumnVisibilityOptions}
            selected={visibleCategoryColumnIds}
            onChange={handleVisibleCategoryColumnsChange}
            onSaveSelection={handleSaveCategoryColumnSelection}
            saveDisabled={!categoryHasUnsavedChanges}
            minSelectable={1}
          />

          <ToggleButtonGroup
            value={viewMode}
            exclusive
            onChange={(_event, newViewMode) => {
              if (newViewMode !== null) {
                setViewMode(newViewMode);
              }
            }}
            aria-label="view mode"
            size="small"
          >
            <ToggleButton value="cards" aria-label="card view">
              <Tooltip title="Card View">
                <ViewModuleIcon />
              </Tooltip>
            </ToggleButton>
            <ToggleButton value="list" aria-label="list view">
              <Tooltip title="List View">
                <ViewListIcon />
              </Tooltip>
            </ToggleButton>
          </ToggleButtonGroup>
        </Box>
      </Box>

      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Showing {filteredCategories.length} of {categories.length} categories
      </Typography>

      {loading ? (
        <Grid container spacing={2}>
          {Array.from({ length: 6 }).map((_, index) => (
            <Grid size={{ xs: 12, sm: 6, md: 4 }} key={index}>
              <Card>
                <CardContent>
                  <Skeleton variant="text" width="60%" height={32} />
                  <Skeleton variant="text" width="40%" height={20} sx={{ mt: 1 }} />
                  <Skeleton variant="text" width="80%" height={20} sx={{ mt: 1 }} />
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      ) : sortedCategories.length === 0 ? (
        <Alert severity="info">
          {searchTerm
            ? `No categories found matching "${searchTerm}". Try a different search term.`
            : 'No categories found. Click "Add Category" to create your first entry.'}
        </Alert>
      ) : viewMode === 'cards' ? (
        renderCardsView()
      ) : (
        renderListView()
      )}

      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
        <DialogTitle>{editingCategory ? 'Edit Category' : 'Add New Category'}</DialogTitle>
        <form onSubmit={handleSubmit(onSubmit)}>
          <DialogContent>
            <Controller
              name="name"
              control={control}
              render={({ field }) => (
                <TextField
                  {...field}
                  label="Category Name"
                  fullWidth
                  error={!!errors.name}
                  helperText={errors.name?.message}
                  margin="normal"
                  placeholder="Enter category name"
                />
              )}
            />

            <Controller
              name="parent_id"
              control={control}
              render={({ field }) => (
                <TextField
                  {...field}
                  value={field.value ?? ''}
                  onChange={(event) => field.onChange(event.target.value)}
                  select
                  label="Parent Category"
                  fullWidth
                  margin="normal"
                  helperText="Select a parent to nest this category"
                >
                  <MenuItem value="">No parent (root category)</MenuItem>
                  {parentOptions.map((option) => (
                    <MenuItem
                      key={option._id}
                      value={option._id}
                      disabled={
                        option._id === editingCategory?._id || descendantIds.has(option._id)
                      }
                    >
                      {option.name} ({option.product_segment})
                    </MenuItem>
                  ))}
                </TextField>
              )}
            />

            <Box sx={{ mt: 2, mb: 1 }}>
              <Typography variant="subtitle2" gutterBottom>
                Category Image (Optional)
              </Typography>
              {imagePreview ? (
                <Box>
                  <Box
                    component="img"
                    src={imagePreview}
                    alt="Category preview"
                    sx={{
                      width: '100%',
                      maxHeight: 200,
                      objectFit: 'cover',
                      borderRadius: 1,
                      mb: 1,
                    }}
                  />
                  <Button
                    variant="outlined"
                    color="error"
                    size="small"
                    onClick={handleRemoveImage}
                    fullWidth
                  >
                    Remove Image
                  </Button>
                </Box>
              ) : (
                <Button
                  variant="outlined"
                  component="label"
                  fullWidth
                  disabled={uploadingImage}
                >
                  {uploadingImage ? 'Uploading...' : 'Upload Image'}
                  <input
                    type="file"
                    hidden
                    accept="image/*"
                    onChange={handleImageUpload}
                  />
                </Button>
              )}
              <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
                Supported: JPG, PNG, GIF (Max 5MB)
              </Typography>
            </Box>

            <Controller
              name="product_segment"
              control={control}
              render={({ field }) => (
                <TextField
                  {...field}
                  value={field.value ?? ''}
                  onChange={(event) => field.onChange(event.target.value)}
                  select
                  label="Product Segment"
                  fullWidth
                  margin="normal"
                  disabled={!!parentIdValue}
                  error={!!errors.product_segment}
                  helperText={
                    parentIdValue
                      ? 'Inherited from parent category'
                      : errors.product_segment?.message ?? 'Required for root categories'
                  }
                >
                  {PRODUCT_SEGMENTS.map((segment) => (
                    <MenuItem key={segment} value={segment}>
                      {getSegmentDisplay(segment)}
                    </MenuItem>
                  ))}
                </TextField>
              )}
            />

            <Controller
              name="active"
              control={control}
              render={({ field }) => (
                <FormControlLabel
                  control={
                    <Switch
                      checked={field.value}
                      onChange={(event) => field.onChange(event.target.checked)}
                    />
                  }
                  label="Active"
                />
              )}
            />
          </DialogContent>
          <DialogActions sx={{ p: 3 }}>
            <Button onClick={handleCloseDialog} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" variant="contained" disabled={isSubmitting}>
              {isSubmitting ? 'Saving...' : editingCategory ? 'Update' : 'Create'}
            </Button>
          </DialogActions>
        </form>
      </Dialog>

      <Dialog open={deleteConfirmOpen} onClose={() => setDeleteConfirmOpen(false)}>
        <DialogTitle>Confirm Delete</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete this category? Child categories, if any, will be
            reassigned to the parent category.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteConfirmOpen(false)}>Cancel</Button>
          <Button onClick={handleDeleteCategory} color="error" variant="contained">
            Delete
          </Button>
        </DialogActions>
      </Dialog>

      <Fab
        color="primary"
        aria-label="add category"
        onClick={handleAddCategory}
        sx={{
          position: 'fixed',
          bottom: 16,
          right: 16,
          display: { xs: 'flex', sm: 'none' },
        }}
      >
        <AddIcon />
      </Fab>
    </Box>
  );
}
