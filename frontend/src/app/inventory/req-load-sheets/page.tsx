"use client";

import React, { useState, useEffect } from "react";
import {
  Box,
  Paper,
  Typography,
  TextField,
  Button,
  MenuItem,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  IconButton,
  Pagination,
  InputAdornment,
  CircularProgress,
  Stack,
} from "@mui/material";
import {
  Add as AddIcon,
  Search as SearchIcon,
  Visibility as ViewIcon,
  Delete as DeleteIcon,
  CheckCircle as ValidateIcon,
  LocalShipping as ConvertIcon,
} from "@mui/icons-material";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { apiClient } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";

interface LoadSheet {
  _id: string;
  load_sheet_number: string;
  status: "Draft" | "Locked" | "Loading" | "Loaded" | "Generated";
  source_depot_id: {
    _id: string;
    name: string;
    code: string;
  };
  requesting_depots: Array<{
    requesting_depot_id: {
      _id: string;
      name: string;
      code: string;
    };
    req_items: any[];
  }>;
  delivery_date?: string;
  vehicle_info?: string;
  created_at: string;
  created_by?: {
    name: string;
  };
}

const statusColors: Record<string, "default" | "primary" | "warning" | "success" | "info"> = {
  Draft: "default",
  Locked: "primary",
  Loading: "warning",
  Loaded: "info",
  Generated: "success",
};

