'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  Box,
  Paper,
  Typography,
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
  Select,
  FormControl,
  InputLabel,
  IconButton,
  Tooltip,
  CircularProgress,
  Alert,
} from '@mui/material';
import {
  Visibility as VisibilityIcon,
  Refresh as RefreshIcon,
} from '@mui/icons-material';
import { useAuth } from '@/contexts/AuthContext';
import api from '@/lib/api';

interface RequisitionDetail {
  _id: string;
  product_id: {
    _id: string;
    sku: string;
    erp_id: string;
    name: string;
  };
  qty: number;
  batch_no?: string;
  note?: string;
}

interface Requisition {
  _id: string;
  requisition_no: string;
  requisition_date: string;
  from_depot_id: {
    _id: string;
    name: string;
    code?: string;
  };
  status: 'submitted' | 'approved' | 'rejected' | 'fulfilled' | 'cancelled';
  details: RequisitionDetail[];
  created_by: {
    _id: string;
    username: string;
  };
  created_at: string;
  updated_at: string;
}

const statusColors: Record<Requisition['status'], 'default' | 'primary' | 'success' | 'error' | 'warning'> = {
  submitted: 'primary',
  approved: 'success',
  rejected: 'error',
  fulfilled: 'success',
  cancelled: 'default',
};

export default function RequisitionListPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();

  const [requisitions, setRequisitions] = useState<Requisition[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Pagination
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [totalCount, setTotalCount] = useState(0);

  // Filters
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [sortBy, setSortBy] = useState('created_at');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // Check authentication
  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [user, authLoading, router]);

  // Load requisitions
  const loadRequisitions = useCallback(async () => {
    try {
      setLoading(true);
      setError('');

      const params: Record<string, string | number> = {
        page: page + 1,
        limit: rowsPerPage,
        sort_by: sortBy,
        sort_order: sortOrder,
      };

      if (search) params.search = search;
      if (statusFilter) params.status = statusFilter;

      const response = await api.get('/inventory/requisitions', { params });
      
      setRequisitions(response.data.data.requisitions || []);
      setTotalCount(response.data.data.pagination.total || 0);
    } catch (err: any) {
      console.error('Error loading requisitions:', err);
      setError(err.response?.data?.message || 'Failed to load requisitions');
    } finally {
      setLoading(false);
    }
  }, [page, rowsPerPage, search, statusFilter, sortBy, sortOrder]);

  useEffect(() => {
    if (user) {
      loadRequisitions();
    }
  }, [user, loadRequisitions]);

  const handleChangePage = (_event: unknown, newPage: number) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const handleViewDetails = (requisitionId: string) => {
    router.push(`/inventory/requisitionlist/${requisitionId}`);
  };

  const handleRefresh = () => {
    loadRequisitions();
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const getTotalItems = (details: RequisitionDetail[]) => {
    return details.reduce((sum, detail) => sum + detail.qty, 0);
  };

  if (authLoading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Paper sx={{ p: 3 }}>
        {/* Header */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Typography variant="h5" component="h1">
            Requisition List
          </Typography>
          <Tooltip title="Refresh">
            <IconButton onClick={handleRefresh} disabled={loading}>
              <RefreshIcon />
            </IconButton>
          </Tooltip>
        </Box>

        {/* Filters */}
        <Box sx={{ display: 'flex', gap: 2, mb: 3, flexWrap: 'wrap' }}>
          <TextField
            label="Search Requisition No"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(0);
            }}
            size="small"
            sx={{ minWidth: 200 }}
          />

          <FormControl size="small" sx={{ minWidth: 150 }}>
            <InputLabel>Status</InputLabel>
            <Select
              value={statusFilter}
              label="Status"
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(0);
              }}
            >
              <MenuItem value="">All</MenuItem>
              <MenuItem value="submitted">Submitted</MenuItem>
              <MenuItem value="approved">Approved</MenuItem>
              <MenuItem value="rejected">Rejected</MenuItem>
              <MenuItem value="fulfilled">Fulfilled</MenuItem>
              <MenuItem value="cancelled">Cancelled</MenuItem>
            </Select>
          </FormControl>

          <FormControl size="small" sx={{ minWidth: 150 }}>
            <InputLabel>Sort By</InputLabel>
            <Select
              value={sortBy}
              label="Sort By"
              onChange={(e) => setSortBy(e.target.value)}
            >
              <MenuItem value="created_at">Created Date</MenuItem>
              <MenuItem value="requisition_date">Requisition Date</MenuItem>
              <MenuItem value="requisition_no">Requisition No</MenuItem>
              <MenuItem value="status">Status</MenuItem>
            </Select>
          </FormControl>

          <FormControl size="small" sx={{ minWidth: 120 }}>
            <InputLabel>Order</InputLabel>
            <Select
              value={sortOrder}
              label="Order"
              onChange={(e) => setSortOrder(e.target.value as 'asc' | 'desc')}
            >
              <MenuItem value="desc">Newest First</MenuItem>
              <MenuItem value="asc">Oldest First</MenuItem>
            </Select>
          </FormControl>
        </Box>

        {/* Error Message */}
        {error && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
            {error}
          </Alert>
        )}

        {/* Table */}
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell sx={{ fontWeight: 'bold' }}>Requisition No</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>Requisition Date</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>From Facility</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>Status</TableCell>
                <TableCell align="right" sx={{ fontWeight: 'bold' }}>Total Items</TableCell>
                <TableCell align="right" sx={{ fontWeight: 'bold' }}>Total Qty (CTN)</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>Created By</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>Created At</TableCell>
                <TableCell align="center" sx={{ fontWeight: 'bold' }}>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={9} align="center" sx={{ py: 5 }}>
                    <CircularProgress size={40} />
                  </TableCell>
                </TableRow>
              ) : requisitions.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} align="center" sx={{ py: 5 }}>
                    <Typography color="text.secondary">
                      No requisitions found
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : (
                requisitions.map((requisition) => (
                  <TableRow key={requisition._id} hover>
                    <TableCell>
                      <Typography variant="body2" fontWeight="medium">
                        {requisition.requisition_no}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      {formatDate(requisition.requisition_date)}
                    </TableCell>
                    <TableCell>
                      {requisition.from_depot_id?.name || 'N/A'}
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={requisition.status.toUpperCase()}
                        color={statusColors[requisition.status]}
                        size="small"
                      />
                    </TableCell>
                    <TableCell align="right">
                      {requisition.details.length}
                    </TableCell>
                    <TableCell align="right">
                      {getTotalItems(requisition.details).toFixed(2)}
                    </TableCell>
                    <TableCell>
                      {requisition.created_by?.username || 'N/A'}
                    </TableCell>
                    <TableCell>
                      {formatDate(requisition.created_at)}
                    </TableCell>
                    <TableCell align="center">
                      <Tooltip title="View Details">
                        <IconButton
                          size="small"
                          onClick={() => handleViewDetails(requisition._id)}
                          color="primary"
                        >
                          <VisibilityIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>

        {/* Pagination */}
        <TablePagination
          component="div"
          count={totalCount}
          page={page}
          onPageChange={handleChangePage}
          rowsPerPage={rowsPerPage}
          onRowsPerPageChange={handleChangeRowsPerPage}
          rowsPerPageOptions={[5, 10, 25, 50]}
        />
      </Paper>
    </Box>
  );
}
