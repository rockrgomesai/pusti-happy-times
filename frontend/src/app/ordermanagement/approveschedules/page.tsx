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
  Stack,
  Card,
  CardContent,
  CardHeader,
  Collapse,
  LinearProgress,
  useMediaQuery,
  useTheme,
  List,
  ListItem,
  ListItemText,
  Tabs,
  Tab,
} from "@mui/material";
import {
  Visibility,
  CheckCircle,
  Cancel,
  Refresh,
  ExpandMore,
  ExpandLess,
  Schedule as ScheduleIcon,
  Assignment,
  Warehouse,
  LocalShipping,
  AttachMoney,
  History,
} from "@mui/icons-material";
import api from "@/lib/api";

/**
 * ============================================================================
 * APPROVE SCHEDULES MODULE - FINANCE
 * ============================================================================
 * 
 * Finance reviews and approves/rejects orders that have been scheduled by
 * Distribution. Final approval step before order fulfillment.
 * 
 * Features:
 * ✅ View pending scheduled orders
 * ✅ Review scheduling details with facility breakdown
 * ✅ Approve or reject orders
 * ✅ Add comments/rejection reasons
 * ✅ View approval history
 * ✅ Mobile-responsive design
 * ============================================================================
 */

// ============================================================================
// TYPES
// ============================================================================

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
  sku: string;
  quantity: number;
  unit_price: number;
  subtotal: number;
  product_details?: {
    short_description: string;
  };
  offer_details?: {
    offer_name: string;
  };
  offer_type?: string;
  offer_name?: string;
  is_bundle_offer?: boolean;
  schedules: Schedule[];
  schedule_summary?: {
    total_schedules: number;
    total_scheduled_qty: number;
    total_amount: number;
    facilities: string[];
  };
}

