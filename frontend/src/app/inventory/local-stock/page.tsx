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
  Grid,
  Card,
  CardContent,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
} from '@mui/material';
import {
  Search as SearchIcon,
  Refresh as RefreshIcon,
  Inventory as InventoryIcon,
  Warning as WarningIcon,
  CheckCircle as CheckCircleIcon,
  LocalShipping as LocalShippingIcon,
} from '@mui/icons-material';
import { format } from 'date-fns';
import { apiClient } from '@/lib/api';

interface InventoryItem {
  product_id: string;
  sku: string;
  erp_id: string;
  name: string;
  ctn_pcs: number;
  wt_pcs: number;
  total_qty_ctn: number;
  total_qty_pcs: number;
  total_wt_mt: number;
  batch_count: number;
  oldest_production_date: string;
  earliest_expiry_date: string;
}

interface Transaction {
  _id: string;
  transaction_type: string;
  batch_no: string;
  qty_ctn: number;
  balance_after: number;
  reference_no: string;
  production_date: string;
  expiry_date: string;
  location: string;
  notes: string;
  created_at: string;
  created_by: {
    username: string;
  };
}

interface StockSummary {
  total_products: number;
  total_qty_ctn: number;
  total_qty_pcs: number;
  active_batches: number;
  expiring_soon: number;
}

