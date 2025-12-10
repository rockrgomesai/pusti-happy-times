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

      // Build query params
      const params = new URLSearchParams();
      Object.entries(filters).forEach(([key, value]) => {
        if (value) params.append(key, value);
      });

      const [schedulingsRes, depotsRes] = await Promise.all([
        apiClient.get(`/inventory/requisition-schedulings/scheduled-list?${params.toString()}`),
        apiClient.get("/inventory/requisition-schedulings/depots"),
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
          Scheduled Requisitions
        </Typography>
        <Typography variant="body2" color="text.secondary">
          View history of all scheduled requisitions
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
                    label="Source Depot"
                    size="small"
                    value={filters.source_depot}
                    onChange={(e) => handleFilterChange("source_depot", e.target.value)}
                  >
                    <MenuItem value="">All</MenuItem>
                    {depots.map((depot) => (
                      <MenuItem key={depot._id} value={depot._id}>
                        {depot.name}
                      </MenuItem>
                    ))}
                  </TextField>
                </Grid2>

                <Grid2 size={{ xs: 12, sm: 6, md: 3 }}>
                  <TextField
                    fullWidth
                    select
                    label="Target Depot"
                    size="small"
                    value={filters.target_depot}
                    onChange={(e) => handleFilterChange("target_depot", e.target.value)}
                  >
                    <MenuItem value="">All</MenuItem>
                    {depots.map((depot) => (
                      <MenuItem key={depot._id} value={depot._id}>
                        {depot.name}
                      </MenuItem>
                    ))}
                  </TextField>
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
                    <MenuItem value="pending">Pending</MenuItem>
                    <MenuItem value="in-progress">In Progress</MenuItem>
                    <MenuItem value="completed">Completed</MenuItem>
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
        <Alert severity="info">No scheduling records found</Alert>
      ) : (
        <Box>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            {schedulings.length} record(s) found
          </Typography>

          {schedulings.map((scheduling) => (
            <Card key={scheduling._id} sx={{ mb: 2 }}>
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
                      {scheduling.requisition_no}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Scheduled on {new Date(scheduling.created_at).toLocaleString()}
                    </Typography>
                    {scheduling.created_by && (
                      <Typography variant="caption" display="block" color="text.secondary">
                        By: {scheduling.created_by.full_name || scheduling.created_by.username}
                      </Typography>
                    )}
                  </Box>
                  <Chip label={scheduling.status} color={getStatusColor(scheduling.status)} size="small" />
                </Box>

                <Divider sx={{ mb: 2 }} />

                {/* Details Accordion */}
                <Accordion>
                  <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                    <Typography variant="body2" fontWeight="bold">
                      {scheduling.scheduling_details.length} item(s) scheduled
                    </Typography>
                  </AccordionSummary>
                  <AccordionDetails>
                    <Box>
                      {scheduling.scheduling_details.map((detail, idx) => {
                        const sourceDepot = detail.source_depot_id;
                        const targetDepot = detail.target_depot_id;

                        return (
                          <Box
                            key={idx}
                            sx={{
                              mb: 2,
                              pb: 2,
                              borderBottom:
                                idx < scheduling.scheduling_details.length - 1
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
                                  SKU: {detail.sku}
                                </Typography>
                                {detail.erp_id && (
                                  <Typography variant="caption" color="text.secondary">
                                    ERP: {detail.erp_id}
                                  </Typography>
                                )}
                              </Grid2>

                              <Grid2 size={{ xs: 6, sm: 3 }}>
                                <Typography variant="caption" color="text.secondary">
                                  Order Qty
                                </Typography>
                                <Typography variant="body2">
                                  {detail.order_qty?.toString()}
                                </Typography>
                              </Grid2>

                              <Grid2 size={{ xs: 6, sm: 3 }}>
                                <Typography variant="caption" color="text.secondary">
                                  Delivery Qty
                                </Typography>
                                <Typography variant="body2" fontWeight="bold" color="primary">
                                  {detail.delivery_qty?.toString()}
                                </Typography>
                              </Grid2>

                              <Grid2 size={{ xs: 12, sm: 6 }}>
                                <Typography variant="caption" color="text.secondary">
                                  Source Depot
                                </Typography>
                                <Typography variant="body2">
                                  {sourceDepot?.name || "N/A"}
                                  {sourceDepot?.code && ` (${sourceDepot.code})`}
                                </Typography>
                              </Grid2>

                              <Grid2 size={{ xs: 12, sm: 6 }}>
                                <Typography variant="caption" color="text.secondary">
                                  Target Depot
                                </Typography>
                                <Typography variant="body2">
                                  {targetDepot?.name || "N/A"}
                                  {targetDepot?.code && ` (${targetDepot.code})`}
                                </Typography>
                              </Grid2>
                            </Grid2>
                          </Box>
                        );
                      })}
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
