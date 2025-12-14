"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  Box,
  Container,
  Paper,
  Typography,
  TextField,
  Button,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Checkbox,
  Chip,
  Alert,
  CircularProgress,
  Card,
  CardContent,
  Stack,
  InputAdornment,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Divider,
} from "@mui/material";
import {
  ExpandMore as ExpandMoreIcon,
  Save as SaveIcon,
  Warning as WarningIcon,
  CheckCircle as CheckIcon,
  ArrowBack as ArrowBackIcon,
  LocalShipping as TruckIcon,
} from "@mui/icons-material";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { apiClient } from "@/lib/api";
import toast from "react-hot-toast";
import { debounce } from "lodash";

interface ReqItem {
  requisition_scheduling_id: string;
  requisition_detail_id: string;
  requisition_id: string;
  requisition_no: string;
  requisition_date: string;
  sku: string;
  product_name: string;
  dp_price: number;
  pack_size: number;
  unit: string;
  order_qty: number;
  scheduled_qty: number;
  delivered_qty: number;
  remaining_qty: number;
  stock_available: number;
  stock_total: number;
  stock_blocked: number;
  selected?: boolean;
  delivery_qty: number;
}

interface DepotGroup {
  requesting_depot_id: string;
  requesting_depot_name: string;
  requesting_depot_code: string;
  requesting_depot_address: string;
  requesting_depot_phone: string;
  items: ReqItem[];
}

interface StockValidation {
  sku: string;
  product_name: string;
  required: number;
  available: number;
  blocked: number;
  remaining: number;
  has_stock: boolean;
  message: string;
}

interface VehicleInfo {
  vehicle_no: string;
  driver_name: string;
  driver_phone: string;
}

