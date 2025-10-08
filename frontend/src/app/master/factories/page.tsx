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
  Factory as FactoryIcon,
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

// Factory type definition (matches backend model exactly)
interface Factory {
  _id: string;
  name: string;
  created_at: string;
  created_by?: { username: string } | null;
  updated_at: string;
  updated_by?: { username: string } | null;
}

// Factory form schema (mirrors backend validation)
const factorySchema = z.object({
  name: z.string().min(2, 'Factory name must be at least 2 characters'),
});

type FactoryFormData = z.infer<typeof factorySchema>;

type Order = 'asc' | 'desc';

type OrderableKeys = keyof Pick<Factory, 'name' | 'created_at' | 'updated_at' | 'created_by' | 'updated_by'>;

interface FactoryColumnDefinition {
  id: string;
  label: string;
  sortableKey?: OrderableKeys;
  align?: 'inherit' | 'left' | 'center' | 'right' | 'justify';
  alwaysVisible?: boolean;
  minWidth?: number;
  renderCell: (factory: Factory) => React.ReactNode;
}

const FACTORY_COLUMN_STORAGE_KEY = 'master:factories:visibleColumns';

export default function FactoriesPage() {
  // State management
  const [factories, setFactories] = useState<Factory[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'cards' | 'list'>('cards');
  const [searchTerm, setSearchTerm] = useState('');
  const [openDialog, setOpenDialog] = useState(false);
  const [editingFactory, setEditingFactory] = useState<Factory | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [factoryToDelete, setFactoryToDelete] = useState<string | null>(null);

  // Sorting and pagination state
  const [orderBy, setOrderBy] = useState<OrderableKeys>('name');
  const [order, setOrder] = useState<Order>('asc');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [visibleFactoryColumnIds, setVisibleFactoryColumnIds] = useState<string[]>([]);
  const [persistedFactoryColumnIds, setPersistedFactoryColumnIds] = useState<string[]>([]);
  const factoryColumnStateHydratedRef = useRef(false);

  const factoryExportColumns = useMemo<ExportColumn<Factory>[]>(
    () => [
      {
        header: 'Factory Name',
        accessor: (row) => row.name,
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
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FactoryFormData>({
    resolver: zodResolver(factorySchema),
    defaultValues: {
      name: '',
    },
  });

  // Load factories
  const loadFactories = async () => {
    try {
      setLoading(true);
      const response = await api.get('/factories');

      const factoriesData = response.data?.data && Array.isArray(response.data.data)
        ? response.data.data
        : [];

      setFactories(factoriesData);
    } catch (error) {
      toast.error('Failed to load factories');
      console.error('Error loading factories:', error);
      setFactories([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadFactories();
  }, []);

  // Filter factories based on search term
  const filteredFactories = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    if (!query) {
      return factories;
    }
    return factories.filter((factory) => factory.name.toLowerCase().includes(query));
  }, [factories, searchTerm]);

  // Sorting function
  const handleSort = (property: OrderableKeys) => {
    const isAsc = orderBy === property && order === 'asc';
    setOrder(isAsc ? 'desc' : 'asc');
    setOrderBy(property);
    setPage(0);
  };

  // Sort the filtered factories
  const sortedFactories = useMemo(() => {
    const next = [...filteredFactories];
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
  }, [filteredFactories, order, orderBy]);

  const fetchAllFactories = useCallback(async () => [...sortedFactories], [sortedFactories]);

  // Paginate the sorted factories
  const paginatedFactories = useMemo(
    () =>
      sortedFactories.slice(
        page * rowsPerPage,
        page * rowsPerPage + rowsPerPage
      ),
    [sortedFactories, page, rowsPerPage]
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
  const onSubmit = async (data: FactoryFormData) => {
    try {
      if (editingFactory) {
        await api.put(`/factories/${editingFactory._id}`, data);
        toast.success('Factory updated successfully');
      } else {
        await api.post('/factories', data);
        toast.success('Factory created successfully');
      }

      setOpenDialog(false);
      reset();
      setEditingFactory(null);
      loadFactories();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to save factory';
      toast.error(errorMessage);
    }
  };

  // Handle delete factory
  const handleDeleteFactory = async () => {
    if (!factoryToDelete) return;

    try {
      await api.delete(`/factories/${factoryToDelete}`);
      toast.success('Factory deleted successfully');
      setDeleteConfirmOpen(false);
      setFactoryToDelete(null);
      loadFactories();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to delete factory';
      toast.error(errorMessage);
    }
  };

  // Handle edit factory
  const handleEditFactory = useCallback(
    (factory: Factory) => {
      setEditingFactory(factory);
      reset({
        name: factory.name,
      });
      setOpenDialog(true);
    },
    [reset]
  );

  // Handle add new factory
  const handleAddFactory = useCallback(() => {
    setEditingFactory(null);
    reset();
    setOpenDialog(true);
  }, [reset]);

  // Format date helper
  const formatDate = useCallback((dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-BD', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  }, []);

  const factoryColumns = useMemo<FactoryColumnDefinition[]>(
    () => [
      {
        id: 'name',
        label: 'Factory Name',
        sortableKey: 'name',
        minWidth: 220,
        renderCell: (factory) => (
          <Typography variant="body1" fontWeight="medium">
            {factory.name}
          </Typography>
        ),
      },
      {
        id: 'created_by',
        label: 'Created By',
        sortableKey: 'created_by',
        minWidth: 180,
        renderCell: (factory) => factory.created_by?.username ?? '-',
      },
      {
        id: 'updated_by',
        label: 'Updated By',
        sortableKey: 'updated_by',
        minWidth: 180,
        renderCell: (factory) => factory.updated_by?.username ?? '-',
      },
      {
        id: 'created_at',
        label: 'Created Date',
        sortableKey: 'created_at',
        minWidth: 180,
        renderCell: (factory) => formatDate(factory.created_at),
      },
      {
        id: 'updated_at',
        label: 'Updated Date',
        sortableKey: 'updated_at',
        minWidth: 180,
        renderCell: (factory) => formatDate(factory.updated_at),
      },
      {
        id: 'actions',
        label: 'Actions',
        alwaysVisible: true,
        align: 'right',
        minWidth: 160,
        renderCell: (factory) => (
          <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1 }}>
            <Tooltip title="Edit Factory">
              <IconButton size="small" onClick={() => handleEditFactory(factory)} color="primary">
                <EditIcon />
              </IconButton>
            </Tooltip>
            <Tooltip title="Delete Factory">
              <IconButton
                size="small"
                onClick={() => {
                  setFactoryToDelete(factory._id);
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
    [formatDate, handleEditFactory]
  );

  const selectableFactoryColumnIds = useMemo(
    () => factoryColumns.filter((column) => !column.alwaysVisible).map((column) => column.id),
    [factoryColumns]
  );

  const handleVisibleFactoryColumnsChange = useCallback(
    (nextSelected: string[]) => {
      const sanitized = selectableFactoryColumnIds.filter((id) => nextSelected.includes(id));
      setVisibleFactoryColumnIds(sanitized.length ? sanitized : selectableFactoryColumnIds);
    },
    [selectableFactoryColumnIds]
  );

  const sanitizeFactorySelection = useCallback(
    (ids: string[]) => selectableFactoryColumnIds.filter((id) => ids.includes(id)),
    [selectableFactoryColumnIds]
  );

  const factoryColumnVisibilityOptions = useMemo(
    () => factoryColumns.map(({ id, label, alwaysVisible }) => ({ id, label, alwaysVisible })),
    [factoryColumns]
  );

  useEffect(() => {
    if (!selectableFactoryColumnIds.length) {
      setVisibleFactoryColumnIds([]);
      setPersistedFactoryColumnIds([]);
      return;
    }

    if (!factoryColumnStateHydratedRef.current) {
      factoryColumnStateHydratedRef.current = true;

      let initialSelection = selectableFactoryColumnIds;

      try {
        const stored = window.localStorage.getItem(FACTORY_COLUMN_STORAGE_KEY);
        if (stored) {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed)) {
            const sanitized = sanitizeFactorySelection(parsed);
            if (sanitized.length) {
              initialSelection = sanitized;
            }
          }
        }
      } catch (error) {
        console.warn('Failed to read factory column preferences', error);
      }

      setVisibleFactoryColumnIds(initialSelection);
      setPersistedFactoryColumnIds(initialSelection);
      return;
    }

    setVisibleFactoryColumnIds((previous) => {
      const sanitizedPrevious = sanitizeFactorySelection(previous);
      if (sanitizedPrevious.length) {
        return sanitizedPrevious;
      }
      return selectableFactoryColumnIds;
    });

    setPersistedFactoryColumnIds((previous) => {
      const sanitizedPrevious = sanitizeFactorySelection(previous);
      if (sanitizedPrevious.length) {
        return sanitizedPrevious;
      }
      return selectableFactoryColumnIds;
    });
  }, [sanitizeFactorySelection, selectableFactoryColumnIds]);

  const factoryHasUnsavedChanges = useMemo(() => {
    if (visibleFactoryColumnIds.length !== persistedFactoryColumnIds.length) {
      return true;
    }
    const persistedSet = new Set(persistedFactoryColumnIds);
    return visibleFactoryColumnIds.some((id) => !persistedSet.has(id));
  }, [persistedFactoryColumnIds, visibleFactoryColumnIds]);

  const handleSaveFactoryColumnSelection = useCallback(() => {
    const sanitized = sanitizeFactorySelection(visibleFactoryColumnIds);
    setVisibleFactoryColumnIds(sanitized);
    setPersistedFactoryColumnIds(sanitized);
    try {
      window.localStorage.setItem(FACTORY_COLUMN_STORAGE_KEY, JSON.stringify(sanitized));
      toast.success('Column selection saved');
    } catch (error) {
      console.warn('Failed to persist factory column preferences', error);
      toast.error('Failed to save column selection');
    }
  }, [sanitizeFactorySelection, visibleFactoryColumnIds]);

  const visibleFactoryColumns = useMemo(
    () =>
      factoryColumns.filter(
        (column) => column.alwaysVisible || visibleFactoryColumnIds.includes(column.id)
      ),
    [factoryColumns, visibleFactoryColumnIds]
  );

  const factoryTableMinWidth = useMemo(
    () => calculateTableMinWidth(visibleFactoryColumns.length),
    [visibleFactoryColumns.length]
  );

  // Render cards view
  const renderCardsView = () => (
    <>
      <Grid container spacing={2}>
        {paginatedFactories.map((factory) => (
          <Grid size={{ xs: 12, sm: 6, md: 4 }} key={factory._id}>
            <Card>
              <CardContent>
                <Typography variant="h6" component="h2" gutterBottom>
                  {factory.name}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Created: {formatDate(factory.created_at)}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Updated: {formatDate(factory.updated_at)}
                </Typography>
                {factory.created_by && (
                  <Typography variant="body2" color="text.secondary">
                    By: {factory.created_by.username}
                  </Typography>
                )}
              </CardContent>

              <CardActions sx={{ justifyContent: 'flex-end', pt: 0 }}>
                <Tooltip title="Edit Factory">
                  <IconButton
                    size="small"
                    onClick={() => handleEditFactory(factory)}
                    color="primary"
                  >
                    <EditIcon />
                  </IconButton>
                </Tooltip>
                <Tooltip title="Delete Factory">
                  <IconButton
                    size="small"
                    onClick={() => {
                      setFactoryToDelete(factory._id);
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
          count={sortedFactories.length}
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
      <Table sx={{ minWidth: factoryTableMinWidth }}>
        <TableHead>
          <TableRow>
            {visibleFactoryColumns.map((column) => {
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
          {paginatedFactories.map((factory) => (
            <TableRow key={factory._id} hover>
              {visibleFactoryColumns.map((column) => {
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
                    {column.renderCell(factory)}
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
        count={sortedFactories.length}
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
  );

  if (loading) {
    return (
      <Box sx={{ p: 3 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          Factory Management
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
          <FactoryIcon sx={{ color: 'primary.main' }} />
          <Typography variant="h4" component="h1">
            Factory Management
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={handleAddFactory}
          sx={{ minWidth: 'max-content' }}
        >
          Add Factory
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
          size="small"
          placeholder="Search factories..."
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
            title="Factory Report"
            fileBaseName="factories"
            currentRows={paginatedFactories}
            columns={factoryExportColumns}
            onFetchAll={fetchAllFactories}
            disabled={loading || (factories.length === 0 && paginatedFactories.length === 0)}
          />

          <ColumnVisibilityMenu
            options={factoryColumnVisibilityOptions}
            selected={visibleFactoryColumnIds}
            onChange={handleVisibleFactoryColumnsChange}
            onSaveSelection={handleSaveFactoryColumnSelection}
            saveDisabled={!factoryHasUnsavedChanges}
            minSelectable={1}
          />

          <ToggleButtonGroup
            value={viewMode}
            exclusive
            onChange={(_event, newMode) => newMode && setViewMode(newMode)}
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
        Showing {filteredFactories.length} of {factories.length} factories
      </Typography>

      {/* Content based on view mode */}
      {viewMode === 'cards' ? renderCardsView() : renderListView()}

      {/* Floating action button */}
      <Fab
        color="primary"
        aria-label="add factory"
        onClick={handleAddFactory}
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
          {editingFactory ? 'Edit Factory' : 'Add Factory'}
        </DialogTitle>
        <DialogContent>
          <Box component="form" sx={{ mt: 2 }}>
            <TextField
              autoFocus
              margin="dense"
              id="name"
              label="Factory Name"
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
            {editingFactory ? 'Update' : 'Create'}
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
        <DialogTitle>Delete Factory</DialogTitle>
        <DialogContent>
          <Alert severity="warning" sx={{ mb: 1 }}>
            Are you sure you want to delete this factory? This action cannot be undone.
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
            onClick={handleDeleteFactory}
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
