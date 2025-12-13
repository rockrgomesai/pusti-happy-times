"use client";

import React, { useState, useEffect } from "react";
import {
  Box,
  Container,
  Typography,
  Card,
  CardContent,
  Grid2,
  TextField,
  MenuItem,
  Button,
  CircularProgress,
  Alert,
  Chip,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Divider,
} from "@mui/material";
import PlaylistAddCheckIcon from "@mui/icons-material/PlaylistAddCheck";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import FilterListIcon from "@mui/icons-material/FilterList";
import RefreshIcon from "@mui/icons-material/Refresh";
import { apiClient } from "@/lib/api";

export default function RequisitionScheduledListPage() {
  const [loading, setLoading] = useState(true);
  const [schedulings, setSchedulings] = useState([]);
  const [depots, setDepots] = useState([]);
  const [filters, setFilters] = useState({
    from_date: "",
    to_date: "",
    source_depot: "",
    target_depot: "",
    status: "",
  });
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);

      // Build query params for load sheets
      const params = new URLSearchParams();
      if (filters.status) params.append("status", filters.status);
      if (filters.from_date) params.append("from_date", filters.from_date);
      if (filters.to_date) params.append("to_date", filters.to_date);

      const [schedulingsRes, depotsRes] = await Promise.all([
        apiClient.get(`/inventory/req-load-sheets/list?${params.toString()}`),
        apiClient.get("/facilities"),
      ]);

      if (schedulingsRes.data.success) {
        setSchedulings(schedulingsRes.data.data);
      }

      if (depotsRes.data.success) {
        setDepots(depotsRes.data.data);
      }
    } catch (error) {
      console.error("Error loading scheduled list:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (field, value) => {
    setFilters((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleApplyFilters = () => {
    loadData();
  };

  const handleResetFilters = () => {
    setFilters({
      from_date: "",
      to_date: "",
      source_depot: "",
      target_depot: "",
      status: "",
    });
    // Reload with no filters
    setTimeout(() => loadData(), 100);
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "completed":
        return "success";
      case "in-progress":
        return "warning";
      case "pending":
        return "default";
      default:
        return "default";
    }
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="80vh">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ mt: 2, mb: 4, px: { xs: 1, sm: 2 } }}>
      {/* Header */}
      <Box sx={{ mb: 3 }}>
        <Typography variant="h5" gutterBottom sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <PlaylistAddCheckIcon />
          Requisition Load Sheets
        </Typography>
        <Typography variant="body2" color="text.secondary">
          View history of all requisition load sheets created for delivery
        </Typography>
      </Box>

      {/* Filters */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Box
            sx={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              mb: showFilters ? 2 : 0,
            }}
          >
            <Typography variant="subtitle2" fontWeight="bold">
              Filters
            </Typography>
            <Button
              size="small"
              startIcon={<FilterListIcon />}
              onClick={() => setShowFilters(!showFilters)}
            >
              {showFilters ? "Hide" : "Show"}
            </Button>
          </Box>

          {showFilters && (
            <>
              <Grid2 container spacing={2} sx={{ mb: 2 }}>
                <Grid2 size={{ xs: 12, sm: 6, md: 3 }}>
                  <TextField
                    fullWidth
                    label="From Date"
                    type="date"
                    size="small"
                    value={filters.from_date}
                    onChange={(e) => handleFilterChange("from_date", e.target.value)}
                    slotProps={{
                      inputLabel: { shrink: true },
                    }}
                  />
                </Grid2>

                <Grid2 size={{ xs: 12, sm: 6, md: 3 }}>
                  <TextField
                    fullWidth
                    label="To Date"
                    type="date"
                    size="small"
                    value={filters.to_date}
                    onChange={(e) => handleFilterChange("to_date", e.target.value)}
                    slotProps={{
                      inputLabel: { shrink: true },
                    }}
                  />
                </Grid2>

                <Grid2 size={{ xs: 12, sm: 6, md: 3 }}>
                  <TextField
                    fullWidth
                    select
                    label="Status"
                    size="small"
                    value={filters.status}
                    onChange={(e) => handleFilterChange("status", e.target.value)}
                  >
                    <MenuItem value="">All</MenuItem>
                    <MenuItem value="draft">Draft</MenuItem>
                    <MenuItem value="validated">Validated</MenuItem>
                    <MenuItem value="converted">Converted to Chalan</MenuItem>
                  </TextField>
                </Grid2>
              </Grid2>

              <Box sx={{ display: "flex", gap: 1, justifyContent: "flex-end" }}>
                <Button size="small" variant="outlined" onClick={handleResetFilters}>
                  Reset
                </Button>
                <Button
                  size="small"
                  variant="contained"
                  startIcon={<FilterListIcon />}
                  onClick={handleApplyFilters}
                >
                  Apply
                </Button>
                <Button
                  size="small"
                  variant="outlined"
                  startIcon={<RefreshIcon />}
                  onClick={loadData}
                >
                  Refresh
                </Button>
              </Box>
            </>
          )}
        </CardContent>
      </Card>

      {/* Results */}
      {schedulings.length === 0 ? (
        <Alert severity="info">No load sheet records found</Alert>
      ) : (
        <Box>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            {schedulings.length} load sheet(s) found
          </Typography>

          {schedulings.map((loadSheet) => (
            <Card key={loadSheet._id} sx={{ mb: 2 }}>
              <CardContent>
                {/* Header */}
                <Box
                  sx={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "flex-start",
                    mb: 2,
                  }}
                >
                  <Box>
                    <Typography variant="subtitle1" fontWeight="bold">
                      Load Sheet: {loadSheet.load_sheet_no || loadSheet._id}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Created on {new Date(loadSheet.created_at).toLocaleString()}
                    </Typography>
                    {loadSheet.created_by && (
                      <Typography variant="caption" display="block" color="text.secondary">
                        By: {loadSheet.created_by.full_name || loadSheet.created_by.username}
                      </Typography>
                    )}
                    {loadSheet.requesting_depot_id && (
                      <Typography variant="caption" display="block" color="text.secondary">
                        To: {loadSheet.requesting_depot_id.name || 'N/A'}
                      </Typography>
                    )}
                  </Box>
                  <Chip label={loadSheet.status} color={getStatusColor(loadSheet.status)} size="small" />
                </Box>

                <Divider sx={{ mb: 2 }} />

                {/* Details Accordion */}
                <Accordion>
                  <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                    <Typography variant="body2" fontWeight="bold">
                      {loadSheet.req_items?.length || 0} item(s) in load sheet
                    </Typography>
                  </AccordionSummary>
                  <AccordionDetails>
                    <Box>
                      {(loadSheet.req_items || []).map((item, idx) => (
                        <Box
                          key={idx}
                          sx={{
                            mb: 2,
                            pb: 2,
                            borderBottom:
                              idx < (loadSheet.req_items?.length || 0) - 1
                                ? "1px solid #eee"
                                : "none",
                          }}
                        >
                          <Grid2 container spacing={2}>
                            <Grid2 size={{ xs: 12, sm: 6 }}>
                              <Typography variant="caption" color="text.secondary">
                                Product
                              </Typography>
                              <Typography variant="body2" fontWeight="bold">
                                {item.product_name || item.sku}
                              </Typography>
                              <Typography variant="caption" color="text.secondary">
                                SKU: {item.sku}
                              </Typography>
                            </Grid2>

                            <Grid2 size={{ xs: 6, sm: 3 }}>
                              <Typography variant="caption" color="text.secondary">
                                Req. No
                              </Typography>
                              <Typography variant="body2">
                                {item.requisition_no || 'N/A'}
                              </Typography>
                            </Grid2>

                            <Grid2 size={{ xs: 6, sm: 3 }}>
                              <Typography variant="caption" color="text.secondary">
                                Delivery Qty
                              </Typography>
                              <Typography variant="body2" fontWeight="bold" color="primary">
                                {item.delivery_qty || 0}
                              </Typography>
                            </Grid2>

                            <Grid2 size={{ xs: 6, sm: 3 }}>
                              <Typography variant="caption" color="text.secondary">
                                Order Qty
                              </Typography>
                              <Typography variant="body2">
                                {item.order_qty || 0}
                              </Typography>
                            </Grid2>

                            <Grid2 size={{ xs: 6, sm: 3 }}>
                              <Typography variant="caption" color="text.secondary">
                                Undelivered
                              </Typography>
                              <Typography variant="body2">
                                {item.undelivered_qty || 0}
                              </Typography>
                            </Grid2>
                          </Grid2>
                        </Box>
                      ))}
                    </Box>
                  </AccordionDetails>
                </Accordion>
              </CardContent>
            </Card>
          ))}
        </Box>
      )}
    </Container>
  );
}