export default function CreateReqLoadSheetPage() {
  const router = useRouter();
  const { user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [depotGroups, setDepotGroups] = useState<DepotGroup[]>([]);
  const [vehicleInfo, setVehicleInfo] = useState<VehicleInfo>({
    vehicle_no: "",
    driver_name: "",
    driver_phone: "",
  });
  const [deliveryDate, setDeliveryDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [notes, setNotes] = useState("");
  const [stockValidation, setStockValidation] = useState<StockValidation[]>([]);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [expandedDepot, setExpandedDepot] = useState<string | false>(false);

  useEffect(() => {
    loadApprovedReqItems();
  }, []);

  const loadApprovedReqItems = async () => {
    try {
      setLoading(true);
      const response = await apiClient.get(
        "/inventory/req-load-sheets/approved-req-items"
      );

      if (response.success) {
        const groups: DepotGroup[] = response.data.map((depot: DepotGroup) => ({
          ...depot,
          items: depot.items.map((item) => ({
            ...item,
            selected: false,
            delivery_qty: item.remaining_qty,
          })),
        }));

        setDepotGroups(groups);

        // Auto-expand first depot if only one
        if (groups.length === 1) {
          setExpandedDepot(groups[0].requesting_depot_id);
        }
      }
    } catch (error: any) {
      console.error("Error loading approved requisition items:", error);
      toast.error(error.message || "Failed to load requisition items");
    } finally {
      setLoading(false);
    }
  };

  // Debounced stock validation
  const validateStockDebounced = useCallback(
    debounce(async (groups: DepotGroup[]) => {
      const selectedItems = groups
        .flatMap((depot) =>
          depot.items
            .filter((item) => item.selected && item.delivery_qty > 0)
            .map((item) => ({
              sku: item.sku,
              delivery_qty: item.delivery_qty,
            }))
        );

      if (selectedItems.length === 0) {
        setStockValidation([]);
        setValidationErrors([]);
        return;
      }

      try {
        const response = await apiClient.post(
          "/inventory/req-load-sheets/validate-stock",
          {
            items: selectedItems,
          }
        );

        if (response.success) {
          setStockValidation(response.validation);
          if (response.has_issues) {
            const errors = response.validation
              .filter((v: StockValidation) => !v.has_stock)
              .map((v: StockValidation) => `${v.sku}: ${v.message}`);
            setValidationErrors(errors);
          } else {
            setValidationErrors([]);
          }
        }
      } catch (error: any) {
        console.error("Error validating stock:", error);
      }
    }, 500),
    []
  );

  useEffect(() => {
    validateStockDebounced(depotGroups);
  }, [depotGroups, validateStockDebounced]);

  const handleSelectItem = (depotId: string, itemIndex: number) => {
    setDepotGroups((prev) =>
      prev.map((depot) => {
        if (depot.requesting_depot_id === depotId) {
          return {
            ...depot,
            items: depot.items.map((item, idx) =>
              idx === itemIndex ? { ...item, selected: !item.selected } : item
            ),
          };
        }
        return depot;
      })
    );
  };

  const handleSelectAllDepot = (depotId: string, checked: boolean) => {
    setDepotGroups((prev) =>
      prev.map((depot) => {
        if (depot.requesting_depot_id === depotId) {
          return {
            ...depot,
            items: depot.items.map((item) => ({ ...item, selected: checked })),
          };
        }
        return depot;
      })
    );
  };

  const handleDeliveryQtyChange = (
    depotId: string,
    itemIndex: number,
    value: number
  ) => {
    setDepotGroups((prev) =>
      prev.map((depot) => {
        if (depot.requesting_depot_id === depotId) {
          return {
            ...depot,
            items: depot.items.map((item, idx) =>
              idx === itemIndex
                ? {
                    ...item,
                    delivery_qty: Math.max(
                      0,
                      Math.min(value, item.remaining_qty)
                    ),
                  }
                : item
            ),
          };
        }
        return depot;
      })
    );
  };

  const handleSubmit = async () => {
    // Validation
    if (!vehicleInfo.vehicle_no || !vehicleInfo.driver_name || !vehicleInfo.driver_phone) {
      toast.error("Please fill in all vehicle information");
      return;
    }

    if (!deliveryDate) {
      toast.error("Please select delivery date");
      return;
    }

    // Check if any items selected
    const selectedGroups = depotGroups.filter((depot) =>
      depot.items.some((item) => item.selected && item.delivery_qty > 0)
    );

    if (selectedGroups.length === 0) {
      toast.error("Please select at least one item");
      return;
    }

    if (validationErrors.length > 0) {
      toast.error("Please resolve stock validation errors");
      return;
    }

    setSubmitting(true);

    try {
      // Create load sheets for each depot group
      const promises = selectedGroups.map((depot) => {
        const items = depot.items
          .filter((item) => item.selected && item.delivery_qty > 0)
          .map((item) => ({
            requisition_detail_id: item.requisition_detail_id,
            delivery_qty: item.delivery_qty,
          }));

        return apiClient.post("/inventory/req-load-sheets", {
          requesting_depot_id: depot.requesting_depot_id,
          items,
          delivery_date: deliveryDate,
          vehicle_info: vehicleInfo,
          notes,
        });
      });

      const results = await Promise.all(promises);

      toast.success(`${results.length} load sheet(s) created successfully`);
      router.push("/inventory/req-load-sheets");
    } catch (error: any) {
      console.error("Error creating load sheets:", error);
      toast.error(error.message || "Failed to create load sheets");
    } finally {
      setSubmitting(false);
    }
  };

  const getSelectedCount = (depot: DepotGroup) => {
    return depot.items.filter((item) => item.selected && item.delivery_qty > 0)
      .length;
  };

  const getTotalDeliveryQty = (depot: DepotGroup) => {
    return depot.items
      .filter((item) => item.selected)
      .reduce((sum, item) => sum + item.delivery_qty, 0);
  };

  if (loading) {
    return (
      <Container maxWidth="xl" sx={{ py: 3 }}>
        <Box
          display="flex"
          justifyContent="center"
          alignItems="center"
          minHeight="60vh"
        >
          <CircularProgress />
        </Box>
      </Container>
    );
  }

  return (
    <Container maxWidth="xl" sx={{ py: { xs: 2, sm: 3 } }}>
      {/* Header */}
      <Stack
        direction={{ xs: "column", sm: "row" }}
        justifyContent="space-between"
        alignItems={{ xs: "flex-start", sm: "center" }}
        spacing={2}
        mb={3}
      >
        <Stack direction="row" spacing={2} alignItems="center">
          <Button
            startIcon={<ArrowBackIcon />}
            onClick={() => router.push("/inventory/req-load-sheets")}
            sx={{ display: { xs: "none", sm: "flex" } }}
          >
            Back
          </Button>
          <Box>
            <Typography variant="h5" fontWeight="600">
              Create Requisition Load Sheet
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Select items and enter delivery details
            </Typography>
          </Box>
        </Stack>
      </Stack>

      {/* Vehicle Info Card */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Stack spacing={2}>
            <Stack direction="row" spacing={1} alignItems="center">
              <TruckIcon color="primary" />
              <Typography variant="h6" fontWeight="600">
                Vehicle & Delivery Information
              </Typography>
            </Stack>

            <Stack
              direction={{ xs: "column", sm: "row" }}
              spacing={2}
            >
              <TextField
                label="Vehicle Number"
                placeholder="e.g., DHK-123456"
                value={vehicleInfo.vehicle_no}
                onChange={(e) =>
                  setVehicleInfo({ ...vehicleInfo, vehicle_no: e.target.value })
                }
                required
                fullWidth
                size="small"
              />
              <TextField
                label="Driver Name"
                placeholder="e.g., John Doe"
                value={vehicleInfo.driver_name}
                onChange={(e) =>
                  setVehicleInfo({ ...vehicleInfo, driver_name: e.target.value })
                }
                required
                fullWidth
                size="small"
              />
              <TextField
                label="Driver Phone"
                placeholder="e.g., 01711-123456"
                value={vehicleInfo.driver_phone}
                onChange={(e) =>
                  setVehicleInfo({
                    ...vehicleInfo,
                    driver_phone: e.target.value,
                  })
                }
                required
                fullWidth
                size="small"
              />
            </Stack>

            <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
              <TextField
                label="Delivery Date"
                type="date"
                value={deliveryDate}
                onChange={(e) => setDeliveryDate(e.target.value)}
                required
                fullWidth
                size="small"
                InputLabelProps={{ shrink: true }}
              />
              <TextField
                label="Notes (Optional)"
                placeholder="Any special instructions..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                fullWidth
                size="small"
                multiline
                rows={1}
              />
            </Stack>
          </Stack>
        </CardContent>
      </Card>

      {/* Stock Validation Alerts */}
      {stockValidation.length > 0 && (
        <Box mb={3}>
          {validationErrors.length > 0 ? (
            <Alert severity="error" icon={<WarningIcon />}>
              <Typography variant="subtitle2" fontWeight="600" gutterBottom>
                Stock Validation Errors
              </Typography>
              {validationErrors.map((error, idx) => (
                <Typography key={idx} variant="body2">
                  • {error}
                </Typography>
              ))}
            </Alert>
          ) : (
            <Alert severity="success" icon={<CheckIcon />}>
              All items have sufficient stock
            </Alert>
          )}
        </Box>
      )}

      {/* Depot Groups */}
      {depotGroups.length === 0 ? (
        <Alert severity="info">
          No approved requisitions available for load sheet creation
        </Alert>
      ) : (
        <Stack spacing={2}>
          {depotGroups.map((depot) => (
            <Accordion
              key={depot.requesting_depot_id}
              expanded={expandedDepot === depot.requesting_depot_id}
              onChange={(_, isExpanded) =>
                setExpandedDepot(isExpanded ? depot.requesting_depot_id : false)
              }
            >
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Stack
                  direction={{ xs: "column", sm: "row" }}
                  spacing={2}
                  alignItems={{ xs: "flex-start", sm: "center" }}
                  width="100%"
                  pr={2}
                >
                  <Box flex={1}>
                    <Typography variant="subtitle1" fontWeight="600">
                      {depot.requesting_depot_name}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {depot.requesting_depot_code} • {depot.items.length}{" "}
                      item(s)
                    </Typography>
                  </Box>

                  {getSelectedCount(depot) > 0 && (
                    <Stack direction="row" spacing={1}>
                      <Chip
                        label={`${getSelectedCount(depot)} selected`}
                        color="primary"
                        size="small"
                      />
                      <Chip
                        label={`Qty: ${getTotalDeliveryQty(depot)}`}
                        color="info"
                        size="small"
                      />
                    </Stack>
                  )}
                </Stack>
              </AccordionSummary>

              <AccordionDetails>
                <Stack spacing={2}>
                  <Stack
                    direction="row"
                    justifyContent="space-between"
                    alignItems="center"
                  >
                    <FormControl size="small" sx={{ minWidth: 120 }}>
                      <Checkbox
                        checked={depot.items.every((item) => item.selected)}
                        indeterminate={
                          depot.items.some((item) => item.selected) &&
                          !depot.items.every((item) => item.selected)
                        }
                        onChange={(e) =>
                          handleSelectAllDepot(
                            depot.requesting_depot_id,
                            e.target.checked
                          )
                        }
                      />
                      <Typography variant="body2" component="span" ml={1}>
                        Select All
                      </Typography>
                    </FormControl>
                  </Stack>

                  <TableContainer component={Paper} variant="outlined">
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell padding="checkbox">Select</TableCell>
                          <TableCell>SKU</TableCell>
                          <TableCell>Product</TableCell>
                          <TableCell align="right">Req. No</TableCell>
                          <TableCell align="right">Remaining</TableCell>
                          <TableCell align="right">Stock</TableCell>
                          <TableCell align="right">Delivery Qty</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {depot.items.map((item, idx) => (
                          <TableRow key={idx} hover>
                            <TableCell padding="checkbox">
                              <Checkbox
                                checked={item.selected || false}
                                onChange={() =>
                                  handleSelectItem(depot.requesting_depot_id, idx)
                                }
                              />
                            </TableCell>
                            <TableCell>
                              <Typography variant="body2" fontWeight="500">
                                {item.sku}
                              </Typography>
                            </TableCell>
                            <TableCell>
                              <Typography variant="body2" noWrap sx={{ maxWidth: 200 }}>
                                {item.product_name}
                              </Typography>
                            </TableCell>
                            <TableCell align="right">
                              <Typography variant="body2">
                                {item.requisition_no}
                              </Typography>
                            </TableCell>
                            <TableCell align="right">
                              <Typography variant="body2">
                                {item.remaining_qty}
                              </Typography>
                            </TableCell>
                            <TableCell align="right">
                              <Chip
                                label={item.stock_available}
                                size="small"
                                color={
                                  item.stock_available >= item.remaining_qty
                                    ? "success"
                                    : "warning"
                                }
                              />
                            </TableCell>
                            <TableCell align="right">
                              <TextField
                                type="number"
                                value={item.delivery_qty}
                                onChange={(e) =>
                                  handleDeliveryQtyChange(
                                    depot.requesting_depot_id,
                                    idx,
                                    parseFloat(e.target.value) || 0
                                  )
                                }
                                disabled={!item.selected}
                                size="small"
                                sx={{ width: 100 }}
                                inputProps={{
                                  min: 0,
                                  max: item.remaining_qty,
                                  step: 1,
                                }}
                              />
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </Stack>
              </AccordionDetails>
            </Accordion>
          ))}
        </Stack>
      )}

      {/* Action Buttons */}
      <Box mt={3}>
        <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
          <Button
            variant="outlined"
            startIcon={<ArrowBackIcon />}
            onClick={() => router.push("/inventory/req-load-sheets")}
            fullWidth={true}
            sx={{ display: { xs: "flex", sm: "none" } }}
          >
            Cancel
          </Button>
          <Button
            variant="contained"
            startIcon={<SaveIcon />}
            onClick={handleSubmit}
            disabled={
              submitting ||
              validationErrors.length > 0 ||
              !vehicleInfo.vehicle_no ||
              !vehicleInfo.driver_name ||
              !vehicleInfo.driver_phone
            }
            fullWidth
          >
            {submitting ? "Creating..." : "Create Load Sheet"}
          </Button>
        </Stack>
      </Box>
    </Container>
  );
}
