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
        isPromotionalGift?: boolean;
      }>;
      bundlePrice?: number;
      buyQuantity?: number;
      getQuantity?: number;
      qualifierProducts?: Array<{
        productId: string;
        minQuantity: number;
      }>;
      rewardProducts?: Array<{
        productId: string;
        freeQuantity: number;
        maxValueCap?: number;
      }>;
      qualifierLogic?: 'AND' | 'OR';
      distributionMode?: 'all' | 'choice';
      allowRepetition?: boolean;
      maxRewardSets?: number;
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

  // FREE_PRODUCT handlers
  const handleAddBuyProduct = (productId: string) => {
    const buyProducts = data.offerConfig.buyProducts || [];
    if (!buyProducts.some(bp => bp.productId === productId)) {
      updateConfig({
        buyProducts: [...buyProducts, { productId, quantity: 1 }]
      });
      setExpandedCategory(false);
    }
  };

  const handleAddGetProduct = (productId: string) => {
    const getProducts = data.offerConfig.getProducts || [];
    if (!getProducts.some(gp => gp.productId === productId)) {
      updateConfig({
        getProducts: [...getProducts, { productId, quantity: 1, discountPercentage: 100 }]
      });
      setExpandedCategory(false);
    }
  };

  // BOGO Different SKU handlers
  const handleAddQualifierProduct = (productId: string) => {
    const qualifiers = data.offerConfig.qualifierProducts || [];
    if (!qualifiers.some(q => q.productId === productId)) {
      updateConfig({
        qualifierProducts: [...qualifiers, { productId, minQuantity: 1 }]
      });
      setExpandedCategory(false);
    }
  };

  const handleAddRewardProduct = (productId: string) => {
    const rewards = data.offerConfig.rewardProducts || [];
    if (!rewards.some(r => r.productId === productId)) {
      updateConfig({
        rewardProducts: [...rewards, { productId, freeQuantity: 1 }]
      });
      setExpandedCategory(false);
    }
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
                      {group.products.map((product) => {
                        // Check if this product is already added
                        const isQualifier = data.offerConfig.qualifierProducts?.some(q => q.productId === product._id);
                        const isReward = data.offerConfig.rewardProducts?.some(r => r.productId === product._id);
                        const isBuyProduct = data.offerConfig.buyProducts?.some(bp => bp.productId === product._id);
                        const isGetProduct = data.offerConfig.getProducts?.some(gp => gp.productId === product._id);
                        
                        return (
                          <ListItem 
                            key={product._id} 
                            disablePadding
                            secondaryAction={
                              data.selectedOfferType === 'BUNDLE_OFFER' ? (
                                <Button
                                  size="small"
                                  variant={isBuyProduct ? "contained" : "outlined"}
                                  color={isBuyProduct ? "success" : "primary"}
                                  onClick={() => handleAddBuyProduct(product._id)}
                                  disabled={isBuyProduct}
                                  sx={{ fontSize: '0.7rem', minWidth: 100 }}
                                >
                                  {isBuyProduct ? '✓ In Bundle' : 'Add to Bundle'}
                                </Button>
                              ) : data.selectedOfferType === 'FREE_PRODUCT' ? (
                                <Stack direction="row" spacing={1}>
                                  <Button
                                    size="small"
                                    variant={isBuyProduct ? "contained" : "outlined"}
                                    color={isBuyProduct ? "success" : "primary"}
                                    onClick={() => handleAddBuyProduct(product._id)}
                                    disabled={isBuyProduct}
                                    sx={{ fontSize: '0.7rem', minWidth: 80 }}
                                  >
                                    {isBuyProduct ? '✓ Buy' : 'Buy'}
                                  </Button>
                                  <Button
                                    size="small"
                                    variant={isGetProduct ? "contained" : "outlined"}
                                    color={isGetProduct ? "success" : "secondary"}
                                    onClick={() => handleAddGetProduct(product._id)}
                                    disabled={isGetProduct}
                                    sx={{ fontSize: '0.7rem', minWidth: 80 }}
                                  >
                                    {isGetProduct ? '✓ Get' : 'Get'}
                                  </Button>
                                </Stack>
                              ) : data.selectedOfferType === 'BOGO' ? (
                                <Button
                                  size="small"
                                  variant={isBuyProduct ? "contained" : "outlined"}
                                  color={isBuyProduct ? "success" : "primary"}
                                  onClick={() => handleAddBuyProduct(product._id)}
                                  disabled={isBuyProduct}
                                  sx={{ fontSize: '0.7rem', minWidth: 100 }}
                                >
                                  {isBuyProduct ? '✓ Selected' : 'Add to BOGO'}
                                </Button>
                              ) : data.selectedOfferType === 'BOGO_DIFFERENT_SKU' ? (
                                <Stack direction="row" spacing={1}>
                                  <Button
                                    size="small"
                                    variant={isQualifier ? "contained" : "outlined"}
                                    color={isQualifier ? "success" : "primary"}
                                    onClick={() => handleAddQualifierProduct(product._id)}
                                    disabled={isQualifier}
                                    sx={{ fontSize: '0.7rem', minWidth: 80 }}
                                  >
                                    {isQualifier ? '✓ Qualifier' : 'Buy'}
                                  </Button>
                                  <Button
                                    size="small"
                                    variant={isReward ? "contained" : "outlined"}
                                    color={isReward ? "success" : "secondary"}
                                    onClick={() => handleAddRewardProduct(product._id)}
                                    disabled={isReward}
                                    sx={{ fontSize: '0.7rem', minWidth: 80 }}
                                  >
                                    {isReward ? '✓ Reward' : 'Get'}
                                  </Button>
                                </Stack>
                              ) : null
                            }
                          >
                            {!['BUNDLE_OFFER', 'FREE_PRODUCT', 'BOGO', 'BOGO_DIFFERENT_SKU'].includes(data.selectedOfferType || '') && (
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
                            )}
                            {['BUNDLE_OFFER', 'FREE_PRODUCT', 'BOGO', 'BOGO_DIFFERENT_SKU'].includes(data.selectedOfferType || '') && (
                              <Box sx={{ py: 1, px: 2, width: '100%' }}>
                                <ListItemText
                                  primary={product.sku}
                                  secondary={`${product.unit}${product.bangla_name ? ` • ${product.bangla_name}` : ''}${product.db_price ? ` • ৳${product.db_price}` : ''}`}
                                  primaryTypographyProps={{ fontSize: '0.875rem', fontWeight: 500 }}
                                  secondaryTypographyProps={{ fontSize: '0.75rem' }}
                                />
                              </Box>
                            )}
                          </ListItem>
                        );
                      })}
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

      case 'FREE_PRODUCT':
        return (
          <Stack spacing={3}>
            <Paper sx={{ p: 2 }}>
              <Typography variant="subtitle2" fontWeight={600} mb={2}>
                Buy Products (Requirements) *
              </Typography>
              <Typography variant="body2" color="text.secondary" mb={2}>
                Products customer must buy to qualify for free items
              </Typography>
              
              <Stack spacing={2} mb={2}>
                {(data.offerConfig.buyProducts || []).map((buyProduct, index) => {
                  const product = productGroups
                    .flatMap(g => g.products)
                    .find(p => p._id === buyProduct.productId);
                  
                  return (
                    <Paper key={index} sx={{ p: 2, bgcolor: 'background.default' }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                        <Typography variant="caption" fontWeight={600}>
                          Buy Product {index + 1}
                        </Typography>
                        <IconButton
                          size="small"
                          onClick={() => {
                            const updated = [...(data.offerConfig.buyProducts || [])];
                            updated.splice(index, 1);
                            updateConfig({ buyProducts: updated });
                          }}
                          color="error"
                        >
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </Box>
                      
                      {product && (
                        <Typography variant="body2" sx={{ mb: 1, fontWeight: 500 }}>
                          {product.sku} - {product.bangla_name || product.name}
                        </Typography>
                      )}
                      
                      <TextField
                        size="small"
                        type="number"
                        label="Required Quantity *"
                        value={buyProduct.quantity}
                        onChange={(e) => {
                          const updated = [...(data.offerConfig.buyProducts || [])];
                          updated[index].quantity = parseInt(e.target.value) || 1;
                          updateConfig({ buyProducts: updated });
                        }}
                        inputProps={{ min: 1, step: 1 }}
                        fullWidth
                      />
                    </Paper>
                  );
                })}
              </Stack>

              <Button
                startIcon={<AddIcon />}
                onClick={() => setExpandedCategory(productGroups[0]?.category._id || false)}
                variant="outlined"
                fullWidth
              >
                Add Buy Product
              </Button>
            </Paper>

            <Paper sx={{ p: 2 }}>
              <Typography variant="subtitle2" fontWeight={600} mb={2}>
                Get Products (Free Items) *
              </Typography>
              <Typography variant="body2" color="text.secondary" mb={2}>
                Products given free or discounted when buy requirements are met
              </Typography>
              
              <Stack spacing={2} mb={2}>
                {(data.offerConfig.getProducts || []).map((getProduct, index) => {
                  const product = productGroups
                    .flatMap(g => g.products)
                    .find(p => p._id === getProduct.productId);
                  
                  return (
                    <Paper key={index} sx={{ p: 2, bgcolor: 'background.default' }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                        <Typography variant="caption" fontWeight={600}>
                          Free Product {index + 1}
                        </Typography>
                        <IconButton
                          size="small"
                          onClick={() => {
                            const updated = [...(data.offerConfig.getProducts || [])];
                            updated.splice(index, 1);
                            updateConfig({ getProducts: updated });
                          }}
                          color="error"
                        >
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </Box>
                      
                      {product && (
                        <Box sx={{ mb: 1 }}>
                          <Typography variant="body2" sx={{ fontWeight: 500 }}>
                            {product.sku} - {product.bangla_name || product.name}
                          </Typography>
                          <Box sx={{ display: 'flex', gap: 1, mt: 0.5 }}>
                            <Chip 
                              label={`৳${product.db_price || product.trade_price || 0}`} 
                              size="small"
                            />
                            {product.product_type && (
                              <Chip 
                                label={product.product_type}
                                size="small"
                                color={product.product_type === 'PROCURED' ? 'secondary' : 'default'}
                              />
                            )}
                          </Box>
                        </Box>
                      )}
                      
                      <Stack spacing={2}>
                        <TextField
                          size="small"
                          type="number"
                          label="Free Quantity *"
                          value={getProduct.quantity}
                          onChange={(e) => {
                            const updated = [...(data.offerConfig.getProducts || [])];
                            updated[index].quantity = parseInt(e.target.value) || 1;
                            updateConfig({ getProducts: updated });
                          }}
                          inputProps={{ min: 1, step: 1 }}
                          fullWidth
                        />
                        
                        <FormControlLabel
                          control={
                            <Checkbox
                              checked={getProduct.isPromotionalGift || false}
                              onChange={(e) => {
                                const updated = [...(data.offerConfig.getProducts || [])];
                                updated[index].isPromotionalGift = e.target.checked;
                                // If promotional gift, force discount to 100%
                                if (e.target.checked) {
                                  updated[index].discountPercentage = 100;
                                }
                                updateConfig({ getProducts: updated });
                              }}
                            />
                          }
                          label={
                            <Box>
                              <Typography variant="body2" fontWeight={500}>Promotional Gift</Typography>
                              <Typography variant="caption" color="text.secondary">
                                Item added to cart as free gift (displayed at ৳0)
                              </Typography>
                            </Box>
                          }
                        />
                        
                        {!getProduct.isPromotionalGift && (
                          <TextField
                            size="small"
                            type="number"
                            label="Discount Percentage (Optional)"
                            value={getProduct.discountPercentage ?? 100}
                            onChange={(e) => {
                              const updated = [...(data.offerConfig.getProducts || [])];
                              updated[index].discountPercentage = parseFloat(e.target.value) || 100;
                              updateConfig({ getProducts: updated });
                            }}
                            InputProps={{
                              endAdornment: <InputAdornment position="end">%</InputAdornment>,
                            }}
                            inputProps={{ min: 0, max: 100, step: 1 }}
                            helperText="100% = Fully free, less = Partial discount"
                            fullWidth
                          />
                        )}
                      </Stack>
                    </Paper>
                  );
                })}
              </Stack>

              <Button
                startIcon={<AddIcon />}
                onClick={() => setExpandedCategory(productGroups[0]?.category._id || false)}
                variant="outlined"
                fullWidth
              >
                Add Free Product
              </Button>
            </Paper>
          </Stack>
        );

      case 'BUNDLE_OFFER':
        return (
          <Stack spacing={3}>
            <Paper sx={{ p: 2 }}>
              <Typography variant="subtitle2" fontWeight={600} mb={2}>
                Bundle Products *
              </Typography>
              <Typography variant="body2" color="text.secondary" mb={2}>
                Products that must be purchased together as a bundle
              </Typography>
              
              <Stack spacing={2} mb={2}>
                {(data.offerConfig.buyProducts || []).map((bundleProduct, index) => {
                  const product = productGroups
                    .flatMap(g => g.products)
                    .find(p => p._id === bundleProduct.productId);
                  
                  return (
                    <Paper key={index} sx={{ p: 2, bgcolor: 'background.default' }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                        <Typography variant="caption" fontWeight={600}>
                          Bundle Product {index + 1}
                        </Typography>
                        <IconButton
                          size="small"
                          onClick={() => {
                            const updated = [...(data.offerConfig.buyProducts || [])];
                            updated.splice(index, 1);
                            updateConfig({ buyProducts: updated });
                          }}
                          color="error"
                        >
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </Box>
                      
                      {product && (
                        <Typography variant="body2" sx={{ mb: 1, fontWeight: 500 }}>
                          {product.sku} - {product.bangla_name || product.name}
                          <Chip 
                            label={`৳${product.db_price || product.trade_price || 0}`} 
                            size="small" 
                            sx={{ ml: 1 }}
                          />
                        </Typography>
                      )}
                      
                      <TextField
                        size="small"
                        type="number"
                        label="Quantity in Bundle *"
                        value={bundleProduct.quantity}
                        onChange={(e) => {
                          const updated = [...(data.offerConfig.buyProducts || [])];
                          updated[index].quantity = parseInt(e.target.value) || 1;
                          updateConfig({ buyProducts: updated });
                        }}
                        inputProps={{ min: 1, step: 1 }}
                        fullWidth
                      />
                    </Paper>
                  );
                })}
              </Stack>

              <Button
                startIcon={<AddIcon />}
                onClick={() => setExpandedCategory(productGroups[0]?.category._id || false)}
                variant="outlined"
                fullWidth
              >
                Add Bundle Product
              </Button>
            </Paper>

            <Paper sx={{ p: 2 }}>
              <Typography variant="subtitle2" fontWeight={600} mb={2}>
                Bundle Pricing
              </Typography>
              
              <FormControl component="fieldset" sx={{ mb: 2 }}>
                <Typography variant="body2" color="text.secondary" mb={1}>
                  Choose how to price this bundle
                </Typography>
                <RadioGroup
                  value={data.offerConfig.bundlePrice ? 'fixed' : 'percentage'}
                  onChange={(e) => {
                    if (e.target.value === 'fixed') {
                      updateConfig({ bundlePrice: 0, discountPercentage: undefined });
                    } else {
                      updateConfig({ bundlePrice: undefined, discountPercentage: 0 });
                    }
                  }}
                >
                  <FormControlLabel
                    value="fixed"
                    control={<Radio />}
                    label={
                      <Box>
                        <Typography variant="body2" fontWeight={500}>Fixed Bundle Price</Typography>
                        <Typography variant="caption" color="text.secondary">
                          Set a specific price for the entire bundle
                        </Typography>
                      </Box>
                    }
                  />
                  <FormControlLabel
                    value="percentage"
                    control={<Radio />}
                    label={
                      <Box>
                        <Typography variant="body2" fontWeight={500}>Percentage Discount</Typography>
                        <Typography variant="caption" color="text.secondary">
                          Apply a percentage discount on bundle total
                        </Typography>
                      </Box>
                    }
                  />
                </RadioGroup>
              </FormControl>

              {data.offerConfig.bundlePrice !== undefined ? (
                <TextField
                  fullWidth
                  type="number"
                  label="Bundle Price *"
                  value={data.offerConfig.bundlePrice ?? ''}
                  onChange={(e) => updateConfig({ bundlePrice: parseFloat(e.target.value) })}
                  InputProps={{
                    startAdornment: <InputAdornment position="start">৳</InputAdornment>,
                  }}
                  inputProps={{ min: 0, step: 0.01 }}
                  helperText="Fixed price for the entire bundle"
                  error={!!errors?.bundlePrice}
                />
              ) : (
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
                  helperText="Percentage discount on bundle total value"
                  error={!!errors?.discountPercentage}
                />
              )}
            </Paper>
          </Stack>
        );

      case 'BOGO':
        return (
          <Stack spacing={3}>
            <Paper sx={{ p: 2 }}>
              <Typography variant="subtitle2" fontWeight={600} mb={2}>
                BOGO Configuration
              </Typography>
              <Typography variant="body2" color="text.secondary" mb={2}>
                Buy One Get One - customers buy the same product and get some free or discounted
              </Typography>
              
              <Stack spacing={2}>
                <TextField
                  fullWidth
                  type="number"
                  label="Buy Quantity *"
                  value={data.offerConfig.buyQuantity ?? 1}
                  onChange={(e) => updateConfig({ buyQuantity: parseInt(e.target.value) || 1 })}
                  inputProps={{ min: 1, step: 1 }}
                  helperText="How many items customer must buy"
                  error={!!errors?.buyQuantity}
                />
                
                <TextField
                  fullWidth
                  type="number"
                  label="Get Quantity *"
                  value={data.offerConfig.getQuantity ?? 1}
                  onChange={(e) => updateConfig({ getQuantity: parseInt(e.target.value) || 1 })}
                  inputProps={{ min: 1, step: 1 }}
                  helperText="How many items customer gets free or discounted"
                  error={!!errors?.getQuantity}
                />

                <TextField
                  fullWidth
                  type="number"
                  label="Discount Percentage *"
                  value={data.offerConfig.discountPercentage ?? 100}
                  onChange={(e) => updateConfig({ discountPercentage: parseFloat(e.target.value) || 100 })}
                  InputProps={{
                    endAdornment: <InputAdornment position="end">%</InputAdornment>,
                  }}
                  inputProps={{ min: 0, max: 100, step: 0.01 }}
                  helperText="100% = fully free, less = partial discount (e.g., 50% = half price)"
                  error={!!errors?.discountPercentage}
                />

                <Alert severity="info">
                  <Typography variant="body2">
                    <strong>Example:</strong> Buy {data.offerConfig.buyQuantity || 1} Get {data.offerConfig.getQuantity || 1} 
                    {data.offerConfig.discountPercentage === 100 ? ' Free' : ` at ${data.offerConfig.discountPercentage || 100}% off`}
                  </Typography>
                  <Typography variant="caption" display="block" mt={1}>
                    If a customer buys {((data.offerConfig.buyQuantity || 1) + (data.offerConfig.getQuantity || 1)) * 2} items, 
                    they pay for {(data.offerConfig.buyQuantity || 1) * 2} and get {(data.offerConfig.getQuantity || 1) * 2} 
                    {data.offerConfig.discountPercentage === 100 ? ' free' : ` at ${data.offerConfig.discountPercentage || 100}% off`}.
                  </Typography>
                </Alert>
              </Stack>
            </Paper>

            <Paper sx={{ p: 2 }}>
              <Typography variant="subtitle2" fontWeight={600} mb={2}>
                Applicable Products *
              </Typography>
              <Typography variant="body2" color="text.secondary" mb={2}>
                Select which products this BOGO applies to. Leave empty to apply to all products.
              </Typography>
              
              <Stack spacing={2} mb={2}>
                {(data.offerConfig.buyProducts || []).map((bogoProduct, index) => {
                  const product = productGroups
                    .flatMap(g => g.products)
                    .find(p => p._id === bogoProduct.productId);
                  
                  return (
                    <Paper key={index} sx={{ p: 2, bgcolor: 'background.default' }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Box>
                          <Typography variant="caption" fontWeight={600}>
                            Product {index + 1}
                          </Typography>
                          {product && (
                            <Typography variant="body2" sx={{ fontWeight: 500 }}>
                              {product.sku} - {product.bangla_name || product.name}
                            </Typography>
                          )}
                        </Box>
                        <IconButton
                          size="small"
                          onClick={() => {
                            const updated = [...(data.offerConfig.buyProducts || [])];
                            updated.splice(index, 1);
                            updateConfig({ buyProducts: updated });
                          }}
                          color="error"
                        >
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </Box>
                    </Paper>
                  );
                })}
              </Stack>

              <Button
                startIcon={<AddIcon />}
                onClick={() => setExpandedCategory(productGroups[0]?.category._id || false)}
                variant="outlined"
                fullWidth
              >
                Add Product
              </Button>
            </Paper>
          </Stack>
        );

      case 'BOGO_DIFFERENT_SKU':
        return (
          <Stack spacing={3}>
            <Paper sx={{ p: 2 }}>
              <Typography variant="subtitle2" fontWeight={600} mb={2}>
                Qualifier Products (Buy These) *
              </Typography>
              <Typography variant="body2" color="text.secondary" mb={2}>
                Products that customers must buy to qualify for rewards
              </Typography>
              
              <Stack spacing={2} mb={2}>
                {(data.offerConfig.qualifierProducts || []).map((qualifier, index) => {
                  const product = productGroups
                    .flatMap(g => g.products)
                    .find(p => p._id === qualifier.productId);
                  
                  return (
                    <Paper key={index} sx={{ p: 2, bgcolor: 'background.default' }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                        <Typography variant="caption" fontWeight={600}>
                          Qualifier {index + 1}
                        </Typography>
                        <IconButton
                          size="small"
                          onClick={() => {
                            const updated = [...(data.offerConfig.qualifierProducts || [])];
                            updated.splice(index, 1);
                            updateConfig({ qualifierProducts: updated });
                          }}
                          color="error"
                        >
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </Box>
                      
                      {product && (
                        <Typography variant="body2" sx={{ mb: 1, fontWeight: 500 }}>
                          {product.sku} - {product.bangla_name || product.name}
                        </Typography>
                      )}
                      
                      <TextField
                        size="small"
                        type="number"
                        label="Minimum Quantity *"
                        value={qualifier.minQuantity}
                        onChange={(e) => {
                          const updated = [...(data.offerConfig.qualifierProducts || [])];
                          updated[index].minQuantity = parseInt(e.target.value) || 1;
                          updateConfig({ qualifierProducts: updated });
                        }}
                        inputProps={{ min: 1, step: 1 }}
                        fullWidth
                      />
                    </Paper>
                  );
                })}
              </Stack>

              <Button
                startIcon={<AddIcon />}
                onClick={() => setExpandedCategory(productGroups[0]?.category._id || false)}
                variant="outlined"
                fullWidth
              >
                Add Qualifier Product
              </Button>
            </Paper>

            <Paper sx={{ p: 2 }}>
              <Typography variant="subtitle2" fontWeight={600} mb={1}>
                Qualifier Logic *
              </Typography>
              <FormControl component="fieldset">
                <RadioGroup
                  value={data.offerConfig.qualifierLogic || 'AND'}
                  onChange={(e) => updateConfig({ qualifierLogic: e.target.value as 'AND' | 'OR' })}
                >
                  <FormControlLabel
                    value="AND"
                    control={<Radio />}
                    label={
                      <Box>
                        <Typography variant="body2" fontWeight={500}>AND - All qualifiers required</Typography>
                        <Typography variant="caption" color="text.secondary">
                          Customer must buy ALL qualifier products with minimum quantities
                        </Typography>
                      </Box>
                    }
                  />
                  <FormControlLabel
                    value="OR"
                    control={<Radio />}
                    label={
                      <Box>
                        <Typography variant="body2" fontWeight={500}>OR - Any qualifier sufficient</Typography>
                        <Typography variant="caption" color="text.secondary">
                          Customer needs to buy ANY ONE qualifier product with minimum quantity
                        </Typography>
                      </Box>
                    }
                  />
                </RadioGroup>
              </FormControl>
            </Paper>

            <Paper sx={{ p: 2 }}>
              <Typography variant="subtitle2" fontWeight={600} mb={2}>
                Reward Products (Get These Free) *
              </Typography>
              <Typography variant="body2" color="text.secondary" mb={2}>
                Products given free or discounted when qualifiers are met
              </Typography>
              
              <Stack spacing={2} mb={2}>
                {(data.offerConfig.rewardProducts || []).map((reward, index) => {
                  const product = productGroups
                    .flatMap(g => g.products)
                    .find(p => p._id === reward.productId);
                  
                  return (
                    <Paper key={index} sx={{ p: 2, bgcolor: 'background.default' }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                        <Typography variant="caption" fontWeight={600}>
                          Reward {index + 1}
                        </Typography>
                        <IconButton
                          size="small"
                          onClick={() => {
                            const updated = [...(data.offerConfig.rewardProducts || [])];
                            updated.splice(index, 1);
                            updateConfig({ rewardProducts: updated });
                          }}
                          color="error"
                        >
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </Box>
                      
                      {product && (
                        <Typography variant="body2" sx={{ mb: 1, fontWeight: 500 }}>
                          {product.sku} - {product.bangla_name || product.name}
                          <Chip 
                            label={`৳${product.db_price || product.trade_price || 0}`} 
                            size="small" 
                            sx={{ ml: 1 }}
                          />
                        </Typography>
                      )}
                      
                      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                        <TextField
                          size="small"
                          type="number"
                          label="Free Quantity *"
                          value={reward.freeQuantity}
                          onChange={(e) => {
                            const updated = [...(data.offerConfig.rewardProducts || [])];
                            updated[index].freeQuantity = parseInt(e.target.value) || 1;
                            updateConfig({ rewardProducts: updated });
                          }}
                          inputProps={{ min: 1, step: 1 }}
                          fullWidth
                        />
                        <TextField
                          size="small"
                          type="number"
                          label="Max Value Cap (Optional)"
                          value={reward.maxValueCap ?? ''}
                          onChange={(e) => {
                            const updated = [...(data.offerConfig.rewardProducts || [])];
                            updated[index].maxValueCap = e.target.value ? parseFloat(e.target.value) : undefined;
                            updateConfig({ rewardProducts: updated });
                          }}
                          InputProps={{
                            startAdornment: <InputAdornment position="start">৳</InputAdornment>,
                          }}
                          inputProps={{ min: 0, step: 0.01 }}
                          helperText="Limit reward value"
                          fullWidth
                        />
                      </Stack>
                    </Paper>
                  );
                })}
              </Stack>

              <Button
                startIcon={<AddIcon />}
                onClick={() => setExpandedCategory(productGroups[0]?.category._id || false)}
                variant="outlined"
                fullWidth
              >
                Add Reward Product
              </Button>
            </Paper>

            <Paper sx={{ p: 2 }}>
              <Typography variant="subtitle2" fontWeight={600} mb={1}>
                Distribution Mode *
              </Typography>
              <FormControl component="fieldset">
                <RadioGroup
                  value={data.offerConfig.distributionMode || 'all'}
                  onChange={(e) => updateConfig({ distributionMode: e.target.value as 'all' | 'choice' })}
                >
                  <FormControlLabel
                    value="all"
                    control={<Radio />}
                    label={
                      <Box>
                        <Typography variant="body2" fontWeight={500}>All - Give all rewards automatically</Typography>
                        <Typography variant="caption" color="text.secondary">
                          All reward products are added to cart automatically
                        </Typography>
                      </Box>
                    }
                  />
                  <FormControlLabel
                    value="choice"
                    control={<Radio />}
                    label={
                      <Box>
                        <Typography variant="body2" fontWeight={500}>Choice - Let distributor choose</Typography>
                        <Typography variant="caption" color="text.secondary">
                          Distributor selects which reward product(s) to receive
                        </Typography>
                      </Box>
                    }
                  />
                </RadioGroup>
              </FormControl>
            </Paper>

            <Paper sx={{ p: 2 }}>
              <Typography variant="subtitle2" fontWeight={600} mb={2}>
                Repetition Settings
              </Typography>
              
              <FormControlLabel
                control={
                  <Checkbox
                    checked={data.offerConfig.allowRepetition || false}
                    onChange={(e) => updateConfig({ allowRepetition: e.target.checked })}
                  />
                }
                label={
                  <Box>
                    <Typography variant="body2" fontWeight={500}>Allow Multiple Reward Sets</Typography>
                    <Typography variant="caption" color="text.secondary">
                      If customer buys 2x qualifiers, they get 2x rewards
                    </Typography>
                  </Box>
                }
              />

              {data.offerConfig.allowRepetition && (
                <TextField
                  sx={{ mt: 2 }}
                  fullWidth
                  type="number"
                  label="Maximum Reward Sets"
                  value={data.offerConfig.maxRewardSets ?? ''}
                  onChange={(e) => updateConfig({ maxRewardSets: e.target.value ? parseInt(e.target.value) : undefined })}
                  inputProps={{ min: 1, step: 1 }}
                  helperText="Optional: Limit maximum number of reward sets per order"
                />
              )}
            </Paper>

            {renderProductSelection()}
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
