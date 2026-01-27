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
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Label as LabelIcon,
  ViewList as ViewListIcon,
  ViewModule as ViewModuleIcon,
  Search as SearchIcon,
} from '@mui/icons-material';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'react-hot-toast';
import { outletTypesApi } from '@/lib/api/outletTypes';
import type { OutletType } from '@/types/outletType';

// Form schema
const outletTypeSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  active: z.boolean(),
});

type OutletTypeFormData = z.infer<typeof outletTypeSchema>;

type Order = 'asc' | 'desc';
type OrderableKeys = keyof Pick<OutletType, 'name' | 'active' | 'created_at' | 'updated_at'>;

interface OutletTypeColumnDefinition {
  id: string;
  label: string;
  sortableKey?: OrderableKeys;
  align?: 'inherit' | 'left' | 'center' | 'right' | 'justify';
  alwaysVisible?: boolean;
  renderCell: (outletType: OutletType) => React.ReactNode;
}

export default function OutletTypesPage() {
  // State management
  const [outletTypes, setOutletTypes] = useState<OutletType[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'cards' | 'list'>('cards');
  const [searchTerm, setSearchTerm] = useState('');
  const [openDialog, setOpenDialog] = useState(false);
  const [editingOutletType, setEditingOutletType] = useState<OutletType | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [outletTypeToDelete, setOutletTypeToDelete] = useState<string | null>(null);

  // Sorting and pagination
  const [orderBy, setOrderBy] = useState<OrderableKeys>('name');
  const [order, setOrder] = useState<Order>('asc');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  // Form setup
  const {
    control,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<OutletTypeFormData>({
    resolver: zodResolver(outletTypeSchema),
    defaultValues: {
      name: '',
      active: true,
    },
  });

  // Load outlet types
  const loadOutletTypes = useCallback(async () => {
    try {
      setLoading(true);
      const response = await outletTypesApi.list({ sortBy: 'name', sortOrder: 'asc' });
      setOutletTypes(response.data);
    } catch (error) {
      toast.error('Failed to load outlet types');
      console.error('Error loading outlet types:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadOutletTypes();
  }, [loadOutletTypes]);

  // Form submission
  const onSubmit = async (data: OutletTypeFormData) => {
    try {
      if (editingOutletType) {
        await outletTypesApi.update(editingOutletType._id, data);
        toast.success('Outlet type updated successfully');
      } else {
        await outletTypesApi.create(data);
        toast.success('Outlet type created successfully');
      }
      
      setOpenDialog(false);
      reset();
      setEditingOutletType(null);
      loadOutletTypes();
    } catch (error: any) {
      const errorMessage = error?.response?.data?.message || error?.message || 'Failed to save outlet type';
      toast.error(errorMessage);
    }
  };

  // Handle delete
  const handleDelete = async () => {
    if (!outletTypeToDelete) return;
    
    try {
      await outletTypesApi.delete(outletTypeToDelete);
      toast.success('Outlet type deactivated successfully');
      setDeleteConfirmOpen(false);
      setOutletTypeToDelete(null);
      loadOutletTypes();
    } catch (error: any) {
      const errorMessage = error?.response?.data?.message || 'Failed to delete outlet type';
      toast.error(errorMessage);
    }
  };

  // Handle activate/deactivate toggle
  const handleToggleActive = async (outletType: OutletType) => {
    try {
      if (outletType.active) {
        await outletTypesApi.delete(outletType._id);
        toast.success('Outlet type deactivated');
      } else {
        await outletTypesApi.activate(outletType._id);
        toast.success('Outlet type activated');
      }
      loadOutletTypes();
    } catch (error: any) {
      const errorMessage = error?.response?.data?.message || 'Failed to update status';
      toast.error(errorMessage);
    }
  };

  // Handle edit
  const handleEdit = useCallback(
    (outletType: OutletType) => {
      setEditingOutletType(outletType);
      reset({
        name: outletType.name,
        active: outletType.active,
      });
      setOpenDialog(true);
    },
    [reset]
  );

  // Handle add new
  const handleAdd = useCallback(() => {
    setEditingOutletType(null);
    reset({
      name: '',
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

  // Column definitions
  const columns = useMemo<OutletTypeColumnDefinition[]>(
    () => [
      {
        id: 'name',
        label: 'Outlet Type',
        sortableKey: 'name',
        renderCell: (outletType) => (
          <Typography variant="body1" fontWeight="medium">
            {outletType.name}
          </Typography>
        ),
      },
      {
        id: 'active',
        label: 'Status',
        sortableKey: 'active',
        renderCell: (outletType) => (
          <Chip
            label={outletType.active ? 'Active' : 'Inactive'}
            color={outletType.active ? 'success' : 'default'}
            variant={outletType.active ? 'filled' : 'outlined'}
            size="small"
          />
        ),
      },
      {
        id: 'created_by',
        label: 'Created By',
        renderCell: (outletType) => outletType.created_by || '-',
      },
      {
        id: 'created_at',
        label: 'Created Date',
        sortableKey: 'created_at',
        renderCell: (outletType) => formatDate(outletType.created_at),
      },
      {
        id: 'updated_at',
        label: 'Updated Date',
        sortableKey: 'updated_at',
        renderCell: (outletType) => formatDate(outletType.updated_at),
      },
      {
        id: 'actions',
        label: 'Actions',
        alwaysVisible: true,
        align: 'right',
        renderCell: (outletType) => (
          <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1 }}>
            <Tooltip title="Edit">
              <IconButton size="small" onClick={() => handleEdit(outletType)} color="primary">
                <EditIcon />
              </IconButton>
            </Tooltip>
            <Tooltip title={outletType.active ? 'Deactivate' : 'Activate'}>
              <IconButton
                size="small"
                onClick={() => handleToggleActive(outletType)}
                color={outletType.active ? 'warning' : 'success'}
              >
                {outletType.active ? <DeleteIcon /> : <AddIcon />}
              </IconButton>
            </Tooltip>
          </Box>
        ),
      },
    ],
    [formatDate, handleEdit]
  );

  // Filter and sort
  const filteredOutletTypes = useMemo(() => {
    return outletTypes.filter((outletType) =>
      outletType.name.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [outletTypes, searchTerm]);

  const sortedOutletTypes = useMemo(() => {
    const sorted = [...filteredOutletTypes].sort((a, b) => {
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
  }, [filteredOutletTypes, order, orderBy]);

  const paginatedOutletTypes = useMemo(() => {
    const start = page * rowsPerPage;
    return sortedOutletTypes.slice(start, start + rowsPerPage);
  }, [sortedOutletTypes, page, rowsPerPage]);

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
        {paginatedOutletTypes.map((outletType) => (
          <Grid item xs={12} sm={6} md={4} key={outletType._id}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', mb: 1 }}>
                  <Typography variant="h6" component="h2">
                    {outletType.name}
                  </Typography>
                  <Chip
                    label={outletType.active ? 'Active' : 'Inactive'}
                    color={outletType.active ? 'success' : 'default'}
                    variant={outletType.active ? 'filled' : 'outlined'}
                    size="small"
                  />
                </Box>
                <Typography variant="body2" color="text.secondary">
                  Created: {formatDate(outletType.created_at)}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Updated: {formatDate(outletType.updated_at)}
                </Typography>
              </CardContent>
              
              <CardActions sx={{ justifyContent: 'flex-end', pt: 0 }}>
                <Tooltip title="Edit">
                  <IconButton size="small" onClick={() => handleEdit(outletType)} color="primary">
                    <EditIcon />
                  </IconButton>
                </Tooltip>
                <Tooltip title={outletType.active ? 'Deactivate' : 'Activate'}>
                  <IconButton
                    size="small"
                    onClick={() => handleToggleActive(outletType)}
                    color={outletType.active ? 'warning' : 'success'}
                  >
                    {outletType.active ? <DeleteIcon /> : <AddIcon />}
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
          count={sortedOutletTypes.length}
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
          {paginatedOutletTypes.map((outletType) => (
            <TableRow key={outletType._id} hover>
              {columns.map((column) => (
                <TableCell key={column.id} align={column.align}>
                  {column.renderCell(outletType)}
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
      <TablePagination
        rowsPerPageOptions={[5, 10, 25, 50]}
        component="div"
        count={sortedOutletTypes.length}
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
          <LabelIcon sx={{ mr: 2, color: 'primary.main' }} />
          <Typography variant="h4" component="h1">
            Outlet Types
          </Typography>
        </Box>
        <Button variant="contained" startIcon={<AddIcon />} onClick={handleAdd}>
          Add Outlet Type
        </Button>
      </Box>

      {/* Search and View Toggle */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3, flexWrap: 'wrap', gap: 2 }}>
        <TextField
          size="small"
          placeholder="Search outlet types..."
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
        Showing {filteredOutletTypes.length} of {outletTypes.length} outlet types
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
      ) : filteredOutletTypes.length === 0 ? (
        <Alert severity="info">No outlet types found. Create one to get started.</Alert>
      ) : viewMode === 'cards' ? (
        renderCardsView()
      ) : (
        renderListView()
      )}

      {/* Add/Edit Dialog */}
      <Dialog open={openDialog} onClose={() => setOpenDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{editingOutletType ? 'Edit Outlet Type' : 'Add New Outlet Type'}</DialogTitle>
        <form onSubmit={handleSubmit(onSubmit)}>
          <DialogContent>
            <Controller
              name="name"
              control={control}
              render={({ field }) => (
                <TextField
                  {...field}
                  label="Outlet Type Name"
                  fullWidth
                  error={!!errors.name}
                  helperText={errors.name?.message}
                  margin="normal"
                  placeholder="e.g., Grocery Store, Restaurant, etc."
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
              {isSubmitting ? 'Saving...' : editingOutletType ? 'Update' : 'Create'}
            </Button>
          </DialogActions>
        </form>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteConfirmOpen} onClose={() => setDeleteConfirmOpen(false)}>
        <DialogTitle>Confirm Deactivate</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to deactivate this outlet type?
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
        aria-label="add outlet type"
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
