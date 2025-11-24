"use client";

import React, { useState, useEffect } from "react";
import {
  Container,
  Box,
  Typography,
  Paper,
  Button,
  Chip,
  Alert,
  CircularProgress,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Divider,
  Grid,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Stack,
  Card,
  CardContent,
} from "@mui/material";
import {
  Visibility,
  LocalShipping,
  Refresh,
  Add,
  CheckCircle,
  Close,
  Schedule,
  Warehouse,
} from "@mui/icons-material";
import api from "@/lib/api";

// Types
interface Depot {
  _id: string;
  name: string;
  location: string;
  address?: string;
}

interface Schedule {
  deliver_qty: number;
  depot_id: string;
  scheduled_at: string;
  scheduled_by: string;
}

interface OrderItem {
  sku: string;
  short_description: string;
  quantity: number;
  scheduled_qty: number;
  unscheduled_qty: number;
  unit_price: number;
  total_price: number;
  schedules?: Schedule[];
}

interface DemandOrder {
  _id: string;
  order_number: string;
  distributor_id: {
    _id: string;
    name: string;
    erp_id: string;
    delivery_depot_id?: Depot;
  };
  items: OrderItem[];
  total_amount: number;
  status: string;
  approved_at?: string;
  created_at: string;
}

const DistributionSchedulingPage: React.FC = () => {
  const [orders, setOrders] = useState<DemandOrder[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  // View details dialog
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<DemandOrder | null>(null);
  const [availableDepots, setAvailableDepots] = useState<Depot[]>([]);

  // Scheduling states for each item
  const [schedulingData, setSchedulingData] = useState<{
    [key: string]: {
      deliver_qty: string;
      depot_id: string;
    };
  }>({});

  // Fetch pending orders
  const fetchOrders = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await api.get("/ordermanagement/distribution/pending");
      if (response.data.success) {
        setOrders(response.data.data);
      }
    } catch (err: any) {
      console.error("Distribution fetch error:", err);
      console.error("Error details:", {
        message: err.message,
        response: err.response?.data,
        status: err.response?.status,
        statusText: err.response?.statusText,
      });
      
      const errorMsg = err.response?.data?.message || err.message || "Failed to fetch orders";
      
      // Check if it's a permission error
      if (err.response?.status === 403) {
        setError("Access denied: You don't have permission to view distribution orders. Please ensure you're logged in as a Distribution user.");
      } else if (err.response?.status === 401) {
        setError("Authentication required: Please log in again.");
      } else {
        setError(`${errorMsg} (Status: ${err.response?.status || 'Network Error'})`);
      }
    } finally {
      setLoading(false);
    }
  };

  // Fetch order details with depots
  const fetchOrderDetails = async (orderId: string) => {
    setLoading(true);
    setError(null);
    try {
      const response = await api.get(`/ordermanagement/distribution/${orderId}`);
      if (response.data.success) {
        setSelectedOrder(response.data.data.order);
        setAvailableDepots(response.data.data.available_depots);
        
        // Initialize scheduling data for each item
        const initialData: any = {};
        response.data.data.order.items.forEach((item: OrderItem) => {
          initialData[item.sku] = {
            deliver_qty: "",
            depot_id: response.data.data.order.distributor_id?.delivery_depot_id?._id || "",
          };
        });
        setSchedulingData(initialData);
        
        setViewDialogOpen(true);
      }
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to fetch order details");
    } finally {
      setLoading(false);
    }
  };

  // Handle schedule item
  const handleScheduleItem = async (sku: string) => {
    if (!selectedOrder) return;

    const data = schedulingData[sku];
    if (!data || !data.deliver_qty || !data.depot_id) {
      setError("Please enter deliver quantity and select depot");
      return;
    }

    const deliverQty = parseInt(data.deliver_qty);
    if (isNaN(deliverQty) || deliverQty < 1) {
      setError("Deliver quantity must be a valid positive number");
      return;
    }

    const item = selectedOrder.items.find((i) => i.sku === sku);
    if (!item) return;

    if (deliverQty > item.unscheduled_qty) {
      setError(`Cannot schedule ${deliverQty}. Only ${item.unscheduled_qty} units unscheduled`);
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await api.post(
        `/ordermanagement/distribution/${selectedOrder._id}/schedule-item`,
        {
          item_sku: sku,
          deliver_qty: deliverQty,
          depot_id: data.depot_id,
        }
      );

      if (response.data.success) {
        setSuccess(`Successfully scheduled ${deliverQty} units of ${sku}`);
        // Refresh order details
        await fetchOrderDetails(selectedOrder._id);
        // Clear the input for this item
        setSchedulingData({
          ...schedulingData,
          [sku]: {
            deliver_qty: "",
            depot_id: data.depot_id,
          },
        });
      }
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to schedule item");
    } finally {
      setLoading(false);
    }
  };

  // Handle submit scheduling
  const handleSubmitScheduling = async () => {
    if (!selectedOrder) return;

    // Check if at least one item is scheduled
    const hasScheduledItems = selectedOrder.items.some((item) => item.scheduled_qty > 0);
    
    if (!hasScheduledItems) {
      setError("Please schedule at least one item before submitting");
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await api.post(
        `/ordermanagement/distribution/${selectedOrder._id}/submit`,
        {
          comments: "Scheduling completed and forwarded to Finance",
        }
      );

      if (response.data.success) {
        setSuccess(`Order ${selectedOrder.order_number} submitted to Finance successfully`);
        setViewDialogOpen(false);
        // Refresh orders list
        await fetchOrders();
      }
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to submit scheduling");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  const getStatusColor = (status: string) => {
    switch (status) {
      case "forwarded_to_distribution":
        return "info";
      case "scheduling_in_progress":
        return "warning";
      case "scheduling_completed":
        return "success";
      default:
        return "default";
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
      {/* Page Header */}
      <Paper elevation={2} sx={{ p: 3, mb: 3 }}>
        <Box display="flex" justifyContent="space-between" alignItems="center">
          <Box>
            <Typography variant="h4" gutterBottom sx={{ fontWeight: 600 }}>
              <LocalShipping sx={{ mr: 1, verticalAlign: "middle" }} />
              Distribution Scheduling
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Schedule deliveries for approved demand orders
            </Typography>
          </Box>
          <Button
            variant="outlined"
            startIcon={<Refresh />}
            onClick={fetchOrders}
            disabled={loading}
          >
            Refresh
          </Button>
        </Box>
      </Paper>

      {/* Alert Messages */}
      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}
      {success && (
        <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess(null)}>
          {success}
        </Alert>
      )}

      {/* Loading State */}
      {loading && !viewDialogOpen && (
        <Box display="flex" justifyContent="center" py={4}>
          <CircularProgress />
        </Box>
      )}

      {/* Orders Table */}
      {!loading && (
        <TableContainer component={Paper} elevation={2}>
          <Table>
            <TableHead>
              <TableRow sx={{ bgcolor: "primary.main" }}>
                <TableCell sx={{ color: "white", fontWeight: 600 }}>Order Number</TableCell>
                <TableCell sx={{ color: "white", fontWeight: 600 }}>Distributor</TableCell>
                <TableCell sx={{ color: "white", fontWeight: 600 }}>Total Amount</TableCell>
                <TableCell sx={{ color: "white", fontWeight: 600 }}>Status</TableCell>
                <TableCell sx={{ color: "white", fontWeight: 600 }}>Approved At</TableCell>
                <TableCell sx={{ color: "white", fontWeight: 600 }} align="right">
                  Actions
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {orders.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} align="center" sx={{ py: 4 }}>
                    <Typography variant="body1" color="text.secondary">
                      No orders pending scheduling
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : (
                orders.map((order) => (
                  <TableRow key={order._id} hover>
                    <TableCell>
                      <Typography variant="body2" fontWeight={600}>
                        {order.order_number}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">{order.distributor_id.name}</Typography>
                      <Typography variant="caption" color="text.secondary">
                        {order.distributor_id.erp_id}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" fontWeight={600}>
                        ৳ {order.total_amount.toLocaleString()}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={order.status.replace(/_/g, " ").toUpperCase()}
                        color={getStatusColor(order.status)}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>
                      <Typography variant="caption">
                        {order.approved_at ? formatDate(order.approved_at) : "N/A"}
                      </Typography>
                    </TableCell>
                    <TableCell align="right">
                      <Tooltip title="Schedule Delivery">
                        <IconButton
                          color="primary"
                          onClick={() => fetchOrderDetails(order._id)}
                          disabled={loading}
                        >
                          <Schedule />
                        </IconButton>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* Scheduling Dialog */}
      <Dialog
        open={viewDialogOpen}
        onClose={() => setViewDialogOpen(false)}
        maxWidth="lg"
        fullWidth
      >
        <DialogTitle>
          <Box display="flex" justifyContent="space-between" alignItems="center">
            <Typography variant="h6">
              Schedule Delivery - {selectedOrder?.order_number}
            </Typography>
            <IconButton onClick={() => setViewDialogOpen(false)}>
              <Close />
            </IconButton>
          </Box>
        </DialogTitle>
        <DialogContent dividers>
          {selectedOrder && (
            <>
              {/* Order Info */}
              <Card sx={{ mb: 3 }}>
                <CardContent>
                  <Grid container spacing={2}>
                    <Grid item xs={12} md={6}>
                      <Typography variant="body2" color="text.secondary">
                        Distributor
                      </Typography>
                      <Typography variant="body1" fontWeight={600}>
                        {selectedOrder.distributor_id.name}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        ERP: {selectedOrder.distributor_id.erp_id}
                      </Typography>
                    </Grid>
                    <Grid item xs={12} md={6}>
                      <Typography variant="body2" color="text.secondary">
                        Default Depot
                      </Typography>
                      <Typography variant="body1" fontWeight={600}>
                        {selectedOrder.distributor_id.delivery_depot_id?.name || "Not Set"}
                      </Typography>
                      {selectedOrder.distributor_id.delivery_depot_id && (
                        <Typography variant="caption" color="text.secondary">
                          {selectedOrder.distributor_id.delivery_depot_id.location}
                        </Typography>
                      )}
                    </Grid>
                  </Grid>
                </CardContent>
              </Card>

              {/* Items Table */}
              <Typography variant="h6" gutterBottom sx={{ mt: 2, mb: 2 }}>
                Order Items
              </Typography>
              <TableContainer component={Paper} variant="outlined">
                <Table size="small">
                  <TableHead>
                    <TableRow sx={{ bgcolor: "grey.100" }}>
                      <TableCell>SKU</TableCell>
                      <TableCell>Description</TableCell>
                      <TableCell align="right">Order Qty</TableCell>
                      <TableCell align="right">Scheduled Qty</TableCell>
                      <TableCell align="right">Unscheduled Qty</TableCell>
                      <TableCell>Depot</TableCell>
                      <TableCell>Deliver Qty</TableCell>
                      <TableCell align="center">Action</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {selectedOrder.items.map((item) => (
                      <TableRow key={item.sku}>
                        <TableCell>
                          <Typography variant="body2" fontWeight={600}>
                            {item.sku}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2">{item.short_description}</Typography>
                        </TableCell>
                        <TableCell align="right">
                          <Chip label={item.quantity} size="small" />
                        </TableCell>
                        <TableCell align="right">
                          <Chip
                            label={item.scheduled_qty}
                            size="small"
                            color={item.scheduled_qty > 0 ? "success" : "default"}
                          />
                        </TableCell>
                        <TableCell align="right">
                          <Chip
                            label={item.unscheduled_qty}
                            size="small"
                            color={item.unscheduled_qty > 0 ? "warning" : "default"}
                          />
                        </TableCell>
                        <TableCell>
                          <FormControl size="small" fullWidth disabled={item.unscheduled_qty === 0}>
                            <Select
                              value={schedulingData[item.sku]?.depot_id || ""}
                              onChange={(e) =>
                                setSchedulingData({
                                  ...schedulingData,
                                  [item.sku]: {
                                    ...schedulingData[item.sku],
                                    depot_id: e.target.value,
                                  },
                                })
                              }
                            >
                              {availableDepots.map((depot) => (
                                <MenuItem key={depot._id} value={depot._id}>
                                  {depot.name}
                                </MenuItem>
                              ))}
                            </Select>
                          </FormControl>
                        </TableCell>
                        <TableCell>
                          <TextField
                            type="number"
                            size="small"
                            placeholder="Qty"
                            value={schedulingData[item.sku]?.deliver_qty || ""}
                            onChange={(e) =>
                              setSchedulingData({
                                ...schedulingData,
                                [item.sku]: {
                                  ...schedulingData[item.sku],
                                  deliver_qty: e.target.value,
                                },
                              })
                            }
                            disabled={item.unscheduled_qty === 0}
                            inputProps={{ min: 1, max: item.unscheduled_qty }}
                            sx={{ width: 100 }}
                          />
                        </TableCell>
                        <TableCell align="center">
                          <Tooltip title="Schedule">
                            <IconButton
                              color="primary"
                              size="small"
                              onClick={() => handleScheduleItem(item.sku)}
                              disabled={
                                loading ||
                                item.unscheduled_qty === 0 ||
                                !schedulingData[item.sku]?.deliver_qty
                              }
                            >
                              <Add />
                            </IconButton>
                          </Tooltip>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>

              {/* Schedules Summary */}
              {selectedOrder.items.some((item) => item.schedules && item.schedules.length > 0) && (
                <Box mt={3}>
                  <Typography variant="h6" gutterBottom>
                    Scheduling History
                  </Typography>
                  {selectedOrder.items.map((item) => {
                    if (!item.schedules || item.schedules.length === 0) return null;
                    return (
                      <Card key={item.sku} variant="outlined" sx={{ mb: 2 }}>
                        <CardContent>
                          <Typography variant="subtitle2" fontWeight={600} gutterBottom>
                            {item.sku} - {item.short_description}
                          </Typography>
                          <Stack spacing={1}>
                            {item.schedules.map((schedule, idx) => {
                              const depot = availableDepots.find((d) => d._id === schedule.depot_id);
                              return (
                                <Box
                                  key={idx}
                                  display="flex"
                                  justifyContent="space-between"
                                  p={1}
                                  bgcolor="grey.50"
                                  borderRadius={1}
                                >
                                  <Typography variant="body2">
                                    <Warehouse fontSize="small" sx={{ mr: 1, verticalAlign: "middle" }} />
                                    {depot?.name || "Unknown Depot"} - {schedule.deliver_qty} units
                                  </Typography>
                                  <Typography variant="caption" color="text.secondary">
                                    {formatDate(schedule.scheduled_at)}
                                  </Typography>
                                </Box>
                              );
                            })}
                          </Stack>
                        </CardContent>
                      </Card>
                    );
                  })}
                </Box>
              )}
            </>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setViewDialogOpen(false)} disabled={loading}>
            Cancel
          </Button>
          <Button
            variant="contained"
            startIcon={<CheckCircle />}
            onClick={handleSubmitScheduling}
            disabled={
              loading ||
              !selectedOrder ||
              !selectedOrder.items.some((item) => item.scheduled_qty > 0)
            }
          >
            Submit Scheduling to Finance
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default DistributionSchedulingPage;