export default function ReqLoadSheetsPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [loadSheets, setLoadSheets] = useState<LoadSheet[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [statusFilter, setStatusFilter] = useState("");
  const [searchTerm, setSearchTerm] = useState("");

  const fetchLoadSheets = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: page.toString(),
        limit: "20",
      });

      if (statusFilter) params.append("status", statusFilter);
      if (searchTerm) params.append("search", searchTerm);

      const response = await apiClient.get(`/inventory/req-load-sheets/list?${params}`);

      if (response.success) {
        setLoadSheets(response.data);
        setTotalPages(response.pagination.totalPages);
      }
    } catch (error: any) {
      console.error("Error fetching load sheets:", error);
      toast.error(error.response?.data?.message || "Failed to fetch load sheets");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLoadSheets();
  }, [page, statusFilter]);

  const handleSearch = () => {
    setPage(1);
    fetchLoadSheets();
  };

  const handleDelete = async (id: string, loadSheetNumber: string) => {
    if (!confirm(`Delete load sheet ${loadSheetNumber}? This will unblock the stock.`)) {
      return;
    }

    try {
      const response = await apiClient.delete(`/inventory/req-load-sheets/${id}`);
      if (response.data.success) {
        toast.success("Load sheet deleted successfully");
        fetchLoadSheets();
      }
    } catch (error: any) {
      console.error("Error deleting load sheet:", error);
      toast.error(error.response?.data?.message || "Failed to delete load sheet");
    }
  };

  const handleLock = async (id: string, loadSheetNumber: string) => {
    if (!confirm(`Lock load sheet ${loadSheetNumber}? This will finalize the load sheet for delivery.`)) {
      return;
    }

    try {
      const response = await apiClient.post(`/inventory/req-load-sheets/${id}/lock`);
      if (response.success) {
        toast.success("Load sheet locked successfully");
        fetchLoadSheets();
      }
    } catch (error: any) {
      console.error("Error locking load sheet:", error);
      toast.error(error.response?.data?.message || "Failed to lock load sheet");
    }
  };

  const handleGenerateChalans = async (id: string, loadSheetNumber: string) => {
    if (!confirm(`Generate chalans and invoices for ${loadSheetNumber}? This action cannot be undone.`)) {
      return;
    }

    try {
      const response = await apiClient.post(`/inventory/req-load-sheets/${id}/generate-chalans`);
      if (response.success) {
        toast.success("Chalans and invoices generated successfully");
        fetchLoadSheets();
      }
    } catch (error: any) {
      console.error("Error generating chalans:", error);
      toast.error(error.response?.data?.message || "Failed to generate chalans");
    }
  };

  const getTotalItems = (loadSheet: LoadSheet) => {
    return loadSheet.requesting_depots.reduce((sum, depot) => sum + (depot.req_items?.length || 0), 0);
  };

  const getRequestingDepotsList = (loadSheet: LoadSheet) => {
    return loadSheet.requesting_depots
      .map((d) => d.requesting_depot_id?.name || "Unknown")
      .join(", ");
  };

  if (loading) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "60vh" }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ p: { xs: 2, sm: 3 } }}>
      <Paper sx={{ p: { xs: 2, sm: 3 }, mb: 3 }}>
        <Stack
          direction={{ xs: "column", sm: "row" }}
          justifyContent="space-between"
          alignItems={{ xs: "stretch", sm: "center" }}
          spacing={2}
          mb={3}
        >
          <Typography variant="h5" fontWeight="600">
            Requisition Load Sheets
          </Typography>
        </Stack>

        <Stack direction={{ xs: "column", sm: "row" }} spacing={2} mb={3}>
          <TextField
            select
            label="Status"
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(1);
            }}
            sx={{ minWidth: { xs: "100%", sm: 200 } }}
            size="small"
          >
            <MenuItem value="">All</MenuItem>
            <MenuItem value="Draft">Draft</MenuItem>
            <MenuItem value="Validated">Validated</MenuItem>
            <MenuItem value="Loading">Loading</MenuItem>
            <MenuItem value="Loaded">Loaded</MenuItem>
            <MenuItem value="Converted">Converted</MenuItem>
          </TextField>

          <TextField
            placeholder="Search load sheet number..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onKeyPress={(e) => e.key === "Enter" && handleSearch()}
            sx={{ flex: 1 }}
            size="small"
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon />
                </InputAdornment>
              ),
            }}
          />

          <Button
            variant="contained"
            onClick={handleSearch}
            sx={{ minWidth: { xs: "100%", sm: "auto" } }}
          >
            Search
          </Button>
        </Stack>

        <TableContainer sx={{ overflowX: "auto" }}>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell sx={{ fontWeight: 600 }}>Load Sheet No</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Status</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Requesting Depots</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Items</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Delivery Date</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Vehicle</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Created By</TableCell>
                <TableCell sx={{ fontWeight: 600, textAlign: "center" }}>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loadSheets.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} align="center" sx={{ py: 4 }}>
                    <Typography color="text.secondary">No load sheets found</Typography>
                  </TableCell>
                </TableRow>
              ) : (
                loadSheets.map((sheet) => (
                  <TableRow key={sheet._id} hover>
                    <TableCell>
                      <Typography variant="body2" fontWeight="500">
                        {sheet.load_sheet_number}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={sheet.status}
                        color={statusColors[sheet.status]}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" sx={{ maxWidth: 200 }} noWrap>
                        {getRequestingDepotsList(sheet)}
                      </Typography>
                    </TableCell>
                    <TableCell>{getTotalItems(sheet)}</TableCell>
                    <TableCell>
                      {sheet.delivery_date
                        ? new Date(sheet.delivery_date).toLocaleDateString()
                        : "-"}
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" sx={{ maxWidth: 150 }} noWrap>
                        {sheet.vehicle_info || "-"}
                      </Typography>
                    </TableCell>
                    <TableCell>{sheet.created_by?.name || "-"}</TableCell>
                    <TableCell>
                      <Stack direction="row" spacing={0.5} justifyContent="center">
                        <IconButton
                          size="small"
                          color="primary"
                          onClick={() => router.push(`/inventory/req-load-sheets/${sheet._id}`)}
                          title="View Details"
                        >
                          <ViewIcon fontSize="small" />
                        </IconButton>

                        {sheet.status === "Draft" && (
                          <>
                            <IconButton
                              size="small"
                              color="success"
                              onClick={() => handleLock(sheet._id, sheet.load_sheet_number)}
                              title="Lock Load Sheet"
                            >
                              <ValidateIcon fontSize="small" />
                            </IconButton>

                            <IconButton
                              size="small"
                              color="error"
                              onClick={() => handleDelete(sheet._id, sheet.load_sheet_number)}
                              title="Delete"
                            >
                              <DeleteIcon fontSize="small" />
                            </IconButton>
                          </>
                        )}

                        {(sheet.status === "Locked" || sheet.status === "Loaded") && (
                          <IconButton
                            size="small"
                            color="info"
                            onClick={() => handleGenerateChalans(sheet._id, sheet.load_sheet_number)}
                            title="Generate Chalans & Invoices"
                          >
                            <ConvertIcon fontSize="small" />
                          </IconButton>
                        )}
                      </Stack>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>

        {totalPages > 1 && (
          <Box sx={{ display: "flex", justifyContent: "center", mt: 3 }}>
            <Pagination
              count={totalPages}
              page={page}
              onChange={(e, value) => setPage(value)}
              color="primary"
            />
          </Box>
        )}
      </Paper>
    </Box>
  );
}
