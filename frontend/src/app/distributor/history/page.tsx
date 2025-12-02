"use client";

import React, { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
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
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  Button,
} from "@mui/material";
import {
  History,
  CalendarToday,
  Clear,
  ExpandMore,
  CheckCircle,
  Warning,
  Inventory,
} from "@mui/icons-material";
import { useAuth } from '@/contexts/AuthContext';
import axiosInstance from "@/lib/api";
import { format } from "date-fns";

interface ReceivedItemDetail {
  sku: string;
  delivered_qty: number;
  received_qty: number;
  variance_qty: number;
  variance_reason: string;
}

interface ReceivedChalan {
  _id: string;
  chalan_number: string;
  load_sheet_number: string;
  delivery_date: string;
  received_at: string;
  received_by: {
    name: string;
  };
  depot_id: {
    facility_name: string;
  };
  vehicle_no: string;
  driver_name: string;
  received_items: ReceivedItemDetail[];
  total_qty_delivered: number;
}

interface PaginationData {
  page: number;
  limit: number;
  total: number;
  pages: number;
}

export default function ReceivedHistoryPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useAuth();

  const [chalans, setChalans] = useState<ReceivedChalan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [pagination, setPagination] = useState<PaginationData>({
    page: 1,
    limit: 10,
    total: 0,
    pages: 0,
  });

  // Filters
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [expandedChalan, setExpandedChalan] = useState<string | null>(
    searchParams.get("chalan") || null
  );

  // Check distributor association
  useEffect(() => {
    if (user && !user.distributor_id) {
      setError("You are not associated with any distributor");
      setLoading(false);
    }
  }, [user]);

  // Fetch received chalans
  const fetchReceivedChalans = async () => {
    if (!user?.distributor_id) return;

    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: pagination.page.toString(),
        limit: pagination.limit.toString(),
      });

      if (dateFrom) params.append("date_from", dateFrom);
      if (dateTo) params.append("date_to", dateTo);

      const response = await axiosInstance.get(
        `/distributor/chalans/received-history?${params.toString()}`
      );

      if (response.data.success) {
        setChalans(response.data.data.chalans);
        setPagination(response.data.data.pagination);
        setError("");
      }
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to fetch received chalans");
      console.error("Fetch received chalans error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReceivedChalans();
  }, [pagination.page, dateFrom, dateTo]);

  const handleClearFilters = () => {
    setDateFrom("");
    setDateTo("");
    setPagination((prev) => ({ ...prev, page: 1 }));
  };

  const getVarianceCount = (items: ReceivedItemDetail[]) =>
    items.filter((item) => item.variance_qty > 0).length;

  const getTotalVariance = (items: ReceivedItemDetail[]) =>
    items.reduce((sum, item) => sum + item.variance_qty, 0);

  const getTotalReceived = (items: ReceivedItemDetail[]) =>
    items.reduce((sum, item) => sum + item.received_qty, 0);

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
          <History sx={{ fontSize: 32 }} />
          <Box>
            <Typography variant="h5" fontWeight="bold">
              Received History
            </Typography>
            <Typography variant="body2" sx={{ opacity: 0.9 }}>
              Previously received chalans
            </Typography>
          </Box>
        </Stack>
      </Paper>

      {/* Filters */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Grid container spacing={2}>
            {/* Date From */}
            <Grid item xs={12} sm={5}>
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
            <Grid item xs={12} sm={5}>
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
            <Grid item xs={12} sm={2}>
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
      {!loading && chalans.length === 0 && (
        <Paper sx={{ p: 4, textAlign: "center" }}>
          <Inventory sx={{ fontSize: 64, color: "text.secondary", mb: 2 }} />
          <Typography variant="h6" color="text.secondary" gutterBottom>
            No Received Chalans Found
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {dateFrom || dateTo
              ? "Try adjusting your date filters"
              : "Start receiving chalans to see history"}
          </Typography>
        </Paper>
      )}

      {/* Received Chalans List */}
      {!loading && chalans.length > 0 && (
        <>
          <Stack spacing={2}>
            {chalans.map((chalan) => {
              const varianceCount = getVarianceCount(chalan.received_items);
              const totalVariance = getTotalVariance(chalan.received_items);
              const totalReceived = getTotalReceived(chalan.received_items);

              return (
                <Accordion
                  key={chalan._id}
                  expanded={expandedChalan === chalan.chalan_number}
                  onChange={() =>
                    setExpandedChalan(
                      expandedChalan === chalan.chalan_number ? null : chalan.chalan_number
                    )
                  }
                >
                  <AccordionSummary expandIcon={<ExpandMore />}>
                    <Grid container spacing={2} alignItems="center">
                      {/* Chalan Info */}
                      <Grid item xs={12} md={5}>
                        <Stack spacing={0.5}>
                          <Typography variant="h6" fontWeight="bold" color="primary">
                            {chalan.chalan_number}
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            From: {chalan.depot_id.facility_name}
                          </Typography>
                          <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                            <Chip
                              size="small"
                              icon={<CalendarToday />}
                              label={`Received: ${format(new Date(chalan.received_at), "dd MMM yyyy")}`}
                            />
                            {varianceCount > 0 && (
                              <Chip
                                size="small"
                                icon={<Warning />}
                                label={`${varianceCount} variances`}
                                color="warning"
                              />
                            )}
                          </Stack>
                        </Stack>
                      </Grid>

                      {/* Quantities */}
                      <Grid item xs={12} md={4}>
                        <Grid container spacing={2}>
                          <Grid item xs={6}>
                            <Typography variant="body2" color="text.secondary">
                              Total Received
                            </Typography>
                            <Typography variant="h6" fontWeight="bold" color="success.main">
                              {totalReceived.toFixed(2)} CTN
                            </Typography>
                          </Grid>
                          <Grid item xs={6}>
                            <Typography variant="body2" color="text.secondary">
                              Total Variance
                            </Typography>
                            <Typography
                              variant="h6"
                              fontWeight="bold"
                              color={totalVariance > 0 ? "warning.main" : "text.secondary"}
                            >
                              {totalVariance.toFixed(2)} CTN
                            </Typography>
                          </Grid>
                        </Grid>
                      </Grid>

                      {/* Received By */}
                      <Grid item xs={12} md={3}>
                        <Typography variant="body2" color="text.secondary">
                          Received By
                        </Typography>
                        <Typography variant="body1" fontWeight="medium">
                          {chalan.received_by.name}
                        </Typography>
                      </Grid>
                    </Grid>
                  </AccordionSummary>

                  <AccordionDetails>
                    <Box sx={{ mt: 2 }}>
                      {/* Chalan Details */}
                      <Paper sx={{ p: 2, mb: 2, bgcolor: "grey.50" }}>
                        <Grid container spacing={2}>
                          <Grid item xs={6} sm={3}>
                            <Typography variant="body2" color="text.secondary">
                              Load Sheet
                            </Typography>
                            <Typography variant="body1" fontWeight="medium">
                              {chalan.load_sheet_number}
                            </Typography>
                          </Grid>
                          <Grid item xs={6} sm={3}>
                            <Typography variant="body2" color="text.secondary">
                              Delivery Date
                            </Typography>
                            <Typography variant="body1" fontWeight="medium">
                              {format(new Date(chalan.delivery_date), "dd MMM yyyy")}
                            </Typography>
                          </Grid>
                          <Grid item xs={6} sm={3}>
                            <Typography variant="body2" color="text.secondary">
                              Vehicle No
                            </Typography>
                            <Typography variant="body1" fontWeight="medium">
                              {chalan.vehicle_no}
                            </Typography>
                          </Grid>
                          <Grid item xs={6} sm={3}>
                            <Typography variant="body2" color="text.secondary">
                              Driver Name
                            </Typography>
                            <Typography variant="body1" fontWeight="medium">
                              {chalan.driver_name}
                            </Typography>
                          </Grid>
                        </Grid>
                      </Paper>

                      {/* Items Table */}
                      <TableContainer component={Paper}>
                        <Table size="small">
                          <TableHead>
                            <TableRow>
                              <TableCell>
                                <strong>SKU</strong>
                              </TableCell>
                              <TableCell align="right">
                                <strong>Delivered</strong>
                              </TableCell>
                              <TableCell align="right">
                                <strong>Received</strong>
                              </TableCell>
                              <TableCell align="right">
                                <strong>Variance</strong>
                              </TableCell>
                              <TableCell>
                                <strong>Reason</strong>
                              </TableCell>
                            </TableRow>
                          </TableHead>
                          <TableBody>
                            {chalan.received_items.map((item) => (
                              <TableRow
                                key={item.sku}
                                sx={{
                                  bgcolor:
                                    item.variance_qty === 0
                                      ? "success.50"
                                      : item.received_qty === 0
                                      ? "error.50"
                                      : "warning.50",
                                }}
                              >
                                <TableCell>
                                  <Typography variant="body2" fontWeight="bold">
                                    {item.sku}
                                  </Typography>
                                </TableCell>
                                <TableCell align="right">
                                  <Typography variant="body2">
                                    {item.delivered_qty.toFixed(2)} CTN
                                  </Typography>
                                </TableCell>
                                <TableCell align="right">
                                  <Typography variant="body2" fontWeight="medium">
                                    {item.received_qty.toFixed(2)} CTN
                                  </Typography>
                                </TableCell>
                                <TableCell align="right">
                                  <Stack
                                    direction="row"
                                    alignItems="center"
                                    justifyContent="flex-end"
                                    spacing={0.5}
                                  >
                                    {item.variance_qty > 0 ? (
                                      <Warning fontSize="small" color="warning" />
                                    ) : (
                                      <CheckCircle fontSize="small" color="success" />
                                    )}
                                    <Typography
                                      variant="body2"
                                      color={item.variance_qty > 0 ? "error" : "text.secondary"}
                                      fontWeight={item.variance_qty > 0 ? "bold" : "normal"}
                                    >
                                      {item.variance_qty.toFixed(2)} CTN
                                    </Typography>
                                  </Stack>
                                </TableCell>
                                <TableCell>
                                  <Typography variant="body2" color="text.secondary">
                                    {item.variance_reason || "-"}
                                  </Typography>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </TableContainer>
                    </Box>
                  </AccordionDetails>
                </Accordion>
              );
            })}
          </Stack>

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
