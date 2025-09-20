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

// Brand type definition (matches backend model exactly)
interface Brand {
  _id: string;
  brand: string;
  created_at: string;
  created_by?: { username: string } | null;
  updated_at: string;
  updated_by?: { username: string } | null;
}

// Brand form schema (simplified to match actual database fields)
const brandSchema = z.object({
  brand: z.string().min(2, 'Brand name must be at least 2 characters'),
});

type BrandFormData = z.infer<typeof brandSchema>;

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
  const [orderBy, setOrderBy] = useState<keyof Brand>('brand');
  const [order, setOrder] = useState<'asc' | 'desc'>('asc');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);

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
  const filteredBrands = brands.filter((brand) =>
    brand.brand.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Sorting function
  const handleSort = (property: keyof Brand) => {
    const isAsc = orderBy === property && order === 'asc';
    setOrder(isAsc ? 'desc' : 'asc');
    setOrderBy(property);
    setPage(0); // Reset to first page when sorting
  };

  // Sort the filtered brands
  const sortedBrands = [...filteredBrands].sort((a, b) => {
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

  // Render cards view
  const renderCardsView = () => (
    <>
      <Grid container spacing={2}>
        {paginatedBrands.map((brand) => (
        <Grid size={{ xs: 12, sm: 6, md: 4 }} key={brand._id}>
          <Card>
            <CardContent>
              <Typography variant="h6" component="h2" gutterBottom>
                {brand.brand}
              </Typography>
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
    <TableContainer component={Paper}>
      <Table>
        <TableHead>
          <TableRow>
            <TableCell>
              <TableSortLabel
                active={orderBy === 'brand'}
                direction={orderBy === 'brand' ? order : 'asc'}
                onClick={() => handleSort('brand')}
                sx={{
                  fontWeight: 'bold',
                  '& .MuiTableSortLabel-icon': {
                    fontSize: '1.2rem',
                  },
                }}
              >
                Brand Name
              </TableSortLabel>
            </TableCell>
            <TableCell>
              <TableSortLabel
                active={orderBy === 'created_at'}
                direction={orderBy === 'created_at' ? order : 'asc'}
                onClick={() => handleSort('created_at')}
                sx={{
                  fontWeight: 'bold',
                  '& .MuiTableSortLabel-icon': {
                    fontSize: '1.2rem',
                  },
                }}
              >
                Created Date
              </TableSortLabel>
            </TableCell>
            <TableCell>
              <TableSortLabel
                active={orderBy === 'updated_at'}
                direction={orderBy === 'updated_at' ? order : 'asc'}
                onClick={() => handleSort('updated_at')}
                sx={{
                  fontWeight: 'bold',
                  '& .MuiTableSortLabel-icon': {
                    fontSize: '1.2rem',
                  },
                }}
              >
                Updated Date
              </TableSortLabel>
            </TableCell>
            <TableCell>
              <TableSortLabel
                active={orderBy === 'created_by'}
                direction={orderBy === 'created_by' ? order : 'asc'}
                onClick={() => handleSort('created_by')}
                sx={{
                  fontWeight: 'bold',
                  '& .MuiTableSortLabel-icon': {
                    fontSize: '1.2rem',
                  },
                }}
              >
                Created By
              </TableSortLabel>
            </TableCell>
            <TableCell align="right" sx={{ fontWeight: 'bold' }}>Actions</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {paginatedBrands.map((brand) => (
            <TableRow key={brand._id} hover>
              <TableCell>
                <Typography variant="body1" fontWeight="medium">
                  {brand.brand}
                </Typography>
              </TableCell>
              <TableCell>{formatDate(brand.created_at)}</TableCell>
              <TableCell>{formatDate(brand.updated_at)}</TableCell>
              <TableCell>
                {brand.created_by ? brand.created_by.username : '-'}
              </TableCell>
              <TableCell align="right">
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
              </TableCell>
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
          <Typography variant="h4" component="h1" fontWeight="bold">
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
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
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
