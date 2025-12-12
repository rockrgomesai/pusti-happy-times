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
  TextField,
  Alert,
} from "@mui/material";
import {
  ArrowBack as BackIcon,
  CheckCircle as ReceiveIcon,
} from "@mui/icons-material";
import toast from "react-hot-toast";
import apiClient from "@/lib/apiClient";
import { useAuth } from "@/contexts/AuthContext";

interface Chalan {
  _id: string;
  chalan_no: string;
  status: string;
  source_depot_id: {
    name: string;
    code: string;
  };
  requesting_depot_id: {
    _id: string;
    name: string;
    code: string;
  };
  chalan_date: string;
  items: Array<{
    sku: string;
    erp_item_id: string;
    product_name: string;
    qty_ctn: number;
    received_qty_ctn?: number;
  }>;
}

interface ReceiveItem {
  sku: string;
  qty_received_ctn: number;
  damage_qty_ctn: number;
  damage_reason: string;
}

export default function ReceiveChalanPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const id = params.id as string;

  const [chalan, setChalan] = useState<Chalan | null>(null);
  const [loading, setLoading] = useState(true);
  const [receiving, setReceiving] = useState(false);
  const [receiveItems, setReceiveItems] = useState<ReceiveItem[]>([]);
  const [damageNotes, setDamageNotes] = useState("");

  const fetchChalan = async () => {
    try {
      setLoading(true);
      const response = await apiClient.get(`/inventory/req-chalans/${id}`);

      if (response.data.success) {
        const chalanData = response.data.data;
        setChalan(chalanData);

        // Initialize receive items
        const items = chalanData.items.map((item: any) => ({
          sku: item.sku,
          qty_received_ctn: Math.max(
            0,
            item.qty_ctn - (item.received_qty_ctn || 0)
          ), // Remaining qty
          damage_qty_ctn: 0,
          damage_reason: "",
        }));
        setReceiveItems(items);
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

  const handleReceive = async () => {
    if (!chalan) return;

    // Validate
    const hasReceivingQty = receiveItems.some((item) => item.qty_received_ctn > 0);
    if (!hasReceivingQty) {
      toast.error("Please enter receiving quantities");
      return;
    }

    // Filter items with qty > 0
    const itemsToReceive = receiveItems.filter((item) => item.qty_received_ctn > 0);

    if (
      !confirm(
        `Receive ${itemsToReceive.length} items?\n\nThis will update the inventory at your depot.`
      )
    ) {
      return;
    }

    try {
      setReceiving(true);
      const response = await apiClient.post(`/inventory/req-chalans/${id}/receive`, {
        items: itemsToReceive,
        damage_notes: damageNotes,
      });

      if (response.data.success) {
        toast.success(response.data.message);
        router.push(`/inventory/req-chalans/${id}`);
      }
    } catch (error: any) {
      console.error("Error receiving chalan:", error);
      toast.error(error.response?.data?.message || "Failed to receive chalan");
    } finally {
      setReceiving(false);
    }
  };

  const updateReceiveItem = (
    index: number,
    field: keyof ReceiveItem,
    value: string | number
  ) => {
    const updated = [...receiveItems];
    updated[index] = { ...updated[index], [field]: value };
    setReceiveItems(updated);
  };

  const getRemainingQty = (index: number) => {
    if (!chalan) return 0;
    const item = chalan.items[index];
    return item.qty_ctn - (item.received_qty_ctn || 0);
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

  if (!chalan) {
    return (
      <Box sx={{ p: 3 }}>
        <Typography>Chalan not found</Typography>
      </Box>
    );
  }

  if (user?.facility_id !== chalan.requesting_depot_id._id) {
    return (
      <Box sx={{ p: 3 }}>
        <Paper sx={{ p: 3 }}>
          <Alert severity="error">
            Only the requesting depot can receive this chalan.
          </Alert>
          <Button startIcon={<BackIcon />} onClick={() => router.back()} sx={{ mt: 2 }}>
            Back
          </Button>
        </Paper>
      </Box>
    );
  }

  if (chalan.status === "Received") {
    return (
      <Box sx={{ p: 3 }}>
        <Paper sx={{ p: 3 }}>
          <Alert severity="info">This chalan has already been fully received.</Alert>
          <Button startIcon={<BackIcon />} onClick={() => router.back()} sx={{ mt: 2 }}>
            Back
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
            <Button startIcon={<BackIcon />} onClick={() => router.back()} sx={{ mb: 1 }}>
              Back
            </Button>
            <Typography variant="h5" fontWeight="600">
              Receive Chalan
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {chalan.chalan_no}
            </Typography>
          </Box>

          <Chip label={chalan.status} color="warning" />
        </Stack>

        <Divider sx={{ mb: 3 }} />

        <Alert severity="info" sx={{ mb: 3 }}>
          <Typography variant="body2">
            Enter the quantities you are receiving. Partial receiving is supported - you can
            receive remaining items later.
          </Typography>
        </Alert>

        <Stack direction={{ xs: "column", sm: "row" }} spacing={2} mb={3}>
          <Box flex={1}>
            <Typography variant="body2" color="text.secondary">
              From
            </Typography>
            <Typography variant="h6" fontWeight="600">
              {chalan.source_depot_id.name}
            </Typography>
          </Box>
          <Box flex={1}>
            <Typography variant="body2" color="text.secondary">
              Date
            </Typography>
            <Typography variant="h6" fontWeight="600">
              {new Date(chalan.chalan_date).toLocaleDateString()}
            </Typography>
          </Box>
        </Stack>

        <Divider sx={{ mb: 3 }} />

        <Typography variant="h6" fontWeight="600" mb={2}>
          Receiving Items
        </Typography>

        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell sx={{ fontWeight: 600 }}>#</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>SKU</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Product Name</TableCell>
                <TableCell sx={{ fontWeight: 600 }} align="right">
                  Sent Qty
                </TableCell>
                <TableCell sx={{ fontWeight: 600 }} align="right">
                  Already Rcvd
                </TableCell>
                <TableCell sx={{ fontWeight: 600 }} align="right">
                  Remaining
                </TableCell>
                <TableCell sx={{ fontWeight: 600 }} align="right">
                  Receive Qty (CTN)
                </TableCell>
                <TableCell sx={{ fontWeight: 600 }} align="right">
                  Damage (CTN)
                </TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Damage Reason</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {chalan.items.map((item, index) => {
                const remainingQty = getRemainingQty(index);
                return (
                  <TableRow key={index}>
                    <TableCell>{index + 1}</TableCell>
                    <TableCell>{item.sku}</TableCell>
                    <TableCell>{item.product_name}</TableCell>
                    <TableCell align="right">{item.qty_ctn}</TableCell>
                    <TableCell align="right">{item.received_qty_ctn || 0}</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 600 }}>
                      {remainingQty}
                    </TableCell>
                    <TableCell align="right">
                      <TextField
                        type="number"
                        size="small"
                        value={receiveItems[index]?.qty_received_ctn || 0}
                        onChange={(e) =>
                          updateReceiveItem(
                            index,
                            "qty_received_ctn",
                            parseFloat(e.target.value) || 0
                          )
                        }
                        inputProps={{
                          min: 0,
                          max: remainingQty,
                          step: 1,
                        }}
                        sx={{ width: 100 }}
                      />
                    </TableCell>
                    <TableCell align="right">
                      <TextField
                        type="number"
                        size="small"
                        value={receiveItems[index]?.damage_qty_ctn || 0}
                        onChange={(e) =>
                          updateReceiveItem(
                            index,
                            "damage_qty_ctn",
                            parseFloat(e.target.value) || 0
                          )
                        }
                        inputProps={{
                          min: 0,
                          max: receiveItems[index]?.qty_received_ctn || 0,
                          step: 1,
                        }}
                        sx={{ width: 100 }}
                      />
                    </TableCell>
                    <TableCell>
                      {receiveItems[index]?.damage_qty_ctn > 0 && (
                        <TextField
                          size="small"
                          placeholder="Damage reason"
                          value={receiveItems[index]?.damage_reason || ""}
                          onChange={(e) =>
                            updateReceiveItem(index, "damage_reason", e.target.value)
                          }
                          sx={{ width: 200 }}
                        />
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>

        <Divider sx={{ my: 3 }} />

        <TextField
          fullWidth
          label="General Damage Notes (Optional)"
          value={damageNotes}
          onChange={(e) => setDamageNotes(e.target.value)}
          multiline
          rows={2}
          sx={{ mb: 3 }}
        />

        <Stack direction="row" spacing={2} justifyContent="flex-end">
          <Button variant="outlined" onClick={() => router.back()} disabled={receiving}>
            Cancel
          </Button>
          <Button
            variant="contained"
            startIcon={receiving ? <CircularProgress size={20} /> : <ReceiveIcon />}
            onClick={handleReceive}
            disabled={receiving}
            color="success"
            size="large"
          >
            {receiving ? "Receiving..." : "Confirm Receive"}
          </Button>
        </Stack>
      </Paper>
    </Box>
  );
}
