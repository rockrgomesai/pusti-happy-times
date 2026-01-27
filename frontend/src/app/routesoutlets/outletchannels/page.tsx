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
  Category as CategoryIcon,
  ViewList as ViewListIcon,
  ViewModule as ViewModuleIcon,
  Search as SearchIcon,
} from '@mui/icons-material';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'react-hot-toast';
import { outletChannelsApi } from '@/lib/api/outletChannels';
import type { OutletChannel } from '@/types/outletChannel';

// Form schema
const outletChannelSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  active: z.boolean(),
});

type OutletChannelFormData = z.infer<typeof outletChannelSchema>;

type Order = 'asc' | 'desc';
type OrderableKeys = keyof Pick<OutletChannel, 'name' | 'active' | 'created_at' | 'updated_at'>;

interface OutletChannelColumnDefinition {
  id: string;
  label: string;
  sortableKey?: OrderableKeys;
  align?: 'inherit' | 'left' | 'center' | 'right' | 'justify';
  alwaysVisible?: boolean;
  renderCell: (outletChannel: OutletChannel) => React.ReactNode;
}

export default function OutletChannelsPage() {
  // State management
  const [outletChannels, setOutletChannels] = useState<OutletChannel[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'cards' | 'list'>('cards');
  const [searchTerm, setSearchTerm] = useState('');
  const [openDialog, setOpenDialog] = useState(false);
  const [editingOutletChannel, setEditingOutletChannel] = useState<OutletChannel | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [outletChannelToDelete, setOutletChannelToDelete] = useState<string | null>(null);

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
  } = useForm<OutletChannelFormData>({
    resolver: zodResolver(outletChannelSchema),
    defaultValues: {
      name: '',
      active: true,
    },
  });

  // Load outlet channels
  const loadOutletChannels = useCallback(async () => {
    try {
      setLoading(true);
      const response = await outletChannelsApi.list({ sortBy: 'name', sortOrder: 'asc' });
      setOutletChannels(response.data);
    } catch (error) {
      toast.error('Failed to load outlet channels');
      console.error('Error loading outlet channels:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadOutletChannels();
  }, [loadOutletChannels]);

  // Form submission
  const onSubmit = async (data: OutletChannelFormData) => {
    try {
      if (editingOutletChannel) {
        await outletChannelsApi.update(editingOutletChannel._id, data);
        toast.success('Outlet channel updated successfully');
      } else {
        await outletChannelsApi.create(data);
        toast.success('Outlet channel created successfully');
      }
      
      setOpenDialog(false);
      reset();
      setEditingOutletChannel(null);
      loadOutletChannels();
    } catch (error: any) {
      const errorMessage = error?.response?.data?.message || error?.message || 'Failed to save outlet channel';
      toast.error(errorMessage);
    }
  };

  // Handle delete
  const handleDelete = async () => {
    if (!outletChannelToDelete) return;
    
    try {
      await outletChannelsApi.delete(outletChannelToDelete);
      toast.success('Outlet channel deactivated successfully');
      setDeleteConfirmOpen(false);
      setOutletChannelToDelete(null);
      loadOutletChannels();
    } catch (error: any) {
      const errorMessage = error?.response?.data?.message || 'Failed to delete outlet channel';
      toast.error(errorMessage);
    }
  };

  // Handle activate/deactivate toggle
  const handleToggleActive = async (outletChannel: OutletChannel) => {
    try {
      if (outletChannel.active) {
        await outletChannelsApi.delete(outletChannel._id);
        toast.success('Outlet channel deactivated');
      } else {
        await outletChannelsApi.activate(outletChannel._id);
        toast.success('Outlet channel activated');
      }
      loadOutletChannels();
    } catch (error: any) {
      const errorMessage = error?.response?.data?.message || 'Failed to update status';
      toast.error(errorMessage);
    }
  };

  // Handle edit
  const handleEdit = useCallback(
    (outletChannel: OutletChannel) => {
      setEditingOutletChannel(outletChannel);
      reset({
        name: outletChannel.name,
        active: outletChannel.active,
      });
      setOpenDialog(true);
    },
    [reset]
  );

  // Handle add new
  const handleAdd = useCallback(() => {
    setEditingOutletChannel(null);
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
  const columns = useMemo<OutletChannelColumnDefinition[]>(
    () => [
      {
        id: 'name',
        label: 'Outlet Channel',
        sortableKey: 'name',
        renderCell: (outletChannel) => (
          <Typography variant="body1" fontWeight="medium">
            {outletChannel.name}
          </Typography>
        ),
      },
      {
        id: 'active',
        label: 'Status',
        sortableKey: 'active',
        renderCell: (outletChannel) => (
          <Chip
            label={outletChannel.active ? 'Active' : 'Inactive'}
            color={outletChannel.active ? 'success' : 'default'}
            variant={outletChannel.active ? 'filled' : 'outlined'}
            size="small"
          />
        ),
      },
      {
        id: 'created_by',
        label: 'Created By',
        renderCell: (outletChannel) => outletChannel.created_by || '-',
      },
      {
        id: 'created_at',
        label: 'Created Date',
        sortableKey: 'created_at',
        renderCell: (outletChannel) => formatDate(outletChannel.created_at),
      },
      {
        id: 'updated_at',
        label: 'Updated Date',
        sortableKey: 'updated_at',
        renderCell: (outletChannel) => formatDate(outletChannel.updated_at),
      },
      {
        id: 'actions',
        label: 'Actions',
        alwaysVisible: true,
        align: 'right',
        renderCell: (outletChannel) => (
          <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1 }}>
            <Tooltip title="Edit">
              <IconButton size="small" onClick={() => handleEdit(outletChannel)} color="primary">
                <EditIcon />
              </IconButton>
            </Tooltip>
            <Tooltip title={outletChannel.active ? 'Deactivate' : 'Activate'}>
              <IconButton
                size="small"
                onClick={() => handleToggleActive(outletChannel)}
                color={outletChannel.active ? 'warning' : 'success'}
              >
                {outletChannel.active ? <DeleteIcon /> : <AddIcon />}
              </IconButton>
            </Tooltip>
          </Box>
        ),
      },
    ],
    [formatDate, handleEdit]
  );

  // Filter and sort
  const filteredOutletChannels = useMemo(() => {
    return outletChannels.filter((outletChannel) =>
      outletChannel.name.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [outletChannels, searchTerm]);

  const sortedOutletChannels = useMemo(() => {
    const sorted = [...filteredOutletChannels].sort((a, b) => {
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
  }, [filteredOutletChannels, order, orderBy]);

  const paginatedOutletChannels = useMemo(() => {
    const start = page * rowsPerPage;
    return sortedOutletChannels.slice(start, start + rowsPerPage);
  }, [sortedOutletChannels, page, rowsPerPage]);

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
        {paginatedOutletChannels.map((outletChannel) => (
          <Grid item xs={12} sm={6} md={4} key={outletChannel._id}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', mb: 1 }}>
                  <Typography variant="h6" component="h2">
                    {outletChannel.name}
                  </Typography>
                  <Chip
                    label={outletChannel.active ? 'Active' : 'Inactive'}
                    color={outletChannel.active ? 'success' : 'default'}
                    variant={outletChannel.active ? 'filled' : 'outlined'}
                    size="small"
                  />
                </Box>
                <Typography variant="body2" color="text.secondary">
                  Created: {formatDate(outletChannel.created_at)}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Updated: {formatDate(outletChannel.updated_at)}
                </Typography>
              </CardContent>
              
              <CardActions sx={{ justifyContent: 'flex-end', pt: 0 }}>
                <Tooltip title="Edit">
                  <IconButton size="small" onClick={() => handleEdit(outletChannel)} color="primary">
                    <EditIcon />
                  </IconButton>
                </Tooltip>
                <Tooltip title={outletChannel.active ? 'Deactivate' : 'Activate'}>
                  <IconButton
                    size="small"
                    onClick={() => handleToggleActive(outletChannel)}
                    color={outletChannel.active ? 'warning' : 'success'}
                  >
                    {outletChannel.active ? <DeleteIcon /> : <AddIcon />}
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
          count={sortedOutletChannels.length}
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
          {paginatedOutletChannels.map((outletChannel) => (
            <TableRow key={outletChannel._id} hover>
              {columns.map((column) => (
                <TableCell key={column.id} align={column.align}>
                  {column.renderCell(outletChannel)}
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
      <TablePagination
        rowsPerPageOptions={[5, 10, 25, 50]}
        component="div"
        count={sortedOutletChannels.length}
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
          <CategoryIcon sx={{ mr: 2, color: 'primary.main' }} />
          <Typography variant="h4" component="h1">
            Outlet Channels
          </Typography>
        </Box>
        <Button variant="contained" startIcon={<AddIcon />} onClick={handleAdd}>
          Add Outlet Channel
        </Button>
      </Box>

      {/* Search and View Toggle */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3, flexWrap: 'wrap', gap: 2 }}>
        <TextField
          size="small"
          placeholder="Search outlet channels..."
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
        Showing {filteredOutletChannels.length} of {outletChannels.length} outlet channels
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
      ) : filteredOutletChannels.length === 0 ? (
        <Alert severity="info">No outlet channels found. Create one to get started.</Alert>
      ) : viewMode === 'cards' ? (
        renderCardsView()
      ) : (
        renderListView()
      )}

      {/* Add/Edit Dialog */}
      <Dialog open={openDialog} onClose={() => setOpenDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{editingOutletChannel ? 'Edit Outlet Channel' : 'Add New Outlet Channel'}</DialogTitle>
        <form onSubmit={handleSubmit(onSubmit)}>
          <DialogContent>
            <Controller
              name="name"
              control={control}
              render={({ field }) => (
                <TextField
                  {...field}
                  label="Outlet Channel Name"
                  fullWidth
                  error={!!errors.name}
                  helperText={errors.name?.message}
                  margin="normal"
                  placeholder="e.g., Direct Sales, Distribution, Wholesale, etc."
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
              {isSubmitting ? 'Saving...' : editingOutletChannel ? 'Update' : 'Create'}
            </Button>
          </DialogActions>
        </form>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteConfirmOpen} onClose={() => setDeleteConfirmOpen(false)}>
        <DialogTitle>Confirm Deactivate</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to deactivate this outlet channel?
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
        aria-label="add outlet channel"
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
