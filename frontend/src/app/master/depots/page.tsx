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
  Alert,
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
  Warehouse as WarehouseIcon,
  ViewList as ViewListIcon,
  ViewModule as ViewModuleIcon,
  Search as SearchIcon,
} from '@mui/icons-material';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'react-hot-toast';
import api from '@/lib/api';
import ExportMenu from '@/components/common/ExportMenu';
import ColumnVisibilityMenu from '@/components/common/ColumnVisibilityMenu';
import { ExportColumn, formatDateForExport } from '@/lib/exportUtils';
import { calculateTableMinWidth } from '@/lib/tableUtils';

// Depot type definition (matches backend model exactly)
interface Depot {
  _id: string;
  name: string;
  created_at: string;
  created_by?: { username: string } | null;
  updated_at: string;
  updated_by?: { username: string } | null;
}

// Depot form schema (mirrors backend validation)
const depotSchema = z.object({
  name: z.string().min(2, 'Depot name must be at least 2 characters'),
});

type DepotFormData = z.infer<typeof depotSchema>;

type Order = 'asc' | 'desc';

type OrderableKeys = keyof Pick<Depot, 'name' | 'created_at' | 'updated_at' | 'created_by'>;

interface DepotColumnDefinition {
  id: string;
  label: string;
  sortableKey?: OrderableKeys;
  align?: 'inherit' | 'left' | 'center' | 'right' | 'justify';
  alwaysVisible?: boolean;
  renderCell: (depot: Depot) => React.ReactNode;
}

const DEPOT_COLUMN_STORAGE_KEY = 'master:depots:visibleColumns';

