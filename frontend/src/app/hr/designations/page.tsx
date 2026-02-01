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
  Switch,
  FormControlLabel,
  Avatar,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Alert,
  Fab,
  Grid as Grid,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Skeleton,
  TableSortLabel,
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  ViewList as ViewListIcon,
  ViewModule as ViewModuleIcon,
  Search as SearchIcon,
  Work as WorkIcon,
  AccountBox as AccountBoxIcon,
} from '@mui/icons-material';
import { TablePagination } from '@mui/material';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'react-hot-toast';
import api from '@/lib/api';

// Designation type definition
interface Designation {
  _id: string;
  name: string;
  active: boolean;
  createdAt: string;
  updatedAt: string;
  createdBy: string | null;
  updatedBy: string | null;
}

// Designation form schema
const designationSchema = z.object({
  name: z.string().min(2, 'Designation name must be at least 2 characters'),
  active: z.boolean(),
});

type DesignationFormData = z.infer<typeof designationSchema>;

export default function DesignationsPage() {
  // State management
  const [designations, setDesignations] = useState<Designation[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'cards' | 'list'>('cards');
  const [searchTerm, setSearchTerm] = useState('');
  const [openDialog, setOpenDialog] = useState(false);
  const [editingDesignation, setEditingDesignation] = useState<Designation | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [designationToDelete, setDesignationToDelete] = useState<string | null>(null);
  
  // Pagination state
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  
  // Sorting state
  const [sortBy, setSortBy] = useState<string>('createdAt');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  // Form setup
  const {
    control,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<DesignationFormData>({
    resolver: zodResolver(designationSchema),
    defaultValues: {
      name: '',
      active: true,
    },
  });

  // Load designations
  const loadDesignations = async () => {
    try {
      setLoading(true);
      const response = await api.get('/designations', {
        params: { limit: 100000 }
      });
      
      // Handle API response structure (designations returns data in response.data.data)
      if (response.data && response.data.success && Array.isArray(response.data.data)) {
        setDesignations(response.data.data);
      } else if (Array.isArray(response.data)) {
        // Fallback for direct array response (like brands)
        setDesignations(response.data);
      } else {
        console.warn('Unexpected response structure:', response.data);
        setDesignations([]);
      }
    } catch (error) {
      toast.error('Failed to load designations');
      console.error('Error loading designations:', error);
      setDesignations([]); // Ensure designations is always an array
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDesignations();
  }, []);

  // Reset page when filters change
  useEffect(() => {
    setPage(0);
  }, [searchTerm]);

  // Filter designations based on search and filters
  const filteredDesignations = Array.isArray(designations) ? designations.filter((designation) => {
    const matchesSearch = 
      designation.name.toLowerCase().includes(searchTerm.toLowerCase());
    
    return matchesSearch;
  }) : [];

  // Sort filtered designations
  const sortedDesignations = [...filteredDesignations].sort((a, b) => {
    let aValue: unknown = a[sortBy as keyof Designation];
    let bValue: unknown = b[sortBy as keyof Designation];
    
    // Handle date values
    if (sortBy === 'createdAt' || sortBy === 'updatedAt') {
      aValue = new Date(aValue as string);
      bValue = new Date(bValue as string);
    }
    
    // Handle null/undefined values
    if (aValue == null && bValue == null) return 0;
    if (aValue == null) return sortDirection === 'asc' ? -1 : 1;
    if (bValue == null) return sortDirection === 'asc' ? 1 : -1;
    
    // Compare values
    if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
    if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
    return 0;
  });

  // Get paginated data
  const paginatedDesignations = sortedDesignations.slice(
    page * rowsPerPage,
    page * rowsPerPage + rowsPerPage
  );

  // Handle sorting
  const handleSort = (column: string) => {
    if (sortBy === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(column);
      setSortDirection('asc');
    }
  };

  // Handle pagination change
  const handleChangePage = (event: unknown, newPage: number) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0); // Reset to first page when changing rows per page
  };

  // Handle form submission
  const onSubmit = async (data: DesignationFormData) => {
    try {
      if (editingDesignation) {
        await api.put(`/designations/${editingDesignation._id}`, data);
        toast.success('Designation updated successfully');
      } else {
        await api.post('/designations', data);
        toast.success('Designation created successfully');
      }
      
      setOpenDialog(false);
      reset();
      setEditingDesignation(null);
      loadDesignations();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to save designation';
      toast.error(errorMessage);
    }
  };

  // Handle delete designation
  const handleDeleteDesignation = async () => {
    if (!designationToDelete) return;
    
    try {
      await api.delete(`/designations/${designationToDelete}`);
      toast.success('Designation deleted successfully');
      setDeleteConfirmOpen(false);
      setDesignationToDelete(null);
      loadDesignations();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to delete designation';
      toast.error(errorMessage);
    }
  };

  // Handle edit designation
  const handleEditDesignation = (designation: Designation) => {
    setEditingDesignation(designation);
    reset({
      name: designation.name,
      active: designation.active,
    });
    setOpenDialog(true);
  };

  // Handle add new designation
  const handleAddDesignation = () => {
    setEditingDesignation(null);
    reset({
      name: '',
      active: true,
    });
    setOpenDialog(true);
  };

  // Format date
  const formatDate = (dateString: string) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return 'Invalid Date';
    return date.toLocaleDateString('en-BD', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  // Render loading skeleton
  const renderSkeleton = () => {
    if (viewMode === 'cards') {
      return (
        <Grid container spacing={3}>
          {Array.from({ length: 6 }).map((_, index) => (
            <Grid key={index} size={{ xs: 12, sm: 6, md: 4 }}>
              <Card>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                    <Skeleton variant="circular" width={48} height={48} />
                    <Box sx={{ ml: 2, flex: 1 }}>
                      <Skeleton variant="text" width="60%" />
                      <Skeleton variant="text" width="40%" />
                    </Box>
                  </Box>
                  <Skeleton variant="text" width="100%" />
                  <Skeleton variant="text" width="80%" />
                  <Skeleton variant="text" width="60%" />
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      );
    }

    return (
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              {['Designation', 'Status', 'Created', 'Actions'].map((header) => (
                <TableCell key={header}>
                  <Skeleton variant="text" />
                </TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {Array.from({ length: 5 }).map((_, index) => (
              <TableRow key={index}>
                {Array.from({ length: 4 }).map((_, cellIndex) => (
                  <TableCell key={cellIndex}>
                    <Skeleton variant="text" />
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    );
  };

  // Render card view
  const renderCardView = () => (
    <Box>
      <Box sx={{ maxHeight: 'calc(100vh - 400px)', overflow: 'auto', pr: 1 }}>
        <Grid container spacing={3}>
          {paginatedDesignations.map((designation) => (
            <Grid key={designation._id} size={{ xs: 12, sm: 6, md: 4 }}>
              <Card
                sx={{
                  height: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  transition: 'all 0.2s',
                  '&:hover': {
                    transform: 'translateY(-2px)',
                    boxShadow: (theme) => theme.shadows[8],
                  },
                }}
              >
                <CardContent sx={{ flex: 1 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                    <Avatar 
                      sx={{ 
                        mr: 2, 
                        bgcolor: designation.active ? 'primary.main' : 'grey.400',
                        width: 48, 
                        height: 48 
                      }} 
                    >
                      <WorkIcon />
                    </Avatar>
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Typography variant="h6" noWrap>
                        {designation.name}
                      </Typography>
                      <Typography 
                        variant="caption" 
                        color={designation.active ? 'success.main' : 'error.main'}
                        sx={{ fontWeight: 'medium' }}
                      >
                        {designation.active ? 'Active' : 'Inactive'}
                      </Typography>
                    </Box>
                  </Box>
                  
                  <Typography variant="body2" color="text.secondary">
                    Created: {formatDate(designation.createdAt)}
                  </Typography>
                </CardContent>
                
                <CardActions sx={{ justifyContent: 'flex-end', pt: 0 }}>
                  <Tooltip title="Edit Designation">
                    <IconButton
                      size="small"
                      onClick={() => handleEditDesignation(designation)}
                      color="primary"
                    >
                      <EditIcon />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Delete Designation">
                    <IconButton
                      size="small"
                      onClick={() => {
                        setDesignationToDelete(designation._id);
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
      </Box>
      <TablePagination
        component="div"
        count={sortedDesignations.length}
        page={page}
        onPageChange={handleChangePage}
        rowsPerPage={rowsPerPage}
        onRowsPerPageChange={handleChangeRowsPerPage}
        rowsPerPageOptions={[6, 12, 24, 48]}
        sx={{
          borderTop: '1px solid',
          borderColor: 'divider',
          bgcolor: 'background.paper',
          mt: 2,
        }}
      />
    </Box>
  );

  // Render list view with frozen action column
  const renderListView = () => (
    <Box sx={{ maxHeight: 'calc(100vh - 400px)', overflow: 'auto' }}>
      <TableContainer component={Paper}>
        <Table stickyHeader>
          <TableHead>
            <TableRow sx={{ '& .MuiTableCell-root': { backgroundColor: 'grey.50' } }}>
              <TableCell sx={{ fontWeight: 'bold', backgroundColor: 'grey.50' }}>
                <TableSortLabel
                  active={sortBy === 'name'}
                  direction={sortBy === 'name' ? sortDirection : 'asc'}
                  onClick={() => handleSort('name')}
                  hideSortIcon={false}
                  sx={{
                    fontWeight: 'bold',
                    cursor: 'pointer',
                    '& .MuiTableSortLabel-icon': {
                      fontSize: '1.2rem !important',
                      color: 'text.primary !important',
                      opacity: '1 !important',
                      visibility: 'visible !important',
                    },
                    '&:hover': {
                      backgroundColor: 'action.hover',
                    },
                    '&:hover .MuiTableSortLabel-icon': {
                      opacity: '1 !important',
                      color: 'primary.main !important',
                    },
                    '&.Mui-active .MuiTableSortLabel-icon': {
                      color: 'primary.main !important',
                      opacity: '1 !important',
                      fontSize: '1.3rem !important',
                    }
                  }}
                >
                  Designation
                </TableSortLabel>
              </TableCell>
              <TableCell sx={{ fontWeight: 'bold', backgroundColor: 'grey.50' }}>
                <TableSortLabel
                  active={sortBy === 'active'}
                  direction={sortBy === 'active' ? sortDirection : 'asc'}
                  onClick={() => handleSort('active')}
                  hideSortIcon={false}
                  sx={{
                    fontWeight: 'bold',
                    cursor: 'pointer',
                    '& .MuiTableSortLabel-icon': {
                      fontSize: '1.2rem !important',
                      color: 'text.primary !important',
                      opacity: '1 !important',
                      visibility: 'visible !important',
                    },
                    '&:hover': {
                      backgroundColor: 'action.hover',
                    },
                    '&:hover .MuiTableSortLabel-icon': {
                      opacity: '1 !important',
                      color: 'primary.main !important',
                    },
                    '&.Mui-active .MuiTableSortLabel-icon': {
                      color: 'primary.main !important',
                      opacity: '1 !important',
                      fontSize: '1.3rem !important',
                    }
                  }}
                >
                  Status
                </TableSortLabel>
              </TableCell>
              <TableCell sx={{ fontWeight: 'bold', backgroundColor: 'grey.50' }}>
                <TableSortLabel
                  active={sortBy === 'createdAt'}
                  direction={sortBy === 'createdAt' ? sortDirection : 'asc'}
                  onClick={() => handleSort('createdAt')}
                  hideSortIcon={false}
                  sx={{
                    fontWeight: 'bold',
                    cursor: 'pointer',
                    '& .MuiTableSortLabel-icon': {
                      fontSize: '1.2rem !important',
                      color: 'text.primary !important',
                      opacity: '1 !important',
                      visibility: 'visible !important',
                    },
                    '&:hover': {
                      backgroundColor: 'action.hover',
                    },
                    '&:hover .MuiTableSortLabel-icon': {
                      opacity: '1 !important',
                      color: 'primary.main !important',
                    },
                    '&.Mui-active .MuiTableSortLabel-icon': {
                      color: 'primary.main !important',
                      opacity: '1 !important',
                      fontSize: '1.3rem !important',
                    }
                  }}
                >
                  Created
                </TableSortLabel>
              </TableCell>
              <TableCell 
                sx={{ 
                  position: 'sticky', 
                  right: 0, 
                  bgcolor: 'grey.50',
                  fontWeight: 'bold',
                  zIndex: 1,
                  borderLeft: (theme) => `1px solid ${theme.palette.divider}`,
                }}
              >
                Actions
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {paginatedDesignations.map((designation) => (
              <TableRow key={designation._id} hover>
                <TableCell>
                  <Typography variant="body2" fontWeight="medium">
                    {designation.name}
                  </Typography>
                </TableCell>
                <TableCell>
                  <Typography 
                    variant="body2" 
                    color={designation.active ? 'success.main' : 'error.main'}
                    sx={{ fontWeight: 'medium' }}
                  >
                    {designation.active ? 'Active' : 'Inactive'}
                  </Typography>
                </TableCell>
                <TableCell>
                  <Typography variant="body2">
                    {formatDate(designation.createdAt)}
                  </Typography>
                </TableCell>
                <TableCell 
                  sx={{ 
                    position: 'sticky', 
                    right: 0, 
                    bgcolor: 'background.paper',
                    borderLeft: (theme) => `1px solid ${theme.palette.divider}`,
                  }}
                >
                  <Box sx={{ display: 'flex', gap: 1 }}>
                    <Tooltip title="Edit Designation">
                      <IconButton
                        size="small"
                        onClick={() => handleEditDesignation(designation)}
                        color="primary"
                      >
                        <EditIcon />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Delete Designation">
                      <IconButton
                        size="small"
                        onClick={() => {
                          setDesignationToDelete(designation._id);
                          setDeleteConfirmOpen(true);
                        }}
                        color="error"
                      >
                        <DeleteIcon />
                      </IconButton>
                    </Tooltip>
                  </Box>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
      <TablePagination
        component="div"
        count={sortedDesignations.length}
        page={page}
        onPageChange={handleChangePage}
        rowsPerPage={rowsPerPage}
        onRowsPerPageChange={handleChangeRowsPerPage}
        rowsPerPageOptions={[5, 10, 25, 50]}
        sx={{
          borderTop: '2px solid',
          borderColor: 'divider',
          bgcolor: 'background.paper',
          p: 2,
          '& .MuiTablePagination-toolbar': {
            minHeight: 64,
          },
          '& .MuiTablePagination-spacer': {
            flex: '1 1 100%',
          },
          '& .MuiTablePagination-selectLabel': {
            fontSize: '1rem',
            fontWeight: 500,
          },
          '& .MuiTablePagination-displayedRows': {
            fontSize: '1rem',
            fontWeight: 500,
          },
          '& .MuiIconButton-root': {
            fontSize: '1.2rem',
          },
        }}
      />
    </Box>
  );

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box sx={{ mb: 3 }}>
        <Typography variant="h4" gutterBottom>
          Designation Management
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Manage job designations and their information
        </Typography>
      </Box>

      {/* Controls */}
      <Box sx={{ 
        mb: 3, 
        display: 'flex', 
        gap: 2, 
        flexWrap: 'wrap',
        alignItems: 'center',
        justifyContent: 'space-between'
      }}>
        <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center' }}>
          {/* Search */}
          <TextField
            size="small"
            placeholder="Search designations..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            InputProps={{
              startAdornment: <SearchIcon sx={{ mr: 1, color: 'text.secondary' }} />,
            }}
            sx={{ minWidth: 200 }}
          />
          
          {/* Status Filter */}
        </Box>

        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 1 }}>
          {/* Add Button */}
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={handleAddDesignation}
          >
            Add Designation
          </Button>
          
          {/* View Mode Toggle Buttons */}
          <Box sx={{ display: 'flex', border: '1px solid', borderColor: 'divider', borderRadius: 1 }}>
            <IconButton
              size="small"
              onClick={() => setViewMode('cards')}
              color={viewMode === 'cards' ? 'primary' : 'default'}
              sx={{
                borderRadius: '4px 0 0 4px',
                bgcolor: viewMode === 'cards' ? 'primary.main' : 'transparent',
                color: viewMode === 'cards' ? 'primary.contrastText' : 'text.secondary',
                '&:hover': {
                  bgcolor: viewMode === 'cards' ? 'primary.dark' : 'action.hover',
                },
              }}
            >
              <ViewModuleIcon />
            </IconButton>
            <IconButton
              size="small"
              onClick={() => setViewMode('list')}
              color={viewMode === 'list' ? 'primary' : 'default'}
              sx={{
                borderRadius: '0 4px 4px 0',
                bgcolor: viewMode === 'list' ? 'primary.main' : 'transparent',
                color: viewMode === 'list' ? 'primary.contrastText' : 'text.secondary',
                '&:hover': {
                  bgcolor: viewMode === 'list' ? 'primary.dark' : 'action.hover',
                },
              }}
            >
              <ViewListIcon />
            </IconButton>
          </Box>
        </Box>
      </Box>

      {/* Results Count */}
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        {loading ? 'Loading...' : `${sortedDesignations.length} designation(s) found`}
      </Typography>

      {/* Content */}
      {loading ? renderSkeleton() : (
        <>
          {sortedDesignations.length === 0 ? (
            <Box sx={{ 
              textAlign: 'center', 
              py: 8,
              color: 'text.secondary'
            }}>
              <AccountBoxIcon sx={{ fontSize: 64, mb: 2, opacity: 0.5 }} />
              <Typography variant="h6" gutterBottom>
                No designations found
              </Typography>
              <Typography variant="body2">
                {searchTerm
                  ? 'Try adjusting your search criteria'
                  : 'Get started by adding your first designation'
                }
              </Typography>
            </Box>
          ) : (
            viewMode === 'cards' ? renderCardView() : renderListView()
          )}
        </>
      )}

      {/* Floating Action Button for mobile */}
      <Fab
        color="primary"
        aria-label="add designation"
        onClick={handleAddDesignation}
        sx={{
          position: 'fixed',
          bottom: 16,
          right: 16,
          display: { xs: 'flex', sm: 'none' },
        }}
      >
        <AddIcon />
      </Fab>

      {/* Designation Form Dialog */}
      <Dialog 
        open={openDialog} 
        onClose={() => setOpenDialog(false)}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: { minHeight: '500px' }
        }}
      >
        <DialogTitle>
          {editingDesignation ? 'Edit Designation' : 'Add New Designation'}
        </DialogTitle>
        <form onSubmit={handleSubmit(onSubmit)}>
          <DialogContent>
            <Grid container spacing={2}>
              <Grid size={12}>
                <Controller
                  name="name"
                  control={control}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      label="Designation Name"
                      fullWidth
                      error={!!errors.name}
                      helperText={errors.name?.message}
                      margin="normal"
                    />
                  )}
                />
              </Grid>
              <Grid size={12}>
                <Controller
                  name="active"
                  control={control}
                  render={({ field }) => (
                    <FormControlLabel
                      control={
                        <Switch
                          checked={field.value}
                          onChange={field.onChange}
                        />
                      }
                      label="Active"
                    />
                  )}
                />
              </Grid>
            </Grid>
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
              {isSubmitting ? 'Saving...' : (editingDesignation ? 'Update' : 'Create')}
            </Button>
          </DialogActions>
        </form>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={deleteConfirmOpen}
        onClose={() => setDeleteConfirmOpen(false)}
      >
        <DialogTitle>Confirm Delete</DialogTitle>
        <DialogContent>
          <Alert severity="warning" sx={{ mb: 2 }}>
            This action cannot be undone.
          </Alert>
          <Typography>
            Are you sure you want to delete this designation? This will also affect 
            any employees associated with this designation.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteConfirmOpen(false)}>
            Cancel
          </Button>
          <Button 
            onClick={handleDeleteDesignation}
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