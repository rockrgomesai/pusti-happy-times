'use client';

import React, { useState, useEffect, useCallback, useMemo, memo } from 'react';
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
  Pagination,
} from '@mui/material';
import {
  ExpandMore as ExpandMoreIcon,
  Send as SendIcon,
  Preview as PreviewIcon,
  Clear as ClearIcon,
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
  qty: string;
  qty_pcs: number;
  weight_mt: number;
  note: string;
}

// Memoized ProductRow component
const ProductRow = memo(({
  product,
  input,
  onQtyChange,
  onNoteChange,
  onClearRow,
}: {
  product: Product;
  input: ProductInput;
  onQtyChange: (productId: string, value: string, product: Product) => void;
  onNoteChange: (productId: string, value: string) => void;
  onClearRow: (productId: string) => void;
}) => {
  return (
    <TableRow>
      <TableCell>{product.sku}</TableCell>
      <TableCell>{product.erp_id || '-'}</TableCell>
      <TableCell align="right">{product.ctn_pcs}</TableCell>
      <TableCell>
        <TextField
          size="small"
          type="number"
          value={input.qty}
          onChange={(e) => onQtyChange(product._id, e.target.value, product)}
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
          size="small"
          value={input.note}
          onChange={(e) => onNoteChange(product._id, e.target.value)}
          multiline
          rows={1}
          sx={{ width: '150px' }}
        />
      </TableCell>
      <TableCell align="center">
        <IconButton
          size="small"
          onClick={() => onClearRow(product._id)}
          color="error"
          title="Clear row"
        >
          <ClearIcon fontSize="small" />
        </IconButton>
      </TableCell>
    </TableRow>
  );
});

ProductRow.displayName = 'ProductRow';