export default function DepotsPage() {
  // State management
  const [depots, setDepots] = useState<Depot[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'cards' | 'list'>('cards');
  const [searchTerm, setSearchTerm] = useState('');
  const [openDialog, setOpenDialog] = useState(false);
  const [editingDepot, setEditingDepot] = useState<Depot | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [depotToDelete, setDepotToDelete] = useState<string | null>(null);

  // Sorting and pagination state
  const [orderBy, setOrderBy] = useState<OrderableKeys>('name');
  const [order, setOrder] = useState<Order>('asc');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [visibleDepotColumnIds, setVisibleDepotColumnIds] = useState<string[]>([]);
  const [persistedDepotColumnIds, setPersistedDepotColumnIds] = useState<string[]>([]);
  const depotColumnStateHydratedRef = useRef(false);

  const depotExportColumns = useMemo<ExportColumn<Depot>[]>(
    () => [
      {
        header: 'Depot Name',
        accessor: (row) => row.name,
      },
      {
        header: 'Created By',
        accessor: (row) => row.created_by?.username ?? '',
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
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<DepotFormData>({
    resolver: zodResolver(depotSchema),
    defaultValues: {
      name: '',
    },
  });

  // Load depots
  const loadDepots = async () => {
    try {
      setLoading(true);
      const response = await api.get('/depots');

      const depotsData = response.data?.data && Array.isArray(response.data.data)
        ? response.data.data
        : [];

      setDepots(depotsData);
    } catch (error) {
      toast.error('Failed to load depots');
      console.error('Error loading depots:', error);
      setDepots([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDepots();
  }, []);

  // Filter depots based on search term
  const filteredDepots = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    if (!query) return depots;
    return depots.filter((depot) => depot.name.toLowerCase().includes(query));
  }, [depots, searchTerm]);

  // Sorting function
  const handleSort = (property: OrderableKeys) => {
    const isAsc = orderBy === property && order === 'asc';
    setOrder(isAsc ? 'desc' : 'asc');
    setOrderBy(property);
    setPage(0);
  };

  // Sort the filtered depots
  const sortedDepots = useMemo(() => {
    const next = [...filteredDepots];
    next.sort((a, b) => {
      let aValue: unknown;
      let bValue: unknown;

      if (orderBy === 'created_at' || orderBy === 'updated_at') {
        aValue = new Date(a[orderBy]).getTime();
        bValue = new Date(b[orderBy]).getTime();
      } else if (orderBy === 'created_by') {
        aValue = a.created_by?.username ?? '';
        bValue = b.created_by?.username ?? '';
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
  }, [filteredDepots, order, orderBy]);

  const fetchAllDepots = useCallback(async () => [...sortedDepots], [sortedDepots]);

  // Paginate the sorted depots
  const paginatedDepots = sortedDepots.slice(
    page * rowsPerPage,
    page * rowsPerPage + rowsPerPage
  );

  // Pagination handlers
  const handleChangePage = (_event: unknown, newPage: number) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  // Handle form submission
  const onSubmit = async (data: DepotFormData) => {
    try {
      if (editingDepot) {
        await api.put(`/depots/${editingDepot._id}`, data);
        toast.success('Depot updated successfully');
      } else {
        await api.post('/depots', data);
        toast.success('Depot created successfully');
      }

      setOpenDialog(false);
      reset();
      setEditingDepot(null);
      loadDepots();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to save depot';
      toast.error(errorMessage);
    }
  };

  // Handle delete depot
  const handleDeleteDepot = async () => {
    if (!depotToDelete) return;

    try {
      await api.delete(`/depots/${depotToDelete}`);
      toast.success('Depot deleted successfully');
      setDeleteConfirmOpen(false);
      setDepotToDelete(null);
      loadDepots();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to delete depot';
      toast.error(errorMessage);
    }
  };

  // Handle edit depot
  const handleEditDepot = useCallback(
    (depot: Depot) => {
      setEditingDepot(depot);
      reset({
        name: depot.name,
      });
      setOpenDialog(true);
    },
    [reset]
  );

  // Handle add new depot
  const handleAddDepot = useCallback(() => {
    setEditingDepot(null);
    reset();
    setOpenDialog(true);
  }, [reset]);

  const depotColumns = useMemo<DepotColumnDefinition[]>(
    () => [
      {
        id: 'name',
        label: 'Depot Name',
        sortableKey: 'name',
        renderCell: (depot) => (
          <Typography variant="body1" fontWeight="medium">
            {depot.name}
          </Typography>
        ),
      },
      {
        id: 'created_by',
        label: 'Created By',
        sortableKey: 'created_by',
        renderCell: (depot) => depot.created_by?.username ?? '-',
      },
      {
        id: 'updated_by',
        label: 'Updated By',
        renderCell: (depot) => depot.updated_by?.username ?? '-',
      },
      {
        id: 'created_at',
        label: 'Created Date',
        sortableKey: 'created_at',
        renderCell: (depot) => formatDate(depot.created_at),
      },
      {
        id: 'updated_at',
        label: 'Updated Date',
        sortableKey: 'updated_at',
        renderCell: (depot) => formatDate(depot.updated_at),
      },
      {
        id: 'actions',
        label: 'Actions',
        alwaysVisible: true,
        align: 'right',
        renderCell: (depot) => (
          <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1 }}>
            <Tooltip title="Edit Depot">
              <IconButton size="small" onClick={() => handleEditDepot(depot)} color="primary">
                <EditIcon />
              </IconButton>
            </Tooltip>
            <Tooltip title="Delete Depot">
              <IconButton
                size="small"
                onClick={() => {
                  setDepotToDelete(depot._id);
                  setDeleteConfirmOpen(true);
                }}
                color="error"
              >
                <DeleteIcon />
              </IconButton>
            </Tooltip>
          </Box>
        ),
      },
    ],
    [handleEditDepot]
  );

  const selectableDepotColumnIds = useMemo(
    () => depotColumns.filter((column) => !column.alwaysVisible).map((column) => column.id),
    [depotColumns]
  );

  const handleVisibleDepotColumnsChange = useCallback(
    (nextSelected: string[]) => {
      const sanitized = selectableDepotColumnIds.filter((id) => nextSelected.includes(id));
      setVisibleDepotColumnIds(sanitized.length ? sanitized : selectableDepotColumnIds);
    },
    [selectableDepotColumnIds]
  );

  const sanitizeDepotSelection = useCallback(
    (ids: string[]) => selectableDepotColumnIds.filter((id) => ids.includes(id)),
    [selectableDepotColumnIds]
  );

  const depotColumnVisibilityOptions = useMemo(
    () => depotColumns.map(({ id, label, alwaysVisible }) => ({ id, label, alwaysVisible })),
    [depotColumns]
  );

  useEffect(() => {
    if (!selectableDepotColumnIds.length) {
      setVisibleDepotColumnIds([]);
      setPersistedDepotColumnIds([]);
      return;
    }

    if (!depotColumnStateHydratedRef.current) {
      depotColumnStateHydratedRef.current = true;

      let initialSelection = selectableDepotColumnIds;

      try {
        const stored = window.localStorage.getItem(DEPOT_COLUMN_STORAGE_KEY);
        if (stored) {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed)) {
            const sanitized = sanitizeDepotSelection(parsed);
            if (sanitized.length) {
              initialSelection = sanitized;
            }
          }
        }
      } catch (error) {
        console.warn('Failed to read depot column preferences', error);
      }

      setVisibleDepotColumnIds(initialSelection);
      setPersistedDepotColumnIds(initialSelection);
      return;
    }

    setVisibleDepotColumnIds((previous) => {
      const sanitizedPrevious = sanitizeDepotSelection(previous);
      if (sanitizedPrevious.length) {
        return sanitizedPrevious;
      }
      return selectableDepotColumnIds;
    });

    setPersistedDepotColumnIds((previous) => {
      const sanitizedPrevious = sanitizeDepotSelection(previous);
      if (sanitizedPrevious.length) {
        return sanitizedPrevious;
      }
      return selectableDepotColumnIds;
    });
  }, [sanitizeDepotSelection, selectableDepotColumnIds]);

  const depotHasUnsavedChanges = useMemo(() => {
    if (visibleDepotColumnIds.length !== persistedDepotColumnIds.length) {
      return true;
    }
    const persistedSet = new Set(persistedDepotColumnIds);
    return visibleDepotColumnIds.some((id) => !persistedSet.has(id));
  }, [persistedDepotColumnIds, visibleDepotColumnIds]);

  const handleSaveDepotColumnSelection = useCallback(() => {
    const sanitized = sanitizeDepotSelection(visibleDepotColumnIds);
    setVisibleDepotColumnIds(sanitized);
    setPersistedDepotColumnIds(sanitized);
    try {
      window.localStorage.setItem(DEPOT_COLUMN_STORAGE_KEY, JSON.stringify(sanitized));
      toast.success('Column selection saved');
    } catch (error) {
      console.warn('Failed to persist depot column preferences', error);
      toast.error('Failed to save column selection');
    }
  }, [sanitizeDepotSelection, visibleDepotColumnIds]);

  const visibleDepotColumns = useMemo(
    () =>
      depotColumns.filter(
        (column) => column.alwaysVisible || visibleDepotColumnIds.includes(column.id)
      ),
    [depotColumns, visibleDepotColumnIds]
  );

  const depotTableMinWidth = useMemo(
    () => calculateTableMinWidth(visibleDepotColumns.length),
    [visibleDepotColumns.length]
  );

  // Format date helper
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-BD', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  // Render cards view
  const renderCardsView = () => (
    <>
      <Grid container spacing={2}>
        {paginatedDepots.map((depot) => (
          <Grid size={{ xs: 12, sm: 6, md: 4 }} key={depot._id}>
            <Card>
              <CardContent>
                <Typography variant="h6" component="h2" gutterBottom>
                  {depot.name}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Created: {formatDate(depot.created_at)}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Updated: {formatDate(depot.updated_at)}
                </Typography>
                {depot.created_by && (
                  <Typography variant="body2" color="text.secondary">
                    By: {depot.created_by.username}
                  </Typography>
                )}
              </CardContent>

              <CardActions sx={{ justifyContent: 'flex-end', pt: 0 }}>
                <Tooltip title="Edit Depot">
                  <IconButton
                    size="small"
                    onClick={() => handleEditDepot(depot)}
                    color="primary"
                  >
                    <EditIcon />
                  </IconButton>
                </Tooltip>
                <Tooltip title="Delete Depot">
                  <IconButton
                    size="small"
                    onClick={() => {
                      setDepotToDelete(depot._id);
                      setDeleteConfirmOpen(true);
                    }}
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
      {/* Pagination for Cards View */}
      <Box sx={{ display: 'flex', justifyContent: 'center', mt: 3 }}>
        <TablePagination
          rowsPerPageOptions={[5, 10, 25, 50]}
          component="div"
          count={sortedDepots.length}
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
      </Box>
    </>
  );

  // Render list view
  const renderListView = () => (
    <TableContainer component={Paper} sx={{ overflowX: 'auto' }}>
      <Table sx={{ minWidth: depotTableMinWidth }}>
        <TableHead>
          <TableRow>
            {visibleDepotColumns.map((column) => {
              const isActions = column.id === 'actions';
              return (
                <TableCell
                  key={column.id}
                  align={column.align}
                  sx={{
                    fontWeight: 'bold',
                    whiteSpace: 'nowrap',
                    backgroundColor: 'background.paper',
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
                  {column.sortableKey ? (
                    <TableSortLabel
                      active={orderBy === column.sortableKey}
                      direction={orderBy === column.sortableKey ? order : 'asc'}
                      onClick={() => handleSort(column.sortableKey!)}
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
          {paginatedDepots.map((depot) => (
            <TableRow key={depot._id} hover>
              {visibleDepotColumns.map((column) => {
                const isActions = column.id === 'actions';
                return (
                  <TableCell
                    key={column.id}
                    align={column.align}
                    sx={{
                      backgroundColor: 'background.paper',
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
                    {column.renderCell(depot)}
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
        count={sortedDepots.length}
        rowsPerPage={rowsPerPage}
        page={page}
        onPageChange={handleChangePage}
        onRowsPerPageChange={handleChangeRowsPerPage}
        sx={{
          '& .MuiTablePagination-toolbar': {
            paddingLeft: 2,
            paddingRight: 2,
          },
        }}
      />
    </TableContainer>
  );

  if (loading) {
    return (
      <Box sx={{ p: 3 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          Depot Management
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
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          mb: 3,
          flexWrap: 'wrap',
          gap: 2,
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <WarehouseIcon sx={{ color: 'primary.main' }} />
          <Typography variant="h4" component="h1">
            Depot Management
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={handleAddDepot}
          sx={{ minWidth: 'max-content' }}
        >
          Add Depot
        </Button>
      </Box>

      {/* Search and View Controls */}
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          mb: 3,
          flexWrap: 'wrap',
          gap: 2,
        }}
      >
        <TextField
          placeholder="Search depots..."
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
            title="Depot Report"
            fileBaseName="depots"
            currentRows={paginatedDepots}
            columns={depotExportColumns}
            onFetchAll={fetchAllDepots}
            disabled={loading || (depots.length === 0 && paginatedDepots.length === 0)}
          />
          <ColumnVisibilityMenu
            options={depotColumnVisibilityOptions}
            selected={visibleDepotColumnIds}
            onChange={handleVisibleDepotColumnsChange}
            onSaveSelection={handleSaveDepotColumnSelection}
            saveDisabled={!depotHasUnsavedChanges}
            minSelectable={1}
          />

          <ToggleButtonGroup
            value={viewMode}
            exclusive
            onChange={(_event, newMode) => newMode && setViewMode(newMode)}
            aria-label="view mode"
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
        Showing {filteredDepots.length} of {depots.length} depots
      </Typography>

      {/* Content based on view mode */}
      {viewMode === 'cards' ? renderCardsView() : renderListView()}

      {/* Floating action button */}
      <Fab
        color="primary"
        aria-label="add depot"
        onClick={handleAddDepot}
        sx={{
          position: 'fixed',
          bottom: 24,
          right: 24,
          display: { xs: 'flex', md: 'none' },
        }}
      >
        <AddIcon />
      </Fab>

      {/* Dialog for add/edit */}
      <Dialog
        open={openDialog}
        onClose={() => setOpenDialog(false)}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle>
          {editingDepot ? 'Edit Depot' : 'Add Depot'}
        </DialogTitle>
        <DialogContent>
          <Box component="form" sx={{ mt: 2 }}>
            <TextField
              autoFocus
              margin="dense"
              id="name"
              label="Depot Name"
              type="text"
              fullWidth
              variant="outlined"
              {...register('name')}
              error={Boolean(errors.name)}
              helperText={errors.name?.message}
              disabled={isSubmitting}
            />
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 3 }}>
          <Button onClick={() => setOpenDialog(false)} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit(onSubmit)}
            variant="contained"
            disabled={isSubmitting}
          >
            {editingDepot ? 'Update' : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete confirmation dialog */}
      <Dialog
        open={deleteConfirmOpen}
        onClose={() => setDeleteConfirmOpen(false)}
        fullWidth
        maxWidth="xs"
      >
        <DialogTitle>Delete Depot</DialogTitle>
        <DialogContent>
          <Alert severity="warning" sx={{ mb: 1 }}>
            Are you sure you want to delete this depot? This action cannot be undone.
          </Alert>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 3 }}>
          <Button
            onClick={() => setDeleteConfirmOpen(false)}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button
            onClick={handleDeleteDepot}
            color="error"
            variant="contained"
            disabled={isSubmitting}
          >
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
