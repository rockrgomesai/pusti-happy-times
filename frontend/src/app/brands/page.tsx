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
  FormControl,
  InputLabel,
  Select,
  MenuItem,
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
  Business as BusinessIcon,
  Store as StoreIcon,
} from '@mui/icons-material';
import { TablePagination } from '@mui/material';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'react-hot-toast';
import api from '@/lib/api';

// Brand type definition
interface Brand {
  _id: string;
  brand: string;
  created_at: string;
  updated_at: string;
  created_by: string | null;
  updated_by: string | null;
}

// Brand form schema
const brandSchema = z.object({
  brand: z.string().min(2, 'Brand name must be at least 2 characters'),
});

type BrandFormData = z.infer<typeof brandSchema>;

export default function BrandsPage() {
  // State management
  const [brands, setBrands] = useState<Brand[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'cards' | 'list'>('list');
  const [searchTerm, setSearchTerm] = useState('');
  const [openDialog, setOpenDialog] = useState(false);
  const [editingBrand, setEditingBrand] = useState<Brand | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [brandToDelete, setBrandToDelete] = useState<string | null>(null);
  
  // Pagination state
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  
  // Sorting state
  const [sortBy, setSortBy] = useState<string>('created_at');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

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
    },
  });

  // Load brands
  const loadBrands = async () => {
    try {
      setLoading(true);
      const response = await api.get('/brands');
      setBrands(response.data);
    } catch (error) {
      toast.error('Failed to load brands');
      console.error('Error loading brands:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBrands();
  }, []);

  // Reset page when filters change
  useEffect(() => {
    setPage(0);
  }, [searchTerm]);

  // Filter brands based on search and filters
  const filteredBrands = brands.filter((brand) => {
    const matchesSearch = 
      brand.brand.toLowerCase().includes(searchTerm.toLowerCase());
    
    return matchesSearch;
  });

  // Sort filtered brands
  const sortedBrands = [...filteredBrands].sort((a, b) => {
    let aValue: unknown = a[sortBy as keyof Brand];
    let bValue: unknown = b[sortBy as keyof Brand];
    
    // Handle date values
    if (sortBy === 'created_at' || sortBy === 'updated_at') {
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
  const paginatedBrands = sortedBrands.slice(
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
  const onSubmit = async (data: BrandFormData) => {
    try {
      if (editingBrand) {
        await api.put(`/api/brands/${editingBrand._id}`, data);
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
      await api.delete(`/api/brands/${brandToDelete}`);
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
  const handleEditBrand = (brand: Brand) => {
    setEditingBrand(brand);
    reset({
      brand: brand.brand,
    });
    setOpenDialog(true);
  };

  // Handle add new brand
  const handleAddBrand = () => {
    setEditingBrand(null);
    reset();
    setOpenDialog(true);
  };

  // Format date
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-BD', {
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
              {['Brand', 'Created', 'Actions'].map((header) => (
                <TableCell key={header}>
                  <Skeleton variant="text" />
                </TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {Array.from({ length: 5 }).map((_, index) => (
              <TableRow key={index}>
                {Array.from({ length: 3 }).map((_, cellIndex) => (
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
          {paginatedBrands.map((brand) => (
            <Grid key={brand._id} size={{ xs: 12, sm: 6, md: 4 }}>
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
                        bgcolor: 'primary.main',
                        width: 48, 
                        height: 48 
                      }} 
                    >
                      <BusinessIcon />
                    </Avatar>
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Typography variant="h6" noWrap>
                        {brand.brand}
                      </Typography>
                    </Box>
                  </Box>
                  
                  <Typography variant="body2" color="text.secondary">
                    Created: {formatDate(brand.created_at)}
                  </Typography>
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
      </Box>
      <TablePagination
        component="div"
        count={sortedBrands.length}
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
                  active={sortBy === 'brand'}
                  direction={sortBy === 'brand' ? sortDirection : 'asc'}
                  onClick={() => handleSort('brand')}
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
                  Brand
                </TableSortLabel>
              </TableCell>
              <TableCell sx={{ fontWeight: 'bold', backgroundColor: 'grey.50' }}>
                <TableSortLabel
                  active={sortBy === 'created_at'}
                  direction={sortBy === 'created_at' ? sortDirection : 'asc'}
                  onClick={() => handleSort('created_at')}
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
            {paginatedBrands.map((brand) => (
              <TableRow key={brand._id} hover>
                <TableCell>
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <Avatar 
                      sx={{ 
                        mr: 2, 
                        width: 40, 
                        height: 40,
                        bgcolor: 'primary.main'
                      }} 
                    >
                      <BusinessIcon />
                    </Avatar>
                    <Box>
                      <Typography variant="body2" fontWeight="medium">
                        {brand.brand}
                      </Typography>
                    </Box>
                  </Box>
                </TableCell>
                <TableCell>
                  <Typography variant="body2">
                    {formatDate(brand.created_at)}
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
                  </Box>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
      <TablePagination
        component="div"
        count={sortedBrands.length}
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
          Brand Management
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Manage brands and their information
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
            placeholder="Search brands..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            InputProps={{
              startAdornment: <SearchIcon sx={{ mr: 1, color: 'text.secondary' }} />,
            }}
            sx={{ minWidth: 200 }}
          />
          
          {/* Status Filter */}
        </Box>

        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
          {/* View Mode Toggle */}
          <FormControlLabel
            control={
              <Switch
                checked={viewMode === 'list'}
                onChange={(e) => setViewMode(e.target.checked ? 'list' : 'cards')}
                icon={<ViewModuleIcon />}
                checkedIcon={<ViewListIcon />}
              />
            }
            label={viewMode === 'cards' ? 'Cards' : 'List'}
          />
          
          {/* Add Button */}
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={handleAddBrand}
          >
            Add Brand
          </Button>
        </Box>
      </Box>

      {/* Results Count */}
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        {loading ? 'Loading...' : `${sortedBrands.length} brand(s) found`}
      </Typography>

      {/* Content */}
      {loading ? renderSkeleton() : (
        <>
          {sortedBrands.length === 0 ? (
            <Box sx={{ 
              textAlign: 'center', 
              py: 8,
              color: 'text.secondary'
            }}>
              <StoreIcon sx={{ fontSize: 64, mb: 2, opacity: 0.5 }} />
              <Typography variant="h6" gutterBottom>
                No brands found
              </Typography>
              <Typography variant="body2">
                {searchTerm
                  ? 'Try adjusting your search criteria'
                  : 'Get started by adding your first brand'
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

      {/* Brand Form Dialog */}
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
          {editingBrand ? 'Edit Brand' : 'Add New Brand'}
        </DialogTitle>
        <form onSubmit={handleSubmit(onSubmit)}>
          <DialogContent>
            <Grid container spacing={2}>
              <Grid size={12}>
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
              {isSubmitting ? 'Saving...' : (editingBrand ? 'Update' : 'Create')}
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
            Are you sure you want to delete this brand? This will also affect 
            any products associated with this brand.
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
    </Box>
  );
}
