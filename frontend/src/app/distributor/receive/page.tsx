"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
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
  Chip,
  Stack,
  Paper,
  InputAdornment,
  IconButton,
} from "@mui/material";
import {
  LocalShipping,
  Search,
  Clear,
  CalendarToday,
  Inventory,
} from "@mui/icons-material";
import { useAuth } from "@/contexts/AuthContext";
import axiosInstance from "@/lib/api";
import { format } from "date-fns";

interface ChalanItem {
  sku: string;
  qty_ctn: number;
  qty_pcs: number;
}

interface Chalan {
  _id: string;
  chalan_no: string;
  load_sheet_id?: {
    load_sheet_number?: string;
  };
  chalan_date: string;
  delivery_date?: string;
  vehicle_no: string;
  driver_name: string;
  depot_id: {
    _id: string;
    facility_name?: string;
  };
  items: ChalanItem[];
  total_qty_ctn: number;
  total_qty_pcs: number;
  status: string;
}

interface PaginationData {
  page: number;
  limit: number;
  total: number;
  pages: number;
}

export default function ReceiveChalanListPage() {
  const router = useRouter();
  const { user } = useAuth();

  const [chalans, setChalans] = useState<Chalan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [pagination, setPagination] = useState<PaginationData>({
    page: 1,
    limit: 10,
    total: 0,
    pages: 0,
  });

  // Filters
  const [searchTerm, setSearchTerm] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
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

  // Fetch chalans
  const fetchChalans = async () => {
    if (!user?.distributor_id) return;

    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: pagination.page.toString(),
        limit: pagination.limit.toString(),
      });

      if (debouncedSearch) params.append("search", debouncedSearch);
      if (dateFrom) params.append("date_from", dateFrom);
      if (dateTo) params.append("date_to", dateTo);

      const response = await axiosInstance.get(
        `/distributor/chalans/receive-list?${params.toString()}`
      );

      console.log("Chalans response:", response.data);

      // Response structure: response.data = { success: true, data: { chalans: [...], pagination: {...} } }
      if (response.data.success && response.data.data) {
        setChalans(response.data.data.chalans || []);
        setPagination(response.data.data.pagination || pagination);
        setError("");
      } else {
        setError("Failed to fetch chalans");
      }
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || "Failed to fetch chalans");
      console.error("Fetch chalans error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchChalans();
  }, [pagination.page, debouncedSearch, dateFrom, dateTo]);

  const handleClearFilters = () => {
    setSearchTerm("");
    setDateFrom("");
    setDateTo("");
    setPagination((prev) => ({ ...prev, page: 1 }));
  };

  const handleReceiveClick = (chalanId: string) => {
    router.push(`/distributor/receive/${chalanId}`);
  };

  const getTotalItems = (items: ChalanItem[]) => items?.length || 0;

  const getTotalQty = (items: ChalanItem[]) => {
    if (!items || !Array.isArray(items)) return 0;
    return items.reduce((sum, item) => {
      const qty = Number(item.qty_ctn) || 0;
      return sum + qty;
    }, 0);
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
          <LocalShipping sx={{ fontSize: 32 }} />
          <Box>
            <Typography variant="h5" fontWeight="bold">
              Receive Chalans
            </Typography>
            <Typography variant="body2" sx={{ opacity: 0.9 }}>
              Confirm receipt of goods from depot
            </Typography>
          </Box>
        </Stack>
      </Paper>

      {/* Filters */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Grid container spacing={2}>
            {/* Search */}
            <Grid item xs={12} sm={6} md={4}>
              <TextField
                fullWidth
                size="small"
                label="Search"
                placeholder="Chalan or Load Sheet #"
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

            {/* Date From */}
            <Grid item xs={12} sm={6} md={3}>
              <TextField
                fullWidth
                size="small"
                type="date"
                label="From Date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                InputLabelProps={{ shrink: true }}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <CalendarToday fontSize="small" />
                    </InputAdornment>
                  ),
                }}
              />
            </Grid>

            {/* Date To */}
            <Grid item xs={12} sm={6} md={3}>
              <TextField
                fullWidth
                size="small"
                type="date"
                label="To Date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                InputLabelProps={{ shrink: true }}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <CalendarToday fontSize="small" />
                    </InputAdornment>
                  ),
                }}
              />
            </Grid>

            {/* Clear Filters */}
            <Grid item xs={12} sm={6} md={2}>
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

      {/* Chalans List */}
      {!loading && chalans.length === 0 && (
        <Paper sx={{ p: 4, textAlign: "center" }}>
          <Inventory sx={{ fontSize: 64, color: "text.secondary", mb: 2 }} />
          <Typography variant="h6" color="text.secondary" gutterBottom>
            No Chalans Pending Receipt
          </Typography>
          <Typography variant="body2" color="text.secondary">
            All chalans have been received or no deliveries yet
          </Typography>
        </Paper>
      )}

      {!loading && chalans.length > 0 && (
        <>
          <Grid container spacing={2}>
            {chalans.map((chalan) => (
              <Grid item xs={12} key={chalan._id}>
                <Card>
                  <CardContent>
                    <Grid container spacing={2}>
                      {/* Chalan Info */}
                      <Grid item xs={12} md={7}>
                        <Stack spacing={1}>
                          <Box>
                            <Typography variant="h6" fontWeight="bold" color="primary">
                              {chalan.chalan_no}
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                              Load Sheet: {chalan.load_sheet_id?.load_sheet_number || "N/A"}
                            </Typography>
                          </Box>

                          <Stack direction="row" spacing={2} flexWrap="wrap" useFlexGap>
                            {chalan.delivery_date && (
                              <Chip
                                size="small"
                                icon={<CalendarToday />}
                                label={format(new Date(chalan.delivery_date), "dd MMM yyyy")}
                              />
                            )}
                            <Chip
                              size="small"
                              label={`From: ${chalan.depot_id?.facility_name || "N/A"}`}
                              variant="outlined"
                            />
                          </Stack>

                          <Typography variant="body2" color="text.secondary">
                            Vehicle: {chalan.vehicle_no} | Driver: {chalan.driver_name}
                          </Typography>
                        </Stack>
                      </Grid>

                      {/* Quantities */}
                      <Grid item xs={12} md={3}>
                        <Stack spacing={1}>
                          <Box>
                            <Typography variant="body2" color="text.secondary">
                              Total Items
                            </Typography>
                            <Typography variant="h6" fontWeight="bold">
                              {getTotalItems(chalan.items)} SKUs
                            </Typography>
                          </Box>
                          <Box>
                            <Typography variant="body2" color="text.secondary">
                              Total Quantity
                            </Typography>
                            <Typography variant="h6" fontWeight="bold">
                              {getTotalQty(chalan.items).toFixed(2)} CTN
                            </Typography>
                          </Box>
                        </Stack>
                      </Grid>

                      {/* Action */}
                      <Grid item xs={12} md={2}>
                        <Button
                          fullWidth
                          variant="contained"
                          startIcon={<LocalShipping />}
                          onClick={() => handleReceiveClick(chalan._id)}
                          sx={{ height: { md: "100%" } }}
                        >
                          Receive
                        </Button>
                      </Grid>
                    </Grid>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>

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
                  ({pagination.total} total)
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
