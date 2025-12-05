"use client";

import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  TextField,
  CircularProgress,
  Chip,
  Stack,
  Divider,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
  AppBar,
  Toolbar,
} from "@mui/material";
import {
  ArrowBack,
  LocalShipping,
  CalendarToday,
  CheckCircle,
  Warning,
} from "@mui/icons-material";
import { apiClient } from "@/lib/api";
import { toast } from "react-hot-toast";

interface ChalanItem {
  sku: string;
  sku_name: string;
  uom: string;
  qty_ctn: number;
  qty_pcs: number;
  do_number: string;
  received_qty_ctn?: number;
  damage_qty_ctn?: number;
  damage_reason?: string;
}

interface Chalan {
  _id: string;
  chalan_no: string;
  chalan_date: string;
  depot_id: {
    _id: string;
    name: string;
    address: string;
  };
  transport_id: {
    _id: string;
    transport: string;
  };
  vehicle_no: string;
  driver_name: string;
  driver_phone: string;
  items: ChalanItem[];
  total_qty_ctn: number;
  total_qty_pcs: number;
  status: string;
  load_sheet_id: {
    load_sheet_number: string;
  };
}

interface ReceivedItem {
  sku: string;
  received_qty_ctn: number;
  received_qty_pcs: number;
  damage_qty_ctn: number;
  damage_qty_pcs: number;
  damage_reason: string;
}

