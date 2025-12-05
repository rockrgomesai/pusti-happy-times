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
  LocalShipping as TruckIcon,
  Person as PersonIcon,
  Phone as PhoneIcon,
  Print as PrintIcon,
  Edit as EditIcon,
  Receipt as ReceiptIcon,
  Delete as DeleteIcon
} from '@mui/icons-material';
import { useRouter } from 'next/router';
import { useAuth } from '@/contexts/AuthContext';
import axios from 'axios';

interface ChalanDetail {
  _id: string;
  chalan_number: string;
  load_sheet_id: {
    _id: string;
    load_sheet_number: string;
  };
  load_sheet_number: string;
  distributor_id: {
    _id: string;
    distributor_name: string;
    distributor_code: string;
    distributor_address: string;
    distributor_phone: string;
  };
  items: Array<{
    do_id: string;
    order_number: string;
    sku: string;
    qty_delivered: number;
    unit: string;
    uom: string;
  }>;
  delivery_date: string;
  vehicle_no: string;
  driver_name: string;
  driver_phone: string;
  status: string;
  status_history: Array<{
    status: string;
    changed_at: string;
    changed_by: {
      name: string;
    };
  }>;
  total_items: number;
  total_quantity: number;
  created_by: {
    name: string;
  };
  created_at: string;
}

interface Invoice {
  _id: string;
  invoice_number: string;
  total_amount: number;
  status: string;
}

