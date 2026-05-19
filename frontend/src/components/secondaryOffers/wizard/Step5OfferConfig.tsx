"use client";

import React, { useState, useEffect } from "react";
import {
  Box,
  Typography,
  Grid,
  TextField,
  FormControl,
  FormLabel,
  RadioGroup,
  FormControlLabel,
  Radio,
  Button,
  IconButton,
  Stack,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Checkbox,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Chip,
  CircularProgress,
  Alert,
  Paper,
  Divider,
} from "@mui/material";
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  ExpandMore as ExpandMoreIcon,
  CheckCircle as CheckCircleIcon,
} from "@mui/icons-material";
import { SecondaryOfferFormData, OfferTypeCode } from "@/types/secondaryOffer";
import api from "@/lib/api";

interface Product {
  _id: string;
  name: string;
  sku: string;
  unit: string;
  product_category?: { _id: string; name: string };
  db_price?: number;
}

interface ProductGroup {
  category: { _id: string; name: string };
  products: Product[];
}

interface Step5Props {
  formData: SecondaryOfferFormData;
  onChange: (updates: Partial<SecondaryOfferFormData>) => void;
}

const Step5OfferConfig: React.FC<Step5Props> = ({ formData, onChange }) => {
  const [productGroups, setProductGroups] = useState<ProductGroup[]>([]);
  const [loading, setLoading] = useState(false);
  const [expandedCategory, setExpandedCategory] = useState<string | false>(false);
  const [error, setError] = useState<string | null>(null);

  // Load products
  useEffect(() => {
    const fetchProducts = async () => {
      if (!formData.product_segments || formData.product_segments.length === 0) return;

      setLoading(true);
      setError(null);
      try {
        const response = await api.get("/products", {
          params: {
            product_segment: formData.product_segments.join(","),
            limit: 10000,
          },
        });

        // Group products by category
        const grouped = (response.data.products || []).reduce(
          (acc: Record<string, Product[]>, product: Product) => {
            const categoryId = product.product_category?._id || "uncategorized";
            const categoryName = product.product_category?.name || "Uncategorized";
            const key = `${categoryId}::${categoryName}`;

            if (!acc[key]) acc[key] = [];
            acc[key].push(product);
            return acc;
          },
          {}
        );

        const groups: ProductGroup[] = Object.entries(grouped).map(([key, products]) => {
          const [id, name] = key.split("::");
          return {
            category: { _id: id, name },
            products,
          };
        });

        setProductGroups(groups);
        if (groups.length > 0 && !expandedCategory) {
          setExpandedCategory(groups[0].category._id);
        }
      } catch (err: any) {
        setError(err.response?.data?.message || "Failed to load products");
      } finally {
        setLoading(false);
      }
    };

    fetchProducts();
  }, [formData.product_segments]);

  const updateConfig = (updates: any) => {
    onChange({
      config: {
        ...formData.config,
        ...updates,
      },
    });
  };

  const handleProductToggle = (productId: string) => {
    const current = formData.config?.selectedProducts || [];
    const updated = current.includes(productId)
      ? current.filter((id: string) => id !== productId)
      : [...current, productId];
    updateConfig({ selectedProducts: updated });
  };

  const handleSelectAllInCategory = (products: Product[]) => {
    const current = formData.config?.selectedProducts || [];
    const productIds = products.map((p) => p._id);
    const allSelected = productIds.every((id) => current.includes(id));

    if (allSelected) {
      updateConfig({
        selectedProducts: current.filter((id: string) => !productIds.includes(id)),
      });
    } else {
      updateConfig({
        selectedProducts: [...new Set([...current, ...productIds])],
      });
    }
  };

  const addSlab = () => {
    const current = formData.config?.slabs || [];
    updateConfig({
      slabs: [...current, { minValue: 0, maxValue: 0, discountPercentage: 0 }],
    });
  };

  const removeSlab = (index: number) => {
    const current = formData.config?.slabs || [];
    updateConfig({
      slabs: current.filter((_: any, i: number) => i !== index),
    });
  };

  const updateSlab = (index: number, field: string, value: number) => {
    const current = formData.config?.slabs || [];
    updateConfig({
      slabs: current.map((slab: any, i: number) => (i === index ? { ...slab, [field]: value } : slab)),
    });
  };

  const renderProductSelection = () => {
    const allProducts = productGroups.flatMap((g) => g.products);
    const selectedCount = formData.config?.selectedProducts?.length || 0;

    return (
      <Paper sx={{ p: 2, bgcolor: "grey.50" }}>
        <Box sx={{ mb: 2, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <Typography variant="subtitle2" fontWeight={600}>
            Select Applicable Products *
          </Typography>
          <Chip
            label={`${selectedCount} of ${allProducts.length} selected`}
            size="small"
            color={selectedCount > 0 ? "primary" : "default"}
          />
        </Box>

        {loading ? (
          <Box sx={{ display: "flex", justifyContent: "center", p: 3 }}>
            <CircularProgress size={32} />
          </Box>
        ) : productGroups.length === 0 ? (
          <Alert severity="info">
            No products found for the selected segments.
          </Alert>
        ) : (
          <Stack spacing={1}>
            {productGroups.map((group) => {
              const categoryProductIds = group.products.map((p) => p._id);
              const selectedInCategory = categoryProductIds.filter((id) =>
                formData.config?.selectedProducts?.includes(id)
              ).length;
              const allSelectedInCategory = selectedInCategory === categoryProductIds.length;

              return (
                <Accordion
                  key={group.category._id}
                  expanded={expandedCategory === group.category._id}
                  onChange={(_, isExpanded) =>
                    setExpandedCategory(isExpanded ? group.category._id : false)
                  }
                >
                  <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1, width: "100%" }}>
                      <Typography variant="body2" fontWeight={500} sx={{ flex: 1 }}>
                        {group.category.name}
                      </Typography>
                      <Chip
                        label={`${selectedInCategory}/${group.products.length}`}
                        size="small"
                        color={allSelectedInCategory ? "success" : "default"}
                      />
                    </Box>
                  </AccordionSummary>
                  <AccordionDetails>
                    <Stack spacing={0.5}>
                      <Button
                        size="small"
                        variant="text"
                        startIcon={<CheckCircleIcon />}
                        onClick={() => handleSelectAllInCategory(group.products)}
                        sx={{ alignSelf: "flex-start", mb: 1 }}
                      >
                        {allSelectedInCategory ? "Deselect All" : "Select All"} in{" "}
                        {group.category.name}
                      </Button>
                      <List dense>
                        {group.products.map((product) => (
                          <ListItem
                            key={product._id}
                            disablePadding
                            button
                            onClick={() => handleProductToggle(product._id)}
                          >
                            <ListItemIcon sx={{ minWidth: 36 }}>
                              <Checkbox
                                edge="start"
                                checked={
                                  formData.config?.selectedProducts?.includes(
                                    product._id
                                  ) || false
                                }
                                tabIndex={-1}
                                disableRipple
                              />
                            </ListItemIcon>
                            <ListItemText
                              primary={product.sku}
                              secondary={`${product.unit}${product.db_price ? ` • ৳${product.db_price}` : ""}`}
                              primaryTypographyProps={{ fontSize: "0.875rem" }}
                              secondaryTypographyProps={{ fontSize: "0.75rem" }}
                            />
                          </ListItem>
                        ))}
                      </List>
                    </Stack>
                  </AccordionDetails>
                </Accordion>
              );
            })}
          </Stack>
        )}
      </Paper>
    );
  };

  const renderConfigByType = () => {
    const offerType = formData.offer_type as OfferTypeCode;

    switch (offerType) {
      case "FLAT_DISCOUNT_PCT":
        return (
          <Grid container spacing={3}>
            <Grid item xs={12}>
              {renderProductSelection()}
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                required
                type="number"
                label="Discount Percentage"
                value={formData.config?.discountPercentage || ""}
                onChange={(e) =>
                  updateConfig({ discountPercentage: Number(e.target.value) })
                }
                inputProps={{ min: 0, max: 100, step: 0.1 }}
                InputProps={{ endAdornment: "%" }}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                type="number"
                label="Max Discount Amount (Optional)"
                value={formData.config?.maxDiscountAmount || ""}
                onChange={(e) =>
                  updateConfig({ maxDiscountAmount: Number(e.target.value) })
                }
                inputProps={{ min: 0 }}
                InputProps={{ startAdornment: "৳" }}
              />
            </Grid>
          </Grid>
        );

      case "FLAT_DISCOUNT_AMT":
        return (
          <Grid container spacing={3}>
            <Grid item xs={12}>
              {renderProductSelection()}
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                required
                type="number"
                label="Discount Amount"
                value={formData.config?.discountAmount || ""}
                onChange={(e) => updateConfig({ discountAmount: Number(e.target.value) })}
                inputProps={{ min: 0 }}
                InputProps={{ startAdornment: "৳" }}
              />
            </Grid>
          </Grid>
        );

      case "SLAB_DISCOUNT":
        return (
          <Grid container spacing={3}>
            <Grid item xs={12}>
              {renderProductSelection()}
            </Grid>
            <Grid item xs={12}>
              <Typography variant="subtitle2" gutterBottom>
                Discount Slabs
              </Typography>
              <Stack spacing={2}>
                {(formData.config?.slabs || []).map((slab: any, index: number) => (
                  <Paper key={index} sx={{ p: 2 }} variant="outlined">
                    <Grid container spacing={2} alignItems="center">
                      <Grid item xs={12} sm={3}>
                        <TextField
                          fullWidth
                          size="small"
                          type="number"
                          label="Min Value"
                          value={slab.minValue || ""}
                          onChange={(e) =>
                            updateSlab(index, "minValue", Number(e.target.value))
                          }
                          inputProps={{ min: 0 }}
                        />
                      </Grid>
                      <Grid item xs={12} sm={3}>
                        <TextField
                          fullWidth
                          size="small"
                          type="number"
                          label="Max Value"
                          value={slab.maxValue || ""}
                          onChange={(e) =>
                            updateSlab(index, "maxValue", Number(e.target.value))
                          }
                          inputProps={{ min: 0 }}
                        />
                      </Grid>
                      <Grid item xs={12} sm={4}>
                        <TextField
                          fullWidth
                          size="small"
                          type="number"
                          label="Discount %"
                          value={slab.discountPercentage || ""}
                          onChange={(e) =>
                            updateSlab(index, "discountPercentage", Number(e.target.value))
                          }
                          inputProps={{ min: 0, max: 100 }}
                          InputProps={{ endAdornment: "%" }}
                        />
                      </Grid>
                      <Grid item xs={12} sm={2}>
                        <IconButton
                          color="error"
                          onClick={() => removeSlab(index)}
                          size="small"
                        >
                          <DeleteIcon />
                        </IconButton>
                      </Grid>
                    </Grid>
                  </Paper>
                ))}
                <Button
                  variant="outlined"
                  startIcon={<AddIcon />}
                  onClick={addSlab}
                  fullWidth
                >
                  Add Slab
                </Button>
              </Stack>
            </Grid>
          </Grid>
        );

      case "BOGO":
        return (
          <Grid container spacing={3}>
            <Grid item xs={12}>
              {renderProductSelection()}
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                required
                type="number"
                label="Buy Quantity"
                value={formData.config?.buyQuantity || ""}
                onChange={(e) => updateConfig({ buyQuantity: Number(e.target.value) })}
                inputProps={{ min: 1 }}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                required
                type="number"
                label="Get Quantity (Free)"
                value={formData.config?.getQuantity || ""}
                onChange={(e) => updateConfig({ getQuantity: Number(e.target.value) })}
                inputProps={{ min: 1 }}
              />
            </Grid>
          </Grid>
        );

      case "BUNDLE_OFFER":
        return (
          <Grid container spacing={3}>
            <Grid item xs={12}>
              {renderProductSelection()}
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                required
                type="number"
                label="Bundle Price"
                value={formData.config?.bundlePrice || ""}
                onChange={(e) => updateConfig({ bundlePrice: Number(e.target.value) })}
                inputProps={{ min: 0 }}
                InputProps={{ startAdornment: "৳" }}
                helperText="Total price for all selected products in bundle"
              />
            </Grid>
          </Grid>
        );

      case "CASHBACK":
        return (
          <Grid container spacing={3}>
            <Grid item xs={12}>
              {renderProductSelection()}
            </Grid>
            <Grid item xs={12}>
              <FormControl component="fieldset">
                <FormLabel>Cashback Type</FormLabel>
                <RadioGroup
                  row
                  value={
                    formData.config?.cashbackPercentage ? "percentage" : "amount"
                  }
                  onChange={(e) => {
                    if (e.target.value === "percentage") {
                      updateConfig({ cashbackAmount: undefined });
                    } else {
                      updateConfig({ cashbackPercentage: undefined });
                    }
                  }}
                >
                  <FormControlLabel value="percentage" control={<Radio />} label="Percentage" />
                  <FormControlLabel value="amount" control={<Radio />} label="Fixed Amount" />
                </RadioGroup>
              </FormControl>
            </Grid>
            {formData.config?.cashbackPercentage !== undefined ? (
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  required
                  type="number"
                  label="Cashback Percentage"
                  value={formData.config?.cashbackPercentage || ""}
                  onChange={(e) =>
                    updateConfig({ cashbackPercentage: Number(e.target.value) })
                  }
                  inputProps={{ min: 0, max: 100 }}
                  InputProps={{ endAdornment: "%" }}
                />
              </Grid>
            ) : (
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  required
                  type="number"
                  label="Cashback Amount"
                  value={formData.config?.cashbackAmount || ""}
                  onChange={(e) => updateConfig({ cashbackAmount: Number(e.target.value) })}
                  inputProps={{ min: 0 }}
                  InputProps={{ startAdornment: "৳" }}
                />
              </Grid>
            )}
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                type="number"
                label="Max Cashback (Optional)"
                value={formData.config?.maxCashback || ""}
                onChange={(e) => updateConfig({ maxCashback: Number(e.target.value) })}
                inputProps={{ min: 0 }}
                InputProps={{ startAdornment: "৳" }}
              />
            </Grid>
          </Grid>
        );

      case "BUY_X_GET_1_FREE": {
        const skuFreeItems: Array<{ productId: string; buyQty: number }> =
          formData.config?.skuFreeItems || [];
        const selectedSkuIds = skuFreeItems.map((item) => item.productId);
        const allProducts = productGroups.flatMap((g) => g.products);

        const addSkuFreeItem = (product: Product) => {
          if (selectedSkuIds.includes(product._id)) return;
          updateConfig({
            skuFreeItems: [...skuFreeItems, { productId: product._id, buyQty: 1 }],
          });
        };

        const removeSkuFreeItem = (productId: string) => {
          updateConfig({
            skuFreeItems: skuFreeItems.filter((item) => item.productId !== productId),
          });
        };

        const updateSkuFreeItemQty = (productId: string, qty: number) => {
          updateConfig({
            skuFreeItems: skuFreeItems.map((item) =>
              item.productId === productId ? { ...item, buyQty: qty } : item
            ),
          });
        };

        return (
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <Typography variant="subtitle2" fontWeight={600} gutterBottom>
                Configure Per-SKU Buy Quantity
              </Typography>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                For each SKU, set how many units a customer must buy to get 1 free of that
                same SKU.
              </Typography>
            </Grid>

            {skuFreeItems.length > 0 && (
              <Grid item xs={12}>
                <Stack spacing={1}>
                  {skuFreeItems.map((item) => {
                    const product = allProducts.find((p) => p._id === item.productId);
                    return (
                      <Paper key={item.productId} sx={{ p: 1.5 }} variant="outlined">
                        <Grid container spacing={2} alignItems="center">
                          <Grid item xs={12} sm={5}>
                            <Typography variant="body2" fontWeight={500}>
                              {product?.sku || item.productId}
                            </Typography>
                            {product && (
                              <Typography variant="caption" color="text.secondary">
                                {product.unit}
                                {product.db_price ? ` • ৳${product.db_price}` : ""}
                              </Typography>
                            )}
                          </Grid>
                          <Grid item xs={8} sm={5}>
                            <TextField
                              fullWidth
                              size="small"
                              type="number"
                              label="Buy Qty"
                              value={item.buyQty}
                              onChange={(e) =>
                                updateSkuFreeItemQty(item.productId, Number(e.target.value))
                              }
                              inputProps={{ min: 1 }}
                              InputProps={{
                                endAdornment: (
                                  <Chip
                                    size="small"
                                    label="→ 1 Free"
                                    color="success"
                                    sx={{ ml: 1, flexShrink: 0 }}
                                  />
                                ),
                              }}
                            />
                          </Grid>
                          <Grid item xs={4} sm={2}>
                            <IconButton
                              color="error"
                              onClick={() => removeSkuFreeItem(item.productId)}
                              size="small"
                            >
                              <DeleteIcon />
                            </IconButton>
                          </Grid>
                        </Grid>
                      </Paper>
                    );
                  })}
                </Stack>
              </Grid>
            )}

            <Grid item xs={12}>
              <Paper sx={{ p: 2, bgcolor: "grey.50" }}>
                <Typography variant="subtitle2" fontWeight={600} gutterBottom>
                  Add SKUs
                </Typography>
                {loading ? (
                  <Box sx={{ display: "flex", justifyContent: "center", p: 3 }}>
                    <CircularProgress size={32} />
                  </Box>
                ) : productGroups.length === 0 ? (
                  <Alert severity="info">No products found for the selected segments.</Alert>
                ) : (
                  <Stack spacing={1}>
                    {productGroups.map((group) => (
                      <Accordion
                        key={group.category._id}
                        expanded={expandedCategory === group.category._id}
                        onChange={(_, isExpanded) =>
                          setExpandedCategory(isExpanded ? group.category._id : false)
                        }
                      >
                        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                          <Typography variant="body2" fontWeight={500}>
                            {group.category.name}
                          </Typography>
                        </AccordionSummary>
                        <AccordionDetails>
                          <List dense>
                            {group.products.map((product) => {
                              const isAdded = selectedSkuIds.includes(product._id);
                              return (
                                <ListItem key={product._id} disablePadding>
                                  <ListItemIcon sx={{ minWidth: 36 }}>
                                    <Checkbox
                                      edge="start"
                                      checked={isAdded}
                                      tabIndex={-1}
                                      disableRipple
                                      onChange={() =>
                                        isAdded
                                          ? removeSkuFreeItem(product._id)
                                          : addSkuFreeItem(product)
                                      }
                                    />
                                  </ListItemIcon>
                                  <ListItemText
                                    primary={product.sku}
                                    secondary={`${product.unit}${product.db_price ? ` • ৳${product.db_price}` : ""}`}
                                    primaryTypographyProps={{ fontSize: "0.875rem" }}
                                    secondaryTypographyProps={{ fontSize: "0.75rem" }}
                                  />
                                </ListItem>
                              );
                            })}
                          </List>
                        </AccordionDetails>
                      </Accordion>
                    ))}
                  </Stack>
                )}
              </Paper>
            </Grid>
          </Grid>
        );
      }

      default:
        return (
          <Grid container spacing={3}>
            <Grid item xs={12}>
              {renderProductSelection()}
            </Grid>
            <Grid item xs={12}>
              <Alert severity="info">
                Configuration for "{formData.offer_type}" offer type will be added. For now,
                please select the applicable products above.
              </Alert>
            </Grid>
          </Grid>
        );
    }
  };

  return (
    <Box>
      <Typography variant="h6" gutterBottom sx={{ mb: 3 }}>
        Offer Configuration
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {!formData.offer_type && (
        <Alert severity="warning" sx={{ mb: 3 }}>
          Please select an offer type in Step 1 first.
        </Alert>
      )}

      {formData.offer_type && renderConfigByType()}
    </Box>
  );
};

export default Step5OfferConfig;
