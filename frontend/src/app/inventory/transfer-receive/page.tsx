"use client";

import React, { useState, useEffect } from "react";
import {
  Container,
  Box,
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Button,
  Chip,
  CircularProgress,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Grid as Grid2,
} from "@mui/material";
import {
  CallReceived as CallReceivedIcon,
  CheckCircle as CheckCircleIcon,
} from "@mui/icons-material";
import { formatDateForDisplay } from "@/lib/dateUtils";
import api from "@/lib/api";
import toast from "react-hot-toast";

interface PendingTransfer {
  _id: string;
  transfer_number: string;
  from_depot_id: {
    _id: string;
    name: string;
    code: string;
  };
  transfer_date: string;
  status: string;
  items: Array<{
    sku: string;
    product_name: string;
    product_type: string;
    unit: string;
    qty_sent: number;
    qty_received: number;
  }>;
  notes?: string;
  sent_by: {
    name: string;
  };
}

interface ReceiveQty {
  [sku: string]: number;
}

export default function TransferReceivePage() {
  const [pendingTransfers, setPendingTransfers] = useState<PendingTransfer[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedTransfer, setSelectedTransfer] = useState<PendingTransfer | null>(null);
  const [receiveDialogOpen, setReceiveDialogOpen] = useState(false);
  const [receiveQtys, setReceiveQtys] = useState<ReceiveQty>({});
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadPendingTransfers();
  }, []);

  const loadPendingTransfers = async () => {
    try {
      setLoading(true);
      const response = await api.get("/inventory/depot-transfers/list", {
        params: {
          direction: "received",
          status: "Pending,Partially-Received",
          limit: 100,
        },
      });
      setPendingTransfers(response.data.data || []);
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to load pending transfers");
    } finally {
      setLoading(false);
    }
  };

  const handleOpenReceiveDialog = (transfer: PendingTransfer) => {
    setSelectedTransfer(transfer);
    
    // Initialize receive quantities with remaining qty
    const initialQtys: ReceiveQty = {};
    transfer.items.forEach((item) => {
      const remaining = item.qty_sent - item.qty_received;
      initialQtys[item.sku] = remaining;
    });
    setReceiveQtys(initialQtys);
    
    setReceiveDialogOpen(true);
  };

  const handleReceive = async () => {
    if (!selectedTransfer) return;

    try {
      // Validate at least one item has qty > 0
      const itemsToReceive = Object.entries(receiveQtys).filter(([sku, qty]) => qty > 0);
      if (itemsToReceive.length === 0) {
        toast.error("Please enter at least one quantity to receive");
        return;
      }

      // Validate quantities don't exceed remaining
      const invalidItems = selectedTransfer.items.filter((item) => {
        const remaining = item.qty_sent - item.qty_received;
        const toReceive = receiveQtys[item.sku] || 0;
        return toReceive > remaining;
      });

      if (invalidItems.length > 0) {
        toast.error("Receive quantity cannot exceed remaining quantity");
        return;
      }

      setSubmitting(true);

      const payload = {
        items: itemsToReceive.map(([sku, qty]) => ({
          sku,
          qty_received: qty,
        })),
      };

      await api.post(`/inventory/depot-transfers/${selectedTransfer._id}/receive`, payload);
      
      toast.success("Transfer received successfully!");
      setReceiveDialogOpen(false);
      loadPendingTransfers();
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to receive transfer");
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Pending":
        return "warning";
      case "Partially-Received":
        return "secondary";
      default:
        return "default";
    }
  };

  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" component="h1" fontWeight="bold" gutterBottom>
          <CallReceivedIcon sx={{ mr: 1, verticalAlign: "middle" }} />
          Depot Transfer - Receive
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Receive incoming depot transfers
        </Typography>
      </Box>

      {loading ? (
        <Box display="flex" justifyContent="center" py={4}>
          <CircularProgress />
        </Box>
      ) : pendingTransfers.length === 0 ? (
        <Alert severity="info">No pending incoming transfers</Alert>
      ) : (
        <Grid2 container spacing={3}>
          {pendingTransfers.map((transfer) => (
            <Grid2 key={transfer._id} size={{ xs: 12, md: 6 }}>
              <Paper sx={{ p: 3 }}>
                <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "start", mb: 2 }}>
                  <Box>
                    <Typography variant="h6" gutterBottom>
                      {transfer.transfer_number}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      From: <strong>{transfer.from_depot_id.name}</strong>
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Date: {formatDateForDisplay(transfer.transfer_date)}
                    </Typography>
                  </Box>
                  <Chip
                    label={transfer.status}
                    color={getStatusColor(transfer.status)}
                    size="small"
                  />
                </Box>

                <TableContainer sx={{ mb: 2 }}>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell><strong>SKU</strong></TableCell>
                        <TableCell><strong>Product</strong></TableCell>
                        <TableCell align="right"><strong>Sent</strong></TableCell>
                        <TableCell align="right"><strong>Received</strong></TableCell>
                        <TableCell align="right"><strong>Remaining</strong></TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {transfer.items.map((item, index) => {
                        const remaining = item.qty_sent - item.qty_received;
                        return (
                          <TableRow key={index}>
                            <TableCell>{item.sku}</TableCell>
                            <TableCell>{item.product_name}</TableCell>
                            <TableCell align="right">{item.qty_sent}</TableCell>
                            <TableCell align="right">{item.qty_received}</TableCell>
                            <TableCell align="right">
                              <Typography
                                variant="body2"
                                fontWeight="bold"
                                color={remaining > 0 ? "warning.main" : "success.main"}
                              >
                                {remaining}
                              </Typography>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </TableContainer>

                {transfer.notes && (
                  <Alert severity="info" sx={{ mb: 2 }}>
                    <Typography variant="caption">
                      <strong>Notes:</strong> {transfer.notes}
                    </Typography>
                  </Alert>
                )}

                <Button
                  fullWidth
                  variant="contained"
                  startIcon={<CheckCircleIcon />}
                  onClick={() => handleOpenReceiveDialog(transfer)}
                  disabled={transfer.items.every((item) => item.qty_sent === item.qty_received)}
                >
                  Receive Items
                </Button>
              </Paper>
            </Grid2>
          ))}
        </Grid2>
      )}

      {/* Receive Dialog */}
      <Dialog
        open={receiveDialogOpen}
        onClose={() => setReceiveDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          Receive Transfer: {selectedTransfer?.transfer_number}
        </DialogTitle>
        <DialogContent dividers>
          {selectedTransfer && (
            <>
              <Alert severity="info" sx={{ mb: 2 }}>
                Enter the quantity you are receiving for each item. You can receive partial quantities.
              </Alert>

              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell><strong>SKU</strong></TableCell>
                      <TableCell><strong>Product</strong></TableCell>
                      <TableCell align="right"><strong>Sent</strong></TableCell>
                      <TableCell align="right"><strong>Already Received</strong></TableCell>
                      <TableCell align="right"><strong>Remaining</strong></TableCell>
                      <TableCell align="right"><strong>Receive Now</strong></TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {selectedTransfer.items.map((item, index) => {
                      const remaining = item.qty_sent - item.qty_received;
                      return (
                        <TableRow key={index}>
                          <TableCell>{item.sku}</TableCell>
                          <TableCell>{item.product_name}</TableCell>
                          <TableCell align="right">{item.qty_sent}</TableCell>
                          <TableCell align="right">{item.qty_received}</TableCell>
                          <TableCell align="right">
                            <Typography variant="body2" fontWeight="bold" color="warning.main">
                              {remaining}
                            </Typography>
                          </TableCell>
                          <TableCell align="right">
                            <TextField
                              type="number"
                              size="small"
                              value={receiveQtys[item.sku] || 0}
                              onChange={(e) =>
                                setReceiveQtys({
                                  ...receiveQtys,
                                  [item.sku]: parseInt(e.target.value) || 0,
                                })
                              }
                              inputProps={{
                                min: 0,
                                max: remaining,
                              }}
                              disabled={remaining === 0}
                              sx={{ width: 100 }}
                            />
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </TableContainer>
            </>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setReceiveDialogOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            onClick={handleReceive}
            disabled={submitting}
            startIcon={submitting ? <CircularProgress size={20} /> : <CheckCircleIcon />}
          >
            {submitting ? "Receiving..." : "Confirm Receive"}
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}
