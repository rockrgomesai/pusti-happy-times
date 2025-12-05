"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  TextField,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  Chip,
  IconButton,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Grid,
  CircularProgress,
} from "@mui/material";
import { Visibility, Refresh, FilterList } from "@mui/icons-material";
import { apiClient } from "@/lib/api";

interface Chalan {
  _id: string;
  chalan_no: string;
  load_sheet_id: {
    load_sheet_number: string;
  };
  distributor_id: {
    name: string;
  };
  transport_id: {
    transport: string;
  };
  vehicle_no: string;
  chalan_date: string;
  total_qty_ctn: number;
  status: string;
}

export default function ChalansListPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [chalans, setChalans] = useState<Chalan[]>([]);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(20);
  const [totalCount, setTotalCount] = useState(0);

  // Filters
  const [statusFilter, setStatusFilter] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  useEffect(() => {
    fetchChalans();
  }, [page, rowsPerPage, statusFilter, fromDate, toDate]);

  const fetchChalans = async () => {
    try {
      setLoading(true);
      const params: any = {
        page: page + 1,
        limit: rowsPerPage,
      };
      if (statusFilter) params.status = statusFilter;
      if (fromDate) params.from_date = fromDate;
      if (toDate) params.to_date = toDate;

      console.log("🔍 Fetching chalans with params:", params);
      const response: any = await apiClient.get("/inventory/delivery-chalans", { params });
      console.log("📥 Full API response:", response);
      console.log("📥 response.success:", response.success);
      console.log("📥 response.data (the array):", response.data);
      console.log("📥 response.data.length:", response.data?.length);
      console.log("📥 response.pagination:", response.pagination);

      if (response.success) {
        console.log("✅ Setting chalans:", response.data);
        setChalans(response.data || []);
        setTotalCount(response.pagination?.total || 0);
      } else {
        console.log("❌ Response success is false or missing");
      }
    } catch (error: any) {
      console.error("❌ Error fetching chalans:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleChangePage = (event: unknown, newPage: number) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Generated":
        return "primary";
      case "Delivered":
        return "success";
      case "Cancelled":
        return "error";
      default:
        return "default";
    }
  };

  return (
    <Box p={{ xs: 2, md: 3 }}>
      {/* Header */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Box>
          <Typography variant="h4" fontWeight="bold">
            Delivery Chalans
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Manage delivery chalans
          </Typography>
        </Box>
        <Button
          variant="outlined"
          startIcon={<Refresh />}
          onClick={() => fetchChalans()}
        >
          Refresh
        </Button>
      </Box>

      {/* Filters */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Box display="flex" alignItems="center" gap={1} mb={2}>
            <FilterList />
            <Typography variant="h6">Filters</Typography>
          </Box>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6} md={3}>
              <FormControl fullWidth size="small">
                <InputLabel>Status</InputLabel>
                <Select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  label="Status"
                >
                  <MenuItem value="">All</MenuItem>
                  <MenuItem value="Generated">Generated</MenuItem>
                  <MenuItem value="Delivered">Delivered</MenuItem>
                  <MenuItem value="Cancelled">Cancelled</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <TextField
                fullWidth
                size="small"
                type="date"
                label="From Date"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <TextField
                fullWidth
                size="small"
                type="date"
                label="To Date"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Button
                fullWidth
                variant="outlined"
                onClick={() => {
                  setStatusFilter("");
                  setFromDate("");
                  setToDate("");
                }}
              >
                Clear Filters
              </Button>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Chalan No</TableCell>
                <TableCell>Load Sheet</TableCell>
                <TableCell>Distributor</TableCell>
                <TableCell>Transport</TableCell>
                <TableCell>Vehicle No</TableCell>
                <TableCell>Date</TableCell>
                <TableCell align="right">Qty (CTN)</TableCell>
                <TableCell>Status</TableCell>
                <TableCell align="center">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {(() => {
                console.log("🎨 Render check - loading:", loading, "chalans.length:", chalans.length, "chalans:", chalans);
                if (loading) {
                  return (
                    <TableRow>
                      <TableCell colSpan={9} align="center">
                        <CircularProgress />
                      </TableCell>
                    </TableRow>
                  );
                }
                if (chalans.length === 0) {
                  return (
                    <TableRow>
                      <TableCell colSpan={9} align="center">
                        No chalans found
                      </TableCell>
                    </TableRow>
                  );
                }
                return chalans.map((chalan) => (
                  <TableRow key={chalan._id} hover>
                    <TableCell>
                      <Typography variant="body2" fontWeight="bold">
                        {chalan.chalan_no}
                      </Typography>
                    </TableCell>
                    <TableCell>{chalan.load_sheet_id?.load_sheet_number || "-"}</TableCell>
                    <TableCell>{chalan.distributor_id?.name || "-"}</TableCell>
                    <TableCell>{chalan.transport_id?.transport || "-"}</TableCell>
                    <TableCell>{chalan.vehicle_no}</TableCell>
                    <TableCell>
                      {new Date(chalan.chalan_date).toLocaleDateString()}
                    </TableCell>
                    <TableCell align="right">{chalan.total_qty_ctn}</TableCell>
                    <TableCell>
                      <Chip
                        label={chalan.status}
                        color={getStatusColor(chalan.status)}
                        size="small"
                      />
                    </TableCell>
                    <TableCell align="center">
                      <IconButton
                        size="small"
                        onClick={() => router.push(`/inventory/delivery-chalans/${chalan._id}`)}
                      >
                        <Visibility />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ));
              })()}
            </TableBody>
          </Table>
        </TableContainer>
        <TablePagination
          rowsPerPageOptions={[10, 20, 50]}
          component="div"
          count={totalCount}
          rowsPerPage={rowsPerPage}
          page={page}
          onPageChange={handleChangePage}
          onRowsPerPageChange={handleChangeRowsPerPage}
        />
      </Card>
    </Box>
  );
}
