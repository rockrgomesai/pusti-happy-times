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
  FormControl,
  RadioGroup,
  FormControlLabel,
  Radio,
  Pagination,
  CircularProgress,
  Alert,
  Select,
  MenuItem,
  InputLabel,
  TextField,
} from "@mui/material";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import { format } from "date-fns";
import toast from "react-hot-toast";
import { useAuth } from "@/contexts/AuthContext";
import api from "@/lib/api";

interface SchedulingDetail {
  scheduled_by: string;
  scheduled_at: string;
  delivery_qty: number;
  delivery_depot_id: string;
  delivery_depot_name: string;
}

interface SchedulingItem {
  item_id: string;
  sku: string;
  dp_price: number;
  order_qty: number;
  scheduled_qty: number;
  unscheduled_qty: number;
  scheduling_details: SchedulingDetail[];
}

interface Scheduling {
  scheduling_id: string;
  current_status: string;
  status_date: string;
  status_comments: string;
  items: SchedulingItem[];
}

interface Order {
  order_id: string;
  order_number: string;
  order_date: string;
  distributor_name: string;
  distributor_erp_id: string;
  schedulings: Scheduling[];
}

const ApprovedSchedulingsPage = () => {
  const { user, loading: authLoading } = useAuth();
  const [statusFilter, setStatusFilter] = useState<"Approved" | "Rejected">("Approved");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<Order[]>([]);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  useEffect(() => {
    if (!authLoading && user) {
      fetchData();
    }
  }, [statusFilter, fromDate, toDate, page, limit, user, authLoading]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        status: statusFilter,
        page: page.toString(),
        limit: limit.toString(),
      });

      if (fromDate) params.append("from_date", fromDate);
      if (toDate) params.append("to_date", toDate);

      const response = await api.get(
        `/ordermanagement/schedulings/approved-rejected?${params.toString()}`
      );

      if (response.data.success) {
        setData(response.data.data);
        setTotalPages(response.data.pagination.totalPages);
        setTotalCount(response.data.pagination.total);
      } else {
        toast.error(response.data.message || "Failed to fetch data");
      }
    } catch (error) {
      console.error("Error fetching approved schedulings:", error);
      toast.error("Failed to fetch approved schedulings");
    } finally {
      setLoading(false);
    }
  };

  const handlePageChange = (_event: React.ChangeEvent<unknown>, value: number) => {
    setPage(value);
  };

  const formatDate = (dateString: string) => {
    return format(new Date(dateString), "dd/MM/yyyy");
  };

  const formatDateTime = (dateString: string) => {
    return format(new Date(dateString), "dd/MM/yyyy HH:mm");
  };

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        Approved Schedule List
      </Typography>

      {/* Filters */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Box sx={{ display: "flex", gap: 2, flexWrap: "wrap", alignItems: "center" }}>
          {/* Status Filter */}
          <FormControl component="fieldset">
            <RadioGroup
              row
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value as "Approved" | "Rejected");
                setPage(1);
              }}
            >
              <FormControlLabel value="Approved" control={<Radio />} label="Approved" />
              <FormControlLabel value="Rejected" control={<Radio />} label="Rejected" />
            </RadioGroup>
          </FormControl>

          {/* Date Pickers */}
          <TextField
            label="From Date"
            type="date"
            value={fromDate}
            onChange={(e) => {
              setFromDate(e.target.value);
              setPage(1);
            }}
            InputLabelProps={{ shrink: true }}
            size="small"
          />

          <TextField
            label="To Date"
            type="date"
            value={toDate}
            onChange={(e) => {
              setToDate(e.target.value);
              setPage(1);
            }}
            InputLabelProps={{ shrink: true }}
            size="small"
          />

          {/* Pagination Limit */}
          <FormControl size="small" sx={{ minWidth: 120 }}>
            <InputLabel>Records</InputLabel>
            <Select
              value={limit}
              label="Records"
              onChange={(e) => {
                setLimit(Number(e.target.value));
                setPage(1);
              }}
            >
              <MenuItem value={20}>20</MenuItem>
              <MenuItem value={40}>40</MenuItem>
              <MenuItem value={60}>60</MenuItem>
              <MenuItem value={80}>80</MenuItem>
              <MenuItem value={100}>100</MenuItem>
            </Select>
          </FormControl>

          {/* Total Count */}
          <Typography variant="body2" color="text.secondary">
            Total: {totalCount} records
          </Typography>
        </Box>
      </Paper>

      {/* Loading State */}
      {loading && (
        <Box sx={{ display: "flex", justifyContent: "center", my: 4 }}>
          <CircularProgress />
        </Box>
      )}

      {/* No Data */}
      {!loading && data.length === 0 && (
        <Alert severity="info">No {statusFilter.toLowerCase()} schedulings found</Alert>
      )}

      {/* Data Display */}
      {!loading && data.length > 0 && (
        <>
          {data.map((order) => (
            <Accordion key={order.order_number} sx={{ mb: 2 }}>
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Box sx={{ display: "flex", flexDirection: "column", width: "100%" }}>
                  <Typography variant="h6">DO: {order.order_number}</Typography>
                  <Typography variant="body2" color="text.secondary">
                    Order Date: {formatDate(order.order_date)} | Distributor: {order.distributor_name} (
                    {order.distributor_erp_id})
                  </Typography>
                </Box>
              </AccordionSummary>
              <AccordionDetails>
                {order.schedulings.map((scheduling) => (
                  <Box key={scheduling.scheduling_id} mb={3}>
                    {/* Scheduling Status Info */}
                    <Paper sx={{ p: 2, mb: 2, bgcolor: scheduling.current_status === "Approved" ? "success.50" : "error.50" }}>
                      <Typography variant="subtitle2">
                        <strong>Status:</strong> {scheduling.current_status} on {formatDateTime(scheduling.status_date)}
                      </Typography>
                      {scheduling.status_comments && (
                        <Typography variant="body2" color="text.secondary">
                          <strong>Comments:</strong> {scheduling.status_comments}
                        </Typography>
                      )}
                    </Paper>

                    {/* Items Table */}
                    <TableContainer component={Paper} variant="outlined">
                      <Table size="small">
                        <TableHead>
                          <TableRow>
                            <TableCell><strong>SKU</strong></TableCell>
                            <TableCell align="right"><strong>DP Price</strong></TableCell>
                            <TableCell align="right"><strong>Order Qty</strong></TableCell>
                            <TableCell align="right"><strong>Scheduled Qty</strong></TableCell>
                            <TableCell align="right"><strong>Unscheduled Qty</strong></TableCell>
                            <TableCell><strong>Delivery Details</strong></TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {scheduling.items.map((item) => (
                            <TableRow key={item.item_id}>
                              <TableCell>{item.sku}</TableCell>
                              <TableCell align="right">{item.dp_price.toFixed(2)}</TableCell>
                              <TableCell align="right">{item.order_qty}</TableCell>
                              <TableCell align="right">{item.scheduled_qty}</TableCell>
                              <TableCell align="right">{item.unscheduled_qty}</TableCell>
                              <TableCell>
                                {item.scheduling_details.map((detail, idx) => (
                                  <Box key={idx} sx={{ mb: 1 }}>
                                    <Typography variant="caption" display="block">
                                      <strong>Qty:</strong> {detail.delivery_qty} | <strong>Depot:</strong>{" "}
                                      {detail.delivery_depot_name}
                                    </Typography>
                                    <Typography variant="caption" color="text.secondary" display="block">
                                      Scheduled: {formatDateTime(detail.scheduled_at)}
                                    </Typography>
                                  </Box>
                                ))}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </TableContainer>
                  </Box>
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
    </Box>
  );
};

export default ApprovedSchedulingsPage;
