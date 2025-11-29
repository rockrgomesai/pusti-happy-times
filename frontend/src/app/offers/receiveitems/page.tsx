'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'react-hot-toast';
import {
  Box,
  Paper,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  IconButton,
  Button,
  TextField,
  InputAdornment,
  CircularProgress,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Chip,
  Grid,
  Divider,
} from '@mui/material';
import {
  Visibility as VisibilityIcon,
  Search as SearchIcon,
  Refresh as RefreshIcon,
  CheckCircle as CheckCircleIcon,
  Close as CloseIcon,
  Store as StoreIcon,
} from '@mui/icons-material';
import { format } from 'date-fns';
import { apiClient } from '@/lib/api';

interface OfferProduct {
  product_id: {
    _id: string;
    sku: string;
    trade_price: number;
    wt_pcs: number;
  };
  qty_pcs: number | { $numberDecimal?: string };
  batch_no: string;
  production_date: string;
  expiry_date: string;
  note?: string;
}

interface OfferSend {
  _id: string;
  ref_no: string;
  depot_ids: Array<{
    _id: string;
    name: string;
  }>;
  products: OfferProduct[];
  status: string;
  send_date: string;
  created_at: string;
  created_by: {
    username: string;
  };
}

interface EditableProduct extends OfferProduct {
  qty_pcs_received: number;
  variance: number;
  variance_reason?: string;
}

