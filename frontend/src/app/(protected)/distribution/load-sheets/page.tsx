'use client';

import React, { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Paper,
  Typography,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  Chip,
  TextField,
  MenuItem,
  Grid,
  IconButton,
  Card,
  CardContent,
  CircularProgress,
  Tooltip
} from '@mui/material';
import {
  Add as AddIcon,
  Visibility as ViewIcon,
  LocalShipping as TruckIcon,
  CheckCircle as CheckIcon,
  HourglassEmpty as PendingIcon,
  Edit as EditIcon
} from '@mui/icons-material';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import axios from 'axios';

interface LoadSheet {
  _id: string;
  load_sheet_number: string;
  status: string;
  delivery_date: string;
  vehicle_info: {
    vehicle_no: string;
    driver_name: string;
  };
  total_items: number;
  total_quantity: number;
  distributors_count: number;
  created_by: {
    name: string;
  };
  created_at: string;
}

export default function LoadSheetsListPage() {
  const router = useRouter();
  const { user } = useAuth();

  const [loadSheets, setLoadSheets] = useState<LoadSheet[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [totalCount, setTotalCount] = useState(0);

  // Filters
  const [status, setStatus] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  useEffect(() => {
    loadLoadSheets();
  }, [page, rowsPerPage, status, searchTerm, dateFrom, dateTo]);

  const loadLoadSheets = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const params: any = {
        page: page + 1,
        limit: rowsPerPage
      };

      if (status) params.status = status;
      if (searchTerm) params.search = searchTerm;
      if (dateFrom) params.date_from = dateFrom;
      if (dateTo) params.date_to = dateTo;

      const response = await axios.get(
        `${process.env.NEXT_PUBLIC_API_URL}/distribution/load-sheets/list`,
        {
          headers: { Authorization: `Bearer ${token}` },
          params
        }
      );

      if (response.data.success) {
        setLoadSheets(response.data.data.load_sheets);
        setTotalCount(response.data.data.pagination.total);
      }
    } catch (error: any) {
      console.error('Error loading load sheets:', error);
      alert(error.response?.data?.message || 'Failed to load load sheets');
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
      case 'Draft':
        return 'default';
      case 'Validated':
        return 'info';
      case 'Loading':
        return 'warning';
      case 'Loaded':
        return 'primary';
      case 'Converted':
        return 'success';
      default:
        return 'default';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'Converted':
        return <CheckIcon fontSize="small" />;
      case 'Draft':
        return <EditIcon fontSize="small" />;
      default:
        return <PendingIcon fontSize="small" />;
    }
  };

  return (
    <Container maxWidth="xl" sx={{ py: 3 }}>
      {/* Header */}
      <Box mb={3} display="flex" alignItems="center" justifyContent="space-between" flexWrap="wrap" gap={2}>
        <Box>
          <Typography variant="h4" fontWeight="bold" gutterBottom>
            Load Sheets
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Manage delivery load sheets and track status
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => router.push('/distribution/load-sheets/create')}
        >
          Create Load Sheet
        </Button>
      </Box>

      {/* Filters */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Grid container spacing={2}>
          <Grid item xs={12} sm={6} md={3}>
            <TextField
              fullWidth
              label="Status"
              select
              value={status}
              onChange={(e) => {
                setStatus(e.target.value);
                setPage(0);
              }}
              size="small"
            >
              <MenuItem value="">All Statuses</MenuItem>
              <MenuItem value="Draft">Draft</MenuItem>
              <MenuItem value="Validated">Validated</MenuItem>
              <MenuItem value="Loading">Loading</MenuItem>
              <MenuItem value="Loaded">Loaded</MenuItem>
              <MenuItem value="Converted">Converted</MenuItem>
            </TextField>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <TextField
              fullWidth
              label="Search Load Sheet"
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setPage(0);
              }}
              placeholder="LS-YYYYMMDD-XXX"
              size="small"
            />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <TextField
              fullWidth
              type="date"
              label="From Date"
              value={dateFrom}
              onChange={(e) => {
                setDateFrom(e.target.value);
                setPage(0);
              }}
              InputLabelProps={{ shrink: true }}
              size="small"
            />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <TextField
              fullWidth
              type="date"
              label="To Date"
              value={dateTo}
              onChange={(e) => {
                setDateTo(e.target.value);
                setPage(0);
              }}
              InputLabelProps={{ shrink: true }}
              size="small"
            />
          </Grid>
        </Grid>
      </Paper>

      {/* Load Sheets Table */}
      <Paper>
        {loading ? (
          <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
            <CircularProgress />
          </Box>
        ) : loadSheets.length === 0 ? (
          <Box textAlign="center" py={8}>
            <TruckIcon sx={{ fontSize: 80, color: 'text.secondary', mb: 2 }} />
            <Typography variant="h6" color="text.secondary" gutterBottom>
              No Load Sheets Found
            </Typography>
            <Typography variant="body2" color="text.secondary" mb={3}>
              Create your first load sheet to start tracking deliveries
            </Typography>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => router.push('/distribution/load-sheets/create')}
            >
              Create Load Sheet
            </Button>
          </Box>
        ) : (
          <>
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Load Sheet No</TableCell>
                    <TableCell>Delivery Date</TableCell>
                    <TableCell>Vehicle</TableCell>
                    <TableCell>Driver</TableCell>
                    <TableCell align="center">Distributors</TableCell>
                    <TableCell align="center">Items</TableCell>
                    <TableCell align="center">Total Qty</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell>Created By</TableCell>
                    <TableCell>Created At</TableCell>
                    <TableCell align="center">Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {loadSheets.map((sheet) => (
                    <TableRow key={sheet._id} hover>
                      <TableCell>
                        <Typography variant="body2" sx={{ fontFamily: 'monospace', fontWeight: 'bold' }}>
                          {sheet.load_sheet_number}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        {new Date(sheet.delivery_date).toLocaleDateString()}
                      </TableCell>
                      <TableCell>{sheet.vehicle_info.vehicle_no}</TableCell>
                      <TableCell>{sheet.vehicle_info.driver_name}</TableCell>
                      <TableCell align="center">
                        <Chip label={sheet.distributors_count} size="small" color="primary" />
                      </TableCell>
                      <TableCell align="center">
                        <Chip label={sheet.total_items} size="small" />
                      </TableCell>
                      <TableCell align="center">
                        <strong>{sheet.total_quantity}</strong> CTN
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={sheet.status}
                          color={getStatusColor(sheet.status)}
                          size="small"
                          icon={getStatusIcon(sheet.status)}
                        />
                      </TableCell>
                      <TableCell>{sheet.created_by.name}</TableCell>
                      <TableCell>
                        {new Date(sheet.created_at).toLocaleDateString()}
                      </TableCell>
                      <TableCell align="center">
                        <Tooltip title="View Details">
                          <IconButton
                            size="small"
                            color="primary"
                            onClick={() => router.push(`/distribution/load-sheets/${sheet._id}`)}
                          >
                            <ViewIcon />
                          </IconButton>
                        </Tooltip>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
            <TablePagination
              rowsPerPageOptions={[5, 10, 25, 50]}
              component="div"
              count={totalCount}
              rowsPerPage={rowsPerPage}
              page={page}
              onPageChange={handleChangePage}
              onRowsPerPageChange={handleChangeRowsPerPage}
            />
          </>
        )}
      </Paper>
    </Container>
  );
}