const RequisitionsPage: React.FC = () => {
  const router = useRouter();
  const { user, isLoading: authLoading } = useAuth();

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [categoryGroups, setCategoryGroups] = useState<CategoryGroup[]>([]);
  const [productInputs, setProductInputs] = useState<Record<string, ProductInput>>({});
  const [previewOpen, setPreviewOpen] = useState(false);
  const [expandedPanel, setExpandedPanel] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [requisitionDate, setRequisitionDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [facilityName, setFacilityName] = useState<string>('');
  const [lastCreatedRequisitionNo, setLastCreatedRequisitionNo] = useState<string>('');
  const itemsPerPage = 5;

  // Check if user has required permissions
  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.push('/login');
      return;
    }

    const validRoles = ['Inventory Factory', 'Inventory Depot'];
    if (!validRoles.includes(user.role.role)) {
      toast.error('Access denied. Inventory role required.');
      router.push('/dashboard');
      return;
    }
  }, [user, authLoading, router]);

  // Load facility name
  const loadFacilityName = useCallback(async () => {
    // For Inventory Depot users, use facility_id (ObjectId reference)
    // For Production users, use factory_store_id (might be string or ObjectId)
    const facilityId = user?.context.facility_id || user?.context.factory_store_id;
    
    if (!facilityId) {
      setFacilityName('Not Assigned');
      return;
    }
    
    // Check if it's already a string name (not an ObjectId)
    // ObjectIds are 24 hex characters, facility names are longer and contain spaces
    if (typeof facilityId === 'string' && (facilityId.length !== 24 || facilityId.includes(' '))) {
      setFacilityName(facilityId);
      return;
    }
    
    try {
      const res = await api.get(`/facilities/${facilityId}`);
      setFacilityName(res.data.data?.name || facilityId);
    } catch (error) {
      console.error('Error loading facility name:', error);
      setFacilityName(facilityId);
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
        group.products.forEach((product: Product) => {
          initialInputs[product._id] = {
            product_id: product._id,
            qty: '',
            qty_pcs: 0,
            weight_mt: 0,
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
    if (!authLoading && user) {
      loadProducts();
      loadFacilityName();
    }
  }, [user, authLoading, loadProducts, loadFacilityName]);

  // Handle quantity change
  const handleQtyChange = useCallback((productId: string, value: string, product: Product) => {
    const qtyCtn = parseFloat(value) || 0;
    const qtyPcs = qtyCtn * product.ctn_pcs;
    const weightMt = (qtyCtn * product.ctn_pcs * product.wt_pcs) / 1000;

    setProductInputs((prev) => ({
      ...prev,
      [productId]: {
        ...prev[productId],
        qty: value,
        qty_pcs: qtyPcs,
        weight_mt: weightMt,
      },
    }));
  }, []);

  // Handle note change
  const handleNoteChange = useCallback((productId: string, value: string) => {
    setProductInputs((prev) => ({
      ...prev,
      [productId]: {
        ...prev[productId],
        note: value,
      },
    }));
  }, []);

  // Clear a product row
  const handleClearRow = useCallback((productId: string) => {
    setProductInputs((prev) => ({
      ...prev,
      [productId]: {
        product_id: productId,
        qty: '',
        qty_pcs: 0,
        weight_mt: 0,
        note: '',
      },
    }));
  }, []);

  // Handle accordion change
  const handleAccordionChange = (panel: string) => {
    setExpandedPanel(expandedPanel === panel ? null : panel);
  };

  // Handle page change
  const handlePageChange = (_: React.ChangeEvent<unknown>, value: number) => {
    setCurrentPage(value);
    setExpandedPanel(null);
  };

  // Get products with data
  const productsWithData = useMemo(() => {
    return Object.entries(productInputs)
      .filter(([_, input]) => parseFloat(input.qty) > 0)
      .map(([productId, input]) => {
        let product: Product | undefined;
        for (const group of categoryGroups) {
          const found = group.products.find((p) => p._id === productId);
          if (found) {
            product = found;
            break;
          }
        }
        return { ...input, product };
      });
  }, [productInputs, categoryGroups]);

  // Pagination
  const totalPages = Math.ceil(categoryGroups.length / itemsPerPage);
  const paginatedGroups = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return categoryGroups.slice(startIndex, startIndex + itemsPerPage);
  }, [categoryGroups, currentPage, itemsPerPage]);

  // Validate requisition
  const validateRequisition = (): string[] => {
    const errors: string[] = [];

    if (productsWithData.length === 0) {
      errors.push('Please add at least one product with quantity');
    }

    if (!requisitionDate) {
      errors.push('Please select a requisition date');
    }

    productsWithData.forEach(({ product, qty }) => {
      if (!product) return;
      const qtyNum = parseFloat(qty);
      if (isNaN(qtyNum) || qtyNum <= 0) {
        errors.push(`${product.name}: Invalid quantity`);
      }
    });

    return errors;
  };

  // Preview requisition
  const handlePreview = () => {
    const errors = validateRequisition();
    if (errors.length > 0) {
      errors.forEach((err) => toast.error(err));
      return;
    }
    setPreviewOpen(true);
  };

  // Submit requisition
  const handleSubmit = async () => {
    const errors = validateRequisition();
    if (errors.length > 0) {
      errors.forEach((err) => toast.error(err));
      return;
    }

    try {
      setSubmitting(true);

      const details = productsWithData.map(({ product_id, qty, note }) => ({
        product_id,
        qty: parseFloat(qty),
        note: note || '',
      }));

      const payload = {
        requisition_date: new Date(requisitionDate).toISOString(),
        details,
      };

      const response = await api.post('/inventory/requisitions', payload);

      if (response.data.success) {
        const requisitionNo = response.data.data.requisition_no;
        setLastCreatedRequisitionNo(requisitionNo);
        
        toast.success(
          `Requisition ${requisitionNo} created successfully!`
        );
        
        // Reset form
        const resetInputs: Record<string, ProductInput> = {};
        categoryGroups.forEach((group) => {
          group.products.forEach((product) => {
            resetInputs[product._id] = {
              product_id: product._id,
              qty: '',
              qty_pcs: 0,
              weight_mt: 0,
              note: '',
            };
          });
        });
        setProductInputs(resetInputs);
        setRequisitionDate(new Date().toISOString().split('T')[0]);
        setPreviewOpen(false);
      }
    } catch (error: any) {
      console.error('Error submitting requisition:', error);
      toast.error(
        error.response?.data?.message || 'Failed to create requisition'
      );
    } finally {
      setSubmitting(false);
    }
  };

  if (authLoading || loading) {
    return (
      <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
          <CircularProgress />
        </Box>
      </Container>
    );
  }

  return (
    <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
      {/* Header */}
      <Paper elevation={3} sx={{ p: 3, mb: 3 }}>
        <Box sx={{ mb: 3 }}>
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
            <Typography variant="h4">Create Requisition</Typography>
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

        {/* Facility and Date Info */}
        <Box display="flex" gap={2} flexWrap="wrap" mb={2} alignItems="center">
          <Chip
            label={`From Facility: ${facilityName}`}
            color="primary"
            variant="outlined"
          />
          <TextField
            label="Requisition Date"
            type="date"
            value={requisitionDate}
            onChange={(e) => setRequisitionDate(e.target.value)}
            InputLabelProps={{ shrink: true }}
            size="small"
            sx={{ minWidth: 200 }}
          />
          {lastCreatedRequisitionNo && (
            <Chip
              label={`Last Created: ${lastCreatedRequisitionNo}`}
              color="success"
              variant="filled"
            />
          )}
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
              (p) => parseFloat(productInputs[p._id]?.qty || '0') > 0
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
                      <Chip label="Has Data" color="success" size="small" />
                    )}
                  </Box>
                </AccordionSummary>
                <AccordionDetails>
                  <TableContainer>
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell sx={{ fontWeight: 'bold' }}>SKU</TableCell>
                          <TableCell sx={{ fontWeight: 'bold' }}>ERP ID</TableCell>
                          <TableCell align="right" sx={{ fontWeight: 'bold' }}>CTN/PCs</TableCell>
                          <TableCell sx={{ fontWeight: 'bold' }}>Qty (CTN)</TableCell>
                          <TableCell align="right" sx={{ fontWeight: 'bold' }}>Qty (PCs)</TableCell>
                          <TableCell align="right" sx={{ fontWeight: 'bold' }}>Wt (MT)</TableCell>
                          <TableCell sx={{ fontWeight: 'bold' }}>Note</TableCell>
                          <TableCell align="center" sx={{ fontWeight: 'bold' }}>Action</TableCell>
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
                              onQtyChange={handleQtyChange}
                              onNoteChange={handleNoteChange}
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
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          <Box display="flex" alignItems="center" justifyContent="space-between">
            <Typography variant="h6">Preview Requisition</Typography>
            <IconButton
              onClick={() => setPreviewOpen(false)}
              disabled={submitting}
            >
              <CloseIcon />
            </IconButton>
          </Box>
        </DialogTitle>
        <DialogContent dividers>
          <Box sx={{ mb: 2 }}>
            <Typography variant="body1">
              <strong>From Facility:</strong> {facilityName}
            </Typography>
            <Typography variant="body1">
              <strong>Requisition Date:</strong>{' '}
              {new Date(requisitionDate).toLocaleDateString()}
            </Typography>
            <Typography variant="body1">
              <strong>Total Products:</strong> {productsWithData.length}
            </Typography>
          </Box>

          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell sx={{ fontWeight: 'bold' }}>SKU</TableCell>
                  <TableCell sx={{ fontWeight: 'bold' }}>ERP ID</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 'bold' }}>Qty (CTN)</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 'bold' }}>Qty (PCs)</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 'bold' }}>Wt (MT)</TableCell>
                  <TableCell sx={{ fontWeight: 'bold' }}>Note</TableCell>
                  <TableCell align="center" sx={{ fontWeight: 'bold' }}>Action</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {productsWithData.map(({ product, product_id, qty, qty_pcs, weight_mt, note }) => {
                  if (!product) return null;
                  return (
                    <TableRow key={product_id}>
                      <TableCell>{product.sku}</TableCell>
                      <TableCell>{product.erp_id || '-'}</TableCell>
                      <TableCell align="right">
                        {parseFloat(qty).toFixed(2)}
                      </TableCell>
                      <TableCell align="right">
                        {qty_pcs.toFixed(2)}
                      </TableCell>
                      <TableCell align="right">
                        {weight_mt.toFixed(3)}
                      </TableCell>
                      <TableCell>{note || '-'}</TableCell>
                      <TableCell align="center">
                        <IconButton
                          size="small"
                          onClick={() => handleClearRow(product_id)}
                          color="error"
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
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPreviewOpen(false)} disabled={submitting}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            variant="contained"
            color="primary"
            disabled={submitting}
            startIcon={<SendIcon />}
          >
            {submitting ? 'Submitting...' : 'Submit Requisition'}
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default RequisitionsPage