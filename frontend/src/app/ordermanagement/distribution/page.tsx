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
  CardHeader,
  Collapse,
  LinearProgress,
  Badge,
  Fab,
  useMediaQuery,
  useTheme,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
} from "@mui/material";
import {
  Visibility,
  LocalShipping,
  Refresh,
  Add,
  CheckCircle,
  Close,
  Schedule as ScheduleIcon,
  Warehouse,
  ExpandMore,
  ExpandLess,
  Delete,
  Send,
  Assignment,
  Inventory,
  ShoppingCart,
} from "@mui/icons-material";
import api from "@/lib/api";

/**
 * ============================================================================
 * COMPREHENSIVE DISTRIBUTION SCHEDULING - MOBILE FIRST
 * ============================================================================
 * 
 * Features:
 * ✅ Progressive bundle-based scheduling
 * ✅ Progressive quantity-based scheduling
 * ✅ Multi-iteration delivery scheduling
 * ✅ Offer type awareness (BOGO, BUNDLE, DISCOUNT)
 * ✅ Validation: deliver_qty ≤ unscheduled_qty
 * ✅ Bundle integrity preservation
 * ✅ Responsive mobile-first design
 * ✅ Touch-optimized controls
 * ✅ Schedule history per item
 * ✅ Delete individual schedules
 * ✅ Submit validation (all items fully scheduled)
 */

// ============================================================================
// TYPES
// ============================================================================

interface BundleItem {
  sku: string;
  qty_per_bundle: number;
  is_free: boolean;
  unit_price: number;
}

interface BundleDefinition {
  bundle_size: number;
  items: BundleItem[];
}

interface Schedule {
  schedule_id: string;
  deliver_bundles?: number;
  deliver_qty: number;
  deliver_qty_breakdown?: Record<string, number>;
  facility_id: string;
  facility_name: string;
  facility_type: string;
  subtotal: number;
  discount_applied: number;
  final_amount: number;
  scheduled_at: string;
  scheduled_by_name: string;
  notes?: string;
}

interface OrderItem {
  _id: string;
  source: "product" | "offer";
  source_id: string;
  sku: string;
  quantity: number;
  unit_price: number;
  subtotal: number;
  product_details?: {
    short_description: string;
    category: string;
    brand: string;
  };
  offer_details?: {
    offer_name: string;
    offer_type: string;
  };
  
  // Progressive scheduling fields
  is_bundle_offer: boolean;
  bundle_definition?: BundleDefinition;
  order_bundles?: number;
  scheduled_bundles?: number;
  unscheduled_bundles?: number;
  scheduled_qty: number;
  unscheduled_qty: number;
  schedules: Schedule[];
  
  // Offer enrichment
  offer_type?: string;
  offer_name?: string;
  scheduling_mode?: "bundle" | "quantity";
  offerTypeInfo?: {
    offer_type: string;
    offer_name: string;
    is_bundle_type: boolean;
  };
}

interface Facility {
  _id: string;
  name: string;
  location: string;
  contact_person: string;
  contact_mobile: string;
}

