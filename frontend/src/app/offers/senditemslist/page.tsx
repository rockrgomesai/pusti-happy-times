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
import { apiClient } from '@/lib/api';
import { format } from 'date-fns';

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

export default function SendItemsListPage() {
  const router = useRouter();
  const { user, isLoading: authLoading } = useAuth();
  const [sends, setSends] = useState<OfferSend[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [searchTerm, setSearchTerm] = useState('');
  const [totalCount, setTotalCount] = useState(0);
  const [selectedSend, setSelectedSend] = useState<OfferSend | null>(null);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);

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

  const fetchSends = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await apiClient.get<{
        success: boolean;
        data: {
          sends: OfferSend[];
          total: number;
          page: number;
          limit: number;
        };
      }>('/offers/send-items', {
        page: page + 1,
        limit: rowsPerPage,
        search: searchTerm,
      });

      if (response.success) {
        setSends(response.data.sends);
        setTotalCount(response.data.total);
      }
    } catch (err) {
      console.error('Error fetching offer sends:', err);
      setError('Failed to load offer sends');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!authLoading && user?.role?.role === 'Sales Admin') {
      fetchSends();
    }
  }, [page, rowsPerPage, authLoading, user]);

  const handleSearch = () => {
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

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'fully_received':
        return 'success';
      case 'partially_received':
        return 'info';
      case 'pending':
        return 'warning';
      case 'cancelled':
        return 'error';
      default:
        return 'default';
    }
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
    setDetailDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDetailDialogOpen(false);
    setSelectedSend(null);
  };

  const handleExportCSV = () => {
    if (!selectedSend) return;

    const csvRows = [];
    csvRows.push(['Offer Send Reference', selectedSend.ref_no].join(','));
    csvRows.push(['Send Date', format(new Date(selectedSend.send_date), 'dd/MM/yyyy')].join(','));
    csvRows.push(['Created By', selectedSend.created_by?.username || 'N/A'].join(','));
    csvRows.push(['Total Depots', selectedSend.depot_ids.length.toString()].join(','));
    csvRows.push(['Depots', selectedSend.depot_ids.map(d => d.name).join('; ')].join(','));
    csvRows.push('');
    
    csvRows.push(['SKU', 'Price', 'Qty (PCs)', 'Note'].join(','));

    selectedSend.products.forEach((product) => {
      const qty = getQtyValue(product.qty_pcs);
      
      csvRows.push([
        product.product_id?.sku || 'N/A',
        product.product_id?.trade_price?.toFixed(2) || '0.00',
        qty.toFixed(0),
        product.note || '-'
      ].join(','));
    });

    csvRows.push(['', 'Total:', getTotalQuantity(selectedSend.products)].join(','));

    const csvContent = csvRows.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `offer_send_${selectedSend.ref_no}_${format(new Date(), 'yyyyMMdd')}.csv`;
    link.click();
  };

  const handleExportPDF = () => {
    if (!selectedSend) return;

    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Offer Send ${selectedSend.ref_no}</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 20px; }
          h1 { color: #333; border-bottom: 2px solid #333; padding-bottom: 10px; }
          .info-grid { display: grid; grid-template-columns: 150px 1fr; gap: 10px; margin: 20px 0; }
          .info-label { font-weight: bold; }
          .depots { margin: 10px 0; padding: 10px; background-color: #f5f5f5; border-radius: 4px; }
          table { width: 100%; border-collapse: collapse; margin-top: 20px; }
          th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
          th { background-color: #f2f2f2; font-weight: bold; }
          .text-right { text-align: right; }
          .total-row { font-weight: bold; background-color: #f9f9f9; }
          @media print { body { padding: 0; } }
        </style>
      </head>
      <body>
        <h1>Offer Send Details - ${selectedSend.ref_no}</h1>
        
        <div class="info-grid">
          <div class="info-label">Send Date:</div>
          <div>${format(new Date(selectedSend.send_date), 'dd/MM/yyyy HH:mm')}</div>
          
          <div class="info-label">Created By:</div>
          <div>${selectedSend.created_by?.username || 'N/A'}</div>
          
          <div class="info-label">Status:</div>
          <div>${selectedSend.status}</div>
          
          <div class="info-label">Total Depots:</div>
          <div>${selectedSend.depot_ids.length}</div>
        </div>

        <div class="depots">
          <strong>Target Depots:</strong><br/>
          ${selectedSend.depot_ids.map(d => d.name).join(', ')}
        </div>

        <h2>Product Details</h2>
        <table>
          <thead>
            <tr>
              <th>SKU</th>
              <th class="text-right">Price</th>
              <th class="text-right">Qty (PCs)</th>
              <th>Note</th>
            </tr>
          </thead>
          <tbody>
            ${selectedSend.products.map((product) => {
              const qty = getQtyValue(product.qty_pcs);
              
              return `
                <tr>
                  <td>${product.product_id?.sku || 'N/A'}</td>
                  <td class="text-right">${product.product_id?.trade_price?.toFixed(2) || '0.00'}</td>
                  <td class="text-right">${qty.toFixed(0)}</td>
                  <td>${product.note || '-'}</td>
                </tr>
              `;
            }).join('')}
            <tr class="total-row">
              <td colspan="2" class="text-right">Total:</td>
              <td class="text-right">${getTotalQuantity(selectedSend.products)}</td>
              <td></td>
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

  if (loading && sends.length === 0) {
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
          Send Items List
        </Typography>
        <IconButton onClick={fetchSends} disabled={loading}>
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
          placeholder="Search by reference number, batch number, or SKU..."
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
              <TableCell>Reference</TableCell>
              <TableCell>Depots</TableCell>
              <TableCell align="right">Products</TableCell>
              <TableCell align="right">Total Qty (PCs)</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Created By</TableCell>
              <TableCell>Date</TableCell>
              <TableCell align="center">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {sends.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} align="center">
                  <Typography variant="body2" color="text.secondary" sx={{ py: 3 }}>
                    No offer sends found
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
                  <TableCell>
                    <Chip
                      label={send.status.replace(/_/g, ' ')}
                      color={getStatusColor(send.status)}
                      size="small"
                    />
                  </TableCell>
                  <TableCell>{send.created_by?.username || 'N/A'}</TableCell>
                  <TableCell>
                    {format(new Date(send.send_date), 'dd/MM/yyyy HH:mm')}
                  </TableCell>
                  <TableCell align="center">
                    <IconButton size="small" color="primary" onClick={() => handleViewDetails(send)}>
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
      <Dialog open={detailDialogOpen} onClose={handleCloseDialog} maxWidth="md" fullWidth fullScreen={window.innerWidth < 900}>
        <DialogTitle>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="h6">Offer Send Details</Typography>
            <IconButton onClick={handleCloseDialog} size="small">
              <CloseIcon />
            </IconButton>
          </Box>
        </DialogTitle>
        <DialogContent dividers>
          {selectedSend && (
            <Box>
              <Grid container spacing={2} sx={{ mb: 3 }}>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <Typography variant="body2" color="text.secondary">Reference Number</Typography>
                  <Typography variant="body1" fontWeight="bold">{selectedSend.ref_no}</Typography>
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <Typography variant="body2" color="text.secondary">Status</Typography>
                  <Chip
                    label={selectedSend.status.replace(/_/g, ' ')}
                    color={getStatusColor(selectedSend.status)}
                    size="small"
                  />
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <Typography variant="body2" color="text.secondary">Created By</Typography>
                  <Typography variant="body1">{selectedSend.created_by?.username || 'N/A'}</Typography>
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <Typography variant="body2" color="text.secondary">Send Date</Typography>
                  <Typography variant="body1">
                    {format(new Date(selectedSend.send_date), 'dd/MM/yyyy HH:mm')}
                  </Typography>
                </Grid>
              </Grid>

              <Box sx={{ mb: 3, p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
                <Typography variant="subtitle2" gutterBottom>
                  <strong>Target Depots ({selectedSend.depot_ids.length}):</strong>
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
                      <TableCell align="right">Qty (PCs)</TableCell>
                      <TableCell>Note</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {selectedSend.products.map((product, index) => {
                      const qty = getQtyValue(product.qty_pcs);
                      
                      return (
                        <TableRow key={index}>
                          <TableCell>{product.product_id?.sku || 'N/A'}</TableCell>
                          <TableCell align="right">{product.product_id?.trade_price?.toFixed(2) || '0.00'}</TableCell>
                          <TableCell align="right">{qty.toFixed(0)}</TableCell>
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
                          {getTotalQuantity(selectedSend.products)}
                        </Typography>
                      </TableCell>
                      <TableCell />
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
