'use client';

import React, { useState, useEffect, useMemo, useCallback, memo } from 'react';
import {
  Box,
  Container,
  Typography,
  Paper,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  Chip,
  Alert,
  CircularProgress,
  Autocomplete,
  Checkbox,
  Pagination,
} from '@mui/material';
import {
  ExpandMore as ExpandMoreIcon,
  Send as SendIcon,
  Preview as PreviewIcon,
  Clear as ClearIcon,
  Save as SaveIcon,
  Close as CloseIcon,
  Delete as DeleteIcon,
  Store as StoreIcon,
} from '@mui/icons-material';
import { useRouter } from 'next/navigation';
import { toast } from 'react-hot-toast';
import api from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';

interface Product {
  _id: string;
  sku: string;
  trade_price: number;
  wt_pcs: number;
}

interface CategoryGroup {
  category: string;
  subcategory: string;
  products: Product[];
}

interface Depot {
  _id: string;
  name: string;
  type: string;
  address?: string;
}

interface ProductInput {
  product_id: string;
  qty_pcs: string;
  price: string;
  weight_mt: number;
  production_date: string;
  expiry_date: string;
  batch_no: string;
  note: string;
}

// Memoized ProductRow component
const ProductRow = memo(({
  product,
  input,
  onQtyPcsChange,
  onFieldChange,
  onClearRow,
}: {
  product: Product;
  input: ProductInput;
  onQtyPcsChange: (productId: string, value: string, product: Product) => void;
  onFieldChange: (productId: string, field: keyof ProductInput, value: any) => void;
  onClearRow: (productId: string) => void;
}) => {
  return (
    <TableRow>
      <TableCell>{product.sku}</TableCell>
      <TableCell align="right">
        <TextField
          type="number"
          value={input.price}
          onChange={(e) => onFieldChange(product._id, 'price', e.target.value)}
          size="small"
          inputProps={{ min: 0, step: 0.01, style: { textAlign: 'right' } }}
          placeholder="Price"
          sx={{ width: '100px' }}
        />
      </TableCell>
      <TableCell>
        <TextField
          size="small"
          type="number"
          value={input.qty_pcs}
          onChange={(e) => onQtyPcsChange(product._id, e.target.value, product)}
          inputProps={{ min: 0, step: 1, style: { textAlign: 'right' } }}
          placeholder="0"
          sx={{ width: '100px' }}
        />
      </TableCell>
      <TableCell>
        <TextField
          size="small"
          value={input.note}
          onChange={(e) => onFieldChange(product._id, 'note', e.target.value)}
          multiline
          rows={1}
          placeholder="Note"
          sx={{ width: '150px' }}
        />
      </TableCell>
      <TableCell 
        align="center"
        sx={{ 
          position: 'sticky', 
          right: 0, 
          bgcolor: 'background.paper',
          borderLeft: '1px solid',
          borderColor: 'divider',
        }}
      >
        <IconButton
          size="small"
          onClick={() => onClearRow(product._id)}
          color="error"
          title="Clear row data"
        >
          <ClearIcon fontSize="small" />
        </IconButton>
      </TableCell>
    </TableRow>
  );
});

ProductRow.displayName = 'ProductRow';

