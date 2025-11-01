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
  Grid,
  TextareaAutosize,
  Pagination,
} from '@mui/material';
import {
  ExpandMore as ExpandMoreIcon,
  LocalShipping as LocalShippingIcon,
  Preview as PreviewIcon,
  Clear as ClearIcon,
  Save as SaveIcon,
  Close as CloseIcon,
  Delete as DeleteIcon,
} from '@mui/icons-material';
import { useRouter } from 'next/navigation';
import { toast } from 'react-hot-toast';
import api from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';

interface Product {
  _id: string;
  sku: string;
  erp_id: number | null;
  bangla_name: string;
  english_name: string;
  ctn_pcs: number;
  wt_pcs: number;
}

interface CategoryGroup {
  category: string;
  subcategory: string;
  products: Product[];
}

interface ProductInput {
  product_id: string;
  qty_ctn: string;
  qty_pcs: number;
  weight_mt: number;
  production_date: string;
  expiry_date: string;
  batch_no: string;
  note: string;
}

// Memoized ProductRow component to prevent unnecessary re-renders
const ProductRow = memo(({
  product,
  input,
  onQtyCtnChange,
  onFieldChange,
  onClearRow,
}: {
  product: Product;
  input: ProductInput;
  onQtyCtnChange: (productId: string, value: string, product: Product) => void;
  onFieldChange: (productId: string, field: keyof ProductInput, value: any) => void;
  onClearRow: (productId: string) => void;
}) => {
  return (
    <TableRow>
      <TableCell>{product.sku}</TableCell>
      <TableCell>{product.erp_id || '-'}</TableCell>
      <TableCell align="right">
        {product.ctn_pcs}
      </TableCell>
      <TableCell>
        <TextField
          size="small"
          type="number"
          value={input.qty_ctn}
          onChange={(e) =>
            onQtyCtnChange(product._id, e.target.value, product)
          }
          inputProps={{ min: 0, step: 0.01 }}
          sx={{ width: '100px' }}
        />
      </TableCell>
      <TableCell align="right">
        <Typography variant="body2">
          {input.qty_pcs.toFixed(2)}
        </Typography>
      </TableCell>
      <TableCell align="right">
        <Typography variant="body2">
          {input.weight_mt.toFixed(3)}
        </Typography>
      </TableCell>
      <TableCell>
        <TextField
          type="date"
          size="small"
          value={input.production_date}
          onChange={(e) =>
            onFieldChange(
              product._id,
              'production_date',
              e.target.value
            )
          }
          InputLabelProps={{ shrink: true }}
          sx={{ width: '160px' }}
        />
      </TableCell>
      <TableCell>
        <TextField
          type="date"
          size="small"
          value={input.expiry_date}
          onChange={(e) =>
            onFieldChange(
              product._id,
              'expiry_date',
              e.target.value
            )
          }
          InputLabelProps={{ shrink: true }}
          sx={{ width: '160px' }}
        />
      </TableCell>
      <TableCell>
        <TextField
          size="small"
          value={input.batch_no}
          onChange={(e) =>
            onFieldChange(
              product._id,
              'batch_no',
              e.target.value
            )
          }
          sx={{ width: '120px' }}
        />
      </TableCell>
      <TableCell>
        <TextField
          size="small"
          value={input.note}
          onChange={(e) =>
            onFieldChange(product._id, 'note', e.target.value)
          }
          multiline
          rows={1}
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

const SendToStorePage: React.FC = () => {
  const router = useRouter();
  const { user, isLoading: authLoading } = useAuth();

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [categoryGroups, setCategoryGroups] = useState<CategoryGroup[]>([]);
  const [productInputs, setProductInputs] = useState<Record<string, ProductInput>>({});
  const [previewOpen, setPreviewOpen] = useState(false);
  const [expandedPanel, setExpandedPanel] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [facilityName, setFacilityName] = useState<string>('');
  const [factoryStoreName, setFactoryStoreName] = useState<string>('');
  const itemsPerPage = 5;

  // Check if user has required permissions
  useEffect(() => {
    if (authLoading) return; // Wait for auth to load
    if (!user) {
      router.push('/login');
      return;
    }

    // Check if user has Production role
    if (user.role.role !== 'Production') {
      toast.error('Access denied. Production role required.');
      router.push('/dashboard');
      return;
    }

    // Check if user has facility_id and factory_store_id
    if (!user.context.facility_id || !user.context.factory_store_id) {
      toast.error('Production user must have facility and factory store assigned.');
      router.push('/dashboard');
      return;
    }
  }, [user, authLoading, router]);

  // Load facility and factory store names
  const loadFacilityNames = useCallback(async () => {
    if (!user?.context.facility_id || !user?.context.factory_store_id) return;
    
    try {
      const [facilityRes, depotRes] = await Promise.all([
        api.get(`/facilities/${user.context.facility_id}`),
        api.get(`/facilities/${user.context.factory_store_id}`)
      ]);
      
      setFacilityName(facilityRes.data.data?.name || user.context.facility_id);
      setFactoryStoreName(depotRes.data.data?.name || user.context.factory_store_id);
    } catch (error) {
      console.error('Error loading facility names:', error);
      // Fallback to IDs if names can't be loaded
      setFacilityName(user.context.facility_id);
      setFactoryStoreName(user.context.factory_store_id);
    }
  }, [user]);

  // Load manufactured products grouped by category
  const loadProducts = useCallback(async () => {
    try {
      setLoading(true);
      const response = await api.get('/products/manufactured/by-category');
      setCategoryGroups(response.data.data || []);

      // Initialize product inputs
      const initialInputs: Record<string, ProductInput> = {};
      response.data.data.forEach((group: CategoryGroup) => {
        group.products.forEach((product) => {
          initialInputs[product._id] = {
            product_id: product._id,
            qty_ctn: '',
            qty_pcs: 0,
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

  useEffect(() => {
    if (!authLoading && user?.context.facility_id && user?.context.factory_store_id) {
      loadProducts();
      loadFacilityNames();
    }
  }, [user, authLoading, loadProducts, loadFacilityNames]);

  // Calculate qty_pcs and weight_mt when qty_ctn changes
  const handleQtyCtnChange = useCallback((productId: string, value: string, product: Product) => {
    const qtyCtn = parseFloat(value) || 0;
    const qtyPcs = qtyCtn * product.ctn_pcs;
    const weightMt = (qtyCtn * product.ctn_pcs * product.wt_pcs) / 1000;

    setProductInputs((prev) => ({
      ...prev,
      [productId]: {
        ...prev[productId],
        qty_ctn: value,
        qty_pcs: qtyPcs,
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
        qty_ctn: '',
        qty_pcs: 0,
        weight_mt: 0,
        production_date: '',
        expiry_date: '',
        batch_no: '',
        note: '',
      },
    }));
  }, []);

  // Remove product from preview (clears the data)
  const handleRemoveFromPreview = useCallback((productId: string) => {
    handleClearRow(productId);
    toast('Product removed from shipment', { icon: 'ℹ️' });
  }, [handleClearRow]);

  // Get products with data (for preview and submission)
  const productsWithData = useMemo(() => {
    return Object.entries(productInputs)
      .filter(([_, input]) => {
        const qtyCtn = parseFloat(input.qty_ctn);
        return qtyCtn > 0;
      })
      .map(([productId, input]) => {
        // Find product details
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

  // Validate data before preview
  const validateData = (): string[] => {
    const errors: string[] = [];

    productsWithData.forEach(({ product, qty_ctn, production_date, expiry_date, batch_no }) => {
      if (!product) return;

      const qtyCtn = parseFloat(qty_ctn);
      if (qtyCtn <= 0) {
        errors.push(`${product.bangla_name}: Quantity must be greater than 0`);
      }

      if (!production_date) {
        errors.push(`${product.bangla_name}: Production date is required`);
      }

      if (!expiry_date) {
        errors.push(`${product.bangla_name}: Expiry date is required`);
      }

      if (production_date && expiry_date && expiry_date <= production_date) {
        errors.push(`${product.bangla_name}: Expiry date must be after production date`);
      }

      if (!batch_no || batch_no.trim() === '') {
        errors.push(`${product.bangla_name}: Batch number is required`);
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
          <ul>
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

      const details = productsWithData.map((item) => ({
        product_id: item.product_id,
        qty: parseFloat(item.qty_ctn),
        production_date: item.production_date,
        expiry_date: item.expiry_date,
        batch_no: item.batch_no.trim(),
        note: item.note.trim() || undefined,
      }));

      const response = await api.post('/production/send-to-store', {
        details,
      });

      toast.success(
        `Shipment ${response.data.data.ref} created successfully!`
      );

      // Clear form and close preview
      setPreviewOpen(false);
      loadProducts(); // Reload to reset form
    } catch (error: any) {
      console.error('Error submitting shipment:', error);
      toast.error(
        error.response?.data?.message || 'Failed to create shipment'
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
      loadProducts(); // Reload to reset form
      toast('Form cleared', { icon: 'ℹ️' });
    }
  };

  // Toggle accordion panel - only one open at a time
  const handleAccordionChange = useCallback((panel: string) => {
    setExpandedPanel((prev) => (prev === panel ? null : panel));
  }, []);

  // Calculate paginated groups
  const totalPages = Math.ceil(categoryGroups.length / itemsPerPage);
  const paginatedGroups = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return categoryGroups.slice(startIndex, endIndex);
  }, [categoryGroups, currentPage, itemsPerPage]);

  // Handle page change
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

  if (!user?.context.facility_id || !user?.context.factory_store_id) {
    return (
      <Container maxWidth="md" sx={{ mt: 4 }}>
        <Alert severity="error">
          <Typography variant="h6">Access Denied</Typography>
          <Typography>
            Production user must have both facility (Factory) and factory store
            (Depot) assigned. Please contact HR to update your employee record.
          </Typography>
        </Alert>
      </Container>
    );
  }

  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      {/* Header */}
      <Paper elevation={2} sx={{ p: 3, mb: 3 }}>
        <Box display="flex" alignItems="center" gap={2} mb={2}>
          <LocalShippingIcon fontSize="large" color="primary" />
          <Box flex={1}>
            <Typography variant="h4" gutterBottom>
              Send to Store
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Send manufactured products from factory to factory store (depot)
            </Typography>
            </Box>
            <Box display="flex" gap={1}>
              <Button
                variant="outlined"
                startIcon={<ClearIcon />}
                onClick={handleClearAll}
                disabled={submitting}
              >
                Clear All
              </Button>
              <Button
                variant="contained"
                startIcon={<PreviewIcon />}
                onClick={handlePreview}
                disabled={submitting || productsWithData.length === 0}
              >
                Preview ({productsWithData.length})
              </Button>
            </Box>
          </Box>

          {/* Facility Info */}
          <Box display="flex" gap={2} flexWrap="wrap">
            <Chip
              label={`Factory: ${facilityName}`}
              color="primary"
              variant="outlined"
              icon={<LocalShippingIcon />}
            />
            <Chip
              label={`Depot: ${factoryStoreName}`}
              color="secondary"
              variant="outlined"
            />
          </Box>
        </Paper>

        {/* Product Accordions */}
        {categoryGroups.length === 0 ? (
          <Alert severity="info">
            No manufactured products found. Please add products first.
          </Alert>
        ) : (
          <>
            {paginatedGroups.map((group, idx) => {
              const panelId = `panel-${(currentPage - 1) * itemsPerPage + idx}`;
              const hasDataInGroup = group.products.some(
                (p) => parseFloat(productInputs[p._id]?.qty_ctn || '0') > 0
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
                      <Typography variant="h6">
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
                <AccordionDetails>
                  <TableContainer>
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell>SKU</TableCell>
                          <TableCell>ERP ID</TableCell>
                          <TableCell align="right">Pcs/CTN</TableCell>
                          <TableCell align="right">Qty (CTN)</TableCell>
                          <TableCell align="right">Qty (PCs)</TableCell>
                          <TableCell align="right">Wt (MT)</TableCell>
                          <TableCell>Production Date</TableCell>
                          <TableCell>Expiry Date</TableCell>
                          <TableCell>Batch #</TableCell>
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
                              onQtyCtnChange={handleQtyCtnChange}
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
                size="large"
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
        >
          <DialogTitle>
            <Box display="flex" alignItems="center" justifyContent="space-between">
              <Typography variant="h6">Preview Shipment</Typography>
              <IconButton
                onClick={() => setPreviewOpen(false)}
                disabled={submitting}
              >
                <CloseIcon />
              </IconButton>
            </Box>
          </DialogTitle>
          <DialogContent dividers>
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Category</TableCell>
                    <TableCell>SKU</TableCell>
                    <TableCell>ERP ID</TableCell>
                    <TableCell align="right">Pcs/CTN</TableCell>
                    <TableCell align="right">Qty (CTN)</TableCell>
                    <TableCell align="right">Qty (PCs)</TableCell>
                    <TableCell align="right">Wt (MT)</TableCell>
                    <TableCell>Production Date</TableCell>
                    <TableCell>Expiry Date</TableCell>
                    <TableCell>Batch #</TableCell>
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
                  {productsWithData.map(({ product, ...input }) => {
                    if (!product) return null;

                    // Find category/subcategory
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
                        <TableCell>{product.erp_id || '-'}</TableCell>
                        <TableCell align="right">{product.ctn_pcs}</TableCell>
                        <TableCell>
                          <TextField
                            size="small"
                            type="number"
                            value={input.qty_ctn}
                            onChange={(e) => handleQtyCtnChange(product._id, e.target.value, product)}
                            inputProps={{ min: 0, step: 0.01 }}
                            sx={{ width: '100px' }}
                          />
                        </TableCell>
                        <TableCell align="right">
                          {input.qty_pcs.toFixed(2)}
                        </TableCell>
                        <TableCell align="right">
                          {input.weight_mt.toFixed(3)}
                        </TableCell>
                        <TableCell>
                          <TextField
                            type="date"
                            size="small"
                            value={input.production_date}
                            onChange={(e) => handleFieldChange(product._id, 'production_date', e.target.value)}
                            InputLabelProps={{ shrink: true }}
                            sx={{ width: '160px' }}
                          />
                        </TableCell>
                        <TableCell>
                          <TextField
                            type="date"
                            size="small"
                            value={input.expiry_date}
                            onChange={(e) => handleFieldChange(product._id, 'expiry_date', e.target.value)}
                            InputLabelProps={{ shrink: true }}
                            sx={{ width: '160px' }}
                          />
                        </TableCell>
                        <TableCell>
                          <TextField
                            size="small"
                            value={input.batch_no}
                            onChange={(e) => handleFieldChange(product._id, 'batch_no', e.target.value)}
                            sx={{ width: '120px' }}
                          />
                        </TableCell>
                        <TableCell>
                          <TextField
                            size="small"
                            value={input.note}
                            onChange={(e) => handleFieldChange(product._id, 'note', e.target.value)}
                            multiline
                            rows={1}
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
                            color="error"
                            onClick={() => handleRemoveFromPreview(product._id)}
                            title="Remove from shipment"
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

            <Box mt={3}>
              <Typography variant="h6">Summary</Typography>
              <Typography>
                Total Items: {productsWithData.length}
              </Typography>
              <Typography>
                Total Quantity (CTN):{' '}
                {productsWithData
                  .reduce((sum, item) => sum + parseFloat(item.qty_ctn), 0)
                  .toFixed(2)}
              </Typography>
              <Typography>
                Total Quantity (PCs):{' '}
                {productsWithData
                  .reduce((sum, item) => sum + item.qty_pcs, 0)
                  .toFixed(2)}
              </Typography>
              <Typography>
                Total Weight (MT):{' '}
                {productsWithData
                  .reduce((sum, item) => sum + item.weight_mt, 0)
                  .toFixed(3)}
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

export default SendToStorePage;
