"use client";

import React, { useState, useEffect } from "react";
import {
  Box,
  Typography,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Button,
  TextField,
  Select,
  MenuItem,
  FormControl,
  RadioGroup,
  FormControlLabel,
  Radio,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Pagination,
  CircularProgress,
  Alert,
  Chip,
  Divider,
  IconButton,
  Tooltip,
} from "@mui/material";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import { format } from "date-fns";
import toast from "react-hot-toast";
import { useAuth } from "@/contexts/AuthContext";
import {
  Timeline,
  TimelineItem,
  TimelineSeparator,
  TimelineConnector,
  TimelineContent,
  TimelineDot,
  TimelineOppositeContent,
} from "@mui/lab";
import { formatDateForDisplay } from "@/lib/dateUtils";
import { Grid as Grid2, List, ListItem, ListItemText } from "@mui/material";
import { apiClient } from "@/lib/api";

interface SchedulingItem {
  scheduling_id: string;
  order_id: string;
  order_number: string;
  order_date: string;
  depot_id: string;
  depot_name: string;
  distributor_id: string;
  distributor_name: string;
  distributor_erp_id: string;
  current_status: string;
  is_fully_scheduled: boolean;
  item_id: string;
  sku: string;
  product_name: string;
  dp_price: number;
  order_qty: number;
  scheduled_qty: number;
  unscheduled_qty: number;
  delivery_qty: number;
  delivery_depot_id: string;
  scheduled_at: string;
  scheduling_detail_id: string;
}

interface Distributor {
  distributor_id: string;
  distributor_name: string;
  distributor_erp_id: string;
  items: SchedulingItem[];
}

interface Depot {
  depot_id: string;
  depot_name: string;
  distributors: Distributor[];
}

interface Depot_Option {
  _id: string;
  name: string;
  depot_id?: string;
}

interface OrderDetail {
  _id: string;
  order_number: string;
  created_at: string;
  status: string;
  distributor_id: {
    name: string;
    erp_id: string;
  };
  total_amount: number;
  items: any[];
}

