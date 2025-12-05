'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  Box,
  Container,
  Paper,
  Typography,
  Button,
  TextField,
  MenuItem,
  Grid,
  Card,
  CardContent,
  Alert,
  CircularProgress,
  Divider,
  IconButton,
  InputAdornment,
} from "@mui/material";
import { ArrowBack, Lock, Save } from "@mui/icons-material";
import { apiClient } from "@/lib/api";

interface Transport {
  _id: string;
  transport: string;
}

interface DOItem {
  do_id: string;
  order_number: string;
  order_date: string;
  sku: string;
  order_qty: number;
  previously_delivered_qty: number;
  undelivered_qty: number;
  delivery_qty: number;
  unit: string;
}

interface DistributorItems {
  distributor_id: string;
  distributor_name: string;
  distributor_code: string;
  do_items: DOItem[];
}

interface LoadSheet {
  _id: string;
  load_sheet_number: string;
  status: string;
  depot_id: string;
  distributors: DistributorItems[];
}

interface Adjustment {
  distributor_id: string;
  do_id: string;
  sku: string;
  new_delivery_qty: number;
}

export default function LockLoadSheetPage() {
  const params = useParams();
  const router = useRouter();
  const loadSheetId = params?.id as string;

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [loadSheet, setLoadSheet] = useState<LoadSheet | null>(null);
  const [transports, setTransports] = useState<Transport[]>([]);
  const [error, setError] = useState<string>('');
  const [success, setSuccess] = useState<string>('');

  // Form state
  const [transportId, setTransportId] = useState('');
  const [vehicleNo, setVehicleNo] = useState('');
  const [driverName, setDriverName] = useState('');
  const [driverPhone, setDriverPhone] = useState('');
  const [adjustments, setAdjustments] = useState<Adjustment[]>([]);

  useEffect(() => {
    fetchData();
  }, [loadSheetId]);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError('');

      // Fetch load sheet
      const lsResponse = await apiClient.get(`/inventory/load-sheets/${loadSheetId}`);
      if (lsResponse.success) {
        setLoadSheet(lsResponse.data);
      }

      // Fetch transports
      const tResponse = await apiClient.get('/transports?limit=100');
      console.log('Transports response:', tResponse);
      if (tResponse.success && tResponse.data) {
        setTransports(Array.isArray(tResponse.data) ? tResponse.data : []);
        console.log('Transports set:', tResponse.data.length);
      }
    } catch (err: any) {
      console.error('Error fetching data:', err);
      const errorMsg = err.response?.data?.message || err.message || 'Failed to fetch data';
      setError(errorMsg);
      console.error('Full error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleAdjustmentChange = (distributorId: string, doId: string, sku: string, value: number) => {
    const existing = adjustments.find(a => a.distributor_id === distributorId && a.do_id === doId && a.sku === sku);

    if (existing) {
      setAdjustments(prev =>
        prev.map(a =>
          a.distributor_id === distributorId && a.do_id === doId && a.sku === sku
            ? { ...a, new_delivery_qty: value }
            : a
        )
      );
    } else {
      setAdjustments(prev => [
        ...prev,
        {
          distributor_id: distributorId,
          do_id: doId,
          sku: sku,
          new_delivery_qty: value,
        }
      ]);
    }
  };

  const getAdjustedValue = (distributorId: string, doId: string, sku: string, originalQty: number): number => {
    const adjustment = adjustments.find(a => a.distributor_id === distributorId && a.do_id === doId && a.sku === sku);
    return adjustment ? adjustment.new_delivery_qty : originalQty;
  };

  const handleSubmit = async () => {
    try {
      // Validation
      if (!transportId) {
        setError('Please select a transport');
        return;
      }
      if (!vehicleNo.trim()) {
        setError('Please enter vehicle number');
        return;
      }
      if (!driverName.trim()) {
        setError('Please enter driver name');
        return;
      }
      if (!driverPhone.trim()) {
        setError('Please enter driver phone');
        return;
      }

      // Validate adjustments - only reductions allowed
      for (const adj of adjustments) {
        let originalQty = 0;
        for (const dist of loadSheet.distributors) {
          if (dist.distributor_id === adj.distributor_id) {
            const item = dist.do_items.find(i => i.do_id === adj.do_id && i.sku === adj.sku);
            if (item) {
              originalQty = item.delivery_qty;
              break;
            }
          }
        }

        if (adj.new_delivery_qty > originalQty) {
          setError(`Cannot increase quantity for ${adj.sku}. Only reductions are allowed.`);
          return;
        }
      }

      setSubmitting(true);
      setError('');

      const payload = {
        transport_id: transportId,
        vehicle_no: vehicleNo,
        driver_name: driverName,
        driver_phone: driverPhone,
        adjustments: adjustments.length > 0 ? adjustments : undefined,
      };

      const response = await apiClient.put(`/inventory/load-sheets/${loadSheetId}/lock`, payload);

      if (response.success) {
        setSuccess('Load Sheet locked successfully!');
        setTimeout(() => {
          router.push(`/inventory/load-sheets/${loadSheetId}`);
        }, 1500);
      }
    } catch (err: any) {
      console.error('Error locking load sheet:', err);
      setError(err.response?.data?.message || 'Failed to lock load sheet');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="80vh">
        <CircularProgress />
      </Box>
    );
  }

  if (!loadSheet) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Alert severity="error">Load Sheet not found</Alert>
      </Container>
    );
  }

  if (!loadSheet.distributors || loadSheet.distributors.length === 0) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Alert severity="warning">Load Sheet has no distributors</Alert>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Box display="flex" alignItems="center" mb={3}>
        <IconButton onClick={() => router.back()} sx={{ mr: 2 }}>
          <ArrowBack />
        </IconButton>
        <Box>
          <Typography variant="h4" fontWeight="bold">
            Lock Load Sheet
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {loadSheet.load_sheet_number}
          </Typography>
        </Box>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}

      {success && (
        <Alert severity="success" sx={{ mb: 3 }}>
          {success}
        </Alert>
      )}

      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          Transport Details
        </Typography>
        <Divider sx={{ mb: 3 }} />

        <Grid container spacing={2}>
          <Grid item xs={12} sx={{ width: '100%' }}>
            <TextField
              select
              fullWidth
              label="Transport"
              value={transportId}
              onChange={(e) => setTransportId(e.target.value)}
              required
              size="small"
              helperText={transports.length === 0 ? "No transports available" : ""}
              sx={{ minWidth: '100%' }}
            >
              {transports.length === 0 ? (
                <MenuItem value="" disabled>
                  No transports found
                </MenuItem>
              ) : (
                transports.map((transport) => (
                  <MenuItem key={transport._id} value={transport._id}>
                    {transport.transport}
                  </MenuItem>
                ))
              )}
            </TextField>
          </Grid>

          <Grid item xs={12} sm={4}>
            <TextField
              fullWidth
              label="Vehicle Number *"
              value={vehicleNo}
              onChange={(e) => setVehicleNo(e.target.value)}
              required
              placeholder="e.g., DHK-123456"
              size="small"
            />
          </Grid>

          <Grid item xs={12} sm={4}>
            <TextField
              fullWidth
              label="Driver Name *"
              value={driverName}
              onChange={(e) => setDriverName(e.target.value)}
              required
              size="small"
            />
          </Grid>

          <Grid item xs={12} sm={4}>
            <TextField
              fullWidth
              label="Driver Phone *"
              value={driverPhone}
              onChange={(e) => setDriverPhone(e.target.value)}
              size="small"
              required
              placeholder="e.g., 01XXXXXXXXX"
            />
          </Grid>
        </Grid>
      </Paper>

      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          Quantity Adjustments (Optional)
        </Typography>
        <Typography variant="body2" color="text.secondary" gutterBottom>
          You can only reduce quantities. Leave unchanged if no adjustment needed.
        </Typography>
        <Divider sx={{ mb: 3 }} />

        {loadSheet.distributors.map((distributor) => (
          <Card key={distributor.distributor_id} sx={{ mb: 2 }}>
            <CardContent>
              <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
                {distributor.distributor_name} ({distributor.distributor_code})
              </Typography>
              <Divider sx={{ mb: 2 }} />

              {distributor.do_items.map((item) => (
                <Grid container spacing={2} key={`${item.do_id}_${item.sku}`} sx={{ mb: 2 }}>
                  <Grid item xs={12}>
                    <Typography variant="body2" fontWeight="medium">
                      {item.sku} - DO: {item.order_number}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Ordered: {item.order_qty} {item.unit} | Undelivered: {item.undelivered_qty} {item.unit}
                    </Typography>
                  </Grid>

                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      type="number"
                      label={`Delivery Quantity (${item.unit})`}
                      size="small"
                      value={getAdjustedValue(distributor.distributor_id, item.do_id, item.sku, item.delivery_qty)}
                      onChange={(e) =>
                        handleAdjustmentChange(distributor.distributor_id, item.do_id, item.sku, parseInt(e.target.value) || 0)
                      }
                      InputProps={{
                        endAdornment: (
                          <InputAdornment position="end">
                            <Typography variant="caption" color="text.secondary">
                              / {item.delivery_qty}
                            </Typography>
                          </InputAdornment>
                        ),
                      }}
                      inputProps={{ min: 0, max: item.delivery_qty }}
                    />
                  </Grid>
                </Grid>
              ))}
            </CardContent>
          </Card>
        ))}
      </Paper>

      <Box display="flex" gap={2} justifyContent="flex-end">
        <Button variant="outlined" onClick={() => router.back()} disabled={submitting}>
          Cancel
        </Button>
        <Button
          variant="contained"
          color="primary"
          startIcon={submitting ? <CircularProgress size={20} /> : <Lock />}
          onClick={handleSubmit}
          disabled={submitting}
        >
          {submitting ? 'Locking...' : 'Lock & Finalize'}
        </Button>
      </Box>
    </Container>
  );
}
