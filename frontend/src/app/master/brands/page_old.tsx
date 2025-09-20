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
  Chip,
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
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'react-hot-toast';
import api from '@/lib/api';

// Brand type definition (matches backend model exactly)
interface Brand {
  _id: string;
  brand: string; // Using actual field name from database
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
  const [filterStatus, setFilterStatus] = useState('');
  const [openDialog, setOpenDialog] = useState(false);
  const [editingBrand, setEditingBrand] = useState<Brand | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [brandToDelete, setBrandToDelete] = useState<string | null>(null);

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
      console.log('Brands API response:', response);
      
      // Extract brands array from API response
      const brandsData = response.data?.data && Array.isArray(response.data.data) 
        ? response.data.data 
        : [];
      
      setBrands(brandsData);
    } catch (error) {
      toast.error('Failed to load brands');
      console.error('Error loading brands:', error);
      setBrands([]); // Ensure brands is always an array
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBrands();
  }, []);

  // Filter brands based on search term
  const filteredBrands = Array.isArray(brands) ? brands.filter((brand) => {
    return brand.brand.toLowerCase().includes(searchTerm.toLowerCase());
  }) : [];

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

  // Get status color
  const getStatusColor = (status: string) => {
    return status === 'active' ? 'success' : 'error';
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
              {['Brand', 'Contact', 'Website', 'Status', 'Products', 'Created', 'Actions'].map((header) => (
                <TableCell key={header}>
                  <Skeleton variant="text" />
                </TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {Array.from({ length: 5 }).map((_, index) => (
              <TableRow key={index}>
                {Array.from({ length: 7 }).map((_, cellIndex) => (
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
    <Box sx={{ maxHeight: 'calc(100vh - 300px)', overflow: 'auto', pr: 1 }}>
      <Grid container spacing={3}>
        {filteredBrands.map((brand) => (
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
                    src={brand.logo}
                  >
                    <BusinessIcon />
                  </Avatar>
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography variant="h6" noWrap>
                      {brand.name}
                    </Typography>
                    <Chip
                      label={brand.status}
                      size="small"
                      color={getStatusColor(brand.status)}
                    />
                  </Box>
                </Box>
                
                {brand.description && (
                  <Typography 
                    variant="body2" 
                    color="text.secondary" 
                    gutterBottom
                    sx={{
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      display: '-webkit-box',
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: 'vertical',
                    }}
                  >
                    {brand.description}
                  </Typography>
                )}

                {brand.email && (
                  <Typography variant="body2" color="text.secondary" gutterBottom noWrap>
                    Email: {brand.email}
                  </Typography>
                )}

                {brand.phone && (
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    Phone: {brand.phone}
                  </Typography>
                )}

                {brand.website && (
                  <Typography 
                    variant="body2" 
                    color="primary.main" 
                    gutterBottom 
                    noWrap
                    sx={{ cursor: 'pointer' }}
                    onClick={() => window.open(brand.website, '_blank')}
                  >
                    🌐 {brand.website}
                  </Typography>
                )}

                {brand.productCount !== undefined && (
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    Products: {brand.productCount}
                  </Typography>
                )}
                
                <Typography variant="body2" color="text.secondary">
                  Created: {formatDate(brand.createdAt)}
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
  );

  // Render list view with frozen action column
  const renderListView = () => (
    <Box sx={{ maxHeight: 'calc(100vh - 300px)', overflow: 'auto' }}>
      <TableContainer component={Paper}>
        <Table stickyHeader>
          <TableHead>
            <TableRow>
              <TableCell>Brand</TableCell>
              <TableCell>Contact</TableCell>
              <TableCell>Website</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Products</TableCell>
              <TableCell>Created</TableCell>
              <TableCell 
                sx={{ 
                  position: 'sticky', 
                  right: 0, 
                  bgcolor: 'background.paper',
                  zIndex: 1,
                  borderLeft: (theme) => `1px solid ${theme.palette.divider}`,
                }}
              >
                Actions
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredBrands.map((brand) => (
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
                      src={brand.logo}
                    >
                      <BusinessIcon />
                    </Avatar>
                    <Box>
                      <Typography variant="body2" fontWeight="medium">
                        {brand.name}
                      </Typography>
                      {brand.description && (
                        <Typography 
                          variant="caption" 
                          color="text.secondary"
                          sx={{
                            maxWidth: 150,
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                            display: 'block',
                          }}
                        >
                          {brand.description}
                        </Typography>
                      )}
                    </Box>
                  </Box>
                </TableCell>
                <TableCell>
                  <Box>
                    {brand.email && (
                      <Typography variant="body2" noWrap>
                        {brand.email}
                      </Typography>
                    )}
                    {brand.phone && (
                      <Typography variant="body2" color="text.secondary">
                        {brand.phone}
                      </Typography>
                    )}
                    {!brand.email && !brand.phone && (
                      <Typography variant="body2" color="text.secondary">
                        -
                      </Typography>
                    )}
                  </Box>
                </TableCell>
                <TableCell>
                  {brand.website ? (
                    <Typography 
                      variant="body2" 
                      color="primary.main"
                      sx={{ 
                        cursor: 'pointer',
                        textDecoration: 'underline',
                        maxWidth: 150,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                      onClick={() => window.open(brand.website, '_blank')}
                    >
                      {brand.website}
                    </Typography>
                  ) : (
                    <Typography variant="body2" color="text.secondary">
                      -
                    </Typography>
                  )}
                </TableCell>
                <TableCell>
                  <Chip
                    label={brand.status}
                    size="small"
                    color={getStatusColor(brand.status)}
                  />
                </TableCell>
                <TableCell>
                  <Typography variant="body2">
                    {brand.productCount || 0}
                  </Typography>
                </TableCell>
                <TableCell>
                  <Typography variant="body2">
                    {formatDate(brand.createdAt)}
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
          <FormControl size="small" sx={{ minWidth: 120 }}>
            <InputLabel>Status</InputLabel>
            <Select
              value={filterStatus}
              label="Status"
              onChange={(e) => setFilterStatus(e.target.value)}
            >
              <MenuItem value="">All Status</MenuItem>
              <MenuItem value="active">Active</MenuItem>
              <MenuItem value="inactive">Inactive</MenuItem>
            </Select>
          </FormControl>
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
        {loading ? 'Loading...' : `${filteredBrands.length} brand(s) found`}
      </Typography>

      {/* Content */}
      {loading ? renderSkeleton() : (
        <>
          {filteredBrands.length === 0 ? (
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
                {searchTerm || filterStatus
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
                  name="name"
                  control={control}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      label="Brand Name"
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
                  name="description"
                  control={control}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      label="Description (Optional)"
                      fullWidth
                      multiline
                      rows={3}
                      error={!!errors.description}
                      helperText={errors.description?.message}
                      margin="normal"
                    />
                  )}
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <Controller
                  name="email"
                  control={control}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      label="Email (Optional)"
                      type="email"
                      fullWidth
                      error={!!errors.email}
                      helperText={errors.email?.message}
                      margin="normal"
                    />
                  )}
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <Controller
                  name="phone"
                  control={control}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      label="Phone (Optional)"
                      fullWidth
                      error={!!errors.phone}
                      helperText={errors.phone?.message}
                      margin="normal"
                    />
                  )}
                />
              </Grid>
              <Grid size={12}>
                <Controller
                  name="website"
                  control={control}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      label="Website (Optional)"
                      type="url"
                      placeholder="https://example.com"
                      fullWidth
                      error={!!errors.website}
                      helperText={errors.website?.message}
                      margin="normal"
                    />
                  )}
                />
              </Grid>
              <Grid size={12}>
                <Controller
                  name="address"
                  control={control}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      label="Address (Optional)"
                      fullWidth
                      multiline
                      rows={2}
                      error={!!errors.address}
                      helperText={errors.address?.message}
                      margin="normal"
                    />
                  )}
                />
              </Grid>
              <Grid size={12}>
                <Controller
                  name="status"
                  control={control}
                  render={({ field }) => (
                    <FormControl fullWidth margin="normal">
                      <InputLabel>Status</InputLabel>
                      <Select {...field} label="Status">
                        <MenuItem value="active">Active</MenuItem>
                        <MenuItem value="inactive">Inactive</MenuItem>
                      </Select>
                    </FormControl>
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
