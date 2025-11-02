'use client';

import React, { useState, useEffect } from 'react';
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
  Grid as Grid2,
  Divider,
} from '@mui/material';
import {
  Visibility as VisibilityIcon,
  Search as SearchIcon,
  Refresh as RefreshIcon,
  CheckCircle as CheckCircleIcon,
  Close as CloseIcon,
} from '@mui/icons-material';
import { format } from 'date-fns';
import {
  getPendingReceipts,
  receiveFromProduction,
  getQtyValue,
  calculateTotalQuantity,
  type PendingShipment,
  type ProductDetail,
} from '@/lib/inventoryApi';

export default function ReceiveFromProductionPage() {
  const [shipments, setShipments] = useState<PendingShipment[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(20);
  const [totalCount, setTotalCount] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchInput, setSearchInput] = useState('');

  // Dialog state
  const [selectedShipment, setSelectedShipment] = useState<PendingShipment | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [location, setLocation] = useState('');
  const [notes, setNotes] = useState('');
  const [receiving, setReceiving] = useState(false);
  
  // Editable product details
  const [editableDetails, setEditableDetails] = useState<ProductDetail[]>([]);

  // Fetch shipments
  const fetchShipments = async () => {
    setLoading(true);
    setError('');

    try {
      const response = await getPendingReceipts(page + 1, rowsPerPage, searchTerm);
      setShipments(response.data.shipments);
      setTotalCount(response.data.pagination.total);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to fetch pending receipts');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchShipments();
  }, [page, rowsPerPage, searchTerm]);

  const handleSearch = () => {
    setSearchTerm(searchInput);
    setPage(0);
  };

  const handleRefresh = () => {
    setSearchInput('');
    setSearchTerm('');
    setPage(0);
    fetchShipments();
  };

  const handleChangePage = (event: unknown, newPage: number) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  // Open receive dialog
  const handleViewDetails = (shipment: PendingShipment) => {
    setSelectedShipment(shipment);
    // Create editable copies of the product details
    setEditableDetails(shipment.details.map(detail => ({ ...detail })));
    setLocation('');
    setNotes('');
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setSelectedShipment(null);
    setEditableDetails([]);
    setLocation('');
    setNotes('');
  };
  
  // Update editable detail field
  const updateDetailField = (index: number, field: keyof ProductDetail, value: any) => {
    setEditableDetails(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };
  
  // Calculate total from editable details
  const getEditableTotalQuantity = (): string => {
    const total = editableDetails.reduce((sum, detail) => {
      const qty = typeof detail.qty === 'number' ? detail.qty : getQtyValue(detail.qty);
      return sum + qty;
    }, 0);
    return total.toFixed(2);
  };

  // Receive goods
  const handleReceive = async () => {
    if (!selectedShipment) return;

    setReceiving(true);
    setError('');
    setSuccess('');

    try {
      // Normalize quantities to numbers before sending
      const normalizedDetails = editableDetails.map(detail => ({
        ...detail,
        qty: typeof detail.qty === 'number' ? detail.qty : getQtyValue(detail.qty)
      }));

      const response = await receiveFromProduction({
        shipment_id: selectedShipment._id,
        location: location || undefined,
        notes: notes || undefined,
        details: normalizedDetails, // Send normalized details with numeric quantities
      });

      setSuccess(response.message);
      handleCloseDialog();
      
      // Refresh list
      setTimeout(() => {
        fetchShipments();
        setSuccess('');
      }, 2000);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to receive goods');
    } finally {
      setReceiving(false);
    }
  };

  const getTotalQuantity = (details: ProductDetail[]): string => {
    const total = calculateTotalQuantity(details);
    return total.toFixed(2);
  };

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" component="h1">
          Receive from Production
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
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Reference</TableCell>
              <TableCell>From (Factory)</TableCell>
              <TableCell align="right">Products</TableCell>
              <TableCell align="right">Total Qty (Ctn)</TableCell>
              <TableCell>Created By</TableCell>
              <TableCell>Date</TableCell>
              <TableCell align="center">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={7} align="center">
                  <CircularProgress sx={{ my: 3 }} />
                </TableCell>
              </TableRow>
            ) : shipments.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} align="center">
                  <Typography variant="body2" color="text.secondary" sx={{ py: 3 }}>
                    No pending shipments found
                  </Typography>
                </TableCell>
              </TableRow>
            ) : (
              shipments.map((shipment) => (
                <TableRow key={shipment._id} hover>
                  <TableCell>
                    <Typography variant="body2" fontWeight="bold">
                      {shipment.ref}
                    </Typography>
                  </TableCell>
                  <TableCell>{shipment.facility_id?.name || 'N/A'}</TableCell>
                  <TableCell align="right">{shipment.details.length}</TableCell>
                  <TableCell align="right">{getTotalQuantity(shipment.details)}</TableCell>
                  <TableCell>{shipment.user_id?.username || 'N/A'}</TableCell>
                  <TableCell>
                    {format(new Date(shipment.created_at), 'dd/MM/yyyy HH:mm')}
                  </TableCell>
                  <TableCell align="center">
                    <Button
                      variant="contained"
                      size="small"
                      startIcon={<CheckCircleIcon />}
                      onClick={() => handleViewDetails(shipment)}
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
      <Dialog open={dialogOpen} onClose={handleCloseDialog} maxWidth="lg" fullWidth>
        <DialogTitle>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="h6">Preview Shipment - Receive Goods</Typography>
            <IconButton onClick={handleCloseDialog} size="small">
              <CloseIcon />
            </IconButton>
          </Box>
        </DialogTitle>
        <DialogContent dividers>
          {selectedShipment && (
            <Box>
              {/* Shipment Info */}
              <Box sx={{ mb: 3, p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
                <Grid2 container spacing={2}>
                  <Grid2 size={{ xs: 12, sm: 6, md: 3 }}>
                    <Typography variant="caption" color="text.secondary">
                      Reference Number
                    </Typography>
                    <Typography variant="body2" fontWeight="bold">
                      {selectedShipment.ref}
                    </Typography>
                  </Grid2>
                  <Grid2 size={{ xs: 12, sm: 6, md: 3 }}>
                    <Typography variant="caption" color="text.secondary">
                      From (Factory)
                    </Typography>
                    <Typography variant="body2">{selectedShipment.facility_id?.name || 'N/A'}</Typography>
                  </Grid2>
                  <Grid2 size={{ xs: 12, sm: 6, md: 3 }}>
                    <Typography variant="caption" color="text.secondary">
                      Created By
                    </Typography>
                    <Typography variant="body2">{selectedShipment.user_id?.username || 'N/A'}</Typography>
                  </Grid2>
                  <Grid2 size={{ xs: 12, sm: 6, md: 3 }}>
                    <Typography variant="caption" color="text.secondary">
                      Date
                    </Typography>
                    <Typography variant="body2">
                      {format(new Date(selectedShipment.created_at), 'dd/MM/yyyy HH:mm')}
                    </Typography>
                  </Grid2>
                </Grid2>
              </Box>

              {/* Product Details Table */}
              <Typography variant="subtitle1" fontWeight="bold" sx={{ mb: 1 }}>
                Product Details ({editableDetails.length} items)
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Edit quantities and details if different from what was sent
              </Typography>
              <TableContainer sx={{ mb: 3, maxHeight: 500 }}>
                <Table size="small" stickyHeader>
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
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {editableDetails.map((detail, index) => {
                      const qty = typeof detail.qty === 'number' ? detail.qty : getQtyValue(detail.qty);
                      const productInfo = typeof detail.product_id === 'string' ? null : detail.product_id;
                      
                      // Calculate Qty (PCs) and Wt (MT)
                      const ctnPcs = productInfo?.ctn_pcs || 0;
                      const wtPcs = productInfo?.wt_pcs || 0;
                      const qtyPcs = qty * ctnPcs;
                      const weightMt = (qty * ctnPcs * wtPcs) / 1000000; // Convert to MT
                      
                      return (
                        <TableRow key={index}>
                          <TableCell>{productInfo?.sku || 'N/A'}</TableCell>
                          <TableCell>{productInfo?.erp_id || '-'}</TableCell>
                          <TableCell align="right">{ctnPcs}</TableCell>
                          <TableCell>
                            <TextField
                              type="number"
                              size="small"
                              value={qty}
                              onChange={(e) => updateDetailField(index, 'qty', parseFloat(e.target.value) || 0)}
                              inputProps={{ min: 0, step: 0.01 }}
                              sx={{ width: '100px' }}
                            />
                          </TableCell>
                          <TableCell align="right">
                            <Typography variant="body2">
                              {qtyPcs.toFixed(2)}
                            </Typography>
                          </TableCell>
                          <TableCell align="right">
                            <Typography variant="body2">
                              {weightMt.toFixed(3)}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <TextField
                              type="date"
                              size="small"
                              value={format(new Date(detail.production_date), 'yyyy-MM-dd')}
                              onChange={(e) => updateDetailField(index, 'production_date', e.target.value)}
                              InputLabelProps={{ shrink: true }}
                              sx={{ width: '160px' }}
                            />
                          </TableCell>
                          <TableCell>
                            <TextField
                              type="date"
                              size="small"
                              value={format(new Date(detail.expiry_date), 'yyyy-MM-dd')}
                              onChange={(e) => updateDetailField(index, 'expiry_date', e.target.value)}
                              InputLabelProps={{ shrink: true }}
                              sx={{ width: '160px' }}
                            />
                          </TableCell>
                          <TableCell>
                            <TextField
                              size="small"
                              value={detail.batch_no}
                              onChange={(e) => updateDetailField(index, 'batch_no', e.target.value)}
                              sx={{ width: '120px' }}
                            />
                          </TableCell>
                          <TableCell>
                            <TextField
                              size="small"
                              value={detail.note || ''}
                              onChange={(e) => updateDetailField(index, 'note', e.target.value)}
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
                <Grid2 container spacing={2}>
                  <Grid2 size={{ xs: 12, sm: 6 }}>
                    <Typography variant="body2">
                      <strong>Total Products:</strong> {editableDetails.length}
                    </Typography>
                  </Grid2>
                  <Grid2 size={{ xs: 12, sm: 6 }}>
                    <Typography variant="body2">
                      <strong>Total Quantity:</strong> {getEditableTotalQuantity()} CTN
                    </Typography>
                  </Grid2>
                </Grid2>
              </Box>

              <Divider sx={{ my: 2 }} />

              {/* Receiving Information */}
              <Typography variant="subtitle1" fontWeight="bold" sx={{ mb: 2 }}>
                Receiving Information
              </Typography>
              <Grid2 container spacing={2}>
                <Grid2 size={{ xs: 12, sm: 6 }}>
                  <TextField
                    fullWidth
                    label="Storage Location (Optional)"
                    placeholder="e.g., Rack A-12, Bin 5"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    helperText="Specify where these goods will be stored"
                  />
                </Grid2>
                <Grid2 size={{ xs: 12, sm: 6 }}>
                  <TextField
                    fullWidth
                    multiline
                    rows={3}
                    label="Notes (Optional)"
                    placeholder="Any remarks about the received goods..."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                  />
                </Grid2>
              </Grid2>
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
            disabled={receiving}
            startIcon={receiving ? <CircularProgress size={20} /> : <CheckCircleIcon />}
          >
            {receiving ? 'Receiving...' : 'Confirm Receipt'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