export default function ReceiveItemsPage() {
  const router = useRouter();
  const { user, isLoading: authLoading } = useAuth();
  const [sends, setSends] = useState<OfferSend[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(20);
  const [totalCount, setTotalCount] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchInput, setSearchInput] = useState('');

  // Dialog state
  const [selectedSend, setSelectedSend] = useState<OfferSend | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [qualityCheckStatus, setQualityCheckStatus] = useState('passed');
  const [notes, setNotes] = useState('');
  const [receiving, setReceiving] = useState(false);
  
  // Editable product details
  const [editableProducts, setEditableProducts] = useState<EditableProduct[]>([]);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.push('/login');
      return;
    }

    if (user.role.role !== 'Inventory Depot') {
      toast.error('Access denied. Inventory Depot role required.');
      router.push('/dashboard');
      return;
    }
  }, [user, authLoading, router]);

  const fetchSends = async () => {
    setLoading(true);
    setError('');

    try {
      const response = await apiClient.get<{
        success: boolean;
        data: {
          sends: OfferSend[];
          total: number;
        };
      }>('/offers/receive-items/pending', {
        page: page + 1,
        limit: rowsPerPage,
        search: searchTerm,
      });

      if (response.success) {
        setSends(response.data.sends);
        setTotalCount(response.data.total);
      }
    } catch (err: any) {
      console.error('Error fetching pending sends:', err);
      setError(err.response?.data?.message || 'Failed to fetch pending offer sends');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!authLoading && user?.role?.role === 'Inventory Depot') {
      fetchSends();
    }
  }, [page, rowsPerPage, searchTerm, authLoading, user]);

  const handleSearch = () => {
    setSearchTerm(searchInput);
    setPage(0);
  };

  const handleRefresh = () => {
    setSearchInput('');
    setSearchTerm('');
    setPage(0);
    fetchSends();
  };

  const handleChangePage = (_event: unknown, newPage: number) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const getQtyValue = (qty: any): number => {
    if (qty && typeof qty === 'object' && '$numberDecimal' in qty) {
      return parseFloat(qty.$numberDecimal || '0');
    } else if (typeof qty === 'number') {
      return qty;
    } else if (typeof qty === 'string') {
      return parseFloat(qty);
    }
    return 0;
  };

  const getTotalQuantity = (products: OfferProduct[]) => {
    return products.reduce((sum, product) => {
      return sum + getQtyValue(product.qty_pcs);
    }, 0).toFixed(0);
  };

  const handleViewDetails = (send: OfferSend) => {
    setSelectedSend(send);
    // Initialize editable products with sent quantities as received quantities
    setEditableProducts(send.products.map(product => ({
      ...product,
      qty_pcs_received: getQtyValue(product.qty_pcs),
      variance: 0,
      variance_reason: '',
    })));
    setQualityCheckStatus('passed');
    setNotes('');
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setSelectedSend(null);
    setEditableProducts([]);
    setQualityCheckStatus('passed');
    setNotes('');
  };
  
  const updateProductField = (index: number, field: keyof EditableProduct, value: any) => {
    setEditableProducts(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      
      // Auto-calculate variance when qty_pcs_received changes
      if (field === 'qty_pcs_received') {
        const sentQty = getQtyValue(updated[index].qty_pcs);
        updated[index].variance = value - sentQty;
      }
      
      return updated;
    });
  };
  
  const getEditableTotalQuantity = (): string => {
    const total = editableProducts.reduce((sum, product) => sum + product.qty_pcs_received, 0);
    return total.toFixed(0);
  };

  const getEditableTotalWeight = (): string => {
    const total = editableProducts.reduce((sum, product) => {
      const wt = product.product_id?.wt_pcs || 0;
      return sum + (product.qty_pcs_received * wt / 1000);
    }, 0);
    return total.toFixed(3);
  };

  const handleReceive = async () => {
    if (!selectedSend) return;

    setReceiving(true);
    setError('');
    setSuccess('');

    try {
      // Prepare products with received quantities and variance
      const productsToReceive = editableProducts.map(product => ({
        product_id: product.product_id._id,
        qty_pcs_sent: getQtyValue(product.qty_pcs),
        qty_pcs_received: product.qty_pcs_received,
        variance: product.variance,
        variance_reason: product.variance_reason || '',
        note: product.note || '',
      }));

      const response = await apiClient.post<{
        success: boolean;
        message: string;
      }>(`/offers/receive-items/${selectedSend._id}`, {
        quality_check_status: qualityCheckStatus,
        general_note: notes || undefined,
        products: productsToReceive,
      });

      if (response.success) {
        setSuccess(response.message || 'Offer products received successfully');
        toast.success('Offer products received successfully');
        handleCloseDialog();
        
        // Refresh list after a short delay
        setTimeout(() => {
          fetchSends();
          setSuccess('');
        }, 2000);
      }
    } catch (err: any) {
      console.error('Error receiving offer products:', err);
      const errorMsg = err.response?.data?.message || 'Failed to receive offer products';
      setError(errorMsg);
      toast.error(errorMsg);
    } finally {
      setReceiving(false);
    }
  };

  return (
    <Box sx={{ p: { xs: 2, md: 3 } }}>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3, flexWrap: 'wrap', gap: 2 }}>
        <Typography variant="h4" component="h1" sx={{ fontSize: { xs: '1.5rem', md: '2.125rem' } }}>
          Receive Offer Items
        </Typography>
        <IconButton onClick={handleRefresh} color="primary" disabled={loading}>
          <RefreshIcon />
        </IconButton>
      </Box>

      {/* Alerts */}
      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}

      {success && (
        <Alert severity="success" sx={{ mb: 3 }} onClose={() => setSuccess('')}>
          {success}
        </Alert>
      )}

      {/* Search */}
      <Paper sx={{ mb: 3, p: 2 }}>
        <TextField
          fullWidth
          placeholder="Search by reference number or batch number..."
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon />
              </InputAdornment>
            ),
            endAdornment: searchInput && (
              <InputAdornment position="end">
                <Button size="small" onClick={handleSearch}>
                  Search
                </Button>
              </InputAdornment>
            ),
          }}
        />
      </Paper>

      {/* Table */}
      <TableContainer component={Paper} sx={{ overflowX: 'auto' }}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Reference</TableCell>
              <TableCell>Depots</TableCell>
              <TableCell align="right">Products</TableCell>
              <TableCell align="right">Total Qty (PCs)</TableCell>
              <TableCell>Created By</TableCell>
              <TableCell>Send Date</TableCell>
              <TableCell align="center">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={8} align="center">
                  <CircularProgress sx={{ my: 3 }} />
                </TableCell>
              </TableRow>
            ) : sends.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} align="center">
                  <Typography variant="body2" color="text.secondary" sx={{ py: 3 }}>
                    No pending offer sends found for your depot
                  </Typography>
                </TableCell>
              </TableRow>
            ) : (
              sends.map((send) => (
                <TableRow key={send._id} hover>
                  <TableCell>
                    <Typography variant="body2" fontWeight="bold">
                      {send.ref_no}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                      {send.depot_ids.slice(0, 2).map((depot) => (
                        <Chip
                          key={depot._id}
                          label={depot.name}
                          size="small"
                          icon={<StoreIcon />}
                        />
                      ))}
                      {send.depot_ids.length > 2 && (
                        <Chip
                          label={`+${send.depot_ids.length - 2}`}
                          size="small"
                          variant="outlined"
                        />
                      )}
                    </Box>
                  </TableCell>
                  <TableCell align="right">{send.products.length}</TableCell>
                  <TableCell align="right">{getTotalQuantity(send.products)}</TableCell>
                  <TableCell>{send.created_by?.username || 'N/A'}</TableCell>
                  <TableCell>
                    {format(new Date(send.send_date), 'dd/MM/yyyy HH:mm')}
                  </TableCell>
                  <TableCell align="center">
                    <Button
                      variant="contained"
                      size="small"
                      startIcon={<CheckCircleIcon />}
                      onClick={() => handleViewDetails(send)}
                      color="primary"
                    >
                      Receive
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
        <TablePagination
          component="div"
          count={totalCount}
          page={page}
          onPageChange={handleChangePage}
          rowsPerPage={rowsPerPage}
          onRowsPerPageChange={handleChangeRowsPerPage}
          rowsPerPageOptions={[10, 20, 50, 100]}
        />
      </TableContainer>

      {/* Receive Dialog */}
      <Dialog 
        open={dialogOpen} 
        onClose={handleCloseDialog} 
        maxWidth="lg" 
        fullWidth
        fullScreen={window.innerWidth < 900}
      >
        <DialogTitle>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="h6">Receive Offer Products</Typography>
            <IconButton onClick={handleCloseDialog} size="small">
              <CloseIcon />
            </IconButton>
          </Box>
        </DialogTitle>
        <DialogContent dividers>
          {selectedSend && (
            <Box>
              {/* Send Info */}
              <Box sx={{ mb: 3, p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
                <Grid container spacing={2}>
                  <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                    <Typography variant="caption" color="text.secondary">
                      Reference Number
                    </Typography>
                    <Typography variant="body2" fontWeight="bold">
                      {selectedSend.ref_no}
                    </Typography>
                  </Grid>
                  <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                    <Typography variant="caption" color="text.secondary">
                      Created By
                    </Typography>
                    <Typography variant="body2">{selectedSend.created_by?.username || 'N/A'}</Typography>
                  </Grid>
                  <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                    <Typography variant="caption" color="text.secondary">
                      Send Date
                    </Typography>
                    <Typography variant="body2">
                      {format(new Date(selectedSend.send_date), 'dd/MM/yyyy HH:mm')}
                    </Typography>
                  </Grid>
                  <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                    <Typography variant="caption" color="text.secondary">
                      Total Depots
                    </Typography>
                    <Typography variant="body2">{selectedSend.depot_ids.length}</Typography>
                  </Grid>
                </Grid>
              </Box>

              <Box sx={{ mb: 3, p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
                <Typography variant="subtitle2" gutterBottom>
                  <strong>Target Depots:</strong>
                </Typography>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                  {selectedSend.depot_ids.map((depot) => (
                    <Chip
                      key={depot._id}
                      label={depot.name}
                      size="small"
                      icon={<StoreIcon />}
                      color="primary"
                    />
                  ))}
                </Box>
              </Box>

              {/* Product Details Table */}
              <Typography variant="subtitle1" fontWeight="bold" sx={{ mb: 1 }}>
                Product Details ({editableProducts.length} items)
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Verify and update received quantities. Variance will be calculated automatically.
              </Typography>
              <TableContainer sx={{ mb: 3, maxHeight: 500, overflowX: 'auto' }}>
                <Table size="small" stickyHeader>
                  <TableHead>
                    <TableRow>
                      <TableCell>SKU</TableCell>
                      <TableCell align="right">Price</TableCell>
                      <TableCell align="right">Sent Qty (PCs)</TableCell>
                      <TableCell>Received Qty (PCs)</TableCell>
                      <TableCell align="right">Variance</TableCell>
                      <TableCell>Variance Reason</TableCell>
                      <TableCell>Note</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {editableProducts.map((product, index) => {
                      const sentQty = getQtyValue(product.qty_pcs);
                      const wtPcs = product.product_id?.wt_pcs || 0;
                      const weightMt = (product.qty_pcs_received * wtPcs) / 1000;
                      
                      return (
                        <TableRow key={index}>
                          <TableCell>{product.product_id?.sku || 'N/A'}</TableCell>
                          <TableCell align="right">{product.product_id?.trade_price?.toFixed(2) || '0.00'}</TableCell>
                          <TableCell align="right">
                            <Typography variant="body2" fontWeight="bold">
                              {sentQty.toFixed(0)}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <TextField
                              type="number"
                              size="small"
                              value={product.qty_pcs_received}
                              onChange={(e) => updateProductField(index, 'qty_pcs_received', parseFloat(e.target.value) || 0)}
                              inputProps={{ min: 0, step: 1 }}
                              sx={{ width: '100px' }}
                            />
                          </TableCell>
                          <TableCell align="right">
                            <Chip
                              label={product.variance.toFixed(0)}
                              color={product.variance === 0 ? 'success' : product.variance > 0 ? 'info' : 'warning'}
                              size="small"
                            />
                          </TableCell>
                          <TableCell>
                            <TextField
                              size="small"
                              value={product.variance_reason || ''}
                              onChange={(e) => updateProductField(index, 'variance_reason', e.target.value)}
                              placeholder={product.variance !== 0 ? 'Required' : 'Optional'}
                              multiline
                              rows={1}
                              sx={{ width: '150px' }}
                              error={product.variance !== 0 && !product.variance_reason}
                            />
                          </TableCell>
                          <TableCell>
                            <TextField
                              size="small"
                              value={product.note || ''}
                              onChange={(e) => updateProductField(index, 'note', e.target.value)}
                              multiline
                              rows={1}
                              sx={{ width: '150px' }}
                            />
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </TableContainer>

              {/* Summary */}
              <Box sx={{ mb: 3, p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
                <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
                  Summary
                </Typography>
                <Grid container spacing={2}>
                  <Grid size={{ xs: 12, sm: 4 }}>
                    <Typography variant="body2">
                      <strong>Total Products:</strong> {editableProducts.length}
                    </Typography>
                  </Grid>
                  <Grid size={{ xs: 12, sm: 4 }}>
                    <Typography variant="body2">
                      <strong>Total Quantity Received:</strong> {getEditableTotalQuantity()} PCs
                    </Typography>
                  </Grid>
                  <Grid size={{ xs: 12, sm: 4 }}>
                    <Typography variant="body2">
                      <strong>Total Weight:</strong> {getEditableTotalWeight()} MT
                    </Typography>
                  </Grid>
                </Grid>
              </Box>

              <Divider sx={{ my: 2 }} />

              {/* Receiving Information */}
              <Typography variant="subtitle1" fontWeight="bold" sx={{ mb: 2 }}>
                Receiving Information
              </Typography>
              <Grid container spacing={2}>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <TextField
                    fullWidth
                    select
                    label="Quality Check Status"
                    value={qualityCheckStatus}
                    onChange={(e) => setQualityCheckStatus(e.target.value)}
                    SelectProps={{ native: true }}
                  >
                    <option value="passed">Passed</option>
                    <option value="failed">Failed</option>
                    <option value="partial">Partial</option>
                  </TextField>
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <TextField
                    fullWidth
                    multiline
                    rows={3}
                    label="Notes (Optional)"
                    placeholder="Any remarks about the received goods..."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                  />
                </Grid>
              </Grid>
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={handleCloseDialog} disabled={receiving}>
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={handleReceive}
            disabled={receiving || editableProducts.some(p => p.variance !== 0 && !p.variance_reason)}
            startIcon={receiving ? <CircularProgress size={20} /> : <CheckCircleIcon />}
          >
            {receiving ? 'Receiving...' : 'Confirm Receipt'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
