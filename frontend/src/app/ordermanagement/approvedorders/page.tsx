"use client";

import { useState, useEffect } from "react";
import {
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Typography,
  Box,
  Radio,
  RadioGroup,
  FormControlLabel,
  FormControl,
  FormLabel,
  TextField,
  Select,
  MenuItem,
  Pagination,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
} from "@mui/material";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import api from "@/lib/api";
import { formatDateForDisplay } from "@/lib/dateUtils";

// TypeScript interfaces
interface ApprovalInfo {
  action: string;
  timestamp: string;
  performed_by_role: string;
  comments?: string;
}

interface OrderItem {
  sku: string;
  product_name: string;
  source_type: string;
  unit_price: number;
  quantity: number;
  subtotal: number;
  discount_applied: number;
  final_amount: number;
}

interface Order {
  order_number: string;
  order_date: string;
  status: string;
  distributor_name: string;
  distributor_code: string;
  territory_name: string;
  total_amount: number;
  item_count: number;
  approval_info: ApprovalInfo | null;
  items: OrderItem[];
}

interface PaginationInfo {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export default function ApprovedOrdersPage() {
  const [user, setUser] = useState<any>(null);
  const [authLoading, setAuthLoading] = useState<boolean>(true);
  const [statusFilter, setStatusFilter] = useState<"approved" | "rejected">("approved");
  const [fromDate, setFromDate] = useState<string>("");
  const [toDate, setToDate] = useState<string>("");
  const [page, setPage] = useState<number>(1);
  const [limit, setLimit] = useState<number>(20);
  const [data, setData] = useState<Order[]>([]);
  const [pagination, setPagination] = useState<PaginationInfo>({
    total: 0,
    page: 1,
    limit: 20,
    totalPages: 0,
  });
  const [loading, setLoading] = useState<boolean>(false);