export default function LocalStockPage() {
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(20);
  const [searchTerm, setSearchTerm] = useState('');
  const [totalCount, setTotalCount] = useState(0);
  const [summary, setSummary] = useState<StockSummary>({
    total_products: 0,
    total_qty_ctn: 0,
    total_qty_pcs: 0,
    active_batches: 0,
    expiring_soon: 0,
  });
  
  // Transaction dialog state
  const [transactionDialogOpen, setTransactionDialogOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<InventoryItem | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loadingTransactions, setLoadingTransactions] = useState(false);

  const fetchInventory = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await apiClient.get<{
        success: boolean;
        data: {
          inventory: InventoryItem[];
          pagination: {
            total: number;
            page: number;
            limit: number;
            pages: number;
          };
        };
      }>('/inventory/factory-to-store', {
        page: page + 1,
        limit: rowsPerPage,
        search: searchTerm,
        sort_by: 'sku',
        sort_order: 'asc',
      });

      if (response.success) {
        setInventory(response.data.inventory);
        setTotalCount(response.data.pagination.total);
        calculateSummary(response.data.inventory);
      }
    } catch (err) {
      console.error('Error fetching inventory:', err);
      setError('Failed to load inventory');
    } finally {
      setLoading(false);
    }
  };

  const fetchTransactions = async (productId: string) => {
    try {
      setLoadingTransactions(true);

      const response = await apiClient.get<{
        success: boolean;
        data: {
          transactions: Transaction[];
        };
      }>('/inventory/factory-to-store/transactions', {
        product_id: productId,
        limit: 100,
        page: 1,
      });

      if (response.success) {
        setTransactions(response.data.transactions);
      }
    } catch (err) {
      console.error('Error fetching transactions:', err);
    } finally {
      setLoadingTransactions(false);
    }
  };

  const handleRowClick = async (item: InventoryItem) => {
    setSelectedProduct(item);
    setTransactionDialogOpen(true);
    await fetchTransactions(item.product_id);
  };

  const calculateSummary = (items: InventoryItem[]) => {
    let totalQtyCtn = 0;
    let totalQtyPcs = 0;
    let totalBatches = 0;
    let expiringSoon = 0;
    
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);

    items.forEach(item => {
      totalQtyCtn += Number(item.total_qty_ctn) || 0;
      totalQtyPcs += Number(item.total_qty_pcs) || 0;
      totalBatches += Number(item.batch_count) || 0;
      
      if (item.earliest_expiry_date) {
        const expiryDate = new Date(item.earliest_expiry_date);
        if (expiryDate <= thirtyDaysFromNow) {
          expiringSoon++;
        }
      }
    });

    setSummary({
      total_products: items.length,
      total_qty_ctn: Number(totalQtyCtn) || 0,
      total_qty_pcs: Number(totalQtyPcs) || 0,
      active_batches: Number(totalBatches) || 0,
      expiring_soon: expiringSoon,
    });
  };

  useEffect(() => {
    fetchInventory();
  }, [page, rowsPerPage]);

  const handleSearch = () => {
    setPage(0);
    fetchInventory();
  };

  const handleChangePage = (_event: unknown, newPage: number) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const getDaysUntilExpiry = (expiryDate: string): number => {
    const today = new Date();
    const expiry = new Date(expiryDate);
    const diffTime = expiry.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const getExpiryWarning = (expiryDate: string) => {
    const days = getDaysUntilExpiry(expiryDate);
    
    if (days < 0) {
      return { color: 'error' as const, text: 'Expired' };
    } else if (days <= 7) {
      return { color: 'error' as const, text: `${days}d left` };
    } else if (days <= 30) {
      return { color: 'warning' as const, text: `${days}d left` };
    }
    return { color: 'default' as const, text: `${days}d left` };
  };

  if (loading && inventory.length === 0) {
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
          Local Stock
        </Typography>
        <IconButton onClick={fetchInventory} disabled={loading}>
          <RefreshIcon />
        </IconButton>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {/* Summary Cards */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                  <Typography color="text.secondary" variant="body2">
                    Total Products
                  </Typography>
                  <Typography variant="h4">
                    {summary.total_products || 0}
                  </Typography>
                </Box>
                <InventoryIcon sx={{ fontSize: 40, color: 'primary.main', opacity: 0.5 }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                  <Typography color="text.secondary" variant="body2">
                    Total Stock (CTN)
                  </Typography>
                  <Typography variant="h4">
                    {(summary.total_qty_ctn || 0).toFixed(2)}
                  </Typography>
                </Box>
                <LocalShippingIcon sx={{ fontSize: 40, color: 'success.main', opacity: 0.5 }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                  <Typography color="text.secondary" variant="body2">
                    Active Batches
                  </Typography>
                  <Typography variant="h4">
                    {summary.active_batches || 0}
                  </Typography>
                </Box>
                <CheckCircleIcon sx={{ fontSize: 40, color: 'info.main', opacity: 0.5 }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                  <Typography color="text.secondary" variant="body2">
                    Expiring Soon
                  </Typography>
                  <Typography variant="h4" color={summary.expiring_soon > 0 ? 'warning.main' : 'inherit'}>
                    {summary.expiring_soon || 0}
                  </Typography>
                </Box>
                <WarningIcon sx={{ fontSize: 40, color: 'warning.main', opacity: 0.5 }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Filters */}
      <Paper sx={{ mb: 3, p: 2 }}>
        <TextField
          fullWidth
          placeholder="Search by SKU, product name, or ERP ID..."
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

      {/* Inventory Table */}
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>SKU</TableCell>
              <TableCell>ERP ID</TableCell>
              <TableCell align="right">Qty (CTN)</TableCell>
              <TableCell align="right">Qty (PCs)</TableCell>
              <TableCell align="right">Wt (MT)</TableCell>
              <TableCell align="center">Batches</TableCell>
              <TableCell>Earliest Expiry</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={7} align="center">
                  <CircularProgress size={40} sx={{ my: 3 }} />
                </TableCell>
              </TableRow>
            ) : inventory.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} align="center">
                  <Typography variant="body2" color="text.secondary" sx={{ py: 3 }}>
                    No inventory found
                  </Typography>
                </TableCell>
              </TableRow>
            ) : (
              inventory.map((item) => {
                const expiryWarning = getExpiryWarning(item.earliest_expiry_date);

                return (
                  <TableRow 
                    key={item.product_id} 
                    hover 
                    onClick={() => handleRowClick(item)}
                    sx={{ cursor: 'pointer' }}
                  >
                    <TableCell>
                      <Typography variant="body2" fontWeight="bold">
                        {item.sku || 'N/A'}
                      </Typography>
                    </TableCell>
                    <TableCell>{item.erp_id || '-'}</TableCell>
                    <TableCell align="right">
                      <Typography variant="body2" fontWeight="bold">
                        {(Number(item.total_qty_ctn) || 0).toFixed(2)}
                      </Typography>
                    </TableCell>
                    <TableCell align="right">{(Number(item.total_qty_pcs) || 0).toFixed(2)}</TableCell>
                    <TableCell align="right">{(Number(item.total_wt_mt) || 0).toFixed(3)}</TableCell>
                    <TableCell align="center">
                      <Chip 
                        label={Number(item.batch_count) || 0} 
                        color="primary"
                        size="small"
                      />
                    </TableCell>
                    <TableCell>
                      <Box>
                        <Typography variant="body2">
                          {format(new Date(item.earliest_expiry_date), 'dd/MM/yyyy')}
                        </Typography>
                        <Chip 
                          label={expiryWarning.text} 
                          color={expiryWarning.color}
                          size="small"
                          sx={{ mt: 0.5 }}
                        />
                      </Box>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
        <TablePagination
          rowsPerPageOptions={[10, 20, 50, 100]}
          component="div"
          count={totalCount}
          rowsPerPage={rowsPerPage}
          page={page}
          onPageChange={handleChangePage}
          onRowsPerPageChange={handleChangeRowsPerPage}
        />
      </TableContainer>

      {/* Transaction Dialog */}
      <Dialog 
        open={transactionDialogOpen} 
        onClose={() => setTransactionDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          Transaction History: {selectedProduct?.sku}
          <Typography variant="body2" color="text.secondary">
            Total: {(Number(selectedProduct?.total_qty_ctn) || 0).toFixed(2)} CTN ({(Number(selectedProduct?.total_qty_pcs) || 0).toFixed(2)} PCs)
          </Typography>
        </DialogTitle>
        <DialogContent>
          {loadingTransactions ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 3 }}>
              <CircularProgress />
            </Box>
          ) : (
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Date</TableCell>
                    <TableCell>Type</TableCell>
                    <TableCell>Batch #</TableCell>
                    <TableCell align="right">Qty (CTN)</TableCell>
                    <TableCell align="right">Balance</TableCell>
                    <TableCell>Reference</TableCell>
                    <TableCell>Location</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {transactions.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} align="center">
                        <Typography variant="body2" color="text.secondary" sx={{ py: 2 }}>
                          No transactions found
                        </Typography>
                      </TableCell>
                    </TableRow>
                  ) : (
                    transactions.map((txn) => (
                      <TableRow key={txn._id}>
                        <TableCell>
                          <Typography variant="body2">
                            {format(new Date(txn.created_at), 'dd/MM/yyyy HH:mm')}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {txn.created_by?.username}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Chip 
                            label={txn.transaction_type} 
                            size="small"
                            color={txn.transaction_type === 'receipt' ? 'success' : 'warning'}
                          />
                        </TableCell>
                        <TableCell>{txn.batch_no}</TableCell>
                        <TableCell align="right">
                          <Typography 
                            variant="body2" 
                            color={txn.transaction_type === 'receipt' ? 'success.main' : 'warning.main'}
                            fontWeight="bold"
                          >
                            {txn.transaction_type === 'receipt' ? '+' : '-'}{(Number(txn.qty_ctn) || 0).toFixed(2)}
                          </Typography>
                        </TableCell>
                        <TableCell align="right">{(Number(txn.balance_after) || 0).toFixed(2)}</TableCell>
                        <TableCell>
                          <Typography variant="body2">{txn.reference_no}</Typography>
                        </TableCell>
                        <TableCell>{txn.location || '-'}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setTransactionDialogOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
