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
  FormControlLabel,
  Switch,
  Chip,
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Business as BusinessIcon,
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

// Brand type definition (matches backend model exactly)
interface Brand {
  _id: string;
  brand: string;
  active: boolean;
  created_at: string;
  created_by?: { username: string } | null;
  updated_at: string;
  updated_by?: { username: string } | null;
}

// Brand form schema (simplified to match actual database fields)
const brandSchema = z.object({
  brand: z.string().min(2, 'Brand name must be at least 2 characters'),
  active: z.boolean(),
});

type BrandFormData = z.infer<typeof brandSchema>;

type Order = 'asc' | 'desc';

type OrderableKeys = keyof Pick<Brand, 'brand' | 'active' | 'created_at' | 'updated_at' | 'created_by'>;

interface BrandColumnDefinition {
  id: string;
  label: string;
  sortableKey?: OrderableKeys;
  align?: 'inherit' | 'left' | 'center' | 'right' | 'justify';
  alwaysVisible?: boolean;
  renderCell: (brand: Brand) => React.ReactNode;
}

const BRAND_COLUMN_STORAGE_KEY = 'master:brands:visibleColumns';

export default function BrandsPage() {
  // State management
  const [brands, setBrands] = useState<Brand[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'cards' | 'list'>('cards');
  const [searchTerm, setSearchTerm] = useState('');
  const [openDialog, setOpenDialog] = useState(false);
  const [editingBrand, setEditingBrand] = useState<Brand | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [brandToDelete, setBrandToDelete] = useState<string | null>(null);

  // Sorting and pagination state
  const [orderBy, setOrderBy] = useState<OrderableKeys>('brand');
  const [order, setOrder] = useState<Order>('asc');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [visibleBrandColumnIds, setVisibleBrandColumnIds] = useState<string[]>([]);
  const [persistedBrandColumnIds, setPersistedBrandColumnIds] = useState<string[]>([]);
  const brandColumnStateHydratedRef = useRef(false);

  const brandExportColumns = useMemo<ExportColumn<Brand>[]>(
    () => [
      {
        header: 'Brand Name',
        accessor: (row) => row.brand,
      },
      {
        header: 'Status',
        accessor: (row) => row.active ? 'Active' : 'Inactive',
      },
      {
        header: 'Created By',
        accessor: (row) => row.created_by?.username ?? '',
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
    []
  );

  // Form setup
  const {
    control,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<BrandFormData>({
    resolver: zodResolver(brandSchema),
    defaultValues: {
      brand: '',
      active: true,
    },
  });

  // Load brands
  const loadBrands = async () => {
    try {
      setLoading(true);
      const response = await api.get('/brands', {
        params: { limit: 100000 }
      });
      
      // Extract brands array from API response
      const brandsData = response.data?.data && Array.isArray(response.data.data) 
        ? response.data.data 
        : [];
      
      setBrands(brandsData);
    } catch (error) {
      toast.error('Failed to load brands');
      console.error('Error loading brands:', error);
      setBrands([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBrands();
  }, []);

  // Filter brands based on search term
  const filteredBrands = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    if (!query) return brands;
    return brands.filter((brand) => brand.brand.toLowerCase().includes(query));
  }, [brands, searchTerm]);

  // Sorting function
  const handleSort = (property: OrderableKeys) => {
    const isAsc = orderBy === property && order === 'asc';
    setOrder(isAsc ? 'desc' : 'asc');
    setOrderBy(property);
    setPage(0); // Reset to first page when sorting
  };

  // Sort the filtered brands
  const sortedBrands = useMemo(() => {
    const next = [...filteredBrands];
    next.sort((a, b) => {
      let aValue: unknown;
      let bValue: unknown;

      if (orderBy === 'created_at' || orderBy === 'updated_at') {
        aValue = new Date(a[orderBy]).getTime();
        bValue = new Date(b[orderBy]).getTime();
      } else if (orderBy === 'created_by') {
        aValue = a.created_by?.username ?? '';
        bValue = b.created_by?.username ?? '';
      } else if (orderBy === 'active') {
        aValue = a.active ? 1 : 0;
        bValue = b.active ? 1 : 0;
      } else {
        aValue = a[orderBy];
        bValue = b[orderBy];
      }

      if (aValue == null && bValue == null) return 0;
      if (aValue == null) return order === 'asc' ? -1 : 1;
      if (bValue == null) return order === 'asc' ? 1 : -1;

      let aCompare: string | number = String(aValue);
      let bCompare: string | number = String(bValue);

      if (typeof aValue === 'string' && typeof bValue === 'string') {
        aCompare = aValue.toLowerCase();
        bCompare = bValue.toLowerCase();
      } else if (typeof aValue === 'number' && typeof bValue === 'number') {
        aCompare = aValue;
        bCompare = bValue;
      }

      if (order === 'asc') {
        return aCompare < bCompare ? -1 : aCompare > bCompare ? 1 : 0;
      }
      return aCompare > bCompare ? -1 : aCompare < bCompare ? 1 : 0;
    });
    return next;
  }, [filteredBrands, order, orderBy]);

  const fetchAllBrands = useCallback(async () => [...sortedBrands], [sortedBrands]);

  // Paginate the sorted brands
  const paginatedBrands = sortedBrands.slice(
    page * rowsPerPage,
    page * rowsPerPage + rowsPerPage
  );

  // Pagination handlers
  const handleChangePage = (event: unknown, newPage: number) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  // Handle form submission
  const onSubmit = async (data: BrandFormData) => {
    try {
      if (editingBrand) {
  await api.put(`/brands/${editingBrand._id}`, data);
        toast.success('Brand updated successfully');
      } else {
        await api.post('/brands', data);
        toast.success('Brand created successfully');
      }
      
      setOpenDialog(false);
      reset();
      setEditingBrand(null);
      loadBrands();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to save brand';
      toast.error(errorMessage);
    }
  };

  // Handle delete brand
  const handleDeleteBrand = async () => {
    if (!brandToDelete) return;
    
    try {
  await api.delete(`/brands/${brandToDelete}`);
      toast.success('Brand deleted successfully');
      setDeleteConfirmOpen(false);
      setBrandToDelete(null);
      loadBrands();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to delete brand';
      toast.error(errorMessage);
    }
  };

  // Handle edit brand
  const handleEditBrand = useCallback(
    (brand: Brand) => {
      setEditingBrand(brand);
      reset({
        brand: brand.brand,
        active: brand.active,
      });
      setOpenDialog(true);
    },
    [reset]
  );

  // Handle add new brand
  const handleAddBrand = useCallback(() => {
    setEditingBrand(null);
    reset({
      brand: '',
      active: true,
    });
    setOpenDialog(true);
  }, [reset]);

  const formatDate = useCallback((dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-BD', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  }, []);

  const brandColumns = useMemo<BrandColumnDefinition[]>(
    () => [
      {
        id: 'brand',
        label: 'Brand Name',
        sortableKey: 'brand',
        renderCell: (brand) => (
          <Typography variant="body1" fontWeight="medium">
            {brand.brand}
          </Typography>
        ),
      },
      {
        id: 'active',
        label: 'Status',
        sortableKey: 'active',
        renderCell: (brand) => (
          <Chip
            label={brand.active ? 'Active' : 'Inactive'}
            color={brand.active ? 'success' : 'default'}
            variant={brand.active ? 'filled' : 'outlined'}
            size="small"
          />
        ),
      },
      {
        id: 'created_by',
        label: 'Created By',
        sortableKey: 'created_by',
        renderCell: (brand) => brand.created_by?.username ?? '-',
      },
      {
        id: 'updated_by',
        label: 'Updated By',
        renderCell: (brand) => brand.updated_by?.username ?? '-',
      },
      {
        id: 'created_at',
        label: 'Created Date',
        sortableKey: 'created_at',
        renderCell: (brand) => formatDate(brand.created_at),
      },
      {
        id: 'updated_at',
        label: 'Updated Date',
        sortableKey: 'updated_at',
        renderCell: (brand) => formatDate(brand.updated_at),
      },
      {
        id: 'actions',
        label: 'Actions',
        alwaysVisible: true,
        align: 'right',
        renderCell: (brand) => (
          <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1 }}>
            <Tooltip title="Edit Brand">
              <IconButton size="small" onClick={() => handleEditBrand(brand)} color="primary">
                <EditIcon />
              </IconButton>
            </Tooltip>
            <Tooltip title="Delete Brand">
              <IconButton
                size="small"
                onClick={() => {
                  setBrandToDelete(brand._id);
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
    [formatDate, handleEditBrand]
  );

  const selectableBrandColumnIds = useMemo(
    () => brandColumns.filter((column) => !column.alwaysVisible).map((column) => column.id),
    [brandColumns]
  );

  const handleVisibleBrandColumnsChange = useCallback(
    (nextSelected: string[]) => {
      const sanitized = selectableBrandColumnIds.filter((id) => nextSelected.includes(id));
      setVisibleBrandColumnIds(sanitized.length ? sanitized : selectableBrandColumnIds);
    },
    [selectableBrandColumnIds]
  );

  const brandColumnVisibilityOptions = useMemo(
    () => brandColumns.map(({ id, label, alwaysVisible }) => ({ id, label, alwaysVisible })),
    [brandColumns]
  );

  const sanitizeBrandSelection = useCallback(
    (ids: string[]) => selectableBrandColumnIds.filter((id) => ids.includes(id)),
    [selectableBrandColumnIds]
  );

  useEffect(() => {
    if (!selectableBrandColumnIds.length) {
      setVisibleBrandColumnIds([]);
      setPersistedBrandColumnIds([]);
      return;
    }

    if (!brandColumnStateHydratedRef.current) {
      brandColumnStateHydratedRef.current = true;

      let initialSelection = selectableBrandColumnIds;

      try {
        const stored = window.localStorage.getItem(BRAND_COLUMN_STORAGE_KEY);
        if (stored) {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed)) {
            const sanitized = sanitizeBrandSelection(parsed);
            if (sanitized.length) {
              initialSelection = sanitized;
            }
          }
        }
      } catch (error) {
        console.warn('Failed to read brand column preferences', error);
      }

      setVisibleBrandColumnIds(initialSelection);
      setPersistedBrandColumnIds(initialSelection);
      return;
    }

    setVisibleBrandColumnIds((previous) => {
      const sanitizedPrevious = sanitizeBrandSelection(previous);
      if (sanitizedPrevious.length) {
        return sanitizedPrevious;
      }
      return selectableBrandColumnIds;
    });

    setPersistedBrandColumnIds((previous) => {
      const sanitizedPrevious = sanitizeBrandSelection(previous);
      if (sanitizedPrevious.length) {
        return sanitizedPrevious;
      }
      return selectableBrandColumnIds;
    });
  }, [sanitizeBrandSelection, selectableBrandColumnIds]);

  const brandHasUnsavedChanges = useMemo(() => {
    if (visibleBrandColumnIds.length !== persistedBrandColumnIds.length) {
      return true;
    }
    const persistedSet = new Set(persistedBrandColumnIds);
    return visibleBrandColumnIds.some((id) => !persistedSet.has(id));
  }, [persistedBrandColumnIds, visibleBrandColumnIds]);

  const handleSaveBrandColumnSelection = useCallback(() => {
    const sanitized = sanitizeBrandSelection(visibleBrandColumnIds);
    setVisibleBrandColumnIds(sanitized);
    setPersistedBrandColumnIds(sanitized);
    try {
      window.localStorage.setItem(BRAND_COLUMN_STORAGE_KEY, JSON.stringify(sanitized));
      toast.success('Column selection saved');
    } catch (error) {
      console.warn('Failed to persist brand column preferences', error);
      toast.error('Failed to save column selection');
    }
  }, [sanitizeBrandSelection, visibleBrandColumnIds]);

  const visibleBrandColumns = useMemo(
    () =>
      brandColumns.filter(
        (column) => column.alwaysVisible || visibleBrandColumnIds.includes(column.id)
      ),
    [brandColumns, visibleBrandColumnIds]
  );

  const brandTableMinWidth = useMemo(
    () => calculateTableMinWidth(visibleBrandColumns.length),
    [visibleBrandColumns.length]
  );

  // Render cards view
  const renderCardsView = () => (
    <>
      <Grid container spacing={2}>
        {paginatedBrands.map((brand) => (
        <Grid size={{ xs: 12, sm: 6, md: 4 }} key={brand._id}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', mb: 1 }}>
                <Typography variant="h6" component="h2">
                  {brand.brand}
                </Typography>
                <Chip
                  label={brand.active ? 'Active' : 'Inactive'}
                  color={brand.active ? 'success' : 'default'}
                  variant={brand.active ? 'filled' : 'outlined'}
                  size="small"
                />
              </Box>
              <Typography variant="body2" color="text.secondary">
                Created: {formatDate(brand.created_at)}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Updated: {formatDate(brand.updated_at)}
              </Typography>
              {brand.created_by && (
                <Typography variant="body2" color="text.secondary">
                  By: {brand.created_by.username}
                </Typography>
              )}
            </CardContent>
            
            <CardActions sx={{ justifyContent: 'flex-end', pt: 0 }}>
              <Tooltip title="Edit Brand">
                <IconButton
                  size="small"
                  onClick={() => handleEditBrand(brand)}
                  color="primary"
                >
                  <EditIcon />
                </IconButton>
              </Tooltip>
              <Tooltip title="Delete Brand">
                <IconButton
                  size="small"
                  onClick={() => {
                    setBrandToDelete(brand._id);
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
      ))}
    </Grid>
    {/* Pagination for Cards View */}
    <Box sx={{ display: 'flex', justifyContent: 'center', mt: 3 }}>
      <TablePagination
        rowsPerPageOptions={[5, 10, 25, 50]}
        component="div"
        count={sortedBrands.length}
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

  // Render list view
  const renderListView = () => (
    <TableContainer component={Paper} sx={{ overflowX: 'auto' }}>
      <Table sx={{ minWidth: brandTableMinWidth }}>
        <TableHead>
          <TableRow>
            {visibleBrandColumns.map((column) => {
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
          {paginatedBrands.map((brand) => (
            <TableRow key={brand._id} hover>
              {visibleBrandColumns.map((column) => {
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
                    {column.renderCell(brand)}
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
        count={sortedBrands.length}
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
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <BusinessIcon sx={{ mr: 2, color: 'primary.main' }} />
          <Typography variant="h4" component="h1" gutterBottom>
            Brand Management
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={handleAddBrand}
        >
          Add Brand
        </Button>
      </Box>

      {/* Search and View Toggle */}
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
          placeholder="Search brands..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
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
            title="Brand Report"
            fileBaseName="brands"
            currentRows={paginatedBrands}
            columns={brandExportColumns}
            onFetchAll={fetchAllBrands}
            disabled={loading || (brands.length === 0 && paginatedBrands.length === 0)}
          />

          <ColumnVisibilityMenu
            options={brandColumnVisibilityOptions}
            selected={visibleBrandColumnIds}
            onChange={handleVisibleBrandColumnsChange}
            onSaveSelection={handleSaveBrandColumnSelection}
            saveDisabled={!brandHasUnsavedChanges}
            minSelectable={1}
          />

          <ToggleButtonGroup
            value={viewMode}
            exclusive
            onChange={(event, newViewMode) => {
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
        Showing {filteredBrands.length} of {brands.length} brands
      </Typography>

      {/* Main Content */}
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
      ) : sortedBrands.length === 0 ? (
        <Alert severity="info">
          {searchTerm 
            ? `No brands found matching "${searchTerm}". Try a different search term.`
            : 'No brands found. Click "Add Brand" to create your first brand.'
          }
        </Alert>
      ) : viewMode === 'cards' ? (
        renderCardsView()
      ) : (
        renderListView()
      )}

      {/* Add/Edit Dialog */}
      <Dialog 
        open={openDialog} 
        onClose={() => setOpenDialog(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          {editingBrand ? 'Edit Brand' : 'Add New Brand'}
        </DialogTitle>
        <form onSubmit={handleSubmit(onSubmit)}>
          <DialogContent>
            <Controller
              name="brand"
              control={control}
              render={({ field }) => (
                <TextField
                  {...field}
                  label="Brand Name"
                  fullWidth
                  error={!!errors.brand}
                  helperText={errors.brand?.message}
                  margin="normal"
                  placeholder="Enter brand name"
                />
              )}
            />
            
            <Controller
              name="active"
              control={control}
              render={({ field }) => (
                <FormControlLabel
                  control={
                    <Switch
                      checked={field.value ?? true}
                      onChange={(event) => field.onChange(event.target.checked)}
                    />
                  }
                  label="Active"
                  sx={{ mt: 2 }}
                />
              )}
            />
          </DialogContent>
          <DialogActions sx={{ p: 3 }}>
            <Button onClick={() => setOpenDialog(false)}>
              Cancel
            </Button>
            <Button 
              type="submit" 
              variant="contained"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Saving...' : (editingBrand ? 'Update' : 'Create')}
            </Button>
          </DialogActions>
        </form>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteConfirmOpen} onClose={() => setDeleteConfirmOpen(false)}>
        <DialogTitle>Confirm Delete</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete this brand? This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteConfirmOpen(false)}>
            Cancel
          </Button>
          <Button 
            onClick={handleDeleteBrand}
            color="error"
            variant="contained"
          >
            Delete
          </Button>
        </DialogActions>
      </Dialog>

      {/* Floating Action Button for mobile */}
      <Fab
        color="primary"
        aria-label="add brand"
        onClick={handleAddBrand}
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
