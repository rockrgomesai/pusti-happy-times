'use client';

import React, { useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Stack,
  Paper,
  Divider,
  Chip,
  Button,
  Alert,
  List,
  ListItem,
  ListItemText,
  CircularProgress
} from '@mui/material';
import { offersApi } from '@/lib/api/offers';
import { OFFER_TYPES, type OfferTypeCode } from '@/types/offer';
import EditIcon from '@mui/icons-material/Edit';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import InfoIcon from '@mui/icons-material/Info';

interface Screen5Props {
  data: {
    offerName: string;
    productSegments: string[];
    startDate: string;
    endDate: string;
    selectedOfferType: OfferTypeCode | '';
    territories: {
      zones: { items: any[]; mode: 'include' | 'exclude' };
      regions: { items: any[]; mode: 'include' | 'exclude' };
      areas: { items: any[]; mode: 'include' | 'exclude' };
      dbPoints: { items: any[]; mode: 'include' | 'exclude' };
    };
    distributors: {
      items: any[];
      mode: 'include' | 'exclude';
    };
    offerConfig: {
      selectedProducts?: string[];
      applyToAllProducts?: boolean;
      discountPercentage?: number;
      discountAmount?: number;
      minOrderValue?: number;
      maxDiscountAmount?: number;
      slabs?: Array<any>;
      buyProducts?: Array<any>;
      getProducts?: Array<any>;
      cashbackPercentage?: number;
      cashbackAmount?: number;
      maxCashback?: number;
      volumeSlabs?: Array<any>;
      pointsPerUnit?: number;
      pointsValue?: number;
      stockLimit?: number;
      orderLimit?: number;
      // VOLUME_DISCOUNT
      volumeTiers?: Array<{
        minQuantity: number;
        discountPercentage?: number;
        discountAmount?: number;
        maxDiscount?: number;
      }>;
      // CROSS_CATEGORY
      minTriggerAmount?: number;
      triggerCategories?: string[];
      rewardCategories?: string[];
    };
  };
  onStepChange: (step: number) => void;
  onSubmit: () => void;
  mode?: 'create' | 'edit';
  offerId?: string;
}

