"use client";

import React, { useState, useEffect } from "react";
import {
  Box,
  Container,
  Typography,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Grid2,
  TextField,
  MenuItem,
  Button,
  Card,
  CardContent,
  CircularProgress,
  Alert,
  Snackbar,
  Chip,
  Divider,
} from "@mui/material";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import ScheduleSendIcon from "@mui/icons-material/ScheduleSend";
import WarehouseIcon from "@mui/icons-material/Warehouse";
import { apiClient } from "@/lib/api";

export default function ScheduleRequisitionsPage() {
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [depotGroups, setDepotGroups] = useState([]);
  const [depots, setDepots] = useState([]);
  const [schedulingData, setSchedulingData] = useState({});
  const [snackbar, setSnackbar] = useState({ open: false, message: "", severity: "success" });
  const [expandedAccordion, setExpandedAccordion] = useState(null);

  // Load initial data
  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [requisitionsRes, depotsRes] = await Promise.all([
        apiClient.get("/inventory/requisition-schedulings"),
        apiClient.get("/inventory/requisition-schedulings/depots"),
      ]);

      // Handle response - check if it's wrapped in success/data or is the array directly
      const groups = Array.isArray(requisitionsRes.data) 
        ? requisitionsRes.data 
        : (requisitionsRes.data?.data || []);
      
      console.log("📦 Depot Groups received:", groups);
      console.log("📦 Number of groups:", groups.length);
      
      if (groups.length > 0) {
        console.log("📦 First group:", groups[0]);
      }
      
      setDepotGroups(groups);

      // Initialize scheduling data with pre-filled values
      const initialData = {};
      groups.forEach((group) => {
        initialData[group.depot_id] = {
          items: {},
        };
        group.requisitions?.forEach((req) => {
          req.items?.forEach((item) => {
            const key = `${req.requisition_id}_${item.requisition_detail_id}`;
            initialData[group.depot_id].items[key] = {
              requisition_id: req.requisition_id,
              requisition_detail_id: item.requisition_detail_id,
              delivery_qty: item.unscheduled_qty, // Pre-fill with unscheduled qty
              source_depot_id: group.depot_id, // Pre-fill with first depot
              target_depot_id: req.from_depot.id,
              order_qty: item.order_qty,
              unscheduled_qty: item.unscheduled_qty,
              stock_quantities: item.stock_quantities,
            };
          });
        });
      });
      setSchedulingData(initialData);

      // Handle depots response
      const depotsData = Array.isArray(depotsRes.data)
        ? depotsRes.data
        : (depotsRes.data?.data || []);
      setDepots(depotsData);
    } catch (error) {
      console.error("Error loading data:", error);
      showSnackbar("Failed to load requisitions", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (depotId, key, field, value) => {
    setSchedulingData((prev) => ({
      ...prev,
      [depotId]: {
        ...prev[depotId],
        items: {
          ...prev[depotId].items,
          [key]: {
            ...prev[depotId].items[key],
            [field]: value,
          },
        },
      },
    }));
  };

  const validateStockForGroup = (depotId) => {
    const groupData = schedulingData[depotId];
    if (!groupData) return { valid: true, errors: [] };

    const errors = [];
    Object.entries(groupData.items).forEach(([key, item]) => {
      const deliveryQty = parseFloat(item.delivery_qty || 0);
      if (deliveryQty <= 0) return; // Skip items with no delivery qty

      // Find stock for selected source depot
      const stockInfo = item.stock_quantities.find(
        (s) => s.depot_id === item.source_depot_id
      );
      const availableStock = stockInfo ? stockInfo.qty : 0;

      if (deliveryQty > availableStock) {
        errors.push(
          `SKU ${item.requisition_detail_id.substring(0, 8)} requires ${deliveryQty} but only ${availableStock} available`
        );
      }

      if (deliveryQty > item.unscheduled_qty) {
        errors.push(
          `SKU ${item.requisition_detail_id.substring(0, 8)} delivery qty ${deliveryQty} exceeds unscheduled ${item.unscheduled_qty}`
        );
      }
    });

    return { valid: errors.length === 0, errors };
  };

  const handleScheduleGroup = async (depotId) => {
    const validation = validateStockForGroup(depotId);
    if (!validation.valid) {
      showSnackbar(validation.errors.join("; "), "error");
      return;
    }

    try {
      setSubmitting(true);

      // Collect deliveries for this group (only items with delivery_qty > 0)
      const groupData = schedulingData[depotId];
      const deliveries = Object.values(groupData.items)
        .filter((item) => parseFloat(item.delivery_qty || 0) > 0)
        .map((item) => ({
          requisition_id: item.requisition_id,
          requisition_detail_id: item.requisition_detail_id,
          delivery_qty: parseFloat(item.delivery_qty),
          source_depot_id: item.source_depot_id,
          target_depot_id: item.target_depot_id,
        }));

      if (deliveries.length === 0) {
        showSnackbar("Please enter delivery quantities", "warning");
        return;
      }

      const response = await apiClient.post(
        "/inventory/requisition-schedulings/schedule",
        { deliveries }
      );

      if (response.data.success) {
        showSnackbar(response.data.message || "Scheduling successful", "success");
        // Reload data
        await loadData();
        setExpandedAccordion(null);
      } else {
        showSnackbar(response.data.message || "Scheduling failed", "error");
      }
    } catch (error) {
      console.error("Error scheduling:", error);
      const message = error.response?.data?.message || "Failed to schedule requisitions";
      showSnackbar(message, "error");
    } finally {
      setSubmitting(false);
    }
  };

  const showSnackbar = (message, severity) => {
    setSnackbar({ open: true, message, severity });
  };

  const handleCloseSnackbar = () => {
    setSnackbar({ ...snackbar, open: false });
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="80vh">
        <CircularProgress />
      </Box>
    );
  }

  if (!depotGroups || depotGroups.length === 0) {
    return (
      <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
        <Alert severity="info">No pending requisitions to schedule</Alert>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ mt: 2, mb: 4, px: { xs: 1, sm: 2 } }}>
      {/* Header */}
      <Box sx={{ mb: 3 }}>
        <Typography variant="h5" gutterBottom sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <ScheduleSendIcon />
          Schedule Requisitions
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Select delivery quantities and source depot for each requisition
        </Typography>
      </Box>

      {/* Depot Groups (Accordions) */}
      {depotGroups.map((group) => (
        <Accordion
          key={group.depot_id}
          expanded={expandedAccordion === group.depot_id}
          onChange={(e, isExpanded) => setExpandedAccordion(isExpanded ? group.depot_id : null)}
          sx={{ mb: 2 }}
        >
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 2, width: "100%" }}>
              <WarehouseIcon color="primary" />
              <Box sx={{ flexGrow: 1 }}>
                <Typography variant="subtitle1" fontWeight="bold">
                  {group.depot_name || 'Unknown Depot'}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {group.depot_code ? `${group.depot_code} • ` : ''}{group.requisitions?.length || 0} requisition(s)
                </Typography>
              </Box>
            </Box>
          </AccordionSummary>

          <AccordionDetails>
            <Box>
              {(group.requisitions || []).map((req) => (
                <Card key={req.requisition_id} sx={{ mb: 2 }}>
                  <CardContent>
                    {/* Requisition Header */}
                    <Box sx={{ mb: 2 }}>
                      <Typography variant="subtitle2" fontWeight="bold">
                        {req.requisition_no || 'N/A'}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        Target: {req.from_depot?.name || 'N/A'} ({req.from_depot?.code || 'N/A'}) •{" "}
                        {req.requisition_date ? new Date(req.requisition_date).toLocaleDateString() : 'N/A'}
                      </Typography>
                    </Box>

                    <Divider sx={{ mb: 2 }} />

                    {/* Items */}
                    {(req.items || []).map((item) => {
                      const key = `${req.requisition_id}_${item.requisition_detail_id}`;
                      const itemData = schedulingData[group.depot_id]?.items[key] || {};

                      return (
                        <Box key={key} sx={{ mb: 3, pb: 2, borderBottom: "1px solid #eee" }}>
                          {/* Product Info */}
                          <Box sx={{ mb: 2 }}>
                            <Typography variant="body2" fontWeight="bold">
                              SKU: {item.sku || 'N/A'} {item.erp_id && `(${item.erp_id})`}
                            </Typography>
                            <Box sx={{ display: "flex", gap: 1, mt: 1, flexWrap: "wrap" }}>
                              <Chip
                                label={`Order: ${item.order_qty || 0}`}
                                size="small"
                                color="default"
                                variant="outlined"
                              />
                              <Chip
                                label={`Scheduled: ${item.scheduled_qty || 0}`}
                                size="small"
                                color="success"
                                variant="outlined"
                              />
                              <Chip
                                label={`Unscheduled: ${item.unscheduled_qty || 0}`}
                                size="small"
                                color="warning"
                                variant="outlined"
                              />
                            </Box>
                          </Box>

                          {/* Stock Quantities */}
                          <Box sx={{ mb: 2, p: 1, bgcolor: "#f5f5f5", borderRadius: 1 }}>
                            <Typography variant="caption" fontWeight="bold" display="block" mb={1}>
                              Available Stock:
                            </Typography>
                            <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
                              {(item.stock_quantities || []).map((stock) => (
                                <Chip
                                  key={stock.depot_id}
                                  label={`${stock.depot_name || 'N/A'}: ${stock.qty || 0}`}
                                  size="small"
                                  color={stock.qty > 0 ? "primary" : "default"}
                                  variant={stock.depot_id === itemData.source_depot_id ? "filled" : "outlined"}
                                />
                              ))}
                            </Box>
                          </Box>

                          {/* Input Fields */}
                          <Grid2 container spacing={2}>
                            <Grid2 size={{ xs: 12, sm: 6 }}>
                              <TextField
                                fullWidth
                                label="Delivery Qty"
                                type="number"
                                size="small"
                                value={itemData.delivery_qty || ""}
                                onChange={(e) =>
                                  handleInputChange(
                                    group.depot_id,
                                    key,
                                    "delivery_qty",
                                    e.target.value
                                  )
                                }
                                inputProps={{
                                  min: 0,
                                  max: item.unscheduled_qty,
                                  step: 1,
                                  inputMode: "numeric",
                                }}
                                helperText={`Max: ${item.unscheduled_qty}`}
                              />
                            </Grid2>

                            <Grid2 size={{ xs: 12, sm: 6 }}>
                              <TextField
                                fullWidth
                                select
                                label="Source Depot"
                                size="small"
                                value={itemData.source_depot_id || ""}
                                onChange={(e) =>
                                  handleInputChange(
                                    group.depot_id,
                                    key,
                                    "source_depot_id",
                                    e.target.value
                                  )
                                }
                              >
                                {item.stock_quantities.map((stock) => (
                                  <MenuItem key={stock.depot_id} value={stock.depot_id}>
                                    {stock.depot_name} ({stock.qty} available)
                                  </MenuItem>
                                ))}
                              </TextField>
                            </Grid2>
                          </Grid2>
                        </Box>
                      );
                    })}

                    {/* Schedule Button for this requisition group */}
                    <Box sx={{ mt: 2, display: "flex", justifyContent: "flex-end" }}>
                      <Button
                        variant="contained"
                        color="primary"
                        startIcon={<ScheduleSendIcon />}
                        onClick={() => handleScheduleGroup(group.depot_id)}
                        disabled={submitting}
                      >
                        {submitting ? <CircularProgress size={20} /> : "Schedule"}
                      </Button>
                    </Box>
                  </CardContent>
                </Card>
              ))}
            </Box>
          </AccordionDetails>
        </Accordion>
      ))}

      {/* Snackbar */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert onClose={handleCloseSnackbar} severity={snackbar.severity} sx={{ width: "100%" }}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Container>
  );
}
