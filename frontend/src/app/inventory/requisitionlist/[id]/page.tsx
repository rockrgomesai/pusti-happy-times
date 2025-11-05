'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import {
  Box,
  Paper,
  Typography,
  Button,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Grid,
  Divider,
  CircularProgress,
  Alert,
} from '@mui/material';
import {
  ArrowBack as ArrowBackIcon,
} from '@mui/icons-material';
import { useAuth } from '@/contexts/AuthContext';
import api from '@/lib/api';

interface RequisitionDetail {
  _id: string;
  product_id: {
    _id: string;
    sku: string;
    erp_id: string;
    ctn_pcs: number;
    wt_pcs: number;
  };
  qty: number;
  note?: string;
}

interface Requisition {
  _id: string;
  requisition_no: string;
  requisition_date: string;
  from_depot_id: {
    _id: string;
    name: string;
    code?: string;
  };
  status: 'submitted' | 'approved' | 'rejected' | 'fulfilled' | 'cancelled';
  details: RequisitionDetail[];
  created_by: {
    _id: string;
    username: string;
  };
  updated_by?: {
    _id: string;
    username: string;
  };
  created_at: string;
  updated_at: string;
}

const statusColors: Record<Requisition['status'], 'default' | 'primary' | 'success' | 'error' | 'warning'> = {
  submitted: 'primary',
  approved: 'success',
  rejected: 'error',
  fulfilled: 'success',
  cancelled: 'default',
};

export default function RequisitionDetailPage() {
  const router = useRouter();
  const params = useParams();
  const requisitionId = params.id as string;
  const { user, loading: authLoading } = useAuth();

  const [requisition, setRequisition] = useState<Requisition | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    if (user && requisitionId) {
      loadRequisition();
    }
  }, [user, requisitionId]);

  const loadRequisition = async () => {
    try {
      setLoading(true);
      setError('');

      const response = await api.get(`/inventory/requisitions/${requisitionId}`);
      setRequisition(response.data.data);
    } catch (err: any) {
      console.error('Error loading requisition:', err);
      setError(err.response?.data?.message || 'Failed to load requisition details');
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    router.push('/inventory/requisitionlist');
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getTotalQuantity = () => {
    if (!requisition) return 0;
    return requisition.details.reduce((sum, detail) => sum + detail.qty, 0);
  };

  if (authLoading || loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ p: 3 }}>
        <Paper sx={{ p: 3 }}>
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
          <Button variant="outlined" startIcon={<ArrowBackIcon />} onClick={handleBack}>
            Back to List
          </Button>
        </Paper>
      </Box>
    );
  }

  if (!requisition) {
    return (
      <Box sx={{ p: 3 }}>
        <Paper sx={{ p: 3 }}>
          <Alert severity="warning" sx={{ mb: 2 }}>
            Requisition not found
          </Alert>
          <Button variant="outlined" startIcon={<ArrowBackIcon />} onClick={handleBack}>
            Back to List
          </Button>
        </Paper>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Paper sx={{ p: 3 }}>
        {/* Header */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Button variant="outlined" startIcon={<ArrowBackIcon />} onClick={handleBack}>
              Back
            </Button>
            <Typography variant="h5" component="h1">
              Requisition Details
            </Typography>
          </Box>
          <Chip
            label={requisition.status.toUpperCase()}
            color={statusColors[requisition.status]}
            size="medium"
          />
        </Box>

        <Divider sx={{ mb: 3 }} />

        {/* Requisition Info */}
        <Grid container spacing={3} sx={{ mb: 4 }}>
          <Grid item xs={12} md={6}>
            <Typography variant="subtitle2" color="text.secondary" gutterBottom>
              Requisition Number
            </Typography>
            <Typography variant="h6" gutterBottom>
              {requisition.requisition_no}
            </Typography>
          </Grid>

          <Grid item xs={12} md={6}>
            <Typography variant="subtitle2" color="text.secondary" gutterBottom>
              Requisition Date
            </Typography>
            <Typography variant="h6" gutterBottom>
              {formatDate(requisition.requisition_date)}
            </Typography>
          </Grid>

          <Grid item xs={12} md={6}>
            <Typography variant="subtitle2" color="text.secondary" gutterBottom>
              From Facility
            </Typography>
            <Typography variant="body1">
              {requisition.from_depot_id?.name || 'N/A'}
              {requisition.from_depot_id?.code && ` (${requisition.from_depot_id.code})`}
            </Typography>
          </Grid>

          <Grid item xs={12} md={6}>
            <Typography variant="subtitle2" color="text.secondary" gutterBottom>
              Total Items / Total Quantity
            </Typography>
            <Typography variant="body1">
              {requisition.details.length} items / {getTotalQuantity().toFixed(2)} CTN
            </Typography>
          </Grid>

          <Grid item xs={12} md={6}>
            <Typography variant="subtitle2" color="text.secondary" gutterBottom>
              Created By
            </Typography>
            <Typography variant="body1">
              {requisition.created_by?.username || 'N/A'}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {formatDateTime(requisition.created_at)}
            </Typography>
          </Grid>

          <Grid item xs={12} md={6}>
            <Typography variant="subtitle2" color="text.secondary" gutterBottom>
              Last Updated
            </Typography>
            <Typography variant="body1">
              {requisition.updated_by?.username || 'N/A'}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {formatDateTime(requisition.updated_at)}
            </Typography>
          </Grid>
        </Grid>

        <Divider sx={{ mb: 3 }} />

        {/* Items Table */}
        <Typography variant="h6" gutterBottom sx={{ mb: 2 }}>
          Requisition Items
        </Typography>

        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell sx={{ fontWeight: 'bold' }}>#</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>SKU</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>ERP ID</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>CTN/PCs</TableCell>
                <TableCell align="right" sx={{ fontWeight: 'bold' }}>Qty (CTN)</TableCell>
                <TableCell align="right" sx={{ fontWeight: 'bold' }}>Qty (PCs)</TableCell>
                <TableCell align="right" sx={{ fontWeight: 'bold' }}>Wt (MT)</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>Note</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {requisition.details.map((detail, index) => {
                const qtyPcs = detail.qty * (detail.product_id?.ctn_pcs || 0);
                const weightMt = (detail.qty * (detail.product_id?.ctn_pcs || 0) * (detail.product_id?.wt_pcs || 0)) / 1000;
                
                return (
                  <TableRow key={detail._id}>
                    <TableCell>{index + 1}</TableCell>
                    <TableCell>{detail.product_id?.sku || 'N/A'}</TableCell>
                    <TableCell>{detail.product_id?.erp_id || 'N/A'}</TableCell>
                    <TableCell>{detail.product_id?.ctn_pcs || 'N/A'}</TableCell>
                    <TableCell align="right">{detail.qty.toFixed(2)}</TableCell>
                    <TableCell align="right">{qtyPcs.toFixed(0)}</TableCell>
                    <TableCell align="right">{weightMt.toFixed(4)}</TableCell>
                    <TableCell>
                      {detail.note ? (
                        <Typography variant="body2" sx={{ maxWidth: 200 }}>
                          {detail.note}
                        </Typography>
                      ) : (
                        '-'
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>

        {/* Summary Row */}
        <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 2, pr: 2 }}>
          <Box sx={{ textAlign: 'right' }}>
            <Typography variant="subtitle1" fontWeight="bold">
              Total: {getTotalQuantity().toFixed(2)} CTN
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {requisition.details.length} items
            </Typography>
          </Box>
        </Box>
      </Paper>
    </Box>
  );
}