  // Check authentication
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const response = await api.get("/auth/me");
        if (response.data) {
          setUser(response.data);
        }
      } catch (error) {
        console.error("Auth check failed:", error);
      } finally {
        setAuthLoading(false);
      }
    };
    checkAuth();
  }, []);

  const fetchData = async () => {
    if (!user) return;

    setLoading(true);
    try {
      const params: Record<string, string | number> = {
        status: statusFilter,
        page,
        limit,
      };

      if (fromDate) params.from_date = fromDate;
      if (toDate) params.to_date = toDate;

      const response = await api.get("/ordermanagement/demandorders/approved-rejected", {
        params,
      });

      if (response.data.success) {
        setData(response.data.data);
        setPagination(response.data.pagination);
      }
    } catch (error) {
      console.error("Error fetching approved/rejected orders:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!authLoading && user) {
      fetchData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter, fromDate, toDate, page, limit, user, authLoading]);

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case "approved":
        return "success";
      case "rejected":
        return "error";
      default:
        return "default";
    }
  };

  if (authLoading) {
    return <Typography>Loading...</Typography>;
  }

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        Approved Orders
      </Typography>

      {/* Filters Section */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Box sx={{ display: "flex", gap: 3, flexWrap: "wrap", alignItems: "flex-end" }}>
          {/* Status Filter */}
          <FormControl>
            <FormLabel>Status</FormLabel>
            <RadioGroup
              row
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value as "approved" | "rejected");
                setPage(1);
              }}
            >
              <FormControlLabel value="approved" control={<Radio />} label="Approved" />
              <FormControlLabel value="rejected" control={<Radio />} label="Rejected" />
            </RadioGroup>
          </FormControl>

          {/* Date Range */}
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
            <FormLabel>Items per page</FormLabel>
            <Select
              value={limit}
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
        </Box>
      </Paper>

      {/* Results Section */}
      {loading ? (
        <Typography>Loading...</Typography>
      ) : data.length === 0 ? (
        <Typography>No {statusFilter} orders found.</Typography>
      ) : (
        <>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Showing {data.length} of {pagination.total} orders
          </Typography>

          {/* Orders Accordion */}
          {data.map((order, index) => (
            <Accordion key={index} sx={{ mb: 1 }}>
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Box sx={{ display: "flex", alignItems: "center", gap: 2, width: "100%" }}>
                  <Typography variant="subtitle1" fontWeight="bold">
                    DO: {order.order_number}
                  </Typography>
                  <Chip
                    label={order.status.toUpperCase()}
                    color={getStatusColor(order.status)}
                    size="small"
                  />
                  <Typography variant="body2" color="text.secondary">
                    {formatDateForDisplay(order.order_date)}
                  </Typography>
                  <Typography variant="body2" sx={{ ml: "auto" }}>
                    ₹{order.total_amount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                  </Typography>
                </Box>
              </AccordionSummary>

              <AccordionDetails>
                {/* Order Info */}
                <Box sx={{ mb: 2 }}>
                  <Typography variant="body2">
                    <strong>Distributor:</strong> {order.distributor_name} ({order.distributor_code})
                  </Typography>
                  <Typography variant="body2">
                    <strong>Territory:</strong> {order.territory_name}
                  </Typography>
                  <Typography variant="body2">
                    <strong>Items:</strong> {order.item_count}
                  </Typography>
                </Box>

                {/* Approval Info */}
                {order.approval_info && (
                  <Paper
                    sx={{
                      p: 2,
                      mb: 2,
                      backgroundColor:
                        order.approval_info.action === "approve"
                          ? "rgba(76, 175, 80, 0.1)"
                          : "rgba(244, 67, 54, 0.1)",
                    }}
                  >
                    <Typography variant="subtitle2" gutterBottom>
                      {order.approval_info.action === "approve" ? "Approved" : "Rejected"} by{" "}
                      {order.approval_info.performed_by_role}
                    </Typography>
                    <Typography variant="body2">
                      <strong>Date:</strong>{" "}
                      {formatDateForDisplay(order.approval_info.timestamp)}
                    </Typography>
                    {order.approval_info.comments && (
                      <Typography variant="body2">
                        <strong>Comments:</strong> {order.approval_info.comments}
                      </Typography>
                    )}
                  </Paper>
                )}

                {/* Items Table */}
                <TableContainer component={Paper} variant="outlined">
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>SKU</TableCell>
                        <TableCell>Product Name</TableCell>
                        <TableCell>Source</TableCell>
                        <TableCell align="right">Unit Price</TableCell>
                        <TableCell align="right">Quantity</TableCell>
                        <TableCell align="right">Subtotal</TableCell>
                        <TableCell align="right">Discount</TableCell>
                        <TableCell align="right">Final Amount</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {order.items.map((item, idx) => (
                        <TableRow key={idx}>
                          <TableCell>{item.sku}</TableCell>
                          <TableCell>{item.product_name}</TableCell>
                          <TableCell>
                            <Chip
                              label={item.source_type}
                              size="small"
                              color={item.source_type === "product" ? "primary" : "secondary"}
                            />
                          </TableCell>
                          <TableCell align="right">
                            ₹{item.unit_price.toFixed(2)}
                          </TableCell>
                          <TableCell align="right">{item.quantity}</TableCell>
                          <TableCell align="right">
                            ₹{item.subtotal.toFixed(2)}
                          </TableCell>
                          <TableCell align="right">
                            ₹{item.discount_applied.toFixed(2)}
                          </TableCell>
                          <TableCell align="right" sx={{ fontWeight: "bold" }}>
                            ₹{item.final_amount.toFixed(2)}
                          </TableCell>
                        </TableRow>
                      ))}
                      <TableRow>
                        <TableCell colSpan={7} align="right" sx={{ fontWeight: "bold" }}>
                          Total:
                        </TableCell>
                        <TableCell align="right" sx={{ fontWeight: "bold", fontSize: "1rem" }}>
                          ₹{order.total_amount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                        </TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </TableContainer>
              </AccordionDetails>
            </Accordion>
          ))}

          {/* Pagination */}
          {pagination.totalPages > 1 && (
            <Box sx={{ display: "flex", justifyContent: "center", mt: 3 }}>
              <Pagination
                count={pagination.totalPages}
                page={pagination.page}
                onChange={(event, value) => setPage(value)}
                color="primary"
              />
            </Box>
          )}
        </>
      )}
    </Box>
  );
}
