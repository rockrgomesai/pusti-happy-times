'use client';

import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Stack,
  TextField,
  FormControl,
  FormControlLabel,
  Radio,
  RadioGroup,
  Button,
  IconButton,
  Paper,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  ListItemIcon,
  Checkbox,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Chip,
  CircularProgress,
  Alert,
  Divider,
  InputAdornment,
  Pagination,
  Select,
  MenuItem
} from '@mui/material';
import { offersApi } from '@/lib/api/offers';
import type { OfferTypeCode, ProductSegment } from '@/types/offer';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import SelectAllIcon from '@mui/icons-material/SelectAll';

interface ProductGroup {
  category: {
    _id: string;
    name: string;
    product_segment: string;
  };
  products: Array<{
    _id: string;
    name: string;
    sku: string;
    product_type: string;
    unit: string;
    bangla_name?: string;
    trade_price?: number;
    db_price?: number;
    mrp?: number;
  }>;
}

interface Screen4Props {
  data: {
    selectedOfferType: OfferTypeCode | '';
    productSegments: ProductSegment[];
    offerConfig: {
      selectedProducts?: string[];
      applyToAllProducts?: boolean;
      discountPercentage?: number;
      discountAmount?: number;
      minOrderValue?: number;
      maxDiscountAmount?: number;
      slabs?: Array<{
        minValue: number;
        maxValue: number;
        discountPercentage?: number;
        discountAmount?: number;
      }>;
      buyProducts?: Array<{
        productId: string;
        quantity: number;
      }>;
      getProducts?: Array<{
        productId: string;
        quantity: number;
        discountPercentage?: number;
      }>;
      cashbackPercentage?: number;
      cashbackAmount?: number;
      maxCashback?: number;
      volumeSlabs?: Array<{
        minQuantity: number;
        maxQuantity: number;
        discountPercentage: number;
      }>;
      pointsPerUnit?: number;
      pointsValue?: number;
      stockLimit?: number;
      orderLimit?: number;
    };
  };
  onChange: (data: Partial<Screen4Props['data']>) => void;
  errors?: Record<string, string>;
}

