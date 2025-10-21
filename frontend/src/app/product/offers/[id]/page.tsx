"use client";

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  Box,
  Paper,
  Typography,
  CircularProgress,
  Alert,
  Button,
  Container,
  Grid,
  Chip,
  Divider,
  Stack,
  Card,
  CardContent
} from '@mui/material';
import {
  ArrowBack as ArrowBackIcon,
  Edit as EditIcon,
  ContentCopy as DuplicateIcon,
  Delete as DeleteIcon
} from '@mui/icons-material';
import { offersApi } from '@/lib/api/offers';
import { format } from 'date-fns';

const formatOfferType = (type: string) => {
  return type.split('_').map(word => 
    word.charAt(0) + word.slice(1).toLowerCase()
  ).join(' ');
};

const getStatusColor = (status: string): "default" | "primary" | "secondary" | "error" | "warning" | "info" | "success" => {
  switch (status) {
    case 'active':
      return 'success';
    case 'draft':
      return 'default';
    case 'paused':
      return 'warning';
    case 'expired':
      return 'error';
    case 'completed':
      return 'info';
    default:
      return 'default';
  }
};

// Render configuration details in a user-friendly format
const renderConfigurationDetails = (offerType: string, config: any) => {
  if (!config) return null;

  const renderField = (label: string, value: any, prefix?: string, suffix?: string) => {
    if (value === undefined || value === null) return null;
    
    return (
      <Grid item xs={12} sm={6} md={4} key={label}>
        <Typography variant="body2" color="text.secondary">
          {label}
        </Typography>
        <Typography variant="body1" fontWeight={600}>
          {prefix}{value}{suffix}
        </Typography>
      </Grid>
    );
  };

  const renderSlabs = (slabs: any[], isPercentage: boolean) => {
    if (!slabs || slabs.length === 0) return null;

    return (
      <Grid item xs={12}>
        <Typography variant="body2" color="text.secondary" gutterBottom>
          Discount Slabs
        </Typography>
        <Stack spacing={1}>
          {slabs.map((slab, index) => (
            <Paper key={index} sx={{ p: 2, bgcolor: 'grey.50' }}>
              <Grid container spacing={2} alignItems="center">
                <Grid item xs={12} sm={4}>
                  <Typography variant="caption" color="text.secondary">
                    Order Value Range
                  </Typography>
                  <Typography variant="body2" fontWeight={600}>
                    ৳{slab.minValue} - ৳{slab.maxValue}
                  </Typography>
                </Grid>
                <Grid item xs={12} sm={4}>
                  <Typography variant="caption" color="text.secondary">
                    Discount
                  </Typography>
                  <Typography variant="body2" fontWeight={600} color="primary">
                    {isPercentage 
                      ? `${slab.discountPercentage}%` 
                      : `৳${slab.discountAmount}`}
                  </Typography>
                </Grid>
                <Grid item xs={12} sm={4}>
                  <Chip label={`Slab ${index + 1}`} size="small" color="primary" variant="outlined" />
                </Grid>
              </Grid>
            </Paper>
          ))}
        </Stack>
      </Grid>
    );
  };

  const renderVolumeSlabs = (slabs: any[]) => {
    if (!slabs || slabs.length === 0) return null;

    return (
      <Grid item xs={12}>
        <Typography variant="body2" color="text.secondary" gutterBottom>
          Volume Discount Slabs
        </Typography>
        <Stack spacing={1}>
          {slabs.map((slab, index) => (
            <Paper key={index} sx={{ p: 2, bgcolor: 'grey.50' }}>
              <Grid container spacing={2} alignItems="center">
                <Grid item xs={12} sm={4}>
                  <Typography variant="caption" color="text.secondary">
                    Quantity Range
                  </Typography>
                  <Typography variant="body2" fontWeight={600}>
                    {slab.minQuantity} - {slab.maxQuantity} units
                  </Typography>
                </Grid>
                <Grid item xs={12} sm={4}>
                  <Typography variant="caption" color="text.secondary">
                    Discount
                  </Typography>
                  <Typography variant="body2" fontWeight={600} color="primary">
                    {slab.discountPercentage}%
                  </Typography>
                </Grid>
                <Grid item xs={12} sm={4}>
                  <Chip label={`Tier ${index + 1}`} size="small" color="secondary" variant="outlined" />
                </Grid>
              </Grid>
            </Paper>
          ))}
        </Stack>
      </Grid>
    );
  };

  switch (offerType) {
    case 'FLAT_DISCOUNT_PCT':
      return (
        <Grid container spacing={2}>
          {renderField('Discount Percentage', config.discountPercentage, '', '%')}
          {renderField('Minimum Order Value', config.minOrderValue, '৳')}
          {renderField('Maximum Discount Amount', config.maxDiscountAmount, '৳')}
          {config.selectedProducts && (
            <Grid item xs={12}>
              <Typography variant="body2" color="text.secondary">
                Applicable to {config.selectedProducts.length} product(s)
              </Typography>
            </Grid>
          )}
        </Grid>
      );

    case 'FLAT_DISCOUNT_AMT':
      return (
        <Grid container spacing={2}>
          {renderField('Discount Amount', config.discountAmount, '৳')}
          {renderField('Minimum Order Value', config.minOrderValue, '৳')}
          {config.selectedProducts && (
            <Grid item xs={12}>
              <Typography variant="body2" color="text.secondary">
                Applicable to {config.selectedProducts.length} product(s)
              </Typography>
            </Grid>
          )}
        </Grid>
      );

    case 'DISCOUNT_SLAB_PCT':
      return (
        <Grid container spacing={2}>
          {renderSlabs(config.slabs, true)}
          {config.selectedProducts && (
            <Grid item xs={12}>
              <Typography variant="body2" color="text.secondary">
                Applicable to {config.selectedProducts.length} product(s)
              </Typography>
            </Grid>
          )}
        </Grid>
      );

    case 'DISCOUNT_SLAB_AMT':
      return (
        <Grid container spacing={2}>
          {renderSlabs(config.slabs, false)}
          {config.selectedProducts && (
            <Grid item xs={12}>
              <Typography variant="body2" color="text.secondary">
                Applicable to {config.selectedProducts.length} product(s)
              </Typography>
            </Grid>
          )}
        </Grid>
      );

    case 'CASHBACK':
      return (
        <Grid container spacing={2}>
          {config.cashbackPercentage !== undefined && 
            renderField('Cashback Percentage', config.cashbackPercentage, '', '%')}
          {config.cashbackAmount !== undefined && 
            renderField('Cashback Amount', config.cashbackAmount, '৳')}
          {renderField('Maximum Cashback', config.maxCashback, '৳')}
          {renderField('Minimum Order Value', config.minOrderValue, '৳')}
          {config.selectedProducts && (
            <Grid item xs={12}>
              <Typography variant="body2" color="text.secondary">
                Applicable to {config.selectedProducts.length} product(s)
              </Typography>
            </Grid>
          )}
        </Grid>
      );

    case 'VOLUME_DISCOUNT':
      return (
        <Grid container spacing={2}>
          {renderVolumeSlabs(config.volumeSlabs)}
          {config.selectedProducts && (
            <Grid item xs={12}>
              <Typography variant="body2" color="text.secondary">
                Applicable to {config.selectedProducts.length} product(s)
              </Typography>
            </Grid>
          )}
        </Grid>
      );

    case 'FLASH_SALE':
      return (
        <Grid container spacing={2}>
          {renderField('Discount Percentage', config.discountPercentage, '', '%')}
          {renderField('Stock Limit', config.stockLimit, '', ' units')}
          {renderField('Order Limit per Distributor', config.orderLimit, '', ' orders')}
          {config.selectedProducts && (
            <Grid item xs={12}>
              <Typography variant="body2" color="text.secondary">
                Applicable to {config.selectedProducts.length} product(s)
              </Typography>
            </Grid>
          )}
        </Grid>
      );

    case 'LOYALTY_POINTS':
      return (
        <Grid container spacing={2}>
          {renderField('Points Per Unit', config.pointsPerUnit, '', ' points')}
          {renderField('Point Value', config.pointsValue, '৳', ' per point')}
          {config.selectedProducts && (
            <Grid item xs={12}>
              <Typography variant="body2" color="text.secondary">
                Applicable to {config.selectedProducts.length} product(s)
              </Typography>
            </Grid>
          )}
        </Grid>
      );

    case 'FREE_PRODUCT':
    case 'BUNDLE_OFFER':
    case 'BOGO':
      return (
        <Grid container spacing={2}>
          {config.buyProducts && config.buyProducts.length > 0 && (
            <Grid item xs={12}>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                Buy Products
              </Typography>
              <Stack spacing={0.5}>
                {config.buyProducts.map((bp: any, idx: number) => (
                  <Chip 
                    key={idx} 
                    label={`${bp.quantity}x Product`} 
                    size="small" 
                    color="primary"
                    variant="outlined"
                  />
                ))}
              </Stack>
            </Grid>
          )}
          {config.getProducts && config.getProducts.length > 0 && (
            <Grid item xs={12}>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                Get Products
              </Typography>
              <Stack spacing={0.5}>
                {config.getProducts.map((gp: any, idx: number) => (
                  <Chip 
                    key={idx} 
                    label={`${gp.quantity}x Product ${gp.discountPercentage ? `(${gp.discountPercentage}% off)` : ''}`}
                    size="small" 
                    color="success"
                    variant="outlined"
                  />
                ))}
              </Stack>
            </Grid>
          )}
          {renderField('Minimum Order Value', config.minOrderValue, '৳')}
        </Grid>
      );

    case 'FIRST_ORDER':
      return (
        <Grid container spacing={2}>
          {renderField('Discount Percentage', config.discountPercentage, '', '%')}
          {renderField('Discount Amount', config.discountAmount, '৳')}
          {renderField('Maximum Discount', config.maxDiscountAmount, '৳')}
          <Grid item xs={12}>
            <Alert severity="info" sx={{ mt: 1 }}>
              This offer applies only to first-time orders from distributors
            </Alert>
          </Grid>
        </Grid>
      );

    case 'CROSS_CATEGORY':
      return (
        <Grid container spacing={2}>
          {renderField('Discount Percentage', config.discountPercentage, '', '%')}
          {renderField('Minimum Categories Required', config.minCategoriesRequired)}
          {config.requiredCategories && config.requiredCategories.length > 0 && (
            <Grid item xs={12}>
              <Typography variant="body2" color="text.secondary">
                Requires products from {config.requiredCategories.length} categories
              </Typography>
            </Grid>
          )}
        </Grid>
      );

    default:
      return (
        <Grid container spacing={2}>
          <Grid item xs={12}>
            <Alert severity="info">
              No specific configuration details available for this offer type
            </Alert>
          </Grid>
        </Grid>
      );
  }
};

