"use client";

import React, { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  TextField,
  Grid,
  Alert,
  CircularProgress,
  Stack,
  Paper,
  Divider,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from "@mui/material";
import {
  LocalShipping,
  ArrowBack,
  CheckCircle,
  Warning,
  Cancel,
} from "@mui/icons-material";
import { useAuth } from '@/contexts/AuthContext';
import axiosInstance from "@/lib/api";
import { format } from "date-fns";

interface ChalanItem {
  sku: string;
  qty_ctn: number;
  qty_pcs: number;
}

interface ChalanDetail {
  _id: string;
  chalan_no: string;
  load_sheet_id: {
    load_sheet_number: string;
  };
  delivery_date: string;
  vehicle_no: string;
  driver_name: string;
  depot_id: {
    facility_name: string;
  };
  items: ChalanItem[];
  status: string;
  receipt_status: string;
}

interface ReceivedItem {
  sku: string;
  delivered_qty: number;
  received_qty: number;
  variance_qty: number;
  variance_reason: string;
}

export default function ReceiveChalanPage() {
  const router = useRouter();
  const params = useParams();
  const chalanId = params.id as string;
  const { user } = useAuth();

  const [chalan, setChalan] = useState<ChalanDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  // Received items state
  const [receivedItems, setReceivedItems] = useState<ReceivedItem[]>([]);

  // Confirmation dialog
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);

  // Fetch chalan details
  useEffect(() => {
    const fetchChalanDetails = async () => {
      if (!user?.distributor_id) {
        setError("You are not associated with any distributor");
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const response = await axiosInstance.get(
          `/distributor/chalans/${chalanId}/receive-details`
        );

        if (response.data.success) {
          const chalanData = response.data.data;
          setChalan(chalanData);

          // Initialize received items with delivered quantities
          const initialItems: ReceivedItem[] = chalanData.items.map((item: ChalanItem) => ({
            sku: item.sku,
            delivered_qty: parseFloat(item.qty_ctn.toString()),
            received_qty: parseFloat(item.qty_ctn.toString()),
            variance_qty: 0,
            variance_reason: "",
          }));
          setReceivedItems(initialItems);
          setError("");
        }
      } catch (err: any) {
        setError(err.response?.data?.message || "Failed to fetch chalan details");
        console.error("Fetch chalan details error:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchChalanDetails();
  }, [chalanId, user]);

  // Handle received quantity change
  const handleReceivedQtyChange = (sku: string, value: string) => {
    const receivedQty = parseFloat(value) || 0;
    
    setReceivedItems((prev) =>
      prev.map((item) => {
        if (item.sku === sku) {
          const variance = item.delivered_qty - receivedQty;
          return {
            ...item,
            received_qty: receivedQty,
            variance_qty: variance,
          };
        }
        return item;
      })
    );
  };

  // Handle variance reason change
  const handleVarianceReasonChange = (sku: string, value: string) => {
    setReceivedItems((prev) =>
      prev.map((item) => (item.sku === sku ? { ...item, variance_reason: value } : item))
    );
  };

  // Validate form
  const validateForm = (): string | null => {
    for (const item of receivedItems) {
      if (item.received_qty < 0 || item.received_qty > item.delivered_qty) {
        return `Invalid received quantity for SKU ${item.sku}`;
      }
      if (item.variance_qty > 0 && !item.variance_reason.trim()) {
        return `Please provide variance reason for SKU ${item.sku}`;
      }
    }
    return null;
  };

  // Submit receipt
  const handleSubmit = async () => {
    const validationError = validateForm();
    if (validationError) {
      setError(validationError);
      return;
    }

    try {
      setSubmitting(true);
      setError("");

      const response = await axiosInstance.post(
        `/distributor/chalans/${chalanId}/receive`,
        {
          received_items: receivedItems.map((item) => ({
            sku: item.sku,
            received_qty: item.received_qty,
            variance_reason: item.variance_reason,
          })),
        }
      );

      if (response.data.success) {
        setSuccessMessage("Chalan received successfully!");
        setConfirmDialogOpen(false);
        
        // Redirect after 2 seconds
        setTimeout(() => {
          router.push("/distributor/receive");
        }, 2000);
      }
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to receive chalan");
      console.error("Receive chalan error:", err);
      setConfirmDialogOpen(false);
    } finally {
      setSubmitting(false);
    }
  };

  // Calculate summary
  const getTotalDelivered = () =>
    receivedItems.reduce((sum, item) => sum + item.delivered_qty, 0);

  const getTotalReceived = () =>
    receivedItems.reduce((sum, item) => sum + item.received_qty, 0);

  const getTotalVariance = () =>
    receivedItems.reduce((sum, item) => sum + item.variance_qty, 0);

  const getVarianceCount = () =>
    receivedItems.filter((item) => item.variance_qty > 0).length;

  // Get row color based on variance
  const getRowColor = (item: ReceivedItem) => {
    if (item.variance_qty === 0) return "success.50";
    if (item.received_qty === 0) return "error.50";
    return "warning.50";
  };

  if (!user?.distributor_id && !loading) {
    return (
      <Box sx={{ p: { xs: 2, sm: 3 } }}>
        <Alert severity="error">
          You are not associated with any distributor. Please contact your administrator.
        </Alert>
      </Box>
    );
  }

  if (loading) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "60vh" }}>
        <CircularProgress />
      </Box>
    );
  }

  if (!chalan) {
    return (
      <Box sx={{ p: { xs: 2, sm: 3 } }}>
        <Alert severity="error">Chalan not found or already received</Alert>
        <Button
          variant="outlined"
          startIcon={<ArrowBack />}
          onClick={() => router.back()}
          sx={{ mt: 2 }}
        >
          Go Back
        </Button>
      </Box>
    );
  }

  return (
    <Box sx={{ p: { xs: 2, sm: 3 } }}>
      {/* Header */}
      <Paper elevation={0} sx={{ p: 2, mb: 3, bgcolor: "primary.main", color: "white" }}>
        <Stack direction="row" alignItems="center" justifyContent="space-between">
          <Stack direction="row" alignItems="center" spacing={2}>
            <LocalShipping sx={{ fontSize: 32 }} />
            <Box>
              <Typography variant="h5" fontWeight="bold">
                Receive Chalan
              </Typography>
              <Typography variant="body2" sx={{ opacity: 0.9 }}>
                {chalan.chalan_no}
              </Typography>
            </Box>
          </Stack>
          <Button
            variant="outlined"
            startIcon={<ArrowBack />}
            onClick={() => router.back()}
            sx={{ color: "white", borderColor: "white" }}
          >
            Back
          </Button>
        </Stack>
      </Paper>

      {/* Success Message */}
      {successMessage && (
        <Alert severity="success" icon={<CheckCircle />} sx={{ mb: 3 }}>
          {successMessage}
        </Alert>
      )}

      {/* Error Message */}
      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError("")}>
          {error}
        </Alert>
      )}

      {/* Chalan Info Card */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom fontWeight="bold">
            Chalan Information
          </Typography>
          <Divider sx={{ mb: 2 }} />
          <Grid container spacing={2}>
            <Grid item xs={6} sm={4} md={3}>
              <Typography variant="body2" color="text.secondary">
                Load Sheet
              </Typography>
              <Typography variant="body1" fontWeight="medium">
                {chalan.load_sheet_id.load_sheet_number}
              </Typography>
            </Grid>
            {chalan.delivery_date && (
              <Grid item xs={6} sm={4} md={3}>
                <Typography variant="body2" color="text.secondary">
                  Delivery Date
                </Typography>
                <Typography variant="body1" fontWeight="medium">
                  {format(new Date(chalan.delivery_date), "dd MMM yyyy")}
                </Typography>
              </Grid>
            )}
            <Grid item xs={6} sm={4} md={3}>
              <Typography variant="body2" color="text.secondary">
                From Depot
              </Typography>
              <Typography variant="body1" fontWeight="medium">
                {chalan.depot_id.facility_name}
              </Typography>
            </Grid>
            <Grid item xs={6} sm={4} md={3}>
              <Typography variant="body2" color="text.secondary">
                Vehicle No
              </Typography>
              <Typography variant="body1" fontWeight="medium">
                {chalan.vehicle_no}
              </Typography>
            </Grid>
            <Grid item xs={6} sm={4} md={3}>
              <Typography variant="body2" color="text.secondary">
                Driver Name
              </Typography>
              <Typography variant="body1" fontWeight="medium">
                {chalan.driver_name}
              </Typography>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Items Table */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom fontWeight="bold">
            Received Items
          </Typography>
          <Typography variant="body2" color="text.secondary" gutterBottom>
            Edit received quantities if there's any variance (damage, loss, etc.)
          </Typography>
          <Divider sx={{ my: 2 }} />

          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>
                    <strong>SKU</strong>
                  </TableCell>
                  <TableCell align="right">
                    <strong>Delivered</strong>
                  </TableCell>
                  <TableCell align="right">
                    <strong>Received</strong>
                  </TableCell>
                  <TableCell align="right">
                    <strong>Variance</strong>
                  </TableCell>
                  <TableCell>
                    <strong>Reason</strong>
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {receivedItems.map((item) => (
                  <TableRow key={item.sku} sx={{ bgcolor: getRowColor(item) }}>
                    <TableCell>
                      <Typography variant="body2" fontWeight="bold">
                        {item.sku}
                      </Typography>
                    </TableCell>
                    <TableCell align="right">
                      <Typography variant="body2">{item.delivered_qty.toFixed(2)} CTN</Typography>
                    </TableCell>
                    <TableCell align="right">
                      <TextField
                        size="small"
                        type="number"
                        value={item.received_qty}
                        onChange={(e) => handleReceivedQtyChange(item.sku, e.target.value)}
                        inputProps={{
                          min: 0,
                          max: item.delivered_qty,
                          step: 0.01,
                        }}
                        sx={{ width: 100 }}
                      />
                    </TableCell>
                    <TableCell align="right">
                      <Stack direction="row" alignItems="center" justifyContent="flex-end" spacing={1}>
                        {item.variance_qty > 0 && <Warning fontSize="small" color="warning" />}
                        {item.received_qty === 0 && <Cancel fontSize="small" color="error" />}
                        {item.variance_qty === 0 && item.received_qty > 0 && (
                          <CheckCircle fontSize="small" color="success" />
                        )}
                        <Typography
                          variant="body2"
                          color={item.variance_qty > 0 ? "error" : "text.secondary"}
                          fontWeight={item.variance_qty > 0 ? "bold" : "normal"}
                        >
                          {item.variance_qty.toFixed(2)} CTN
                        </Typography>
                      </Stack>
                    </TableCell>
                    <TableCell>
                      <TextField
                        size="small"
                        placeholder="Reason if variance"
                        value={item.variance_reason}
                        onChange={(e) => handleVarianceReasonChange(item.sku, e.target.value)}
                        disabled={item.variance_qty === 0}
                        fullWidth
                        error={item.variance_qty > 0 && !item.variance_reason.trim()}
                        helperText={
                          item.variance_qty > 0 && !item.variance_reason.trim()
                            ? "Required"
                            : ""
                        }
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </CardContent>
      </Card>

      {/* Summary Card */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom fontWeight="bold">
            Receipt Summary
          </Typography>
          <Divider sx={{ mb: 2 }} />
          <Grid container spacing={3}>
            <Grid item xs={6} sm={3}>
              <Paper sx={{ p: 2, bgcolor: "primary.50", textAlign: "center" }}>
                <Typography variant="body2" color="text.secondary">
                  Total Delivered
                </Typography>
                <Typography variant="h5" fontWeight="bold" color="primary">
                  {getTotalDelivered().toFixed(2)}
                </Typography>
                <Typography variant="caption">CTN</Typography>
              </Paper>
            </Grid>
            <Grid item xs={6} sm={3}>
              <Paper sx={{ p: 2, bgcolor: "success.50", textAlign: "center" }}>
                <Typography variant="body2" color="text.secondary">
                  Total Received
                </Typography>
                <Typography variant="h5" fontWeight="bold" color="success.main">
                  {getTotalReceived().toFixed(2)}
                </Typography>
                <Typography variant="caption">CTN</Typography>
              </Paper>
            </Grid>
            <Grid item xs={6} sm={3}>
              <Paper sx={{ p: 2, bgcolor: "warning.50", textAlign: "center" }}>
                <Typography variant="body2" color="text.secondary">
                  Total Variance
                </Typography>
                <Typography variant="h5" fontWeight="bold" color="warning.main">
                  {getTotalVariance().toFixed(2)}
                </Typography>
                <Typography variant="caption">CTN</Typography>
              </Paper>
            </Grid>
            <Grid item xs={6} sm={3}>
              <Paper sx={{ p: 2, bgcolor: "error.50", textAlign: "center" }}>
                <Typography variant="body2" color="text.secondary">
                  Items w/ Variance
                </Typography>
                <Typography variant="h5" fontWeight="bold" color="error.main">
                  {getVarianceCount()}
                </Typography>
                <Typography variant="caption">SKUs</Typography>
              </Paper>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Action Buttons */}
      <Stack direction="row" spacing={2} justifyContent="flex-end">
        <Button
          variant="outlined"
          size="large"
          onClick={() => router.back()}
          disabled={submitting}
        >
          Cancel
        </Button>
        <Button
          variant="contained"
          size="large"
          startIcon={<CheckCircle />}
          onClick={() => setConfirmDialogOpen(true)}
          disabled={submitting}
        >
          Submit Receipt
        </Button>
      </Stack>

      {/* Confirmation Dialog */}
      <Dialog open={confirmDialogOpen} onClose={() => setConfirmDialogOpen(false)}>
        <DialogTitle>Confirm Receipt</DialogTitle>
        <DialogContent>
          <Typography gutterBottom>
            Are you sure you want to confirm receipt of this chalan?
          </Typography>
          <Box sx={{ mt: 2, p: 2, bgcolor: "grey.100", borderRadius: 1 }}>
            <Typography variant="body2">
              <strong>Total Delivered:</strong> {getTotalDelivered().toFixed(2)} CTN
            </Typography>
            <Typography variant="body2">
              <strong>Total Received:</strong> {getTotalReceived().toFixed(2)} CTN
            </Typography>
            {getTotalVariance() > 0 && (
              <Typography variant="body2" color="warning.main">
                <strong>Total Variance:</strong> {getTotalVariance().toFixed(2)} CTN ({getVarianceCount()} items)
              </Typography>
            )}
          </Box>
          <Typography variant="caption" color="text.secondary" sx={{ mt: 2, display: "block" }}>
            This action cannot be undone. Your stock will be updated accordingly.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmDialogOpen(false)} disabled={submitting}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            variant="contained"
            disabled={submitting}
            startIcon={submitting ? <CircularProgress size={20} /> : <CheckCircle />}
          >
            {submitting ? "Processing..." : "Confirm"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