export default function Screen4OfferConfiguration({ data, onChange, errors }: Screen4Props) {
  const [productGroups, setProductGroups] = useState<ProductGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedCategory, setExpandedCategory] = useState<string | false>(false);
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [showAllProducts, setShowAllProducts] = useState(false);

  // Load products grouped by category
  useEffect(() => {
    if (data.productSegments.length > 0) {
      loadProductGroups();
    }
  }, [data.productSegments]);

  const loadProductGroups = async () => {
    setLoading(true);
    try {
      const groups = await offersApi.getProductsGroupedByCategory(data.productSegments);
      setProductGroups(groups);
      if (groups.length > 0 && !expandedCategory) {
        setExpandedCategory(groups[0].category._id);
      }
    } catch (error) {
      console.error('Failed to load products:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateConfig = (updates: Partial<Screen4Props['data']['offerConfig']>) => {
    onChange({
      offerConfig: {
        ...data.offerConfig,
        ...updates
      }
    });
  };

  const handleProductToggle = (productId: string) => {
    const currentSelected = data.offerConfig.selectedProducts || [];
    const newSelected = currentSelected.includes(productId)
      ? currentSelected.filter(id => id !== productId)
      : [...currentSelected, productId];
    updateConfig({ selectedProducts: newSelected });
  };

  const handleSelectAllInCategory = (categoryProducts: ProductGroup['products']) => {
    const currentSelected = data.offerConfig.selectedProducts || [];
    const categoryProductIds = categoryProducts.map(p => p._id);
    const allSelected = categoryProductIds.every(id => currentSelected.includes(id));

    if (allSelected) {
      // Deselect all in this category
      updateConfig({
        selectedProducts: currentSelected.filter(id => !categoryProductIds.includes(id))
      });
    } else {
      // Select all in this category
      const newSelected = [...new Set([...currentSelected, ...categoryProductIds])];
      updateConfig({ selectedProducts: newSelected });
    }
  };

  const handleSelectAllProducts = () => {
    const allProductIds = productGroups.flatMap(group => group.products.map(p => p._id));
    const currentSelected = data.offerConfig.selectedProducts || [];
    
    if (currentSelected.length === allProductIds.length) {
      updateConfig({ selectedProducts: [] });
    } else {
      updateConfig({ selectedProducts: allProductIds });
    }
  };

  const addSlab = () => {
    const currentSlabs = data.offerConfig.slabs || [];
    updateConfig({
      slabs: [...currentSlabs, { minValue: 0, maxValue: 0, discountPercentage: 0 }]
    });
  };

  const removeSlab = (index: number) => {
    const currentSlabs = data.offerConfig.slabs || [];
    updateConfig({
      slabs: currentSlabs.filter((_, i) => i !== index)
    });
  };

  const updateSlab = (index: number, field: string, value: number) => {
    const currentSlabs = data.offerConfig.slabs || [];
    const updatedSlabs = currentSlabs.map((slab, i) =>
      i === index ? { ...slab, [field]: value } : slab
    );
    updateConfig({ slabs: updatedSlabs });
  };

  // Pagination logic
  const totalCategories = productGroups.length;
  const totalPages = Math.ceil(totalCategories / itemsPerPage);
  
  const paginatedProductGroups = showAllProducts 
    ? productGroups 
    : productGroups.slice(
        (currentPage - 1) * itemsPerPage,
        currentPage * itemsPerPage
      );

  const handlePageChange = (_event: React.ChangeEvent<unknown>, page: number) => {
    setCurrentPage(page);
    setExpandedCategory(false); // Close any open accordion when changing pages
  };

  const handleItemsPerPageChange = (event: any) => {
    setItemsPerPage(Number(event.target.value));
    setCurrentPage(1); // Reset to first page
    setExpandedCategory(false);
  };

  const toggleShowAll = () => {
    setShowAllProducts(!showAllProducts);
    setCurrentPage(1);
    setExpandedCategory(false);
  };

  // Render product selection section (common for most offer types)
  const renderProductSelection = () => (
    <Paper sx={{ p: 2, bgcolor: 'grey.50' }}>
      <Box sx={{ mb: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 1 }}>
        <Typography variant="subtitle2" fontWeight={600}>
          Select Applicable Products *
        </Typography>
        <Chip
          icon={<SelectAllIcon />}
          label={
            (data.offerConfig.selectedProducts?.length || 0) === 
            productGroups.flatMap(g => g.products).length
              ? "Deselect All"
              : "Select All"
          }
          size="small"
          color="primary"
          variant="outlined"
          onClick={handleSelectAllProducts}
          sx={{ cursor: 'pointer' }}
        />
      </Box>

      <Typography variant="caption" color="text.secondary" display="block" mb={2}>
        {data.offerConfig.selectedProducts?.length || 0} products selected out of {productGroups.flatMap(g => g.products).length} total
      </Typography>

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
          <CircularProgress size={32} />
        </Box>
      ) : productGroups.length === 0 ? (
        <Alert severity="info">
          No products found for the selected segments. Please check Screen 1.
        </Alert>
      ) : (
        <Stack spacing={2}>
          {/* Pagination Controls */}
          {totalCategories > 10 && (
            <Paper sx={{ p: 2, bgcolor: 'background.default' }}>
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems="center" justifyContent="space-between">
                <Stack direction="row" spacing={2} alignItems="center" flexWrap="wrap">
                  <FormControlLabel
                    control={
                      <Checkbox
                        checked={showAllProducts}
                        onChange={toggleShowAll}
                        size="small"
                      />
                    }
                    label={
                      <Typography variant="body2">
                        Show all categories
                      </Typography>
                    }
                  />
                  {!showAllProducts && (
                    <>
                      <Divider orientation="vertical" flexItem />
                      <Stack direction="row" spacing={1} alignItems="center">
                        <Typography variant="body2" color="text.secondary">
                          Per page:
                        </Typography>
                        <Select
                          value={itemsPerPage}
                          onChange={handleItemsPerPageChange}
                          size="small"
                          sx={{ minWidth: 70 }}
                        >
                          <MenuItem value={10}>10</MenuItem>
                          <MenuItem value={15}>15</MenuItem>
                          <MenuItem value={20}>20</MenuItem>
                        </Select>
                      </Stack>
                    </>
                  )}
                </Stack>
                
                {!showAllProducts && (
                  <Pagination
                    count={totalPages}
                    page={currentPage}
                    onChange={handlePageChange}
                    color="primary"
                    size="small"
                    showFirstButton
                    showLastButton
                  />
                )}
              </Stack>
            </Paper>
          )}

          {/* Product Categories */}
          <Stack spacing={1}>
          {paginatedProductGroups.map((group) => {
            const categoryProductIds = group.products.map(p => p._id);
            const selectedInCategory = categoryProductIds.filter(id => 
              data.offerConfig.selectedProducts?.includes(id)
            ).length;
            const allSelectedInCategory = selectedInCategory === categoryProductIds.length;

            return (
              <Accordion
                key={group.category._id}
                expanded={expandedCategory === group.category._id}
                onChange={(_, isExpanded) => setExpandedCategory(isExpanded ? group.category._id : false)}
                sx={{ '&:before': { display: 'none' } }}
              >
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, width: '100%' }}>
                    <Typography variant="body2" fontWeight={500} sx={{ flex: 1 }}>
                      {group.category.name}
                    </Typography>
                    <Chip 
                      label={`${selectedInCategory}/${group.products.length}`}
                      size="small"
                      color={allSelectedInCategory ? "success" : "default"}
                      sx={{ fontSize: '0.7rem' }}
                    />
                    <Chip
                      label={group.category.product_segment}
                      size="small"
                      color={group.category.product_segment === 'BIS' ? 'primary' : 'secondary'}
                      sx={{ fontSize: '0.7rem' }}
                    />
                  </Box>
                </AccordionSummary>
                <AccordionDetails sx={{ pt: 0 }}>
                  <Stack spacing={0.5}>
                    <Button
                      size="small"
                      variant="text"
                      startIcon={<CheckCircleIcon />}
                      onClick={() => handleSelectAllInCategory(group.products)}
                      sx={{ alignSelf: 'flex-start', mb: 1 }}
                    >
                      {allSelectedInCategory ? 'Deselect All' : 'Select All'} in {group.category.name}
                    </Button>
                    <List dense sx={{ bgcolor: 'background.paper', borderRadius: 1 }}>
                      {group.products.map((product) => (
                        <ListItem key={product._id} disablePadding>
                          <ListItemButton onClick={() => handleProductToggle(product._id)} dense>
                            <ListItemIcon sx={{ minWidth: 36 }}>
                              <Checkbox
                                edge="start"
                                checked={data.offerConfig.selectedProducts?.includes(product._id) || false}
                                tabIndex={-1}
                                disableRipple
                              />
                            </ListItemIcon>
                            <ListItemText
                              primary={product.sku}
                              secondary={`${product.unit}${product.bangla_name ? ` • ${product.bangla_name}` : ''}${product.db_price ? ` • ৳${product.db_price}` : ''}`}
                              primaryTypographyProps={{ fontSize: '0.875rem', fontWeight: 500 }}
                              secondaryTypographyProps={{ fontSize: '0.75rem' }}
                            />
                          </ListItemButton>
                        </ListItem>
                      ))}
                    </List>
                  </Stack>
                </AccordionDetails>
              </Accordion>
            );
          })}
          </Stack>

          {/* Bottom Pagination Controls (only if paginated) */}
          {!showAllProducts && totalCategories > 10 && (
            <Box sx={{ display: 'flex', justifyContent: 'center', pt: 2 }}>
              <Pagination
                count={totalPages}
                page={currentPage}
                onChange={handlePageChange}
                color="primary"
                size="medium"
                showFirstButton
                showLastButton
              />
            </Box>
          )}

          {errors?.selectedProducts && (
            <Alert severity="error">
              {errors.selectedProducts}
            </Alert>
          )}
        </Stack>
      )}
    </Paper>
  );

  // Render configuration based on offer type
  const renderOfferTypeConfig = () => {
    switch (data.selectedOfferType) {
      case 'FLAT_DISCOUNT_PCT':
        return (
          <Stack spacing={3}>
            {renderProductSelection()}
            <Paper sx={{ p: 2 }}>
              <Typography variant="subtitle2" fontWeight={600} mb={2}>
                Discount Configuration
              </Typography>
              <Stack spacing={2}>
                <TextField
                  fullWidth
                  type="number"
                  label="Discount Percentage *"
                  value={data.offerConfig.discountPercentage ?? ''}
                  onChange={(e) => updateConfig({ discountPercentage: parseFloat(e.target.value) })}
                  InputProps={{
                    endAdornment: <InputAdornment position="end">%</InputAdornment>,
                  }}
                  inputProps={{ min: 0, max: 100, step: 0.01 }}
                  error={!!errors?.discountPercentage}
                  helperText={errors?.discountPercentage}
                />
                <TextField
                  fullWidth
                  type="number"
                  label="Minimum Order Value"
                  value={data.offerConfig.minOrderValue ?? ''}
                  onChange={(e) => updateConfig({ minOrderValue: parseFloat(e.target.value) })}
                  InputProps={{
                    startAdornment: <InputAdornment position="start">৳</InputAdornment>,
                  }}
                  inputProps={{ min: 0, step: 0.01 }}
                  helperText="Optional: Minimum order value to apply discount"
                />
                <TextField
                  fullWidth
                  type="number"
                  label="Maximum Discount Amount"
                  value={data.offerConfig.maxDiscountAmount ?? ''}
                  onChange={(e) => updateConfig({ maxDiscountAmount: parseFloat(e.target.value) })}
                  InputProps={{
                    startAdornment: <InputAdornment position="start">৳</InputAdornment>,
                  }}
                  inputProps={{ min: 0, step: 0.01 }}
                  helperText="Optional: Cap the maximum discount amount"
                />
              </Stack>
            </Paper>
          </Stack>
        );

      case 'FLAT_DISCOUNT_AMT':
        return (
          <Stack spacing={3}>
            {renderProductSelection()}
            <Paper sx={{ p: 2 }}>
              <Typography variant="subtitle2" fontWeight={600} mb={2}>
                Discount Configuration
              </Typography>
              <Stack spacing={2}>
                <TextField
                  fullWidth
                  type="number"
                  label="Discount Amount *"
                  value={data.offerConfig.discountAmount ?? ''}
                  onChange={(e) => updateConfig({ discountAmount: parseFloat(e.target.value) })}
                  InputProps={{
                    startAdornment: <InputAdornment position="start">৳</InputAdornment>,
                  }}
                  inputProps={{ min: 0, step: 0.01 }}
                  error={!!errors?.discountAmount}
                  helperText={errors?.discountAmount}
                />
                <TextField
                  fullWidth
                  type="number"
                  label="Minimum Order Value"
                  value={data.offerConfig.minOrderValue ?? ''}
                  onChange={(e) => updateConfig({ minOrderValue: parseFloat(e.target.value) })}
                  InputProps={{
                    startAdornment: <InputAdornment position="start">৳</InputAdornment>,
                  }}
                  inputProps={{ min: 0, step: 0.01 }}
                  helperText="Optional: Minimum order value to apply discount"
                />
              </Stack>
            </Paper>
          </Stack>
        );

      case 'DISCOUNT_SLAB_PCT':
      case 'DISCOUNT_SLAB_AMT':
        const isPercentage = data.selectedOfferType === 'DISCOUNT_SLAB_PCT';
        return (
          <Stack spacing={3}>
            {renderProductSelection()}
            <Paper sx={{ p: 2 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="subtitle2" fontWeight={600}>
                  Discount Slabs *
                </Typography>
                <Button
                  size="small"
                  startIcon={<AddIcon />}
                  onClick={addSlab}
                  variant="outlined"
                >
                  Add Slab
                </Button>
              </Box>

              {(data.offerConfig.slabs?.length || 0) === 0 ? (
                <Alert severity="info">
                  Click "Add Slab" to create discount tiers based on order value.
                </Alert>
              ) : (
                <Stack spacing={2}>
                  {data.offerConfig.slabs?.map((slab, index) => (
                    <Paper key={index} sx={{ p: 2, bgcolor: 'background.default' }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                        <Typography variant="caption" fontWeight={600}>
                          Slab {index + 1}
                        </Typography>
                        <IconButton
                          size="small"
                          onClick={() => removeSlab(index)}
                          color="error"
                        >
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </Box>
                      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                        <TextField
                          size="small"
                          type="number"
                          label="Min Value"
                          value={slab.minValue}
                          onChange={(e) => updateSlab(index, 'minValue', parseFloat(e.target.value))}
                          InputProps={{
                            startAdornment: <InputAdornment position="start">৳</InputAdornment>,
                          }}
                          inputProps={{ min: 0, step: 0.01 }}
                          fullWidth
                        />
                        <TextField
                          size="small"
                          type="number"
                          label="Max Value"
                          value={slab.maxValue}
                          onChange={(e) => updateSlab(index, 'maxValue', parseFloat(e.target.value))}
                          InputProps={{
                            startAdornment: <InputAdornment position="start">৳</InputAdornment>,
                          }}
                          inputProps={{ min: 0, step: 0.01 }}
                          fullWidth
                        />
                        <TextField
                          size="small"
                          type="number"
                          label={isPercentage ? "Discount %" : "Discount Amount"}
                          value={isPercentage ? slab.discountPercentage || '' : slab.discountAmount || ''}
                          onChange={(e) => updateSlab(
                            index,
                            isPercentage ? 'discountPercentage' : 'discountAmount',
                            parseFloat(e.target.value)
                          )}
                          InputProps={{
                            startAdornment: !isPercentage ? <InputAdornment position="start">৳</InputAdornment> : undefined,
                            endAdornment: isPercentage ? <InputAdornment position="end">%</InputAdornment> : undefined,
                          }}
                          inputProps={{ min: 0, step: 0.01, max: isPercentage ? 100 : undefined }}
                          fullWidth
                        />
                      </Stack>
                    </Paper>
                  ))}
                </Stack>
              )}
            </Paper>
          </Stack>
        );

      case 'CASHBACK':
        return (
          <Stack spacing={3}>
            {renderProductSelection()}
            <Paper sx={{ p: 2 }}>
              <Typography variant="subtitle2" fontWeight={600} mb={2}>
                Cashback Configuration
              </Typography>
              <Stack spacing={2}>
                <FormControl>
                  <RadioGroup
                    value={data.offerConfig.cashbackPercentage ? 'percentage' : 'amount'}
                    onChange={(e) => {
                      if (e.target.value === 'percentage') {
                        updateConfig({ cashbackPercentage: 0, cashbackAmount: undefined });
                      } else {
                        updateConfig({ cashbackAmount: 0, cashbackPercentage: undefined });
                      }
                    }}
                  >
                    <FormControlLabel value="percentage" control={<Radio />} label="Percentage Cashback" />
                    <FormControlLabel value="amount" control={<Radio />} label="Fixed Amount Cashback" />
                  </RadioGroup>
                </FormControl>

                {data.offerConfig.cashbackPercentage !== undefined ? (
                  <TextField
                    fullWidth
                    type="number"
                    label="Cashback Percentage *"
                    value={data.offerConfig.cashbackPercentage}
                    onChange={(e) => updateConfig({ cashbackPercentage: parseFloat(e.target.value) })}
                    InputProps={{
                      endAdornment: <InputAdornment position="end">%</InputAdornment>,
                    }}
                    inputProps={{ min: 0, max: 100, step: 0.01 }}
                  />
                ) : (
                  <TextField
                    fullWidth
                    type="number"
                    label="Cashback Amount *"
                    value={data.offerConfig.cashbackAmount ?? ''}
                    onChange={(e) => updateConfig({ cashbackAmount: parseFloat(e.target.value) })}
                    InputProps={{
                      startAdornment: <InputAdornment position="start">৳</InputAdornment>,
                    }}
                    inputProps={{ min: 0, step: 0.01 }}
                  />
                )}

                <TextField
                  fullWidth
                  type="number"
                  label="Maximum Cashback"
                  value={data.offerConfig.maxCashback ?? ''}
                  onChange={(e) => updateConfig({ maxCashback: parseFloat(e.target.value) })}
                  InputProps={{
                    startAdornment: <InputAdornment position="start">৳</InputAdornment>,
                  }}
                  inputProps={{ min: 0, step: 0.01 }}
                  helperText="Optional: Cap the maximum cashback amount"
                />
              </Stack>
            </Paper>
          </Stack>
        );

      case 'FLASH_SALE':
        return (
          <Stack spacing={3}>
            {renderProductSelection()}
            <Paper sx={{ p: 2 }}>
              <Typography variant="subtitle2" fontWeight={600} mb={2}>
                Flash Sale Configuration
              </Typography>
              <Stack spacing={2}>
                <TextField
                  fullWidth
                  type="number"
                  label="Discount Percentage *"
                  value={data.offerConfig.discountPercentage ?? ''}
                  onChange={(e) => updateConfig({ discountPercentage: parseFloat(e.target.value) })}
                  InputProps={{
                    endAdornment: <InputAdornment position="end">%</InputAdornment>,
                  }}
                  inputProps={{ min: 0, max: 100, step: 0.01 }}
                  error={!!errors?.discountPercentage}
                  helperText={errors?.discountPercentage}
                />
                <TextField
                  fullWidth
                  type="number"
                  label="Stock Limit"
                  value={data.offerConfig.stockLimit ?? ''}
                  onChange={(e) => updateConfig({ stockLimit: parseInt(e.target.value) })}
                  inputProps={{ min: 0, step: 1 }}
                  helperText="Optional: Total stock available for this flash sale"
                />
                <TextField
                  fullWidth
                  type="number"
                  label="Order Limit Per Distributor"
                  value={data.offerConfig.orderLimit ?? ''}
                  onChange={(e) => updateConfig({ orderLimit: parseInt(e.target.value) })}
                  inputProps={{ min: 0, step: 1 }}
                  helperText="Optional: Maximum orders per distributor"
                />
              </Stack>
            </Paper>
          </Stack>
        );

      case 'LOYALTY_POINTS':
        return (
          <Stack spacing={3}>
            {renderProductSelection()}
            <Paper sx={{ p: 2 }}>
              <Typography variant="subtitle2" fontWeight={600} mb={2}>
                Loyalty Points Configuration
              </Typography>
              <Stack spacing={2}>
                <TextField
                  fullWidth
                  type="number"
                  label="Points Per Unit *"
                  value={data.offerConfig.pointsPerUnit ?? ''}
                  onChange={(e) => updateConfig({ pointsPerUnit: parseFloat(e.target.value) })}
                  inputProps={{ min: 0, step: 0.01 }}
                  helperText="Points earned per unit purchased"
                  error={!!errors?.pointsPerUnit}
                />
                <TextField
                  fullWidth
                  type="number"
                  label="Point Value *"
                  value={data.offerConfig.pointsValue ?? ''}
                  onChange={(e) => updateConfig({ pointsValue: parseFloat(e.target.value) })}
                  InputProps={{
                    startAdornment: <InputAdornment position="start">৳</InputAdornment>,
                  }}
                  inputProps={{ min: 0, step: 0.01 }}
                  helperText="How much 1 point is worth in currency"
                  error={!!errors?.pointsValue}
                />
              </Stack>
            </Paper>
          </Stack>
        );

      default:
        return (
          <Alert severity="info">
            Please select an offer type in Screen 3 to configure offer parameters.
          </Alert>
        );
    }
  };

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
            Screen 4: Configure Offer Parameters
          </Typography>

          {!data.selectedOfferType ? (
            <Alert severity="warning">
              Please select an offer type in Screen 3 to continue.
            </Alert>
          ) : (
            <Stack spacing={3}>
              <Alert severity="info" icon={false}>
                <Typography variant="subtitle2" fontWeight={600} gutterBottom>
                  {data.selectedOfferType.replace(/_/g, ' ')}
                </Typography>
                <Typography variant="body2">
                  Configure the parameters for this offer type.
                </Typography>
              </Alert>

              {renderOfferTypeConfig()}
            </Stack>
          )}
        </CardContent>
      </Card>
    </Box>
  );
}