export default function ViewOfferPage() {
  const params = useParams();
  const router = useRouter();
  const offerId = params.id as string;
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [offer, setOffer] = useState<any>(null);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    loadOffer();
  }, [offerId]);

  const loadOffer = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await offersApi.getById(offerId);
      setOffer(data);
    } catch (err: any) {
      console.error('Error loading offer:', err);
      setError(err.response?.data?.message || 'Failed to load offer');
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    router.push('/product/browseoffers');
  };

  const handleEdit = () => {
    router.push(`/product/offers/edit/${offerId}`);
  };

  const handleDuplicate = async () => {
    try {
      setActionLoading(true);
      await offersApi.duplicate(offerId);
      alert('Offer duplicated successfully!');
      router.push('/product/browseoffers');
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to duplicate offer');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm(`Are you sure you want to delete "${offer?.name}"?`)) {
      return;
    }

    try {
      setActionLoading(true);
      await offersApi.delete(offerId);
      alert('Offer deleted successfully!');
      router.push('/product/browseoffers');
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to delete offer');
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px' }}>
          <CircularProgress />
        </Box>
      </Container>
    );
  }

  if (error || !offer) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Alert severity="error" sx={{ mb: 3 }}>
          {error || 'Offer not found'}
        </Alert>
        <Button
          variant="outlined"
          startIcon={<ArrowBackIcon />}
          onClick={handleBack}
        >
          Back to Offers
        </Button>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      {/* Header */}
      <Box sx={{ mb: 3, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Button
            variant="outlined"
            startIcon={<ArrowBackIcon />}
            onClick={handleBack}
          >
            Back
          </Button>
          <Typography variant="h4" component="h1">
            Offer Details
          </Typography>
        </Box>
        
        <Stack direction="row" spacing={1}>
          <Button
            variant="outlined"
            startIcon={<EditIcon />}
            onClick={handleEdit}
            disabled={actionLoading}
          >
            Edit
          </Button>
          <Button
            variant="outlined"
            color="secondary"
            startIcon={<DuplicateIcon />}
            onClick={handleDuplicate}
            disabled={actionLoading}
          >
            Duplicate
          </Button>
          <Button
            variant="outlined"
            color="error"
            startIcon={<DeleteIcon />}
            onClick={handleDelete}
            disabled={actionLoading}
          >
            Delete
          </Button>
        </Stack>
      </Box>

      {/* Main Content */}
      <Grid container spacing={3}>
        {/* Basic Information */}
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Basic Information
              </Typography>
              <Divider sx={{ mb: 2 }} />
              
              <Grid container spacing={2}>
                <Grid item xs={12} md={6}>
                  <Typography variant="body2" color="text.secondary">
                    Offer Name
                  </Typography>
                  <Typography variant="body1" fontWeight={600}>
                    {offer.name}
                  </Typography>
                </Grid>
                
                <Grid item xs={12} md={6}>
                  <Typography variant="body2" color="text.secondary">
                    Offer Type
                  </Typography>
                  <Typography variant="body1" fontWeight={600}>
                    {formatOfferType(offer.offer_type)}
                  </Typography>
                </Grid>
                
                <Grid item xs={12} md={6}>
                  <Typography variant="body2" color="text.secondary">
                    Product Segments
                  </Typography>
                  <Stack direction="row" spacing={0.5} sx={{ mt: 0.5 }}>
                    {offer.product_segments?.map((seg: string) => (
                      <Chip key={seg} label={seg} size="small" />
                    ))}
                  </Stack>
                </Grid>
                
                <Grid item xs={12} md={6}>
                  <Typography variant="body2" color="text.secondary">
                    Status
                  </Typography>
                  <Box sx={{ mt: 0.5 }}>
                    <Chip
                      label={offer.status.toUpperCase()}
                      color={getStatusColor(offer.status)}
                      size="small"
                    />
                    <Chip
                      label={offer.active ? 'ACTIVE' : 'INACTIVE'}
                      color={offer.active ? 'success' : 'default'}
                      size="small"
                      sx={{ ml: 1 }}
                    />
                  </Box>
                </Grid>
                
                <Grid item xs={12} md={6}>
                  <Typography variant="body2" color="text.secondary">
                    Start Date
                  </Typography>
                  <Typography variant="body1" fontWeight={600}>
                    {format(new Date(offer.start_date), 'MMMM dd, yyyy')}
                  </Typography>
                </Grid>
                
                <Grid item xs={12} md={6}>
                  <Typography variant="body2" color="text.secondary">
                    End Date
                  </Typography>
                  <Typography variant="body1" fontWeight={600}>
                    {format(new Date(offer.end_date), 'MMMM dd, yyyy')}
                  </Typography>
                </Grid>
                
                {offer.description && (
                  <Grid item xs={12}>
                    <Typography variant="body2" color="text.secondary">
                      Description
                    </Typography>
                    <Typography variant="body1">
                      {offer.description}
                    </Typography>
                  </Grid>
                )}
              </Grid>
            </CardContent>
          </Card>
        </Grid>

        {/* Configuration */}
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Offer Configuration
              </Typography>
              <Divider sx={{ mb: 2 }} />
              
              {offer.config ? (
                <Box>
                  {renderConfigurationDetails(offer.offer_type, offer.config)}
                </Box>
              ) : (
                <Alert severity="info">
                  No configuration details available
                </Alert>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Selected Products */}
        {offer.config?.selectedProducts && offer.config.selectedProducts.length > 0 && (
          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Selected Products ({offer.config.selectedProducts.length})
                </Typography>
                <Divider sx={{ mb: 2 }} />
                
                <Stack spacing={1}>
                  {offer.config.selectedProducts.map((product: any) => (
                    <Box
                      key={product._id}
                      sx={{
                        p: 1.5,
                        bgcolor: 'grey.50',
                        borderRadius: 1,
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center'
                      }}
                    >
                      <Box>
                        <Typography variant="body2" fontWeight={600}>
                          {product.sku}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {product.unit}
                          {product.bangla_name && ` • ${product.bangla_name}`}
                        </Typography>
                      </Box>
                      {product.db_price && (
                        <Typography variant="body2" fontWeight={600}>
                          ৳{product.db_price}
                        </Typography>
                      )}
                    </Box>
                  ))}
                </Stack>
              </CardContent>
            </Card>
          </Grid>
        )}

        {/* Metadata */}
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Metadata
              </Typography>
              <Divider sx={{ mb: 2 }} />
              
              <Grid container spacing={2}>
                <Grid item xs={12} md={6}>
                  <Typography variant="body2" color="text.secondary">
                    Created By
                  </Typography>
                  <Typography variant="body1">
                    {offer.created_by?.name || offer.created_by?.email || 'N/A'}
                  </Typography>
                </Grid>
                
                <Grid item xs={12} md={6}>
                  <Typography variant="body2" color="text.secondary">
                    Created At
                  </Typography>
                  <Typography variant="body1">
                    {format(new Date(offer.createdAt), 'MMM dd, yyyy HH:mm')}
                  </Typography>
                </Grid>
                
                {offer.updated_by && (
                  <Grid item xs={12} md={6}>
                    <Typography variant="body2" color="text.secondary">
                      Updated By
                    </Typography>
                    <Typography variant="body1">
                      {offer.updated_by?.name || offer.updated_by?.email || 'N/A'}
                    </Typography>
                  </Grid>
                )}
                
                {offer.updatedAt && (
                  <Grid item xs={12} md={6}>
                    <Typography variant="body2" color="text.secondary">
                      Updated At
                    </Typography>
                    <Typography variant="body1">
                      {format(new Date(offer.updatedAt), 'MMM dd, yyyy HH:mm')}
                    </Typography>
                  </Grid>
                )}
              </Grid>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Container>
  );
}
