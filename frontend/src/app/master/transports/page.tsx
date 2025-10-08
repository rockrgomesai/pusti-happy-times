'use client';

import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
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
  Fab,
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
  ToggleButton,
  ToggleButtonGroup,
  TableSortLabel,
  TablePagination,
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  LocalShipping as TransportIcon,
  ViewList as ViewListIcon,
  ViewModule as ViewModuleIcon,
  Search as SearchIcon,
} from '@mui/icons-material';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'react-hot-toast';
import api from '@/lib/api';
import ExportMenu from '@/components/common/ExportMenu';
import ColumnVisibilityMenu from '@/components/common/ColumnVisibilityMenu';
import { ExportColumn, formatDateForExport } from '@/lib/exportUtils';
import { calculateTableMinWidth } from '@/lib/tableUtils';

// Transport type definition (matches backend model exactly)
interface Transport {
  _id: string;
  transport: string;
  created_at: string;
  created_by?: { username: string } | null;
  updated_at: string;
  updated_by?: { username: string } | null;
}

// Transport form schema (simplified to match actual database fields)
const transportSchema = z.object({
  transport: z.string().min(2, 'Transport name must be at least 2 characters'),
});

type TransportFormData = z.infer<typeof transportSchema>;

type Order = 'asc' | 'desc';

type OrderableKeys = 'transport' | 'created_at' | 'updated_at' | 'created_by' | 'updated_by';

interface TransportColumnDefinition {
  id: string;
  label: string;
  sortableKey?: OrderableKeys;
  align?: 'inherit' | 'left' | 'center' | 'right' | 'justify';
  alwaysVisible?: boolean;
  minWidth?: number;
  renderCell: (transport: Transport) => React.ReactNode;
}

const TRANSPORT_COLUMN_STORAGE_KEY = 'master:transports:visibleColumns';

const getTransportErrorMessage = (error: unknown, fallback: string): string => {
  if (error && typeof error === 'object' && 'response' in error) {
    const response = (error as { response?: { data?: { message?: string } } }).response;
    const message = response?.data?.message;
    if (typeof message === 'string' && message.trim()) {
      return message;
    }
  }
  if (error instanceof Error && error.message) {
    return error.message;
  }
  return fallback;
};

