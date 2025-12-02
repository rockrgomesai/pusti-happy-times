"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Box,
  Card,
  CardContent,
  Typography,
  TextField,
  Grid,
  Alert,
  CircularProgress,
  Stack,
  Paper,
  InputAdornment,
  IconButton,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  FormControlLabel,
  Switch,
  Button,
} from "@mui/material";
import {
  Inventory,
  Search,
  Clear,
  Warning,
  TrendingDown,
  CheckCircle,
} from "@mui/icons-material";
import { useAuth } from "@/contexts/AuthContext";
import axiosInstance from "@/lib/api";
import { format } from "date-fns";

interface StockItem {
  _id: string;
  sku: string;
  qty: number;
  last_received_at: string;
  last_chalan_id: {
    chalan_number: string;
    delivery_date: string;
  } | null;
}

interface StockSummary {
  total_skus: number;
  total_qty: number;
  low_stock_count: number;
}

interface PaginationData {
  page: number;
  limit: number;
  total: number;
  pages: number;
}

export default function DistributorStockPage() {
  const router = useRouter();
  const { user } = useAuth();

  const [stock, setStock] = useState<StockItem[]>([]);
  const [summary, setSummary] = useState<StockSummary>({
    total_skus: 0,
    total_qty: 0,
    low_stock_count: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [pagination, setPagination] = useState<PaginationData>({
    page: 1,
    limit: 20,
    total: 0,
    pages: 0,
  });

  // Filters
  const [searchTerm, setSearchTerm] = useState("");
  const [lowStockOnly, setLowStockOnly] = useState(false);
  const [debouncedSearch, setDebouncedSearch] = useState("");

  // Check distributor association
  useEffect(() => {
    if (user && !user.distributor_id) {
      setError("You are not associated with any distributor");
      setLoading(false);
    }
  }, [user]);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchTerm);
    }, 500);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Fetch stock
  const fetchStock = async () => {
    if (!user?.distributor_id) return;

    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: pagination.page.toString(),
        limit: pagination.limit.toString(),
      });

      if (debouncedSearch) params.append("search", debouncedSearch);
      if (lowStockOnly) params.append("low_stock_only", "true");

      const response = await axiosInstance.get(`/distributor/stock?${params.toString()}`);

      if (response.data.success) {
        setStock(response.data.data.stock);
        setSummary(response.data.data.summary);
        setPagination(response.data.data.pagination);
        setError("");
      }
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to fetch stock");
      console.error("Fetch stock error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStock();
  }, [pagination.page, debouncedSearch, lowStockOnly]);

  const handleClearFilters = () => {
    setSearchTerm("");
    setLowStockOnly(false);
    setPagination((prev) => ({ ...prev, page: 1 }));
  };

  // Get stock level indicator
  const getStockLevel = (qty: number) => {
    if (qty < 20) return { color: "error", label: "Critical", icon: <Warning /> };
    if (qty < 50) return { color: "warning", label: "Low", icon: <TrendingDown /> };
    return { color: "success", label: "Good", icon: <CheckCircle /> };
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

  return (
    <Box sx={{ p: { xs: 2, sm: 3 } }}>
      {/* Header */}
      <Paper elevation={0} sx={{ p: 2, mb: 3, bgcolor: "primary.main", color: "white" }}>
        <Stack direction="row" alignItems="center" spacing={2}>
          <Inventory sx={{ fontSize: 32 }} />
          <Box>
            <Typography variant="h5" fontWeight="bold">
              My Stock
            </Typography>
            <Typography variant="body2" sx={{ opacity: 0.9 }}>
              Current distributor inventory
            </Typography>
          </Box>
        </Stack>
      </Paper>

      {/* Summary Cards */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={4}>
          <Card>
            <CardContent>
              <Stack direction="row" alignItems="center" justifyContent="space-between">
                <Box>
                  <Typography variant="body2" color="text.secondary">
                    Total SKUs
                  </Typography>
                  <Typography variant="h4" fontWeight="bold" color="primary">
                    {summary.total_skus}
                  </Typography>
                </Box>
                <Inventory sx={{ fontSize: 48, color: "primary.main", opacity: 0.3 }} />
              </Stack>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={4}>
          <Card>
            <CardContent>
              <Stack direction="row" alignItems="center" justifyContent="space-between">
                <Box>
                  <Typography variant="body2" color="text.secondary">
                    Total Quantity
                  </Typography>
                  <Typography variant="h4" fontWeight="bold" color="success.main">
                    {summary.total_qty.toFixed(2)}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    CTN
                  </Typography>
                </Box>
                <CheckCircle sx={{ fontSize: 48, color: "success.main", opacity: 0.3 }} />
              </Stack>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={4}>
          <Card>
            <CardContent>
              <Stack direction="row" alignItems="center" justifyContent="space-between">
                <Box>
                  <Typography variant="body2" color="text.secondary">
                    Low Stock Items
                  </Typography>
                  <Typography variant="h4" fontWeight="bold" color="warning.main">
                    {summary.low_stock_count}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    &lt; 50 CTN
                  </Typography>
                </Box>
                <Warning sx={{ fontSize: 48, color: "warning.main", opacity: 0.3 }} />
              </Stack>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Filters */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Grid container spacing={2} alignItems="center">
            {/* Search */}
            <Grid item xs={12} sm={6} md={5}>
              <TextField
                fullWidth
                size="small"
                label="Search SKU"
                placeholder="Enter SKU code"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <Search />
                    </InputAdornment>
                  ),
                  endAdornment: searchTerm && (
                    <InputAdornment position="end">
                      <IconButton size="small" onClick={() => setSearchTerm("")}>
                        <Clear />
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
              />
            </Grid>

            {/* Low Stock Only */}
            <Grid item xs={12} sm={4} md={4}>
              <FormControlLabel
                control={
                  <Switch
                    checked={lowStockOnly}
                    onChange={(e) => setLowStockOnly(e.target.checked)}
                    color="warning"
                  />
                }
                label={
                  <Stack direction="row" alignItems="center" spacing={1}>
                    <Warning fontSize="small" />
                    <Typography variant="body2">Show Low Stock Only</Typography>
                  </Stack>
                }
              />
            </Grid>

            {/* Clear Filters */}
            <Grid item xs={12} sm={2} md={3}>
              <Button
                fullWidth
                variant="outlined"
                startIcon={<Clear />}
                onClick={handleClearFilters}
                sx={{ height: "40px" }}
              >
                Clear
              </Button>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Error Alert */}
      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError("")}>
          {error}
        </Alert>
      )}

      {/* Loading */}
      {loading && (
        <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
          <CircularProgress />
        </Box>
      )}

      {/* Empty State */}
      {!loading && stock.length === 0 && (
        <Paper sx={{ p: 4, textAlign: "center" }}>
          <Inventory sx={{ fontSize: 64, color: "text.secondary", mb: 2 }} />
          <Typography variant="h6" color="text.secondary" gutterBottom>
            No Stock Items Found
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {lowStockOnly
              ? "No low stock items at the moment"
              : "Start receiving chalans to build your inventory"}
          </Typography>
        </Paper>
      )}

      {/* Stock Table */}
      {!loading && stock.length > 0 && (
        <>
          <Card>
            <CardContent>
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>
                        <strong>SKU</strong>
                      </TableCell>
                      <TableCell align="right">
                        <strong>Quantity</strong>
                      </TableCell>
                      <TableCell>
                        <strong>Status</strong>
                      </TableCell>
                      <TableCell>
                        <strong>Last Received</strong>
                      </TableCell>
                      <TableCell>
                        <strong>Last Chalan</strong>
                      </TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {stock.map((item) => {
                      const stockLevel = getStockLevel(item.qty);
                      return (
                        <TableRow
                          key={item._id}
                          sx={{
                            bgcolor:
                              item.qty < 20
                                ? "error.50"
                                : item.qty < 50
                                ? "warning.50"
                                : "inherit",
                          }}
                        >
                          <TableCell>
                            <Typography variant="body1" fontWeight="bold">
                              {item.sku}
                            </Typography>
                          </TableCell>
                          <TableCell align="right">
                            <Typography
                              variant="body1"
                              fontWeight="bold"
                              color={item.qty < 20 ? "error" : item.qty < 50 ? "warning.dark" : "text.primary"}
                            >
                              {item.qty.toFixed(2)} CTN
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Chip
                              size="small"
                              icon={stockLevel.icon}
                              label={stockLevel.label}
                              color={stockLevel.color as any}
                            />
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2" color="text.secondary">
                              {format(new Date(item.last_received_at), "dd MMM yyyy")}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            {item.last_chalan_id ? (
                              <Typography
                                variant="body2"
                                color="primary"
                                sx={{ cursor: "pointer" }}
                                onClick={() =>
                                  router.push(`/distributor/history?chalan=${item.last_chalan_id?.chalan_number}`)
                                }
                              >
                                {item.last_chalan_id.chalan_number}
                              </Typography>
                            ) : (
                              <Typography variant="body2" color="text.secondary">
                                -
                              </Typography>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </TableContainer>
            </CardContent>
          </Card>

          {/* Pagination */}
          {pagination.pages > 1 && (
            <Box sx={{ display: "flex", justifyContent: "center", mt: 3, gap: 2 }}>
              <Button
                variant="outlined"
                disabled={pagination.page === 1}
                onClick={() => setPagination((prev) => ({ ...prev, page: prev.page - 1 }))}
              >
                Previous
              </Button>
              <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                <Typography>
                  Page {pagination.page} of {pagination.pages}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  ({pagination.total} items)
                </Typography>
              </Box>
              <Button
                variant="outlined"
                disabled={pagination.page === pagination.pages}
                onClick={() => setPagination((prev) => ({ ...prev, page: prev.page + 1 }))}
              >
                Next
              </Button>
            </Box>
          )}
        </>
      )}
    </Box>
  );
}