const SendItemsPage: React.FC = () => {
  const router = useRouter();
  const { user, isLoading: authLoading } = useAuth();

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [categoryGroups, setCategoryGroups] = useState<CategoryGroup[]>([]);
  const [depots, setDepots] = useState<Depot[]>([]);
  const [selectedDepot, setSelectedDepot] = useState<Depot | null>(null);
  const [sendDate, setSendDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [productInputs, setProductInputs] = useState<Record<string, ProductInput>>({});
  const [previewOpen, setPreviewOpen] = useState(false);
  const [expandedPanel, setExpandedPanel] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  // Check if user has required permissions
  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.push('/login');
      return;
    }

    if (user.role.role !== 'Sales Admin') {
      toast.error('Access denied. Sales Admin role required.');
      router.push('/dashboard');
      return;
    }
  }, [user, authLoading, router]);

  // Load PROCURED products grouped by category
  const loadProducts = useCallback(async () => {
    try {
      setLoading(true);
      const response = await api.get('/products', {
        params: {
          product_type: 'PROCURED',
          active: true,
        },
      });

      // Group products by category and subcategory
      const productsList = response.data.data || [];
      const grouped: Record<string, Record<string, Product[]>> = {};

      productsList.forEach((product: any) => {
        const categoryName = product.category_id?.name || 'Uncategorized';
        const subcategoryName = product.subcategory_id?.name || 'General';

        if (!grouped[categoryName]) {
          grouped[categoryName] = {};
        }
        if (!grouped[categoryName][subcategoryName]) {
          grouped[categoryName][subcategoryName] = [];
        }

        grouped[categoryName][subcategoryName].push({
          _id: product._id,
          sku: product.sku,
          trade_price: product.trade_price || 0,
          wt_pcs: product.wt_pcs || 0,
        });
      });

      // Convert to array format
      const groups: CategoryGroup[] = [];
      Object.entries(grouped).forEach(([category, subcategories]) => {
        Object.entries(subcategories).forEach(([subcategory, products]) => {
          groups.push({
            category,
            subcategory,
            products,
          });
        });
      });

      setCategoryGroups(groups);

      // Initialize product inputs
      const initialInputs: Record<string, ProductInput> = {};
      groups.forEach((group) => {
        group.products.forEach((product) => {
          initialInputs[product._id] = {
            product_id: product._id,
            qty_pcs: '',
            price: product.trade_price.toString(),
            weight_mt: 0,
            production_date: '',
            expiry_date: '',
            batch_no: '',
            note: '',
          };
        });
      });
      setProductInputs(initialInputs);
    } catch (error: any) {
      console.error('Error loading products:', error);
      toast.error(error.response?.data?.message || 'Failed to load products');
    } finally {
      setLoading(false);
    }
  }, []);

  // Load depots
  const loadDepots = useCallback(async () => {
    try {
      const response = await api.get('/facilities', {
        params: {
          type: 'Depot',
        },
      });
      setDepots(response.data.data || []);
    } catch (error: any) {
      console.error('Error loading depots:', error);
      toast.error('Failed to load depots');
    }
  }, []);

  useEffect(() => {
    if (!authLoading && user?.role.role === 'Sales Admin') {
      loadProducts();
      loadDepots();
    }
  }, [user, authLoading, loadProducts, loadDepots]);

  // Calculate weight_mt when qty_pcs changes
  const handleQtyPcsChange = useCallback((productId: string, value: string, product: Product) => {
    const qtyPcs = parseFloat(value) || 0;
    const weightMt = (qtyPcs * product.wt_pcs) / 1000;

    setProductInputs((prev) => ({
      ...prev,
      [productId]: {
        ...prev[productId],
        qty_pcs: value,
        weight_mt: weightMt,
      },
    }));
  }, []);

  // Handle other field changes
  const handleFieldChange = useCallback((
    productId: string,
    field: keyof ProductInput,
    value: any
  ) => {
    setProductInputs((prev) => ({
      ...prev,
      [productId]: {
        ...prev[productId],
        [field]: value,
      },
    }));
  }, []);

  // Clear individual product row
  const handleClearRow = useCallback((productId: string) => {
    setProductInputs((prev) => ({
      ...prev,
      [productId]: {
        ...prev[productId],
        qty_pcs: '',
        weight_mt: 0,
        production_date: '',
        expiry_date: '',
        batch_no: '',
        note: '',
      },
    }));
  }, []);

  // Remove product from preview
  const handleRemoveFromPreview = useCallback((productId: string) => {
    handleClearRow(productId);
    toast('Product removed from send list', { icon: 'ℹ️' });
  }, [handleClearRow]);

  // Get products with data
  const productsWithData = useMemo(() => {
    return Object.entries(productInputs)
      .filter(([_, input]) => {
        const qtyPcs = parseFloat(input.qty_pcs);
        return qtyPcs > 0;
      })
      .map(([productId, input]) => {
        let product: Product | undefined;
        for (const group of categoryGroups) {
          const found = group.products.find((p) => p._id === productId);
          if (found) {
            product = found;
            break;
          }
        }

        return {
          ...input,
          product,
        };
      });
  }, [productInputs, categoryGroups]);

  // Validate data
  const validateData = (): string[] => {
    const errors: string[] = [];

    if (!selectedDepot) {
      errors.push('Depot must be selected');
    }

    productsWithData.forEach(({ product, qty_pcs, price, production_date, expiry_date }) => {
      if (!product) return;

      const qtyPcs = parseFloat(qty_pcs);
      if (qtyPcs <= 0) {
        errors.push(`${product.sku}: Quantity must be greater than 0`);
      }

      const priceVal = parseFloat(price);
      if (!price || priceVal <= 0) {
        errors.push(`${product.sku}: Price must be greater than 0`);
      }

      // Optional: Validate date logic if both dates are provided
      if (production_date && expiry_date && expiry_date <= production_date) {
        errors.push(`${product.sku}: Expiry date must be after production date`);
      }
    });

    return errors;
  };

  // Handle preview
  const handlePreview = () => {
    if (productsWithData.length === 0) {
      toast('Please enter data for at least one product', { icon: '⚠️' });
      return;
    }

    const errors = validateData();
    if (errors.length > 0) {
      toast.error(
        <div>
          <strong>Validation errors:</strong>
          <ul style={{ margin: 0, paddingLeft: 20 }}>
            {errors.slice(0, 3).map((err, idx) => (
              <li key={idx}>{err}</li>
            ))}
            {errors.length > 3 && <li>...and {errors.length - 3} more</li>}
          </ul>
        </div>
      );
      return;
    }

    setPreviewOpen(true);
  };

  // Handle submit
  const handleSubmit = async () => {
    try {
      setSubmitting(true);

      const products = productsWithData.map((item) => ({
        product_id: item.product_id,
        qty_pcs: parseFloat(item.qty_pcs),
        price: parseFloat(item.price),
        production_date: item.production_date || undefined,
        expiry_date: item.expiry_date || undefined,
        batch_no: item.batch_no?.trim() || undefined,
        note: item.note?.trim() || '',
      }));

      const payload = {
        depot_ids: [selectedDepot!._id],
        products,
        send_date: new Date(sendDate).toISOString(),
      };

      const response = await api.post('/offers/send-items', payload);

      toast.success(
        `Offer send ${response.data.data.ref_no} created successfully!`
      );

      // Clear form and close preview
      setPreviewOpen(false);
      setSelectedDepot(null);
      loadProducts();
    } catch (error: any) {
      console.error('Error submitting offer send:', error);
      toast.error(
        error.response?.data?.message || 'Failed to create offer send'
      );
    } finally {
      setSubmitting(false);
    }
  };

  // Handle clear all
  const handleClearAll = () => {
    if (
      window.confirm(
        'Are you sure you want to clear all entered data? This action cannot be undone.'
      )
    ) {
      loadProducts();
      setSelectedDepot(null);
      toast('Form cleared', { icon: 'ℹ️' });
    }
  };

  // Toggle accordion
  const handleAccordionChange = useCallback((panel: string) => {
    setExpandedPanel((prev) => (prev === panel ? null : panel));
  }, []);

  // Pagination
  const totalPages = Math.ceil(categoryGroups.length / itemsPerPage);
  const paginatedGroups = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return categoryGroups.slice(startIndex, endIndex);
  }, [categoryGroups, currentPage, itemsPerPage]);

  const handlePageChange = (_event: React.ChangeEvent<unknown>, page: number) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  if (loading) {
    return (
      <Box
        display="flex"
        justifyContent="center"
        alignItems="center"
        minHeight="60vh"
      >
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Container maxWidth="xl" sx={{ py: { xs: 2, md: 4 } }}>
      {/* Header */}
      <Paper elevation={2} sx={{ p: { xs: 2, md: 3 }, mb: 3 }}>
        <Box display="flex" flexDirection={{ xs: 'column', sm: 'row' }} alignItems={{ xs: 'flex-start', sm: 'center' }} gap={2} mb={2}>
          <SendIcon fontSize="large" color="primary" sx={{ display: { xs: 'none', sm: 'block' } }} />
          <Box flex={1}>
            <Typography variant="h4" gutterBottom sx={{ fontSize: { xs: '1.5rem', md: '2.125rem' } }}>
              Send Items
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Send offer (PROCURED) products to multiple depots
            </Typography>
          </Box>
          <Box display="flex" gap={1} flexWrap="wrap">
            <Button
              variant="outlined"
              size={window.innerWidth < 600 ? 'small' : 'medium'}
              startIcon={<ClearIcon />}
              onClick={handleClearAll}
              disabled={submitting}
            >
              Clear All
            </Button>
            <Button
              variant="contained"
              size={window.innerWidth < 600 ? 'small' : 'medium'}
              startIcon={<PreviewIcon />}
              onClick={handlePreview}
              disabled={submitting || productsWithData.length === 0}
            >
              Preview ({productsWithData.length})
            </Button>
          </Box>
        </Box>

        {/* Send Date */}
        <Box mb={2}>
          <TextField
            fullWidth
            label="Send Date *"
            type="date"
            value={sendDate}
            onChange={(e) => setSendDate(e.target.value)}
            InputLabelProps={{ shrink: true }}
            required
            helperText="Date when items are being sent"
          />
        </Box>

        {/* Depot Selector */}
        <Box mb={2}>
          <Autocomplete
            options={depots}
            value={selectedDepot}
            onChange={(_event, newValue) => setSelectedDepot(newValue)}
            getOptionLabel={(option) => option.name}
            renderOption={(props, option) => (
              <li {...props}>
                <Box>
                  <Typography variant="body1">{option.name}</Typography>
                  {option.address && (
                    <Typography variant="caption" color="text.secondary">
                      {option.address}
                    </Typography>
                  )}
                </Box>
              </li>
            )}
            renderInput={(params) => (
              <TextField
                {...params}
                label="Select Depot *"
                placeholder="Choose a depot"
                error={!selectedDepot}
                helperText={!selectedDepot ? 'Depot is required' : selectedDepot.name}
              />
            )}
          />
        </Box>
      </Paper>

      {/* Product Accordions */}
      {categoryGroups.length === 0 ? (
        <Alert severity="info">
          No PROCURED (offer) products found. Please add products first.
        </Alert>
      ) : (
        <>
          {paginatedGroups.map((group, idx) => {
            const panelId = `panel-${(currentPage - 1) * itemsPerPage + idx}`;
            const hasDataInGroup = group.products.some(
              (p) => parseFloat(productInputs[p._id]?.qty_pcs || '0') > 0
            );

            return (
              <Accordion
                key={panelId}
                expanded={expandedPanel === panelId}
                onChange={() => handleAccordionChange(panelId)}
                sx={{ mb: 2 }}
              >
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                  <Box display="flex" alignItems="center" gap={2} flex={1}>
                    <Typography variant="h6" sx={{ fontSize: { xs: '1rem', md: '1.25rem' } }}>
                      {group.category} &gt; {group.subcategory}
                    </Typography>
                    {hasDataInGroup && (
                      <Chip
                        label="Has Data"
                        color="success"
                        size="small"
                      />
                    )}
                  </Box>
                </AccordionSummary>
                <AccordionDetails sx={{ overflowX: 'auto' }}>
                  <TableContainer>
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell>SKU</TableCell>
                          <TableCell align="right">Price</TableCell>
                          <TableCell>Qty (PCs)</TableCell>
                          <TableCell>Note</TableCell>
                          <TableCell 
                            align="center"
                            sx={{ 
                              position: 'sticky', 
                              right: 0, 
                              bgcolor: 'background.paper',
                              borderLeft: '1px solid',
                              borderColor: 'divider',
                            }}
                          >
                            Action
                          </TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {group.products.map((product) => {
                          const input = productInputs[product._id];
                          if (!input) return null;

                          return (
                            <ProductRow
                              key={product._id}
                              product={product}
                              input={input}
                              onQtyPcsChange={handleQtyPcsChange}
                              onFieldChange={handleFieldChange}
                              onClearRow={handleClearRow}
                            />
                          );
                        })}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </AccordionDetails>
              </Accordion>
            );
          })}

          {/* Pagination */}
          {totalPages > 1 && (
            <Box display="flex" justifyContent="center" mt={3} mb={2}>
              <Pagination
                count={totalPages}
                page={currentPage}
                onChange={handlePageChange}
                color="primary"
                size={window.innerWidth < 600 ? 'small' : 'large'}
                showFirstButton
                showLastButton
              />
            </Box>
          )}
        </>
      )}

      {/* Preview Dialog */}
      <Dialog
        open={previewOpen}
        onClose={() => !submitting && setPreviewOpen(false)}
        maxWidth="lg"
        fullWidth
        fullScreen={window.innerWidth < 900}
      >
        <DialogTitle>
          <Box display="flex" alignItems="center" justifyContent="space-between">
            <Typography variant="h6">Preview Offer Send</Typography>
            <IconButton
              onClick={() => setPreviewOpen(false)}
              disabled={submitting}
            >
              <CloseIcon />
            </IconButton>
          </Box>
        </DialogTitle>
        <DialogContent dividers>
          {/* Selected Depot */}
          <Box mb={3}>
            <Typography variant="subtitle1" gutterBottom>
              <strong>Depot:</strong>
            </Typography>
            {selectedDepot && (
              <Chip
                label={selectedDepot.name}
                color="primary"
                size="medium"
                icon={<StoreIcon />}
              />
            )}
          </Box>

          {/* Products Table */}
          <TableContainer sx={{ overflowX: 'auto' }}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Category</TableCell>
                  <TableCell>SKU</TableCell>
                  <TableCell align="right">Price</TableCell>
                  <TableCell>Qty (PCs)</TableCell>
                  <TableCell>Note</TableCell>
                  <TableCell align="center">Action</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {productsWithData.map(({ product, ...input }) => {
                  if (!product) return null;

                  const group = categoryGroups.find((g) =>
                    g.products.some((p) => p._id === product._id)
                  );

                  return (
                    <TableRow key={product._id}>
                      <TableCell>
                        <Typography variant="caption">
                          {group?.category} &gt; {group?.subcategory}
                        </Typography>
                      </TableCell>
                      <TableCell>{product.sku}</TableCell>
                      <TableCell align="right">{parseFloat(input.price).toFixed(2)}</TableCell>
                      <TableCell>{parseFloat(input.qty_pcs).toFixed(0)}</TableCell>
                      <TableCell>{input.note || '-'}</TableCell>
                      <TableCell align="center">
                        <IconButton
                          size="small"
                          color="error"
                          onClick={() => handleRemoveFromPreview(product._id)}
                          title="Remove"
                        >
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>

          {/* Summary */}
          <Box mt={3}>
            <Typography variant="h6">Summary</Typography>
            <Typography>
              Total Items: {productsWithData.length}
            </Typography>
            <Typography>
              Total Quantity (PCs):{' '}
              {productsWithData
                .reduce((sum, item) => sum + parseFloat(item.qty_pcs), 0)
                .toFixed(0)}
            </Typography>
            <Typography>
              Depot: {selectedDepot?.name}
            </Typography>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => setPreviewOpen(false)}
            disabled={submitting}
          >
            Cancel
          </Button>
          <Button
            variant="contained"
            startIcon={submitting ? <CircularProgress size={20} /> : <SaveIcon />}
            onClick={handleSubmit}
            disabled={submitting}
          >
            {submitting ? 'Submitting...' : 'Submit'}
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default SendItemsPage;