const ScheduledListPage = () => {
  const { user, loading: authLoading } = useAuth();
  const [filterType, setFilterType] = useState<"full" | "partial">("partial");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<Depot[]>([]);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [depots, setDepots] = useState<Depot_Option[]>([]);
  const [orderDetailsOpen, setOrderDetailsOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<OrderDetail | null>(null);
  const [loadingOrderDetails, setLoadingOrderDetails] = useState(false);
  const [financialSummary, setFinancialSummary] = useState<{
    orderTotal: number;
    availableBalance: number;
    remainingAmount: number;
    unapprovedPayments: number;
    dueAmount: number;
    payments: any[];
  } | null>(null);
  const [loadingFinancial, setLoadingFinancial] = useState(false);

  // For partial mode - new delivery quantities
  const [newDeliveries, setNewDeliveries] = useState<{
    [key: string]: { delivery_qty: number; depot_id: string };
  }>({});

  useEffect(() => {
    // Only fetch when user is authenticated
    if (!authLoading && user) {
      fetchDepots();
      fetchData();
    }
  }, [filterType, fromDate, toDate, page, limit, user, authLoading]);

  const fetchDepots = async () => {
    try {
      const result = await apiClient.get('/ordermanagement/schedulings/depots');
      if (result.success) {
        setDepots(result.data);
      }
    } catch (error) {
      console.error("Error fetching depots:", error);
    }
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const params: any = {
        filter: filterType,
        page: page.toString(),
        limit: limit.toString(),
      };

      if (fromDate) params.from_date = fromDate;
      if (toDate) params.to_date = toDate;

      const result = await apiClient.get('/ordermanagement/schedulings/my-schedulings', params);
      
      if (result.success) {
        setData(result.data);
        setTotalPages(result.pagination.totalPages);
        setTotalCount(result.pagination.total);
      } else {
        toast.error(result.message || "Failed to fetch data");
      }
    } catch (error) {
      console.error("Error fetching scheduled list:", error);
      toast.error("Failed to fetch scheduled list");
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setFilterType(event.target.value as "full" | "partial");
    setPage(1);
  };

  const handlePageChange = (_event: React.ChangeEvent<unknown>, value: number) => {
    setPage(value);
  };

  const handleLimitChange = (event: any) => {
    setLimit(event.target.value as number);
    setPage(1);
  };

  const handleDeliveryQtyChange = (itemKey: string, value: string) => {
    const qty = parseInt(value) || 0;
    setNewDeliveries((prev) => ({
      ...prev,
      [itemKey]: {
        ...prev[itemKey],
        delivery_qty: qty,
      },
    }));
  };

  const handleDepotChange = (itemKey: string, depotId: string) => {
    setNewDeliveries((prev) => ({
      ...prev,
      [itemKey]: {
        ...prev[itemKey],
        depot_id: depotId,
      },
    }));
  };

  const handleScheduleMore = async (schedulingId: string, distributorId: string) => {
    try {
      // Collect deliveries for this scheduling
      const deliveries: any[] = [];
      Object.entries(newDeliveries).forEach(([key, value]) => {
        const [schedId, distId, itemId] = key.split("_");
        if (schedId === schedulingId && distId === distributorId && value.delivery_qty > 0) {
          deliveries.push({
            item_id: itemId,
            delivery_qty: value.delivery_qty,
            depot_id: value.depot_id,
          });
        }
      });

      if (deliveries.length === 0) {
        toast.warning("Please enter delivery quantities");
        return;
      }

      const result = await apiClient.post(`/ordermanagement/schedulings/${schedulingId}/schedule`, { deliveries });
      
      if (result.success) {
        toast.success("Scheduling saved successfully");
        setNewDeliveries({});
        fetchData();
      } else {
        toast.error(result.message || "Failed to save scheduling");
      }
    } catch (error) {
      console.error("Error scheduling:", error);
      toast.error("Failed to save scheduling");
    }
  };

  const fetchFinancialSummary = async (orderId: string) => {
    try {
      setLoadingFinancial(true);
      const response = await apiClient.get(
        `/ordermanagement/demandorders/${orderId}/financial-summary`
      );
      setFinancialSummary(response.data.data);
    } catch (err: any) {
      console.error("Failed to load financial summary:", err);
      setFinancialSummary({
        orderTotal: 0,
        availableBalance: 0,
        remainingAmount: 0,
        unapprovedPayments: 0,
        dueAmount: 0,
        payments: [],
      });
    } finally {
      setLoadingFinancial(false);
    }
  };

  const handleViewOrder = async (orderId: string) => {
    try {
      setLoadingOrderDetails(true);
      setOrderDetailsOpen(true);
      
      const response = await apiClient.get(
        `/ordermanagement/demandorders/${orderId}`,
        undefined,
        {
          headers: {
            'Cache-Control': 'no-cache',
            'Pragma': 'no-cache'
          }
        }
      );
      
      if (response.success && response.data) {
        setSelectedOrder(response.data);
        await fetchFinancialSummary(orderId);
      } else {
        toast.error("Failed to fetch order details");
        setSelectedOrder(null);
      }
    } catch (error: any) {
      console.error("Error fetching order details:", error);
      toast.error(error.response?.data?.message || "Failed to fetch order details");
      setSelectedOrder(null);
    } finally {
      setLoadingOrderDetails(false);
    }
  };

  const formatDate = (dateString: string) => {
    return format(new Date(dateString), "dd/MM/yyyy");
  };

  const getStatusColor = (status: string) => {
    const statusMap: Record<string, string> = {
      draft: "default",
      submitted: "info",
      approved: "success",
      rejected: "error",
      cancelled: "warning",
    };
    return statusMap[status] || "default";
  };

  const formatDateTime = (dateString: string) => {
    return format(new Date(dateString), "dd/MM/yyyy HH:mm");
  };

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        My Schedulings
      </Typography>

      {/* Filters */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
          {/* Radio Buttons */}
          <FormControl component="fieldset">
            <RadioGroup row value={filterType} onChange={handleFilterChange}>
              <FormControlLabel value="full" control={<Radio />} label="Full" />
              <FormControlLabel value="partial" control={<Radio />} label="Partial" />
            </RadioGroup>
          </FormControl>

          {/* Date Pickers */}
          <Box sx={{ display: "flex", gap: 2, flexWrap: "wrap" }}>
            <TextField
              label="From Date"
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              InputLabelProps={{ shrink: true }}
              sx={{ minWidth: 200 }}
            />
            <TextField
              label="To Date"
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              InputLabelProps={{ shrink: true }}
              sx={{ minWidth: 200 }}
            />
            <Button
              variant="outlined"
              onClick={() => {
                setFromDate("");
                setToDate("");
              }}
            >
              Clear Dates
            </Button>
          </Box>

          {/* Pagination Controls */}
          <Box sx={{ display: "flex", gap: 2, alignItems: "center" }}>
            <Typography variant="body2">Items per page:</Typography>
            <Select value={limit} onChange={handleLimitChange} size="small">
              <MenuItem value={20}>20</MenuItem>
              <MenuItem value={40}>40</MenuItem>
              <MenuItem value={60}>60</MenuItem>
              <MenuItem value={80}>80</MenuItem>
              <MenuItem value={100}>100</MenuItem>
            </Select>
            <Typography variant="body2" sx={{ ml: 2 }}>
              Total: {totalCount} items
            </Typography>
          </Box>
        </Box>
      </Paper>

      {/* Loading */}
      {loading && (
        <Box sx={{ display: "flex", justifyContent: "center", my: 4 }}>
          <CircularProgress />
        </Box>
      )}

      {/* Data Display */}
      {!loading && data.length === 0 && (
        <Alert severity="info">No schedulings found for the selected filters.</Alert>
      )}

      {!loading && data.length > 0 && (
        <>
          {/* Depot Accordions */}
          {data.map((depot) => (
            <Accordion key={depot.depot_id} sx={{ mb: 2 }}>
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Typography variant="h6">{depot.depot_name}</Typography>
              </AccordionSummary>
              <AccordionDetails>
                {/* Distributor Accordions */}
                {depot.distributors.map((distributor) => (
                  <Accordion key={distributor.distributor_id} sx={{ mb: 1 }}>
                    <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                      <Typography>
                        {distributor.distributor_name} ({distributor.distributor_erp_id})
                      </Typography>
                    </AccordionSummary>
                    <AccordionDetails>
                      {/* Items Table */}
                      <TableContainer component={Paper}>
                        <Table size="small">
                          <TableHead>
                            <TableRow>
                              <TableCell>Order DT</TableCell>
                              <TableCell>DO</TableCell>
                              <TableCell>SKU</TableCell>
                              <TableCell>DP Price</TableCell>
                              <TableCell>Order Qty</TableCell>
                              <TableCell>Schld Qty</TableCell>
                              <TableCell>Unschld Qty</TableCell>
                              <TableCell>Dlvr Qty</TableCell>
                              {filterType === "partial" && <TableCell>New Dlvr Qty</TableCell>}
                              {filterType === "partial" && <TableCell>Depot</TableCell>}
                              <TableCell>Status</TableCell>
                              <TableCell>Scheduled At</TableCell>
                            </TableRow>
                          </TableHead>
                          <TableBody>
                            {distributor.items.map((item) => {
                              const itemKey = `${item.scheduling_id}_${distributor.distributor_id}_${item.item_id}`;
                              const newDelivery = newDeliveries[itemKey] || {
                                delivery_qty: 0,
                                depot_id: item.delivery_depot_id,
                              };

                              return (
                                <TableRow key={item.scheduling_detail_id}>
                                  <TableCell>{formatDate(item.order_date)}</TableCell>
                                  <TableCell>
                                    <Button
                                      onClick={() => handleViewOrder(item.order_id)}
                                      sx={{ textDecoration: "underline", p: 0, minWidth: 0 }}
                                    >
                                      {item.order_number}
                                    </Button>
                                  </TableCell>
                                  <TableCell>{item.sku}</TableCell>
                                  <TableCell>{item.dp_price.toFixed(2)}</TableCell>
                                  <TableCell>{item.order_qty}</TableCell>
                                  <TableCell>{item.scheduled_qty}</TableCell>
                                  <TableCell>{item.unscheduled_qty}</TableCell>
                                  <TableCell>{item.delivery_qty}</TableCell>
                                  {filterType === "partial" && (
                                    <TableCell>
                                      <TextField
                                        type="number"
                                        size="small"
                                        value={newDelivery.delivery_qty || ""}
                                        onChange={(e) =>
                                          handleDeliveryQtyChange(itemKey, e.target.value)
                                        }
                                        inputProps={{ min: 0, max: item.unscheduled_qty }}
                                        sx={{
                                          width: 80,
                                          backgroundColor:
                                            newDelivery.delivery_qty > 0 ? "#e3f2fd" : "inherit",
                                        }}
                                      />
                                    </TableCell>
                                  )}
                                  {filterType === "partial" && (
                                    <TableCell>
                                      <Select
                                        size="small"
                                        value={newDelivery.depot_id || ""}
                                        onChange={(e) => handleDepotChange(itemKey, e.target.value)}
                                        sx={{ minWidth: 120 }}
                                      >
                                        {depots.map((depot) => (
                                          <MenuItem key={depot._id} value={depot._id}>
                                            {depot.name}
                                          </MenuItem>
                                        ))}
                                      </Select>
                                    </TableCell>
                                  )}
                                  <TableCell>{item.current_status}</TableCell>
                                  <TableCell>{formatDateTime(item.scheduled_at)}</TableCell>
                                </TableRow>
                              );
                            })}
                          </TableBody>
                        </Table>
                      </TableContainer>

                      {/* Schedule More Button for Partial */}
                      {filterType === "partial" && (
                        <Box sx={{ mt: 2, display: "flex", justifyContent: "flex-end" }}>
                          <Button
                            variant="contained"
                            color="primary"
                            onClick={() =>
                              handleScheduleMore(
                                distributor.items[0].scheduling_id,
                                distributor.distributor_id
                              )
                            }
                          >
                            Schedule More
                          </Button>
                        </Box>
                      )}
                    </AccordionDetails>
                  </Accordion>
                ))}
              </AccordionDetails>
            </Accordion>
          ))}

          {/* Pagination */}
          <Box sx={{ display: "flex", justifyContent: "center", mt: 3 }}>
            <Pagination count={totalPages} page={page} onChange={handlePageChange} color="primary" />
          </Box>
        </>
      )}

      {/* Order Details Dialog */}
      <Dialog open={orderDetailsOpen} onClose={() => setOrderDetailsOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>Order Details</DialogTitle>
        <DialogContent dividers>
          {loadingOrderDetails && (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
              <CircularProgress />
            </Box>
          )}
          {!loadingOrderDetails && !selectedOrder && (
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', p: 4 }}>
              <Typography variant="body1" color="error" gutterBottom>
                Failed to load order details
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Please check the browser console for more information or try again.
              </Typography>
            </Box>
          )}
          {!loadingOrderDetails && selectedOrder && (
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
                    color={getStatusColor(selectedOrder.status) as any}
                    size="small"
                  />
                </Grid2>
                <Grid2 size={{ xs: 12, sm: 6 }}>
                  <Typography variant="body2" color="text.secondary">
                    Created
                  </Typography>
                  <Typography variant="body1">{formatDate(selectedOrder.created_at)}</Typography>
                </Grid2>
                {selectedOrder.submitted_at && (
                  <Grid2 size={{ xs: 12, sm: 6 }}>
                    <Typography variant="body2" color="text.secondary">
                      Submitted
                    </Typography>
                    <Typography variant="body1">
                      {formatDate(selectedOrder.submitted_at)}
                    </Typography>
                  </Grid2>
                )}
                {selectedOrder.approved_at && (
                  <Grid2 size={{ xs: 12, sm: 6 }}>
                    <Typography variant="body2" color="text.secondary">
                      Approved
                    </Typography>
                    <Typography variant="body1">
                      {formatDate(selectedOrder.approved_at)}
                    </Typography>
                  </Grid2>
                )}
              </Grid2>

              <Divider sx={{ my: 2 }} />

              {/* Order Items */}
              <Typography variant="h6" sx={{ mb: 2 }}>
                Order Items ({selectedOrder.item_count})
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
                    {selectedOrder.items.map((item: any, index: number) => (
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
                            label={item.source}
                            size="small"
                            color={item.source === "product" ? "primary" : "secondary"}
                          />
                        </TableCell>
                        <TableCell align="right">{item.quantity}</TableCell>
                        <TableCell align="right">৳{item.unit_price?.toFixed(2) || '0.00'}</TableCell>
                        <TableCell align="right">৳{item.subtotal?.toFixed(2) || '0.00'}</TableCell>
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
                    <Box sx={{ display: "flex", justifyContent: "space-between", mb: 1.5 }}>
                      <Typography variant="body1" fontWeight={600}>Order Total:</Typography>
                      <Typography variant="body1" fontWeight={600}>
                        ৳{(financialSummary?.orderTotal || 0).toFixed(2)}
                      </Typography>
                    </Box>
                    <Divider sx={{ my: 1.5 }} />
                    
                    <Box sx={{ display: "flex", justifyContent: "space-between", mb: 1 }}>
                      <Typography variant="body2" color="text.secondary">Available Balance:</Typography>
                      <Typography variant="body2" color={(financialSummary?.availableBalance || 0) >= 0 ? "success.main" : "error.main"}>
                        ৳{(financialSummary?.availableBalance || 0).toFixed(2)}
                      </Typography>
                    </Box>
                    
                    <Box sx={{ display: "flex", justifyContent: "space-between", mb: 1 }}>
                      <Typography variant="body2" color="text.secondary">Remaining Amount:</Typography>
                      <Typography variant="body2">
                        ৳{(financialSummary?.remainingAmount || 0).toFixed(2)}
                      </Typography>
                    </Box>
                    
                    <Box sx={{ display: "flex", justifyContent: "space-between", mb: 1 }}>
                      <Typography variant="body2" color="text.secondary">Unapproved Payments:</Typography>
                      <Typography variant="body2" color="warning.main">
                        ৳{(financialSummary?.unapprovedPayments || 0).toFixed(2)}
                      </Typography>
                    </Box>
                    
                    <Divider sx={{ my: 1.5 }} />
                    
                    <Box sx={{ display: "flex", justifyContent: "space-between", mt: 1 }}>
                      <Typography variant="h6" color="primary">Due Amount:</Typography>
                      <Typography variant="h6" color="primary">
                        ৳{(financialSummary?.dueAmount || 0).toFixed(2)}
                      </Typography>
                    </Box>
                  </Box>
                </Box>
              ) : null}

              {/* Payments List */}
              {financialSummary && financialSummary.payments.length > 0 && (
                <>
                  <Divider sx={{ my: 3 }} />
                  <Typography variant="h6" sx={{ mb: 2 }}>
                    Payments ({financialSummary.payments.length})
                  </Typography>
                  <TableContainer>
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell><strong>Transaction ID</strong></TableCell>
                          <TableCell><strong>Date</strong></TableCell>
                          <TableCell><strong>Method</strong></TableCell>
                          <TableCell align="right"><strong>Amount</strong></TableCell>
                          <TableCell><strong>Status</strong></TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {financialSummary.payments.map((payment: any) => (
                          <TableRow key={payment._id}>
                            <TableCell>
                              <Typography variant="body2">{payment.transaction_id}</Typography>
                            </TableCell>
                            <TableCell>
                              {formatDateForDisplay(payment.deposit_date)}
                            </TableCell>
                            <TableCell>
                              <Chip 
                                label={payment.payment_method} 
                                size="small"
                                color={payment.payment_method === 'Bank' ? 'primary' : 'default'}
                              />
                            </TableCell>
                            <TableCell align="right">
                              ৳{payment.deposit_amount?.toFixed(2) || '0.00'}
                            </TableCell>
                            <TableCell>
                              <Chip 
                                label={(payment.approval_status || 'pending').replace(/_/g, ' ')} 
                                size="small"
                                color={
                                  payment.approval_status === 'approved' ? 'success' :
                                  payment.approval_status === 'cancelled' ? 'error' :
                                  'warning'
                                }
                              />
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </>
              )}

              {/* Approval History */}
              {selectedOrder && selectedOrder.approval_history && selectedOrder.approval_history.length > 0 && (
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
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOrderDetailsOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default ScheduledListPage;
