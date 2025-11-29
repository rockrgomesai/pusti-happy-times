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
  Chip,
  TextField,
  InputAdornment,
  CircularProgress,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Grid,
  Divider,
} from '@mui/material';
import {
  Visibility as VisibilityIcon,
  Search as SearchIcon,
  Refresh as RefreshIcon,
  Close as CloseIcon,
  Download as DownloadIcon,
  PictureAsPdf as PdfIcon,
  Store as StoreIcon,
} from '@mui/icons-material';
import { format } from 'date-fns';
import { apiClient } from '@/lib/api';

interface OfferReceiveProduct {
  product_id: {
    _id: string;
    sku: string;
    trade_price: number;
    wt_pcs: number;
  };
  qty_pcs_sent: number;
  qty_pcs_received: number;
  variance: number;
  variance_reason?: string;
  batch_no: string;
  production_date: string;
  expiry_date: string;
  note?: string;
}

interface OfferReceive {
  _id: string;
  ref_no: string;
  offer_send_id: {
    _id: string;
    ref_no: string;
  };
  depot_id: {
    _id: string;
    name: string;
  };
  products: OfferReceiveProduct[];
  quality_check_status: string;
  notes?: string;
  receive_date: string;
  received_by: {
    username: string;
  };
}

export default function ReceiveItemsListPage() {
  const router = useRouter();
  const { user, isLoading: authLoading } = useAuth();
  const [receives, setReceives] = useState<OfferReceive[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [searchTerm, setSearchTerm] = useState('');
  const [totalCount, setTotalCount] = useState(0);
  const [selectedReceive, setSelectedReceive] = useState<OfferReceive | null>(null);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);

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

  const fetchReceives = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await apiClient.get<{
        success: boolean;
        data: {
          receives: OfferReceive[];
          total: number;
          page: number;
          limit: number;
        };
      }>('/offers/receive-items/history', {
        page: page + 1,
        limit: rowsPerPage,
        search: searchTerm,
      });

      if (response.success) {
        setReceives(response.data.receives);
        setTotalCount(response.data.total);
      }
    } catch (err) {
      console.error('Error fetching receive history:', err);
      setError('Failed to load receive history');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!authLoading && user?.role?.role === 'Inventory Depot') {
      fetchReceives();
    }
  }, [page, rowsPerPage, authLoading, user]);

  const handleSearch = () => {
    setPage(0);
    fetchReceives();
  };

  const handleChangePage = (_event: unknown, newPage: number) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const getQualityStatusColor = (status: string) => {
    switch (status) {
      case 'passed':
        return 'success';
      case 'failed':
        return 'error';
      case 'partial':
        return 'warning';
      default:
        return 'default';
    }
  };

  // Helper to get numeric value from Decimal128 or regular number
  const getNumericValue = (value: any): number => {
    if (value === null || value === undefined) return 0;
    if (typeof value === 'object' && value.$numberDecimal) {
      return parseFloat(value.$numberDecimal) || 0;
    }
    return parseFloat(value) || 0;
  };

  const getTotalQuantitySent = (products: OfferReceiveProduct[]) => {
    const total = products.reduce((sum, product) => sum + getNumericValue(product.qty_pcs_sent), 0);
    return total.toFixed(0);
  };

  const getTotalQuantityReceived = (products: OfferReceiveProduct[]) => {
    const total = products.reduce((sum, product) => sum + getNumericValue(product.qty_pcs_received), 0);
    return total.toFixed(0);
  };

  const getTotalVariance = (products: OfferReceiveProduct[]) => {
    const total = products.reduce((sum, product) => sum + getNumericValue(product.variance), 0);
    return total.toFixed(0);
  };

  const getTotalWeight = (products: OfferReceiveProduct[]) => {
    return products.reduce((sum, product) => {
      const wt = product.product_id?.wt_pcs || 0;
      return sum + (product.qty_pcs_received * wt / 1000);
    }, 0).toFixed(3);
  };

  const handleViewDetails = (receive: OfferReceive) => {
    setSelectedReceive(receive);
    setDetailDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDetailDialogOpen(false);
    setSelectedReceive(null);
  };

  const handleExportCSV = () => {
    if (!selectedReceive) return;

    const csvRows = [];
    csvRows.push(['Receive Reference', selectedReceive.ref_no].join(','));
    csvRows.push(['Offer Send Reference', selectedReceive.offer_send_id?.ref_no || 'N/A'].join(','));
    csvRows.push(['Depot', selectedReceive.depot_id?.name || 'N/A'].join(','));
    csvRows.push(['Received By', selectedReceive.received_by?.username || 'N/A'].join(','));
    csvRows.push(['Received At', selectedReceive.receive_date ? format(new Date(selectedReceive.receive_date), 'dd/MM/yyyy HH:mm') : '-'].join(','));
    csvRows.push(['Quality Check', selectedReceive.quality_check_status].join(','));
    csvRows.push(['Notes', selectedReceive.notes || '-'].join(','));
    csvRows.push('');
    
    csvRows.push(['SKU', 'Price', 'Sent (PCs)', 'Received (PCs)', 'Variance', 'Variance Reason', 'Note'].join(','));

    selectedReceive.products.forEach((product) => {
      const wt = (product.qty_pcs_received * (product.product_id?.wt_pcs || 0)) / 1000;
      const qtySent = getNumericValue(product.qty_pcs_sent);
      const qtyReceived = getNumericValue(product.qty_pcs_received);
      const variance = getNumericValue(product.variance);
      
      csvRows.push([
        product.product_id?.sku || 'N/A',
        product.product_id?.trade_price?.toFixed(2) || '0.00',
        qtySent.toFixed(0),
        qtyReceived.toFixed(0),
        variance.toFixed(0),
        product.variance_reason || '-',
        product.note || '-'
      ].join(','));
    });

    csvRows.push(['', 'Total:', getTotalQuantitySent(selectedReceive.products), getTotalQuantityReceived(selectedReceive.products), getTotalVariance(selectedReceive.products)].join(','));

    const csvContent = csvRows.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `offer_receive_${selectedReceive.ref_no}_${format(new Date(), 'yyyyMMdd')}.csv`;
    link.click();
  };

  const handleExportPDF = () => {
    if (!selectedReceive) return;

    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Offer Receive ${selectedReceive.ref_no}</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 20px; }
          h1 { color: #333; border-bottom: 2px solid #333; padding-bottom: 10px; }
          .info-grid { display: grid; grid-template-columns: 150px 1fr; gap: 10px; margin: 20px 0; }
          .info-label { font-weight: bold; }
          table { width: 100%; border-collapse: collapse; margin-top: 20px; }
          th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
          th { background-color: #f2f2f2; font-weight: bold; }
          .text-right { text-align: right; }
          .total-row { font-weight: bold; background-color: #f9f9f9; }
          @media print { body { padding: 0; } }
        </style>
      </head>
      <body>
        <h1>Offer Receive Details - ${selectedReceive.ref_no}</h1>
        
        <div class="info-grid">
          <div class="info-label">Offer Send Ref:</div>
          <div>${selectedReceive.offer_send_id?.ref_no || 'N/A'}</div>
          
          <div class="info-label">Depot:</div>
          <div>${selectedReceive.depot_id?.name || 'N/A'}</div>
          
          <div class="info-label">Received By:</div>
          <div>${selectedReceive.received_by?.username || 'N/A'}</div>
          
          <div class="info-label">Received At:</div>
          <div>${selectedReceive.receive_date ? format(new Date(selectedReceive.receive_date), 'dd/MM/yyyy HH:mm') : '-'}</div>
          
          <div class="info-label">Quality Check:</div>
          <div>${selectedReceive.quality_check_status}</div>
          
          <div class="info-label">Notes:</div>
          <div>${selectedReceive.notes || '-'}</div>
        </div>

        <h2>Product Details</h2>
        <table>
          <thead>
            <tr>
              <th>SKU</th>
              <th class="text-right">Price</th>
              <th class="text-right">Sent (PCs)</th>
              <th class="text-right">Received (PCs)</th>
              <th class="text-right">Variance</th>
              <th>Variance Reason</th>
              <th>Note</th>
            </tr>
          </thead>
          <tbody>
            ${selectedReceive.products.map((product) => {
              const qtySent = getNumericValue(product.qty_pcs_sent);
              const qtyReceived = getNumericValue(product.qty_pcs_received);
              const variance = getNumericValue(product.variance);
              const wt = (qtyReceived * (product.product_id?.wt_pcs || 0)) / 1000;
              
              return `
                <tr>
                  <td>${product.product_id?.sku || 'N/A'}</td>
                  <td class="text-right">${product.product_id?.trade_price?.toFixed(2) || '0.00'}</td>
                  <td class="text-right">${qtySent.toFixed(0)}</td>
                  <td class="text-right">${qtyReceived.toFixed(0)}</td>
                  <td class="text-right">${variance.toFixed(0)}</td>
                  <td>${product.variance_reason || '-'}</td>
                  <td>${product.note || '-'}</td>
                </tr>
              `;
            }).join('')}
            <tr class="total-row">
              <td colspan="2" class="text-right">Total:</td>
              <td class="text-right">${getTotalQuantitySent(selectedReceive.products)}</td>
              <td class="text-right">${getTotalQuantityReceived(selectedReceive.products)}</td>
              <td class="text-right">${getTotalVariance(selectedReceive.products)}</td>
              <td colspan="2"></td>
            </tr>
          </tbody>
        </table>

        <script>
          window.onload = function() { window.print(); }
        </script>
      </body>
      </html>
    `;

    printWindow.document.write(html);
    printWindow.document.close();
  };

  if (loading && receives.length === 0) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px' }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ p: { xs: 2, md: 3 } }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3, flexWrap: 'wrap', gap: 2 }}>
        <Typography variant="h4" component="h1" sx={{ fontSize: { xs: '1.5rem', md: '2.125rem' } }}>
          Received Offer Items
        </Typography>
        <IconButton onClick={fetchReceives} disabled={loading}>
          <RefreshIcon />
        </IconButton>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      <Paper sx={{ mb: 3, p: 2 }}>
        <TextField
          fullWidth
          placeholder="Search by reference number, batch number..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon />
              </InputAdornment>
            ),
          }}
        />
      </Paper>

      <TableContainer component={Paper} sx={{ overflowX: 'auto' }}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Receive Ref</TableCell>
              <TableCell>Offer Send Ref</TableCell>
              <TableCell>Depot</TableCell>
              <TableCell align="right">Products</TableCell>
              <TableCell align="right">Qty Received (PCs)</TableCell>
              <TableCell align="right">Variance</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Received By</TableCell>
              <TableCell>Received At</TableCell>
              <TableCell align="center">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {receives.length === 0 ? (
              <TableRow>
                <TableCell colSpan={10} align="center">
                  <Typography variant="body2" color="text.secondary" sx={{ py: 3 }}>
                    No received offer items found
                  </Typography>
                </TableCell>
              </TableRow>
            ) : (
              receives.map((receive) => (
                <TableRow key={receive._id} hover>
                  <TableCell>
                    <Typography variant="body2" fontWeight="bold">
                      {receive.ref_no}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2">
                      {receive.offer_send_id?.ref_no || 'N/A'}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={receive.depot_id?.name || 'N/A'}
                      size="small"
                      icon={<StoreIcon />}
                    />
                  </TableCell>
                  <TableCell align="right">{receive.products.length}</TableCell>
                  <TableCell align="right">{getTotalQuantityReceived(receive.products)}</TableCell>
                  <TableCell align="right">
                    <Chip
                      label={getTotalVariance(receive.products)}
                      color={parseInt(getTotalVariance(receive.products)) === 0 ? 'success' : 'warning'}
                      size="small"
                    />
                  </TableCell>
                  <TableCell>
                    <Chip
                      label="Received"
                      color="success"
                      size="small"
                    />
                  </TableCell>
                  <TableCell>{receive.received_by?.username || 'N/A'}</TableCell>
                  <TableCell>
                    {receive.receive_date ? format(new Date(receive.receive_date), 'dd/MM/yyyy HH:mm') : '-'}
                  </TableCell>
                  <TableCell align="center">
                    <IconButton size="small" color="primary" onClick={() => handleViewDetails(receive)}>
                      <VisibilityIcon fontSize="small" />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
        <TablePagination
          rowsPerPageOptions={[5, 10, 25, 50]}
          component="div"
          count={totalCount}
          rowsPerPage={rowsPerPage}
          page={page}
          onPageChange={handleChangePage}
          onRowsPerPageChange={handleChangeRowsPerPage}
        />
      </TableContainer>

      {/* Detail Dialog */}
      <Dialog 
        open={detailDialogOpen} 
        onClose={handleCloseDialog} 
        maxWidth="md" 
        fullWidth
        fullScreen={window.innerWidth < 900}
      >
        <DialogTitle>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="h6">Offer Receive Details</Typography>
            <IconButton onClick={handleCloseDialog} size="small">
              <CloseIcon />
            </IconButton>
          </Box>
        </DialogTitle>
        <DialogContent dividers>
          {selectedReceive && (
            <Box>
              <Grid container spacing={2} sx={{ mb: 3 }}>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <Typography variant="body2" color="text.secondary">Receive Reference</Typography>
                  <Typography variant="body1" fontWeight="bold">{selectedReceive.ref_no}</Typography>
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <Typography variant="body2" color="text.secondary">Offer Send Reference</Typography>
                  <Typography variant="body1">{selectedReceive.offer_send_id?.ref_no || 'N/A'}</Typography>
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <Typography variant="body2" color="text.secondary">Depot</Typography>
                  <Chip
                    label={selectedReceive.depot_id?.name || 'N/A'}
                    size="small"
                    icon={<StoreIcon />}
                  />
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <Typography variant="body2" color="text.secondary">Quality Check Status</Typography>
                  <Chip
                    label={selectedReceive.quality_check_status}
                    color={getQualityStatusColor(selectedReceive.quality_check_status)}
                    size="small"
                  />
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <Typography variant="body2" color="text.secondary">Received By</Typography>
                  <Typography variant="body1">{selectedReceive.received_by?.username || 'N/A'}</Typography>
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <Typography variant="body2" color="text.secondary">Received At</Typography>
                  <Typography variant="body1">
                    {selectedReceive.receive_date ? format(new Date(selectedReceive.receive_date), 'dd/MM/yyyy HH:mm') : '-'}
                  </Typography>
                </Grid>
                {selectedReceive.notes && (
                  <Grid size={{ xs: 12 }}>
                    <Typography variant="body2" color="text.secondary">Notes</Typography>
                    <Typography variant="body1">{selectedReceive.notes}</Typography>
                  </Grid>
                )}
              </Grid>

              <Divider sx={{ my: 2 }} />

              <Typography variant="subtitle1" fontWeight="bold" sx={{ mb: 2 }}>
                Product Details
              </Typography>
              <TableContainer sx={{ overflowX: 'auto' }}>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>SKU</TableCell>
                      <TableCell align="right">Price</TableCell>
                      <TableCell align="right">Sent (PCs)</TableCell>
                      <TableCell align="right">Received (PCs)</TableCell>
                      <TableCell align="right">Variance</TableCell>
                      <TableCell>Variance Reason</TableCell>
                      <TableCell>Note</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {selectedReceive.products.map((product, index) => {
                      const qtySent = getNumericValue(product.qty_pcs_sent);
                      const qtyReceived = getNumericValue(product.qty_pcs_received);
                      const variance = getNumericValue(product.variance);
                      const wt = (qtyReceived * (product.product_id?.wt_pcs || 0)) / 1000;
                      
                      return (
                        <TableRow key={index}>
                          <TableCell>{product.product_id?.sku || 'N/A'}</TableCell>
                          <TableCell align="right">{product.product_id?.trade_price?.toFixed(2) || '0.00'}</TableCell>
                          <TableCell align="right">{qtySent.toFixed(0)}</TableCell>
                          <TableCell align="right">{qtyReceived.toFixed(0)}</TableCell>
                          <TableCell align="right">
                            <Chip
                              label={variance.toFixed(0)}
                              color={variance === 0 ? 'success' : variance > 0 ? 'info' : 'warning'}
                              size="small"
                            />
                          </TableCell>
                          <TableCell>{product.variance_reason || '-'}</TableCell>
                          <TableCell>{product.note || '-'}</TableCell>
                        </TableRow>
                      );
                    })}
                    <TableRow>
                      <TableCell colSpan={2} align="right">
                        <Typography variant="subtitle2" fontWeight="bold">Total:</Typography>
                      </TableCell>
                      <TableCell align="right">
                        <Typography variant="subtitle2" fontWeight="bold">
                          {getTotalQuantitySent(selectedReceive.products)}
                        </Typography>
                      </TableCell>
                      <TableCell align="right">
                        <Typography variant="subtitle2" fontWeight="bold">
                          {getTotalQuantityReceived(selectedReceive.products)}
                        </Typography>
                      </TableCell>
                      <TableCell align="right">
                        <Typography variant="subtitle2" fontWeight="bold">
                          {getTotalVariance(selectedReceive.products)}
                        </Typography>
                      </TableCell>
                      <TableCell colSpan={2} />
                    </TableRow>
                  </TableBody>
                </Table>
              </TableContainer>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button 
            startIcon={<DownloadIcon />} 
            onClick={handleExportCSV}
            variant="outlined"
            size="small"
          >
            Export CSV
          </Button>
          <Button 
            startIcon={<PdfIcon />} 
            onClick={handleExportPDF}
            variant="outlined"
            size="small"
          >
            Export PDF
          </Button>
          <Button onClick={handleCloseDialog}>Close</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
