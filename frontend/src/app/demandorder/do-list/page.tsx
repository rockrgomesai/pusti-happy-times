'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  TextField,
  Button,
  MenuItem,
  Grid,
  Chip,
  IconButton,
  InputAdornment,
  Stack,
  Pagination,
  CircularProgress,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Divider,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  List,
  ListItem,
  ListItemText
} from '@mui/material';
import {
  Search as SearchIcon,
  FilterList as FilterIcon,
  Visibility as ViewIcon,
  History as HistoryIcon,
  Clear as ClearIcon,
  Close as CloseIcon
} from '@mui/icons-material';
import {
  Timeline,
  TimelineItem,
  TimelineSeparator,
  TimelineConnector,
  TimelineContent,
  TimelineDot,
  TimelineOppositeContent
} from '@mui/lab';
import { DataGrid, GridColDef } from '@mui/x-data-grid';
import { useRouter } from 'next/navigation';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { format } from 'date-fns';
import { apiClient } from '@/lib/api';
import { formatDateForDisplay } from '@/lib/dateUtils';

interface DOListItem {
  _id: string;
  order_number: string;
  distributor_id: {
    _id: string;
    name: string;
    erp_id: string;
  };
  status: string;
  total_amount: number;
  item_count: number;
  created_at: string;
  created_by: {
    username: string;
    full_name: string;
  };
  territory_info?: {
    zone?: { name: string };
    region?: { name: string };
    area?: { name: string };
    db_point?: { name: string };
  };
}

interface FilterOptions {
  zones: Array<{ _id: string; name: string }>;
  regions: Array<{ _id: string; name: string }>;
  areas: Array<{ _id: string; name: string }>;
  distributors: Array<{ _id: string; name: string; erp_id: string }>;
  statuses: Array<{ value: string; label: string }>;
}

interface CartItem {
  source: string;
  source_id: string;
  sku: string;
  quantity: number;
  unit_price: number;
  subtotal: number;
  name: string;
  available_quantity: number;
  offer_id?: string;
  offer_name?: string;
  offer_type?: string;
  discount_percentage?: number;
  discount_amount?: number;
  original_subtotal?: number;
  offer_details?: any;
}

const Grid2 = ({ size, children, ...props }: any) => (
  <Grid item xs={size?.xs || 12} sm={size?.sm} md={size?.md} {...props}>
    {children}
  </Grid>
);

