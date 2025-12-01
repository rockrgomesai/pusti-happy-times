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
  CircularProgress,
  Tooltip
} from '@mui/material';
import {
  Visibility as ViewIcon,
  Print as PrintIcon,
  LocalShipping as TruckIcon,
  CheckCircle as DeliveredIcon,
  Cancel as CancelledIcon,
  HourglassEmpty as PendingIcon,
  DirectionsCar as InTransitIcon
} from '@mui/icons-material';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import axios from 'axios';

interface Chalan {
  _id: string;
  chalan_number: string;
  load_sheet_number: string;
  distributor_id: {
    distributor_name: string;
    distributor_code: string;
  };
  delivery_date: string;
  vehicle_no: string;
  status: string;
  total_items: number;
  total_quantity: number;
  created_at: string;
}

export default function ChalansListPage() {
  const router = useRouter();
  const { user } = useAuth();

  const [chalans, setChalans] = useState<Chalan[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [totalCount, setTotalCount] = useState(0);

  // Filters
  const [status, setStatus] = useState('');
  const [searchLoadSheet, setSearchLoadSheet] = useState('');
  const [searchChalan, setSearchChalan] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  useEffect(() => {
    loadChalans();
  }, [page, rowsPerPage, status, searchLoadSheet, searchChalan, dateFrom, dateTo]);

  const loadChalans = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const params: any = {
        page: page + 1,
        limit: rowsPerPage
      };

      if (status) params.status = status;
      if (searchLoadSheet) params.load_sheet_number = searchLoadSheet;
      if (searchChalan) params.chalan_number = searchChalan;
      if (dateFrom) params.date_from = dateFrom;
      if (dateTo) params.date_to = dateTo;

      const response = await axios.get(
        `${process.env.NEXT_PUBLIC_API_URL}/distribution/chalans/list`,
        {
          headers: { Authorization: `Bearer ${token}` },
          params
        }
      );

      if (response.data.success) {
        setChalans(response.data.data.chalans);
        setTotalCount(response.data.data.pagination.total);
      }
    } catch (error: any) {
      console.error('Error loading chalans:', error);
      alert(error.response?.data?.message || 'Failed to load chalans');
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
      case 'Pending':
        return 'warning';
      case 'InTransit':
        return 'info';
      case 'Delivered':
        return 'success';
      case 'Cancelled':
        return 'error';
      default:
        return 'default';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'Delivered':
        return <DeliveredIcon fontSize="small" />;
      case 'Cancelled':
        return <CancelledIcon fontSize="small" />;
      case 'InTransit':
        return <InTransitIcon fontSize="small" />;
      default:
        return <PendingIcon fontSize="small" />;
    }
  };

  return (
    <Container maxWidth="xl" sx={{ py: 3 }}>
      {/* Header */}
      <Box mb={3}>
        <Typography variant="h4" fontWeight="bold" gutterBottom>
          Delivery Chalans
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Track delivery chalans and update status
        </Typography>
      </Box>

      {/* Filters */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Grid container spacing={2}>
          <Grid item xs={12} sm={6} md={2.4}>
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
              <MenuItem value="Pending">Pending</MenuItem>
              <MenuItem value="InTransit">In Transit</MenuItem>
              <MenuItem value="Delivered">Delivered</MenuItem>
              <MenuItem value="Cancelled">Cancelled</MenuItem>
            </TextField>
          </Grid>
          <Grid item xs={12} sm={6} md={2.4}>
            <TextField
              fullWidth
              label="Load Sheet No"
              value={searchLoadSheet}
              onChange={(e) => {
                setSearchLoadSheet(e.target.value);
                setPage(0);
              }}
              placeholder="LS-YYYYMMDD-XXX"
              size="small"
            />
          </Grid>
          <Grid item xs={12} sm={6} md={2.4}>
            <TextField
              fullWidth
              label="Chalan No"
              value={searchChalan}
              onChange={(e) => {
                setSearchChalan(e.target.value);
                setPage(0);
              }}
              placeholder="CH-YYYYMMDD-XXX"
              size="small"
            />
          </Grid>
          <Grid item xs={12} sm={6} md={2.4}>
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
          <Grid item xs={12} sm={6} md={2.4}>
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

      {/* Chalans Table */}
      <Paper>
        {loading ? (
          <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
            <CircularProgress />
          </Box>
        ) : chalans.length === 0 ? (
          <Box textAlign="center" py={8}>
            <TruckIcon sx={{ fontSize: 80, color: 'text.secondary', mb: 2 }} />
            <Typography variant="h6" color="text.secondary" gutterBottom>
              No Chalans Found
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Chalans will appear here after converting load sheets
            </Typography>
          </Box>
        ) : (
          <>
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Chalan No</TableCell>
                    <TableCell>Load Sheet No</TableCell>
                    <TableCell>Distributor</TableCell>
                    <TableCell>Delivery Date</TableCell>
                    <TableCell>Vehicle</TableCell>
                    <TableCell align="center">Items</TableCell>
                    <TableCell align="center">Total Qty</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell>Created At</TableCell>
                    <TableCell align="center">Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {chalans.map((chalan) => (
                    <TableRow key={chalan._id} hover>
                      <TableCell>
                        <Typography variant="body2" sx={{ fontFamily: 'monospace', fontWeight: 'bold' }}>
                          {chalan.chalan_number}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" sx={{ fontFamily: 'monospace', fontSize: '0.75rem' }}>
                          {chalan.load_sheet_number}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" fontWeight="bold">
                          {chalan.distributor_id.distributor_name}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {chalan.distributor_id.distributor_code}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        {new Date(chalan.delivery_date).toLocaleDateString()}
                      </TableCell>
                      <TableCell>{chalan.vehicle_no}</TableCell>
                      <TableCell align="center">
                        <Chip label={chalan.total_items} size="small" />
                      </TableCell>
                      <TableCell align="center">
                        <strong>{chalan.total_quantity}</strong> CTN
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={chalan.status}
                          color={getStatusColor(chalan.status)}
                          size="small"
                          icon={getStatusIcon(chalan.status)}
                        />
                      </TableCell>
                      <TableCell>
                        {new Date(chalan.created_at).toLocaleDateString()}
                      </TableCell>
                      <TableCell align="center">
                        <Tooltip title="View Details">
                          <IconButton
                            size="small"
                            color="primary"
                            onClick={() => router.push(`/distribution/chalans/${chalan._id}`)}
                          >
                            <ViewIcon />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Print">
                          <IconButton
                            size="small"
                            color="secondary"
                            onClick={() => window.open(`/distribution/chalans/${chalan._id}/print`, '_blank')}
                          >
                            <PrintIcon />
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
