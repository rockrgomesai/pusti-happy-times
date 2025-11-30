"use client";

import React, { useState, useEffect } from "react";
import {
  Box,
  Container,
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  MenuItem,
  IconButton,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Card,
  CardContent,
  CardActions,
  Stack,
  Divider,
  Grid as Grid2,
  Checkbox,
  FormControlLabel,
  Collapse,
  Alert,
  List,
  ListItem,
  ListItemText,
} from "@mui/material";
import {
  Timeline,
  TimelineItem,
  TimelineSeparator,
  TimelineConnector,
  TimelineContent,
  TimelineDot,
  TimelineOppositeContent,
} from "@mui/lab";
import {
  ExpandMore as ExpandMoreIcon,
  CheckCircle as CheckCircleIcon,
  Visibility as VisibilityIcon,
  LocalShipping as LocalShippingIcon,
  CheckBox as CheckBoxIcon,
  Schedule as ScheduleIcon,
  History as HistoryIcon,
  Warning as WarningIcon,
  Info as InfoIcon,
  Close as CloseIcon,
} from "@mui/icons-material";
import { formatDateForDisplay } from "@/lib/dateUtils";
import api from "@/lib/api";
import toast from "react-hot-toast";

interface Item {
  item_id: string;
  sku: string;
  product_name: string;
  dp_price: number;
  order_qty: number;
  scheduled_qty: number;
  unscheduled_qty: number;
}

interface SchedulingDetail {
  _id: string;
  item_id: string;
  sku: string;
  product_name: string;
  delivery_qty: number;
  depot_id: {
    _id: string;
    name: string;
  };
  scheduled_at: string;
  scheduled_by: string;
  approval_status?: string;
}

interface Order {
  scheduling_id: string;
  order_id: string;
  order_number: string;
  order_date: string;
  items: Item[];
  current_status: string;
  scheduling_details?: SchedulingDetail[];
}

interface Distributor {
  distributor_id: string;
  distributor_name: string;
  distributor_erp_id: string;
  orders: Order[];
}

interface Depot {
  depot_id: string;
  depot_name: string;
  distributors: Distributor[];
}

interface Facility {
  _id: string;
  name: string;
  code: string;
}

interface DeliveryQty {
  [key: string]: {
    delivery_qty: number;
    depot_id: string;
  };
}

interface ApprovalQty {
  [key: string]: number; // key: scheduling_detail_id, value: approved_qty
}

