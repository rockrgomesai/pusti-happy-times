"use client";

import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  Box,
  Paper,
  Typography,
  Button,
  Grid,
  Divider,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  CircularProgress,
  Stack,
  Card,
  CardContent,
  TextField,
  Accordion,
  AccordionSummary,
  AccordionDetails,
} from "@mui/material";
import {
  ArrowBack as BackIcon,
  CheckCircle as ValidateIcon,
  LocalShipping as ConvertIcon,
  Edit as EditIcon,
  Save as SaveIcon,
  Cancel as CancelIcon,
  ExpandMore as ExpandMoreIcon,
} from "@mui/icons-material";
import toast from "react-hot-toast";
import { apiClient } from "@/lib/api";

interface LoadSheet {
  _id: string;
  load_sheet_number: string;
  status: "Draft" | "Locked" | "Loading" | "Loaded" | "Generated";
  source_depot_id: {
    name: string;
    code: string;
    address?: string;
  };
  requesting_depots: Array<{
    requesting_depot_id: {
      _id: string;
      name: string;
      code: string;
    };
    items: Array<{
      sku: string;
      erp_item_id: string;
      product_name: string;
      qty_ctn: number;
    }>;
  }>;
  delivery_date?: string;
  vehicle_info?: string;
  transport_id?: {
    name: string;
    vehicle_no?: string;
  };
  notes?: string;
  created_at: string;
  created_by?: {
    name: string;
    email: string;
  };
}

const statusColors: Record<string, "default" | "primary" | "warning" | "success" | "info"> = {
  Draft: "default",
  Locked: "primary",
  Loading: "warning",
  Loaded: "info",
  Generated: "success",
};

