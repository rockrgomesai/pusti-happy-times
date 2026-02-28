'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Box,
  Typography,
  Button,
  Card,
  CardContent,
  CardActions,
  IconButton,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Alert,
  Grid,
  Skeleton,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  InputAdornment,
  TableSortLabel,
  TablePagination,
  FormControlLabel,
  Switch,
  Chip,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  FormHelperText,
  Stack,
  Container,
  useTheme,
  useMediaQuery,
  Collapse,
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Store as StoreIcon,
  Search as SearchIcon,
  Phone as PhoneIcon,
  AttachMoney as MoneyIcon,
  CheckCircle as CheckCircleIcon,
  Cancel as CancelIcon,
  HourglassEmpty as PendingIcon,
  FilterList as FilterListIcon,
  Clear as ClearIcon,
  ExpandMore as ExpandMoreIcon,
} from '@mui/icons-material';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'react-hot-toast';
import { outletsApi } from '@/lib/api/outlets';
import { listRoutes } from '@/lib/api/routes';
import { outletTypesApi } from '@/lib/api/outletTypes';
import { outletChannelsApi } from '@/lib/api/outletChannels';
import type { Outlet } from '@/types/outlet';
import type { Route } from '@/types/route';
import type { OutletType } from '@/types/outletType';
import type { OutletChannel } from '@/types/outletChannel';

// Form schema
const outletSchema = z.object({
  outlet_name: z.string().min(2, 'Outlet name is required'),
  outlet_name_bangla: z.string().optional(),
  route_id: z.string().min(1, 'Route is required'),
  outlet_type: z.string().min(1, 'Outlet type is required'),
  outlet_channel_id: z.string().min(1, 'Outlet channel is required'),
  address: z.string().optional(),
  address_bangla: z.string().optional(),
  lati: z.preprocess(
    (val) => (val === '' || val === null || val === undefined ? undefined : Number(val)),
    z.number().min(-90).max(90).optional()
  ),
  longi: z.preprocess(
    (val) => (val === '' || val === null || val === undefined ? undefined : Number(val)),
    z.number().min(-180).max(180).optional()
  ),
  contact_person: z.string().optional(),
  mobile: z
    .string()
    .optional()
    .refine(
      (val) => !val || /^(\+88)?01[3-9]\d{8}$/.test(val),
      'Invalid mobile format (use 01XXXXXXXXX)'
    ),
  credit_limit: z.preprocess(
    (val) => (val === '' || val === null || val === undefined ? 0 : Number(val)),
    z.number().min(0).optional()
  ),
  market_size: z.preprocess(
    (val) => (val === '' || val === null || val === undefined ? 0 : Number(val)),
    z.number().min(0).optional()
  ),
  comments: z.string().optional(),
  active: z.boolean(),
});

type OutletFormData = z.infer<typeof outletSchema>;

type Order = 'asc' | 'desc';
type OrderableKeys = keyof Pick<Outlet, 'outlet_name' | 'outlet_id' | 'created_date'>;

