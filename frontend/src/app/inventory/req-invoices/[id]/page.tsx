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
  Alert,
} from "@mui/material";
import { ArrowBack as BackIcon, Print as PrintIcon } from "@mui/icons-material";
import toast from "react-hot-toast";
import { apiClient } from "@/lib/api";

interface Invoice {
  _id: string;
  invoice_no: string;
  status: string;
  copy_number: number;
  source_depot_id: {
    name: string;
    code: string;
    address?: string;
    phone?: string;
  };
  requesting_depot_id: {
    name: string;
    code: string;
    address?: string;
    phone?: string;
  };
  load_sheet_id?: {
    load_sheet_number: string;
  };
  chalan_id?: {
    chalan_no: string;
  };
  invoice_date: string;
  items: Array<{
    sku: string;
    erp_item_id: string;
    product_name: string;
    qty_ctn: number;
    dp_price: number;
    amount: number;
  }>;
  subtotal: number;
  tax_amount?: number;
  total_amount: number;
  copies?: Array<{
    _id: string;
    invoice_no: string;
    copy_number: number;
    status: string;
  }>;
  created_by?: {
    name: string;
  };
}

export default function InvoiceDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchInvoice = async () => {
    try {
      setLoading(true);
      const response = await apiClient.get(
        `/inventory/req-chalans/invoices/${id}?include_copies=true`
      );

      if (response.data.success) {
        setInvoice(response.data.data);
      }
    } catch (error: any) {
      console.error("Error fetching invoice:", error);
      toast.error(error.response?.data?.message || "Failed to fetch invoice");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInvoice();
  }, [id]);

  const handlePrint = () => {
    window.print();
  };

  if (loading) {
    return (
      <Box
        sx={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          minHeight: "60vh",
        }}
      >
        <CircularProgress />
      </Box>
    );
  }

  if (!invoice) {
    return (
      <Box sx={{ p: 3 }}>
        <Typography>Invoice not found</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ p: { xs: 2, sm: 3 } }} className="print-container">
      <Paper sx={{ p: { xs: 2, sm: 3 } }}>
        <Stack
          direction={{ xs: "column", sm: "row" }}
          justifyContent="space-between"
          alignItems={{ xs: "flex-start", sm: "center" }}
          spacing={2}
          mb={3}
          className="no-print"
        >
          <Box>
            <Button startIcon={<BackIcon />} onClick={() => router.back()} sx={{ mb: 1 }}>
              Back
            </Button>
            <Typography variant="h5" fontWeight="600">
              Requisition Invoice
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {invoice.invoice_no} (Copy {invoice.copy_number} of 4)
            </Typography>
          </Box>

          <Stack direction="row" spacing={1}>
            <Button variant="outlined" startIcon={<PrintIcon />} onClick={handlePrint}>
              Print
            </Button>
          </Stack>
        </Stack>

        <Divider sx={{ mb: 3 }} />

        {invoice.copies && invoice.copies.length > 1 && (
          <Alert severity="info" sx={{ mb: 3 }} className="no-print">
            <Typography variant="body2" fontWeight="600" gutterBottom>
              4 Physical Copies:
            </Typography>
            <Stack direction="row" spacing={1} flexWrap="wrap">
              {invoice.copies.map((copy) => (
                <Button
                  key={copy._id}
                  size="small"
                  variant={copy._id === id ? "contained" : "outlined"}
                  onClick={() => router.push(`/inventory/req-invoices/${copy._id}`)}
                >
                  Copy {copy.copy_number}
                </Button>
              ))}
            </Stack>
          </Alert>
        )}

        <Grid container spacing={3} mb={3}>
          <Grid item xs={12} md={6}>
            <Card variant="outlined">
              <CardContent>
                <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                  From (Source Depot)
                </Typography>
                <Typography variant="h6" fontWeight="600">
                  {invoice.source_depot_id.name}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {invoice.source_depot_id.code}
                </Typography>
                {invoice.source_depot_id.address && (
                  <Typography variant="body2" sx={{ mt: 1 }}>
                    {invoice.source_depot_id.address}
                  </Typography>
                )}
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={6}>
            <Card variant="outlined">
              <CardContent>
                <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                  To (Requesting Depot)
                </Typography>
                <Typography variant="h6" fontWeight="600">
                  {invoice.requesting_depot_id.name}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {invoice.requesting_depot_id.code}
                </Typography>
                {invoice.requesting_depot_id.address && (
                  <Typography variant="body2" sx={{ mt: 1 }}>
                    {invoice.requesting_depot_id.address}
                  </Typography>
                )}
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={4}>
            <Typography variant="body2" color="text.secondary">
              Invoice Date
            </Typography>
            <Typography variant="body1" fontWeight="600">
              {new Date(invoice.invoice_date).toLocaleDateString()}
            </Typography>
          </Grid>

          <Grid item xs={12} md={4}>
            <Typography variant="body2" color="text.secondary">
              Load Sheet Number
            </Typography>
            <Typography variant="body1" fontWeight="600">
              {invoice.load_sheet_id?.load_sheet_number || "-"}
            </Typography>
          </Grid>

          <Grid item xs={12} md={4}>
            <Typography variant="body2" color="text.secondary">
              Chalan Number
            </Typography>
            <Typography variant="body1" fontWeight="600">
              {invoice.chalan_id?.chalan_no || "-"}
            </Typography>
          </Grid>
        </Grid>

        <Divider sx={{ mb: 3 }} />

        <Typography variant="h6" fontWeight="600" mb={2}>
          Items
        </Typography>

        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell sx={{ fontWeight: 600 }}>#</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>SKU</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>ERP ID</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Product Name</TableCell>
                <TableCell sx={{ fontWeight: 600 }} align="right">
                  Qty (CTN)
                </TableCell>
                <TableCell sx={{ fontWeight: 600 }} align="right">
                  DP Price
                </TableCell>
                <TableCell sx={{ fontWeight: 600 }} align="right">
                  Amount
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {invoice.items.map((item, index) => (
                <TableRow key={index}>
                  <TableCell>{index + 1}</TableCell>
                  <TableCell>{item.sku}</TableCell>
                  <TableCell>{item.erp_item_id}</TableCell>
                  <TableCell>{item.product_name}</TableCell>
                  <TableCell align="right">{item.qty_ctn}</TableCell>
                  <TableCell align="right">৳ {item.dp_price.toLocaleString()}</TableCell>
                  <TableCell align="right">৳ {item.amount.toLocaleString()}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>

        <Divider sx={{ my: 3 }} />

        <Stack direction="row" justifyContent="flex-end" spacing={3}>
          <Box sx={{ minWidth: 300 }}>
            <Stack spacing={1}>
              <Stack direction="row" justifyContent="space-between">
                <Typography variant="body1">Subtotal:</Typography>
                <Typography variant="body1" fontWeight="600">
                  ৳ {invoice.subtotal.toLocaleString()}
                </Typography>
              </Stack>

              {invoice.tax_amount && invoice.tax_amount > 0 && (
                <Stack direction="row" justifyContent="space-between">
                  <Typography variant="body1">Tax:</Typography>
                  <Typography variant="body1" fontWeight="600">
                    ৳ {invoice.tax_amount.toLocaleString()}
                  </Typography>
                </Stack>
              )}

              <Divider />

              <Stack direction="row" justifyContent="space-between">
                <Typography variant="h6" fontWeight="600">
                  Total:
                </Typography>
                <Typography variant="h6" fontWeight="600" color="primary">
                  ৳ {invoice.total_amount.toLocaleString()}
                </Typography>
              </Stack>
            </Stack>
          </Box>
        </Stack>

        <Divider sx={{ my: 3 }} />

        <Typography variant="body2" color="text.secondary">
          Created By: {invoice.created_by?.name || "System"}
        </Typography>
      </Paper>

      <style jsx global>{`
        @media print {
          .no-print {
            display: none !important;
          }
          .print-container {
            padding: 0 !important;
          }
        }
      `}</style>
    </Box>
  );
}
