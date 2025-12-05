'use client';

import React, { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Paper,
  Typography,
  Button,
  Grid,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Card,
  CardContent,
  Divider,
  IconButton,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem,
  Alert,
  Timeline,
  TimelineItem,
  TimelineSeparator,
  TimelineConnector,
  TimelineContent,
  TimelineDot,
  TimelineOppositeContent
} from '@mui/material';
import {
  ArrowBack as ArrowBackIcon,
  Receipt as ReceiptIcon,
  Print as PrintIcon,
  Payment as PaymentIcon,
  LocalShipping as TruckIcon,
  Warning as WarningIcon
} from '@mui/icons-material';
import { useRouter } from 'next/router';
import { useAuth } from '@/contexts/AuthContext';
import axios from 'axios';

interface InvoiceDetail {
  _id: string;
  invoice_number: string;
  chalan_id: {
    _id: string;
    chalan_number: string;
  };
  load_sheet_id: {
    _id: string;
    load_sheet_number: string;
  };
  distributor_id: {
    _id: string;
    distributor_name: string;
    distributor_code: string;
    distributor_address: string;
    distributor_phone: string;
    distributor_tin: string;
  };
  items: Array<{
    do_id: string;
    order_number: string;
    sku: string;
    qty: number;
    unit: string;
    unit_price: number;
    line_total: number;
  }>;
  total_amount: number;
  discount: number;
  payment_terms: string;
  due_date: string;
  status: string;
  is_overdue: boolean;
  payment_history: Array<{
    amount: number;
    payment_date: string;
    payment_method: string;
    reference: string;
    recorded_by: {
      name: string;
    };
  }>;
  total_items: number;
  created_by: {
    name: string;
  };
  created_at: string;
}