export default function OutletsPage() {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const isTablet = useMediaQuery(theme.breakpoints.down('md'));

  // State management
  const [outlets, setOutlets] = useState<Outlet[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [openDialog, setOpenDialog] = useState(false);
  const [editingOutlet, setEditingOutlet] = useState<Outlet | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [outletToDelete, setOutletToDelete] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);

  // Filter states
  const [filterRoute, setFilterRoute] = useState<string>('');
  const [filterOutletType, setFilterOutletType] = useState<string>('');
  const [filterChannel, setFilterChannel] = useState<string>('');
  const [filterVerificationStatus, setFilterVerificationStatus] = useState<string>('all');

  // Dropdown data
  const [routes, setRoutes] = useState<Route[]>([]);
  const [outletTypes, setOutletTypes] = useState<OutletType[]>([]);
  const [outletChannels, setOutletChannels] = useState<OutletChannel[]>([]);

  // Sorting and pagination
  const [orderBy, setOrderBy] = useState<OrderableKeys>('outlet_name');
  const [order, setOrder] = useState<Order>('asc');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  // Form setup
  const {
    control,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<OutletFormData>({
    resolver: zodResolver(outletSchema),
    defaultValues: {
      outlet_name: '',
      outlet_name_bangla: '',
      route_id: '',
      outlet_type: '',
      outlet_channel_id: '',
      address: '',
      address_bangla: '',
      lati: '' as any,
      longi: '' as any,
      contact_person: '',
      mobile: '',
      credit_limit: '' as any,
      market_size: '' as any,
      comments: '',
      active: true,
    },
  });

  // Load dropdown data
  useEffect(() => {
    const loadDropdowns = async () => {
      try {
        const [routesData, typesData, channelsData] = await Promise.all([
          listRoutes({ active: 'true', limit: 1000 }),
          outletTypesApi.list({ active: 'true', limit: 100 }),
          outletChannelsApi.list({ active: 'true', limit: 100 }),
        ]);
        setRoutes(routesData.routes || []);
        setOutletTypes(typesData.data || []);
        setOutletChannels(channelsData.data || []);
      } catch (error) {
        console.error('Error loading dropdown data:', error);
        toast.error('Failed to load dropdown options');
      }
    };
    loadDropdowns();
  }, []);

  // Load outlets
  const loadOutlets = useCallback(async () => {
    try {
      setLoading(true);
      const params: any = {
        sortBy: 'outlet_name',
        sortOrder: 'asc',
        limit: 1000,
      };

      if (filterRoute) params.route_id = filterRoute;
      if (filterOutletType) params.outlet_type = filterOutletType;
      if (filterChannel) params.outlet_channel_id = filterChannel;
      if (filterVerificationStatus !== 'all') params.verification_status = filterVerificationStatus;

      const response = await outletsApi.list(params);
      setOutlets(response.data);
    } catch (error) {
      toast.error('Failed to load outlets');
      console.error('Error loading outlets:', error);
    } finally {
      setLoading(false);
    }
  }, [filterRoute, filterOutletType, filterChannel, filterVerificationStatus]);

  useEffect(() => {
    loadOutlets();
  }, [loadOutlets]);

  // Form submission
  const onSubmit = async (data: OutletFormData) => {
    try {
      const cleanData: any = { ...data };
      if (cleanData.lati === '') cleanData.lati = 0;
      if (cleanData.longi === '') cleanData.longi = 0;
      if (cleanData.credit_limit === '') cleanData.credit_limit = 0;
      if (cleanData.market_size === '') cleanData.market_size = 0;

      if (editingOutlet) {
        await outletsApi.update(editingOutlet._id, cleanData);
        toast.success('Outlet updated successfully');
      } else {
        await outletsApi.create(cleanData);
        toast.success('Outlet created successfully');
      }

      setOpenDialog(false);
      reset();
      setEditingOutlet(null);
      loadOutlets();
    } catch (error: any) {
      const errorMessage = error?.response?.data?.message || error?.message || 'Failed to save outlet';
      toast.error(errorMessage);
    }
  };

  // Handle delete
  const handleDelete = async () => {
    if (!outletToDelete) return;

    try {
      await outletsApi.delete(outletToDelete);
      toast.success('Outlet deactivated successfully');
      setDeleteConfirmOpen(false);
      setOutletToDelete(null);
      loadOutlets();
    } catch (error: any) {
      const errorMessage = error?.response?.data?.message || 'Failed to delete outlet';
      toast.error(errorMessage);
    }
  };

  // Handle activate/deactivate toggle
  const handleToggleActive = async (outlet: Outlet) => {
    try {
      if (outlet.active) {
        await outletsApi.delete(outlet._id);
        toast.success('Outlet deactivated');
      } else {
        await outletsApi.activate(outlet._id);
        toast.success('Outlet activated');
      }
      loadOutlets();
    } catch (error: any) {
      const errorMessage = error?.response?.data?.message || 'Failed to update status';
      toast.error(errorMessage);
    }
  };

  // Handle edit
  const handleEdit = useCallback(
    (outlet: Outlet) => {
      setEditingOutlet(outlet);
      const routeId = typeof outlet.route_id === 'string' ? outlet.route_id : outlet.route_id._id;
      const outletTypeId = typeof outlet.outlet_type === 'string' ? outlet.outlet_type : outlet.outlet_type._id;
      const channelId =
        typeof outlet.outlet_channel_id === 'string' ? outlet.outlet_channel_id : outlet.outlet_channel_id._id;

      reset({
        outlet_name: outlet.outlet_name,
        outlet_name_bangla: outlet.outlet_name_bangla || '',
        route_id: routeId,
        outlet_type: outletTypeId,
        outlet_channel_id: channelId,
        address: outlet.address || '',
        address_bangla: outlet.address_bangla || '',
        lati: outlet.lati || ('' as any),
        longi: outlet.longi || ('' as any),
        contact_person: outlet.contact_person || '',
        mobile: outlet.mobile || '',
        credit_limit: outlet.credit_limit || ('' as any),
        market_size: outlet.market_size || ('' as any),
        comments: outlet.comments || '',
        active: outlet.active,
      });
      setOpenDialog(true);
    },
    [reset]
  );

  // Handle add new
  const handleAdd = useCallback(() => {
    setEditingOutlet(null);
    reset({
      outlet_name: '',
      outlet_name_bangla: '',
      route_id: '',
      outlet_type: '',
      outlet_channel_id: '',
      address: '',
      address_bangla: '',
      lati: '' as any,
      longi: '' as any,
      contact_person: '',
      mobile: '',
      credit_limit: '' as any,
      market_size: '' as any,
      comments: '',
      active: true,
    });
    setOpenDialog(true);
  }, [reset]);

  // Clear filters
  const clearFilters = () => {
    setFilterRoute('');
    setFilterOutletType('');
    setFilterChannel('');
    setFilterVerificationStatus('all');
    setSearchTerm('');
  };

  // Filtered and sorted outlets
  const filteredOutlets = useMemo(() => {
    let filtered = outlets.filter((outlet) =>
      searchTerm
        ? outlet.outlet_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          outlet.outlet_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
          outlet.mobile?.toLowerCase().includes(searchTerm.toLowerCase())
        : true
    );

    filtered.sort((a, b) => {
      const aValue = a[orderBy];
      const bValue = b[orderBy];

      if (aValue == null) return 1;
      if (bValue == null) return -1;

      if (typeof aValue === 'string' && typeof bValue === 'string') {
        return order === 'asc' ? aValue.localeCompare(bValue) : bValue.localeCompare(aValue);
      }

      return order === 'asc' ? (aValue > bValue ? 1 : -1) : aValue < bValue ? 1 : -1;
    });

    return filtered;
  }, [outlets, searchTerm, orderBy, order]);

  // Pagination
  const paginatedOutlets = useMemo(() => {
    const start = page * rowsPerPage;
    return filteredOutlets.slice(start, start + rowsPerPage);
  }, [filteredOutlets, page, rowsPerPage]);

  const handleSort = (property: OrderableKeys) => {
    const isAsc = orderBy === property && order === 'asc';
    setOrder(isAsc ? 'desc' : 'asc');
    setOrderBy(property);
  };

  const getVerificationStatusChip = (status: string) => {
    switch (status) {
      case 'VERIFIED':
        return <Chip icon={<CheckCircleIcon />} label="Verified" color="success" size="small" />;
      case 'REJECTED':
        return <Chip icon={<CancelIcon />} label="Rejected" color="error" size="small" />;
      default:
        return <Chip icon={<PendingIcon />} label="Pending" color="warning" size="small" />;
    }
  };

  const getRouteName = (route: any) => {
    if (typeof route === 'string') return route;
    return route?.route_name || '-';
  };

  const getOutletTypeName = (type: any) => {
    if (typeof type === 'string') return type;
    return type?.name || '-';
  };

  const getChannelName = (channel: any) => {
    if (typeof channel === 'string') return channel;
    return channel?.name || '-';
  };

  const hasActiveFilters = filterRoute || filterOutletType || filterChannel || filterVerificationStatus !== 'all';

  return (
    <Container maxWidth="xl" sx={{ py: { xs: 2, sm: 3 } }}>
      {/* Header */}
      <Box sx={{ mb: 3 }}>
        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          spacing={2}
          alignItems={{ xs: 'stretch', sm: 'center' }}
          justifyContent="space-between"
        >
          <Stack direction="row" spacing={1} alignItems="center">
            <StoreIcon sx={{ fontSize: { xs: 28, sm: 32 }, color: 'primary.main' }} />
            <Typography variant={isMobile ? 'h5' : 'h4'} component="h1">
              Outlets
            </Typography>
          </Stack>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={handleAdd}
            fullWidth={isMobile}
            size={isMobile ? 'medium' : 'large'}
          >
            Add Outlet
          </Button>
        </Stack>
      </Box>

      {/* Search and Filters */}
      <Card sx={{ mb: 2 }}>
        <CardContent sx={{ pb: 1 }}>
          <Stack spacing={2}>
            {/* Search Bar */}
            <TextField
              fullWidth
              size="small"
              placeholder="Search by name, ID, or mobile..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon />
                  </InputAdornment>
                ),
              }}
            />

            {/* Filter Toggle */}
            <Stack direction="row" spacing={1} justifyContent="space-between" alignItems="center">
              <Button
                size="small"
                startIcon={<FilterListIcon />}
                endIcon={<ExpandMoreIcon sx={{ transform: showFilters ? 'rotate(180deg)' : 'none', transition: '0.3s' }} />}
                onClick={() => setShowFilters(!showFilters)}
              >
                Filters {hasActiveFilters && `(${[filterRoute, filterOutletType, filterChannel, filterVerificationStatus !== 'all'].filter(Boolean).length})`}
              </Button>
              {hasActiveFilters && (
                <Button size="small" startIcon={<ClearIcon />} onClick={clearFilters}>
                  Clear
                </Button>
              )}
            </Stack>

            {/* Collapsible Filters */}
            <Collapse in={showFilters}>
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6} md={3}>
                  <FormControl fullWidth size="small">
                    <InputLabel>Route</InputLabel>
                    <Select value={filterRoute} onChange={(e) => setFilterRoute(e.target.value)} label="Route">
                      <MenuItem value="">All Routes</MenuItem>
                      {routes.map((route) => (
                        <MenuItem key={route._id} value={route._id}>
                          {route.route_name}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                  <FormControl fullWidth size="small">
                    <InputLabel>Type</InputLabel>
                    <Select
                      value={filterOutletType}
                      onChange={(e) => setFilterOutletType(e.target.value)}
                      label="Type"
                    >
                      <MenuItem value="">All Types</MenuItem>
                      {outletTypes.map((type) => (
                        <MenuItem key={type._id} value={type._id}>
                          {type.name}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                  <FormControl fullWidth size="small">
                    <InputLabel>Channel</InputLabel>
                    <Select value={filterChannel} onChange={(e) => setFilterChannel(e.target.value)} label="Channel">
                      <MenuItem value="">All Channels</MenuItem>
                      {outletChannels.map((channel) => (
                        <MenuItem key={channel._id} value={channel._id}>
                          {channel.name}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                  <FormControl fullWidth size="small">
                    <InputLabel>Verification</InputLabel>
                    <Select
                      value={filterVerificationStatus}
                      onChange={(e) => setFilterVerificationStatus(e.target.value)}
                      label="Verification"
                    >
                      <MenuItem value="all">All Status</MenuItem>
                      <MenuItem value="PENDING">Pending</MenuItem>
                      <MenuItem value="VERIFIED">Verified</MenuItem>
                      <MenuItem value="REJECTED">Rejected</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
              </Grid>
            </Collapse>
          </Stack>
        </CardContent>
      </Card>

      {/* Content */}
      {loading ? (
        <Stack spacing={2}>
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} variant="rectangular" height={isMobile ? 150 : 80} />
          ))}
        </Stack>
      ) : filteredOutlets.length === 0 ? (
        <Alert severity="info">No outlets found. {hasActiveFilters ? 'Try adjusting filters.' : 'Create one to get started.'}</Alert>
      ) : isMobile || isTablet ? (
        // Mobile Card View
        <Stack spacing={2}>
          {paginatedOutlets.map((outlet) => (
            <Card key={outlet._id}>
              <CardContent>
                <Stack spacing={1}>
                  <Stack direction="row" justifyContent="space-between" alignItems="start">
                    <Typography variant="subtitle1" fontWeight="bold" sx={{ flex: 1 }}>
                      {outlet.outlet_name}
                    </Typography>
                    <Chip
                      label={outlet.active ? 'Active' : 'Inactive'}
                      color={outlet.active ? 'success' : 'default'}
                      size="small"
                    />
                  </Stack>

                  <Typography variant="body2" color="text.secondary">
                    <strong>ID:</strong> {outlet.outlet_id}
                  </Typography>

                  <Typography variant="body2" color="text.secondary">
                    <strong>Route:</strong> {getRouteName(outlet.route_id)}
                  </Typography>

                  <Typography variant="body2" color="text.secondary">
                    <strong>Type:</strong> {getOutletTypeName(outlet.outlet_type)}
                  </Typography>

                  {outlet.mobile && (
                    <Stack direction="row" spacing={0.5} alignItems="center">
                      <PhoneIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
                      <Typography variant="body2" color="text.secondary">
                        {outlet.mobile}
                      </Typography>
                    </Stack>
                  )}

                  {outlet.credit_limit > 0 && (
                    <Stack direction="row" spacing={0.5} alignItems="center">
                      <MoneyIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
                      <Typography variant="body2" color="text.secondary">
                        Credit: {outlet.credit_limit.toLocaleString()} Tk
                      </Typography>
                    </Stack>
                  )}

                  <Box>{getVerificationStatusChip(outlet.verification_status)}</Box>
                </Stack>
              </CardContent>
              <CardActions sx={{ justifyContent: 'flex-end', pt: 0 }}>
                <Button size="small" startIcon={<EditIcon />} onClick={() => handleEdit(outlet)}>
                  Edit
                </Button>
                <Button size="small" color="error" startIcon={<DeleteIcon />} onClick={() => handleToggleActive(outlet)}>
                  {outlet.active ? 'Deactivate' : 'Activate'}
                </Button>
              </CardActions>
            </Card>
          ))}
        </Stack>
      ) : (
        // Desktop Table View
        <TableContainer component={Paper}>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>
                  <TableSortLabel
                    active={orderBy === 'outlet_id'}
                    direction={orderBy === 'outlet_id' ? order : 'asc'}
                    onClick={() => handleSort('outlet_id')}
                  >
                    ID
                  </TableSortLabel>
                </TableCell>
                <TableCell>
                  <TableSortLabel
                    active={orderBy === 'outlet_name'}
                    direction={orderBy === 'outlet_name' ? order : 'asc'}
                    onClick={() => handleSort('outlet_name')}
                  >
                    Name
                  </TableSortLabel>
                </TableCell>
                <TableCell>Route</TableCell>
                <TableCell>Type</TableCell>
                <TableCell>Channel</TableCell>
                <TableCell>Mobile</TableCell>
                <TableCell align="right">Credit Limit</TableCell>
                <TableCell>Verification</TableCell>
                <TableCell>Status</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {paginatedOutlets.map((outlet) => (
                <TableRow key={outlet._id} hover>
                  <TableCell>{outlet.outlet_id}</TableCell>
                  <TableCell>{outlet.outlet_name}</TableCell>
                  <TableCell>{getRouteName(outlet.route_id)}</TableCell>
                  <TableCell>{getOutletTypeName(outlet.outlet_type)}</TableCell>
                  <TableCell>{getChannelName(outlet.outlet_channel_id)}</TableCell>
                  <TableCell>{outlet.mobile || '-'}</TableCell>
                  <TableCell align="right">
                    {outlet.credit_limit > 0 ? outlet.credit_limit.toLocaleString() : '-'}
                  </TableCell>
                  <TableCell>{getVerificationStatusChip(outlet.verification_status)}</TableCell>
                  <TableCell>
                    <Chip label={outlet.active ? 'Active' : 'Inactive'} color={outlet.active ? 'success' : 'default'} size="small" />
                  </TableCell>
                  <TableCell align="right">
                    <Stack direction="row" spacing={0.5} justifyContent="flex-end">
                      <Tooltip title="Edit">
                        <IconButton size="small" onClick={() => handleEdit(outlet)} color="primary">
                          <EditIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title={outlet.active ? 'Deactivate' : 'Activate'}>
                        <IconButton size="small" onClick={() => handleToggleActive(outlet)} color="error">
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </Stack>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* Pagination */}
      {filteredOutlets.length > 0 && (
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2 }}>
          <TablePagination
            component="div"
            count={filteredOutlets.length}
            page={page}
            onPageChange={(_, newPage) => setPage(newPage)}
            rowsPerPage={rowsPerPage}
            onRowsPerPageChange={(e) => {
              setRowsPerPage(parseInt(e.target.value, 10));
              setPage(0);
            }}
            rowsPerPageOptions={[5, 10, 25, 50]}
          />
        </Box>
      )}

      {/* Add/Edit Dialog */}
      <Dialog
        open={openDialog}
        onClose={() => setOpenDialog(false)}
        maxWidth="md"
        fullWidth
        fullScreen={isMobile}
      >
        <DialogTitle>{editingOutlet ? 'Edit Outlet' : 'Add New Outlet'}</DialogTitle>
        <form onSubmit={handleSubmit(onSubmit)}>
          <DialogContent>
            <Stack spacing={2}>
              <Controller
                name="outlet_name"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    label="Outlet Name *"
                    fullWidth
                    error={!!errors.outlet_name}
                    helperText={errors.outlet_name?.message}
                  />
                )}
              />

              <Controller
                name="outlet_name_bangla"
                control={control}
                render={({ field }) => <TextField {...field} label="Outlet Name (Bangla)" fullWidth />}
              />

              <Controller
                name="route_id"
                control={control}
                render={({ field }) => (
                  <FormControl fullWidth error={!!errors.route_id}>
                    <InputLabel>Route *</InputLabel>
                    <Select {...field} label="Route *">
                      {routes.map((route) => (
                        <MenuItem key={route._id} value={route._id}>
                          {route.route_name}
                        </MenuItem>
                      ))}
                    </Select>
                    {errors.route_id && <FormHelperText>{errors.route_id.message}</FormHelperText>}
                  </FormControl>
                )}
              />

              <Controller
                name="outlet_type"
                control={control}
                render={({ field }) => (
                  <FormControl fullWidth error={!!errors.outlet_type}>
                    <InputLabel>Outlet Type *</InputLabel>
                    <Select {...field} label="Outlet Type *">
                      {outletTypes.map((type) => (
                        <MenuItem key={type._id} value={type._id}>
                          {type.name}
                        </MenuItem>
                      ))}
                    </Select>
                    {errors.outlet_type && <FormHelperText>{errors.outlet_type.message}</FormHelperText>}
                  </FormControl>
                )}
              />

              <Controller
                name="outlet_channel_id"
                control={control}
                render={({ field }) => (
                  <FormControl fullWidth error={!!errors.outlet_channel_id}>
                    <InputLabel>Outlet Channel *</InputLabel>
                    <Select {...field} label="Outlet Channel *">
                      {outletChannels.map((channel) => (
                        <MenuItem key={channel._id} value={channel._id}>
                          {channel.name}
                        </MenuItem>
                      ))}
                    </Select>
                    {errors.outlet_channel_id && <FormHelperText>{errors.outlet_channel_id.message}</FormHelperText>}
                  </FormControl>
                )}
              />

              <Controller
                name="mobile"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    label="Mobile"
                    fullWidth
                    placeholder="01XXXXXXXXX"
                    error={!!errors.mobile}
                    helperText={errors.mobile?.message}
                  />
                )}
              />

              <Controller
                name="contact_person"
                control={control}
                render={({ field }) => <TextField {...field} label="Contact Person" fullWidth />}
              />

              <Controller
                name="address"
                control={control}
                render={({ field }) => <TextField {...field} label="Address" fullWidth multiline rows={2} />}
              />

              <Controller
                name="address_bangla"
                control={control}
                render={({ field }) => <TextField {...field} label="Address (Bangla)" fullWidth multiline rows={2} />}
              />

              <Grid container spacing={2}>
                <Grid item xs={6}>
                  <Controller
                    name="lati"
                    control={control}
                    render={({ field }) => (
                      <TextField
                        {...field}
                        label="Latitude"
                        fullWidth
                        type="number"
                        inputProps={{ step: 'any' }}
                        error={!!errors.lati}
                        helperText={errors.lati?.message}
                      />
                    )}
                  />
                </Grid>
                <Grid item xs={6}>
                  <Controller
                    name="longi"
                    control={control}
                    render={({ field }) => (
                      <TextField
                        {...field}
                        label="Longitude"
                        fullWidth
                        type="number"
                        inputProps={{ step: 'any' }}
                        error={!!errors.longi}
                        helperText={errors.longi?.message}
                      />
                    )}
                  />
                </Grid>
              </Grid>

              <Grid container spacing={2}>
                <Grid item xs={6}>
                  <Controller
                    name="credit_limit"
                    control={control}
                    render={({ field }) => (
                      <TextField
                        {...field}
                        label="Credit Limit (Tk)"
                        fullWidth
                        type="number"
                        inputProps={{ min: 0 }}
                        error={!!errors.credit_limit}
                        helperText={errors.credit_limit?.message}
                      />
                    )}
                  />
                </Grid>
                <Grid item xs={6}>
                  <Controller
                    name="market_size"
                    control={control}
                    render={({ field }) => (
                      <TextField
                        {...field}
                        label="Market Size"
                        fullWidth
                        type="number"
                        inputProps={{ min: 0 }}
                        error={!!errors.market_size}
                        helperText={errors.market_size?.message}
                      />
                    )}
                  />
                </Grid>
              </Grid>

              <Controller
                name="comments"
                control={control}
                render={({ field }) => <TextField {...field} label="Comments" fullWidth multiline rows={2} />}
              />

              <Controller
                name="active"
                control={control}
                render={({ field }) => (
                  <FormControlLabel control={<Switch {...field} checked={field.value} />} label="Active" />
                )}
              />
            </Stack>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setOpenDialog(false)}>Cancel</Button>
            <Button type="submit" variant="contained" disabled={isSubmitting}>
              {isSubmitting ? 'Saving...' : 'Save'}
            </Button>
          </DialogActions>
        </form>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteConfirmOpen} onClose={() => setDeleteConfirmOpen(false)}>
        <DialogTitle>Confirm Deactivation</DialogTitle>
        <DialogContent>
          <Typography>Are you sure you want to deactivate this outlet?</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteConfirmOpen(false)}>Cancel</Button>
          <Button onClick={handleDelete} color="error" variant="contained">
            Deactivate
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}
