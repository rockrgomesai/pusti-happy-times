'use client';

import React, { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Paper,
  Typography,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  Chip,
  TextField,
  MenuItem,
  Grid,
  IconButton,
  CircularProgress,
  Tooltip,
  Card,
  CardContent
} from '@mui/material';
import {
  Visibility as ViewIcon,
  Print as PrintIcon,
  Receipt as ReceiptIcon,
  TrendingUp as TrendingUpIcon,
  TrendingDown as TrendingDownIcon,
  Warning as WarningIcon,
  Paid as PaidIcon
} from '@mui/icons-material';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import axios from 'axios';

interface Invoice {
  _id: string;
  invoice_number: string;
  chalan_number: string;
  distributor_id: {
    distributor_name: string;
    distributor_code: string;
  };
  total_amount: number;
  discount: number;
  due_date: string;
  status: string;
  is_overdue: boolean;
  total_items: number;
  created_at: string;
}

interface Summary {
  total_outstanding: number;
  paid_today: number;
  overdue_amount: number;
}

export default function InvoicesListPage() {
  const router = useRouter();
  const { user } = useAuth();

  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [summary, setSummary] = useState<Summary>({
    total_outstanding: 0,
    paid_today: 0,
    overdue_amount: 0
  });
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [totalCount, setTotalCount] = useState(0);

  // Filters
  const [status, setStatus] = useState('');
  const [searchChalan, setSearchChalan] = useState('');
  const [searchInvoice, setSearchInvoice] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [overdueOnly, setOverdueOnly] = useState(false);

  useEffect(() => {
    loadInvoices();
  }, [page, rowsPerPage, status, searchChalan, searchInvoice, dateFrom, dateTo, overdueOnly]);

  const loadInvoices = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const params: any = {
        page: page + 1,
        limit: rowsPerPage
      };

      if (status) params.status = status;
      if (searchChalan) params.chalan_number = searchChalan;
      if (searchInvoice) params.invoice_number = searchInvoice;
      if (dateFrom) params.date_from = dateFrom;
      if (dateTo) params.date_to = dateTo;
      if (overdueOnly) params.overdue_only = true;

      const response = await axios.get(
        `${process.env.NEXT_PUBLIC_API_URL}/distribution/invoices/list`,
        {
          headers: { Authorization: `Bearer ${token}` },
          params
        }
      );

      if (response.data.success) {
        setInvoices(response.data.data.invoices);
        setSummary(response.data.data.summary);
        setTotalCount(response.data.data.pagination.total);
      }
    } catch (error: any) {
      console.error('Error loading invoices:', error);
      alert(error.response?.data?.message || 'Failed to load invoices');
    } finally {
      setLoading(false);
    }
  };

  const handleChangePage = (event: unknown, newPage: number) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Paid':
        return 'success';
      case 'Partial':
        return 'warning';
      case 'Unpaid':
        return 'error';
      case 'Cancelled':
        return 'default';
      default:
        return 'default';
    }
  };

  const formatCurrency = (amount: number) => {
    return `৳${parseFloat(amount.toString()).toLocaleString('en-BD', { minimumFractionDigits: 2 })}`;
  };

  return (
    <Container maxWidth="xl" sx={{ py: 3 }}>
      {/* Header */}
      <Box mb={3}>
        <Typography variant="h4" fontWeight="bold" gutterBottom>
          Invoices
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Track invoices and manage payments
        </Typography>
      </Box>

      {/* Summary Cards */}
      <Grid container spacing={3} mb={3}>
        <Grid item xs={12} sm={6} md={4}>
          <Card sx={{ bgcolor: 'error.light', color: 'error.contrastText' }}>
            <CardContent>
              <Box display="flex" alignItems="center" justifyContent="space-between">
                <Box>
                  <Typography variant="body2" gutterBottom>
                    Total Outstanding
                  </Typography>
                  <Typography variant="h4" fontWeight="bold">
                    {formatCurrency(summary.total_outstanding)}
                  </Typography>
                </Box>
                <TrendingUpIcon sx={{ fontSize: 60, opacity: 0.5 }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={4}>
          <Card sx={{ bgcolor: 'success.light', color: 'success.contrastText' }}>
            <CardContent>
              <Box display="flex" alignItems="center" justifyContent="space-between">
                <Box>
                  <Typography variant="body2" gutterBottom>
                    Paid Today
                  </Typography>
                  <Typography variant="h4" fontWeight="bold">
                    {formatCurrency(summary.paid_today)}
                  </Typography>
                </Box>
                <PaidIcon sx={{ fontSize: 60, opacity: 0.5 }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={4}>
          <Card sx={{ bgcolor: 'warning.light', color: 'warning.contrastText' }}>
            <CardContent>
              <Box display="flex" alignItems="center" justifyContent="space-between">
                <Box>
                  <Typography variant="body2" gutterBottom>
                    Overdue Amount
                  </Typography>
                  <Typography variant="h4" fontWeight="bold">
                    {formatCurrency(summary.overdue_amount)}
                  </Typography>
                </Box>
                <WarningIcon sx={{ fontSize: 60, opacity: 0.5 }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Filters */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Grid container spacing={2}>
          <Grid item xs={12} sm={6} md={2}>
            <TextField
              fullWidth
              label="Status"
              select
              value={status}
              onChange={(e) => {
                setStatus(e.target.value);
                setPage(0);
              }}
              size="small"
            >
              <MenuItem value="">All Statuses</MenuItem>
              <MenuItem value="Unpaid">Unpaid</MenuItem>
              <MenuItem value="Partial">Partial</MenuItem>
              <MenuItem value="Paid">Paid</MenuItem>
              <MenuItem value="Cancelled">Cancelled</MenuItem>
            </TextField>
          </Grid>
          <Grid item xs={12} sm={6} md={2}>
            <TextField
              fullWidth
              label="Chalan No"
              value={searchChalan}
              onChange={(e) => {
                setSearchChalan(e.target.value);
                setPage(0);
              }}
              placeholder="CH-YYYYMMDD-XXX"
              size="small"
            />
          </Grid>
          <Grid item xs={12} sm={6} md={2}>
            <TextField
              fullWidth
              label="Invoice No"
              value={searchInvoice}
              onChange={(e) => {
                setSearchInvoice(e.target.value);
                setPage(0);
              }}
              placeholder="INV-YYYYMMDD-XXX"
              size="small"
            />
          </Grid>
          <Grid item xs={12} sm={6} md={2}>
            <TextField
              fullWidth
              type="date"
              label="From Date"
              value={dateFrom}
              onChange={(e) => {
                setDateFrom(e.target.value);
                setPage(0);
              }}
              InputLabelProps={{ shrink: true }}
              size="small"
            />
          </Grid>
          <Grid item xs={12} sm={6} md={2}>
            <TextField
              fullWidth
              type="date"
              label="To Date"
              value={dateTo}
              onChange={(e) => {
                setDateTo(e.target.value);
                setPage(0);
              }}
              InputLabelProps={{ shrink: true }}
              size="small"
            />
          </Grid>
          <Grid item xs={12} sm={6} md={2}>
            <TextField
              fullWidth
              label="Filter"
              select
              value={overdueOnly ? 'overdue' : 'all'}
              onChange={(e) => {
                setOverdueOnly(e.target.value === 'overdue');
                setPage(0);
              }}
              size="small"
            >
              <MenuItem value="all">All Invoices</MenuItem>
              <MenuItem value="overdue">Overdue Only</MenuItem>
            </TextField>
          </Grid>
        </Grid>
      </Paper>

      {/* Invoices Table */}
      <Paper>
        {loading ? (
          <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
            <CircularProgress />
          </Box>
        ) : invoices.length === 0 ? (
          <Box textAlign="center" py={8}>
            <ReceiptIcon sx={{ fontSize: 80, color: 'text.secondary', mb: 2 }} />
            <Typography variant="h6" color="text.secondary" gutterBottom>
              No Invoices Found
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Invoices will appear here after converting load sheets
            </Typography>
          </Box>
        ) : (
          <>
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Invoice No</TableCell>
                    <TableCell>Chalan No</TableCell>
                    <TableCell>Distributor</TableCell>
                    <TableCell align="right">Amount</TableCell>
                    <TableCell align="right">Discount</TableCell>
                    <TableCell align="center">Items</TableCell>
                    <TableCell>Due Date</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell>Created At</TableCell>
                    <TableCell align="center">Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {invoices.map((invoice) => (
                    <TableRow
                      key={invoice._id}
                      hover
                      sx={{
                        bgcolor: invoice.is_overdue && invoice.status !== 'Paid' && invoice.status !== 'Cancelled'
                          ? 'error.lighter'
                          : 'inherit'
                      }}
                    >
                      <TableCell>
                        <Typography variant="body2" sx={{ fontFamily: 'monospace', fontWeight: 'bold' }}>
                          {invoice.invoice_number}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" sx={{ fontFamily: 'monospace', fontSize: '0.75rem' }}>
                          {invoice.chalan_number}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" fontWeight="bold">
                          {invoice.distributor_id.distributor_name}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {invoice.distributor_id.distributor_code}
                        </Typography>
                      </TableCell>
                      <TableCell align="right">
                        <Typography variant="body2" fontWeight="bold">
                          {formatCurrency(invoice.total_amount)}
                        </Typography>
                      </TableCell>
                      <TableCell align="right">
                        {invoice.discount > 0 ? formatCurrency(invoice.discount) : '-'}
                      </TableCell>
                      <TableCell align="center">
                        <Chip label={invoice.total_items} size="small" />
                      </TableCell>
                      <TableCell>
                        <Box display="flex" alignItems="center" gap={1}>
                          {new Date(invoice.due_date).toLocaleDateString()}
                          {invoice.is_overdue && invoice.status !== 'Paid' && invoice.status !== 'Cancelled' && (
                            <Tooltip title="Overdue">
                              <WarningIcon color="error" fontSize="small" />
                            </Tooltip>
                          )}
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={invoice.status}
                          color={getStatusColor(invoice.status)}
                          size="small"
                        />
                      </TableCell>
                      <TableCell>
                        {new Date(invoice.created_at).toLocaleDateString()}
                      </TableCell>
                      <TableCell align="center">
                        <Tooltip title="View Details">
                          <IconButton
                            size="small"
                            color="primary"
                            onClick={() => router.push(`/distribution/invoices/${invoice._id}`)}
                          >
                            <ViewIcon />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Print">
                          <IconButton
                            size="small"
                            color="secondary"
                            onClick={() => window.open(`/distribution/invoices/${invoice._id}/print`, '_blank')}
                          >
                            <PrintIcon />
                          </IconButton>
                        </Tooltip>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
            <TablePagination
              rowsPerPageOptions={[5, 10, 25, 50]}
              component="div"
              count={totalCount}
              rowsPerPage={rowsPerPage}
              page={page}
              onPageChange={handleChangePage}
              onRowsPerPageChange={handleChangeRowsPerPage}
            />
          </>
        )}
      </Paper>
    </Container>
  );
}
