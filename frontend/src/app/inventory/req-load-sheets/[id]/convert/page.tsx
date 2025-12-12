"use client";

import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  Box,
  Paper,
  Typography,
  Button,
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
  Alert,
  Accordion,
  AccordionSummary,
  AccordionDetails,
} from "@mui/material";
import {
  ArrowBack as BackIcon,
  LocalShipping as ConvertIcon,
  ExpandMore as ExpandMoreIcon,
  Warning as WarningIcon,
} from "@mui/icons-material";
import toast from "react-hot-toast";
import apiClient from "@/lib/apiClient";

interface LoadSheet {
  _id: string;
  load_sheet_number: string;
  status: string;
  source_depot_id: {
    name: string;
    code: string;
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
}

export default function ConvertLoadSheetPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [loadSheet, setLoadSheet] = useState<LoadSheet | null>(null);
  const [loading, setLoading] = useState(true);
  const [converting, setConverting] = useState(false);

  const fetchLoadSheet = async () => {
    try {
      setLoading(true);
      const response = await apiClient.get(`/inventory/req-load-sheets/${id}`);

      if (response.data.success) {
        setLoadSheet(response.data.data);
      }
    } catch (error: any) {
      console.error("Error fetching load sheet:", error);
      toast.error(error.response?.data?.message || "Failed to fetch load sheet");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLoadSheet();
  }, [id]);

  const handleConvert = async () => {
    if (
      !confirm(
        `Convert load sheet ${loadSheet?.load_sheet_number}?\n\nThis will:\n- Create 4 copies of Chalans for each depot\n- Create 4 copies of Invoices for each depot\n- Deduct stock from source depot\n- Lock the load sheet\n\nThis action cannot be undone.`
      )
    ) {
      return;
    }

    try {
      setConverting(true);
      const response = await apiClient.post(`/inventory/req-load-sheets/${id}/convert`);

      if (response.data.success) {
        toast.success(
          `Successfully created ${response.data.data.chalans_created} chalans and ${response.data.data.invoices_created} invoices!`
        );
        router.push("/inventory/req-chalans");
      }
    } catch (error: any) {
      console.error("Error converting load sheet:", error);
      toast.error(error.response?.data?.message || "Failed to convert load sheet");
    } finally {
      setConverting(false);
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

  if (loadSheet.status === "Converted") {
    return (
      <Box sx={{ p: { xs: 2, sm: 3 } }}>
        <Paper sx={{ p: { xs: 2, sm: 3 } }}>
          <Alert severity="info">
            This load sheet has already been converted to chalans and invoices.
          </Alert>
          <Button
            startIcon={<BackIcon />}
            onClick={() => router.push("/inventory/req-chalans")}
            sx={{ mt: 2 }}
          >
            View Chalans & Invoices
          </Button>
        </Paper>
      </Box>
    );
  }

  if (loadSheet.status === "Draft") {
    return (
      <Box sx={{ p: { xs: 2, sm: 3 } }}>
        <Paper sx={{ p: { xs: 2, sm: 3 } }}>
          <Alert severity="warning" icon={<WarningIcon />}>
            This load sheet must be validated before conversion.
          </Alert>
          <Button
            startIcon={<BackIcon />}
            onClick={() => router.push(`/inventory/req-load-sheets/${id}`)}
            sx={{ mt: 2 }}
          >
            Back to Load Sheet
          </Button>
        </Paper>
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
              Convert Load Sheet
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {loadSheet.load_sheet_number}
            </Typography>
          </Box>

          <Chip label={loadSheet.status} color="primary" />
        </Stack>

        <Divider sx={{ mb: 3 }} />

        <Alert severity="info" sx={{ mb: 3 }}>
          <Typography variant="subtitle2" fontWeight="600" gutterBottom>
            Conversion Process
          </Typography>
          <Typography variant="body2">
            This will create 4 physical copies each of:
          </Typography>
          <ul style={{ marginTop: 8, marginBottom: 8 }}>
            <li>Delivery Chalans (quantity-only documents)</li>
            <li>Invoices (pricing documents)</li>
          </ul>
          <Typography variant="body2">
            For each requesting depot: <strong>{loadSheet.requesting_depots.length} depot(s)</strong>
          </Typography>
          <Typography variant="body2" fontWeight="600" sx={{ mt: 1 }}>
            Total documents to be created: {loadSheet.requesting_depots.length * 8} (
            {loadSheet.requesting_depots.length * 4} chalans + {loadSheet.requesting_depots.length * 4}{" "}
            invoices)
          </Typography>
        </Alert>

        <Stack direction={{ xs: "column", sm: "row" }} spacing={2} mb={3}>
          <Box flex={1}>
            <Typography variant="body2" color="text.secondary">
              Source Depot
            </Typography>
            <Typography variant="h6" fontWeight="600">
              {loadSheet.source_depot_id.name}
            </Typography>
          </Box>
          <Box flex={1}>
            <Typography variant="body2" color="text.secondary">
              Delivery Date
            </Typography>
            <Typography variant="h6" fontWeight="600">
              {loadSheet.delivery_date
                ? new Date(loadSheet.delivery_date).toLocaleDateString()
                : "Not set"}
            </Typography>
          </Box>
          <Box flex={1}>
            <Typography variant="body2" color="text.secondary">
              Total Items / Qty
            </Typography>
            <Typography variant="h6" fontWeight="600">
              {getTotalItems()} items / {getTotalQuantity()} CTN
            </Typography>
          </Box>
        </Stack>

        <Divider sx={{ mb: 3 }} />

        <Typography variant="h6" fontWeight="600" mb={2}>
          Items by Requesting Depot
        </Typography>

        {loadSheet.requesting_depots.map((depot, index) => (
          <Accordion key={index} defaultExpanded>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Stack direction="row" spacing={2} alignItems="center">
                <Typography fontWeight="600">{depot.requesting_depot_id.name}</Typography>
                <Chip label={`${depot.items.length} items`} size="small" />
                <Chip
                  label="Will create 4 chalans + 4 invoices"
                  size="small"
                  color="primary"
                  variant="outlined"
                />
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

        <Divider sx={{ my: 3 }} />

        <Alert severity="warning" sx={{ mb: 3 }}>
          <Typography variant="body2" fontWeight="600">
            Important:
          </Typography>
          <Typography variant="body2">
            • Stock will be deducted from source depot inventory
          </Typography>
          <Typography variant="body2">• This action cannot be undone</Typography>
          <Typography variant="body2">
            • Load sheet status will change to "Converted"
          </Typography>
        </Alert>

        <Stack direction="row" spacing={2} justifyContent="flex-end">
          <Button
            variant="outlined"
            onClick={() => router.back()}
            disabled={converting}
          >
            Cancel
          </Button>
          <Button
            variant="contained"
            startIcon={converting ? <CircularProgress size={20} /> : <ConvertIcon />}
            onClick={handleConvert}
            disabled={converting}
            color="primary"
            size="large"
          >
            {converting ? "Converting..." : "Convert to Chalans & Invoices"}
          </Button>
        </Stack>
      </Paper>
    </Box>
  );
}
