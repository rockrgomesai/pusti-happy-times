'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
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
  Autocomplete,
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  BarChart as BarChartIcon,
  ViewList as ViewListIcon,
  ViewModule as ViewModuleIcon,
  Search as SearchIcon,
} from '@mui/icons-material';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'react-hot-toast';
import { outletMarketSizesApi } from '@/lib/api/outletMarketSizes';
import { categoriesApi } from '@/lib/api/categories';
import type { OutletMarketSize } from '@/types/outletMarketSize';
import type { Category } from '@/types/category';

// Form schema
const outletMarketSizeSchema = z.object({
  category: z.string().min(1, 'Category is required'),
  mkt_size: z.number().min(0, 'Market size must be a positive number'),
  active: z.boolean(),
});

type OutletMarketSizeFormData = z.infer<typeof outletMarketSizeSchema>;

type Order = 'asc' | 'desc';
type OrderableKeys = keyof Pick<OutletMarketSize, 'mkt_size' | 'active' | 'created_at' | 'updated_at'>;

interface OutletMarketSizeColumnDefinition {
  id: string;
  label: string;
  sortableKey?: OrderableKeys;
  align?: 'inherit' | 'left' | 'center' | 'right' | 'justify';
  alwaysVisible?: boolean;
  renderCell: (outletMarketSize: OutletMarketSize) => React.ReactNode;
}

