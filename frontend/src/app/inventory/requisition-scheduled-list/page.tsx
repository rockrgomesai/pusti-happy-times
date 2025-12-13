"use client";

import React, { useState, useEffect } from "react";
import {
  Box,
  Container,
  Typography,
  Card,
  CardContent,
  Grid,
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
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
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

  // Helper to safely convert values to text (handles Decimal128)
  const toText = (value, fallback = "") => {
    if (value === null || value === undefined) return fallback;
    if (typeof value === "string") return value;
    if (typeof value === "number" || typeof value === "boolean" || typeof value === "bigint") return String(value);

    if (typeof value === "object") {
      if (value.$numberDecimal !== undefined && value.$numberDecimal !== null) {
        return String(value.$numberDecimal);
      }
      if (value._bsontype === "Decimal128" && typeof value.toString === "function") {
        return value.toString();
      }
      if (typeof value.toString === "function" && value.toString !== Object.prototype.toString) {
        return value.toString();
      }
      try {
        return JSON.stringify(value);
      } catch {
        return String(value);
      }
    }

    return String(value);
  };

  const toNumber = (value, fallback = 0) => {
    if (value === "") return fallback;
    const n = Number(toText(value, ""));
    return Number.isFinite(n) ? n : fallback;
  };

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);

      // Build query params for scheduled requisitions
      const params = new URLSearchParams();
      if (filters.status) params.append("status", filters.status);
      if (filters.from_date) params.append("from_date", filters.from_date);
      if (filters.to_date) params.append("to_date", filters.to_date);
      if (filters.source_depot) params.append("source_depot", filters.source_depot);
      if (filters.target_depot) params.append("target_depot", filters.target_depot);

      const [schedulingsRes, depotsRes] = await Promise.all([
        apiClient.get(`/inventory/requisition-schedulings/scheduled-list?${params.toString()}`),
        apiClient.get("/inventory/requisition-schedulings/depots"),
      ]);

      setSchedulings(schedulingsRes.data || []);
      setDepots(depotsRes.data || []);
    } catch (error) {
      console.error("Error loading scheduled list:", error);
      setSchedulings([]);
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
          View history of all scheduled requisitions created through Schedule Requisitions
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
              <Grid container spacing={2} sx={{ mb: 2 }}>
                <Grid item xs={12} sm={6} md={3}>
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
                </Grid>

                <Grid item xs={12} sm={6} md={3}>
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
                </Grid>

                <Grid item xs={12} sm={6} md={3}>
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
                        {depot.name} ({depot.code})
                      </MenuItem>
                    ))}
                  </TextField>
                </Grid>

                <Grid item xs={12} sm={6} md={3}>
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
                        {depot.name} ({depot.code})
                      </MenuItem>
                    ))}
                  </TextField>
                </Grid>
              </Grid>

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
        <Alert severity="info">No scheduled requisition records found</Alert>
      ) : (
        <Box>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            {schedulings.length} scheduling record(s) found
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
                      Requisition: {scheduling.requisition_id?.requisition_no || "N/A"}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Req. Date: {scheduling.requisition_id?.requisition_date
                        ? new Date(scheduling.requisition_id.requisition_date).toLocaleDateString()
                        : "N/A"}
                    </Typography>
                    <Typography variant="caption" display="block" color="text.secondary">
                      Target Depot: {scheduling.requisition_id?.from_depot_id?.name || "N/A"}{" "}
                      ({scheduling.requisition_id?.from_depot_id?.code || "N/A"})
                    </Typography>
                    <Typography variant="caption" display="block" color="text.secondary">
                      Scheduled on: {new Date(scheduling.created_at).toLocaleString()}
                    </Typography>
                    {scheduling.created_by && (
                      <Typography variant="caption" display="block" color="text.secondary">
                        By: {scheduling.created_by.full_name || scheduling.created_by.username}
                      </Typography>
                    )}
                  </Box>
                  {scheduling.status && (
                    <Chip label={scheduling.status} color={getStatusColor(scheduling.status)} size="small" />
                  )}
                </Box>

                <Divider sx={{ mb: 2 }} />

                {/* Details Accordion */}
                <Accordion>
                  <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                    <Typography variant="body2" fontWeight="bold">
                      {scheduling.scheduling_details?.length || 0} item(s) scheduled
                    </Typography>
                  </AccordionSummary>
                  <AccordionDetails>
                    <TableContainer component={Paper} variant="outlined">
                      <Table size="small">
                        <TableHead>
                          <TableRow>
                            <TableCell>SKU</TableCell>
                            <TableCell>Source Depot</TableCell>
                            <TableCell>Target Depot</TableCell>
                            <TableCell align="right">Delivery Qty</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {(scheduling.scheduling_details || []).map((detail, idx) => (
                            <TableRow key={idx}>
                              <TableCell>
                                <Typography variant="body2">
                                  {toText(detail.sku, "N/A")}
                                </Typography>
                                {detail.erp_id && (
                                  <Typography variant="caption" color="text.secondary">
                                    {toText(detail.erp_id)}
                                  </Typography>
                                )}
                              </TableCell>
                              <TableCell>
                                <Typography variant="body2">
                                  {toText(detail.source_depot_id?.name, "N/A")}
                                </Typography>
                                <Typography variant="caption" color="text.secondary">
                                  {toText(detail.source_depot_id?.code, "")}
                                </Typography>
                              </TableCell>
                              <TableCell>
                                <Typography variant="body2">
                                  {toText(detail.target_depot_id?.name, "N/A")}
                                </Typography>
                                <Typography variant="caption" color="text.secondary">
                                  {toText(detail.target_depot_id?.code, "")}
                                </Typography>
                              </TableCell>
                              <TableCell align="right">
                                <Typography variant="body2" fontWeight="bold" color="primary">
                                  {toText(detail.delivery_qty, "0")}
                                </Typography>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </TableContainer>
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
