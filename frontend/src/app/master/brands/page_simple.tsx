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
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Business as BusinessIcon,
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
      const response = await api.get('/api/brands');
      
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

  // Handle form submission
  const onSubmit = async (data: BrandFormData) => {
    try {
      if (editingBrand) {
        await api.put(`/api/brands/${editingBrand._id}`, data);
        toast.success('Brand updated successfully');
      } else {
        await api.post('/api/brands', data);
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

      {/* Brands Grid */}
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
      ) : brands.length === 0 ? (
        <Alert severity="info">
          No brands found. Click &quot;Add Brand&quot; to create your first brand.
        </Alert>
      ) : (
        <Grid container spacing={2}>
          {brands.map((brand) => (
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
