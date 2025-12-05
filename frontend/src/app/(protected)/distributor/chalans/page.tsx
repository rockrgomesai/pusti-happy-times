"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Box,
  Card,
  CardContent,
  Typography,
  Chip,
  TextField,
  InputAdornment,
  CircularProgress,
  IconButton,
  Stack,
  Button,
  Collapse,
  Fab,
} from "@mui/material";
import {
  Search,
  FilterList,
  LocalShipping,
  CalendarToday,
  ExpandMore,
  ExpandLess,
  Refresh,
} from "@mui/icons-material";
import { apiClient } from "@/lib/api";
import { toast } from "react-hot-toast";

interface Chalan {
  _id: string;
  chalan_no: string;
  chalan_date: string;
  depot_id: {
    _id: string;
    name: string;
  };
  transport_id: {
    _id: string;
    transport: string;
  };
  total_qty_ctn: number;
  total_qty_pcs: number;
  status: string;
  vehicle_no: string;
}

export default function DistributorChalansPage() {
  const router = useRouter();
  const [chalans, setChalans] = useState<Chalan[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [showFilters, setShowFilters] = useState(false);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  const fetchChalans = useCallback(
    async (pageNum: number = 1, append: boolean = false) => {
      try {
        if (!append) setLoading(true);

        const params: any = {
          page: pageNum,
          limit: 20,
        };

        if (statusFilter && statusFilter !== "all") {
          params.status = statusFilter;
        }

        if (search) {
          params.search = search;
        }

        if (dateFrom) {
          params.from_date = dateFrom;
        }

        if (dateTo) {
          params.to_date = dateTo;
        }

        const response: any = await apiClient.get("/distributor/chalans", { params });

        if (response.success) {
          const newChalans = response.data || [];
          
          if (append) {
            setChalans((prev) => [...prev, ...newChalans]);
          } else {
            setChalans(newChalans);
          }

          setHasMore(response.pagination?.page < response.pagination?.pages);
        }
      } catch (error: any) {
        console.error("Error fetching chalans:", error);
        toast.error(error.response?.data?.message || "Failed to load chalans");
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [statusFilter, search, dateFrom, dateTo]
  );

  useEffect(() => {
    fetchChalans(1, false);
  }, [fetchChalans]);

  const handleRefresh = () => {
    setRefreshing(true);
    setPage(1);
    fetchChalans(1, false);
  };

  const handleLoadMore = () => {
    const nextPage = page + 1;
    setPage(nextPage);
    fetchChalans(nextPage, true);
  };

  const handleStatusFilter = (status: string) => {
    setStatusFilter(status);
    setPage(1);
  };

  const handleSearch = (value: string) => {
    setSearch(value);
    setPage(1);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Generated":
        return "primary";
      case "Partially Received":
        return "warning";
      case "Received":
        return "success";
      default:
        return "default";
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  return (
    <Box sx={{ pb: 8, minHeight: "100vh", bgcolor: "grey.50" }}>
      {/* Header */}
      <Box
        sx={{
          position: "sticky",
          top: 0,
          zIndex: 10,
          bgcolor: "white",
          borderBottom: 1,
          borderColor: "divider",
          pb: 2,
        }}
      >
        <Box sx={{ p: 2 }}>
          <Typography variant="h5" fontWeight="bold" gutterBottom>
            Receive Chalans
          </Typography>

          {/* Search Bar */}
          <TextField
            fullWidth
            size="small"
            placeholder="Search by chalan number..."
            value={search}
            onChange={(e) => handleSearch(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <Search />
                </InputAdornment>
              ),
            }}
            sx={{ mb: 2 }}
          />

          {/* Status Filter Chips */}
          <Stack direction="row" spacing={1} sx={{ overflowX: "auto", pb: 1 }}>
            <Chip
              label="All"
              onClick={() => handleStatusFilter("all")}
              color={statusFilter === "all" ? "primary" : "default"}
              sx={{ minWidth: 60 }}
            />
            <Chip
              label="Generated"
              onClick={() => handleStatusFilter("Generated")}
              color={statusFilter === "Generated" ? "primary" : "default"}
              sx={{ minWidth: 100 }}
            />
            <Chip
              label="Partially Received"
              onClick={() => handleStatusFilter("Partially Received")}
              color={statusFilter === "Partially Received" ? "warning" : "default"}
              sx={{ minWidth: 150 }}
            />
            <Chip
              label="Received"
              onClick={() => handleStatusFilter("Received")}
              color={statusFilter === "Received" ? "success" : "default"}
              sx={{ minWidth: 90 }}
            />
          </Stack>
        </Box>

        {/* Date Filter Toggle */}
        <Box sx={{ px: 2 }}>
          <Button
            size="small"
            startIcon={<FilterList />}
            endIcon={showFilters ? <ExpandLess /> : <ExpandMore />}
            onClick={() => setShowFilters(!showFilters)}
            sx={{ mb: 1 }}
          >
            Date Filter
          </Button>

          <Collapse in={showFilters}>
            <Stack direction="row" spacing={1} sx={{ mb: 2 }}>
              <TextField
                type="date"
                label="From"
                size="small"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                InputLabelProps={{ shrink: true }}
                fullWidth
              />
              <TextField
                type="date"
                label="To"
                size="small"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                InputLabelProps={{ shrink: true }}
                fullWidth
              />
            </Stack>
          </Collapse>
        </Box>
      </Box>

      {/* Loading State */}
      {loading && page === 1 && (
        <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
          <CircularProgress />
        </Box>
      )}

      {/* Chalans List */}
      {!loading && chalans.length === 0 ? (
        <Box sx={{ textAlign: "center", py: 8 }}>
          <LocalShipping sx={{ fontSize: 80, color: "grey.300", mb: 2 }} />
          <Typography variant="h6" color="text.secondary">
            No chalans found
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Chalans sent to you will appear here
          </Typography>
        </Box>
      ) : (
        <Box sx={{ p: 2 }}>
          <Stack spacing={2}>
            {chalans.map((chalan) => (
              <Card
                key={chalan._id}
                onClick={() => router.push(`/distributor/chalans/${chalan._id}`)}
                sx={{
                  cursor: "pointer",
                  "&:active": {
                    transform: "scale(0.98)",
                  },
                  transition: "transform 0.1s",
                }}
              >
                <CardContent>
                  {/* Header Row */}
                  <Box
                    sx={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "flex-start",
                      mb: 2,
                    }}
                  >
                    <Box>
                      <Typography variant="h6" fontWeight="bold" gutterBottom>
                        {chalan.chalan_no}
                      </Typography>
                      <Typography variant="body2" color="text.secondary" gutterBottom>
                        <CalendarToday sx={{ fontSize: 14, mr: 0.5, verticalAlign: "middle" }} />
                        {formatDate(chalan.chalan_date)}
                      </Typography>
                    </Box>
                    <Chip
                      label={chalan.status}
                      color={getStatusColor(chalan.status)}
                      size="small"
                    />
                  </Box>

                  {/* Depot Info */}
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    From: <strong>{chalan.depot_id?.name || "N/A"}</strong>
                  </Typography>

                  {/* Transport Info */}
                  {chalan.transport_id && (
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                      <LocalShipping sx={{ fontSize: 14, mr: 0.5, verticalAlign: "middle" }} />
                      {chalan.transport_id.transport} - {chalan.vehicle_no}
                    </Typography>
                  )}

                  {/* Quantity Summary */}
                  <Box
                    sx={{
                      display: "flex",
                      gap: 2,
                      mt: 2,
                      pt: 2,
                      borderTop: 1,
                      borderColor: "divider",
                    }}
                  >
                    <Box>
                      <Typography variant="caption" color="text.secondary">
                        Total Cartons
                      </Typography>
                      <Typography variant="h6" fontWeight="bold">
                        {chalan.total_qty_ctn}
                      </Typography>
                    </Box>
                    <Box>
                      <Typography variant="caption" color="text.secondary">
                        Total Pieces
                      </Typography>
                      <Typography variant="h6" fontWeight="bold">
                        {chalan.total_qty_pcs}
                      </Typography>
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            ))}
          </Stack>

          {/* Load More Button */}
          {hasMore && !loading && (
            <Box sx={{ textAlign: "center", mt: 3 }}>
              <Button variant="outlined" onClick={handleLoadMore}>
                Load More
              </Button>
            </Box>
          )}

          {/* Loading More Indicator */}
          {loading && page > 1 && (
            <Box sx={{ display: "flex", justifyContent: "center", py: 2 }}>
              <CircularProgress size={24} />
            </Box>
          )}
        </Box>
      )}

      {/* Floating Refresh Button */}
      <Fab
        color="primary"
        sx={{ position: "fixed", bottom: 16, right: 16 }}
        onClick={handleRefresh}
        disabled={refreshing}
      >
        <Refresh />
      </Fab>
    </Box>
  );
}