export default function Screen5ReviewSubmit({ data, onStepChange, onSubmit, mode = 'create', offerId }: Screen5Props) {
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string>('');
  const [submitSuccess, setSubmitSuccess] = useState(false);

  const offerTypeInfo = data.selectedOfferType 
    ? OFFER_TYPES.find(t => t.code === data.selectedOfferType)
    : null;

  const formatDate = (dateString: string) => {
    if (!dateString) return 'Not set';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  };

  const getTerritoryCount = (level: keyof typeof data.territories) => {
    return data.territories[level]?.items?.length || 0;
  };

  const getDistributorCount = () => {
    return data.distributors?.items?.length || 0;
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    setSubmitError('');
    
    try {
      // Prepare payload for API
      const payload = {
        name: data.offerName,
        product_segments: data.productSegments,
        start_date: data.startDate,
        end_date: data.endDate,
        offer_type: data.selectedOfferType,
        
        // Territory configuration
        territories: {
          zones: {
            ids: data.territories.zones.items.map(z => z._id),
            mode: data.territories.zones.mode
          },
          regions: {
            ids: data.territories.regions.items.map(r => r._id),
            mode: data.territories.regions.mode
          },
          areas: {
            ids: data.territories.areas.items.map(a => a._id),
            mode: data.territories.areas.mode
          },
          db_points: {
            ids: data.territories.dbPoints.items.map(d => d._id),
            mode: data.territories.dbPoints.mode
          }
        },
        
        // Distributor configuration
        distributors: {
          ids: data.distributors.items.map(d => d._id),
          mode: data.distributors.mode
        },
        
        // Offer configuration
        config: data.offerConfig,
        
        // Status
        status: 'Draft'
      };

      console.log('=== SUBMITTING OFFER ===');
      console.log('Payload:', JSON.stringify(payload, null, 2));

      let response;
      if (mode === 'edit' && offerId) {
        // Call API to update offer
        console.log('Updating offer:', offerId);
        response = await offersApi.update(offerId, payload);
      } else {
        // Call API to create offer
        console.log('Creating new offer');
        response = await offersApi.createOffer(payload);
      }
      
      setSubmitSuccess(true);
      console.log('Offer submitted successfully:', response);
      
      // Call parent callback
      setTimeout(() => {
        onSubmit();
      }, 1500);
      
    } catch (error: any) {
      console.error(`=== ERROR ${mode.toUpperCase()}ING OFFER ===`);
      console.error('Error:', error);
      console.error('Error response:', error.response);
      console.error('Error data:', error.response?.data);
      setSubmitError(error.response?.data?.message || `Failed to ${mode} offer. Please try again.`);
    } finally {
      setSubmitting(false);
    }
  };

  const renderSection = (
    title: string,
    content: React.ReactNode,
    screenNumber: number,
    icon?: React.ReactNode
  ) => (
    <Paper sx={{ p: 2, bgcolor: 'grey.50' }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          {icon}
          <Typography variant="subtitle2" fontWeight={600}>
            {title}
          </Typography>
        </Box>
        <Button
          size="small"
          startIcon={<EditIcon />}
          onClick={() => onStepChange(screenNumber)}
          sx={{ minWidth: 'auto' }}
        >
          Edit
        </Button>
      </Box>
      {content}
    </Paper>
  );

  const renderOfferConfigDetails = () => {
    const config = data.offerConfig;

    switch (data.selectedOfferType) {
      case 'FLAT_DISCOUNT_PCT':
        return (
          <Stack spacing={1}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
              <Typography variant="body2" color="text.secondary">Discount:</Typography>
              <Typography variant="body2" fontWeight={600}>{config.discountPercentage}%</Typography>
            </Box>
            {config.minOrderValue && (
              <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                <Typography variant="body2" color="text.secondary">Min Order Value:</Typography>
                <Typography variant="body2" fontWeight={600}>৳{config.minOrderValue}</Typography>
              </Box>
            )}
            {config.maxDiscountAmount && (
              <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                <Typography variant="body2" color="text.secondary">Max Discount:</Typography>
                <Typography variant="body2" fontWeight={600}>৳{config.maxDiscountAmount}</Typography>
              </Box>
            )}
          </Stack>
        );

      case 'FLAT_DISCOUNT_AMT':
        return (
          <Stack spacing={1}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
              <Typography variant="body2" color="text.secondary">Discount:</Typography>
              <Typography variant="body2" fontWeight={600}>৳{config.discountAmount}</Typography>
            </Box>
            {config.minOrderValue && (
              <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                <Typography variant="body2" color="text.secondary">Min Order Value:</Typography>
                <Typography variant="body2" fontWeight={600}>৳{config.minOrderValue}</Typography>
              </Box>
            )}
          </Stack>
        );

      case 'DISCOUNT_SLAB_PCT':
      case 'DISCOUNT_SLAB_AMT':
        const isPercentage = data.selectedOfferType === 'DISCOUNT_SLAB_PCT';
        return (
          <Stack spacing={1}>
            <Typography variant="body2" color="text.secondary" fontWeight={600}>
              Discount Slabs:
            </Typography>
            {config.slabs?.map((slab, index) => (
              <Box key={index} sx={{ pl: 2, py: 0.5, bgcolor: 'background.paper', borderRadius: 1 }}>
                <Typography variant="caption" display="block">
                  ৳{slab.minValue} - ৳{slab.maxValue}: {' '}
                  <strong>
                    {isPercentage 
                      ? `${slab.discountPercentage}%` 
                      : `৳${slab.discountAmount}`
                    }
                  </strong>
                </Typography>
              </Box>
            ))}
          </Stack>
        );

      case 'CASHBACK':
        return (
          <Stack spacing={1}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
              <Typography variant="body2" color="text.secondary">Cashback:</Typography>
              <Typography variant="body2" fontWeight={600}>
                {config.cashbackPercentage !== undefined 
                  ? `${config.cashbackPercentage}%` 
                  : `৳${config.cashbackAmount}`
                }
              </Typography>
            </Box>
            {config.maxCashback && (
              <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                <Typography variant="body2" color="text.secondary">Max Cashback:</Typography>
                <Typography variant="body2" fontWeight={600}>৳{config.maxCashback}</Typography>
              </Box>
            )}
          </Stack>
        );

      case 'FLASH_SALE':
        return (
          <Stack spacing={1}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
              <Typography variant="body2" color="text.secondary">Discount:</Typography>
              <Typography variant="body2" fontWeight={600}>{config.discountPercentage}%</Typography>
            </Box>
            {config.stockLimit && (
              <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                <Typography variant="body2" color="text.secondary">Stock Limit:</Typography>
                <Typography variant="body2" fontWeight={600}>{config.stockLimit} units</Typography>
              </Box>
            )}
            {config.orderLimit && (
              <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                <Typography variant="body2" color="text.secondary">Order Limit:</Typography>
                <Typography variant="body2" fontWeight={600}>{config.orderLimit} per distributor</Typography>
              </Box>
            )}
          </Stack>
        );

      case 'LOYALTY_POINTS':
        return (
          <Stack spacing={1}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
              <Typography variant="body2" color="text.secondary">Points Per Unit:</Typography>
              <Typography variant="body2" fontWeight={600}>{config.pointsPerUnit}</Typography>
            </Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
              <Typography variant="body2" color="text.secondary">Point Value:</Typography>
              <Typography variant="body2" fontWeight={600}>৳{config.pointsValue}</Typography>
            </Box>
          </Stack>
        );

      case 'VOLUME_DISCOUNT':
        return (
          <Stack spacing={1}>
            <Typography variant="body2" color="text.secondary" fontWeight={600}>
              Volume Tiers:
            </Typography>
            {config.volumeTiers?.map((tier: any, index: number) => (
              <Box key={index} sx={{ pl: 2, py: 0.5, bgcolor: 'background.paper', borderRadius: 1 }}>
                <Typography variant="caption" display="block">
                  {tier.minQuantity}+ units: {' '}
                  <strong>
                    {tier.discountPercentage !== undefined 
                      ? `${tier.discountPercentage}%` 
                      : `৳${tier.discountAmount}`
                    } off
                    {tier.maxDiscount && ` (capped at ৳${tier.maxDiscount})`}
                  </strong>
                </Typography>
              </Box>
            ))}
            {config.applyToAllProducts && (
              <Box sx={{ display: 'flex', alignItems: 'center', mt: 1 }}>
                <Typography variant="caption" color="success.main">
                  ✓ Applies to all products
                </Typography>
              </Box>
            )}
          </Stack>
        );

      case 'CROSS_CATEGORY':
        return (
          <Stack spacing={1}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
              <Typography variant="body2" color="text.secondary">Min Trigger Amount:</Typography>
              <Typography variant="body2" fontWeight={600}>৳{config.minTriggerAmount}</Typography>
            </Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
              <Typography variant="body2" color="text.secondary">Reward Discount:</Typography>
              <Typography variant="body2" fontWeight={600}>
                {config.discountPercentage !== undefined 
                  ? `${config.discountPercentage}%` 
                  : `৳${config.discountAmount}`
                }
              </Typography>
            </Box>
            {config.maxDiscountAmount && (
              <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                <Typography variant="body2" color="text.secondary">Max Discount:</Typography>
                <Typography variant="body2" fontWeight={600}>৳{config.maxDiscountAmount}</Typography>
              </Box>
            )}
          </Stack>
        );

      case 'FIRST_ORDER':
        return (
          <Stack spacing={1}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
              <Typography variant="body2" color="text.secondary">Discount:</Typography>
              <Typography variant="body2" fontWeight={600}>
                {config.discountPercentage !== undefined 
                  ? `${config.discountPercentage}%` 
                  : `৳${config.discountAmount}`
                }
              </Typography>
            </Box>
            {config.minOrderValue && (
              <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                <Typography variant="body2" color="text.secondary">Min Order Value:</Typography>
                <Typography variant="body2" fontWeight={600}>৳{config.minOrderValue}</Typography>
              </Box>
            )}
            {config.maxDiscountAmount && (
              <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                <Typography variant="body2" color="text.secondary">Max Discount:</Typography>
                <Typography variant="body2" fontWeight={600}>৳{config.maxDiscountAmount}</Typography>
              </Box>
            )}
            <Alert severity="success" sx={{ mt: 1 }}>
              <Typography variant="caption">
                Only valid for first-time orders
              </Typography>
            </Alert>
          </Stack>
        );

      default:
        return <Typography variant="body2">No configuration</Typography>;
    }
  };

  if (submitSuccess) {
    return (
      <Box sx={{ width: '100%', maxWidth: 800, mx: 'auto', p: { xs: 2, sm: 3 } }}>
        <Card elevation={2}>
          <CardContent sx={{ p: { xs: 3, sm: 4 }, textAlign: 'center' }}>
            <CheckCircleIcon sx={{ fontSize: 64, color: 'success.main', mb: 2 }} />
            <Typography variant="h5" gutterBottom fontWeight={600}>
              Offer Created Successfully!
            </Typography>
            <Typography variant="body1" color="text.secondary" mb={3}>
              Your offer "{data.offerName}" has been created and saved as draft.
            </Typography>
            <Button
              variant="contained"
              size="large"
              onClick={onSubmit}
            >
              Go to Offers List
            </Button>
          </CardContent>
        </Card>
      </Box>
    );
  }

  return (
    <Box sx={{ width: '100%', maxWidth: 1000, mx: 'auto', p: { xs: 2, sm: 3 } }}>
      <Card elevation={2}>
        <CardContent sx={{ p: { xs: 2, sm: 3 } }}>
          <Typography
            variant="h5"
            gutterBottom
            sx={{
              fontSize: { xs: '1.25rem', sm: '1.5rem' },
              fontWeight: 600,
              mb: 3
            }}
          >
            Screen 5: Review & Submit
          </Typography>

          <Alert severity="info" icon={<InfoIcon />} sx={{ mb: 3 }}>
            Please review all offer details before submitting. You can edit any section by clicking the "Edit" button.
          </Alert>

          <Stack spacing={3}>
            {/* Basic Information */}
            {renderSection(
              'Basic Information',
              <Stack spacing={1.5}>
                <Box>
                  <Typography variant="caption" color="text.secondary" display="block">
                    Offer Name
                  </Typography>
                  <Typography variant="body1" fontWeight={600}>
                    {data.offerName || 'Not set'}
                  </Typography>
                </Box>
                <Divider />
                <Box>
                  <Typography variant="caption" color="text.secondary" display="block">
                    Product Segments
                  </Typography>
                  <Box sx={{ mt: 0.5, display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                    {data.productSegments.length > 0 ? (
                      data.productSegments.map(segment => (
                        <Chip
                          key={segment}
                          label={segment}
                          size="small"
                          color={segment === 'BIS' ? 'primary' : 'secondary'}
                        />
                      ))
                    ) : (
                      <Typography variant="body2">Not selected</Typography>
                    )}
                  </Box>
                </Box>
                <Divider />
                <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
                  <Box>
                    <Typography variant="caption" color="text.secondary" display="block">
                      Start Date
                    </Typography>
                    <Typography variant="body2" fontWeight={600}>
                      {formatDate(data.startDate)}
                    </Typography>
                  </Box>
                  <Box>
                    <Typography variant="caption" color="text.secondary" display="block">
                      End Date
                    </Typography>
                    <Typography variant="body2" fontWeight={600}>
                      {formatDate(data.endDate)}
                    </Typography>
                  </Box>
                </Box>
              </Stack>,
              0
            )}

            {/* Territory & Distributor Selection */}
            {renderSection(
              'Territory & Distributor Selection',
              <Stack spacing={2}>
                <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2 }}>
                  <Paper sx={{ p: 1.5, bgcolor: 'background.paper' }}>
                    <Typography variant="caption" color="text.secondary" display="block">
                      Zones
                    </Typography>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
                      <Typography variant="h6" fontWeight={600}>
                        {getTerritoryCount('zones')}
                      </Typography>
                      <Chip
                        label={data.territories.zones.mode}
                        size="small"
                        color={data.territories.zones.mode === 'include' ? 'success' : 'error'}
                        sx={{ textTransform: 'capitalize' }}
                      />
                    </Box>
                  </Paper>
                  <Paper sx={{ p: 1.5, bgcolor: 'background.paper' }}>
                    <Typography variant="caption" color="text.secondary" display="block">
                      Regions
                    </Typography>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
                      <Typography variant="h6" fontWeight={600}>
                        {getTerritoryCount('regions')}
                      </Typography>
                      <Chip
                        label={data.territories.regions.mode}
                        size="small"
                        color={data.territories.regions.mode === 'include' ? 'success' : 'error'}
                        sx={{ textTransform: 'capitalize' }}
                      />
                    </Box>
                  </Paper>
                  <Paper sx={{ p: 1.5, bgcolor: 'background.paper' }}>
                    <Typography variant="caption" color="text.secondary" display="block">
                      Areas
                    </Typography>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
                      <Typography variant="h6" fontWeight={600}>
                        {getTerritoryCount('areas')}
                      </Typography>
                      <Chip
                        label={data.territories.areas.mode}
                        size="small"
                        color={data.territories.areas.mode === 'include' ? 'success' : 'error'}
                        sx={{ textTransform: 'capitalize' }}
                      />
                    </Box>
                  </Paper>
                  <Paper sx={{ p: 1.5, bgcolor: 'background.paper' }}>
                    <Typography variant="caption" color="text.secondary" display="block">
                      DB Points
                    </Typography>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
                      <Typography variant="h6" fontWeight={600}>
                        {getTerritoryCount('dbPoints')}
                      </Typography>
                      <Chip
                        label={data.territories.dbPoints.mode}
                        size="small"
                        color={data.territories.dbPoints.mode === 'include' ? 'success' : 'error'}
                        sx={{ textTransform: 'capitalize' }}
                      />
                    </Box>
                  </Paper>
                </Box>
                <Divider />
                <Paper sx={{ p: 1.5, bgcolor: 'background.paper' }}>
                  <Typography variant="caption" color="text.secondary" display="block">
                    Distributors
                  </Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
                    <Typography variant="h6" fontWeight={600}>
                      {getDistributorCount()}
                    </Typography>
                    <Chip
                      label={data.distributors.mode}
                      size="small"
                      color={data.distributors.mode === 'include' ? 'success' : 'error'}
                      sx={{ textTransform: 'capitalize' }}
                    />
                  </Box>
                </Paper>
              </Stack>,
              1
            )}

            {/* Offer Type */}
            {renderSection(
              'Offer Type',
              <Box>
                {offerTypeInfo ? (
                  <Box sx={{ display: 'flex', alignItems: 'start', gap: 2 }}>
                    <Box
                      sx={{
                        width: 48,
                        height: 48,
                        borderRadius: 1,
                        bgcolor: 'primary.main',
                        color: 'white',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '1.5rem'
                      }}
                    >
                      {offerTypeInfo.icon}
                    </Box>
                    <Box sx={{ flex: 1 }}>
                      <Typography variant="body1" fontWeight={600}>
                        {offerTypeInfo.name}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {offerTypeInfo.description}
                      </Typography>
                    </Box>
                  </Box>
                ) : (
                  <Typography variant="body2">No offer type selected</Typography>
                )}
              </Box>,
              2
            )}

            {/* Offer Configuration */}
            {renderSection(
              'Offer Configuration',
              <Stack spacing={2}>
                <Box>
                  <Typography variant="caption" color="text.secondary" display="block" mb={1}>
                    Selected Products
                  </Typography>
                  <Chip
                    label={`${(() => {
                      // Calculate product count based on offer type
                      const config = data.offerConfig;
                      if (config.buyProducts?.length) {
                        return config.buyProducts.length;
                      }
                      if (config.qualifierProducts?.length) {
                        return config.qualifierProducts.length + (config.rewardProducts?.length || 0);
                      }
                      if (config.skuDiscounts?.length) {
                        return config.skuDiscounts.length;
                      }
                      return config.selectedProducts?.length || 0;
                    })()} products`}
                    size="small"
                    color="primary"
                    variant="outlined"
                  />
                </Box>
                <Divider />
                {renderOfferConfigDetails()}
              </Stack>,
              3
            )}

            {/* Error Message */}
            {submitError && (
              <Alert severity="error" onClose={() => setSubmitError('')}>
                {submitError}
              </Alert>
            )}

            {/* Submit Button */}
            <Box sx={{ display: 'flex', justifyContent: 'center', pt: 2 }}>
              <Button
                variant="contained"
                size="large"
                onClick={handleSubmit}
                disabled={submitting}
                sx={{ minWidth: 200 }}
              >
                {submitting ? (
                  <>
                    <CircularProgress size={20} sx={{ mr: 1 }} color="inherit" />
                    Creating Offer...
                  </>
                ) : (
                  'Submit Offer'
                )}
              </Button>
            </Box>
          </Stack>
        </CardContent>
      </Card>
    </Box>
  );
}
