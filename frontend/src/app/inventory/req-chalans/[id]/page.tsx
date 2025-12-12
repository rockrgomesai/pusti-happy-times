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
import {
  ArrowBack as BackIcon,
  Print as PrintIcon,
  CheckCircle as ReceiveIcon,
} from "@mui/icons-material";
import toast from "react-hot-toast";
import apiClient from "@/lib/apiClient";
import { useAuth } from "@/contexts/AuthContext";

interface Chalan {
  _id: string;
  chalan_no: string;
  status: string;
  copy_number: number;
  source_depot_id: {
    name: string;
    code: string;
    address?: string;
    phone?: string;
  };
  requesting_depot_id: {
    _id: string;
    name: string;
    code: string;
    address?: string;
    phone?: string;
  };
  load_sheet_id?: {
    load_sheet_number: string;
    delivery_date?: string;
  };
  chalan_date: string;
  items: Array<{
    sku: string;
    erp_item_id: string;
    product_name: string;
    qty_ctn: number;
    received_qty_ctn?: number;
    damage_qty_ctn?: number;
  }>;
  copies?: Array<{
    _id: string;
    chalan_no: string;
    copy_number: number;
    status: string;
  }>;
  created_by?: {
    name: string;
  };
  received_by?: {
    name: string;
  };
  received_at?: string;
}

const statusColors: Record<string, "default" | "warning" | "success"> = {
  Generated: "default",
  "Partially Received": "warning",
  Received: "success",
};

export default function ChalanDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const id = params.id as string;

  const [chalan, setChalan] = useState<Chalan | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchChalan = async () => {
    try {
      setLoading(true);
      const response = await apiClient.get(
        `/inventory/req-chalans/${id}?include_copies=true`
      );

      if (response.data.success) {
        setChalan(response.data.data);
      }
    } catch (error: any) {
      console.error("Error fetching chalan:", error);
      toast.error(error.response?.data?.message || "Failed to fetch chalan");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchChalan();
  }, [id]);

  const handlePrint = () => {
    window.print();
  };

  const isRequestingDepot =
    user?.facility_id === chalan?.requesting_depot_id._id;
  const canReceive = isRequestingDepot && chalan?.status !== "Received";

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

  if (!chalan) {
    return (
      <Box sx={{ p: 3 }}>
        <Typography>Chalan not found</Typography>
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
              Requisition Chalan
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {chalan.chalan_no} (Copy {chalan.copy_number} of 4)
            </Typography>
          </Box>

          <Stack direction="row" spacing={1}>
            <Chip label={chalan.status} color={statusColors[chalan.status]} />
            <Button variant="outlined" startIcon={<PrintIcon />} onClick={handlePrint}>
              Print
            </Button>
            {canReceive && (
              <Button
                variant="contained"
                startIcon={<ReceiveIcon />}
                onClick={() => router.push(`/inventory/req-chalans/${id}/receive`)}
                color="success"
              >
                Receive
              </Button>
            )}
          </Stack>
        </Stack>

        <Divider sx={{ mb: 3 }} />

        {chalan.copies && chalan.copies.length > 1 && (
          <Alert severity="info" sx={{ mb: 3 }} className="no-print">
            <Typography variant="body2" fontWeight="600" gutterBottom>
              4 Physical Copies:
            </Typography>
            <Stack direction="row" spacing={1} flexWrap="wrap">
              {chalan.copies.map((copy) => (
                <Button
                  key={copy._id}
                  size="small"
                  variant={copy._id === id ? "contained" : "outlined"}
                  onClick={() => router.push(`/inventory/req-chalans/${copy._id}`)}
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
                  {chalan.source_depot_id.name}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {chalan.source_depot_id.code}
                </Typography>
                {chalan.source_depot_id.address && (
                  <Typography variant="body2" sx={{ mt: 1 }}>
                    {chalan.source_depot_id.address}
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
                  {chalan.requesting_depot_id.name}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {chalan.requesting_depot_id.code}
                </Typography>
                {chalan.requesting_depot_id.address && (
                  <Typography variant="body2" sx={{ mt: 1 }}>
                    {chalan.requesting_depot_id.address}
                  </Typography>
                )}
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={4}>
            <Typography variant="body2" color="text.secondary">
              Chalan Date
            </Typography>
            <Typography variant="body1" fontWeight="600">
              {new Date(chalan.chalan_date).toLocaleDateString()}
            </Typography>
          </Grid>

          <Grid item xs={12} md={4}>
            <Typography variant="body2" color="text.secondary">
              Load Sheet Number
            </Typography>
            <Typography variant="body1" fontWeight="600">
              {chalan.load_sheet_id?.load_sheet_number || "-"}
            </Typography>
          </Grid>

          <Grid item xs={12} md={4}>
            <Typography variant="body2" color="text.secondary">
              Delivery Date
            </Typography>
            <Typography variant="body1" fontWeight="600">
              {chalan.load_sheet_id?.delivery_date
                ? new Date(chalan.load_sheet_id.delivery_date).toLocaleDateString()
                : "-"}
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
                  Sent Qty (CTN)
                </TableCell>
                {chalan.status !== "Generated" && (
                  <>
                    <TableCell sx={{ fontWeight: 600 }} align="right">
                      Received (CTN)
                    </TableCell>
                    <TableCell sx={{ fontWeight: 600 }} align="right">
                      Damage (CTN)
                    </TableCell>
                  </>
                )}
              </TableRow>
            </TableHead>
            <TableBody>
              {chalan.items.map((item, index) => (
                <TableRow key={index}>
                  <TableCell>{index + 1}</TableCell>
                  <TableCell>{item.sku}</TableCell>
                  <TableCell>{item.erp_item_id}</TableCell>
                  <TableCell>{item.product_name}</TableCell>
                  <TableCell align="right">{item.qty_ctn}</TableCell>
                  {chalan.status !== "Generated" && (
                    <>
                      <TableCell align="right">
                        {item.received_qty_ctn || 0}
                      </TableCell>
                      <TableCell align="right">
                        {item.damage_qty_ctn || 0}
                      </TableCell>
                    </>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>

        <Divider sx={{ my: 3 }} />

        <Grid container spacing={2}>
          <Grid item xs={12} md={6}>
            <Typography variant="body2" color="text.secondary">
              Created By
            </Typography>
            <Typography variant="body1">
              {chalan.created_by?.name || "System"}
            </Typography>
          </Grid>

          {chalan.received_by && (
            <Grid item xs={12} md={6}>
              <Typography variant="body2" color="text.secondary">
                Received By
              </Typography>
              <Typography variant="body1">
                {chalan.received_by.name} on{" "}
                {chalan.received_at
                  ? new Date(chalan.received_at).toLocaleString()
                  : "-"}
              </Typography>
            </Grid>
          )}
        </Grid>
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