export default function InvoiceDetailPage() {
  const router = useRouter();
  const { id } = router.query;
  const { user } = useAuth();

  const [invoice, setInvoice] = useState<InvoiceDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [showPaymentDialog, setShowPaymentDialog] = useState(false);
  const [paymentData, setPaymentData] = useState({
    status: '',
    payment_amount: '',
    payment_method: '',
    payment_date: new Date().toISOString().split('T')[0],
    reference: ''
  });

  useEffect(() => {
    if (id) {
      loadInvoiceDetail();
    }
  }, [id]);

  const loadInvoiceDetail = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const response = await axios.get(
        `${process.env.NEXT_PUBLIC_API_URL}/distribution/invoices/${id}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (response.data.success) {
        setInvoice(response.data.data);
      }
    } catch (error: any) {
      console.error('Error loading invoice:', error);
      alert(error.response?.data?.message || 'Failed to load invoice');
      router.back();
    } finally {
      setLoading(false);
    }
  };

  const handlePaymentUpdate = async () => {
    try {
      setUpdating(true);
      const token = localStorage.getItem('token');
      const response = await axios.patch(
        `${process.env.NEXT_PUBLIC_API_URL}/distribution/invoices/${id}/status`,
        paymentData,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (response.data.success) {
        alert('Payment updated successfully!');
        setShowPaymentDialog(false);
        loadInvoiceDetail();
      }
    } catch (error: any) {
      console.error('Error updating payment:', error);
      alert(error.response?.data?.message || 'Failed to update payment');
    } finally {
      setUpdating(false);
    }
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

  const calculateTotalPaid = () => {
    if (!invoice?.payment_history) return 0;
    return invoice.payment_history.reduce((sum, payment) => sum + parseFloat(payment.amount.toString()), 0);
  };

  const calculateBalance = () => {
    if (!invoice) return 0;
    const totalPaid = calculateTotalPaid();
    return parseFloat(invoice.total_amount.toString()) - totalPaid;
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="60vh">
        <CircularProgress />
      </Box>
    );
  }

  if (!invoice) {
    return null;
  }

  const canRecordPayment = invoice.status !== 'Cancelled' && invoice.status !== 'Paid';
  const balance = calculateBalance();

  return (
    <Container maxWidth="xl" sx={{ py: 3 }}>
      {/* Header */}
      <Box mb={3} display="flex" alignItems="center" gap={2}>
        <IconButton onClick={() => router.back()} size="small">
          <ArrowBackIcon />
        </IconButton>
        <Box flex={1}>
          <Typography variant="h4" fontWeight="bold">
            {invoice.invoice_number}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Invoice Details
          </Typography>
        </Box>
        <Chip
          label={invoice.status}
          color={getStatusColor(invoice.status)}
        />
        {invoice.is_overdue && invoice.status !== 'Paid' && invoice.status !== 'Cancelled' && (
          <Chip
            label="OVERDUE"
            color="error"
            icon={<WarningIcon />}
          />
        )}
        {canRecordPayment && (
          <Button
            variant="contained"
            size="small"
            startIcon={<PaymentIcon />}
            onClick={() => {
              setPaymentData({
                status: invoice.status === 'Unpaid' ? 'Partial' : invoice.status,
                payment_amount: balance.toString(),
                payment_method: '',
                payment_date: new Date().toISOString().split('T')[0],
                reference: ''
              });
              setShowPaymentDialog(true);
            }}
          >
            Record Payment
          </Button>
        )}
        <Button
          variant="outlined"
          size="small"
          startIcon={<PrintIcon />}
          onClick={() => window.open(`/distribution/invoices/${id}/print`, '_blank')}
        >
          Print
        </Button>
      </Box>

      <Grid container spacing={3}>
        {/* Left Column */}
        <Grid item xs={12} md={8}>
          {/* Distributor Info */}
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Bill To
              </Typography>
              <Divider sx={{ mb: 2 }} />
              <Grid container spacing={2}>
                <Grid item xs={12}>
                  <Typography variant="h6" fontWeight="bold">
                    {invoice.distributor_id.distributor_name}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Code: {invoice.distributor_id.distributor_code}
                  </Typography>
                </Grid>
                <Grid item xs={12}>
                  <Typography variant="body2" color="text.secondary">
                    Address
                  </Typography>
                  <Typography variant="body1">
                    {invoice.distributor_id.distributor_address}
                  </Typography>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Typography variant="body2" color="text.secondary">
                    Phone
                  </Typography>
                  <Typography variant="body1">
                    {invoice.distributor_id.distributor_phone}
                  </Typography>
                </Grid>
                {invoice.distributor_id.distributor_tin && (
                  <Grid item xs={12} sm={6}>
                    <Typography variant="body2" color="text.secondary">
                      TIN
                    </Typography>
                    <Typography variant="body1">
                      {invoice.distributor_id.distributor_tin}
                    </Typography>
                  </Grid>
                )}
              </Grid>
            </CardContent>
          </Card>

          {/* Items */}
          <Paper sx={{ mb: 3 }}>
            <Box p={2}>
              <Typography variant="h6" gutterBottom>
                Items ({invoice.total_items})
              </Typography>
            </Box>
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>DO Number</TableCell>
                    <TableCell>SKU</TableCell>
                    <TableCell align="right">Quantity</TableCell>
                    <TableCell align="right">Unit Price</TableCell>
                    <TableCell align="right">Amount</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {invoice.items.map((item, idx) => (
                    <TableRow key={idx}>
                      <TableCell>{item.order_number}</TableCell>
                      <TableCell>
                        <Typography variant="body2" sx={{ fontFamily: 'monospace', fontSize: '0.75rem' }}>
                          {item.sku}
                        </Typography>
                      </TableCell>
                      <TableCell align="right">
                        {item.qty} {item.unit}
                      </TableCell>
                      <TableCell align="right">
                        {formatCurrency(item.unit_price)}
                      </TableCell>
                      <TableCell align="right">
                        <strong>{formatCurrency(item.line_total)}</strong>
                      </TableCell>
                    </TableRow>
                  ))}
                  <TableRow>
                    <TableCell colSpan={4} align="right">
                      <strong>Subtotal:</strong>
                    </TableCell>
                    <TableCell align="right">
                      {formatCurrency(invoice.total_amount + invoice.discount)}
                    </TableCell>
                  </TableRow>
                  {invoice.discount > 0 && (
                    <TableRow>
                      <TableCell colSpan={4} align="right">
                        <strong>Discount:</strong>
                      </TableCell>
                      <TableCell align="right" sx={{ color: 'success.main' }}>
                        -{formatCurrency(invoice.discount)}
                      </TableCell>
                    </TableRow>
                  )}
                  <TableRow>
                    <TableCell colSpan={4} align="right">
                      <Typography variant="h6">Total Amount:</Typography>
                    </TableCell>
                    <TableCell align="right">
                      <Typography variant="h6" color="primary">
                        {formatCurrency(invoice.total_amount)}
                      </Typography>
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>
        </Grid>

        {/* Right Column */}
        <Grid item xs={12} md={4}>
          {/* Payment Summary */}
          <Card sx={{ mb: 3, bgcolor: balance > 0 ? 'error.light' : 'success.light' }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Payment Summary
              </Typography>
              <Divider sx={{ mb: 2 }} />
              <Grid container spacing={2}>
                <Grid item xs={12}>
                  <Typography variant="body2" color="text.secondary">
                    Total Amount
                  </Typography>
                  <Typography variant="h5" fontWeight="bold">
                    {formatCurrency(invoice.total_amount)}
                  </Typography>
                </Grid>
                <Grid item xs={12}>
                  <Typography variant="body2" color="text.secondary">
                    Total Paid
                  </Typography>
                  <Typography variant="h6" color="success.main">
                    {formatCurrency(calculateTotalPaid())}
                  </Typography>
                </Grid>
                <Grid item xs={12}>
                  <Typography variant="body2" color="text.secondary">
                    Balance Due
                  </Typography>
                  <Typography variant="h5" fontWeight="bold" color={balance > 0 ? 'error.main' : 'success.main'}>
                    {formatCurrency(balance)}
                  </Typography>
                </Grid>
                <Grid item xs={12}>
                  <Typography variant="body2" color="text.secondary">
                    Due Date
                  </Typography>
                  <Typography variant="body1" fontWeight="bold">
                    {new Date(invoice.due_date).toLocaleDateString('en-GB')}
                  </Typography>
                </Grid>
                {invoice.payment_terms && (
                  <Grid item xs={12}>
                    <Typography variant="body2" color="text.secondary">
                      Payment Terms
                    </Typography>
                    <Typography variant="body1">
                      {invoice.payment_terms}
                    </Typography>
                  </Grid>
                )}
              </Grid>
            </CardContent>
          </Card>

          {/* Related Documents */}
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom display="flex" alignItems="center" gap={1}>
                <TruckIcon /> Related Documents
              </Typography>
              <Divider sx={{ mb: 2 }} />
              <Grid container spacing={2}>
                <Grid item xs={12}>
                  <Typography variant="body2" color="text.secondary">
                    Delivery Chalan
                  </Typography>
                  <Chip
                    label={invoice.chalan_id.chalan_number}
                    size="small"
                    clickable
                    onClick={() => router.push(`/distribution/chalans/${invoice.chalan_id._id}`)}
                  />
                </Grid>
                <Grid item xs={12}>
                  <Typography variant="body2" color="text.secondary">
                    Load Sheet
                  </Typography>
                  <Chip
                    label={invoice.load_sheet_id.load_sheet_number}
                    size="small"
                    clickable
                    onClick={() => router.push(`/inventory/load-sheets/${invoice.load_sheet_id._id}`)}
                  />
                </Grid>
              </Grid>
            </CardContent>
          </Card>

          {/* Payment History */}
          {invoice.payment_history && invoice.payment_history.length > 0 && (
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Payment History
                </Typography>
                <Divider sx={{ mb: 2 }} />
                <Timeline sx={{ p: 0, m: 0 }}>
                  {invoice.payment_history.map((payment, idx) => (
                    <TimelineItem key={idx}>
                      <TimelineOppositeContent sx={{ flex: 0.3, py: 1 }}>
                        <Typography variant="caption" color="text.secondary">
                          {new Date(payment.payment_date).toLocaleDateString('en-GB')}
                        </Typography>
                      </TimelineOppositeContent>
                      <TimelineSeparator>
                        <TimelineDot color="success" />
                        {idx < invoice.payment_history.length - 1 && <TimelineConnector />}
                      </TimelineSeparator>
                      <TimelineContent sx={{ py: 1 }}>
                        <Typography variant="body2" fontWeight="bold">
                          {formatCurrency(payment.amount)}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {payment.payment_method}
                          {payment.reference && ` - Ref: ${payment.reference}`}
                        </Typography>
                        <Typography variant="caption" display="block" color="text.secondary">
                          by {payment.recorded_by.name}
                        </Typography>
                      </TimelineContent>
                    </TimelineItem>
                  ))}
                </Timeline>
              </CardContent>
            </Card>
          )}
        </Grid>
      </Grid>

      {/* Payment Dialog */}
      <Dialog open={showPaymentDialog} onClose={() => setShowPaymentDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Record Payment</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <Alert severity="info">
                Balance Due: <strong>{formatCurrency(balance)}</strong>
              </Alert>
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                select
                label="Payment Status"
                value={paymentData.status}
                onChange={(e) => setPaymentData({ ...paymentData, status: e.target.value })}
              >
                <MenuItem value="Partial">Partial Payment</MenuItem>
                <MenuItem value="Paid">Fully Paid</MenuItem>
              </TextField>
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                type="number"
                label="Payment Amount"
                value={paymentData.payment_amount}
                onChange={(e) => setPaymentData({ ...paymentData, payment_amount: e.target.value })}
                inputProps={{ min: 0, step: 0.01 }}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Payment Method"
                value={paymentData.payment_method}
                onChange={(e) => setPaymentData({ ...paymentData, payment_method: e.target.value })}
                placeholder="e.g. Cash, Bank Transfer, Cheque"
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                type="date"
                label="Payment Date"
                value={paymentData.payment_date}
                onChange={(e) => setPaymentData({ ...paymentData, payment_date: e.target.value })}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Reference (Optional)"
                value={paymentData.reference}
                onChange={(e) => setPaymentData({ ...paymentData, reference: e.target.value })}
                placeholder="Cheque number, Transaction ID, etc."
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowPaymentDialog(false)} disabled={updating}>
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={handlePaymentUpdate}
            disabled={updating || !paymentData.payment_amount || !paymentData.payment_method}
          >
            {updating ? <CircularProgress size={20} /> : 'Record Payment'}
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}