interface DemandOrder {
  _id: string;
  order_number: string;
  distributor_id: {
    _id: string;
    name: string;
    code: string;
    erp_id: string;
  };
  items: OrderItem[];
  total_amount: number;
  status: string;
  submitted_at?: string;
  updated_at: string;
  scheduling_summary?: {
    total_items: number;
    items_with_schedules: number;
    total_schedules: number;
    unique_facilities: string[];
  };
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

const ApproveSchedulesPage: React.FC = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));

  // ========== STATE ==========
  const [activeTab, setActiveTab] = useState(0);
  const [orders, setOrders] = useState<DemandOrder[]>([]);
  const [historyOrders, setHistoryOrders] = useState<DemandOrder[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Dialog states
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<DemandOrder | null>(null);
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());

  // Approve/Reject states
  const [approveDialogOpen, setApproveDialogOpen] = useState(false);
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [comments, setComments] = useState("");
  const [rejectionReason, setRejectionReason] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // ========== EFFECTS ==========
  useEffect(() => {
    fetchOrders();
  }, []);

  useEffect(() => {
    if (activeTab === 1) {
      fetchHistory();
    }
  }, [activeTab]);

  // ========== API FUNCTIONS ==========
  const fetchOrders = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await api.get("/ordermanagement/approveschedules/pending");
      console.log("💰 Scheduled orders fetched:", response.data);
      setOrders(response.data.data || []);
    } catch (err: any) {
      console.error("Fetch error:", err);
      if (err.response?.status === 403) {
        setError("You don't have permission to access Approve Schedules");
      } else if (err.response?.status === 401) {
        setError("Please log in again");
      } else {
        setError(err.response?.data?.message || "Failed to fetch scheduled orders");
      }
    } finally {
      setLoading(false);
    }
  };

  const fetchHistory = async () => {
    try {
      const response = await api.get("/ordermanagement/approveschedules/history?limit=50");
      setHistoryOrders(response.data.data || []);
    } catch (err: any) {
      console.error("History fetch error:", err);
    }
  };

  const openViewDialog = async (orderId: string) => {
    try {
      setError(null);
      const response = await api.get(`/ordermanagement/approveschedules/${orderId}`);
      console.log("💰 Order details:", response.data);
      setSelectedOrder(response.data.data);
      setViewDialogOpen(true);
    } catch (err: any) {
      console.error("Error fetching order details:", err);
      setError(err.response?.data?.message || "Failed to fetch order details");
    }
  };

  const handleApprove = async () => {
    if (!selectedOrder) return;

    setSubmitting(true);
    setError(null);

    try {
      const response = await api.post(
        `/ordermanagement/approveschedules/${selectedOrder._id}/approve`,
        { comments }
      );

      setSuccess(response.data.message || "Order approved successfully");
      setApproveDialogOpen(false);
      setViewDialogOpen(false);
      setComments("");
      setSelectedOrder(null);
      await fetchOrders();
    } catch (err: any) {
      console.error("Approve error:", err);
      setError(err.response?.data?.message || "Failed to approve order");
    } finally {
      setSubmitting(false);
    }
  };

  const handleReject = async () => {
    if (!selectedOrder) return;

    if (!rejectionReason.trim()) {
      setError("Rejection reason is required");
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const response = await api.post(
        `/ordermanagement/approveschedules/${selectedOrder._id}/reject`,
        { reason: rejectionReason }
      );

      setSuccess(response.data.message || "Order rejected and sent back to Distribution");
      setRejectDialogOpen(false);
      setViewDialogOpen(false);
      setRejectionReason("");
      setSelectedOrder(null);
      await fetchOrders();
    } catch (err: any) {
      console.error("Reject error:", err);
      setError(err.response?.data?.message || "Failed to reject order");
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
      case "scheduling_completed":
        return "info";
      case "approved":
        return "success";
      case "rejected":
        return "error";
      default:
        return "default";
    }
  };

  // ========== RENDER HELPERS ==========
  const renderOrderCard = (order: DemandOrder) => {
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
            <Tooltip title="View Details">
              <IconButton
                color="primary"
                onClick={() => openViewDialog(order._id)}
                size={isMobile ? "small" : "medium"}
              >
                <Visibility />
              </IconButton>
            </Tooltip>
          }
        />
        <CardContent>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
              <Typography variant="caption" color="text.secondary">
                Items Scheduled
              </Typography>
              <Typography variant="body2" fontWeight="bold">
                {order.scheduling_summary?.items_with_schedules || 0}/
                {order.scheduling_summary?.total_items || 0} items
              </Typography>
            </Grid>
            <Grid item xs={12} sm={6}>
              <Typography variant="caption" color="text.secondary">
                Total Schedules
              </Typography>
              <Typography variant="body2" fontWeight="bold">
                {order.scheduling_summary?.total_schedules || 0} schedules
              </Typography>
            </Grid>
            <Grid item xs={12}>
              <Typography variant="caption" color="text.secondary">
                Facilities Used
              </Typography>
              <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5, mt: 0.5 }}>
                {order.scheduling_summary?.unique_facilities.map((facility) => (
                  <Chip key={facility} label={facility} size="small" icon={<Warehouse />} />
                ))}
              </Box>
            </Grid>
            <Grid item xs={12}>
              <Typography variant="caption" color="text.secondary">
                Total Amount
              </Typography>
              <Typography variant="h6" color="primary" fontWeight="bold">
                ৳{order.total_amount.toLocaleString()}
              </Typography>
            </Grid>
          </Grid>
        </CardContent>
      </Card>
    );
  };

  const renderViewDialog = () => {
    if (!selectedOrder) return null;

    return (
      <Dialog
        open={viewDialogOpen}
        onClose={() => !submitting && setViewDialogOpen(false)}
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
          </Stack>
        </DialogTitle>

        <DialogContent dividers>
          {error && (
            <Alert severity="error" onClose={() => setError(null)} sx={{ mb: 2 }}>
              {error}
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
                      />
                    )}

                    {/* Schedule Summary */}
                    {item.schedule_summary && (
                      <Grid container spacing={1}>
                        <Grid item xs={6}>
                          <Typography variant="caption" color="text.secondary">
                            Schedules
                          </Typography>
                          <Typography variant="body2" fontWeight="bold">
                            {item.schedule_summary.total_schedules}
                          </Typography>
                        </Grid>
                        <Grid item xs={6}>
                          <Typography variant="caption" color="text.secondary">
                            Total Scheduled
                          </Typography>
                          <Typography variant="body2" fontWeight="bold">
                            {item.schedule_summary.total_scheduled_qty} / {item.quantity} units
                          </Typography>
                        </Grid>
                        <Grid item xs={12}>
                          <Typography variant="caption" color="text.secondary">
                            Amount
                          </Typography>
                          <Typography variant="body2" fontWeight="bold" color="primary">
                            ৳{item.schedule_summary.total_amount.toLocaleString()}
                          </Typography>
                        </Grid>
                      </Grid>
                    )}
                  </Stack>
                </Box>

                {/* Expanded Content */}
                <Collapse in={expandedItems.has(item._id)}>
                  <Box sx={{ p: 2 }}>
                    {/* Schedule Details */}
                    {item.schedules && item.schedules.length > 0 && (
                      <Paper sx={{ p: 2 }}>
                        <Typography variant="subtitle2" fontWeight="bold" gutterBottom>
                          📅 Delivery Schedules ({item.schedules.length})
                        </Typography>
                        <Divider sx={{ my: 1 }} />
                        <Stack spacing={1}>
                          {item.schedules.map((schedule) => (
                            <Paper key={schedule.schedule_id} sx={{ p: 1.5, bgcolor: "grey.50" }}>
                              <Grid container spacing={1}>
                                <Grid item xs={12}>
                                  <Typography variant="body2" fontWeight="bold">
                                    {schedule.deliver_bundles
                                      ? `${schedule.deliver_bundles} bundles (${schedule.deliver_qty} units)`
                                      : `${schedule.deliver_qty} units`}
                                  </Typography>
                                </Grid>
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
                                  <Typography variant="body2">
                                    {schedule.scheduled_by_name}
                                  </Typography>
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
                                  <Typography variant="body2" fontWeight="bold" color="primary">
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
                                {schedule.deliver_qty_breakdown && (
                                  <Grid item xs={12}>
                                    <Typography variant="caption" color="text.secondary">
                                      SKU Breakdown:
                                    </Typography>
                                    <Typography variant="body2">
                                      {Object.entries(schedule.deliver_qty_breakdown)
                                        .map(([sku, qty]) => `${sku}: ${qty}`)
                                        .join(", ")}
                                    </Typography>
                                  </Grid>
                                )}
                              </Grid>
                            </Paper>
                          ))}
                        </Stack>
                      </Paper>
                    )}
                  </Box>
                </Collapse>
              </Paper>
            ))}
          </Stack>
        </DialogContent>

        <DialogActions sx={{ p: 2, gap: 1 }}>
          <Button onClick={() => setViewDialogOpen(false)} disabled={submitting}>
            Close
          </Button>
          <Button
            variant="outlined"
            color="error"
            startIcon={<Cancel />}
            onClick={() => setRejectDialogOpen(true)}
            disabled={submitting}
          >
            Reject
          </Button>
          <Button
            variant="contained"
            color="success"
            startIcon={<CheckCircle />}
            onClick={() => setApproveDialogOpen(true)}
            disabled={submitting}
          >
            Approve
          </Button>
        </DialogActions>
      </Dialog>
    );
  };

  const renderApproveDialog = () => {
    if (!selectedOrder) return null;

    return (
      <Dialog open={approveDialogOpen} onClose={() => setApproveDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Approve Order</DialogTitle>
        <DialogContent>
          <Typography variant="body2" gutterBottom>
            Are you sure you want to approve order <strong>{selectedOrder.order_number}</strong>?
          </Typography>
          <TextField
            fullWidth
            multiline
            rows={3}
            label="Comments (Optional)"
            value={comments}
            onChange={(e) => setComments(e.target.value)}
            margin="normal"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setApproveDialogOpen(false)} disabled={submitting}>
            Cancel
          </Button>
          <Button
            variant="contained"
            color="success"
            onClick={handleApprove}
            disabled={submitting}
            startIcon={submitting ? <CircularProgress size={16} /> : <CheckCircle />}
          >
            {submitting ? "Approving..." : "Confirm Approval"}
          </Button>
        </DialogActions>
      </Dialog>
    );
  };

  const renderRejectDialog = () => {
    if (!selectedOrder) return null;

    return (
      <Dialog open={rejectDialogOpen} onClose={() => setRejectDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Reject Order</DialogTitle>
        <DialogContent>
          <Typography variant="body2" gutterBottom>
            Reject order <strong>{selectedOrder.order_number}</strong> and send back to Distribution?
          </Typography>
          <TextField
            fullWidth
            required
            multiline
            rows={4}
            label="Rejection Reason (Required)"
            value={rejectionReason}
            onChange={(e) => setRejectionReason(e.target.value)}
            margin="normal"
            error={!rejectionReason.trim()}
            helperText={!rejectionReason.trim() ? "Rejection reason is required" : ""}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRejectDialogOpen(false)} disabled={submitting}>
            Cancel
          </Button>
          <Button
            variant="contained"
            color="error"
            onClick={handleReject}
            disabled={submitting || !rejectionReason.trim()}
            startIcon={submitting ? <CircularProgress size={16} /> : <Cancel />}
          >
            {submitting ? "Rejecting..." : "Confirm Rejection"}
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
            Approve Schedules
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Review and approve scheduled orders from Distribution
          </Typography>
        </Box>
        <Tooltip title="Refresh">
          <IconButton color="primary" onClick={fetchOrders} disabled={loading}>
            <Refresh />
          </IconButton>
        </Tooltip>
      </Stack>

      {/* Tabs */}
      <Tabs value={activeTab} onChange={(e, newValue) => setActiveTab(newValue)} sx={{ mb: 3 }}>
        <Tab label="Pending Approvals" icon={<ScheduleIcon />} iconPosition="start" />
        <Tab label="History" icon={<History />} iconPosition="start" />
      </Tabs>

      {/* Error/Success Alerts */}
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

      {/* Loading State */}
      {loading && (
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="300px">
          <CircularProgress />
        </Box>
      )}

      {/* Pending Tab */}
      {!loading && activeTab === 0 && (
        <>
          {orders.length === 0 ? (
            <Paper sx={{ p: 4, textAlign: "center" }}>
              <CheckCircle sx={{ fontSize: 80, color: "text.secondary", mb: 2 }} />
              <Typography variant="h6" color="text.secondary" gutterBottom>
                No Pending Approvals
              </Typography>
              <Typography variant="body2" color="text.secondary">
                All scheduled orders have been processed
              </Typography>
            </Paper>
          ) : (
            <Box>{orders.map((order) => renderOrderCard(order))}</Box>
          )}
        </>
      )}

      {/* History Tab */}
      {activeTab === 1 && (
        <>
          {historyOrders.length === 0 ? (
            <Paper sx={{ p: 4, textAlign: "center" }}>
              <History sx={{ fontSize: 80, color: "text.secondary", mb: 2 }} />
              <Typography variant="h6" color="text.secondary" gutterBottom>
                No History
              </Typography>
            </Paper>
          ) : (
            <Box>{historyOrders.map((order) => renderOrderCard(order))}</Box>
          )}
        </>
      )}

      {/* Dialogs */}
      {renderViewDialog()}
      {renderApproveDialog()}
      {renderRejectDialog()}
    </Container>
  );
};

export default ApproveSchedulesPage;