export default function SchedulingsPage() {
  const [loading, setLoading] = useState(true);
  const [depots, setDepots] = useState<Depot[]>([]);
  const [facilities, setFacilities] = useState<Facility[]>([]);
  const [deliveryQtys, setDeliveryQtys] = useState<DeliveryQty>({});
  const [expandedDepots, setExpandedDepots] = useState<Record<string, boolean>>({});
  const [expandedDistributors, setExpandedDistributors] = useState<Record<string, boolean>>({});
  const [expandedOrders, setExpandedOrders] = useState<Record<string, boolean>>({});
  const [showHistory, setShowHistory] = useState<Record<string, boolean>>({});
  const [userRole, setUserRole] = useState<string | null>(null);
  
  // Batch selection for Finance approval
  const [selectedSchedulingDetails, setSelectedSchedulingDetails] = useState<Record<string, Set<string>>>({});
  
  // Finance approval quantities (can be modified)
  const [approvalQtys, setApprovalQtys] = useState<ApprovalQty>({});
  
  // Order Details Dialog
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [orderDetailsOpen, setOrderDetailsOpen] = useState(false);
  const [loadingOrderDetails, setLoadingOrderDetails] = useState(false);
  const [financialSummary, setFinancialSummary] = useState<any>(null);
  const [loadingFinancial, setLoadingFinancial] = useState(false);

  useEffect(() => {
    loadSchedulings();
    loadFacilities();
    loadUserRole();
  }, []);

  const loadUserRole = async () => {
    try {
      const response = await api.get("/auth/me");
      const user = response.data.data?.user || response.data.user;
      const role = user?.role?.role || null;
      console.log("User role loaded:", role);
      console.log("Full user object:", user);
      setUserRole(role);
    } catch (error) {
      console.error("Failed to load user role:", error);
    }
  };

  const loadSchedulings = async () => {
    try {
      setLoading(true);
      const response = await api.get("/ordermanagement/schedulings");
      const depotsData = response.data.data || [];
      setDepots(depotsData);
      
      // Pre-fill delivery quantities for unscheduled items
      const initialDeliveryQtys: DeliveryQty = {};
      depotsData.forEach((depot: Depot) => {
        depot.distributors.forEach((distributor: Distributor) => {
          distributor.orders.forEach((order: Order) => {
            order.items
              .filter((item: Item) => item.unscheduled_qty > 0)
              .forEach((item: Item) => {
                const itemKey = `${order.scheduling_id}_${item.item_id}`;
                initialDeliveryQtys[itemKey] = {
                  delivery_qty: item.unscheduled_qty,
                  depot_id: depot.depot_id,
                };
              });
          });
        });
      });
      setDeliveryQtys(initialDeliveryQtys);
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to load schedulings");
    } finally {
      setLoading(false);
    }
  };

  const loadFacilities = async () => {
    try {
      const response = await api.get("/ordermanagement/schedulings/depots");
      setFacilities(response.data.data || []);
    } catch (error: any) {
      console.error("Failed to load facilities:", error);
    }
  };

  const handleDeliveryQtyChange = (itemKey: string, value: number, maxQty: number, defaultDepotId: string) => {
    if (value < 0) return;
    if (value > maxQty) {
      toast.error(`Delivery quantity cannot exceed ${maxQty}`);
      return;
    }
    
    setDeliveryQtys((prev) => ({
      ...prev,
      [itemKey]: {
        depot_id: prev[itemKey]?.depot_id || defaultDepotId,
        delivery_qty: value,
      },
    }));
  };

  const handleDepotChange = (itemKey: string, depotId: string) => {
    setDeliveryQtys((prev) => ({
      ...prev,
      [itemKey]: {
        ...prev[itemKey],
        depot_id: depotId,
      },
    }));
  };

  const handleSchedule = async (schedulingId: string, orderItems: Item[]) => {
    try {
      // Collect deliveries from deliveryQtys state for this scheduling
      const deliveries = orderItems
        .map((item) => {
          const itemKey = `${schedulingId}_${item.item_id}`;
          const delivery = deliveryQtys[itemKey];
          
          if (delivery && delivery.delivery_qty > 0) {
            return {
              item_id: item.item_id,
              delivery_qty: delivery.delivery_qty,
              depot_id: delivery.depot_id,
            };
          }
          return null;
        })
        .filter((d) => d !== null);

      if (deliveries.length === 0) {
        toast.error("Please enter delivery quantities for at least one item");
        return;
      }

      if (!confirm(`Schedule ${deliveries.length} item(s) for delivery?`)) {
        return;
      }

      await api.post(`/ordermanagement/schedulings/${schedulingId}/schedule`, {
        deliveries,
      });

      toast.success("Delivery scheduled successfully");
      
      // Reload schedulings
      loadSchedulings();
      
      // Clear delivery quantities for this scheduling
      setDeliveryQtys((prev) => {
        const updated = { ...prev };
        orderItems.forEach((item) => {
          const itemKey = `${schedulingId}_${item.item_id}`;
          delete updated[itemKey];
        });
        return updated;
      });
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to schedule delivery");
    }
  };

  const handleApprove = async (schedulingId: string, distributorId: string) => {
    try {
      if (!confirm("Are you sure you want to approve this scheduling?")) {
        return;
      }

      await api.post(`/ordermanagement/schedulings/${schedulingId}/approve`, {
        comments: "Approved by Finance",
      });

      toast.success("Scheduling approved successfully");
      
      // Reload schedulings
      loadSchedulings();
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to approve scheduling");
    }
  };

  const handleViewOrderDetails = async (orderId: string) => {
    try {
      console.log("📦 Loading order details for:", orderId);
      setLoadingOrderDetails(true);
      setLoadingFinancial(true);
      setOrderDetailsOpen(true);
      
      // Load order details and financial summary in parallel
      const [orderResponse, financialResponse] = await Promise.all([
        api.get(`/ordermanagement/demandorders/${orderId}`),
        api.get(`/ordermanagement/demandorders/${orderId}/financial-summary`).catch(() => ({ data: { data: null } }))
      ]);
      
      console.log("✅ Order details loaded:", orderResponse.data);
      console.log("✅ Financial summary loaded:", financialResponse.data);
      
      setSelectedOrder(orderResponse.data.data);
      setFinancialSummary(financialResponse.data.data);
    } catch (error: any) {
      console.error("❌ Failed to load order details:", error);
      toast.error(error.response?.data?.message || "Failed to load order details");
      setOrderDetailsOpen(false);
    } finally {
      setLoadingOrderDetails(false);
      setLoadingFinancial(false);
    }
  };

  const handleSelectSchedulingDetail = (schedulingId: string, detailId: string, checked: boolean) => {
    setSelectedSchedulingDetails((prev) => {
      const newState = { ...prev };
      if (!newState[schedulingId]) {
        newState[schedulingId] = new Set();
      }
      if (checked) {
        newState[schedulingId].add(detailId);
      } else {
        newState[schedulingId].delete(detailId);
      }
      return newState;
    });
  };

  const handleSelectAllSchedulingDetails = (schedulingId: string, detailIds: string[], checked: boolean) => {
    setSelectedSchedulingDetails((prev) => {
      const newState = { ...prev };
      if (checked) {
        newState[schedulingId] = new Set(detailIds);
      } else {
        newState[schedulingId] = new Set();
      }
      return newState;
    });
  };

  const handleApprovalQtyChange = (detailId: string, newQty: number, maxQty: number) => {
    if (newQty < 0) return;
    if (newQty > maxQty) {
      toast.error(`Approved quantity cannot exceed scheduled quantity of ${maxQty}`);
      return;
    }
    
    setApprovalQtys((prev) => ({
      ...prev,
      [detailId]: newQty,
    }));
  };

  const handleBatchApprove = async (schedulingId: string, schedulingDetails: SchedulingDetail[]) => {
    const selectedIds = selectedSchedulingDetails[schedulingId];
    if (!selectedIds || selectedIds.size === 0) {
      toast.error("Please select at least one item to approve");
      return;
    }

    // Build approval data with quantities
    const approvalsWithQty = Array.from(selectedIds).map(detailId => {
      const detail = schedulingDetails.find(d => d._id === detailId);
      const approvedQty = approvalQtys[detailId] ?? detail?.delivery_qty ?? 0;
      
      return {
        scheduling_detail_id: detailId,
        approved_qty: approvedQty,
        original_qty: detail?.delivery_qty ?? 0
      };
    });

    const totalApproved = approvalsWithQty.reduce((sum, item) => sum + item.approved_qty, 0);

    try {
      if (!confirm(`Approve ${selectedIds.size} item(s) with total quantity ${totalApproved}?`)) {
        return;
      }

      await api.post(`/ordermanagement/schedulings/${schedulingId}/approve-batch`, {
        approvals: approvalsWithQty,
        comments: "Partial approval by Finance",
      });

      toast.success(`${selectedIds.size} item(s) approved successfully`);
      
      // Clear selection and approval quantities
      setSelectedSchedulingDetails((prev) => {
        const newState = { ...prev };
        delete newState[schedulingId];
        return newState;
      });
      
      setApprovalQtys((prev) => {
        const newState = { ...prev };
        Array.from(selectedIds).forEach(id => delete newState[id]);
        return newState;
      });
      
      loadSchedulings();
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to approve selected items");
    }
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  // Check if there's any content to display based on user role
  const hasContent = depots.length > 0 && depots.some(depot => 
    depot.distributors.some(dist => 
      dist.orders.length > 0
    )
  );

  return (
    <Container maxWidth="xl" sx={{ px: { xs: 1, sm: 2, md: 3 } }}>
      <Box py={{ xs: 2, md: 3 }}>
        {/* Header */}
        <Box mb={3}>
          <Typography variant="h4" gutterBottom sx={{ fontSize: { xs: "1.5rem", md: "2.125rem" } }}>
            {userRole === "Finance" ? "Approve Schedulings" : "Distribution Scheduling"}
          </Typography>
          <Typography variant="body2" color="text.secondary" gutterBottom>
            {userRole === "Finance" 
              ? "Review and approve scheduled deliveries" 
              : "Schedule deliveries by depot and distributor"}
          </Typography>
        </Box>

        {!hasContent ? (
          <Alert severity="info" icon={<InfoIcon />} sx={{ mt: 2 }}>
            {depots.length === 0 ? "No orders found" : "No items pending scheduling or approval"}
          </Alert>
        ) : (
          <Stack spacing={2}>
            {depots.map((depot) => (
              <Card 
                key={depot.depot_id} 
                elevation={2}
                sx={{ 
                  borderLeft: 4, 
                  borderColor: "primary.main",
                  '&:hover': { boxShadow: 4 }
                }}
              >
                <CardContent>
                  <Box 
                    display="flex" 
                    justifyContent="space-between" 
                    alignItems="center"
                    onClick={() =>
                      setExpandedDepots((prev) => ({
                        ...prev,
                        [depot.depot_id]: !prev[depot.depot_id],
                      }))
                    }
                    sx={{ cursor: "pointer" }}
                  >
                    <Box display="flex" alignItems="center" gap={1}>
                      <LocalShippingIcon color="primary" />
                      <Typography variant="h6" sx={{ fontSize: { xs: "1rem", md: "1.25rem" } }}>
                        {depot.depot_name}
                      </Typography>
                    </Box>
                    <IconButton size="small">
                      <ExpandMoreIcon 
                        sx={{
                          transform: expandedDepots[depot.depot_id] ? "rotate(180deg)" : "rotate(0deg)",
                          transition: "transform 0.3s",
                        }}
                      />
                    </IconButton>
                  </Box>

                  <Collapse in={expandedDepots[depot.depot_id]}>
                    <Divider sx={{ my: 2 }} />
                    <Stack spacing={2}>
                      {depot.distributors.map((distributor) => {
                        const distributorKey = `${depot.depot_id}_${distributor.distributor_id}`;
                        
                        return (
                          <Card 
                            key={distributorKey} 
                            variant="outlined"
                            sx={{ 
                              bgcolor: "background.default",
                              borderLeft: 2,
                              borderColor: "secondary.main"
                            }}
                          >
                            <CardContent>
                              <Box 
                                display="flex" 
                                justifyContent="space-between" 
                                alignItems="center"
                                onClick={() =>
                                  setExpandedDistributors((prev) => ({
                                    ...prev,
                                    [distributorKey]: !prev[distributorKey],
                                  }))
                                }
                                sx={{ cursor: "pointer" }}
                              >
                                <Box>
                                  <Typography variant="subtitle1" fontWeight="600">
                                    {distributor.distributor_name}
                                  </Typography>
                                  <Typography variant="caption" color="text.secondary">
                                    ID: {distributor.distributor_erp_id}
                                  </Typography>
                                </Box>
                                <IconButton size="small">
                                  <ExpandMoreIcon 
                                    sx={{
                                      transform: expandedDistributors[distributorKey] ? "rotate(180deg)" : "rotate(0deg)",
                                      transition: "transform 0.3s",
                                    }}
                                  />
                                </IconButton>
                              </Box>

                              <Collapse in={expandedDistributors[distributorKey]}>
                                <Divider sx={{ my: 2 }} />
                                <Stack spacing={2}>
                                  {distributor.orders.map((order) => {
                                    const unscheduledItems = order.items.filter(item => item.unscheduled_qty > 0);
                                    const hasSchedulingDetails = order.scheduling_details && order.scheduling_details.length > 0;
                                    const scheduledItemsCount = order.items.filter(item => item.scheduled_qty > 0).length;
                                    const totalItemsCount = order.items.length;
                                    const completionPercent = Math.round((scheduledItemsCount / totalItemsCount) * 100);

                                    return (
                                      <Card 
                                        key={order.scheduling_id} 
                                        variant="outlined"
                                        sx={{ bgcolor: "white" }}
                                      >
                                        <CardContent>
                                          {/* Order Header */}
                                          <Box mb={2}>
                                            <Box display="flex" justifyContent="space-between" alignItems="flex-start" flexWrap="wrap" gap={1}>
                                              <Box>
                                                <Button
                                                  variant="text"
                                                  color="primary"
                                                  size="small"
                                                  onClick={() => handleViewOrderDetails(order.order_id)}
                                                  sx={{ 
                                                    textTransform: "none",
                                                    p: 0,
                                                    fontWeight: 600,
                                                    fontSize: "1rem"
                                                  }}
                                                >
                                                  {order.order_number}
                                                </Button>
                                                <Typography variant="caption" display="block" color="text.secondary">
                                                  {formatDateForDisplay(order.order_date)}
                                                </Typography>
                                              </Box>
                                              <Stack direction="row" spacing={1} alignItems="center">
                                                <Chip 
                                                  label={order.current_status.replace(/-/g, " ").toUpperCase()}
                                                  size="small"
                                                  color={order.current_status === "Approved" ? "success" : "warning"}
                                                />
                                                {scheduledItemsCount > 0 && (
                                                  <Chip
                                                    label={`${completionPercent}% Complete`}
                                                    size="small"
                                                    color={completionPercent === 100 ? "success" : "info"}
                                                    variant="outlined"
                                                  />
                                                )}
                                              </Stack>
                                            </Box>

                                            {/* Show scheduling history button */}
                                            {hasSchedulingDetails && (
                                              <Button
                                                size="small"
                                                startIcon={<HistoryIcon />}
                                                onClick={() => setShowHistory(prev => ({
                                                  ...prev,
                                                  [order.scheduling_id]: !prev[order.scheduling_id]
                                                }))}
                                                sx={{ mt: 1 }}
                                              >
                                                {showHistory[order.scheduling_id] ? "Hide" : "Show"} Scheduling History ({order.scheduling_details.length})
                                              </Button>
                                            )}
                                          </Box>

                                          {/* Scheduling Details - Pending Approval */}
                                          {hasSchedulingDetails && (
                                            <Box mb={2}>
                                              {/* Separate approved and pending items */}
                                              {(() => {
                                                const pendingDetails = order.scheduling_details.filter(
                                                  d => !d.approval_status || d.approval_status === "Pending"
                                                );
                                                const approvedDetails = order.scheduling_details.filter(
                                                  d => d.approval_status === "Approved"
                                                );

                                                return (
                                                  <>
                                                    {/* Pending Items for Approval (Finance Role) */}
                                                    {pendingDetails.length > 0 && (
                                                      <Box p={2} bgcolor="warning.50" borderRadius={1} mb={2}>
                                                        <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                                                          <Typography variant="subtitle2" fontWeight="600" color="warning.dark">
                                                            Items Pending Approval ({pendingDetails.length})
                                                          </Typography>
                                                          {userRole === "Finance" && (
                                                            <FormControlLabel
                                                              control={
                                                                <Checkbox
                                                                  checked={
                                                                    selectedSchedulingDetails[order.scheduling_id]?.size === pendingDetails.length
                                                                  }
                                                                  indeterminate={
                                                                    (selectedSchedulingDetails[order.scheduling_id]?.size || 0) > 0 &&
                                                                    (selectedSchedulingDetails[order.scheduling_id]?.size || 0) < pendingDetails.length
                                                                  }
                                                                  onChange={(e) =>
                                                                    handleSelectAllSchedulingDetails(
                                                                      order.scheduling_id,
                                                                      pendingDetails.map(d => d._id),
                                                                      e.target.checked
                                                                    )
                                                                  }
                                                                />
                                                              }
                                                              label="Select All"
                                                            />
                                                          )}
                                                        </Box>
                                                        <Stack spacing={1}>
                                                          {pendingDetails.map((detail) => {
                                                            const isSelected = selectedSchedulingDetails[order.scheduling_id]?.has(detail._id);
                                                            
                                                            return (
                                                              <Box
                                                                key={detail._id}
                                                                p={1.5}
                                                                bgcolor="white"
                                                                borderRadius={1}
                                                                border={2}
                                                                borderColor={isSelected ? "primary.main" : "divider"}
                                                                sx={{
                                                                  cursor: userRole === "Finance" ? "pointer" : "default",
                                                                  transition: "all 0.2s",
                                                                  "&:hover": userRole === "Finance" ? {
                                                                    borderColor: "primary.light",
                                                                    bgcolor: "grey.50"
                                                                  } : {}
                                                                }}
                                                                onClick={() => {
                                                                  if (userRole === "Finance") {
                                                                    handleSelectSchedulingDetail(
                                                                      order.scheduling_id,
                                                                      detail._id,
                                                                      !isSelected
                                                                    );
                                                                  }
                                                                }}
                                                              >
                                                                <Grid2 container spacing={1} alignItems="center">
                                                                  {userRole === "Finance" && (
                                                                    <Grid2 size={{ xs: 1 }}>
                                                                      <Checkbox
                                                                        checked={isSelected}
                                                                        onChange={(e) => {
                                                                          e.stopPropagation();
                                                                          handleSelectSchedulingDetail(
                                                                            order.scheduling_id,
                                                                            detail._id,
                                                                            e.target.checked
                                                                          );
                                                                        }}
                                                                      />
                                                                    </Grid2>
                                                                  )}
                                                                  <Grid2 size={{ xs: userRole === "Finance" ? 11 : 12, sm: userRole === "Finance" ? 5 : 6 }}>
                                                                    <Typography variant="body2" fontWeight="500">
                                                                      {detail.product_name}
                                                                    </Typography>
                                                                    <Typography variant="caption" color="text.secondary">
                                                                      SKU: {detail.sku}
                                                                    </Typography>
                                                                  </Grid2>
                                                                  <Grid2 size={{ xs: 6, sm: 3 }}>
                                                                    <Stack spacing={0.5}>
                                                                      <Typography variant="caption" color="text.secondary">
                                                                        Scheduled: <strong>{detail.delivery_qty}</strong>
                                                                      </Typography>
                                                                      <Typography variant="caption" display="block" color="text.secondary">
                                                                        {typeof detail.depot_id === 'object' ? detail.depot_id.name : 'N/A'}
                                                                      </Typography>
                                                                    </Stack>
                                                                  </Grid2>
                                                                  <Grid2 size={{ xs: 6, sm: 3 }}>
                                                                    {userRole === "Finance" ? (
                                                                      <Stack spacing={0.5}>
                                                                        <TextField
                                                                          type="number"
                                                                          size="small"
                                                                          label="Approve Qty"
                                                                          value={approvalQtys[detail._id] ?? detail.delivery_qty}
                                                                          onChange={(e) => {
                                                                            e.stopPropagation();
                                                                            handleApprovalQtyChange(
                                                                              detail._id,
                                                                              parseInt(e.target.value) || 0,
                                                                              detail.delivery_qty
                                                                            );
                                                                          }}
                                                                          onClick={(e) => e.stopPropagation()}
                                                                          inputProps={{
                                                                            min: 0,
                                                                            max: detail.delivery_qty,
                                                                          }}
                                                                          sx={{ width: "100%" }}
                                                                        />
                                                                      </Stack>
                                                                    ) : (
                                                                      <Chip
                                                                        label="Pending"
                                                                        size="small"
                                                                        color="warning"
                                                                        sx={{ fontSize: "0.7rem" }}
                                                                      />
                                                                    )}
                                                                  </Grid2>
                                                                </Grid2>
                                                              </Box>
                                                            );
                                                          })}
                                                        </Stack>
                                                      </Box>
                                                    )}

                                                    {/* Previously Approved Items */}
                                                    {approvedDetails.length > 0 && showHistory[order.scheduling_id] && (
                                                      <Box p={2} bgcolor="grey.50" borderRadius={1}>
                                                        <Typography variant="subtitle2" fontWeight="600" mb={1} color="success.dark">
                                                          Previously Approved ({approvedDetails.length})
                                                        </Typography>
                                                        <Stack spacing={1}>
                                                          {approvedDetails.map((detail) => (
                                                            <Box
                                                              key={detail._id}
                                                              p={1.5}
                                                              bgcolor="white"
                                                              borderRadius={1}
                                                              border={1}
                                                              borderColor="divider"
                                                            >
                                                              <Grid2 container spacing={1} alignItems="center">
                                                                <Grid2 size={{ xs: 12, sm: 6 }}>
                                                                  <Typography variant="body2" fontWeight="500">
                                                                    {detail.product_name}
                                                                  </Typography>
                                                                  <Typography variant="caption" color="text.secondary">
                                                                    SKU: {detail.sku}
                                                                  </Typography>
                                                                </Grid2>
                                                                <Grid2 size={{ xs: 6, sm: 3 }}>
                                                                  <Typography variant="caption" color="text.secondary">
                                                                    Qty: <strong>{detail.delivery_qty}</strong>
                                                                  </Typography>
                                                                  <Typography variant="caption" display="block" color="text.secondary">
                                                                    {typeof detail.depot_id === 'object' ? detail.depot_id.name : 'N/A'}
                                                                  </Typography>
                                                                </Grid2>
                                                                <Grid2 size={{ xs: 6, sm: 3 }}>
                                                                  <Chip
                                                                    label="Approved"
                                                                    size="small"
                                                                    color="success"
                                                                    sx={{ fontSize: "0.7rem" }}
                                                                  />
                                                                </Grid2>
                                                              </Grid2>
                                                            </Box>
                                                          ))}
                                                        </Stack>
                                                      </Box>
                                                    )}
                                                  </>
                                                );
                                              })()}
                                            </Box>
                                          )}

                                          {/* Unscheduled Items */}
                                          {unscheduledItems.length > 0 && (
                                            <>
                                              <Typography variant="subtitle2" fontWeight="600" mb={1} color="warning.main">
                                                Items to Schedule ({unscheduledItems.length})
                                              </Typography>
                                              <Stack spacing={2}>
                                                {unscheduledItems.map((item) => {
                                                  const itemKey = `${order.scheduling_id}_${item.item_id}`;
                                                  const currentDelivery = deliveryQtys[itemKey] || {
                                                    delivery_qty: item.unscheduled_qty,
                                                    depot_id: depot.depot_id,
                                                  };

                                                  return (
                                                    <Paper
                                                      key={itemKey}
                                                      variant="outlined"
                                                      sx={{ 
                                                        p: 2,
                                                        borderLeft: 3,
                                                        borderColor: currentDelivery.delivery_qty > 0 ? "success.main" : "grey.300",
                                                        bgcolor: currentDelivery.delivery_qty > 0 ? "success.50" : "white"
                                                      }}
                                                    >
                                                      <Grid2 container spacing={2}>
                                                        {/* Item Info */}
                                                        <Grid2 size={{ xs: 12 }}>
                                                          <Typography variant="body2" fontWeight="600">
                                                            {item.product_name}
                                                          </Typography>
                                                          <Typography variant="caption" color="text.secondary">
                                                            SKU: {item.sku} | DP: ৳{item.dp_price.toFixed(2)}
                                                          </Typography>
                                                        </Grid2>

                                                        {/* Quantities */}
                                                        <Grid2 size={{ xs: 12, sm: 6 }}>
                                                          <Stack direction="row" spacing={2} flexWrap="wrap">
                                                            <Box>
                                                              <Typography variant="caption" color="text.secondary">Order Qty</Typography>
                                                              <Typography variant="body2" fontWeight="600">{item.order_qty}</Typography>
                                                            </Box>
                                                            <Box>
                                                              <Typography variant="caption" color="text.secondary">Scheduled</Typography>
                                                              <Typography variant="body2" fontWeight="600">{item.scheduled_qty}</Typography>
                                                            </Box>
                                                            <Box>
                                                              <Typography variant="caption" color="warning.main">Unscheduled</Typography>
                                                              <Typography variant="body2" fontWeight="600" color="warning.main">
                                                                {item.unscheduled_qty}
                                                              </Typography>
                                                            </Box>
                                                          </Stack>
                                                        </Grid2>

                                                        {/* Delivery Controls */}
                                                        <Grid2 size={{ xs: 12, sm: 6 }}>
                                                          <Stack spacing={1}>
                                                            <TextField
                                                              type="number"
                                                              size="small"
                                                              label="Delivery Qty"
                                                              value={currentDelivery.delivery_qty}
                                                              onChange={(e) =>
                                                                handleDeliveryQtyChange(
                                                                  itemKey,
                                                                  parseInt(e.target.value) || 0,
                                                                  item.unscheduled_qty,
                                                                  depot.depot_id
                                                                )
                                                              }
                                                              inputProps={{ 
                                                                min: 0, 
                                                                max: item.unscheduled_qty
                                                              }}
                                                              fullWidth
                                                            />
                                                            <TextField
                                                              select
                                                              size="small"
                                                              label="Delivery Depot"
                                                              value={currentDelivery.depot_id}
                                                              onChange={(e) => handleDepotChange(itemKey, e.target.value)}
                                                              fullWidth
                                                            >
                                                              {facilities.map((facility) => (
                                                                <MenuItem key={facility._id} value={facility._id}>
                                                                  {facility.name}
                                                                </MenuItem>
                                                              ))}
                                                            </TextField>
                                                          </Stack>
                                                        </Grid2>
                                                      </Grid2>
                                                    </Paper>
                                                  );
                                                })}
                                              </Stack>
                                            </>
                                          )}
                                        </CardContent>

                                        {/* Action Buttons */}
                                        <CardActions sx={{ justifyContent: "flex-end", px: 2, pb: 2, gap: 1, flexWrap: "wrap" }}>
                                          {userRole === "Finance" && order.current_status === "Finance-to-approve" && (
                                            <>
                                              {/* Approve Selected Button */}
                                              <Button
                                                variant="contained"
                                                color="primary"
                                                startIcon={<CheckBoxIcon />}
                                                onClick={() => handleBatchApprove(order.scheduling_id, order.scheduling_details)}
                                                disabled={!selectedSchedulingDetails[order.scheduling_id] || selectedSchedulingDetails[order.scheduling_id].size === 0}
                                                sx={{ 
                                                  py: 1.5,
                                                  fontSize: { xs: "0.875rem", sm: "1rem" },
                                                  flex: { xs: "1 1 100%", sm: "0 1 auto" }
                                                }}
                                              >
                                                Approve Selected ({selectedSchedulingDetails[order.scheduling_id]?.size || 0})
                                              </Button>
                                              
                                              {/* Approve All Button */}
                                              <Button
                                                variant="outlined"
                                                color="primary"
                                                startIcon={<CheckCircleIcon />}
                                                onClick={() => handleApprove(order.scheduling_id, distributor.distributor_id)}
                                                sx={{ 
                                                  py: 1.5,
                                                  fontSize: { xs: "0.875rem", sm: "1rem" },
                                                  flex: { xs: "1 1 100%", sm: "0 1 auto" }
                                                }}
                                              >
                                                Approve All Pending
                                              </Button>
                                            </>
                                          )}
                                          {userRole === "Distribution" && unscheduledItems.length > 0 && (
                                            <Button
                                              variant="contained"
                                              color="success"
                                              startIcon={<ScheduleIcon />}
                                              onClick={() => handleSchedule(order.scheduling_id, order.items)}
                                              fullWidth={true}
                                              sx={{ 
                                                py: 1.5,
                                                fontSize: { xs: "0.875rem", sm: "1rem" }
                                              }}
                                            >
                                              Schedule Delivery
                                            </Button>
                                          )}
                                        </CardActions>
                                      </Card>
                                    );
                                  })}
                                </Stack>
                              </Collapse>
                            </CardContent>
                          </Card>
                        );
                      })}
                    </Stack>
                  </Collapse>
                </CardContent>
              </Card>
            ))}
          </Stack>
        )}
      </Box>

      {/* Order Details Dialog - Complete view matching demandorders page */}
      <Dialog
        open={orderDetailsOpen}
        onClose={() => {
          setOrderDetailsOpen(false);
          setSelectedOrder(null);
        }}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <Typography variant="h6">Order Details</Typography>
            <IconButton onClick={() => {
              setOrderDetailsOpen(false);
              setSelectedOrder(null);
            }}>
              <CloseIcon />
            </IconButton>
          </Box>
        </DialogTitle>
        <DialogContent dividers>
          {loadingOrderDetails ? (
            <Box display="flex" justifyContent="center" alignItems="center" minHeight="200px">
              <CircularProgress />
            </Box>
          ) : selectedOrder ? (
            <>
              {/* Order Info */}
              <Grid2 container spacing={2} sx={{ mb: 3 }}>
                <Grid2 size={{ xs: 12, sm: 6 }}>
                  <Typography variant="body2" color="text.secondary">
                    Order Number
                  </Typography>
                  <Typography variant="body1" fontWeight="bold">
                    {selectedOrder.order_number}
                  </Typography>
                </Grid2>
                <Grid2 size={{ xs: 12, sm: 6 }}>
                  <Typography variant="body2" color="text.secondary">
                    Status
                  </Typography>
                  <Chip
                    label={selectedOrder.status.toUpperCase()}
                    size="small"
                  />
                </Grid2>
                <Grid2 size={{ xs: 12, sm: 6 }}>
                  <Typography variant="body2" color="text.secondary">
                    Created
                  </Typography>
                  <Typography variant="body1">{formatDateForDisplay(selectedOrder.created_at)}</Typography>
                </Grid2>
                {selectedOrder.submitted_at && (
                  <Grid2 size={{ xs: 12, sm: 6 }}>
                    <Typography variant="body2" color="text.secondary">
                      Submitted
                    </Typography>
                    <Typography variant="body1">
                      {formatDateForDisplay(selectedOrder.submitted_at)}
                    </Typography>
                  </Grid2>
                )}
                {selectedOrder.approved_at && (
                  <Grid2 size={{ xs: 12, sm: 6 }}>
                    <Typography variant="body2" color="text.secondary">
                      Approved
                    </Typography>
                    <Typography variant="body1">
                      {formatDateForDisplay(selectedOrder.approved_at)}
                    </Typography>
                  </Grid2>
                )}
                {selectedOrder.rejected_at && (
                  <Grid2 size={{ xs: 12, sm: 6 }}>
                    <Typography variant="body2" color="text.secondary">
                      Rejected
                    </Typography>
                    <Typography variant="body1">
                      {formatDateForDisplay(selectedOrder.rejected_at)}
                    </Typography>
                  </Grid2>
                )}
                {selectedOrder.rejection_reason && (
                  <Grid2 size={{ xs: 12 }}>
                    <Alert severity="error">
                      <Typography variant="body2" fontWeight="bold">
                        Rejection Reason:
                      </Typography>
                      <Typography variant="body2">{selectedOrder.rejection_reason}</Typography>
                    </Alert>
                  </Grid2>
                )}
                {selectedOrder.cancellation_reason && (
                  <Grid2 size={{ xs: 12 }}>
                    <Alert severity="warning">
                      <Typography variant="body2" fontWeight="bold">
                        Cancellation Reason:
                      </Typography>
                      <Typography variant="body2">
                        {selectedOrder.cancellation_reason}
                      </Typography>
                    </Alert>
                  </Grid2>
                )}
              </Grid2>

              <Divider sx={{ my: 2 }} />

              {/* Order Items */}
              <Typography variant="h6" sx={{ mb: 2 }}>
                Order Items ({selectedOrder.item_count || selectedOrder.items?.length || 0})
              </Typography>
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell><strong>SKU</strong></TableCell>
                      <TableCell><strong>Source</strong></TableCell>
                      <TableCell align="right"><strong>Quantity</strong></TableCell>
                      <TableCell align="right"><strong>Unit Price</strong></TableCell>
                      <TableCell align="right"><strong>Subtotal</strong></TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {selectedOrder.items?.map((item: any, index: number) => (
                      <TableRow key={index}>
                        <TableCell>
                          <Typography variant="body2" fontWeight="bold">
                            {item.sku}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {item.source === "product"
                              ? item.product_details?.short_description
                              : item.offer_details?.offer_short_name}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={item.source || "product"}
                            size="small"
                            color={item.source === "product" ? "primary" : "secondary"}
                          />
                        </TableCell>
                        <TableCell align="right">{item.quantity}</TableCell>
                        <TableCell align="right">৳{item.unit_price?.toFixed(2)}</TableCell>
                        <TableCell align="right">৳{item.subtotal?.toFixed(2)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>

              <Divider sx={{ my: 2 }} />

              {/* Financial Summary */}
              <Typography variant="h6" sx={{ mb: 2 }}>
                Financial Summary
              </Typography>
              
              {loadingFinancial ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', py: 3 }}>
                  <CircularProgress size={30} />
                </Box>
              ) : financialSummary ? (
                <Box sx={{ display: "flex", justifyContent: "flex-end" }}>
                  <Box sx={{ minWidth: 300 }}>
                    {/* Order Total */}
                    <Box sx={{ display: "flex", justifyContent: "space-between", mb: 1.5 }}>
                      <Typography variant="body1" fontWeight={600}>Order Total:</Typography>
                      <Typography variant="body1" fontWeight={600}>
                        ৳{(financialSummary?.orderTotal || 0).toFixed(2)}
                      </Typography>
                    </Box>
                    <Divider sx={{ my: 1.5 }} />
                    
                    {/* Available Balance */}
                    <Box sx={{ display: "flex", justifyContent: "space-between", mb: 1 }}>
                      <Typography variant="body2" color="text.secondary">Available Balance:</Typography>
                      <Typography variant="body2" color={(financialSummary?.availableBalance || 0) >= 0 ? "success.main" : "error.main"}>
                        ৳{(financialSummary?.availableBalance || 0).toFixed(2)}
                      </Typography>
                    </Box>
                    
                    {/* Remaining Amount */}
                    <Box sx={{ display: "flex", justifyContent: "space-between", mb: 1 }}>
                      <Typography variant="body2" color="text.secondary">Remaining Amount:</Typography>
                      <Typography variant="body2">
                        ৳{(financialSummary?.remainingAmount || 0).toFixed(2)}
                      </Typography>
                    </Box>
                    
                    {/* Unapproved Payments */}
                    <Box sx={{ display: "flex", justifyContent: "space-between", mb: 1 }}>
                      <Typography variant="body2" color="text.secondary">Unapproved Payments:</Typography>
                      <Typography variant="body2" color="warning.main">
                        ৳{(financialSummary?.unapprovedPayments || 0).toFixed(2)}
                      </Typography>
                    </Box>
                    
                    <Divider sx={{ my: 1.5 }} />
                    
                    {/* Due Amount */}
                    <Box sx={{ display: "flex", justifyContent: "space-between", mt: 1 }}>
                      <Typography variant="h6" color="primary">Due Amount:</Typography>
                      <Typography variant="h6" color="primary">
                        ৳{(financialSummary?.dueAmount || 0).toFixed(2)}
                      </Typography>
                    </Box>
                  </Box>
                </Box>
              ) : (
                <Box sx={{ display: "flex", justifyContent: "flex-end" }}>
                  <Box sx={{ minWidth: 300 }}>
                    <Box sx={{ display: "flex", justifyContent: "space-between", mb: 1.5 }}>
                      <Typography variant="body1" fontWeight={600}>Order Total:</Typography>
                      <Typography variant="body1" fontWeight={600}>
                        ৳{selectedOrder.total_amount?.toFixed(2)}
                      </Typography>
                    </Box>
                  </Box>
                </Box>
              )}

              {/* Offers Summary */}
              {selectedOrder && selectedOrder.items && (
                <>
                  <Divider sx={{ my: 3 }} />
                  <Typography variant="h6" sx={{ mb: 2 }}>
                    Offers Summary
                  </Typography>
                  {(() => {
                    // Reconstruct cart items with offer details
                    const cartItems: any[] = selectedOrder.items.map((item: any) => ({
                      source: item.source,
                      source_id: item.source_id,
                      sku: item.sku,
                      quantity: item.quantity,
                      unit_price: item.unit_price,
                      subtotal: item.subtotal,
                      name: item.sku,
                      available_quantity: 0,
                      // Include offer details if ANY offer field exists
                      ...(item.offer_details && (item.offer_details.offer_id || item.offer_details.offer_name) && {
                        offer_id: item.offer_details.offer_id,
                        offer_name: item.offer_details.offer_name,
                        offer_type: item.offer_details.offer_type,
                        discount_percentage: item.offer_details.discount_percentage,
                        discount_amount: item.offer_details.discount_amount,
                        original_subtotal: item.offer_details.original_subtotal,
                      }),
                    }));

                    // Group cart items by offer_id or offer_name
                    const groups: Record<string, { offer: any; items: any[] }> = {};
                    cartItems.forEach((item) => {
                      const key = item.offer_id?.toString() || item.offer_name || 'no-offer';
                      if (!groups[key]) {
                        groups[key] = {
                          offer: (item.offer_id || item.offer_name) ? { _id: item.offer_id, name: item.offer_name, config: { type: item.offer_type } } : null,
                          items: [],
                        };
                      }
                      groups[key].items.push(item);
                    });

                    // Calculate discount from saved subtotals
                    const discountBreakdown: Array<{ offerName: string; discountAmount: number; items: any[] }> = [];
                    Object.values(groups).forEach(({ offer, items }) => {
                      let groupOriginal = 0;
                      let groupActual = 0;
                      items.forEach(item => {
                        groupOriginal += (item.original_subtotal || item.unit_price * item.quantity);
                        groupActual += item.subtotal;
                      });
                      const discountAmount = groupOriginal - groupActual;
                      if (discountAmount > 0) {
                        discountBreakdown.push({
                          offerName: offer?.name || 'Regular Discount',
                          discountAmount: discountAmount,
                          items: items,
                        });
                      }
                    });

                    const totalDiscount = discountBreakdown.reduce((sum, d) => sum + d.discountAmount, 0);
                    const offers = discountBreakdown.map(d => ({
                      offerName: d.offerName,
                      offerType: 'DISCOUNT',
                      items: d.items,
                      totalDiscount: d.discountAmount,
                      totalFreeValue: 0,
                    }));
                    const totalFreeValue = 0;
                    const discountOffers = offers;
                    const freeProductOffers: any[] = [];

                    if (offers.length === 0) {
                      return (
                        <Alert severity="info">No offers applied to this order</Alert>
                      );
                    }

                    return (
                      <Box>
                        {/* Summary Cards */}
                        <Grid2 container spacing={2} sx={{ mb: 2 }}>
                          <Grid2 size={{ xs: 12, sm: 6 }}>
                            <Paper sx={{ p: 2, bgcolor: 'success.50', border: '1px solid', borderColor: 'success.200' }}>
                              <Typography variant="caption" color="text.secondary">Total Discount</Typography>
                              <Typography variant="h6" color="success.dark">৳{totalDiscount.toFixed(2)}</Typography>
                              <Typography variant="caption">{discountOffers.length} discount offer(s)</Typography>
                            </Paper>
                          </Grid2>
                          <Grid2 size={{ xs: 12, sm: 6 }}>
                            <Paper sx={{ p: 2, bgcolor: 'secondary.50', border: '1px solid', borderColor: 'secondary.200' }}>
                              <Typography variant="caption" color="text.secondary">Free Products Value</Typography>
                              <Typography variant="h6" color="secondary.dark">৳{totalFreeValue.toFixed(2)}</Typography>
                              <Typography variant="caption">{freeProductOffers.length} free product offer(s)</Typography>
                            </Paper>
                          </Grid2>
                        </Grid2>

                        {/* Offers Breakdown */}
                        <Typography variant="subtitle2" fontWeight="bold" sx={{ mb: 1 }}>
                          Offers Applied
                        </Typography>
                        <List dense>
                          {offers.map((offer, idx) => (
                            <ListItem key={idx} sx={{ py: 1, px: 0, alignItems: 'flex-start', borderBottom: '1px solid', borderColor: 'divider' }}>
                              <ListItemText
                                primary={
                                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.5 }}>
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                      <Typography variant="body2" fontWeight="medium">
                                        {offer.offerName}
                                      </Typography>
                                      <Chip label={offer.offerType} size="small" color="primary" />
                                    </Box>
                                    <Typography variant="body2" fontWeight="bold" color={offer.totalDiscount > 0 ? 'success.dark' : 'secondary.dark'}>
                                      {offer.totalDiscount > 0 && `-৳${offer.totalDiscount.toFixed(2)}`}
                                      {offer.totalFreeValue > 0 && `৳${offer.totalFreeValue.toFixed(2)} free`}
                                    </Typography>
                                  </Box>
                                }
                                secondary={
                                  <Box>
                                    <Typography variant="caption" color="text.secondary" display="block">
                                      {offer.items.length} item(s) in this offer
                                    </Typography>
                                    <Box sx={{ mt: 1 }}>
                                      {offer.items.map((item: any, itemIdx: number) => {
                                        const originalSubtotal = (item as any).original_subtotal || item.offer_details?.original_subtotal || item.unit_price * item.quantity;
                                        const actualSubtotal = item.subtotal || 0;
                                        const itemDiscount = originalSubtotal - actualSubtotal;
                                        return (
                                          <Box key={itemIdx} sx={{ display: 'flex', justifyContent: 'space-between', py: 0.25 }}>
                                            <Typography variant="caption" color="text.secondary">
                                              {item.sku} × {item.quantity}
                                            </Typography>
                                            <Typography variant="caption" color="text.secondary">
                                              {actualSubtotal === 0 || item.offer_details?.is_free_in_bundle ? 'Free' : itemDiscount > 0 ? `-৳${itemDiscount.toFixed(2)}` : ''}
                                            </Typography>
                                          </Box>
                                        );
                                      })}
                                    </Box>
                                  </Box>
                                }
                                secondaryTypographyProps={{ component: 'div' }}
                              />
                            </ListItem>
                          ))}
                        </List>
                      </Box>
                    );
                  })()}
                </>
              )}

              {/* Approval History */}
              {selectedOrder.approval_history && selectedOrder.approval_history.length > 0 && (
                <>
                  <Divider sx={{ my: 3 }} />
                  <Typography variant="subtitle1" gutterBottom fontWeight="bold">
                    Order History
                  </Typography>
                  <Timeline position="right">
                    {[...selectedOrder.approval_history].reverse().map((history: any, index: number) => (
                      <TimelineItem key={index}>
                        <TimelineOppositeContent color="text.secondary" sx={{ flex: 0.3 }}>
                          <Typography variant="caption">
                            {new Date(history.timestamp).toLocaleString()}
                          </Typography>
                        </TimelineOppositeContent>
                        <TimelineSeparator>
                          <TimelineDot
                            color={
                              history.action === "submit" || history.action === "submitted"
                                ? "primary"
                                : history.action === "forward" || history.action === "forwarded"
                                ? "info"
                                : history.action === "return"
                                ? "warning"
                                : history.action === "modify" || history.action === "schedule"
                                ? "warning"
                                : history.action === "approve" || history.action === "approved"
                                ? "success"
                                : history.action === "reject" || history.action === "rejected" || history.action === "cancel"
                                ? "error"
                                : "grey"
                            }
                          />
                          {index < [...selectedOrder.approval_history].reverse().length - 1 && <TimelineConnector />}
                        </TimelineSeparator>
                        <TimelineContent>
                          <Typography variant="subtitle2" fontWeight="bold">
                            {history.action.replace(/_/g, ' ').toUpperCase()}
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            By: {history.performed_by_name || 'N/A'} ({history.performed_by_role || 'N/A'})
                          </Typography>
                          {history.comments && (
                            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                              Note: {history.comments}
                            </Typography>
                          )}
                        </TimelineContent>
                      </TimelineItem>
                    ))}
                  </Timeline>
                </>
              )}
            </>
          ) : null}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => {
            setOrderDetailsOpen(false);
            setSelectedOrder(null);
          }}>
            Close
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}
