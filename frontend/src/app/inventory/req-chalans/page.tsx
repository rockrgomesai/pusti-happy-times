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
  Tabs,
  Tab,
} from "@mui/material";
import {
  Search as SearchIcon,
  Visibility as ViewIcon,
  CheckCircle as ReceiveIcon,
  Receipt as InvoiceIcon,
} from "@mui/icons-material";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import apiClient from "@/lib/apiClient";

interface Chalan {
  _id: string;
  chalan_no: string;
  status: string;
  source_depot_id: {
    name: string;
    code: string;
  };
  requesting_depot_id: {
    name: string;
    code: string;
  };
  load_sheet_id?: {
    load_sheet_number: string;
  };
  chalan_date: string;
  items: any[];
}

interface Invoice {
  _id: string;
  invoice_no: string;
  status: string;
  source_depot_id: {
    name: string;
    code: string;
  };
  requesting_depot_id: {
    name: string;
    code: string;
  };
  load_sheet_id?: {
    load_sheet_number: string;
  };
  invoice_date: string;
  total_amount: number;
}

const statusColors: Record<string, "default" | "warning" | "success"> = {
  Generated: "default",
  "Partially Received": "warning",
  Received: "success",
};

export default function ReqChalansPage() {
  const router = useRouter();
  const [tabValue, setTabValue] = useState(0);
  const [chalans, setChalans] = useState<Chalan[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [statusFilter, setStatusFilter] = useState("");
  const [searchTerm, setSearchTerm] = useState("");

  const fetchChalans = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: page.toString(),
        limit: "20",
      });

      if (statusFilter) params.append("status", statusFilter);

      const response = await apiClient.get(`/inventory/req-chalans?${params}`);

      if (response.data.success) {
        setChalans(response.data.data);
        setTotalPages(response.data.pagination.totalPages);
      }
    } catch (error: any) {
      console.error("Error fetching chalans:", error);
      toast.error(error.response?.data?.message || "Failed to fetch chalans");
    } finally {
      setLoading(false);
    }
  };

  const fetchInvoices = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: page.toString(),
        limit: "20",
      });

      if (statusFilter) params.append("status", statusFilter);

      const response = await apiClient.get(`/inventory/req-chalans/invoices?${params}`);

      if (response.data.success) {
        setInvoices(response.data.data);
        setTotalPages(response.data.pagination.totalPages);
      }
    } catch (error: any) {
      console.error("Error fetching invoices:", error);
      toast.error(error.response?.data?.message || "Failed to fetch invoices");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (tabValue === 0) {
      fetchChalans();
    } else {
      fetchInvoices();
    }
  }, [page, statusFilter, tabValue]);

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
    setPage(1);
    setStatusFilter("");
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
        <Typography variant="h5" fontWeight="600" mb={3}>
          Requisition Chalans & Invoices
        </Typography>

        <Tabs value={tabValue} onChange={handleTabChange} sx={{ mb: 3 }}>
          <Tab label="Chalans" />
          <Tab label="Invoices" />
        </Tabs>

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
            <MenuItem value="Generated">Generated</MenuItem>
            <MenuItem value="Partially Received">Partially Received</MenuItem>
            <MenuItem value="Received">Received</MenuItem>
          </TextField>
        </Stack>

        {tabValue === 0 ? (
          // Chalans Table
          <TableContainer sx={{ overflowX: "auto" }}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell sx={{ fontWeight: 600 }}>Chalan No</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Status</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Load Sheet</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Source Depot</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Requesting Depot</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Items</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Date</TableCell>
                  <TableCell sx={{ fontWeight: 600, textAlign: "center" }}>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {chalans.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} align="center" sx={{ py: 4 }}>
                      <Typography color="text.secondary">No chalans found</Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  chalans.map((chalan) => (
                    <TableRow key={chalan._id} hover>
                      <TableCell>
                        <Typography variant="body2" fontWeight="500">
                          {chalan.chalan_no}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={chalan.status}
                          color={statusColors[chalan.status]}
                          size="small"
                        />
                      </TableCell>
                      <TableCell>
                        {chalan.load_sheet_id?.load_sheet_number || "-"}
                      </TableCell>
                      <TableCell>{chalan.source_depot_id.name}</TableCell>
                      <TableCell>{chalan.requesting_depot_id.name}</TableCell>
                      <TableCell>{chalan.items.length}</TableCell>
                      <TableCell>
                        {new Date(chalan.chalan_date).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        <Stack direction="row" spacing={0.5} justifyContent="center">
                          <IconButton
                            size="small"
                            color="primary"
                            onClick={() =>
                              router.push(`/inventory/req-chalans/${chalan._id}`)
                            }
                            title="View Details"
                          >
                            <ViewIcon fontSize="small" />
                          </IconButton>

                          {chalan.status !== "Received" && (
                            <IconButton
                              size="small"
                              color="success"
                              onClick={() =>
                                router.push(`/inventory/req-chalans/${chalan._id}/receive`)
                              }
                              title="Receive"
                            >
                              <ReceiveIcon fontSize="small" />
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
        ) : (
          // Invoices Table
          <TableContainer sx={{ overflowX: "auto" }}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell sx={{ fontWeight: 600 }}>Invoice No</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Status</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Load Sheet</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Source Depot</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Requesting Depot</TableCell>
                  <TableCell sx={{ fontWeight: 600 }} align="right">
                    Amount
                  </TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Date</TableCell>
                  <TableCell sx={{ fontWeight: 600, textAlign: "center" }}>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {invoices.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} align="center" sx={{ py: 4 }}>
                      <Typography color="text.secondary">No invoices found</Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  invoices.map((invoice) => (
                    <TableRow key={invoice._id} hover>
                      <TableCell>
                        <Typography variant="body2" fontWeight="500">
                          {invoice.invoice_no}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={invoice.status}
                          color={statusColors[invoice.status] || "default"}
                          size="small"
                        />
                      </TableCell>
                      <TableCell>
                        {invoice.load_sheet_id?.load_sheet_number || "-"}
                      </TableCell>
                      <TableCell>{invoice.source_depot_id.name}</TableCell>
                      <TableCell>{invoice.requesting_depot_id.name}</TableCell>
                      <TableCell align="right">
                        ৳ {invoice.total_amount.toLocaleString()}
                      </TableCell>
                      <TableCell>
                        {new Date(invoice.invoice_date).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        <Stack direction="row" spacing={0.5} justifyContent="center">
                          <IconButton
                            size="small"
                            color="primary"
                            onClick={() =>
                              router.push(`/inventory/req-invoices/${invoice._id}`)
                            }
                            title="View Details"
                          >
                            <InvoiceIcon fontSize="small" />
                          </IconButton>
                        </Stack>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
        )}

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
