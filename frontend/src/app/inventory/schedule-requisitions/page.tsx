"use client";

import React, { useState, useEffect } from "react";
import {
  Box,
  Container,
  Typography,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Grid,
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

class RenderBoundary extends React.Component<
  {
    name: string;
    context?: Record<string, unknown>;
    children: React.ReactNode;
  },
  { hasError: boolean }
> {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: unknown) {
    try {
      // Log minimal context so we can locate the exact failing subtree.
      // eslint-disable-next-line no-console
      console.error(`[schedule-requisitions] render boundary: ${this.props.name}`, {
        error,
        context: this.props.context,
      });
    } catch {
      // ignore logging failures
    }
  }

  render() {
    if (this.state.hasError) {
      return (
        <Alert severity="error">
          Failed to render this section. Please check console logs.
        </Alert>
      );
    }

    return this.props.children;
  }
}

export default function ScheduleRequisitionsPage() {
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [depotGroups, setDepotGroups] = useState([]);
  const [depots, setDepots] = useState([]);
  const [schedulingData, setSchedulingData] = useState({});
  const [snackbar, setSnackbar] = useState({ open: false, message: "", severity: "success" });
  const [expandedAccordion, setExpandedAccordion] = useState(null);

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

  const toId = (value, fallback = "") => {
    const v = toText(value, fallback);
    return v === "[object Object]" ? fallback : v;
  };

  const safeDateText = (value, fallback = "N/A") => {
    if (!value) return fallback;
    try {
      const d = new Date(value);
      const txt = d.toLocaleDateString();
      return txt && txt !== "Invalid Date" ? txt : fallback;
    } catch {
      return fallback;
    }
  };

  const normalizeGroups = (groups) => {
    if (!Array.isArray(groups)) return [];

    return groups.map((group) => {
      const safeDepotId = toId(group?.depot_id, "");

      const requisitions = Array.isArray(group?.requisitions)
        ? group.requisitions.map((req) => {
            const fromDepot = req?.from_depot;
            const normalizedFromDepot =
              fromDepot && typeof fromDepot === "object"
                ? {
                    ...fromDepot,
                    id: toId(fromDepot.id ?? fromDepot._id, ""),
                    _id: toId(fromDepot._id, ""),
                    name: toText(fromDepot.name, ""),
                    code: toText(fromDepot.code, ""),
                  }
                : fromDepot;

            const items = Array.isArray(req?.items)
              ? req.items.map((item) => {
                  const stockQuantities = Array.isArray(item?.stock_quantities)
                    ? item.stock_quantities.map((stock) => ({
                        ...stock,
                        depot_id: toId(stock?.depot_id, ""),
                        depot_name: toText(stock?.depot_name, ""),
                      }))
                    : item?.stock_quantities;

                  return {
                    ...item,
                    requisition_detail_id: toId(item?.requisition_detail_id, ""),
                    sku: toText(item?.sku, ""),
                    erp_id: toText(item?.erp_id, ""),
                    stock_quantities: stockQuantities,
                  };
                })
              : req?.items;

            return {
              ...req,
              requisition_id: toId(req?.requisition_id, ""),
              requisition_no: toText(req?.requisition_no, ""),
              from_depot: normalizedFromDepot,
              from_depot_name: toText(req?.from_depot_name, ""),
              from_depot_code: toText(req?.from_depot_code, ""),
              items,
            };
          })
        : group?.requisitions;

      return {
        ...group,
        depot_id: safeDepotId,
        depot_name: toText(group?.depot_name, ""),
        depot_code: toText(group?.depot_code, ""),
        requisitions,
      };
    });
  };

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

      const normalizedGroups = normalizeGroups(groups);
      
      console.log("📦 Depot Groups received:", normalizedGroups);
      console.log("📦 Number of groups:", normalizedGroups.length);
      
      if (normalizedGroups.length > 0) {
        console.log("📦 First group:", normalizedGroups[0]);
      }
      
      setDepotGroups(normalizedGroups);

      // Initialize scheduling data with pre-filled values
      const initialData = {};
      normalizedGroups.forEach((group) => {
        const depotId = toId(group.depot_id, "");
        if (!depotId) return;

        initialData[depotId] = {
          items: {},
        };
        group.requisitions?.forEach((req) => {
          req.items?.forEach((item) => {
            const key = `${req.requisition_id}_${item.requisition_detail_id}`;
            initialData[depotId].items[key] = {
              requisition_id: req.requisition_id,
              requisition_detail_id: item.requisition_detail_id,
              delivery_qty: toNumber(item.unscheduled_qty, 0), // Pre-fill with unscheduled qty
              source_depot_id: depotId, // Pre-fill with first depot
              target_depot_id: toId(req.from_depot?.id || req.from_depot?._id, "") || null,
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
      const deliveryQty = toNumber(item.delivery_qty, 0);
      if (deliveryQty <= 0) return; // Skip items with no delivery qty

      // Find stock for selected source depot
      const stockInfo = (item.stock_quantities || []).find(
        (s) => s.depot_id === item.source_depot_id
      );
      const availableStock = stockInfo ? toNumber(stockInfo.qty, 0) : 0;

      if (deliveryQty > availableStock) {
        errors.push(
          `SKU ${item.requisition_detail_id.substring(0, 8)} requires ${deliveryQty} but only ${availableStock} available`
        );
      }

      if (deliveryQty > toNumber(item.unscheduled_qty, 0)) {
        errors.push(
          `SKU ${item.requisition_detail_id.substring(0, 8)} delivery qty ${deliveryQty} exceeds unscheduled ${toText(item.unscheduled_qty, "0")}`
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
        .filter((item) => toNumber(item.delivery_qty, 0) > 0)
        .map((item) => ({
          requisition_id: item.requisition_id,
          requisition_detail_id: item.requisition_detail_id,
          delivery_qty: toNumber(item.delivery_qty, 0),
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
    const safeMessage = typeof message === "string" ? message : toText(message, "");
    setSnackbar({ open: true, message: safeMessage, severity });
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
          key={toId(group.depot_id, "")}
          expanded={expandedAccordion === toId(group.depot_id, "")}
          onChange={(e, isExpanded) =>
            setExpandedAccordion(isExpanded ? toId(group.depot_id, "") : null)
          }
          sx={{ mb: 2 }}
        >
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 2, width: "100%" }}>
              <WarehouseIcon color="primary" />
              <Box sx={{ flexGrow: 1 }}>
                <Typography variant="subtitle1" fontWeight="bold">
                  {toText(group.depot_name, "Unknown Depot")}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {group.depot_code ? `${toText(group.depot_code)} • ` : ""}{group.requisitions?.length || 0} requisition(s)
                </Typography>
              </Box>
            </Box>
          </AccordionSummary>

          <AccordionDetails>
            <Box>
              {(group.requisitions || []).map((req) => (
                <RenderBoundary
                  key={toId(req.requisition_id, "") || toText(req.requisition_no, "") || undefined}
                  name="requisition-card"
                  context={{
                    group_depot_id: toId(group?.depot_id, ""),
                    requisition_id: toId(req?.requisition_id, ""),
                    requisition_no: toText(req?.requisition_no, ""),
                  }}
                >
                  <Card sx={{ mb: 2 }}>
                    <CardContent>
                      {/* Requisition Header */}
                      <Box sx={{ mb: 2 }}>
                        <Typography variant="subtitle2" fontWeight="bold">
                          Requisition: {toText(req.requisition_no) || toText(req.requisition_id)?.substring?.(0, 8) || "N/A"}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          Target: {toText(req.from_depot?.name) || toText(req.from_depot_name) || "N/A"} ({toText(req.from_depot?.code) || toText(req.from_depot_code) || "N/A"}) •{" "}
                          {safeDateText(req.requisition_date, "N/A")}
                        </Typography>
                      </Box>

                      <Divider sx={{ mb: 2 }} />

                      {(req.items || []).filter((item) => item && item.requisition_detail_id).map((item) => {
                        const key = `${req.requisition_id}_${item.requisition_detail_id}`;
                        const groupDepotId = toId(group.depot_id, "");
                        const itemData = schedulingData[groupDepotId]?.items[key] || {};

                        return (
                          <RenderBoundary
                            key={key}
                            name="requisition-item"
                            context={{
                              group_depot_id: toId(group?.depot_id, ""),
                              requisition_id: toId(req?.requisition_id, ""),
                              requisition_no: toText(req?.requisition_no, ""),
                              requisition_detail_id: toId(item?.requisition_detail_id, ""),
                              sku: toText(item?.sku, ""),
                            }}
                          >
                            <Box sx={{ mb: 3, pb: 2, borderBottom: "1px solid #eee" }}>
                          {/* Product Info */}
                          <Box sx={{ mb: 2 }}>
                            <Typography variant="body2" fontWeight="bold">
                              SKU: {toText(item.sku, "N/A")} {item.erp_id ? `(${toText(item.erp_id)})` : ""}
                            </Typography>
                            <Box sx={{ display: "flex", gap: 1, mt: 1, flexWrap: "wrap" }}>
                              <Chip
                                label={`Order: ${toText(item.order_qty, "0")}`}
                                size="small"
                                color="default"
                                variant="outlined"
                              />
                              <Chip
                                label={`Scheduled: ${toText(item.scheduled_qty, "0")}`}
                                size="small"
                                color="success"
                                variant="outlined"
                              />
                              <Chip
                                label={`Unscheduled: ${toText(item.unscheduled_qty, "0")}`}
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
                              {(item.stock_quantities || []).map((stock, idx) => (
                                <Chip
                                  key={toId(stock?.depot_id, "") || String(idx)}
                                  label={`${toText(stock?.depot_name, "N/A")}: ${toText(stock?.qty, "0")}`}
                                  size="small"
                                  color={toNumber(stock?.qty, 0) > 0 ? "primary" : "default"}
                                  variant={
                                    toId(stock?.depot_id, "") === toId(itemData?.source_depot_id, "")
                                      ? "filled"
                                      : "outlined"
                                  }
                                />
                              ))}
                            </Box>
                          </Box>

                          {/* Input Fields */}
                          <Grid container spacing={2}>
                            <Grid item xs={12} sm={6}>
                              <TextField
                                fullWidth
                                label="Delivery Qty"
                                type="number"
                                size="small"
                                value={itemData.delivery_qty === 0 ? 0 : toText(itemData.delivery_qty, "")}
                                onChange={(e) =>
                                  handleInputChange(
                                    toId(group.depot_id, ""),
                                    key,
                                    "delivery_qty",
                                    e.target.value
                                  )
                                }
                                inputProps={{
                                  min: 0,
                                  max: toNumber(item.unscheduled_qty, 0),
                                  step: 1,
                                  inputMode: "numeric",
                                }}
                                helperText={`Max: ${toText(item.unscheduled_qty, "0")}`}
                              />
                            </Grid>

                            <Grid item xs={12} sm={6}>
                              <TextField
                                fullWidth
                                select
                                label="Source Depot"
                                size="small"
                                value={toId(itemData.source_depot_id, "")}
                                onChange={(e) =>
                                  handleInputChange(
                                    toId(group.depot_id, ""),
                                    key,
                                    "source_depot_id",
                                    e.target.value
                                  )
                                }
                              >
                                {(item.stock_quantities || []).map((stock, idx) => (
                                  <MenuItem
                                    key={toId(stock?.depot_id, "") || String(idx)}
                                    value={toId(stock?.depot_id, "")}
                                  >
                                    {toText(stock?.depot_name, "N/A")} ({toText(stock?.qty, "0")} available)
                                  </MenuItem>
                                ))}
                              </TextField>
                            </Grid>
                          </Grid>
                            </Box>
                          </RenderBoundary>
                        );
                      })}

                    {/* Schedule Button for this requisition group */}
                    <Box sx={{ mt: 2, display: "flex", justifyContent: "flex-end" }}>
                      <Button
                        variant="contained"
                        color="primary"
                        startIcon={<ScheduleSendIcon />}
                        onClick={() => handleScheduleGroup(toId(group.depot_id, ""))}
                        disabled={submitting}
                      >
                        {submitting ? <CircularProgress size={20} /> : "Schedule"}
                      </Button>
                    </Box>
                  </CardContent>
                  </Card>
                </RenderBoundary>
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