export default function LoadSheetDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [loadSheet, setLoadSheet] = useState<LoadSheet | null>(null);
  const [loading, setLoading] = useState(true);
  const [editMode, setEditMode] = useState(false);
  const [editData, setEditData] = useState({
    delivery_date: "",
    vehicle_info: "",
    notes: "",
  });

  const fetchLoadSheet = async () => {
    try {
      setLoading(true);
      const response = await apiClient.get(`/inventory/req-load-sheets/${id}`);

      if (response.success) {
        const sheet = response.data;
        setLoadSheet(sheet);
        setEditData({
          delivery_date: sheet.delivery_date
            ? new Date(sheet.delivery_date).toISOString().split("T")[0]
            : "",
          vehicle_info: sheet.vehicle_info || "",
          notes: sheet.notes || "",
        });
      }
    } catch (error: any) {
      console.error("Error fetching load sheet:", error);
      toast.error(error.message || "Failed to fetch load sheet");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLoadSheet();
  }, [id]);

  const handleLock = async () => {
    if (!confirm("Lock this load sheet? This will finalize it for delivery.")) {
      return;
    }

    try {
      const response = await apiClient.post(`/inventory/req-load-sheets/${id}/lock`);
      if (response.success) {
        toast.success("Load sheet locked successfully");
        fetchLoadSheet();
      }
    } catch (error: any) {
      console.error("Error locking load sheet:", error);
      toast.error(error.message || "Failed to lock load sheet");
    }
  };

  const handleGenerateChalans = async () => {
    if (!confirm("Generate chalans and invoices? This action cannot be undone.")) {
      return;
    }

    try {
      const response = await apiClient.post(`/inventory/req-load-sheets/${id}/generate-chalans`);
      if (response.success) {
        toast.success("Chalans and invoices generated successfully");
        fetchLoadSheet();
      }
    } catch (error: any) {
      console.error("Error generating chalans:", error);
      toast.error(error.message || "Failed to generate chalans");
    }
  };

  const handleUpdate = async () => {
    try {
      const response = await apiClient.put(`/inventory/req-load-sheets/${id}`, editData);
      if (response.success) {
        toast.success("Load sheet updated successfully");
        setEditMode(false);
        fetchLoadSheet();
      }
    } catch (error: any) {
      console.error("Error updating load sheet:", error);
      toast.error(error.message || "Failed to update load sheet");
    }
  };

  const getTotalItems = () => {
    if (!loadSheet) return 0;
    return loadSheet.requesting_depots.reduce((sum, depot) => sum + depot.items.length, 0);
  };

  const getTotalQuantity = () => {
    if (!loadSheet) return 0;
    return loadSheet.requesting_depots.reduce(
      (sum, depot) => sum + depot.items.reduce((s, item) => s + item.qty_ctn, 0),
      0
    );
  };

  if (loading) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "60vh" }}>
        <CircularProgress />
      </Box>
    );
  }

  if (!loadSheet) {
    return (
      <Box sx={{ p: 3 }}>
        <Typography>Load sheet not found</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ p: { xs: 2, sm: 3 } }}>
      <Paper sx={{ p: { xs: 2, sm: 3 } }}>
        <Stack
          direction={{ xs: "column", sm: "row" }}
          justifyContent="space-between"
          alignItems={{ xs: "flex-start", sm: "center" }}
          spacing={2}
          mb={3}
        >
          <Box>
            <Button
              startIcon={<BackIcon />}
              onClick={() => router.back()}
              sx={{ mb: 1 }}
            >
              Back
            </Button>
            <Typography variant="h5" fontWeight="600">
              Load Sheet Details
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {loadSheet.load_sheet_number}
            </Typography>
          </Box>

          <Stack direction="row" spacing={1}>
            <Chip
              label={loadSheet.status}
              color={statusColors[loadSheet.status]}
              size="medium"
            />

            {loadSheet.status === "Draft" && !editMode && (
              <>
                <Button
                  variant="outlined"
                  startIcon={<EditIcon />}
                  onClick={() => setEditMode(true)}
                  size="small"
                >
                  Edit
                </Button>
                <Button
                  variant="contained"
                  startIcon={<ValidateIcon />}
                  onClick={handleLock}
                  color="success"
                  size="small"
                >
                  Lock
                </Button>
              </>
            )}

            {editMode && (
              <>
                <Button
                  variant="outlined"
                  startIcon={<CancelIcon />}
                  onClick={() => setEditMode(false)}
                  size="small"
                >
                  Cancel
                </Button>
                <Button
                  variant="contained"
                  startIcon={<SaveIcon />}
                  onClick={handleUpdate}
                  size="small"
                >
                  Save
                </Button>
              </>
            )}

            {(loadSheet.status === "Locked" || loadSheet.status === "Loaded") && (
              <Button
                variant="contained"
                startIcon={<ConvertIcon />}
                onClick={handleGenerateChalans}
                color="primary"
                size="small"
              >
                Generate Chalans
              </Button>
            )}
          </Stack>
        </Stack>

        <Divider sx={{ mb: 3 }} />

        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <Card variant="outlined">
              <CardContent>
                <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                  Source Depot
                </Typography>
                <Typography variant="h6" fontWeight="600">
                  {loadSheet.source_depot_id.name}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {loadSheet.source_depot_id.code}
                </Typography>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={6}>
            <Card variant="outlined">
              <CardContent>
                <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                  Summary
                </Typography>
                <Stack spacing={1}>
                  <Box>
                    <Typography variant="body2" color="text.secondary">
                      Requesting Depots
                    </Typography>
                    <Typography variant="h6" fontWeight="600">
                      {loadSheet.requesting_depots.length}
                    </Typography>
                  </Box>
                  <Box>
                    <Typography variant="body2" color="text.secondary">
                      Total Items / Qty
                    </Typography>
                    <Typography variant="h6" fontWeight="600">
                      {getTotalItems()} items / {getTotalQuantity()} CTN
                    </Typography>
                  </Box>
                </Stack>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={6}>
            {editMode ? (
              <TextField
                fullWidth
                label="Delivery Date"
                type="date"
                value={editData.delivery_date}
                onChange={(e) => setEditData({ ...editData, delivery_date: e.target.value })}
                InputLabelProps={{ shrink: true }}
                size="small"
              />
            ) : (
              <Box>
                <Typography variant="body2" color="text.secondary">
                  Delivery Date
                </Typography>
                <Typography variant="body1">
                  {loadSheet.delivery_date
                    ? new Date(loadSheet.delivery_date).toLocaleDateString()
                    : "Not set"}
                </Typography>
              </Box>
            )}
          </Grid>

          <Grid item xs={12} md={6}>
            {editMode ? (
              <TextField
                fullWidth
                label="Vehicle Info"
                value={editData.vehicle_info}
                onChange={(e) => setEditData({ ...editData, vehicle_info: e.target.value })}
                size="small"
              />
            ) : (
              <Box>
                <Typography variant="body2" color="text.secondary">
                  Vehicle Info
                </Typography>
                <Typography variant="body1">
                  {loadSheet.vehicle_info || loadSheet.transport_id?.vehicle_no || "Not set"}
                </Typography>
              </Box>
            )}
          </Grid>

          <Grid item xs={12}>
            {editMode ? (
              <TextField
                fullWidth
                label="Notes"
                value={editData.notes}
                onChange={(e) => setEditData({ ...editData, notes: e.target.value })}
                multiline
                rows={2}
                size="small"
              />
            ) : (
              <Box>
                <Typography variant="body2" color="text.secondary">
                  Notes
                </Typography>
                <Typography variant="body1">{loadSheet.notes || "No notes"}</Typography>
              </Box>
            )}
          </Grid>

          <Grid item xs={12}>
            <Typography variant="subtitle2" color="text.secondary" gutterBottom>
              Created by {loadSheet.created_by?.name || "Unknown"} on{" "}
              {new Date(loadSheet.created_at).toLocaleString()}
            </Typography>
          </Grid>
        </Grid>

        <Divider sx={{ my: 3 }} />

        <Typography variant="h6" fontWeight="600" mb={2}>
          Items by Requesting Depot
        </Typography>

        {loadSheet.requesting_depots.map((depot, index) => (
          <Accordion key={index} defaultExpanded={index === 0}>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Stack direction="row" spacing={2} alignItems="center">
                <Typography fontWeight="600">{depot.requesting_depot_id.name}</Typography>
                <Chip label={`${depot.items.length} items`} size="small" />
              </Stack>
            </AccordionSummary>
            <AccordionDetails>
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 600 }}>SKU</TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>ERP ID</TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>Product Name</TableCell>
                      <TableCell sx={{ fontWeight: 600 }} align="right">
                        Qty (CTN)
                      </TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {depot.items.map((item, idx) => (
                      <TableRow key={idx}>
                        <TableCell>{item.sku}</TableCell>
                        <TableCell>{item.erp_item_id}</TableCell>
                        <TableCell>{item.product_name}</TableCell>
                        <TableCell align="right">{item.qty_ctn}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </AccordionDetails>
          </Accordion>
        ))}
      </Paper>
    </Box>
  );
}
