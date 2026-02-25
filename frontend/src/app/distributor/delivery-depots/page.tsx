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
  MenuItem,
  Select,
  FormControl,
  InputLabel,
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  LocationOn as LocationOnIcon,
  ViewList as ViewListIcon,
  ViewModule as ViewModuleIcon,
  Search as SearchIcon,
} from '@mui/icons-material';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'react-hot-toast';
import api from '@/lib/api';

// Delivery Depot definition
interface DeliveryDepot {
  _id: string;
  name: string;
  address?: string;
  district?: string;
  division?: string;
  active: boolean;
  created_at: string;
  created_by?: { username: string } | null;
  updated_at: string;
  updated_by?: { username: string } | null;
}

// Form schema
const deliveryDepotSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(100),
  address: z.string().max(500).optional(),
  district: z.string().optional(),
  division: z.string().optional(),
  active: z.boolean(),
});

type DeliveryDepotFormData = z.infer<typeof deliveryDepotSchema>;

type Order = 'asc' | 'desc';

export default function DeliveryDepotsPage() {
  // State management
  const [depots, setDepots] = useState<DeliveryDepot[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'cards' | 'list'>('cards');
  const [searchTerm, setSearchTerm] = useState('');
  const [openDialog, setOpenDialog] = useState(false);
  const [editingDepot, setEditingDepot] = useState<DeliveryDepot | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [depotToDelete, setDepotToDelete] = useState<string | null>(null);

  // Districts and divisions
  const [districts, setDistricts] = useState<string[]>([]);
  const [divisions, setDivisions] = useState<string[]>([]);

  // Sorting and pagination state
  const [orderBy, setOrderBy] = useState<'name' | 'active' | 'created_at'>('name');
  const [order, setOrder] = useState<Order>('asc');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  // Form setup
  const {
    control,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<DeliveryDepotFormData>({
    resolver: zodResolver(deliveryDepotSchema),
    defaultValues: {
      name: '',
      address: '',
      district: '',
      division: '',
      active: true,
    },
  });

  // Load depots
  const loadDepots = async () => {
    try {
      setLoading(true);
      const response = await api.get('/delivery-depots');
      const depotsData = response.data?.data && Array.isArray(response.data.data) 
        ? response.data.data 
        : [];
      setDepots(depotsData);
    } catch (error) {
      toast.error('Failed to load delivery depots');
      console.error('Error loading delivery depots:', error);
      setDepots([]);
    } finally {
      setLoading(false);
    }
  };

  // Load districts and divisions
  const loadMetadata = async () => {
    try {
      const [districtsRes, divisionsRes] = await Promise.all([
        api.get('/delivery-depots/districts'),
        api.get('/delivery-depots/divisions'),
      ]);
      setDistricts(districtsRes.data?.data || []);
      setDivisions(divisionsRes.data?.data || []);
    } catch (error) {
      console.error('Error loading metadata:', error);
    }
  };

  useEffect(() => {
    loadDepots();
    loadMetadata();
  }, []);

  // Filter depots based on search term
  const filteredDepots = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    if (!query) return depots;
    return depots.filter((depot) => 
      depot.name.toLowerCase().includes(query) ||
      depot.address?.toLowerCase().includes(query) ||
      depot.district?.toLowerCase().includes(query) ||
      depot.division?.toLowerCase().includes(query)
    );
  }, [depots, searchTerm]);

  // Sorting function
  const handleSort = (property: 'name' | 'active' | 'created_at') => {
    const isAsc = orderBy === property && order === 'asc';
    setOrder(isAsc ? 'desc' : 'asc');
    setOrderBy(property);
    setPage(0);
  };

  // Sort the filtered depots
  const sortedDepots = useMemo(() => {
    const next = [...filteredDepots];
    next.sort((a, b) => {
      let aValue: any;
      let bValue: any;

      switch (orderBy) {
        case 'name':
          aValue = a.name.toLowerCase();
          bValue = b.name.toLowerCase();
          break;
        case 'active':
          aValue = a.active ? 1 : 0;
          bValue = b.active ? 1 : 0;
          break;
        case 'created_at':
          aValue = new Date(a.created_at).getTime();
          bValue = new Date(b.created_at).getTime();
          break;
        default:
          return 0;
      }

      if (aValue < bValue) {
        return order === 'asc' ? -1 : 1;
      }
      if (aValue > bValue) {
        return order === 'asc' ? 1 : -1;
      }
      return 0;
    });

    return next;
  }, [filteredDepots, order, orderBy]);

  // Paginated depots
  const paginatedDepots = useMemo(() => {
    const start = page * rowsPerPage;
    return sortedDepots.slice(start, start + rowsPerPage);
  }, [sortedDepots, page, rowsPerPage]);

  // Handle page change
  const handleChangePage = (event: unknown, newPage: number) => {
    setPage(newPage);
  };

  // Handle rows per page change
  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  // Open create dialog
  const handleCreate = () => {
    setEditingDepot(null);
    reset({
      name: '',
      address: '',
      district: '',
      division: '',
      active: true,
    });
    setOpenDialog(true);
  };

  // Open edit dialog
  const handleEdit = (depot: DeliveryDepot) => {
    setEditingDepot(depot);
    reset({
      name: depot.name,
      address: depot.address || '',
      district: depot.district || '',
      division: depot.division || '',
      active: depot.active,
    });
    setOpenDialog(true);
  };

  // Submit form
  const onSubmit = async (data: DeliveryDepotFormData) => {
    try {
      // Clean up empty strings to null
      const payload = {
        ...data,
        address: data.address?.trim() || null,
        district: data.district || null,
        division: data.division || null,
      };

      if (editingDepot) {
        await api.put(`/delivery-depots/${editingDepot._id}`, payload);
        toast.success('Delivery depot updated successfully');
      } else {
        await api.post('/delivery-depots', payload);
        toast.success('Delivery depot created successfully');
      }
      
      setOpenDialog(false);
      reset();
      await loadDepots();
    } catch (error: any) {
      const message = error.response?.data?.message || 'Operation failed';
      toast.error(message);
      console.error('Error saving delivery depot:', error);
    }
  };

  // Open delete confirmation
  const handleDeleteClick = (id: string) => {
    setDepotToDelete(id);
    setDeleteConfirmOpen(true);
  };

  // Confirm delete
  const handleDeleteConfirm = async () => {
    if (!depotToDelete) return;

    try {
      await api.delete(`/delivery-depots/${depotToDelete}`);
      toast.success('Delivery depot deleted successfully');
      setDeleteConfirmOpen(false);
      setDepotToDelete(null);
      await loadDepots();
    } catch (error: any) {
      const message = error.response?.data?.message || 'Failed to delete delivery depot';
      toast.error(message);
      console.error('Error deleting delivery depot:', error);
    }
  };

  // Render loading state
  if (loading) {
    return (
      <Box p={3}>
        <Skeleton variant="rectangular" width="100%" height={400} />
      </Box>
    );
  }

  return (
    <Box p={3}>
      {/* Header */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Box display="flex" alignItems="center" gap={2}>
          <LocationOnIcon sx={{ fontSize: 32, color: 'primary.main' }} />
          <Typography variant="h4" component="h1" fontWeight="bold">
            Delivery Depots
          </Typography>
        </Box>
        <Button
          variant="contained"
          color="primary"
          startIcon={<AddIcon />}
          onClick={handleCreate}
        >
          Add Delivery Depot
        </Button>
      </Box>

      {/* Search and View Toggle */}
      <Box display="flex" gap={2} mb={3} flexWrap="wrap">
        <TextField
          placeholder="Search delivery depots..."
          value={searchTerm}
          onChange={(e) => {
            setSearchTerm(e.target.value);
            setPage(0);
          }}
          sx={{ flexGrow: 1, minWidth: 250 }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon />
              </InputAdornment>
            ),
          }}
        />
        <ToggleButtonGroup
          value={viewMode}
          exclusive
          onChange={(e, val) => val && setViewMode(val)}
          aria-label="view mode"
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

      {/* Results count */}
      <Typography variant="body2" color="text.secondary" mb={2}>
        Showing {paginatedDepots.length} of {filteredDepots.length} delivery depot(s)
        {searchTerm && ` matching "${searchTerm}"`}
      </Typography>

      {/* Cards View */}
      {viewMode === 'cards' && (
        <Grid container spacing={3}>
          {paginatedDepots.map((depot) => (
            <Grid item xs={12} sm={6} md={4} key={depot._id}>
              <Card>
                <CardContent>
                  <Box display="flex" justifyContent="space-between" alignItems="start" mb={1}>
                    <Typography variant="h6" component="h2" fontWeight="bold">
                      {depot.name}
                    </Typography>
                    <Chip
                      label={depot.active ? 'Active' : 'Inactive'}
                      color={depot.active ? 'success' : 'default'}
                      size="small"
                    />
                  </Box>
                  
                  {depot.address && (
                    <Typography variant="body2" color="text.secondary" mb={1}>
                      {depot.address}
                    </Typography>
                  )}

                  {(depot.district || depot.division) && (
                    <Box display="flex" gap={1} flexWrap="wrap" mt={1}>
                      {depot.district && (
                        <Chip label={depot.district} size="small" variant="outlined" />
                      )}
                      {depot.division && (
                        <Chip label={depot.division} size="small" variant="outlined" />
                      )}
                    </Box>
                  )}

                  <Typography variant="caption" color="text.secondary" display="block" mt={2}>
                    Created: {new Date(depot.created_at).toLocaleDateString()}
                  </Typography>
                </CardContent>
                <CardActions sx={{ justifyContent: 'flex-end', gap: 1 }}>
                  <Tooltip title="Edit">
                    <IconButton
                      size="small"
                      color="primary"
                      onClick={() => handleEdit(depot)}
                    >
                      <EditIcon />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Delete">
                    <IconButton
                      size="small"
                      color="error"
                      onClick={() => handleDeleteClick(depot._id)}
                    >
                      <DeleteIcon />
                    </IconButton>
                  </Tooltip>
                </CardActions>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      {/* List View */}
      {viewMode === 'list' && (
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>
                  <TableSortLabel
                    active={orderBy === 'name'}
                    direction={orderBy === 'name' ? order : 'asc'}
                    onClick={() => handleSort('name')}
                  >
                    Name
                  </TableSortLabel>
                </TableCell>
                <TableCell>Address</TableCell>
                <TableCell>District</TableCell>
                <TableCell>Division</TableCell>
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
              {paginatedDepots.map((depot) => (
                <TableRow key={depot._id} hover>
                  <TableCell>{depot.name}</TableCell>
                  <TableCell>{depot.address || '-'}</TableCell>
                  <TableCell>{depot.district || '-'}</TableCell>
                  <TableCell>{depot.division || '-'}</TableCell>
                  <TableCell>
                    <Chip
                      label={depot.active ? 'Active' : 'Inactive'}
                      color={depot.active ? 'success' : 'default'}
                      size="small"
                    />
                  </TableCell>
                  <TableCell>{new Date(depot.created_at).toLocaleDateString()}</TableCell>
                  <TableCell align="right">
                    <Tooltip title="Edit">
                      <IconButton
                        size="small"
                        color="primary"
                        onClick={() => handleEdit(depot)}
                      >
                        <EditIcon />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Delete">
                      <IconButton
                        size="small"
                        color="error"
                        onClick={() => handleDeleteClick(depot._id)}
                      >
                        <DeleteIcon />
                      </IconButton>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* Pagination */}
      <Box mt={3}>
        <TablePagination
          component="div"
          count={filteredDepots.length}
          page={page}
          onPageChange={handleChangePage}
          rowsPerPage={rowsPerPage}
          onRowsPerPageChange={handleChangeRowsPerPage}
          rowsPerPageOptions={[5, 10, 25, 50]}
        />
      </Box>

      {/* Empty State */}
      {depots.length === 0 && !loading && (
        <Box textAlign="center" py={8}>
          <LocationOnIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
          <Typography variant="h6" color="text.secondary" mb={2}>
            No delivery depots found
          </Typography>
          <Button variant="contained" startIcon={<AddIcon />} onClick={handleCreate}>
            Create First Delivery Depot
          </Button>
        </Box>
      )}

      {/* Create/Edit Dialog */}
      <Dialog 
        open={openDialog} 
        onClose={() => setOpenDialog(false)} 
        maxWidth="sm" 
        fullWidth
      >
        <DialogTitle>
          {editingDepot ? 'Edit Delivery Depot' : 'Add Delivery Depot'}
        </DialogTitle>
        <form onSubmit={handleSubmit(onSubmit)}>
          <DialogContent>
            <Grid container spacing={2}>
              <Grid item xs={12}>
                <Controller
                  name="name"
                  control={control}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      label="Depot Name"
                      required
                      fullWidth
                      error={!!errors.name}
                      helperText={errors.name?.message}
                    />
                  )}
                />
              </Grid>

              <Grid item xs={12}>
                <Controller
                  name="address"
                  control={control}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      label="Address"
                      fullWidth
                      multiline
                      rows={2}
                      error={!!errors.address}
                      helperText={errors.address?.message}
                    />
                  )}
                />
              </Grid>

              <Grid item xs={12} sm={6}>
                <Controller
                  name="district"
                  control={control}
                  render={({ field }) => (
                    <FormControl fullWidth>
                      <InputLabel>District</InputLabel>
                      <Select {...field} label="District">
                        <MenuItem value="">
                          <em>None</em>
                        </MenuItem>
                        {districts.map((district) => (
                          <MenuItem key={district} value={district}>
                            {district}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  )}
                />
              </Grid>

              <Grid item xs={12} sm={6}>
                <Controller
                  name="division"
                  control={control}
                  render={({ field }) => (
                    <FormControl fullWidth>
                      <InputLabel>Division</InputLabel>
                      <Select {...field} label="Division">
                        <MenuItem value="">
                          <em>None</em>
                        </MenuItem>
                        {divisions.map((division) => (
                          <MenuItem key={division} value={division}>
                            {division}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  )}
                />
              </Grid>

              <Grid item xs={12}>
                <Controller
                  name="active"
                  control={control}
                  render={({ field }) => (
                    <FormControlLabel
                      control={<Switch {...field} checked={field.value} />}
                      label="Active"
                    />
                  )}
                />
              </Grid>
            </Grid>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setOpenDialog(false)}>Cancel</Button>
            <Button type="submit" variant="contained" disabled={isSubmitting}>
              {isSubmitting ? 'Saving...' : editingDepot ? 'Update' : 'Create'}
            </Button>
          </DialogActions>
        </form>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteConfirmOpen} onClose={() => setDeleteConfirmOpen(false)}>
        <DialogTitle>Confirm Delete</DialogTitle>
        <DialogContent>
          <Alert severity="warning">
            Are you sure you want to delete this delivery depot? This action cannot be undone.
            If this depot is assigned to any distributors, the deletion will fail.
          </Alert>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteConfirmOpen(false)}>Cancel</Button>
          <Button color="error" variant="contained" onClick={handleDeleteConfirm}>
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
