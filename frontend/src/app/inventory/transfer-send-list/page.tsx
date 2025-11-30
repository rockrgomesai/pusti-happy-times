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
  TablePagination,
  TextField,
  Button,
  Chip,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Grid as Grid2,
  CircularProgress,
  MenuItem,
} from "@mui/material";
import {
  Visibility as VisibilityIcon,
  FilterList as FilterListIcon,
  List as ListIcon,
} from "@mui/icons-material";
import { formatDateForDisplay } from "@/lib/dateUtils";
import api from "@/lib/api";
import toast from "react-hot-toast";

interface Transfer {
  _id: string;
  transfer_number: string;
  from_depot_id: {
    _id: string;
    name: string;
    code: string;
  };
  to_depot_id: {
    _id: string;
    name: string;
    code: string;
  };
  transfer_date: string;
  status: string;
  total_items: number;
  total_qty_sent: number;
  total_qty_received: number;
  notes?: string;
  sent_by: {
    _id: string;
    name: string;
  };
  sent_at: string;
}

export default function TransferSendListPage() {
  const [transfers, setTransfers] = useState<Transfer[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [total, setTotal] = useState(0);
  
  // Filters
  const [status, setStatus] = useState<string>("");
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");
  const [toDepotId, setToDepotId] = useState<string>("");
  
  // Dialog
  const [selectedTransfer, setSelectedTransfer] = useState<Transfer | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [transferDetails, setTransferDetails] = useState<any>(null);
  const [loadingDetails, setLoadingDetails] = useState(false);
  
  // Depots for filter
  const [depots, setDepots] = useState<any[]>([]);

  useEffect(() => {
    loadDepots();
  }, []);

  useEffect(() => {
    loadTransfers();
  }, [page, rowsPerPage, status, startDate, endDate, toDepotId]);

  const loadDepots = async () => {
    try {
      const response = await api.get("/inventory/depot-transfers/depots/list");
      setDepots(response.data.data || []);
    } catch (error) {
      console.error("Failed to load depots:", error);
    }
  };

  const loadTransfers = async () => {
    try {
      setLoading(true);
      const params: any = {
        page: page + 1,
        limit: rowsPerPage,
        direction: "sent",
      };

      if (status) params.status = status;
      if (startDate) params.start_date = startDate;
      if (endDate) params.end_date = endDate;
      if (toDepotId) params.to_depot_id = toDepotId;

      const response = await api.get("/inventory/depot-transfers/list", { params });
      setTransfers(response.data.data || []);
      setTotal(response.data.pagination.total || 0);
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to load transfers");
    } finally {
      setLoading(false);
    }
  };

  const handleViewDetails = async (transfer: Transfer) => {
    try {
      setSelectedTransfer(transfer);
      setDetailsOpen(true);
      setLoadingDetails(true);

      const response = await api.get(`/inventory/depot-transfers/${transfer._id}`);
      setTransferDetails(response.data.data);
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to load transfer details");
    } finally {
      setLoadingDetails(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Pending":
        return "warning";
      case "In-Transit":
        return "info";
      case "Partially-Received":
        return "secondary";
      case "Received":
        return "success";
      case "Cancelled":
        return "error";
      default:
        return "default";
    }
  };

  const clearFilters = () => {
    setStatus("");
    setStartDate("");
    setEndDate("");
    setToDepotId("");
  };

  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" component="h1" fontWeight="bold" gutterBottom>
          <ListIcon sx={{ mr: 1, verticalAlign: "middle" }} />
          Transfer Send List
        </Typography>
        <Typography variant="body2" color="text.secondary">
          View all outgoing depot transfers
        </Typography>
      </Box>

      {/* Filters */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 2 }}>
          <FilterListIcon />
          <Typography variant="h6">Filters</Typography>
        </Box>
        <Grid2 container spacing={2}>
          <Grid2 size={{ xs: 12, sm: 6, md: 3 }}>
            <TextField
              select
              fullWidth
              label="Status"
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              size="small"
            >
              <MenuItem value="">All Status</MenuItem>
              <MenuItem value="Pending">Pending</MenuItem>
              <MenuItem value="In-Transit">In-Transit</MenuItem>
              <MenuItem value="Partially-Received">Partially Received</MenuItem>
              <MenuItem value="Received">Received</MenuItem>
              <MenuItem value="Cancelled">Cancelled</MenuItem>
            </TextField>
          </Grid2>
          <Grid2 size={{ xs: 12, sm: 6, md: 3 }}>
            <TextField
              select
              fullWidth
              label="To Depot"
              value={toDepotId}
              onChange={(e) => setToDepotId(e.target.value)}
              size="small"
            >
              <MenuItem value="">All Depots</MenuItem>
              {depots.map((depot) => (
                <MenuItem key={depot._id} value={depot._id}>
                  {depot.name}
                </MenuItem>
              ))}
            </TextField>
          </Grid2>
          <Grid2 size={{ xs: 12, sm: 6, md: 2 }}>
            <TextField
              fullWidth
              type="date"
              label="Start Date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              size="small"
              InputLabelProps={{ shrink: true }}
            />
          </Grid2>
          <Grid2 size={{ xs: 12, sm: 6, md: 2 }}>
            <TextField
              fullWidth
              type="date"
              label="End Date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              size="small"
              InputLabelProps={{ shrink: true }}
            />
          </Grid2>
          <Grid2 size={{ xs: 12, sm: 12, md: 2 }}>
            <Button fullWidth variant="outlined" onClick={clearFilters} size="medium">
              Clear Filters
            </Button>
          </Grid2>
        </Grid2>
      </Paper>

      {/* Table */}
      <Paper>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell><strong>Transfer #</strong></TableCell>
                <TableCell><strong>To Depot</strong></TableCell>
                <TableCell><strong>Transfer Date</strong></TableCell>
                <TableCell><strong>Status</strong></TableCell>
                <TableCell align="right"><strong>Items</strong></TableCell>
                <TableCell align="right"><strong>Qty Sent</strong></TableCell>
                <TableCell align="right"><strong>Qty Received</strong></TableCell>
                <TableCell align="center"><strong>Actions</strong></TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={8} align="center">
                    <CircularProgress />
                  </TableCell>
                </TableRow>
              ) : transfers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} align="center">
                    No transfers found
                  </TableCell>
                </TableRow>
              ) : (
                transfers.map((transfer) => (
                  <TableRow key={transfer._id} hover>
                    <TableCell>{transfer.transfer_number}</TableCell>
                    <TableCell>
                      {transfer.to_depot_id.name}
                      <Typography variant="caption" display="block" color="text.secondary">
                        {transfer.to_depot_id.code}
                      </Typography>
                    </TableCell>
                    <TableCell>{formatDateForDisplay(transfer.transfer_date)}</TableCell>
                    <TableCell>
                      <Chip
                        label={transfer.status}
                        color={getStatusColor(transfer.status)}
                        size="small"
                      />
                    </TableCell>
                    <TableCell align="right">{transfer.total_items}</TableCell>
                    <TableCell align="right">{transfer.total_qty_sent}</TableCell>
                    <TableCell align="right">{transfer.total_qty_received}</TableCell>
                    <TableCell align="center">
                      <IconButton
                        size="small"
                        color="primary"
                        onClick={() => handleViewDetails(transfer)}
                      >
                        <VisibilityIcon fontSize="small" />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
        <TablePagination
          component="div"
          count={total}
          page={page}
          onPageChange={(e, newPage) => setPage(newPage)}
          rowsPerPage={rowsPerPage}
          onRowsPerPageChange={(e) => {
            setRowsPerPage(parseInt(e.target.value, 10));
            setPage(0);
          }}
          rowsPerPageOptions={[5, 10, 25, 50]}
        />
      </Paper>

      {/* Details Dialog */}
      <Dialog open={detailsOpen} onClose={() => setDetailsOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          Transfer Details: {selectedTransfer?.transfer_number}
        </DialogTitle>
        <DialogContent dividers>
          {loadingDetails ? (
            <Box display="flex" justifyContent="center" p={3}>
              <CircularProgress />
            </Box>
          ) : transferDetails ? (
            <>
              <Grid2 container spacing={2} sx={{ mb: 3 }}>
                <Grid2 size={{ xs: 12, sm: 6 }}>
                  <Typography variant="body2" color="text.secondary">From Depot:</Typography>
                  <Typography variant="body1" fontWeight="bold">
                    {transferDetails.from_depot_id.name}
                  </Typography>
                </Grid2>
                <Grid2 size={{ xs: 12, sm: 6 }}>
                  <Typography variant="body2" color="text.secondary">To Depot:</Typography>
                  <Typography variant="body1" fontWeight="bold">
                    {transferDetails.to_depot_id.name}
                  </Typography>
                </Grid2>
                <Grid2 size={{ xs: 12, sm: 6 }}>
                  <Typography variant="body2" color="text.secondary">Transfer Date:</Typography>
                  <Typography variant="body1">
                    {formatDateForDisplay(transferDetails.transfer_date)}
                  </Typography>
                </Grid2>
                <Grid2 size={{ xs: 12, sm: 6 }}>
                  <Typography variant="body2" color="text.secondary">Status:</Typography>
                  <Chip
                    label={transferDetails.status}
                    color={getStatusColor(transferDetails.status)}
                    size="small"
                  />
                </Grid2>
                {transferDetails.notes && (
                  <Grid2 size={{ xs: 12 }}>
                    <Typography variant="body2" color="text.secondary">Notes:</Typography>
                    <Typography variant="body1">{transferDetails.notes}</Typography>
                  </Grid2>
                )}
              </Grid2>

              <Typography variant="h6" gutterBottom>Items</Typography>
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell><strong>SKU</strong></TableCell>
                      <TableCell><strong>Product</strong></TableCell>
                      <TableCell><strong>Unit</strong></TableCell>
                      <TableCell align="right"><strong>Qty Sent</strong></TableCell>
                      <TableCell align="right"><strong>Qty Received</strong></TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {transferDetails.items.map((item: any, index: number) => (
                      <TableRow key={index}>
                        <TableCell>{item.sku}</TableCell>
                        <TableCell>{item.product_name}</TableCell>
                        <TableCell>{item.unit}</TableCell>
                        <TableCell align="right">{item.qty_sent}</TableCell>
                        <TableCell align="right">{item.qty_received}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </>
          ) : (
            <Typography>No details available</Typography>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDetailsOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}