export default function TransportsPage() {
  // State management
  const [transports, setTransports] = useState<Transport[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'cards' | 'list'>('cards');
  const [searchTerm, setSearchTerm] = useState('');
  const [openDialog, setOpenDialog] = useState(false);
  const [editingTransport, setEditingTransport] = useState<Transport | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [transportToDelete, setTransportToDelete] = useState<string | null>(null);

  // Sorting and pagination state
  const [orderBy, setOrderBy] = useState<OrderableKeys>('transport');
  const [order, setOrder] = useState<Order>('asc');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [visibleTransportColumnIds, setVisibleTransportColumnIds] = useState<string[]>([]);
  const [persistedTransportColumnIds, setPersistedTransportColumnIds] = useState<string[]>([]);
  const transportColumnStateHydratedRef = useRef(false);

  const transportExportColumns = useMemo<ExportColumn<Transport>[]>(
    () => [
      {
        header: 'Transport Name',
        accessor: (row) => row.transport,
      },
      {
        header: 'Created By',
        accessor: (row) => row.created_by?.username ?? '',
      },
      {
        header: 'Updated By',
        accessor: (row) => row.updated_by?.username ?? '',
      },
      {
        header: 'Created Date',
        accessor: (row) => formatDateForExport(row.created_at),
      },
      {
        header: 'Updated Date',
        accessor: (row) => formatDateForExport(row.updated_at),
      },
    ],
    []
  );

  // Form setup
  const {
    control,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<TransportFormData>({
    resolver: zodResolver(transportSchema),
    defaultValues: {
      transport: '',
    },
  });

  // Load transports
  const loadTransports = useCallback(async () => {
    try {
      setLoading(true);
      const response = await api.get('/transports');
      
      // Extract transports array from API response
      const transportsData = response.data?.data && Array.isArray(response.data.data) 
        ? response.data.data 
        : [];
      
      setTransports(transportsData);
    } catch (error: unknown) {
      toast.error('Failed to load transports');
      console.error('Error loading transports:', error);
      setTransports([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadTransports();
  }, [loadTransports]);

  // Filter transports based on search term
  const filteredTransports = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    if (!query) {
      return transports;
    }
    return transports.filter((transport) =>
      transport.transport.toLowerCase().includes(query)
    );
  }, [transports, searchTerm]);

  // Sorting function
  const handleSort = useCallback(
    (property: OrderableKeys) => {
      const isAsc = orderBy === property && order === 'asc';
      setOrder(isAsc ? 'desc' : 'asc');
      setOrderBy(property);
      setPage(0);
    },
    [order, orderBy]
  );

  // Sort the filtered transports
  const sortedTransports = useMemo(() => {
    const next = [...filteredTransports];
    next.sort((a, b) => {
      let aValue: unknown;
      let bValue: unknown;

      if (orderBy === 'created_at' || orderBy === 'updated_at') {
        aValue = new Date(a[orderBy]).getTime();
        bValue = new Date(b[orderBy]).getTime();
      } else if (orderBy === 'created_by' || orderBy === 'updated_by') {
        const aUser = orderBy === 'created_by' ? a.created_by : a.updated_by;
        const bUser = orderBy === 'created_by' ? b.created_by : b.updated_by;
        aValue = aUser?.username ?? '';
        bValue = bUser?.username ?? '';
      } else {
        aValue = a[orderBy];
        bValue = b[orderBy];
      }

      if (aValue == null && bValue == null) return 0;
      if (aValue == null) return order === 'asc' ? -1 : 1;
      if (bValue == null) return order === 'asc' ? 1 : -1;

      let aCompare: string | number = String(aValue);
      let bCompare: string | number = String(bValue);

      if (typeof aValue === 'string' && typeof bValue === 'string') {
        aCompare = aValue.toLowerCase();
        bCompare = bValue.toLowerCase();
      } else if (typeof aValue === 'number' && typeof bValue === 'number') {
        aCompare = aValue;
        bCompare = bValue;
      }

      if (order === 'asc') {
        return aCompare < bCompare ? -1 : aCompare > bCompare ? 1 : 0;
      }
      return aCompare > bCompare ? -1 : aCompare < bCompare ? 1 : 0;
    });
    return next;
  }, [filteredTransports, order, orderBy]);

  const fetchAllTransports = useCallback(async () => [...sortedTransports], [sortedTransports]);

  // Paginate the sorted transports
  const paginatedTransports = useMemo(
    () =>
      sortedTransports.slice(
        page * rowsPerPage,
        page * rowsPerPage + rowsPerPage
      ),
    [sortedTransports, page, rowsPerPage]
  );

  const handleChangePage = useCallback((_event: unknown, newPage: number) => {
    setPage(newPage);
  }, []);

  const handleChangeRowsPerPage = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  }, []);

  const formatDate = useCallback((dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-BD', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  }, []);

  const handleEdit = useCallback(
    (transport: Transport) => {
      setEditingTransport(transport);
      reset({ transport: transport.transport });
      setOpenDialog(true);
    },
    [reset]
  );

  const handleDeleteClick = useCallback((transportId: string) => {
    setTransportToDelete(transportId);
    setDeleteConfirmOpen(true);
  }, []);

  const transportColumns = useMemo<TransportColumnDefinition[]>(
    () => [
      {
        id: 'transport',
        label: 'Transport Name',
        sortableKey: 'transport',
        minWidth: 220,
        renderCell: (transport) => (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <TransportIcon sx={{ color: 'primary.main' }} />
            <Typography variant="body1" fontWeight="medium" sx={{ whiteSpace: 'nowrap' }}>
              {transport.transport}
            </Typography>
          </Box>
        ),
      },
      {
        id: 'created_by',
        label: 'Created By',
        sortableKey: 'created_by',
        minWidth: 180,
        renderCell: (transport) => transport.created_by?.username ?? '-',
      },
      {
        id: 'updated_by',
        label: 'Updated By',
        sortableKey: 'updated_by',
        minWidth: 180,
        renderCell: (transport) => transport.updated_by?.username ?? '-',
      },
      {
        id: 'created_at',
        label: 'Created Date',
        sortableKey: 'created_at',
        minWidth: 180,
        renderCell: (transport) => formatDate(transport.created_at),
      },
      {
        id: 'updated_at',
        label: 'Updated Date',
        sortableKey: 'updated_at',
        minWidth: 180,
        renderCell: (transport) => formatDate(transport.updated_at),
      },
      {
        id: 'actions',
        label: 'Actions',
        align: 'right',
        alwaysVisible: true,
        minWidth: 160,
        renderCell: (transport) => (
          <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1 }}>
            <Tooltip title="Edit">
              <IconButton size="small" onClick={() => handleEdit(transport)} color="primary">
                <EditIcon />
              </IconButton>
            </Tooltip>
            <Tooltip title="Delete">
              <IconButton
                size="small"
                onClick={() => handleDeleteClick(transport._id)}
                color="error"
              >
                <DeleteIcon />
              </IconButton>
            </Tooltip>
          </Box>
        ),
      },
    ],
    [formatDate, handleDeleteClick, handleEdit]
  );

  const selectableTransportColumnIds = useMemo(
    () => transportColumns.filter((column) => !column.alwaysVisible).map((column) => column.id),
    [transportColumns]
  );

  const handleVisibleTransportColumnsChange = useCallback(
    (nextSelected: string[]) => {
      const sanitized = selectableTransportColumnIds.filter((id) => nextSelected.includes(id));
      setVisibleTransportColumnIds(sanitized.length ? sanitized : selectableTransportColumnIds);
    },
    [selectableTransportColumnIds]
  );

  const transportColumnVisibilityOptions = useMemo(
    () => transportColumns.map(({ id, label, alwaysVisible }) => ({ id, label, alwaysVisible })),
    [transportColumns]
  );

  const sanitizeTransportSelection = useCallback(
    (ids: string[]) => selectableTransportColumnIds.filter((id) => ids.includes(id)),
    [selectableTransportColumnIds]
  );

  useEffect(() => {
    if (!selectableTransportColumnIds.length) {
      setVisibleTransportColumnIds([]);
      setPersistedTransportColumnIds([]);
      return;
    }

    if (!transportColumnStateHydratedRef.current) {
      transportColumnStateHydratedRef.current = true;

      let initialSelection = selectableTransportColumnIds;

      try {
        const stored = window.localStorage.getItem(TRANSPORT_COLUMN_STORAGE_KEY);
        if (stored) {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed)) {
            const sanitized = sanitizeTransportSelection(parsed);
            if (sanitized.length) {
              initialSelection = sanitized;
            }
          }
        }
      } catch (error) {
        console.warn('Failed to read transport column preferences', error);
      }

      setVisibleTransportColumnIds(initialSelection);
      setPersistedTransportColumnIds(initialSelection);
      return;
    }

    setVisibleTransportColumnIds((previous) => {
      const sanitizedPrevious = sanitizeTransportSelection(previous);
      if (sanitizedPrevious.length) {
        return sanitizedPrevious;
      }
      return selectableTransportColumnIds;
    });

    setPersistedTransportColumnIds((previous) => {
      const sanitizedPrevious = sanitizeTransportSelection(previous);
      if (sanitizedPrevious.length) {
        return sanitizedPrevious;
      }
      return selectableTransportColumnIds;
    });
  }, [sanitizeTransportSelection, selectableTransportColumnIds]);

  const transportHasUnsavedChanges = useMemo(() => {
    if (visibleTransportColumnIds.length !== persistedTransportColumnIds.length) {
      return true;
    }
    const persistedSet = new Set(persistedTransportColumnIds);
    return visibleTransportColumnIds.some((id) => !persistedSet.has(id));
  }, [persistedTransportColumnIds, visibleTransportColumnIds]);

  const handleSaveTransportColumnSelection = useCallback(() => {
    const sanitized = sanitizeTransportSelection(visibleTransportColumnIds);
    setVisibleTransportColumnIds(sanitized);
    setPersistedTransportColumnIds(sanitized);
    try {
      window.localStorage.setItem(TRANSPORT_COLUMN_STORAGE_KEY, JSON.stringify(sanitized));
      toast.success('Column selection saved');
    } catch (error) {
      console.warn('Failed to persist transport column preferences', error);
      toast.error('Failed to save column selection');
    }
  }, [sanitizeTransportSelection, visibleTransportColumnIds]);

  const visibleTransportColumns = useMemo(
    () =>
      transportColumns.filter(
        (column) => column.alwaysVisible || visibleTransportColumnIds.includes(column.id)
      ),
    [transportColumns, visibleTransportColumnIds]
  );

  const transportTableMinWidth = useMemo(
    () => calculateTableMinWidth(visibleTransportColumns.length, 160, 900),
    [visibleTransportColumns.length]
  );

  const renderCardsView = useCallback(
    () => (
      <>
        <Grid container spacing={3}>
          {paginatedTransports.map((transport) => (
            <Grid size={{ xs: 12, sm: 6, md: 4 }} key={transport._id}>
              <Card
                sx={{
                  height: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  '&:hover': {
                    boxShadow: (theme) => theme.shadows[4],
                    transform: 'translateY(-2px)',
                  },
                  transition: 'all 0.2s ease-in-out',
                }}
              >
                <CardContent sx={{ flexGrow: 1 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                    <TransportIcon sx={{ mr: 1, color: 'primary.main' }} />
                    <Typography variant="h6" component="h3" noWrap>
                      {transport.transport}
                    </Typography>
                  </Box>

                  <Typography variant="body2" color="text.secondary">
                    Created: {formatDate(transport.created_at)}
                  </Typography>

                  {transport.created_by && (
                    <Typography variant="body2" color="text.secondary">
                      By: {transport.created_by.username}
                    </Typography>
                  )}
                </CardContent>

                <CardActions sx={{ justifyContent: 'flex-end', p: 2 }}>
                  <Tooltip title="Edit">
                    <IconButton size="small" onClick={() => handleEdit(transport)} color="primary">
                      <EditIcon />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Delete">
                    <IconButton
                      size="small"
                      onClick={() => handleDeleteClick(transport._id)}
                      color="error"
                    >
                      <DeleteIcon />
                    </IconButton>
                  </Tooltip>
                </CardActions>
              </Card>
            </Grid>
          ))}
        </Grid>

        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 3 }}>
          <TablePagination
            rowsPerPageOptions={[5, 10, 25, 50]}
            component="div"
            count={sortedTransports.length}
            rowsPerPage={rowsPerPage}
            page={page}
            onPageChange={handleChangePage}
            onRowsPerPageChange={handleChangeRowsPerPage}
          />
        </Box>
      </>
    ),
    [paginatedTransports, sortedTransports, rowsPerPage, page, handleChangePage, handleChangeRowsPerPage, formatDate, handleEdit, handleDeleteClick]
  );

  const renderListView = useCallback(
    () => (
      <TableContainer component={Paper} sx={{ overflowX: 'auto' }}>
        <Table sx={{ minWidth: transportTableMinWidth }}>
          <TableHead>
            <TableRow>
              {visibleTransportColumns.map((column) => {
                const isActions = column.id === 'actions';
                const sortableKey = column.sortableKey;
                return (
                  <TableCell
                    key={column.id}
                    align={column.align}
                    sx={{
                      fontWeight: 'bold',
                      whiteSpace: 'nowrap',
                      backgroundColor: 'background.paper',
                      minWidth: column.minWidth,
                      ...(isActions
                        ? {
                            position: 'sticky',
                            right: 0,
                            zIndex: 4,
                            boxShadow: (theme) => `-4px 0 8px -4px ${theme.palette.grey[300]}`,
                          }
                        : {}),
                    }}
                  >
                    {sortableKey ? (
                      <TableSortLabel
                        active={orderBy === sortableKey}
                        direction={orderBy === sortableKey ? order : 'asc'}
                        onClick={() => handleSort(sortableKey)}
                        sx={{ fontWeight: 'bold' }}
                      >
                        {column.label}
                      </TableSortLabel>
                    ) : (
                      column.label
                    )}
                  </TableCell>
                );
              })}
            </TableRow>
          </TableHead>
          <TableBody>
            {paginatedTransports.map((transport) => (
              <TableRow key={transport._id} hover>
                {visibleTransportColumns.map((column) => {
                  const isActions = column.id === 'actions';
                  return (
                    <TableCell
                      key={column.id}
                      align={column.align}
                      sx={{
                        backgroundColor: 'background.paper',
                        minWidth: column.minWidth,
                        ...(isActions
                          ? {
                              position: 'sticky',
                              right: 0,
                              zIndex: 3,
                              boxShadow: (theme) => `-4px 0 8px -4px ${theme.palette.grey[200]}`,
                            }
                          : {}),
                      }}
                    >
                      {column.renderCell(transport)}
                    </TableCell>
                  );
                })}
              </TableRow>
            ))}
          </TableBody>
        </Table>
        <TablePagination
          rowsPerPageOptions={[5, 10, 25, 50]}
          component="div"
          count={sortedTransports.length}
          rowsPerPage={rowsPerPage}
          page={page}
          onPageChange={handleChangePage}
          onRowsPerPageChange={handleChangeRowsPerPage}
          sx={{
            '& .MuiTablePagination-toolbar': {
              paddingLeft: 2,
              paddingRight: 2,
            },
            '& .MuiTablePagination-selectLabel, & .MuiTablePagination-displayedRows': {
              fontSize: '0.875rem',
              fontWeight: 500,
            },
          }}
        />
      </TableContainer>
    ),
    [visibleTransportColumns, transportTableMinWidth, orderBy, order, paginatedTransports, sortedTransports, rowsPerPage, page, handleChangePage, handleChangeRowsPerPage, handleSort]
  );

  // Handle form submission
  const onSubmit = useCallback(
    async (data: TransportFormData) => {
      try {
        if (editingTransport) {
          await api.put(`/transports/${editingTransport._id}`, data);
          toast.success('Transport updated successfully');
        } else {
          await api.post('/transports', data);
          toast.success('Transport created successfully');
        }

        setOpenDialog(false);
        reset();
        setEditingTransport(null);
        loadTransports();
      } catch (error: unknown) {
        toast.error(getTransportErrorMessage(error, 'Failed to save transport'));
      }
    },
    [editingTransport, reset, loadTransports]
  );

  // Handle actual delete
  const handleDeleteConfirm = useCallback(async () => {
    if (!transportToDelete) return;

    try {
      await api.delete(`/transports/${transportToDelete}`);
      toast.success('Transport deleted successfully');
      setDeleteConfirmOpen(false);
      setTransportToDelete(null);
      loadTransports();
    } catch (error: unknown) {
      toast.error(getTransportErrorMessage(error, 'Failed to delete transport'));
    }
  }, [transportToDelete, loadTransports]);

  // Handle dialog close
  const handleDialogClose = () => {
    setOpenDialog(false);
    setEditingTransport(null);
    reset();
  };

  // Handle delete cancel
  const handleDeleteCancel = useCallback(() => {
    setDeleteConfirmOpen(false);
    setTransportToDelete(null);
  }, []);

  // Loading skeleton
  if (loading) {
    return (
      <Box sx={{ p: 3 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          Transport Management
        </Typography>
        <Grid container spacing={3}>
          {[...Array(6)].map((_, index) => (
            <Grid size={{ xs: 12, sm: 6, md: 4 }} key={index}>
              <Skeleton variant="rectangular" height={200} />
            </Grid>
          ))}
        </Grid>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box sx={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        mb: 3,
        flexWrap: 'wrap',
        gap: 2
      }}>
        <Typography variant="h4" component="h1">
          Transport Management
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => setOpenDialog(true)}
          sx={{ minWidth: 'max-content' }}
        >
          Add Transport
        </Button>
      </Box>

      {/* Search and View Controls */}
      <Box sx={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        mb: 3,
        flexWrap: 'wrap',
        gap: 2
      }}>
        <TextField
          size="small"
          placeholder="Search transports..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon />
              </InputAdornment>
            ),
          }}
          sx={{ minWidth: 250 }}
        />

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <ExportMenu
            title="Transport Report"
            fileBaseName="transports"
            currentRows={paginatedTransports}
            columns={transportExportColumns}
            onFetchAll={fetchAllTransports}
            disabled={loading || (transports.length === 0 && paginatedTransports.length === 0)}
          />

          <ColumnVisibilityMenu
            options={transportColumnVisibilityOptions}
            selected={visibleTransportColumnIds}
            onChange={handleVisibleTransportColumnsChange}
            onSaveSelection={handleSaveTransportColumnSelection}
            saveDisabled={!transportHasUnsavedChanges}
            minSelectable={1}
          />

          <ToggleButtonGroup
            value={viewMode}
            exclusive
            onChange={(_, newMode) => newMode && setViewMode(newMode)}
            aria-label="view mode"
            size="small"
          >
            <ToggleButton value="cards" aria-label="card view">
              <ViewModuleIcon />
            </ToggleButton>
            <ToggleButton value="list" aria-label="list view">
              <ViewListIcon />
            </ToggleButton>
          </ToggleButtonGroup>
        </Box>
      </Box>

      {/* Results Summary */}
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Showing {filteredTransports.length} of {transports.length} transports
      </Typography>

      {/* Content based on view mode */}
      {viewMode === 'cards' ? renderCardsView() : renderListView()}

      {/* Empty State */}
      {filteredTransports.length === 0 && !loading && (
        <Box sx={{ 
          textAlign: 'center', 
          py: 8,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 2
        }}>
          <TransportIcon sx={{ fontSize: 64, color: 'text.secondary' }} />
          <Typography variant="h6" color="text.secondary">
            {searchTerm ? 'No transports found matching your search' : 'No transports found'}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {searchTerm ? 'Try adjusting your search terms' : 'Get started by adding your first transport'}
          </Typography>
          {!searchTerm && (
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => setOpenDialog(true)}
              sx={{ mt: 2 }}
            >
              Add Transport
            </Button>
          )}
        </Box>
      )}

      {/* Floating Action Button for Mobile */}
      <Fab
        color="primary"
        aria-label="add transport"
        sx={{
          position: 'fixed',
          bottom: 16,
          right: 16,
          display: { xs: 'flex', sm: 'none' }
        }}
        onClick={() => setOpenDialog(true)}
      >
        <AddIcon />
      </Fab>

      {/* Add/Edit Dialog */}
      <Dialog 
        open={openDialog} 
        onClose={handleDialogClose}
        maxWidth="sm"
        fullWidth
      >
        <form onSubmit={handleSubmit(onSubmit)}>
          <DialogTitle>
            {editingTransport ? 'Edit Transport' : 'Add New Transport'}
          </DialogTitle>
          <DialogContent>
            <Controller
              name="transport"
              control={control}
              render={({ field }) => (
                <TextField
                  {...field}
                  autoFocus
                  margin="dense"
                  label="Transport Name"
                  fullWidth
                  variant="outlined"
                  error={!!errors.transport}
                  helperText={errors.transport?.message}
                  sx={{ mt: 2 }}
                />
              )}
            />
          </DialogContent>
          <DialogActions>
            <Button onClick={handleDialogClose}>Cancel</Button>
            <Button 
              type="submit" 
              variant="contained"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Saving...' : (editingTransport ? 'Update' : 'Create')}
            </Button>
          </DialogActions>
        </form>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteConfirmOpen} onClose={handleDeleteCancel}>
        <DialogTitle>Confirm Delete</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete this transport? This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleDeleteCancel}>Cancel</Button>
          <Button 
            onClick={handleDeleteConfirm} 
            color="error" 
            variant="contained"
          >
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}