export default function OutletMarketSizesPage() {
  // State management
  const [outletMarketSizes, setOutletMarketSizes] = useState<OutletMarketSize[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [categoriesLoading, setCategoriesLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'cards' | 'list'>('cards');
  const [searchTerm, setSearchTerm] = useState('');
  const [openDialog, setOpenDialog] = useState(false);
  const [editingOutletMarketSize, setEditingOutletMarketSize] = useState<OutletMarketSize | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [outletMarketSizeToDelete, setOutletMarketSizeToDelete] = useState<string | null>(null);

  // Sorting and pagination
  const [orderBy, setOrderBy] = useState<OrderableKeys>('mkt_size');
  const [order, setOrder] = useState<Order>('desc');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  // Form setup
  const {
    control,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<OutletMarketSizeFormData>({
    resolver: zodResolver(outletMarketSizeSchema),
    defaultValues: {
      category: '',
      mkt_size: 0,
      active: true,
    },
  });

  // Load categories
  const loadCategories = useCallback(async () => {
    try {
      setCategoriesLoading(true);
      const response = await categoriesApi.list({ sortBy: 'name', sortOrder: 'asc' });
      setCategories(response.data.filter((cat) => cat.active));
    } catch (error) {
      toast.error('Failed to load categories');
      console.error('Error loading categories:', error);
    } finally {
      setCategoriesLoading(false);
    }
  }, []);

  // Load outlet market sizes
  const loadOutletMarketSizes = useCallback(async () => {
    try {
      setLoading(true);
      const response = await outletMarketSizesApi.list({ sortBy: 'mkt_size', sortOrder: 'desc' });
      setOutletMarketSizes(response.data);
    } catch (error) {
      toast.error('Failed to load outlet market sizes');
      console.error('Error loading outlet market sizes:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCategories();
    loadOutletMarketSizes();
  }, [loadCategories, loadOutletMarketSizes]);

  // Form submission
  const onSubmit = async (data: OutletMarketSizeFormData) => {
    try {
      if (editingOutletMarketSize) {
        await outletMarketSizesApi.update(editingOutletMarketSize._id, data);
        toast.success('Outlet market size updated successfully');
      } else {
        await outletMarketSizesApi.create(data);
        toast.success('Outlet market size created successfully');
      }
      
      setOpenDialog(false);
      reset();
      setEditingOutletMarketSize(null);
      loadOutletMarketSizes();
    } catch (error: any) {
      const errorMessage = error?.response?.data?.message || error?.message || 'Failed to save outlet market size';
      toast.error(errorMessage);
    }
  };

  // Handle delete
  const handleDelete = async () => {
    if (!outletMarketSizeToDelete) return;
    
    try {
      await outletMarketSizesApi.delete(outletMarketSizeToDelete);
      toast.success('Outlet market size deactivated successfully');
      setDeleteConfirmOpen(false);
      setOutletMarketSizeToDelete(null);
      loadOutletMarketSizes();
    } catch (error: any) {
      const errorMessage = error?.response?.data?.message || 'Failed to delete outlet market size';
      toast.error(errorMessage);
    }
  };

  // Handle activate/deactivate toggle
  const handleToggleActive = async (outletMarketSize: OutletMarketSize) => {
    try {
      if (outletMarketSize.active) {
        await outletMarketSizesApi.delete(outletMarketSize._id);
        toast.success('Outlet market size deactivated');
      } else {
        await outletMarketSizesApi.activate(outletMarketSize._id);
        toast.success('Outlet market size activated');
      }
      loadOutletMarketSizes();
    } catch (error: any) {
      const errorMessage = error?.response?.data?.message || 'Failed to update status';
      toast.error(errorMessage);
    }
  };

  // Handle edit
  const handleEdit = useCallback(
    (outletMarketSize: OutletMarketSize) => {
      setEditingOutletMarketSize(outletMarketSize);
      reset({
        category: outletMarketSize.category._id,
        mkt_size: outletMarketSize.mkt_size,
        active: outletMarketSize.active,
      });
      setOpenDialog(true);
    },
    [reset]
  );

  // Handle add new
  const handleAdd = useCallback(() => {
    setEditingOutletMarketSize(null);
    reset({
      category: '',
      mkt_size: 0,
      active: true,
    });
    setOpenDialog(true);
  }, [reset]);

  // Format date
  const formatDate = useCallback((dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-BD', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  }, []);

  // Format number
  const formatNumber = useCallback((num: number) => {
    return new Intl.NumberFormat('en-US').format(num);
  }, []);

  // Column definitions
  const columns = useMemo<OutletMarketSizeColumnDefinition[]>(
    () => [
      {
        id: 'category',
        label: 'Category',
        renderCell: (outletMarketSize) => (
          <Typography variant="body1" fontWeight="medium">
            {outletMarketSize.category?.name || 'N/A'}
          </Typography>
        ),
      },
      {
        id: 'mkt_size',
        label: 'Market Size',
        sortableKey: 'mkt_size',
        align: 'right',
        renderCell: (outletMarketSize) => (
          <Typography variant="body1" fontWeight="medium">
            {formatNumber(outletMarketSize.mkt_size)}
          </Typography>
        ),
      },
      {
        id: 'active',
        label: 'Status',
        sortableKey: 'active',
        renderCell: (outletMarketSize) => (
          <Chip
            label={outletMarketSize.active ? 'Active' : 'Inactive'}
            color={outletMarketSize.active ? 'success' : 'default'}
            variant={outletMarketSize.active ? 'filled' : 'outlined'}
            size="small"
          />
        ),
      },
      {
        id: 'created_by',
        label: 'Created By',
        renderCell: (outletMarketSize) => outletMarketSize.created_by || '-',
      },
      {
        id: 'created_at',
        label: 'Created Date',
        sortableKey: 'created_at',
        renderCell: (outletMarketSize) => formatDate(outletMarketSize.created_at),
      },
      {
        id: 'updated_at',
        label: 'Updated Date',
        sortableKey: 'updated_at',
        renderCell: (outletMarketSize) => formatDate(outletMarketSize.updated_at),
      },
      {
        id: 'actions',
        label: 'Actions',
        alwaysVisible: true,
        align: 'right',
        renderCell: (outletMarketSize) => (
          <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1 }}>
            <Tooltip title="Edit">
              <IconButton size="small" onClick={() => handleEdit(outletMarketSize)} color="primary">
                <EditIcon />
              </IconButton>
            </Tooltip>
            <Tooltip title={outletMarketSize.active ? 'Deactivate' : 'Activate'}>
              <IconButton
                size="small"
                onClick={() => handleToggleActive(outletMarketSize)}
                color={outletMarketSize.active ? 'warning' : 'success'}
              >
                {outletMarketSize.active ? <DeleteIcon /> : <AddIcon />}
              </IconButton>
            </Tooltip>
          </Box>
        ),
      },
    ],
    [formatDate, formatNumber, handleEdit]
  );

  // Filter and sort
  const filteredOutletMarketSizes = useMemo(() => {
    return outletMarketSizes.filter((outletMarketSize) =>
      outletMarketSize.category?.name?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [outletMarketSizes, searchTerm]);

  const sortedOutletMarketSizes = useMemo(() => {
    const sorted = [...filteredOutletMarketSizes].sort((a, b) => {
      const aValue = a[orderBy];
      const bValue = b[orderBy];
      
      if (aValue === null || aValue === undefined) return 1;
      if (bValue === null || bValue === undefined) return -1;
      
      if (typeof aValue === 'string' && typeof bValue === 'string') {
        return order === 'asc'
          ? aValue.localeCompare(bValue)
          : bValue.localeCompare(aValue);
      }
      
      return order === 'asc'
        ? aValue < bValue ? -1 : 1
        : bValue < aValue ? -1 : 1;
    });
    return sorted;
  }, [filteredOutletMarketSizes, order, orderBy]);

  const paginatedOutletMarketSizes = useMemo(() => {
    const start = page * rowsPerPage;
    return sortedOutletMarketSizes.slice(start, start + rowsPerPage);
  }, [sortedOutletMarketSizes, page, rowsPerPage]);

  // Handlers
  const handleSort = (key: OrderableKeys) => {
    const isAsc = orderBy === key && order === 'asc';
    setOrder(isAsc ? 'desc' : 'asc');
    setOrderBy(key);
  };

  const handleChangePage = (_event: unknown, newPage: number) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  // Render cards view
  const renderCardsView = () => (
    <>
      <Grid container spacing={2}>
        {paginatedOutletMarketSizes.map((outletMarketSize) => (
          <Grid item xs={12} sm={6} md={4} key={outletMarketSize._id}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', mb: 1 }}>
                  <Box>
                    <Typography variant="h6" component="h2">
                      {outletMarketSize.category?.name || 'N/A'}
                    </Typography>
                    <Typography variant="h5" color="primary" sx={{ mt: 1 }}>
                      {formatNumber(outletMarketSize.mkt_size)}
                    </Typography>
                  </Box>
                  <Chip
                    label={outletMarketSize.active ? 'Active' : 'Inactive'}
                    color={outletMarketSize.active ? 'success' : 'default'}
                    variant={outletMarketSize.active ? 'filled' : 'outlined'}
                    size="small"
                  />
                </Box>
                <Typography variant="body2" color="text.secondary">
                  Created: {formatDate(outletMarketSize.created_at)}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Updated: {formatDate(outletMarketSize.updated_at)}
                </Typography>
              </CardContent>
              
              <CardActions sx={{ justifyContent: 'flex-end', pt: 0 }}>
                <Tooltip title="Edit">
                  <IconButton size="small" onClick={() => handleEdit(outletMarketSize)} color="primary">
                    <EditIcon />
                  </IconButton>
                </Tooltip>
                <Tooltip title={outletMarketSize.active ? 'Deactivate' : 'Activate'}>
                  <IconButton
                    size="small"
                    onClick={() => handleToggleActive(outletMarketSize)}
                    color={outletMarketSize.active ? 'warning' : 'success'}
                  >
                    {outletMarketSize.active ? <DeleteIcon /> : <AddIcon />}
                  </IconButton>
                </Tooltip>
              </CardActions>
            </Card>
          </Grid>
        ))}
      </Grid>
      <Box sx={{ display: 'flex', justifyContent: 'center', mt: 3 }}>
        <TablePagination
          rowsPerPageOptions={[5, 10, 25, 50]}
          component="div"
          count={sortedOutletMarketSizes.length}
          rowsPerPage={rowsPerPage}
          page={page}
          onPageChange={handleChangePage}
          onRowsPerPageChange={handleChangeRowsPerPage}
        />
      </Box>
    </>
  );

  // Render list view
  const renderListView = () => (
    <TableContainer component={Paper}>
      <Table>
        <TableHead>
          <TableRow>
            {columns.map((column) => {
              const sortableKey = column.sortableKey;
              return (
                <TableCell key={column.id} align={column.align} sx={{ fontWeight: 'bold' }}>
                  {sortableKey ? (
                    <TableSortLabel
                      active={orderBy === sortableKey}
                      direction={orderBy === sortableKey ? order : 'asc'}
                      onClick={() => handleSort(sortableKey)}
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
          {paginatedOutletMarketSizes.map((outletMarketSize) => (
            <TableRow key={outletMarketSize._id} hover>
              {columns.map((column) => (
                <TableCell key={column.id} align={column.align}>
                  {column.renderCell(outletMarketSize)}
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
      <TablePagination
        rowsPerPageOptions={[5, 10, 25, 50]}
        component="div"
        count={sortedOutletMarketSizes.length}
        rowsPerPage={rowsPerPage}
        page={page}
        onPageChange={handleChangePage}
        onRowsPerPageChange={handleChangeRowsPerPage}
      />
    </TableContainer>
  );

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <BarChartIcon sx={{ mr: 2, color: 'primary.main' }} />
          <Typography variant="h4" component="h1">
            Outlet Market Sizes
          </Typography>
        </Box>
        <Button variant="contained" startIcon={<AddIcon />} onClick={handleAdd}>
          Add Market Size
        </Button>
      </Box>

      {/* Search and View Toggle */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3, flexWrap: 'wrap', gap: 2 }}>
        <TextField
          size="small"
          placeholder="Search by category..."
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
        <ToggleButtonGroup
          value={viewMode}
          exclusive
          onChange={(_event, newViewMode) => {
            if (newViewMode !== null) {
              setViewMode(newViewMode);
            }
          }}
          size="small"
        >
          <ToggleButton value="cards">
            <Tooltip title="Card View">
              <ViewModuleIcon />
            </Tooltip>
          </ToggleButton>
          <ToggleButton value="list">
            <Tooltip title="List View">
              <ViewListIcon />
            </Tooltip>
          </ToggleButton>
        </ToggleButtonGroup>
      </Box>

      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Showing {filteredOutletMarketSizes.length} of {outletMarketSizes.length} market sizes
      </Typography>

      {/* Main Content */}
      {loading ? (
        <Grid container spacing={2}>
          {[...Array(6)].map((_, index) => (
            <Grid item xs={12} sm={6} md={4} key={index}>
              <Skeleton variant="rectangular" height={150} />
            </Grid>
          ))}
        </Grid>
      ) : filteredOutletMarketSizes.length === 0 ? (
        <Alert severity="info">No outlet market sizes found. Create one to get started.</Alert>
      ) : viewMode === 'cards' ? (
        renderCardsView()
      ) : (
        renderListView()
      )}

      {/* Add/Edit Dialog */}
      <Dialog open={openDialog} onClose={() => setOpenDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{editingOutletMarketSize ? 'Edit Market Size' : 'Add New Market Size'}</DialogTitle>
        <form onSubmit={handleSubmit(onSubmit)}>
          <DialogContent>
            <Controller
              name="category"
              control={control}
              render={({ field: { onChange, value } }) => (
                <Autocomplete
                  options={categories}
                  getOptionLabel={(option) => option.name}
                  value={categories.find((cat) => cat._id === value) || null}
                  onChange={(_event, newValue) => {
                    onChange(newValue?._id || '');
                  }}
                  loading={categoriesLoading}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      label="Category"
                      error={!!errors.category}
                      helperText={errors.category?.message}
                      margin="normal"
                      placeholder="Select a category"
                    />
                  )}
                />
              )}
            />
            
            <Controller
              name="mkt_size"
              control={control}
              render={({ field }) => (
                <TextField
                  {...field}
                  label="Market Size"
                  type="number"
                  fullWidth
                  error={!!errors.mkt_size}
                  helperText={errors.mkt_size?.message}
                  margin="normal"
                  placeholder="Enter market size"
                  onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                  InputProps={{
                    inputProps: { min: 0 }
                  }}
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
            <Button onClick={() => setOpenDialog(false)}>Cancel</Button>
            <Button type="submit" variant="contained" disabled={isSubmitting}>
              {isSubmitting ? 'Saving...' : editingOutletMarketSize ? 'Update' : 'Create'}
            </Button>
          </DialogActions>
        </form>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteConfirmOpen} onClose={() => setDeleteConfirmOpen(false)}>
        <DialogTitle>Confirm Deactivate</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to deactivate this market size entry?
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteConfirmOpen(false)}>Cancel</Button>
          <Button onClick={handleDelete} color="error" variant="contained">
            Deactivate
          </Button>
        </DialogActions>
      </Dialog>

      {/* Floating Action Button for mobile */}
      <Fab
        color="primary"
        aria-label="add market size"
        onClick={handleAdd}
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
