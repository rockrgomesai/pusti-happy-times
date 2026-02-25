'use client';

import React, { useState, useEffect, useMemo } from 'react';
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

// Distributor Type definition
interface DistributorType {
  _id: string;
  type_name: string;
  description?: string;
  active: boolean;
  created_at: string;
  created_by?: { username: string } | null;
  updated_at: string;
  updated_by?: { username: string } | null;
}

// Form schema
const distributorTypeSchema = z.object({
  type_name: z.string().min(2, 'Type name must be at least 2 characters').max(100),
  description: z.string().max(500).optional(),
  active: z.boolean(),
});

type DistributorTypeFormData = z.infer<typeof distributorTypeSchema>;

type Order = 'asc' | 'desc';

export default function DistributorTypesPage() {
  // State management
  const [types, setTypes] = useState<DistributorType[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'cards' | 'list'>('cards');
  const [searchTerm, setSearchTerm] = useState('');
  const [openDialog, setOpenDialog] = useState(false);
  const [editingType, setEditingType] = useState<DistributorType | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [typeToDelete, setTypeToDelete] = useState<string | null>(null);

  // Sorting and pagination state
  const [orderBy, setOrderBy] = useState<'type_name' | 'active' | 'created_at'>('type_name');
  const [order, setOrder] = useState<Order>('asc');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  // Form setup
  const {
    control,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<DistributorTypeFormData>({
    resolver: zodResolver(distributorTypeSchema),
    defaultValues: {
      type_name: '',
      description: '',
      active: true,
    },
  });

  // Load types
  const loadTypes = async () => {
    try {
      setLoading(true);
      const response = await api.get('/distributor-types');
      const typesData = response.data?.data && Array.isArray(response.data.data) 
        ? response.data.data 
        : [];
      setTypes(typesData);
    } catch (error) {
      toast.error('Failed to load distributor types');
      console.error('Error loading distributor types:', error);
      setTypes([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTypes();
  }, []);

  // Filter types based on search term
  const filteredTypes = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    if (!query) return types;
    return types.filter((type) => 
      type.type_name.toLowerCase().includes(query) ||
      type.description?.toLowerCase().includes(query)
    );
  }, [types, searchTerm]);

  // Sorting function
  const handleSort = (property: 'type_name' | 'active' | 'created_at') => {
    const isAsc = orderBy === property && order === 'asc';
    setOrder(isAsc ? 'desc' : 'asc');
    setOrderBy(property);
    setPage(0);
  };

  // Sort the filtered types
  const sortedTypes = useMemo(() => {
    const next = [...filteredTypes];
    next.sort((a, b) => {
      let aValue: any;
      let bValue: any;

      if (orderBy === 'type_name') {
        aValue = a.type_name.toLowerCase();
        bValue = b.type_name.toLowerCase();
      } else if (orderBy === 'active') {
        aValue = a.active ? 1 : 0;
        bValue = b.active ? 1 : 0;
      } else if (orderBy === 'created_at') {
        aValue = new Date(a.created_at).getTime();
        bValue = new Date(b.created_at).getTime();
      }

      if (order === 'asc') {
        return aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
      } else {
        return aValue > bValue ? -1 : aValue < bValue ? 1 : 0;
      }
    });
    return next;
  }, [filteredTypes, order, orderBy]);

  // Paginated types
  const paginatedTypes = useMemo(() => {
    const startIndex = page * rowsPerPage;
    return sortedTypes.slice(startIndex, startIndex + rowsPerPage);
  }, [sortedTypes, page, rowsPerPage]);

  // Pagination handlers
  const handleChangePage = (_event: unknown, newPage: number) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  // CRUD operations
  const handleOpenDialog = (type?: DistributorType) => {
    if (type) {
      setEditingType(type);
      reset({
        type_name: type.type_name,
        description: type.description || '',
        active: type.active,
      });
    } else {
      setEditingType(null);
      reset({
        type_name: '',
        description: '',
        active: true,
      });
    }
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setEditingType(null);
    reset();
  };

  const onSubmit = async (data: DistributorTypeFormData) => {
    try {
      if (editingType) {
        // Update
        await api.put(`/distributor-types/${editingType._id}`, data);
        toast.success('Distributor type updated successfully');
      } else {
        // Create
        await api.post('/distributor-types', data);
        toast.success('Distributor type created successfully');
      }
      handleCloseDialog();
      loadTypes();
    } catch (error: any) {
      const message = error.response?.data?.message || 'Operation failed';
      toast.error(message);
      console.error('Error saving distributor type:', error);
    }
  };

  const handleDeleteClick = (typeId: string) => {
    setTypeToDelete(typeId);
    setDeleteConfirmOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!typeToDelete) return;

    try {
      await api.delete(`/distributor-types/${typeToDelete}`);
      toast.success('Distributor type deleted successfully');
      setDeleteConfirmOpen(false);
      setTypeToDelete(null);
      loadTypes();
    } catch (error: any) {
      const message = error.response?.data?.message || 'Failed to delete distributor type';
      toast.error(message);
      console.error('Error deleting distributor type:', error);
    }
  };

  // Render loading skeleton
  if (loading) {
    return (
      <Box sx={{ p: 3 }}>
        <Skeleton variant="rectangular" height={60} sx={{ mb: 3 }} />
        <Grid container spacing={3}>
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Grid item xs={12} sm={6} md={4} key={i}>
              <Skeleton variant="rectangular" height={150} />
            </Grid>
          ))}
        </Grid>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <CategoryIcon sx={{ fontSize: 32, color: 'primary.main' }} />
          <Typography variant="h4" component="h1" fontWeight="bold">
            Distributor Types
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => handleOpenDialog()}
          size="large"
        >
          Add Type
        </Button>
      </Box>

      {/* Toolbar */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                placeholder="Search distributor types..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon />
                    </InputAdornment>
                  ),
                }}
              />
            </Grid>
            <Grid item xs={12} md={6} sx={{ display: 'flex', justifyContent: 'flex-end' }}>
              <ToggleButtonGroup
                value={viewMode}
                exclusive
                onChange={(_, newMode) => newMode && setViewMode(newMode)}
              >
                <ToggleButton value="cards">
                  <ViewModuleIcon />
                </ToggleButton>
                <ToggleButton value="list">
                  <ViewListIcon />
                </ToggleButton>
              </ToggleButtonGroup>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Content */}
      {sortedTypes.length === 0 ? (
        <Alert severity="info">No distributor types found. Create one to get started.</Alert>
      ) : viewMode === 'cards' ? (
        // Card View
        <Grid container spacing={3}>
          {paginatedTypes.map((type) => (
            <Grid item xs={12} sm={6} md={4} key={type._id}>
              <Card>
                <CardContent>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                    <Typography variant="h6" fontWeight="bold">
                      {type.type_name}
                    </Typography>
                    <Chip
                      label={type.active ? 'Active' : 'Inactive'}
                      color={type.active ? 'success' : 'default'}
                      size="small"
                    />
                  </Box>
                  {type.description && (
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                      {type.description}
                    </Typography>
                  )}
                  <Typography variant="caption" color="text.secondary">
                    Created: {new Date(type.created_at).toLocaleDateString()}
                  </Typography>
                </CardContent>
                <CardActions sx={{ justifyContent: 'flex-end' }}>
                  <Tooltip title="Edit">
                    <IconButton size="small" color="primary" onClick={() => handleOpenDialog(type)}>
                      <EditIcon />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Delete">
                    <IconButton size="small" color="error" onClick={() => handleDeleteClick(type._id)}>
                      <DeleteIcon />
                    </IconButton>
                  </Tooltip>
                </CardActions>
              </Card>
            </Grid>
          ))}
        </Grid>
      ) : (
        // Table View
        <Paper>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>
                    <TableSortLabel
                      active={orderBy === 'type_name'}
                      direction={orderBy === 'type_name' ? order : 'asc'}
                      onClick={() => handleSort('type_name')}
                    >
                      Type Name
                    </TableSortLabel>
                  </TableCell>
                  <TableCell>Description</TableCell>
                  <TableCell>
                    <TableSortLabel
                      active={orderBy === 'active'}
                      direction={orderBy === 'active' ? order : 'asc'}
                      onClick={() => handleSort('active')}
                    >
                      Status
                    </TableSortLabel>
                  </TableCell>
                  <TableCell>
                    <TableSortLabel
                      active={orderBy === 'created_at'}
                      direction={orderBy === 'created_at' ? order : 'asc'}
                      onClick={() => handleSort('created_at')}
                    >
                      Created
                    </TableSortLabel>
                  </TableCell>
                  <TableCell align="right">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {paginatedTypes.map((type) => (
                  <TableRow key={type._id}>
                    <TableCell>
                      <Typography fontWeight="medium">{type.type_name}</Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" color="text.secondary">
                        {type.description || '-'}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={type.active ? 'Active' : 'Inactive'}
                        color={type.active ? 'success' : 'default'}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">
                        {new Date(type.created_at).toLocaleDateString()}
                      </Typography>
                    </TableCell>
                    <TableCell align="right">
                      <Tooltip title="Edit">
                        <IconButton size="small" color="primary" onClick={() => handleOpenDialog(type)}>
                          <EditIcon />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Delete">
                        <IconButton size="small" color="error" onClick={() => handleDeleteClick(type._id)}>
                          <DeleteIcon />
                        </IconButton>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
          <TablePagination
            component="div"
            count={sortedTypes.length}
            page={page}
            onPageChange={handleChangePage}
            rowsPerPage={rowsPerPage}
            onRowsPerPageChange={handleChangeRowsPerPage}
            rowsPerPageOptions={[5, 10, 25, 50]}
          />
        </Paper>
      )}

      {/* Add/Edit Dialog */}
      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
        <DialogTitle>{editingType ? 'Edit Distributor Type' : 'Add Distributor Type'}</DialogTitle>
        <form onSubmit={handleSubmit(onSubmit)}>
          <DialogContent>
            <Grid container spacing={2}>
              <Grid item xs={12}>
                <Controller
                  name="type_name"
                  control={control}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      label="Type Name"
                      fullWidth
                      required
                      error={!!errors.type_name}
                      helperText={errors.type_name?.message}
                    />
                  )}
                />
              </Grid>
              <Grid item xs={12}>
                <Controller
                  name="description"
                  control={control}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      label="Description"
                      fullWidth
                      multiline
                      rows={3}
                      error={!!errors.description}
                      helperText={errors.description?.message}
                    />
                  )}
                />
              </Grid>
              <Grid item xs={12}>
                <Controller
                  name="active"
                  control={control}
                  render={({ field }) => (
                    <FormControlLabel
                      control={<Switch checked={field.value} onChange={field.onChange} />}
                      label="Active"
                    />
                  )}
                />
              </Grid>
            </Grid>
          </DialogContent>
          <DialogActions>
            <Button onClick={handleCloseDialog}>Cancel</Button>
            <Button type="submit" variant="contained" disabled={isSubmitting}>
              {isSubmitting ? 'Saving...' : editingType ? 'Update' : 'Create'}
            </Button>
          </DialogActions>
        </form>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteConfirmOpen} onClose={() => setDeleteConfirmOpen(false)}>
        <DialogTitle>Confirm Delete</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete this distributor type? This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteConfirmOpen(false)}>Cancel</Button>
          <Button onClick={handleDeleteConfirm} variant="contained" color="error">
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