interface DemandOrder {
  _id: string;
  order_number: string;
  distributor_id: {
    _id: string;
    name: string;
    code: string;
    erp_id: string;
    contact_person: string;
    contact_mobile: string;
    delivery_depot_id?: {
      _id: string;
      name: string;
      location: string;
    };
  };
  items: OrderItem[];
  total_amount: number;
  item_count: number;
  status: string;
  submitted_at?: string;
  created_at: string;
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

const DistributionSchedulingPage: React.FC = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));
  const isTablet = useMediaQuery(theme.breakpoints.between("md", "lg"));

  // ========== STATE ==========
  const [orders, setOrders] = useState<DemandOrder[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Scheduling dialog
  const [scheduleDialogOpen, setScheduleDialogOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<DemandOrder | null>(null);
  const [availableFacilities, setAvailableFacilities] = useState<Facility[]>([]);
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());

  // Scheduling form states (per item)
  const [schedulingData, setSchedulingData] = useState<{
    [itemId: string]: {
      deliver_qty: number;
      deliver_bundles: number;
      facility_id: string;
      notes: string;
    };
  }>({});

  const [submitting, setSubmitting] = useState(false);
  const [deletingSchedule, setDeletingSchedule] = useState<string | null>(null);

  // ========== EFFECTS ==========
  useEffect(() => {
    fetchOrders();
  }, []);

  // ========== API FUNCTIONS ==========
  const fetchOrders = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await api.get("/ordermanagement/distribution/pending");
      console.log("📦 Orders fetched:", response.data);
      setOrders(response.data.data || []);
    } catch (err: any) {
      console.error("Distribution fetch error:", err);
      console.error("Error details:", {
        message: err.message,
        response: err.response?.data,
        status: err.response?.status,
        statusText: err.response?.statusText,
      });

      if (err.response?.status === 403) {
        setError("You don't have permission to access Distribution scheduling");
      } else if (err.response?.status === 401) {
        setError("Please log in again");
      } else {
        setError(
          err.response?.data?.message || err.message || "Failed to fetch pending distribution orders"
        );
      }
    } finally {
      setLoading(false);
    }
  };

  const openScheduleDialog = async (order: DemandOrder) => {
    try {
      setError(null);
      const response = await api.get(`/ordermanagement/distribution/${order._id}`);
      console.log("📦 Order details:", response.data);

      setSelectedOrder(response.data.data.order);
      setAvailableFacilities(response.data.data.available_facilities || []);
      
      // Initialize scheduling data for each item
      const initialData: any = {};
      response.data.data.order.items.forEach((item: OrderItem) => {
        initialData[item._id] = {
          deliver_qty: item.unscheduled_qty || 0,
          deliver_bundles: item.unscheduled_bundles || 0,
          facility_id: "",
          notes: "",
        };
      });
      setSchedulingData(initialData);
      setScheduleDialogOpen(true);
    } catch (err: any) {
      console.error("Error fetching order details:", err);
      setError(err.response?.data?.message || "Failed to fetch order details");
    }
  };

  const handleScheduleItem = async (itemId: string) => {
    if (!selectedOrder) return;

    const item = selectedOrder.items.find((i) => i._id === itemId);
    if (!item) return;

    const data = schedulingData[itemId];
    if (!data.facility_id) {
      setError("Please select a depot");
      return;
    }

    const isBundleMode = item.scheduling_mode === "bundle" || item.is_bundle_offer;

    if (isBundleMode) {
      if (!data.deliver_bundles || data.deliver_bundles <= 0) {
        setError("Please enter a valid number of bundles");
        return;
      }
      if (data.deliver_bundles > (item.unscheduled_bundles || 0)) {
        setError(`Cannot schedule more than ${item.unscheduled_bundles} bundles`);
        return;
      }
    } else {
      if (!data.deliver_qty || data.deliver_qty <= 0) {
        setError("Please enter a valid quantity");
        return;
      }
      if (data.deliver_qty > item.unscheduled_qty) {
        setError(`Cannot schedule more than ${item.unscheduled_qty} units`);
        return;
      }
    }

    setSubmitting(true);
    setError(null);

    try {
      const payload = {
        item_id: itemId,
        facility_id: data.facility_id,
        notes: data.notes,
        ...(isBundleMode
          ? { deliver_bundles: data.deliver_bundles }
          : { deliver_qty: data.deliver_qty }),
      };

      console.log("📦 Scheduling payload:", payload);

      const response = await api.post(
        `/ordermanagement/distribution/${selectedOrder._id}/schedule-item`,
        payload
      );

      console.log("✅ Schedule response:", response.data);
      setSuccess(response.data.message || "Schedule added successfully");

      // Refresh order details
      const refreshResponse = await api.get(`/ordermanagement/distribution/${selectedOrder._id}`);
      setSelectedOrder(refreshResponse.data.data.order);

      // Reset form for this item
      setSchedulingData((prev) => ({
        ...prev,
        [itemId]: {
          deliver_qty: 0,
          deliver_bundles: 0,
          facility_id: "",
          notes: "",
        },
      }));

      // Auto-collapse item if fully scheduled
      const updatedItem = refreshResponse.data.data.order.items.find((i: OrderItem) => i._id === itemId);
      if (updatedItem) {
        const isFullyScheduled = isBundleMode
          ? updatedItem.unscheduled_bundles === 0
          : updatedItem.unscheduled_qty === 0;

        if (isFullyScheduled) {
          setExpandedItems((prev) => {
            const newSet = new Set(prev);
            newSet.delete(itemId);
            return newSet;
          });
        }
      }

      // Refresh main orders list
      await fetchOrders();
    } catch (err: any) {
      console.error("❌ Schedule error:", err);
      setError(err.response?.data?.message || "Failed to schedule item");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteSchedule = async (itemId: string, scheduleId: string) => {
    if (!selectedOrder) return;
    if (!confirm("Are you sure you want to delete this schedule?")) return;

    setDeletingSchedule(scheduleId);
    setError(null);

    try {
      await api.delete(
        `/ordermanagement/distribution/${selectedOrder._id}/schedule/${itemId}/${scheduleId}`
      );

      setSuccess("Schedule deleted successfully");

      // Refresh order details
      const refreshResponse = await api.get(`/ordermanagement/distribution/${selectedOrder._id}`);
      setSelectedOrder(refreshResponse.data.data.order);

      // Refresh main orders list
      await fetchOrders();
    } catch (err: any) {
      console.error("Delete schedule error:", err);
      setError(err.response?.data?.message || "Failed to delete schedule");
    } finally {
      setDeletingSchedule(null);
    }
  };

  const handleSubmitOrder = async () => {
    if (!selectedOrder) return;

    // Validate all items are fully scheduled
    const unscheduledItems = selectedOrder.items.filter((item) => {
      if (item.is_bundle_offer || item.scheduling_mode === "bundle") {
        return (item.unscheduled_bundles || 0) > 0;
      } else {
        return item.unscheduled_qty > 0;
      }
    });

    if (unscheduledItems.length > 0) {
      const itemList = unscheduledItems
        .map((item) => {
          const remaining = item.is_bundle_offer
            ? `${item.unscheduled_bundles} bundles`
            : `${item.unscheduled_qty} units`;
          return `${item.sku} (${remaining} remaining)`;
        })
        .join(", ");
      setError(`Cannot submit: The following items are not fully scheduled: ${itemList}`);
      return;
    }

    if (!confirm(`Submit order ${selectedOrder.order_number} to Finance for final approval?`)) {
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const response = await api.post(`/ordermanagement/distribution/${selectedOrder._id}/submit`, {
        comments: "All items scheduled",
      });

      setSuccess(response.data.message || "Order submitted to Finance successfully");
      setScheduleDialogOpen(false);
      setSelectedOrder(null);

      // Refresh orders list
      await fetchOrders();
    } catch (err: any) {
      console.error("Submit order error:", err);
      setError(err.response?.data?.message || "Failed to submit order");
    } finally {
      setSubmitting(false);
    }
  };

  const toggleItemExpansion = (itemId: string) => {
    setExpandedItems((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(itemId)) {
        newSet.delete(itemId);
      } else {
        newSet.add(itemId);
      }
      return newSet;
    });
  };

  // ========== HELPER FUNCTIONS ==========
  const getStatusColor = (status: string) => {
    switch (status) {
      case "forwarded_to_distribution":
        return "warning";
      case "scheduling_in_progress":
        return "info";
      case "scheduling_completed":
        return "success";
      default:
        return "default";
    }
  };

  const getSchedulingProgress = (item: OrderItem): number => {
    if (item.is_bundle_offer || item.scheduling_mode === "bundle") {
      const total = item.order_bundles || 1;
      const scheduled = item.scheduled_bundles || 0;
      return (scheduled / total) * 100;
    } else {
      const total = item.quantity || 1;
      const scheduled = item.scheduled_qty || 0;
      return (scheduled / total) * 100;
    }
  };

  // ========== RENDER HELPERS ==========
  const renderOrderCard = (order: DemandOrder) => {
    const totalItems = order.items.length;
    const fullyScheduledItems = order.items.filter((item) => {
      if (item.is_bundle_offer) {
        return (item.unscheduled_bundles || 0) === 0;
      }
      return item.unscheduled_qty === 0;
    }).length;
    const progress = totalItems > 0 ? (fullyScheduledItems / totalItems) * 100 : 0;

    return (
      <Card key={order._id} sx={{ mb: 2 }}>
        <CardHeader
          avatar={
            <IconButton color="primary" size={isMobile ? "small" : "medium"}>
              <Assignment />
            </IconButton>
          }
          title={
            <Typography variant={isMobile ? "body1" : "h6"} fontWeight="bold">
              {order.order_number}
            </Typography>
          }
          subheader={
            <Stack spacing={0.5}>
              <Typography variant="caption" color="text.secondary">
                {order.distributor_id.name} ({order.distributor_id.erp_id})
              </Typography>
              <Chip
                label={order.status.replace(/_/g, " ").toUpperCase()}
                color={getStatusColor(order.status)}
                size="small"
                sx={{ width: "fit-content" }}
              />
            </Stack>
          }
          action={
            <Tooltip title="Schedule">
              <IconButton
                color="primary"
                onClick={() => openScheduleDialog(order)}
                size={isMobile ? "small" : "medium"}
              >
                <ScheduleIcon />
              </IconButton>
            </Tooltip>
          }
        />
        <CardContent>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
              <Typography variant="caption" color="text.secondary">
                Total Items
              </Typography>
              <Typography variant="body2" fontWeight="bold">
                {totalItems} items
              </Typography>
            </Grid>
            <Grid item xs={12} sm={6}>
              <Typography variant="caption" color="text.secondary">
                Total Amount
              </Typography>
              <Typography variant="body2" fontWeight="bold">
                ৳{order.total_amount.toLocaleString()}
              </Typography>
            </Grid>
            <Grid item xs={12}>
              <Stack spacing={1}>
                <Box display="flex" justifyContent="space-between">
                  <Typography variant="caption" color="text.secondary">
                    Scheduling Progress
                  </Typography>
                  <Typography variant="caption" fontWeight="bold">
                    {fullyScheduledItems}/{totalItems} items
                  </Typography>
                </Box>
                <LinearProgress variant="determinate" value={progress} />
              </Stack>
            </Grid>
          </Grid>
        </CardContent>
      </Card>
    );
  };

  const renderSchedulingDialog = () => {
    if (!selectedOrder) return null;

    return (
      <Dialog
        open={scheduleDialogOpen}
        onClose={() => !submitting && setScheduleDialogOpen(false)}
        maxWidth="lg"
        fullWidth
        fullScreen={isMobile}
      >
        <DialogTitle>
          <Stack direction="row" alignItems="center" justifyContent="space-between">
            <Box>
              <Typography variant="h6">{selectedOrder.order_number}</Typography>
              <Typography variant="caption" color="text.secondary">
                {selectedOrder.distributor_id.name}
              </Typography>
            </Box>
            <IconButton onClick={() => setScheduleDialogOpen(false)} disabled={submitting}>
              <Close />
            </IconButton>
          </Stack>
        </DialogTitle>

        <DialogContent dividers>
          {error && (
            <Alert severity="error" onClose={() => setError(null)} sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}
          {success && (
            <Alert severity="success" onClose={() => setSuccess(null)} sx={{ mb: 2 }}>
              {success}
            </Alert>
          )}

          <Stack spacing={2}>
            {selectedOrder.items.map((item) => (
              <Paper key={item._id} elevation={2} sx={{ overflow: "hidden" }}>
                {/* Item Header */}
                <Box
                  sx={{
                    p: 2,
                    bgcolor: expandedItems.has(item._id) ? "primary.50" : "grey.50",
                    cursor: "pointer",
                  }}
                  onClick={() => toggleItemExpansion(item._id)}
                >
                  <Stack spacing={1}>
                    <Stack direction="row" justifyContent="space-between" alignItems="center">
                      <Typography variant="subtitle1" fontWeight="bold">
                        {item.sku}
                      </Typography>
                      <IconButton size="small">
                        {expandedItems.has(item._id) ? <ExpandLess /> : <ExpandMore />}
                      </IconButton>
                    </Stack>

                    {item.product_details && (
                      <Typography variant="body2" color="text.secondary">
                        {item.product_details.short_description}
                      </Typography>
                    )}

                    {item.offer_name && (
                      <Chip
                        label={`${item.offer_type} - ${item.offer_name}`}
                        size="small"
                        color="secondary"
                        icon={<ShoppingCart />}
                      />
                    )}

                    {/* Progress Bar */}
                    <Box>
                      <Stack direction="row" justifyContent="space-between" mb={0.5}>
                        <Typography variant="caption" color="text.secondary">
                          {item.is_bundle_offer ? "Bundle Progress" : "Quantity Progress"}
                        </Typography>
                        <Typography variant="caption" fontWeight="bold">
                          {item.is_bundle_offer
                            ? `${item.scheduled_bundles || 0}/${item.order_bundles || 0} bundles`
                            : `${item.scheduled_qty || 0}/${item.quantity} units`}
                        </Typography>
                      </Stack>
                      <LinearProgress
                        variant="determinate"
                        value={getSchedulingProgress(item)}
                        color={getSchedulingProgress(item) === 100 ? "success" : "primary"}
                      />
                    </Box>
                  </Stack>
                </Box>

                {/* Expanded Content */}
                <Collapse in={expandedItems.has(item._id)}>
                  <Box sx={{ p: 2 }}>
                    {/* Bundle Definition (if bundle offer) */}
                    {item.is_bundle_offer && item.bundle_definition && (
                      <Paper sx={{ p: 2, mb: 2, bgcolor: "info.50" }}>
                        <Typography variant="subtitle2" fontWeight="bold" gutterBottom>
                          📦 Bundle Definition
                        </Typography>
                        <Divider sx={{ my: 1 }} />
                        <List dense>
                          {item.bundle_definition.items.map((bundleItem, idx) => (
                            <ListItem key={idx}>
                              <ListItemText
                                primary={bundleItem.sku}
                                secondary={`${bundleItem.qty_per_bundle} per bundle ${bundleItem.is_free ? "🎁 FREE" : ""}`}
                              />
                            </ListItem>
                          ))}
                        </List>
                      </Paper>
                    )}

                    {/* Scheduling Form */}
                    {((item.is_bundle_offer && (item.unscheduled_bundles || 0) > 0) ||
                      (!item.is_bundle_offer && item.unscheduled_qty > 0)) && (
                      <Paper sx={{ p: 2, mb: 2, bgcolor: "success.50" }}>
                        <Typography variant="subtitle2" fontWeight="bold" gutterBottom>
                          ➕ Add Schedule
                        </Typography>
                        <Divider sx={{ my: 1 }} />
                        <Grid container spacing={2}>
                          {item.is_bundle_offer ? (
                            <Grid item xs={12} sm={6}>
                              <TextField
                                fullWidth
                                size="small"
                                type="number"
                                label="Deliver Bundles"
                                value={schedulingData[item._id]?.deliver_bundles || ""}
                                onChange={(e) =>
                                  setSchedulingData((prev) => ({
                                    ...prev,
                                    [item._id]: {
                                      ...prev[item._id],
                                      deliver_bundles: parseInt(e.target.value) || 0,
                                    },
                                  }))
                                }
                                helperText={`Max: ${item.unscheduled_bundles} bundles`}
                                inputProps={{
                                  min: 1,
                                  max: item.unscheduled_bundles,
                                }}
                              />
                            </Grid>
                          ) : (
                            <Grid item xs={12} sm={6}>
                              <TextField
                                fullWidth
                                size="small"
                                type="number"
                                label="Deliver Quantity"
                                value={schedulingData[item._id]?.deliver_qty || ""}
                                onChange={(e) =>
                                  setSchedulingData((prev) => ({
                                    ...prev,
                                    [item._id]: {
                                      ...prev[item._id],
                                      deliver_qty: parseInt(e.target.value) || 0,
                                    },
                                  }))
                                }
                                helperText={`Max: ${item.unscheduled_qty} units`}
                                inputProps={{
                                  min: 1,
                                  max: item.unscheduled_qty,
                                }}
                              />
                            </Grid>
                          )}

                          <Grid item xs={12} sm={6}>
                            <FormControl fullWidth size="small">
                              <InputLabel>Depot</InputLabel>
                              <Select
                                value={schedulingData[item._id]?.facility_id || ""}
                                onChange={(e) =>
                                  setSchedulingData((prev) => ({
                                    ...prev,
                                    [item._id]: {
                                      ...prev[item._id],
                                      facility_id: e.target.value,
                                    },
                                  }))
                                }
                                label="Depot"
                              >
                                {availableFacilities.map((facility) => (
                                  <MenuItem key={facility._id} value={facility._id}>
                                    {facility.name} - {facility.location}
                                  </MenuItem>
                                ))}
                              </Select>
                            </FormControl>
                          </Grid>

                          <Grid item xs={12}>
                            <TextField
                              fullWidth
                              size="small"
                              label="Notes (Optional)"
                              value={schedulingData[item._id]?.notes || ""}
                              onChange={(e) =>
                                setSchedulingData((prev) => ({
                                  ...prev,
                                  [item._id]: {
                                    ...prev[item._id],
                                    notes: e.target.value,
                                  },
                                }))
                              }
                              multiline
                              rows={2}
                            />
                          </Grid>

                          <Grid item xs={12}>
                            <Button
                              fullWidth
                              variant="contained"
                              color="primary"
                              startIcon={<Add />}
                              onClick={() => handleScheduleItem(item._id)}
                              disabled={submitting}
                            >
                              {submitting ? "Scheduling..." : "Add Schedule"}
                            </Button>
                          </Grid>
                        </Grid>
                      </Paper>
                    )}

                    {/* Schedule History */}
                    {item.schedules && item.schedules.length > 0 && (
                      <Paper sx={{ p: 2 }}>
                        <Typography variant="subtitle2" fontWeight="bold" gutterBottom>
                          📅 Schedule History ({item.schedules.length})
                        </Typography>
                        <Divider sx={{ my: 1 }} />
                        <Stack spacing={1}>
                          {item.schedules.map((schedule) => (
                            <Paper key={schedule.schedule_id} sx={{ p: 1.5, bgcolor: "grey.50" }}>
                              <Stack spacing={1}>
                                <Stack direction="row" justifyContent="space-between" alignItems="center">
                                  <Typography variant="body2" fontWeight="bold">
                                    {schedule.deliver_bundles
                                      ? `${schedule.deliver_bundles} bundles (${schedule.deliver_qty} units)`
                                      : `${schedule.deliver_qty} units`}
                                  </Typography>
                                  <IconButton
                                    size="small"
                                    color="error"
                                    onClick={() => handleDeleteSchedule(item._id, schedule.schedule_id)}
                                    disabled={deletingSchedule === schedule.schedule_id}
                                  >
                                    {deletingSchedule === schedule.schedule_id ? (
                                      <CircularProgress size={16} />
                                    ) : (
                                      <Delete />
                                    )}
                                  </IconButton>
                                </Stack>

                                <Grid container spacing={1}>
                                  <Grid item xs={6}>
                                    <Typography variant="caption" color="text.secondary">
                                      Depot
                                    </Typography>
                                    <Typography variant="body2">{schedule.facility_name}</Typography>
                                  </Grid>
                                  <Grid item xs={6}>
                                    <Typography variant="caption" color="text.secondary">
                                      Scheduled By
                                    </Typography>
                                    <Typography variant="body2">{schedule.scheduled_by_name}</Typography>
                                  </Grid>
                                  <Grid item xs={6}>
                                    <Typography variant="caption" color="text.secondary">
                                      Date
                                    </Typography>
                                    <Typography variant="body2">
                                      {new Date(schedule.scheduled_at).toLocaleString()}
                                    </Typography>
                                  </Grid>
                                  <Grid item xs={6}>
                                    <Typography variant="caption" color="text.secondary">
                                      Amount
                                    </Typography>
                                    <Typography variant="body2">
                                      ৳{schedule.final_amount.toLocaleString()}
                                    </Typography>
                                  </Grid>
                                  {schedule.notes && (
                                    <Grid item xs={12}>
                                      <Typography variant="caption" color="text.secondary">
                                        Notes
                                      </Typography>
                                      <Typography variant="body2">{schedule.notes}</Typography>
                                    </Grid>
                                  )}
                                </Grid>

                                {/* Bundle Breakdown */}
                                {schedule.deliver_qty_breakdown && (
                                  <Box>
                                    <Typography variant="caption" color="text.secondary">
                                      SKU Breakdown:
                                    </Typography>
                                    <Typography variant="body2">
                                      {Object.entries(schedule.deliver_qty_breakdown)
                                        .map(([sku, qty]) => `${sku}: ${qty}`)
                                        .join(", ")}
                                    </Typography>
                                  </Box>
                                )}
                              </Stack>
                            </Paper>
                          ))}
                        </Stack>
                      </Paper>
                    )}

                    {/* Fully Scheduled Badge */}
                    {((item.is_bundle_offer && (item.unscheduled_bundles || 0) === 0) ||
                      (!item.is_bundle_offer && item.unscheduled_qty === 0)) && (
                      <Alert severity="success" icon={<CheckCircle />}>
                        <Typography variant="body2" fontWeight="bold">
                          ✅ Fully Scheduled
                        </Typography>
                      </Alert>
                    )}
                  </Box>
                </Collapse>
              </Paper>
            ))}
          </Stack>
        </DialogContent>

        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setScheduleDialogOpen(false)} disabled={submitting}>
            Close
          </Button>
          <Button
            variant="contained"
            color="success"
            startIcon={<Send />}
            onClick={handleSubmitOrder}
            disabled={submitting}
          >
            {submitting ? "Submitting..." : "Submit to Finance"}
          </Button>
        </DialogActions>
      </Dialog>
    );
  };

  // ========== MAIN RENDER ==========
  return (
    <Container maxWidth="xl" sx={{ py: isMobile ? 2 : 4 }}>
      {/* Header */}
      <Stack direction="row" justifyContent="space-between" alignItems="center" mb={3}>
        <Box>
          <Typography variant={isMobile ? "h5" : "h4"} fontWeight="bold" gutterBottom>
            Distribution Scheduling
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Progressive bundle & quantity-based scheduling
          </Typography>
        </Box>
        <Tooltip title="Refresh">
          <IconButton color="primary" onClick={fetchOrders} disabled={loading}>
            <Refresh />
          </IconButton>
        </Tooltip>
      </Stack>

      {/* Error Alert */}
      {error && (
        <Alert severity="error" onClose={() => setError(null)} sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {/* Loading State */}
      {loading && (
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="300px">
          <CircularProgress />
        </Box>
      )}

      {/* Empty State */}
      {!loading && orders.length === 0 && (
        <Paper sx={{ p: 4, textAlign: "center" }}>
          <LocalShipping sx={{ fontSize: 80, color: "text.secondary", mb: 2 }} />
          <Typography variant="h6" color="text.secondary" gutterBottom>
            No Pending Orders
          </Typography>
          <Typography variant="body2" color="text.secondary">
            All orders have been scheduled
          </Typography>
        </Paper>
      )}

      {/* Orders List */}
      {!loading && orders.length > 0 && (
        <Box>
          {orders.map((order) => renderOrderCard(order))}
        </Box>
      )}

      {/* Scheduling Dialog */}
      {renderSchedulingDialog()}

      {/* Floating Refresh Button (Mobile) */}
      {isMobile && (
        <Fab
          color="primary"
          sx={{ position: "fixed", bottom: 16, right: 16 }}
          onClick={fetchOrders}
          disabled={loading}
        >
          <Refresh />
        </Fab>
      )}
    </Container>
  );
};

export default DistributionSchedulingPage;
