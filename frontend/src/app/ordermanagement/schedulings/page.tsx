"use client";

import React, { useState, useEffect } from "react";
import {
  Box,
  Container,
  Typography,
  Paper,
  Accordion,
  AccordionSummary,
  AccordionDetails,
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
} from "@mui/material";
import {
  ExpandMore as ExpandMoreIcon,
  CheckCircle as CheckCircleIcon,
  Visibility as VisibilityIcon,
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

interface Order {
  scheduling_id: string;
  order_id: string;
  order_number: string;
  order_date: string;
  items: Item[];
  current_status: string;
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

export default function SchedulingsPage() {
  const [loading, setLoading] = useState(true);
  const [depots, setDepots] = useState<Depot[]>([]);
  const [facilities, setFacilities] = useState<Facility[]>([]);
  const [deliveryQtys, setDeliveryQtys] = useState<DeliveryQty>({});
  const [expandedDepots, setExpandedDepots] = useState<Record<string, boolean>>({});
  const [expandedDistributors, setExpandedDistributors] = useState<Record<string, boolean>>({});
  
  // Order Details Dialog
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [orderDetailsOpen, setOrderDetailsOpen] = useState(false);
  const [loadingOrderDetails, setLoadingOrderDetails] = useState(false);

  useEffect(() => {
    loadSchedulings();
    loadFacilities();
  }, []);

  const loadSchedulings = async () => {
    try {
      setLoading(true);
      const response = await api.get("/ordermanagement/schedulings");
      setDepots(response.data.data || []);
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to load schedulings");
    } finally {
      setLoading(false);
    }
  };

  const loadFacilities = async () => {
    try {
      const response = await api.get("/ordermanagement/schedulings/api/depots");
      setFacilities(response.data.data || []);
    } catch (error: any) {
      console.error("Failed to load facilities:", error);
    }
  };

  const handleDeliveryQtyChange = (itemKey: string, value: number, maxQty: number) => {
    if (value < 0) return;
    if (value > maxQty) {
      toast.error(`Delivery quantity cannot exceed ${maxQty}`);
      return;
    }
    
    setDeliveryQtys((prev) => ({
      ...prev,
      [itemKey]: {
        ...prev[itemKey],
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
      setLoadingOrderDetails(true);
      setOrderDetailsOpen(true);
      const response = await api.get(`/ordermanagement/demandorders/${orderId}`);
      setSelectedOrder(response.data.data);
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to load order details");
      setOrderDetailsOpen(false);
    } finally {
      setLoadingOrderDetails(false);
    }
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Container maxWidth="xl">
      <Box py={3}>
        <Typography variant="h4" gutterBottom>
          Distribution Scheduling
        </Typography>
        <Typography variant="body2" color="text.secondary" gutterBottom>
          Schedule deliveries by depot and distributor
        </Typography>

        {depots.length === 0 ? (
          <Paper sx={{ p: 3, mt: 2, textAlign: "center" }}>
            <Typography color="text.secondary">No orders to schedule</Typography>
          </Paper>
        ) : (
          <Box mt={3}>
            {depots.map((depot) => (
              <Accordion
                key={depot.depot_id}
                expanded={expandedDepots[depot.depot_id] || false}
                onChange={() =>
                  setExpandedDepots((prev) => ({
                    ...prev,
                    [depot.depot_id]: !prev[depot.depot_id],
                  }))
                }
                sx={{ mb: 2 }}
              >
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                  <Box display="flex" justifyContent="space-between" alignItems="center" width="100%">
                    <Typography variant="h6">Depot: {depot.depot_name}</Typography>
                  </Box>
                </AccordionSummary>
                <AccordionDetails>
                  {depot.distributors.map((distributor) => {
                    const distributorKey = `${depot.depot_id}_${distributor.distributor_id}`;
                    
                    return (
                      <Accordion
                        key={distributorKey}
                        expanded={expandedDistributors[distributorKey] || false}
                        onChange={() =>
                          setExpandedDistributors((prev) => ({
                            ...prev,
                            [distributorKey]: !prev[distributorKey],
                          }))
                        }
                        sx={{ mb: 1 }}
                      >
                        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                          <Typography>
                            Distributor: {distributor.distributor_name}, DB Id: {distributor.distributor_erp_id}
                          </Typography>
                        </AccordionSummary>
                        <AccordionDetails>
                          {distributor.orders.map((order) => (
                            <Box key={order.scheduling_id} mb={3}>
                              <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                                <Typography variant="subtitle1">
                                  Order Date: {formatDateForDisplay(order.order_date)}
                                </Typography>
                                <Button
                                  variant="contained"
                                  color="primary"
                                  startIcon={<CheckCircleIcon />}
                                  onClick={() => handleApprove(order.scheduling_id, distributor.distributor_id)}
                                  size="small"
                                >
                                  Approve
                                </Button>
                              </Box>
                              
                              <TableContainer component={Paper} variant="outlined">
                                <Table size="small">
                                  <TableHead>
                                    <TableRow>
                                      <TableCell>Order DT</TableCell>
                                      <TableCell>DO</TableCell>
                                      <TableCell>SKU</TableCell>
                                      <TableCell align="right">DP Price</TableCell>
                                      <TableCell align="right">Order Qty</TableCell>
                                      <TableCell align="right">Schld Qty</TableCell>
                                      <TableCell align="right">Unschld Qty</TableCell>
                                      <TableCell align="right">Dlvr Qty</TableCell>
                                      <TableCell>Depot</TableCell>
                                    </TableRow>
                                  </TableHead>
                                  <TableBody>
                                    {order.items.map((item) => {
                                      const itemKey = `${order.scheduling_id}_${item.item_id}`;
                                      const currentDelivery = deliveryQtys[itemKey] || {
                                        delivery_qty: 0,
                                        depot_id: depot.depot_id,
                                      };

                                      return (
                                        <TableRow key={itemKey}>
                                          <TableCell>{formatDateForDisplay(order.order_date)}</TableCell>
                                          <TableCell>
                                            <Button
                                              variant="text"
                                              color="primary"
                                              size="small"
                                              onClick={() => handleViewOrderDetails(order.order_id)}
                                              sx={{ 
                                                textTransform: "none",
                                                p: 0,
                                                minWidth: "auto",
                                                textDecoration: "underline",
                                              }}
                                            >
                                              {order.order_number}
                                            </Button>
                                          </TableCell>
                                          <TableCell>{item.sku}</TableCell>
                                          <TableCell align="right">৳{item.dp_price.toFixed(2)}</TableCell>
                                          <TableCell align="right">{item.order_qty}</TableCell>
                                          <TableCell align="right">{item.scheduled_qty}</TableCell>
                                          <TableCell align="right">
                                            <Chip
                                              label={item.unscheduled_qty}
                                              size="small"
                                              color={item.unscheduled_qty > 0 ? "warning" : "success"}
                                            />
                                          </TableCell>
                                          <TableCell align="right">
                                            <TextField
                                              type="number"
                                              size="small"
                                              value={currentDelivery.delivery_qty}
                                              onChange={(e) =>
                                                handleDeliveryQtyChange(
                                                  itemKey,
                                                  parseInt(e.target.value) || 0,
                                                  item.unscheduled_qty
                                                )
                                              }
                                              inputProps={{ 
                                                min: 0, 
                                                max: item.unscheduled_qty,
                                                style: { 
                                                  textAlign: "right",
                                                  backgroundColor: currentDelivery.delivery_qty > 0 ? "#e3f2fd" : "inherit"
                                                }
                                              }}
                                              sx={{ width: 100 }}
                                              disabled={item.unscheduled_qty === 0}
                                            />
                                          </TableCell>
                                          <TableCell>
                                            <TextField
                                              select
                                              size="small"
                                              value={currentDelivery.depot_id}
                                              onChange={(e) => handleDepotChange(itemKey, e.target.value)}
                                              sx={{ width: 200 }}
                                              disabled={item.unscheduled_qty === 0}
                                            >
                                              {facilities.map((facility) => (
                                                <MenuItem key={facility._id} value={facility._id}>
                                                  {facility.name}
                                                </MenuItem>
                                              ))}
                                            </TextField>
                                          </TableCell>
                                        </TableRow>
                                      );
                                    })}
                                  </TableBody>
                                </Table>
                              </TableContainer>
                            </Box>
                          ))}
                        </AccordionDetails>
                      </Accordion>
                    );
                  })}
                </AccordionDetails>
              </Accordion>
            ))}
          </Box>
        )}
      </Box>

      {/* Order Details Dialog */}
      <Dialog
        open={orderDetailsOpen}
        onClose={() => {
          setOrderDetailsOpen(false);
          setSelectedOrder(null);
        }}
        maxWidth="lg"
        fullWidth
      >
        <DialogTitle>
          Order Details: {selectedOrder?.order_number || ""}
        </DialogTitle>
        <DialogContent>
          {loadingOrderDetails ? (
            <Box display="flex" justifyContent="center" alignItems="center" minHeight="200px">
              <CircularProgress />
            </Box>
          ) : selectedOrder ? (
            <Box>
              {/* Order Summary */}
              <Paper sx={{ p: 2, mb: 2 }}>
                <Typography variant="h6" gutterBottom>Order Summary</Typography>
                <Box display="grid" gridTemplateColumns="repeat(2, 1fr)" gap={2}>
                  <Box>
                    <Typography variant="body2" color="text.secondary">Order Number:</Typography>
                    <Typography variant="body1">{selectedOrder.order_number}</Typography>
                  </Box>
                  <Box>
                    <Typography variant="body2" color="text.secondary">Order Date:</Typography>
                    <Typography variant="body1">{formatDateForDisplay(selectedOrder.created_at)}</Typography>
                  </Box>
                  <Box>
                    <Typography variant="body2" color="text.secondary">Status:</Typography>
                    <Chip label={selectedOrder.status.toUpperCase().replace(/_/g, " ")} size="small" />
                  </Box>
                  <Box>
                    <Typography variant="body2" color="text.secondary">Total Amount:</Typography>
                    <Typography variant="body1">৳{selectedOrder.total_amount?.toFixed(2)}</Typography>
                  </Box>
                </Box>
              </Paper>

              {/* Order Items */}
              <Paper sx={{ p: 2 }}>
                <Typography variant="h6" gutterBottom>Order Items</Typography>
                <TableContainer>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>SKU</TableCell>
                        <TableCell>Product</TableCell>
                        <TableCell align="right">Unit Price</TableCell>
                        <TableCell align="right">Quantity</TableCell>
                        <TableCell align="right">Subtotal</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {selectedOrder.items?.map((item: any, index: number) => (
                        <TableRow key={index}>
                          <TableCell>{item.sku}</TableCell>
                          <TableCell>{item.product_name}</TableCell>
                          <TableCell align="right">৳{item.unit_price?.toFixed(2)}</TableCell>
                          <TableCell align="right">{item.quantity}</TableCell>
                          <TableCell align="right">৳{item.subtotal?.toFixed(2)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Paper>
            </Box>
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