export default function DOListPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [orders, setOrders] = useState<DOListItem[]>([]);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 25,
    total: 0,
    pages: 0
  });

  // Filters
  const [search, setSearch] = useState('');
  const [selectedDistributor, setSelectedDistributor] = useState('');
  const [selectedZone, setSelectedZone] = useState('');
  const [selectedRegion, setSelectedRegion] = useState('');
  const [selectedArea, setSelectedArea] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [fromDate, setFromDate] = useState<Date | null>(null);
  const [toDate, setToDate] = useState<Date | null>(null);

  // Filter options
  const [filterOptions, setFilterOptions] = useState<FilterOptions>({
    zones: [],
    regions: [],
    areas: [],
    distributors: [],
    statuses: []
  });

  const [showFilters, setShowFilters] = useState(false);
  const [error, setError] = useState('');

  // Order Details Dialog
  const [orderDetailsOpen, setOrderDetailsOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [loadingOrder, setLoadingOrder] = useState(false);
  const [financialSummary, setFinancialSummary] = useState<any>(null);
  const [loadingFinancial, setLoadingFinancial] = useState(false);

  // Load filter options
  useEffect(() => {
    loadFilterOptions();
  }, []);

  // Load DO list
  useEffect(() => {
    loadDOList();
  }, [pagination.page, pagination.limit]);

  const loadFilterOptions = async () => {
    try {
      const response: any = await apiClient.get('/demandorders/do-list/filters/options');
      console.log('Filter options response:', response);
      if (response.success) {
        console.log('Setting filter options:', response.data);
        setFilterOptions(response.data);
      }
    } catch (error: any) {
      console.error('Failed to load filter options:', error);
    }
  };

  const loadDOList = async () => {
    setLoading(true);
    setError('');

    try {
      const params: any = {
        page: pagination.page,
        limit: pagination.limit
      };

      if (search) params.search = search;
      if (selectedDistributor) params.distributor_id = selectedDistributor;
      if (selectedZone) params.zone_id = selectedZone;
      if (selectedRegion) params.region_id = selectedRegion;
      if (selectedArea) params.area_id = selectedArea;
      if (selectedStatus) params.status = selectedStatus;
      if (fromDate) params.from_date = fromDate.toISOString();
      if (toDate) params.to_date = toDate.toISOString();

      const response: any = await apiClient.get('/demandorders/do-list', params);

      if (response.success) {
        setOrders(response.data.orders);
        setPagination(response.data.pagination);
      }
    } catch (error: any) {
      setError(error.response?.data?.message || 'Failed to load DO list');
      console.error('Failed to load DO list:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = () => {
    setPagination(prev => ({ ...prev, page: 1 }));
    loadDOList();
  };

  const handleClearFilters = () => {
    setSearch('');
    setSelectedDistributor('');
    setSelectedZone('');
    setSelectedRegion('');
    setSelectedArea('');
    setSelectedStatus('');
    setFromDate(null);
    setToDate(null);
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  const handleViewDetails = async (orderId: string) => {
    setLoadingOrder(true);
    setOrderDetailsOpen(true);
    
    try {
      const response: any = await apiClient.get(`/ordermanagement/demandorders/${orderId}`);
      if (response.success) {
        setSelectedOrder(response.data);
        await fetchFinancialSummary(orderId);
      }
    } catch (error: any) {
      console.error('Failed to load order details:', error);
    } finally {
      setLoadingOrder(false);
    }
  };

  const fetchFinancialSummary = async (orderId: string) => {
    setLoadingFinancial(true);
    try {
      const response: any = await apiClient.get(`/ordermanagement/demandorders/${orderId}/financial-summary`);
      if (response.success) {
        setFinancialSummary(response.data);
      }
    } catch (error: any) {
      console.error('Failed to load financial summary:', error);
    } finally {
      setLoadingFinancial(false);
    }
  };

  const handleCloseOrderDetails = () => {
    setOrderDetailsOpen(false);
    setSelectedOrder(null);
    setFinancialSummary(null);
  };

  const handleViewHistory = (orderId: string) => {
    router.push(`/demandorder/do-list/history/${orderId}`);
  };

  const getStatusColor = (status: string) => {
    const colors: { [key: string]: 'default' | 'primary' | 'success' | 'error' | 'warning' | 'info' } = {
      draft: 'default',
      submitted: 'info',
      approved: 'success',
      rejected: 'error',
      cancelled: 'default',
      forwarded_to_distribution: 'primary',
      scheduling_in_progress: 'warning',
      scheduling_completed: 'success'
    };
    return colors[status] || 'default';
  };

  const columns: GridColDef[] = [
    {
      field: 'order_number',
      headerName: 'DO Number',
      width: 180,
      renderCell: (params) => (
        <Typography variant="body2" fontWeight="600">
          {params.value}
        </Typography>
      )
    },
    {
      field: 'distributor',
      headerName: 'Distributor',
      width: 200,
      valueGetter: (value: any, row: any) => row.distributor_id?.name || '-',
      headerAlign: 'left',
      align: 'left'
    },
    {
      field: 'territory',
      headerName: 'Territory',
      width: 250,
      renderCell: (params) => {
        const info = params.row.territory_info;
        if (!info) return <Typography variant="caption">-</Typography>;
        
        const zoneName = info.zone?.name || '';
        const regionName = info.region?.name || '';
        const areaName = info.area?.name || '';
        const dbPointName = info.db_point?.name || '';
        
        // Only show if we have at least some data
        const hasTopLevel = zoneName || regionName;
        const hasBottomLevel = areaName || dbPointName;
        
        if (!hasTopLevel && !hasBottomLevel) {
          return <Typography variant="caption">-</Typography>;
        }
        
        return (
          <Box>
            {hasTopLevel && (
              <Typography variant="caption" display="block">
                {[zoneName, regionName].filter(Boolean).join(' / ')}
              </Typography>
            )}
            {hasBottomLevel && (
              <Typography variant="caption" color="text.secondary" display="block">
                {[areaName, dbPointName].filter(Boolean).join(' / ')}
              </Typography>
            )}
          </Box>
        );
      }
    },
    {
      field: 'status',
      headerName: 'Status',
      width: 180,
      renderCell: (params) => (
        <Chip
          label={params.value.replace(/_/g, ' ').toUpperCase()}
          color={getStatusColor(params.value)}
          size="small"
        />
      )
    },
    {
      field: 'total_amount',
      headerName: 'Total Amount',
      width: 130,
      align: 'right',
      headerAlign: 'right',
      valueFormatter: (value: any) => `৳${value?.toLocaleString() || 0}`
    },
    {
      field: 'item_count',
      headerName: 'Items',
      width: 80,
      align: 'center',
      headerAlign: 'center'
    },
    {
      field: 'created_at',
      headerName: 'Created Date',
      width: 130,
      valueFormatter: (value: any) => 
        format(new Date(value), 'dd/MM/yy')
    },
    {
      field: 'actions',
      headerName: 'Actions',
      width: 80,
      sortable: false,
      align: 'center',
      headerAlign: 'center',
      renderCell: (params) => (
        <IconButton
          size="small"
          color="primary"
          onClick={() => handleViewDetails(params.row._id)}
          title="View Details"
        >
          <ViewIcon fontSize="small" />
        </IconButton>
      )
    }
  ];

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns}>
      <Box sx={{ p: 3 }}>
        <Typography variant="h4" gutterBottom>
          DO List
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          View and search demand orders with filters
        </Typography>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
            {error}
          </Alert>
        )}

        <Card sx={{ mb: 3 }}>
          <CardContent>
            {/* Search Bar */}
            <Grid container spacing={2} alignItems="center">
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  size="small"
                  placeholder="Search by DO number..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <SearchIcon />
                      </InputAdornment>
                    ),
                    endAdornment: search && (
                      <InputAdornment position="end">
                        <IconButton size="small" onClick={() => setSearch('')}>
                          <ClearIcon />
                        </IconButton>
                      </InputAdornment>
                    )
                  }}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <Stack direction="row" spacing={1}>
                  <Button
                    variant="contained"
                    startIcon={<SearchIcon />}
                    onClick={handleSearch}
                    disabled={loading}
                  >
                    Search
                  </Button>
                  <Button
                    variant="outlined"
                    startIcon={<FilterIcon />}
                    onClick={() => setShowFilters(!showFilters)}
                  >
                    {showFilters ? 'Hide' : 'Show'} Filters
                  </Button>
                  <Button
                    variant="text"
                    onClick={handleClearFilters}
                    disabled={loading}
                  >
                    Clear
                  </Button>
                </Stack>
              </Grid>
            </Grid>

            {/* Advanced Filters */}
            {showFilters && (
              <Box sx={{ mt: 3, pt: 3, borderTop: 1, borderColor: 'divider' }}>
                <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 2 }}>
                  Advanced Filters
                </Typography>
                <Grid container spacing={2}>
                  {/* Distributor */}
                  <Grid item xs={12} sm={6} md={6}>
                    <TextField
                      select
                      fullWidth
                      size="small"
                      label="Distributor"
                      value={selectedDistributor}
                      onChange={(e) => setSelectedDistributor(e.target.value)}
                      SelectProps={{ native: true }}
                      InputLabelProps={{ shrink: true }}
                    >
                      <option value="">All Distributors</option>
                      {filterOptions.distributors.map((dist) => (
                        <option key={dist._id} value={dist._id}>
                          {dist.name} ({dist.erp_id})
                        </option>
                      ))}
                    </TextField>
                  </Grid>

                  {/* Status */}
                  <Grid item xs={12} sm={6} md={6}>
                    <TextField
                      select
                      fullWidth
                      size="small"
                      label="Status"
                      value={selectedStatus}
                      onChange={(e) => setSelectedStatus(e.target.value)}
                      SelectProps={{ native: true }}
                      InputLabelProps={{ shrink: true }}
                    >
                      <option value="">All Statuses</option>
                      {filterOptions.statuses.map((status) => (
                        <option key={status.value} value={status.value}>
                          {status.label}
                        </option>
                      ))}
                    </TextField>
                  </Grid>

                  {/* Zone - Only show if user has access to zones */}
                  {filterOptions.zones.length > 0 && (
                    <Grid item xs={12} sm={6} md={3}>
                      <TextField
                        select
                        fullWidth
                        size="small"
                        label="Zone"
                        value={selectedZone}
                        onChange={(e) => setSelectedZone(e.target.value)}
                        SelectProps={{ native: true }}
                        InputLabelProps={{ shrink: true }}
                      >
                        <option value="">All Zones</option>
                        {filterOptions.zones.map((zone) => (
                          <option key={zone._id} value={zone._id}>
                            {zone.name}
                          </option>
                        ))}
                      </TextField>
                    </Grid>
                  )}

                  {/* Region - Only show if user has access to regions */}
                  {filterOptions.regions.length > 0 && (
                    <Grid item xs={12} sm={6} md={3}>
                      <TextField
                        select
                        fullWidth
                        size="small"
                        label="Region"
                        value={selectedRegion}
                        onChange={(e) => setSelectedRegion(e.target.value)}
                        SelectProps={{ native: true }}
                        InputLabelProps={{ shrink: true }}
                      >
                        <option value="">All Regions</option>
                        {filterOptions.regions.map((region) => (
                          <option key={region._id} value={region._id}>
                            {region.name}
                          </option>
                        ))}
                      </TextField>
                    </Grid>
                  )}

                  {/* Area - Only show if user has access to areas */}
                  {filterOptions.areas.length > 0 && (
                    <Grid item xs={12} sm={6} md={3}>
                    <TextField
                      select
                      fullWidth
                      size="small"
                      label="Area"
                      value={selectedArea}
                      onChange={(e) => setSelectedArea(e.target.value)}
                      SelectProps={{ native: true }}
                      InputLabelProps={{ shrink: true }}
                    >
                      <option value="">All Areas</option>
                      {filterOptions.areas.map((area) => (
                        <option key={area._id} value={area._id}>
                          {area.name}
                        </option>
                      ))}
                    </TextField>
                  </Grid>
                  )}

                  {/* From Date */}
                  <Grid item xs={12} sm={6} md={3}>
                    <DatePicker
                      label="From Date"
                      value={fromDate}
                      onChange={setFromDate}
                      slotProps={{ textField: { size: 'small', fullWidth: true } }}
                    />
                  </Grid>

                  {/* To Date */}
                  <Grid item xs={12} sm={6} md={3}>
                    <DatePicker
                      label="To Date"
                      value={toDate}
                      onChange={setToDate}
                      slotProps={{ textField: { size: 'small', fullWidth: true } }}
                    />
                  </Grid>
                </Grid>
              </Box>
            )}
          </CardContent>
        </Card>

        {/* Data Grid */}
        <Card>
          <Box sx={{ height: 600, width: '100%' }}>
            <DataGrid
              rows={orders}
              columns={columns}
              loading={loading}
              pageSizeOptions={[10, 25, 50, 100]}
              paginationMode="server"
              rowCount={pagination.total}
              paginationModel={{
                page: pagination.page - 1,
                pageSize: pagination.limit
              }}
              onPaginationModelChange={(model) => {
                setPagination(prev => ({
                  ...prev,
                  page: model.page + 1,
                  limit: model.pageSize
                }));
              }}
              getRowId={(row) => row._id}
              disableRowSelectionOnClick
              sx={{
                '& .MuiDataGrid-cell': {
                  py: 1,
                  display: 'flex',
                  alignItems: 'center'
                }
              }}
            />
          </Box>
        </Card>
      </Box>

      {/* Order Details Dialog */}
      <Dialog
        open={orderDetailsOpen}
        onClose={handleCloseOrderDetails}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="h6">Order Details</Typography>
            <IconButton onClick={handleCloseOrderDetails} size="small">
              <CloseIcon />
            </IconButton>
          </Box>
        </DialogTitle>
        <DialogContent dividers>
          {loadingOrder ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 5 }}>
              <CircularProgress />
            </Box>
          ) : selectedOrder ? (
            <>
              {/* Order Info */}
              <Grid container spacing={2} sx={{ mb: 3 }}>
                <Grid2 size={{ xs: 12, sm: 6 }}>
                  <Typography variant="body2" color="text.secondary">Order Number</Typography>
                  <Typography variant="body1" fontWeight="bold">{selectedOrder.order_number}</Typography>
                </Grid2>
                <Grid2 size={{ xs: 12, sm: 6 }}>
                  <Typography variant="body2" color="text.secondary">Status</Typography>
                  <Chip
                    label={selectedOrder.status.toUpperCase()}
                    color={getStatusColor(selectedOrder.status)}
                    size="small"
                  />
                </Grid2>
                <Grid2 size={{ xs: 12, sm: 6 }}>
                  <Typography variant="body2" color="text.secondary">Created</Typography>
                  <Typography variant="body1">{formatDateForDisplay(selectedOrder.created_at)}</Typography>
                </Grid2>
                {selectedOrder.submitted_at && (
                  <Grid2 size={{ xs: 12, sm: 6 }}>
                    <Typography variant="body2" color="text.secondary">Submitted</Typography>
                    <Typography variant="body1">{formatDateForDisplay(selectedOrder.submitted_at)}</Typography>
                  </Grid2>
                )}
                {selectedOrder.approved_at && (
                  <Grid2 size={{ xs: 12, sm: 6 }}>
                    <Typography variant="body2" color="text.secondary">Approved</Typography>
                    <Typography variant="body1">{formatDateForDisplay(selectedOrder.approved_at)}</Typography>
                  </Grid2>
                )}
                {selectedOrder.rejected_at && (
                  <Grid2 size={{ xs: 12, sm: 6 }}>
                    <Typography variant="body2" color="text.secondary">Rejected</Typography>
                    <Typography variant="body1">{formatDateForDisplay(selectedOrder.rejected_at)}</Typography>
                  </Grid2>
                )}
                {selectedOrder.rejection_reason && (
                  <Grid2 size={{ xs: 12 }}>
                    <Alert severity="error">
                      <Typography variant="body2" fontWeight="bold">Rejection Reason:</Typography>
                      <Typography variant="body2">{selectedOrder.rejection_reason}</Typography>
                    </Alert>
                  </Grid2>
                )}
                {selectedOrder.cancellation_reason && (
                  <Grid2 size={{ xs: 12 }}>
                    <Alert severity="warning">
                      <Typography variant="body2" fontWeight="bold">Cancellation Reason:</Typography>
                      <Typography variant="body2">{selectedOrder.cancellation_reason}</Typography>
                    </Alert>
                  </Grid2>
                )}
              </Grid>

              <Divider sx={{ my: 2 }} />

              {/* Order Items */}
              <Typography variant="h6" sx={{ mb: 2 }}>
                Order Items ({selectedOrder.item_count || selectedOrder.items?.length || 0})
              </Typography>
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell><strong>SKU</strong></TableCell>
                      <TableCell><strong>Source</strong></TableCell>
                      <TableCell align="right"><strong>Quantity</strong></TableCell>
                      <TableCell align="right"><strong>Unit Price</strong></TableCell>
                      <TableCell align="right"><strong>Subtotal</strong></TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {selectedOrder.items?.map((item: any, index: number) => (
                      <TableRow key={index}>
                        <TableCell>
                          <Typography variant="body2" fontWeight="bold">{item.sku}</Typography>
                          <Typography variant="caption" color="text.secondary">
                            {item.source === "product" ? item.product_details?.short_description : item.offer_details?.offer_short_name}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Chip label={item.source} size="small" color={item.source === "product" ? "primary" : "secondary"} />
                        </TableCell>
                        <TableCell align="right">{item.quantity}</TableCell>
                        <TableCell align="right">৳{item.unit_price?.toFixed(2) || '0.00'}</TableCell>
                        <TableCell align="right">৳{item.subtotal?.toFixed(2) || '0.00'}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>

              <Divider sx={{ my: 2 }} />

              {/* Financial Summary */}
              <Typography variant="h6" sx={{ mb: 2 }}>Financial Summary</Typography>
              {loadingFinancial ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', py: 3 }}>
                  <CircularProgress size={30} />
                </Box>
              ) : financialSummary ? (
                <Box sx={{ display: "flex", justifyContent: "flex-end" }}>
                  <Box sx={{ minWidth: 300 }}>
                    <Box sx={{ display: "flex", justifyContent: "space-between", mb: 1.5 }}>
                      <Typography variant="body1" fontWeight={600}>Order Total:</Typography>
                      <Typography variant="body1" fontWeight={600}>৳{(financialSummary?.orderTotal || 0).toFixed(2)}</Typography>
                    </Box>
                    <Divider sx={{ my: 1.5 }} />
                    <Box sx={{ display: "flex", justifyContent: "space-between", mb: 1 }}>
                      <Typography variant="body2" color="text.secondary">Available Balance:</Typography>
                      <Typography variant="body2" color={(financialSummary?.availableBalance || 0) >= 0 ? "success.main" : "error.main"}>
                        ৳{(financialSummary?.availableBalance || 0).toFixed(2)}
                      </Typography>
                    </Box>
                    <Box sx={{ display: "flex", justifyContent: "space-between", mb: 1 }}>
                      <Typography variant="body2" color="text.secondary">Remaining Amount:</Typography>
                      <Typography variant="body2">৳{(financialSummary?.remainingAmount || 0).toFixed(2)}</Typography>
                    </Box>
                    <Box sx={{ display: "flex", justifyContent: "space-between", mb: 1 }}>
                      <Typography variant="body2" color="text.secondary">Unapproved Payments:</Typography>
                      <Typography variant="body2" color="warning.main">৳{(financialSummary?.unapprovedPayments || 0).toFixed(2)}</Typography>
                    </Box>
                    <Divider sx={{ my: 1.5 }} />
                    <Box sx={{ display: "flex", justifyContent: "space-between", mt: 1 }}>
                      <Typography variant="h6" color="primary">Due Amount:</Typography>
                      <Typography variant="h6" color="primary">৳{(financialSummary?.dueAmount || 0).toFixed(2)}</Typography>
                    </Box>
                  </Box>
                </Box>
              ) : null}

              {/* Payments List */}
              {financialSummary && financialSummary.payments?.length > 0 && (
                <>
                  <Divider sx={{ my: 3 }} />
                  <Typography variant="h6" sx={{ mb: 2 }}>Payments ({financialSummary.payments.length})</Typography>
                  <TableContainer>
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell><strong>Transaction ID</strong></TableCell>
                          <TableCell><strong>Date</strong></TableCell>
                          <TableCell><strong>Method</strong></TableCell>
                          <TableCell align="right"><strong>Amount</strong></TableCell>
                          <TableCell><strong>Status</strong></TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {financialSummary.payments.map((payment: any) => (
                          <TableRow key={payment._id}>
                            <TableCell><Typography variant="body2">{payment.transaction_id}</Typography></TableCell>
                            <TableCell>{formatDateForDisplay(payment.deposit_date)}</TableCell>
                            <TableCell>
                              <Chip label={payment.payment_method} size="small" color={payment.payment_method === 'Bank' ? 'primary' : 'default'} />
                            </TableCell>
                            <TableCell align="right">৳{payment.deposit_amount?.toFixed(2) || '0.00'}</TableCell>
                            <TableCell>
                              <Chip 
                                label={(payment.status || 'pending').replace(/_/g, ' ')} 
                                size="small"
                                color={payment.status === 'approved' ? 'success' : payment.status === 'cancelled' ? 'error' : 'warning'}
                              />
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </>
              )}

              {/* Offers Summary */}
              {selectedOrder && selectedOrder.items && (() => {
                const cartItems: CartItem[] = selectedOrder.items.map((item: any) => ({
                  source: item.source,
                  source_id: item.source_id,
                  sku: item.sku,
                  quantity: item.quantity,
                  unit_price: item.unit_price,
                  subtotal: item.subtotal,
                  name: item.sku,
                  available_quantity: 0,
                  ...(item.offer_details && (item.offer_details.offer_id || item.offer_details.offer_name) && {
                    offer_id: item.offer_details.offer_id,
                    offer_name: item.offer_details.offer_name,
                    offer_type: item.offer_details.offer_type,
                    discount_percentage: item.offer_details.discount_percentage,
                    discount_amount: item.offer_details.discount_amount,
                    original_subtotal: item.offer_details.original_subtotal,
                  }),
                  offer_details: item.offer_details
                }));

                const groups: Record<string, { offer: any; items: CartItem[] }> = {};
                cartItems.forEach((item) => {
                  const key = item.offer_id?.toString() || item.offer_name || 'no-offer';
                  if (!groups[key]) {
                    groups[key] = {
                      offer: (item.offer_id || item.offer_name) ? { _id: item.offer_id, name: item.offer_name, config: { type: item.offer_type } } : null,
                      items: [],
                    };
                  }
                  groups[key].items.push(item);
                });

                const discountBreakdown: Array<{ offerName: string; discountAmount: number; items: CartItem[] }> = [];
                Object.values(groups).forEach(({ offer, items }) => {
                  let groupOriginal = 0;
                  let groupActual = 0;
                  items.forEach(item => {
                    groupOriginal += (item.original_subtotal || item.unit_price * item.quantity);
                    groupActual += item.subtotal;
                  });
                  const discountAmount = groupOriginal - groupActual;
                  if (discountAmount > 0) {
                    discountBreakdown.push({ offerName: offer?.name || 'Regular Discount', discountAmount: discountAmount, items: items });
                  }
                });

                const totalDiscount = discountBreakdown.reduce((sum, d) => sum + d.discountAmount, 0);
                const offers = discountBreakdown.map(d => ({
                  offerName: d.offerName,
                  offerType: 'DISCOUNT',
                  items: d.items,
                  totalDiscount: d.discountAmount,
                  totalFreeValue: 0,
                }));
                const totalFreeValue = 0;
                const discountOffers = offers;
                const freeProductOffers: any[] = [];

                if (offers.length === 0) return null;

                return (
                  <>
                    <Divider sx={{ my: 3 }} />
                    <Typography variant="h6" sx={{ mb: 2 }}>Offers Summary</Typography>
                    <Box>
                      <Grid container spacing={2} sx={{ mb: 2 }}>
                        <Grid2 size={{ xs: 12, sm: 6 }}>
                          <Paper sx={{ p: 2, bgcolor: 'success.50', border: '1px solid', borderColor: 'success.200' }}>
                            <Typography variant="caption" color="text.secondary">Total Discount</Typography>
                            <Typography variant="h6" color="success.dark">৳{totalDiscount.toFixed(2)}</Typography>
                            <Typography variant="caption">{discountOffers.length} discount offer(s)</Typography>
                          </Paper>
                        </Grid2>
                        <Grid2 size={{ xs: 12, sm: 6 }}>
                          <Paper sx={{ p: 2, bgcolor: 'secondary.50', border: '1px solid', borderColor: 'secondary.200' }}>
                            <Typography variant="caption" color="text.secondary">Free Products Value</Typography>
                            <Typography variant="h6" color="secondary.dark">৳{totalFreeValue.toFixed(2)}</Typography>
                            <Typography variant="caption">{freeProductOffers.length} free product offer(s)</Typography>
                          </Paper>
                        </Grid2>
                      </Grid>
                      <Typography variant="subtitle2" fontWeight="bold" sx={{ mb: 1 }}>Offers Applied</Typography>
                      <List dense>
                        {offers.map((offer, idx) => (
                          <ListItem key={idx} sx={{ py: 1, px: 0, alignItems: 'flex-start', borderBottom: '1px solid', borderColor: 'divider' }}>
                            <ListItemText
                              primary={
                                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.5 }}>
                                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                    <Typography variant="body2" fontWeight="medium">{offer.offerName}</Typography>
                                    <Chip label={offer.offerType} size="small" color="primary" />
                                  </Box>
                                  <Typography variant="body2" fontWeight="bold" color={offer.totalDiscount > 0 ? 'success.dark' : 'secondary.dark'}>
                                    {offer.totalDiscount > 0 && `-৳${offer.totalDiscount.toFixed(2)}`}
                                    {offer.totalFreeValue > 0 && `৳${offer.totalFreeValue.toFixed(2)} free`}
                                  </Typography>
                                </Box>
                              }
                              secondary={
                                <Box>
                                  <Typography variant="caption" color="text.secondary" display="block">
                                    {offer.items.length} item(s) in this offer
                                  </Typography>
                                  <Box sx={{ mt: 1 }}>
                                    {offer.items.map((item, itemIdx) => {
                                      const originalSubtotal = (item as any).original_subtotal || item.offer_details?.original_subtotal || item.unit_price * item.quantity;
                                      const actualSubtotal = item.subtotal || 0;
                                      const itemDiscount = originalSubtotal - actualSubtotal;
                                      return (
                                        <Box key={itemIdx} sx={{ display: 'flex', justifyContent: 'space-between', py: 0.25 }}>
                                          <Typography variant="caption" color="text.secondary">{item.sku} × {item.quantity}</Typography>
                                          <Typography variant="caption" color="text.secondary">
                                            {actualSubtotal === 0 || item.offer_details?.is_free_in_bundle ? 'Free' : itemDiscount > 0 ? `-৳${itemDiscount.toFixed(2)}` : ''}
                                          </Typography>
                                        </Box>
                                      );
                                    })}
                                  </Box>
                                </Box>
                              }
                              secondaryTypographyProps={{ component: 'div' }}
                            />
                          </ListItem>
                        ))}
                      </List>
                    </Box>
                  </>
                );
              })()}

              {/* Approval History */}
              {selectedOrder && selectedOrder.approval_history && selectedOrder.approval_history.length > 0 && (
                <>
                  <Divider sx={{ my: 3 }} />
                  <Typography variant="subtitle1" gutterBottom fontWeight="bold">Order History</Typography>
                  {console.log('📋 Approval history for order:', selectedOrder.order_number, selectedOrder.approval_history)}
                  <Timeline position="right">
                    {[...selectedOrder.approval_history].reverse().map((history: any, index: number) => (
                      <TimelineItem key={index}>
                        <TimelineOppositeContent color="text.secondary" sx={{ flex: 0.3 }}>
                          <Typography variant="caption">{new Date(history.timestamp).toLocaleString()}</Typography>
                        </TimelineOppositeContent>
                        <TimelineSeparator>
                          <TimelineDot
                            color={
                              history.action === "submit" || history.action === "submitted" ? "primary" :
                              history.action === "forward" || history.action === "forwarded" ? "info" :
                              history.action === "return" ? "warning" :
                              history.action === "modify" || history.action === "schedule" ? "warning" :
                              history.action === "approve" || history.action === "approved" ? "success" :
                              history.action === "reject" || history.action === "rejected" || history.action === "cancel" ? "error" : "grey"
                            }
                          />
                          {index < [...selectedOrder.approval_history].reverse().length - 1 && <TimelineConnector />}
                        </TimelineSeparator>
                        <TimelineContent>
                          <Typography variant="subtitle2" fontWeight="bold">{history.action.replace(/_/g, ' ').toUpperCase()}</Typography>
                          <Typography variant="body2" color="text.secondary">
                            By: {history.performed_by_name || 'N/A'} ({history.performed_by_role || 'N/A'})
                          </Typography>
                          {history.comments && (
                            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>Note: {history.comments}</Typography>
                          )}
                        </TimelineContent>
                      </TimelineItem>
                    ))}
                  </Timeline>
                </>
              )}
            </>
          ) : null}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseOrderDetails}>Close</Button>
        </DialogActions>
      </Dialog>
    </LocalizationProvider>
  );
}
