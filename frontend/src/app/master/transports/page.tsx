'use client';

import React, { useState, useEffect } from 'react';
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
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  LocalShipping as TransportIcon,
  ViewList as ViewListIcon,
  ViewModule as ViewModuleIcon,
  Search as SearchIcon,
} from '@mui/icons-material';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'react-hot-toast';
import api from '@/lib/api';

// Transport type definition (matches backend model exactly)
interface Transport {
  _id: string;
  transport: string;
  created_at: string;
  created_by?: { username: string } | null;
  updated_at: string;
  updated_by?: { username: string } | null;
}

// Transport form schema (simplified to match actual database fields)
const transportSchema = z.object({
  transport: z.string().min(2, 'Transport name must be at least 2 characters'),
});

type TransportFormData = z.infer<typeof transportSchema>;

export default function TransportsPage() {
  // State management
  const [transports, setTransports] = useState<Transport[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'cards' | 'list'>('cards');
  const [searchTerm, setSearchTerm] = useState('');
  const [openDialog, setOpenDialog] = useState(false);
  const [editingTransport, setEditingTransport] = useState<Transport | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [transportToDelete, setTransportToDelete] = useState<string | null>(null);

  // Sorting and pagination state
  const [orderBy, setOrderBy] = useState<keyof Transport>('transport');
  const [order, setOrder] = useState<'asc' | 'desc'>('asc');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  // Form setup
  const {
    control,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<TransportFormData>({
    resolver: zodResolver(transportSchema),
    defaultValues: {
      transport: '',
    },
  });

  // Load transports
  const loadTransports = async () => {
    try {
      setLoading(true);
      const response = await api.get('/transports');
      
      // Extract transports array from API response
      const transportsData = response.data?.data && Array.isArray(response.data.data) 
        ? response.data.data 
        : [];
      
      setTransports(transportsData);
    } catch (error) {
      toast.error('Failed to load transports');
      console.error('Error loading transports:', error);
      setTransports([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTransports();
  }, []);

  // Filter transports based on search term
  const filteredTransports = transports.filter((transport) =>
    transport.transport.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Sorting function
  const handleSort = (property: keyof Transport) => {
    const isAsc = orderBy === property && order === 'asc';
    setOrder(isAsc ? 'desc' : 'asc');
    setOrderBy(property);
    setPage(0); // Reset to first page when sorting
  };

  // Sort the filtered transports
  const sortedTransports = [...filteredTransports].sort((a, b) => {
    let aValue: unknown, bValue: unknown;
    
    if (orderBy === 'created_at' || orderBy === 'updated_at') {
      aValue = new Date(a[orderBy]).getTime();
      bValue = new Date(b[orderBy]).getTime();
    } else {
      aValue = a[orderBy];
      bValue = b[orderBy];
    }
    
    // Handle null/undefined values
    if (aValue == null && bValue == null) return 0;
    if (aValue == null) return order === 'asc' ? -1 : 1;
    if (bValue == null) return order === 'asc' ? 1 : -1;
    
    // Convert to comparable values
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
    } else {
      return aCompare > bCompare ? -1 : aCompare < bCompare ? 1 : 0;
    }
  });

  // Paginate the sorted transports
  const paginatedTransports = sortedTransports.slice(
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
  const onSubmit = async (data: TransportFormData) => {
    try {
      if (editingTransport) {
        await api.put(`/transports/${editingTransport._id}`, data);
        toast.success('Transport updated successfully');
      } else {
        await api.post('/transports', data);
        toast.success('Transport created successfully');
      }
      
      setOpenDialog(false);
      reset();
      setEditingTransport(null);
      loadTransports();
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || 'Failed to save transport';
      toast.error(errorMessage);
    }
  };

  // Handle edit
  const handleEdit = (transport: Transport) => {
    setEditingTransport(transport);
    reset({ transport: transport.transport });
    setOpenDialog(true);
  };

  // Handle delete confirmation
  const handleDeleteClick = (transportId: string) => {
    setTransportToDelete(transportId);
    setDeleteConfirmOpen(true);
  };

  // Handle actual delete
  const handleDeleteConfirm = async () => {
    if (!transportToDelete) return;

    try {
      await api.delete(`/transports/${transportToDelete}`);
      toast.success('Transport deleted successfully');
      setDeleteConfirmOpen(false);
      setTransportToDelete(null);
      loadTransports();
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || 'Failed to delete transport';
      toast.error(errorMessage);
    }
  };

  // Handle dialog close
  const handleDialogClose = () => {
    setOpenDialog(false);
    setEditingTransport(null);
    reset();
  };

  // Handle delete cancel
  const handleDeleteCancel = () => {
    setDeleteConfirmOpen(false);
    setTransportToDelete(null);
  };

  // Loading skeleton
  if (loading) {
    return (
      <Box sx={{ p: 3 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          Transport Management
        </Typography>
        <Grid container spacing={3}>
          {[...Array(6)].map((_, index) => (
            <Grid size={{ xs: 12, sm: 6, md: 4 }} key={index}>
              <Skeleton variant="rectangular" height={200} />
            </Grid>
          ))}
        </Grid>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box sx={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        mb: 3,
        flexWrap: 'wrap',
        gap: 2
      }}>
        <Typography variant="h4" component="h1">
          Transport Management
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => setOpenDialog(true)}
          sx={{ minWidth: 'max-content' }}
        >
          Add Transport
        </Button>
      </Box>

      {/* Search and View Controls */}
      <Box sx={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        mb: 3,
        flexWrap: 'wrap',
        gap: 2
      }}>
        <TextField
          placeholder="Search transports..."
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
          onChange={(_, newMode) => newMode && setViewMode(newMode)}
          aria-label="view mode"
        >
          <ToggleButton value="cards" aria-label="card view">
            <ViewModuleIcon />
          </ToggleButton>
          <ToggleButton value="list" aria-label="list view">
            <ViewListIcon />
          </ToggleButton>
        </ToggleButtonGroup>
      </Box>

      {/* Results Summary */}
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Showing {filteredTransports.length} of {transports.length} transports
      </Typography>

      {/* Content based on view mode */}
      {viewMode === 'cards' ? (
        <>
          {/* Card View */}
          <Grid container spacing={3}>
            {paginatedTransports.map((transport) => (
              <Grid size={{ xs: 12, sm: 6, md: 4 }} key={transport._id}>
                <Card 
                  sx={{ 
                    height: '100%', 
                    display: 'flex', 
                    flexDirection: 'column',
                    '&:hover': {
                      boxShadow: (theme) => theme.shadows[4],
                      transform: 'translateY(-2px)',
                    },
                    transition: 'all 0.2s ease-in-out',
                  }}
                >
                  <CardContent sx={{ flexGrow: 1 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                      <TransportIcon sx={{ mr: 1, color: 'primary.main' }} />
                      <Typography variant="h6" component="h3" noWrap>
                        {transport.transport}
                      </Typography>
                    </Box>
                    
                    <Typography variant="body2" color="text.secondary">
                      Created: {new Date(transport.created_at).toLocaleDateString()}
                    </Typography>
                    
                    {transport.created_by && (
                      <Typography variant="body2" color="text.secondary">
                        By: {transport.created_by.username}
                      </Typography>
                    )}
                  </CardContent>
                  
                  <CardActions sx={{ justifyContent: 'flex-end', p: 2 }}>
                    <Tooltip title="Edit">
                      <IconButton
                        size="small"
                        onClick={() => handleEdit(transport)}
                        color="primary"
                      >
                        <EditIcon />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Delete">
                      <IconButton
                        size="small"
                        onClick={() => handleDeleteClick(transport._id)}
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
          
          {/* Pagination for Card View */}
          <Box sx={{ display: 'flex', justifyContent: 'center', mt: 3 }}>
            <TablePagination
              rowsPerPageOptions={[5, 10, 25]}
              component="div"
              count={filteredTransports.length}
              rowsPerPage={rowsPerPage}
              page={page}
              onPageChange={handleChangePage}
              onRowsPerPageChange={handleChangeRowsPerPage}
            />
          </Box>
        </>
      ) : (
        /* Table View */
        <Paper sx={{ width: '100%', mb: 2 }}>
          <TableContainer>
            <Table sx={{ minWidth: 750 }} aria-labelledby="tableTitle">
              <TableHead>
                <TableRow>
                  <TableCell>
                    <TableSortLabel
                      active={orderBy === 'transport'}
                      direction={orderBy === 'transport' ? order : 'asc'}
                      onClick={() => handleSort('transport')}
                    >
                      Transport Name
                    </TableSortLabel>
                  </TableCell>
                  <TableCell>
                    <TableSortLabel
                      active={orderBy === 'created_at'}
                      direction={orderBy === 'created_at' ? order : 'asc'}
                      onClick={() => handleSort('created_at')}
                    >
                      Created Date
                    </TableSortLabel>
                  </TableCell>
                  <TableCell>Created By</TableCell>
                  <TableCell align="right">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {paginatedTransports.map((transport) => (
                  <TableRow key={transport._id} hover>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        <TransportIcon sx={{ mr: 1, color: 'primary.main' }} />
                        {transport.transport}
                      </Box>
                    </TableCell>
                    <TableCell>
                      {new Date(transport.created_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      {transport.created_by?.username || 'Unknown'}
                    </TableCell>
                    <TableCell align="right">
                      <Tooltip title="Edit">
                        <IconButton
                          size="small"
                          onClick={() => handleEdit(transport)}
                          color="primary"
                        >
                          <EditIcon />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Delete">
                        <IconButton
                          size="small"
                          onClick={() => handleDeleteClick(transport._id)}
                          color="error"
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
          <TablePagination
            rowsPerPageOptions={[5, 10, 25]}
            component="div"
            count={filteredTransports.length}
            rowsPerPage={rowsPerPage}
            page={page}
            onPageChange={handleChangePage}
            onRowsPerPageChange={handleChangeRowsPerPage}
          />
        </Paper>
      )}

      {/* Empty State */}
      {filteredTransports.length === 0 && !loading && (
        <Box sx={{ 
          textAlign: 'center', 
          py: 8,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 2
        }}>
          <TransportIcon sx={{ fontSize: 64, color: 'text.secondary' }} />
          <Typography variant="h6" color="text.secondary">
            {searchTerm ? 'No transports found matching your search' : 'No transports found'}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {searchTerm ? 'Try adjusting your search terms' : 'Get started by adding your first transport'}
          </Typography>
          {!searchTerm && (
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => setOpenDialog(true)}
              sx={{ mt: 2 }}
            >
              Add Transport
            </Button>
          )}
        </Box>
      )}

      {/* Floating Action Button for Mobile */}
      <Fab
        color="primary"
        aria-label="add transport"
        sx={{
          position: 'fixed',
          bottom: 16,
          right: 16,
          display: { xs: 'flex', sm: 'none' }
        }}
        onClick={() => setOpenDialog(true)}
      >
        <AddIcon />
      </Fab>

      {/* Add/Edit Dialog */}
      <Dialog 
        open={openDialog} 
        onClose={handleDialogClose}
        maxWidth="sm"
        fullWidth
      >
        <form onSubmit={handleSubmit(onSubmit)}>
          <DialogTitle>
            {editingTransport ? 'Edit Transport' : 'Add New Transport'}
          </DialogTitle>
          <DialogContent>
            <Controller
              name="transport"
              control={control}
              render={({ field }) => (
                <TextField
                  {...field}
                  autoFocus
                  margin="dense"
                  label="Transport Name"
                  fullWidth
                  variant="outlined"
                  error={!!errors.transport}
                  helperText={errors.transport?.message}
                  sx={{ mt: 2 }}
                />
              )}
            />
          </DialogContent>
          <DialogActions>
            <Button onClick={handleDialogClose}>Cancel</Button>
            <Button 
              type="submit" 
              variant="contained"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Saving...' : (editingTransport ? 'Update' : 'Create')}
            </Button>
          </DialogActions>
        </form>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteConfirmOpen} onClose={handleDeleteCancel}>
        <DialogTitle>Confirm Delete</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete this transport? This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleDeleteCancel}>Cancel</Button>
          <Button 
            onClick={handleDeleteConfirm} 
            color="error" 
            variant="contained"
          >
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}