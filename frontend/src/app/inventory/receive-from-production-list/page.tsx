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
} from '@mui/icons-material';
import { format } from 'date-fns';
import { getReceivedShipments, getQtyValue, PendingShipment } from '@/lib/inventoryApi';

export default function ReceiveFromProductionListPage() {
  const [shipments, setShipments] = useState<PendingShipment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [searchTerm, setSearchTerm] = useState('');
  const [totalCount, setTotalCount] = useState(0);
  const [selectedShipment, setSelectedShipment] = useState<PendingShipment | null>(null);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);

  const fetchShipments = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await getReceivedShipments(page + 1, rowsPerPage, searchTerm);

      if (response.success) {
        setShipments(response.data.shipments);
        setTotalCount(response.data.pagination.total);
      }
    } catch (err) {
      console.error('Error fetching shipments:', err);
      setError('Failed to load received shipments');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchShipments();
  }, [page, rowsPerPage]);

  const handleSearch = () => {
    setPage(0);
    fetchShipments();
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
      case 'received':
        return 'success';
      case 'sent':
        return 'warning';
      case 'cancelled':
        return 'error';
      default:
        return 'default';
    }
  };

  const getTotalQuantity = (details: PendingShipment['details']) => {
    return details.reduce((sum, detail) => sum + getQtyValue(detail.qty), 0).toFixed(2);
  };

  const handleViewDetails = (shipment: PendingShipment) => {
    setSelectedShipment(shipment);
    setDetailDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDetailDialogOpen(false);
    setSelectedShipment(null);
  };

  const handleExportCSV = () => {
    if (!selectedShipment) return;

    const csvRows = [];
    // Header
    csvRows.push([
      'Shipment Reference',
      selectedShipment.ref,
    ].join(','));
    csvRows.push([
      'From (Factory)',
      selectedShipment.facility_id?.name || 'N/A',
    ].join(','));
    csvRows.push([
      'To (Depot)',
      selectedShipment.facility_store_id?.name || 'N/A',
    ].join(','));
    csvRows.push([
      'Created By',
      (selectedShipment.user_id as any)?.username || 'N/A',
    ].join(','));
    csvRows.push([
      'Received At',
      format(new Date((selectedShipment as any).received_at || selectedShipment.created_at), 'dd/MM/yyyy HH:mm'),
    ].join(','));
    csvRows.push(''); // Empty line
    
    // Product details header
    csvRows.push([
      'SKU',
      'ERP ID',
      'Pcs/CTN',
      'Qty (CTN)',
      'Qty (PCs)',
      'Wt (MT)',
      'Production Date',
      'Expiry Date',
      'Batch #',
      'Note'
    ].join(','));

    // Product details
    selectedShipment.details.forEach((detail) => {
      const productInfo = typeof detail.product_id === 'object' ? detail.product_id : null;
      const qtyCtn = getQtyValue(detail.qty);
      const ctnPcs = productInfo?.ctn_pcs || 0;
      const wtPcs = productInfo?.wt_pcs || 0;
      const qtyPcs = qtyCtn * ctnPcs;
      const weightMt = (qtyCtn * ctnPcs * wtPcs) / 1000000;
      
      csvRows.push([
        productInfo?.sku || 'N/A',
        productInfo?.erp_id || '-',
        ctnPcs,
        qtyCtn.toFixed(2),
        qtyPcs.toFixed(2),
        weightMt.toFixed(3),
        format(new Date(detail.production_date), 'dd/MM/yyyy'),
        format(new Date(detail.expiry_date), 'dd/MM/yyyy'),
        detail.batch_no,
        detail.note || '-'
      ].join(','));
    });

    // Total
    csvRows.push([
      '',
      '',
      'Total:',
      getTotalQuantity(selectedShipment.details),
      '',
      '',
      '',
      '',
      '',
      ''
    ].join(','));

    const csvContent = csvRows.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `received_shipment_${selectedShipment.ref}_${format(new Date(), 'yyyyMMdd')}.csv`;
    link.click();
  };

  const handleExportPDF = () => {
    if (!selectedShipment) return;

    // Create a printable version
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Received Shipment ${selectedShipment.ref}</title>
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
          @media print {
            body { padding: 0; }
          }
        </style>
      </head>
      <body>
        <h1>Received Shipment - ${selectedShipment.ref}</h1>
        
        <div class="info-grid">
          <div class="info-label">From (Factory):</div>
          <div>${selectedShipment.facility_id?.name || 'N/A'}</div>
          
          <div class="info-label">To (Depot):</div>
          <div>${selectedShipment.facility_store_id?.name || 'N/A'}</div>
          
          <div class="info-label">Created By:</div>
          <div>${(selectedShipment.user_id as any)?.username || 'N/A'}</div>
          
          <div class="info-label">Received At:</div>
          <div>${format(new Date((selectedShipment as any).received_at || selectedShipment.created_at), 'dd/MM/yyyy HH:mm')}</div>
          
          <div class="info-label">Status:</div>
          <div>${selectedShipment.status}</div>
        </div>

        <h2>Product Details</h2>
        <table>
          <thead>
            <tr>
              <th>SKU</th>
              <th>ERP ID</th>
              <th class="text-right">Pcs/CTN</th>
              <th class="text-right">Qty (CTN)</th>
              <th class="text-right">Qty (PCs)</th>
              <th class="text-right">Wt (MT)</th>
              <th>Production Date</th>
              <th>Expiry Date</th>
              <th>Batch #</th>
              <th>Note</th>
            </tr>
          </thead>
          <tbody>
            ${selectedShipment.details.map((detail) => {
              const productInfo = typeof detail.product_id === 'object' ? detail.product_id : null;
              const qtyCtn = getQtyValue(detail.qty);
              const ctnPcs = productInfo?.ctn_pcs || 0;
              const wtPcs = productInfo?.wt_pcs || 0;
              const qtyPcs = qtyCtn * ctnPcs;
              const weightMt = (qtyCtn * ctnPcs * wtPcs) / 1000000;
              
              return `
                <tr>
                  <td>${productInfo?.sku || 'N/A'}</td>
                  <td>${productInfo?.erp_id || '-'}</td>
                  <td class="text-right">${ctnPcs}</td>
                  <td class="text-right">${qtyCtn.toFixed(2)}</td>
                  <td class="text-right">${qtyPcs.toFixed(2)}</td>
                  <td class="text-right">${weightMt.toFixed(3)}</td>
                  <td>${format(new Date(detail.production_date), 'dd/MM/yyyy')}</td>
                  <td>${format(new Date(detail.expiry_date), 'dd/MM/yyyy')}</td>
                  <td>${detail.batch_no}</td>
                  <td>${detail.note || '-'}</td>
                </tr>
              `;
            }).join('')}
            <tr class="total-row">
              <td colspan="3" class="text-right">Total:</td>
              <td class="text-right">${getTotalQuantity(selectedShipment.details)}</td>
              <td colspan="6"></td>
            </tr>
          </tbody>
        </table>

        <script>
          window.onload = function() {
            window.print();
          }
        </script>
      </body>
      </html>
    `;

    printWindow.document.write(html);
    printWindow.document.close();
  };

  if (loading && shipments.length === 0) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px' }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" component="h1">
          Received Shipments
        </Typography>
        <IconButton onClick={fetchShipments} disabled={loading}>
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

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Reference</TableCell>
              <TableCell>From (Factory)</TableCell>
              <TableCell>To (Depot)</TableCell>
              <TableCell align="right">Products</TableCell>
              <TableCell align="right">Total Qty (CTN)</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Received By</TableCell>
              <TableCell>Received At</TableCell>
              <TableCell align="center">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {shipments.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} align="center">
                  <Typography variant="body2" color="text.secondary" sx={{ py: 3 }}>
                    No received shipments found
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
                  <TableCell>{shipment.facility_store_id?.name || 'N/A'}</TableCell>
                  <TableCell align="right">{shipment.details.length}</TableCell>
                  <TableCell align="right">{getTotalQuantity(shipment.details)}</TableCell>
                  <TableCell>
                    <Chip
                      label={shipment.status}
                      color={getStatusColor(shipment.status)}
                      size="small"
                    />
                  </TableCell>
                  <TableCell>{(shipment as any).received_by?.username || 'N/A'}</TableCell>
                  <TableCell>
                    {format(new Date((shipment as any).received_at || shipment.created_at), 'dd/MM/yyyy HH:mm')}
                  </TableCell>
                  <TableCell align="center">
                    <IconButton size="small" color="primary" onClick={() => handleViewDetails(shipment)}>
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
      <Dialog open={detailDialogOpen} onClose={handleCloseDialog} maxWidth="lg" fullWidth>
        <DialogTitle>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="h6">Received Shipment Details</Typography>
            <IconButton onClick={handleCloseDialog} size="small">
              <CloseIcon />
            </IconButton>
          </Box>
        </DialogTitle>
        <DialogContent dividers>
          {selectedShipment && (
            <Box>
              {/* Header Info */}
              <Grid container spacing={2} sx={{ mb: 3 }}>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <Typography variant="body2" color="text.secondary">Reference Number</Typography>
                  <Typography variant="body1" fontWeight="bold">{selectedShipment.ref}</Typography>
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <Typography variant="body2" color="text.secondary">Status</Typography>
                  <Chip
                    label={selectedShipment.status}
                    color={getStatusColor(selectedShipment.status)}
                    size="small"
                  />
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <Typography variant="body2" color="text.secondary">From (Factory)</Typography>
                  <Typography variant="body1">{selectedShipment.facility_id?.name || 'N/A'}</Typography>
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <Typography variant="body2" color="text.secondary">To (Depot)</Typography>
                  <Typography variant="body1">{selectedShipment.facility_store_id?.name || 'N/A'}</Typography>
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <Typography variant="body2" color="text.secondary">Sent By</Typography>
                  <Typography variant="body1">{(selectedShipment.user_id as any)?.username || 'N/A'}</Typography>
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <Typography variant="body2" color="text.secondary">Received By</Typography>
                  <Typography variant="body1">{(selectedShipment as any).received_by?.username || 'N/A'}</Typography>
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <Typography variant="body2" color="text.secondary">Sent At</Typography>
                  <Typography variant="body1">
                    {format(new Date(selectedShipment.created_at), 'dd/MM/yyyy HH:mm')}
                  </Typography>
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <Typography variant="body2" color="text.secondary">Received At</Typography>
                  <Typography variant="body1">
                    {format(new Date((selectedShipment as any).received_at || selectedShipment.created_at), 'dd/MM/yyyy HH:mm')}
                  </Typography>
                </Grid>
              </Grid>

              <Divider sx={{ my: 2 }} />

              {/* Product Details Table */}
              <Typography variant="subtitle1" fontWeight="bold" sx={{ mb: 2 }}>
                Product Details
              </Typography>
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
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {selectedShipment.details.map((detail, index) => {
                      const productInfo = typeof detail.product_id === 'object' ? detail.product_id : null;
                      const qtyCtn = getQtyValue(detail.qty);
                      const ctnPcs = productInfo?.ctn_pcs || 0;
                      const wtPcs = productInfo?.wt_pcs || 0;
                      const qtyPcs = qtyCtn * ctnPcs;
                      const weightMt = (qtyCtn * ctnPcs * wtPcs) / 1000000;
                      
                      return (
                        <TableRow key={index}>
                          <TableCell>{productInfo?.sku || 'N/A'}</TableCell>
                          <TableCell>{productInfo?.erp_id || '-'}</TableCell>
                          <TableCell align="right">{ctnPcs}</TableCell>
                          <TableCell align="right">{qtyCtn.toFixed(2)}</TableCell>
                          <TableCell align="right">{qtyPcs.toFixed(2)}</TableCell>
                          <TableCell align="right">{weightMt.toFixed(3)}</TableCell>
                          <TableCell>{format(new Date(detail.production_date), 'dd/MM/yyyy')}</TableCell>
                          <TableCell>{format(new Date(detail.expiry_date), 'dd/MM/yyyy')}</TableCell>
                          <TableCell>{detail.batch_no}</TableCell>
                          <TableCell>{detail.note || '-'}</TableCell>
                        </TableRow>
                      );
                    })}
                    <TableRow>
                      <TableCell colSpan={3} align="right">
                        <Typography variant="subtitle2" fontWeight="bold">Total:</Typography>
                      </TableCell>
                      <TableCell align="right">
                        <Typography variant="subtitle2" fontWeight="bold">
                          {getTotalQuantity(selectedShipment.details)}
                        </Typography>
                      </TableCell>
                      <TableCell colSpan={6} />
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
          >
            Export CSV
          </Button>
          <Button 
            startIcon={<PdfIcon />} 
            onClick={handleExportPDF}
            variant="outlined"
          >
            Export PDF
          </Button>
          <Button onClick={handleCloseDialog}>Close</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