export default function ChalanDetailPage() {
  const router = useRouter();
  const { id } = router.query;
  const { user } = useAuth();

  const [chalan, setChalan] = useState<ChalanDetail | null>(null);
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [showStatusDialog, setShowStatusDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [newStatus, setNewStatus] = useState('');

  useEffect(() => {
    if (id) {
      loadChalanDetail();
    }
  }, [id]);

  const loadChalanDetail = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const response = await axios.get(
        `${process.env.NEXT_PUBLIC_API_URL}/distribution/chalans/${id}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (response.data.success) {
        setChalan(response.data.data.chalan);
        setInvoice(response.data.data.invoice);
      }
    } catch (error: any) {
      console.error('Error loading chalan:', error);
      alert(error.response?.data?.message || 'Failed to load chalan');
      router.back();
    } finally {
      setLoading(false);
    }
  };

  const handleStatusUpdate = async () => {
    try {
      setUpdating(true);
      const token = localStorage.getItem('token');
      const response = await axios.patch(
        `${process.env.NEXT_PUBLIC_API_URL}/distribution/chalans/${id}/status`,
        { status: newStatus },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (response.data.success) {
        alert('Status updated successfully!');
        setShowStatusDialog(false);
        loadChalanDetail();
      }
    } catch (error: any) {
      console.error('Error updating status:', error);
      alert(error.response?.data?.message || 'Failed to update status');
    } finally {
      setUpdating(false);
    }
  };

  const handleDelete = async () => {
    try {
      setDeleting(true);
      const token = localStorage.getItem('token');
      const response = await axios.delete(
        `${process.env.NEXT_PUBLIC_API_URL}/distribution/chalans/${id}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (response.data.success) {
        alert('Chalan cancelled successfully! Stock has been restored.');
        router.push('/distribution/chalans');
      }
    } catch (error: any) {
      console.error('Error cancelling chalan:', error);
      alert(error.response?.data?.message || 'Failed to cancel chalan');
    } finally {
      setDeleting(false);
      setShowDeleteDialog(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Pending':
        return 'warning';
      case 'InTransit':
        return 'info';
      case 'Delivered':
        return 'success';
      case 'Cancelled':
        return 'error';
      default:
        return 'default';
    }
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="60vh">
        <CircularProgress />
      </Box>
    );
  }

  if (!chalan) {
    return null;
  }

  const canUpdateStatus = chalan.status !== 'Cancelled' && chalan.status !== 'Delivered';
  const canDelete = chalan.status === 'Pending';

  return (
    <Container maxWidth="xl" sx={{ py: 3 }}>
      {/* Header */}
      <Box mb={3} display="flex" alignItems="center" gap={2}>
        <IconButton onClick={() => router.back()} size="small">
          <ArrowBackIcon />
        </IconButton>
        <Box flex={1}>
          <Typography variant="h4" fontWeight="bold">
            {chalan.chalan_number}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Delivery Chalan Details
          </Typography>
        </Box>
        <Chip
          label={chalan.status}
          color={getStatusColor(chalan.status)}
        />
        {canUpdateStatus && (
          <Button
            variant="outlined"
            size="small"
            startIcon={<EditIcon />}
            onClick={() => {
              setNewStatus(chalan.status);
              setShowStatusDialog(true);
            }}
          >
            Update Status
          </Button>
        )}
        <Button
          variant="outlined"
          size="small"
          startIcon={<PrintIcon />}
          onClick={() => window.open(`/distribution/chalans/${id}/print`, '_blank')}
        >
          Print
        </Button>
        {canDelete && (
          <Button
            variant="outlined"
            color="error"
            size="small"
            startIcon={<DeleteIcon />}
            onClick={() => setShowDeleteDialog(true)}
          >
            Cancel Chalan
          </Button>
        )}
      </Box>

      <Grid container spacing={3}>
        {/* Left Column */}
        <Grid item xs={12} md={8}>
          {/* Distributor Info */}
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Distributor Information
              </Typography>
              <Divider sx={{ mb: 2 }} />
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                  <Typography variant="body2" color="text.secondary">
                    Name
                  </Typography>
                  <Typography variant="body1" fontWeight="bold">
                    {chalan.distributor_id.distributor_name}
                  </Typography>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Typography variant="body2" color="text.secondary">
                    Code
                  </Typography>
                  <Typography variant="body1">
                    {chalan.distributor_id.distributor_code}
                  </Typography>
                </Grid>
                <Grid item xs={12}>
                  <Typography variant="body2" color="text.secondary">
                    Address
                  </Typography>
                  <Typography variant="body1">
                    {chalan.distributor_id.distributor_address}
                  </Typography>
                </Grid>
                <Grid item xs={12}>
                  <Typography variant="body2" color="text.secondary">
                    Phone
                  </Typography>
                  <Typography variant="body1">
                    {chalan.distributor_id.distributor_phone}
                  </Typography>
                </Grid>
              </Grid>
            </CardContent>
          </Card>

          {/* Items */}
          <Paper sx={{ mb: 3 }}>
            <Box p={2}>
              <Typography variant="h6" gutterBottom>
                Items ({chalan.total_items})
              </Typography>
            </Box>
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>DO Number</TableCell>
                    <TableCell>SKU</TableCell>
                    <TableCell>UOM</TableCell>
                    <TableCell align="right">Quantity</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {chalan.items.map((item, idx) => (
                    <TableRow key={idx}>
                      <TableCell>{item.order_number}</TableCell>
                      <TableCell>
                        <Typography variant="body2" sx={{ fontFamily: 'monospace', fontSize: '0.75rem' }}>
                          {item.sku}
                        </Typography>
                      </TableCell>
                      <TableCell>{item.uom}</TableCell>
                      <TableCell align="right">
                        <strong>{item.qty_delivered}</strong> {item.unit}
                      </TableCell>
                    </TableRow>
                  ))}
                  <TableRow>
                    <TableCell colSpan={3} align="right">
                      <strong>Total Quantity:</strong>
                    </TableCell>
                    <TableCell align="right">
                      <Typography variant="h6" color="primary">
                        {chalan.total_quantity} CTN
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
          {/* Delivery Info */}
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom display="flex" alignItems="center" gap={1}>
                <TruckIcon /> Delivery Information
              </Typography>
              <Divider sx={{ mb: 2 }} />
              <Grid container spacing={2}>
                <Grid item xs={12}>
                  <Typography variant="body2" color="text.secondary">
                    Load Sheet
                  </Typography>
                  <Chip
                    label={chalan.load_sheet_number}
                    size="small"
                    clickable
                    onClick={() => router.push(`/inventory/load-sheets/${chalan.load_sheet_id._id}`)}
                  />
                </Grid>
                <Grid item xs={12}>
                  <Typography variant="body2" color="text.secondary">
                    Delivery Date
                  </Typography>
                  <Typography variant="body1" fontWeight="bold">
                    {new Date(chalan.delivery_date).toLocaleDateString('en-GB')}
                  </Typography>
                </Grid>
                <Grid item xs={12}>
                  <Typography variant="body2" color="text.secondary">
                    Vehicle Number
                  </Typography>
                  <Typography variant="body1">
                    {chalan.vehicle_no}
                  </Typography>
                </Grid>
                <Grid item xs={12}>
                  <Typography variant="body2" color="text.secondary">
                    Driver Name
                  </Typography>
                  <Typography variant="body1">
                    {chalan.driver_name}
                  </Typography>
                </Grid>
                <Grid item xs={12}>
                  <Typography variant="body2" color="text.secondary">
                    Driver Phone
                  </Typography>
                  <Typography variant="body1">
                    {chalan.driver_phone}
                  </Typography>
                </Grid>
              </Grid>
            </CardContent>
          </Card>

          {/* Related Invoice */}
          {invoice && (
            <Card sx={{ mb: 3, bgcolor: 'primary.light' }}>
              <CardContent>
                <Typography variant="h6" gutterBottom display="flex" alignItems="center" gap={1}>
                  <ReceiptIcon /> Related Invoice
                </Typography>
                <Divider sx={{ mb: 2 }} />
                <Box>
                  <Chip
                    label={invoice.invoice_number}
                    color="primary"
                    clickable
                    onClick={() => router.push(`/distribution/invoices/${invoice._id}`)}
                    sx={{ mb: 1 }}
                  />
                  <Typography variant="body2">
                    Amount: <strong>৳{parseFloat(invoice.total_amount.toString()).toLocaleString('en-BD', { minimumFractionDigits: 2 })}</strong>
                  </Typography>
                  <Typography variant="body2">
                    Status: <Chip label={invoice.status} size="small" color={invoice.status === 'Paid' ? 'success' : 'warning'} />
                  </Typography>
                </Box>
              </CardContent>
            </Card>
          )}

          {/* Status History */}
          {chalan.status_history && chalan.status_history.length > 0 && (
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Status History
                </Typography>
                <Divider sx={{ mb: 2 }} />
                <Timeline sx={{ p: 0, m: 0 }}>
                  {chalan.status_history.map((history, idx) => (
                    <TimelineItem key={idx}>
                      <TimelineOppositeContent sx={{ flex: 0.3, py: 1 }}>
                        <Typography variant="caption" color="text.secondary">
                          {new Date(history.changed_at).toLocaleString('en-GB', {
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </Typography>
                      </TimelineOppositeContent>
                      <TimelineSeparator>
                        <TimelineDot color={getStatusColor(history.status)} />
                        {idx < chalan.status_history.length - 1 && <TimelineConnector />}
                      </TimelineSeparator>
                      <TimelineContent sx={{ py: 1 }}>
                        <Typography variant="body2" fontWeight="bold">
                          {history.status}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          by {history.changed_by.name}
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

      {/* Update Status Dialog */}
      <Dialog open={showStatusDialog} onClose={() => setShowStatusDialog(false)} maxWidth="xs" fullWidth>
        <DialogTitle>Update Chalan Status</DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            select
            label="New Status"
            value={newStatus}
            onChange={(e) => setNewStatus(e.target.value)}
            sx={{ mt: 2 }}
          >
            <MenuItem value="Pending">Pending</MenuItem>
            <MenuItem value="InTransit">In Transit</MenuItem>
            <MenuItem value="Delivered">Delivered</MenuItem>
          </TextField>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowStatusDialog(false)} disabled={updating}>
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={handleStatusUpdate}
            disabled={updating || newStatus === chalan.status}
          >
            {updating ? <CircularProgress size={20} /> : 'Update'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={showDeleteDialog} onClose={() => setShowDeleteDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Cancel Chalan?</DialogTitle>
        <DialogContent>
          <Alert severity="warning" sx={{ mb: 2 }}>
            This action will:
          </Alert>
          <Box component="ul" sx={{ pl: 2 }}>
            <li>Cancel this chalan</li>
            <li>Cancel the related invoice</li>
            <li>Restore stock quantities to depot</li>
            <li>Remove references from load sheet</li>
          </Box>
          <Alert severity="error" sx={{ mt: 2 }}>
            This action cannot be undone!
          </Alert>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowDeleteDialog(false)} disabled={deleting}>
            Cancel
          </Button>
          <Button
            variant="contained"
            color="error"
            onClick={handleDelete}
            disabled={deleting}
          >
            {deleting ? <CircularProgress size={20} /> : 'Confirm Cancel'}
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}