export default function ChalanReceivePage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [chalan, setChalan] = useState<Chalan | null>(null);
  const [receivedItems, setReceivedItems] = useState<ReceivedItem[]>([]);
  const [notes, setNotes] = useState("");
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    fetchChalan();
  }, [id]);

  const fetchChalan = async () => {
    try {
      setLoading(true);
      const response: any = await apiClient.get(`/distributor/chalans/${id}`);

      if (response.success) {
        const chalanData = response.data;
        setChalan(chalanData);

        // Initialize received items with default values
        const initialItems: ReceivedItem[] = chalanData.items.map((item: ChalanItem) => ({
          sku: item.sku,
          received_qty_ctn: item.received_qty_ctn || item.qty_ctn,
          received_qty_pcs: item.received_qty_pcs || item.qty_pcs,
          damage_qty_ctn: item.damage_qty_ctn || 0,
          damage_qty_pcs: item.damage_qty_pcs || 0,
          damage_reason: item.damage_reason || "",
        }));

        setReceivedItems(initialItems);
      }
    } catch (error: any) {
      console.error("Error fetching chalan:", error);
      toast.error(error.response?.data?.message || "Failed to load chalan");
    } finally {
      setLoading(false);
    }
  };

  const handleItemChange = (
    sku: string,
    field: keyof ReceivedItem,
    value: number | string
  ) => {
    setReceivedItems((prev) =>
      prev.map((item) =>
        item.sku === sku ? { ...item, [field]: value } : item
      )
    );

    // Clear validation error for this item
    setValidationErrors((prev) => {
      const newErrors = { ...prev };
      delete newErrors[sku];
      return newErrors;
    });
  };

  const validateItems = (): boolean => {
    if (!chalan) return false;

    const errors: Record<string, string> = {};
    let isValid = true;

    receivedItems.forEach((receivedItem) => {
      const originalItem = chalan.items.find((i) => i.sku === receivedItem.sku);
      if (!originalItem) return;

      const total =
        parseFloat(receivedItem.received_qty_ctn.toString()) +
        parseFloat(receivedItem.damage_qty_ctn.toString());

      if (total > originalItem.qty_ctn) {
        errors[receivedItem.sku] =
          `Total (${total}) exceeds original quantity (${originalItem.qty_ctn})`;
        isValid = false;
      }

      if (receivedItem.received_qty_ctn < 0 || receivedItem.damage_qty_ctn < 0) {
        errors[receivedItem.sku] = "Quantities cannot be negative";
        isValid = false;
      }
    });

    setValidationErrors(errors);
    return isValid;
  };

  const handleSubmit = async () => {
    if (!validateItems()) {
      toast.error("Please fix validation errors");
      return;
    }

    setShowConfirmDialog(true);
  };

  const handleConfirmReceive = async () => {
    try {
      setSubmitting(true);
      setShowConfirmDialog(false);

      const response: any = await apiClient.post(`/distributor/chalans/${id}/receive`, {
        items: receivedItems,
        notes,
      });

      if (response.success) {
        const totalReceived = receivedItems.reduce(
          (sum, item) => sum + parseFloat(item.received_qty_ctn.toString()),
          0
        );
        const totalDamaged = receivedItems.reduce(
          (sum, item) => sum + parseFloat(item.damage_qty_ctn.toString()),
          0
        );

        toast.success(
          `Chalan received! ${totalReceived} cartons added to inventory` +
            (totalDamaged > 0 ? `, ${totalDamaged} cartons damaged` : ""),
          { duration: 5000 }
        );

        // Navigate back to list after short delay
        setTimeout(() => {
          router.push("/distributor/chalans");
        }, 1500);
      }
    } catch (error: any) {
      console.error("Error receiving chalan:", error);
      toast.error(error.response?.data?.message || "Failed to receive chalan");
    } finally {
      setSubmitting(false);
    }
  };

  const calculateTotals = () => {
    const originalTotal = chalan?.total_qty_ctn || 0;
    const receivedTotal = receivedItems.reduce(
      (sum, item) => sum + parseFloat(item.received_qty_ctn.toString()),
      0
    );
    const damagedTotal = receivedItems.reduce(
      (sum, item) => sum + parseFloat(item.damage_qty_ctn.toString()),
      0
    );

    return { originalTotal, receivedTotal, damagedTotal };
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

  const totals = calculateTotals();
  const isAlreadyReceived = chalan?.status === "Received";

  if (loading) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", py: 8 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (!chalan) {
    return (
      <Box sx={{ textAlign: "center", py: 8 }}>
        <Typography variant="h6" color="error">
          Chalan not found
        </Typography>
        <Button onClick={() => router.back()} sx={{ mt: 2 }}>
          Go Back
        </Button>
      </Box>
    );
  }

  return (
    <Box sx={{ pb: 10, minHeight: "100vh", bgcolor: "grey.50" }}>
      {/* Sticky Header */}
      <AppBar position="sticky" sx={{ bgcolor: "white", color: "text.primary" }}>
        <Toolbar>
          <IconButton edge="start" onClick={() => router.back()} sx={{ mr: 2 }}>
            <ArrowBack />
          </IconButton>
          <Box sx={{ flexGrow: 1 }}>
            <Typography variant="h6" fontWeight="bold">
              {chalan.chalan_no}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {formatDate(chalan.chalan_date)}
            </Typography>
          </Box>
          <Chip label={chalan.status} color={getStatusColor(chalan.status)} size="small" />
        </Toolbar>
      </AppBar>

      <Box sx={{ p: 2 }}>
        {/* Warning for Already Received */}
        {isAlreadyReceived && (
          <Alert severity="info" sx={{ mb: 2 }}>
            This chalan has already been received and cannot be modified.
          </Alert>
        )}

        {/* Depot Info Card */}
        <Card sx={{ mb: 2 }}>
          <CardContent>
            <Typography variant="subtitle2" color="text.secondary" gutterBottom>
              FROM DEPOT
            </Typography>
            <Typography variant="h6" fontWeight="bold">
              {chalan.depot_id.name}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {chalan.depot_id.address}
            </Typography>
          </CardContent>
        </Card>

        {/* Transport Info Card */}
        <Card sx={{ mb: 2 }}>
          <CardContent>
            <Typography variant="subtitle2" color="text.secondary" gutterBottom>
              TRANSPORT DETAILS
            </Typography>
            <Stack spacing={1}>
              <Box sx={{ display: "flex", alignItems: "center" }}>
                <LocalShipping sx={{ mr: 1, color: "text.secondary" }} />
                <Typography variant="body2">{chalan.transport_id.transport}</Typography>
              </Box>
              <Typography variant="body2">
                <strong>Vehicle:</strong> {chalan.vehicle_no}
              </Typography>
              {chalan.driver_name && (
                <>
                  <Typography variant="body2">
                    <strong>Driver:</strong> {chalan.driver_name}
                  </Typography>
                  <Typography variant="body2">
                    <strong>Phone:</strong> {chalan.driver_phone}
                  </Typography>
                </>
              )}
              {chalan.load_sheet_id && (
                <Typography variant="body2">
                  <strong>Load Sheet:</strong> {chalan.load_sheet_id.load_sheet_number}
                </Typography>
              )}
            </Stack>
          </CardContent>
        </Card>

        {/* Items List */}
        <Typography variant="h6" fontWeight="bold" sx={{ mb: 2 }}>
          Items ({chalan.items.length})
        </Typography>

        <Stack spacing={2} sx={{ mb: 2 }}>
          {chalan.items.map((item, index) => {
            const receivedItem = receivedItems.find((r) => r.sku === item.sku);
            const hasError = validationErrors[item.sku];

            return (
              <Card
                key={item.sku}
                sx={{
                  borderLeft: hasError ? 3 : 0,
                  borderColor: "error.main",
                }}
              >
                <CardContent>
                  {/* Item Header */}
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="subtitle1" fontWeight="bold">
                      {item.sku_name}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      SKU: {item.sku} | DO: {item.do_number}
                    </Typography>
                  </Box>

                  {/* Original Quantity */}
                  <Box
                    sx={{
                      display: "flex",
                      gap: 2,
                      mb: 2,
                      p: 1.5,
                      bgcolor: "grey.100",
                      borderRadius: 1,
                    }}
                  >
                    <Box>
                      <Typography variant="caption" color="text.secondary">
                        Original Cartons
                      </Typography>
                      <Typography variant="h6" fontWeight="bold">
                        {item.qty_ctn}
                      </Typography>
                    </Box>
                    <Box>
                      <Typography variant="caption" color="text.secondary">
                        Original Pieces
                      </Typography>
                      <Typography variant="h6" fontWeight="bold">
                        {item.qty_pcs}
                      </Typography>
                    </Box>
                  </Box>

                  {!isAlreadyReceived && receivedItem && (
                    <>
                      {/* Received Quantity Inputs */}
                      <Typography variant="subtitle2" gutterBottom>
                        Received Quantities
                      </Typography>
                      <Stack direction="row" spacing={1} sx={{ mb: 2 }}>
                        <TextField
                          label="Cartons"
                          type="number"
                          size="small"
                          value={receivedItem.received_qty_ctn}
                          onChange={(e) =>
                            handleItemChange(
                              item.sku,
                              "received_qty_ctn",
                              parseFloat(e.target.value) || 0
                            )
                          }
                          inputProps={{ min: 0, max: item.qty_ctn, step: 0.01 }}
                          fullWidth
                        />
                        <TextField
                          label="Pieces"
                          type="number"
                          size="small"
                          value={receivedItem.received_qty_pcs}
                          onChange={(e) =>
                            handleItemChange(
                              item.sku,
                              "received_qty_pcs",
                              parseFloat(e.target.value) || 0
                            )
                          }
                          inputProps={{ min: 0, step: 1 }}
                          fullWidth
                        />
                      </Stack>

                      {/* Damage Quantity Inputs */}
                      <Typography variant="subtitle2" gutterBottom>
                        Damaged Quantities
                      </Typography>
                      <Stack direction="row" spacing={1} sx={{ mb: 2 }}>
                        <TextField
                          label="Damaged Cartons"
                          type="number"
                          size="small"
                          value={receivedItem.damage_qty_ctn}
                          onChange={(e) =>
                            handleItemChange(
                              item.sku,
                              "damage_qty_ctn",
                              parseFloat(e.target.value) || 0
                            )
                          }
                          inputProps={{ min: 0, max: item.qty_ctn, step: 0.01 }}
                          fullWidth
                        />
                        <TextField
                          label="Damaged Pieces"
                          type="number"
                          size="small"
                          value={receivedItem.damage_qty_pcs}
                          onChange={(e) =>
                            handleItemChange(
                              item.sku,
                              "damage_qty_pcs",
                              parseFloat(e.target.value) || 0
                            )
                          }
                          inputProps={{ min: 0, step: 1 }}
                          fullWidth
                        />
                      </Stack>

                      {/* Damage Reason */}
                      {receivedItem.damage_qty_ctn > 0 && (
                        <TextField
                          label="Damage Reason"
                          multiline
                          rows={2}
                          size="small"
                          value={receivedItem.damage_reason}
                          onChange={(e) =>
                            handleItemChange(item.sku, "damage_reason", e.target.value)
                          }
                          placeholder="Describe the damage..."
                          fullWidth
                        />
                      )}

                      {/* Validation Error */}
                      {hasError && (
                        <Alert severity="error" sx={{ mt: 1 }}>
                          {hasError}
                        </Alert>
                      )}
                    </>
                  )}

                  {/* Already Received - Show Received Quantities */}
                  {isAlreadyReceived && (
                    <Box sx={{ mt: 2 }}>
                      <Divider sx={{ mb: 2 }} />
                      <Stack spacing={1}>
                        <Typography variant="body2">
                          <strong>Received:</strong> {item.received_qty_ctn || 0} cartons
                        </Typography>
                        {(item.damage_qty_ctn || 0) > 0 && (
                          <>
                            <Typography variant="body2" color="error">
                              <strong>Damaged:</strong> {item.damage_qty_ctn} cartons
                            </Typography>
                            {item.damage_reason && (
                              <Typography variant="caption" color="text.secondary">
                                Reason: {item.damage_reason}
                              </Typography>
                            )}
                          </>
                        )}
                      </Stack>
                    </Box>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </Stack>

        {/* Notes Section */}
        {!isAlreadyReceived && (
          <Card sx={{ mb: 2 }}>
            <CardContent>
              <TextField
                label="Additional Notes"
                multiline
                rows={3}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Add any additional notes about this chalan..."
                fullWidth
              />
            </CardContent>
          </Card>
        )}

        {/* Totals Summary */}
        <Card sx={{ mb: 2 }}>
          <CardContent>
            <Typography variant="h6" fontWeight="bold" gutterBottom>
              Summary
            </Typography>
            <Stack spacing={1}>
              <Box sx={{ display: "flex", justifyContent: "space-between" }}>
                <Typography variant="body2">Original Total:</Typography>
                <Typography variant="body2" fontWeight="bold">
                  {totals.originalTotal} cartons
                </Typography>
              </Box>
              <Box sx={{ display: "flex", justifyContent: "space-between" }}>
                <Typography variant="body2" color="success.main">
                  Received Total:
                </Typography>
                <Typography variant="body2" fontWeight="bold" color="success.main">
                  {totals.receivedTotal} cartons
                </Typography>
              </Box>
              {totals.damagedTotal > 0 && (
                <Box sx={{ display: "flex", justifyContent: "space-between" }}>
                  <Typography variant="body2" color="error.main">
                    Damaged Total:
                  </Typography>
                  <Typography variant="body2" fontWeight="bold" color="error.main">
                    {totals.damagedTotal} cartons
                  </Typography>
                </Box>
              )}
              <Divider />
              <Box sx={{ display: "flex", justifyContent: "space-between" }}>
                <Typography variant="body1" fontWeight="bold">
                  Net Added to Stock:
                </Typography>
                <Typography variant="body1" fontWeight="bold" color="primary.main">
                  {totals.receivedTotal} cartons
                </Typography>
              </Box>
            </Stack>
          </CardContent>
        </Card>
      </Box>

      {/* Bottom Action Bar */}
      {!isAlreadyReceived && (
        <Box
          sx={{
            position: "fixed",
            bottom: 0,
            left: 0,
            right: 0,
            p: 2,
            bgcolor: "white",
            borderTop: 1,
            borderColor: "divider",
          }}
        >
          <Button
            variant="contained"
            size="large"
            fullWidth
            onClick={handleSubmit}
            disabled={submitting || Object.keys(validationErrors).length > 0}
            startIcon={submitting ? <CircularProgress size={20} /> : <CheckCircle />}
            sx={{ minHeight: 48 }}
          >
            {submitting ? "Receiving..." : "Receive Chalan"}
          </Button>
        </Box>
      )}

      {/* Confirmation Dialog */}
      <Dialog open={showConfirmDialog} onClose={() => setShowConfirmDialog(false)}>
        <DialogTitle>Confirm Chalan Receipt</DialogTitle>
        <DialogContent>
          <Typography gutterBottom>
            You are about to receive this chalan with the following quantities:
          </Typography>
          <Box sx={{ my: 2, p: 2, bgcolor: "grey.100", borderRadius: 1 }}>
            <Typography variant="body2">
              <strong>Received:</strong> {totals.receivedTotal} cartons
            </Typography>
            {totals.damagedTotal > 0 && (
              <Typography variant="body2" color="error">
                <strong>Damaged:</strong> {totals.damagedTotal} cartons
              </Typography>
            )}
          </Box>
          <Alert severity="warning" sx={{ mt: 2 }}>
            This action cannot be undone. Please verify all quantities are correct.
          </Alert>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowConfirmDialog(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleConfirmReceive} autoFocus>
            Confirm & Receive
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
