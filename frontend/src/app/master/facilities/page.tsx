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
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  FormHelperText,
  FormControlLabel,
  Switch,
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Business as BusinessIcon,
  ViewList as ViewListIcon,
  ViewModule as ViewModuleIcon,
  Search as SearchIcon,
  Factory as FactoryIcon,
  Warehouse as WarehouseIcon,
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

// Facility type definition (matches backend model exactly)
interface Facility {
  _id: string;
  type: 'Factory' | 'Depot';
  name: string;
  active: boolean;
  created_at: string;
  created_by?: { username: string } | null;
  updated_at: string;
  updated_by?: { username: string } | null;
}

// Facility form schema (mirrors backend validation)
const facilitySchema = z.object({
  name: z.string().min(2, 'Facility name must be at least 2 characters'),
  type: z.enum(['Factory', 'Depot']),
  active: z.boolean(),
});

type FacilityFormData = z.infer<typeof facilitySchema>;

type Order = 'asc' | 'desc';

type OrderableKeys = keyof Pick<Facility, 'name' | 'type' | 'active' | 'created_at' | 'updated_at' | 'created_by'>;

interface FacilityColumnDefinition {
  id: string;
  label: string;
  sortableKey?: OrderableKeys;
  align?: 'inherit' | 'left' | 'center' | 'right' | 'justify';
  alwaysVisible?: boolean;
  renderCell: (facility: Facility) => React.ReactNode;
}

const FACILITY_COLUMN_STORAGE_KEY = 'master:facilities:visibleColumns';

export default function FacilitiesPage() {
  // State management
  const [facilities, setFacilities] = useState<Facility[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'cards' | 'list'>('cards');
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | 'Factory' | 'Depot'>('all');
  const [openDialog, setOpenDialog] = useState(false);
  const [editingFacility, setEditingFacility] = useState<Facility | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [facilityToDelete, setFacilityToDelete] = useState<string | null>(null);

  // Sorting and pagination state
  const [orderBy, setOrderBy] = useState<OrderableKeys>('name');
  const [order, setOrder] = useState<Order>('asc');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [visibleFacilityColumnIds, setVisibleFacilityColumnIds] = useState<string[]>([]);
  const [persistedFacilityColumnIds, setPersistedFacilityColumnIds] = useState<string[]>([]);
  const facilityColumnStateHydratedRef = useRef(false);

  const facilityExportColumns = useMemo<ExportColumn<Facility>[]>(
    () => [
      {
        header: 'Facility Type',
        accessor: (row) => row.type,
      },
      {
        header: 'Facility Name',
        accessor: (row) => row.name,
      },
      {
        header: 'Status',
        accessor: (row) => row.active ? 'Active' : 'Inactive',
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
    control,
    formState: { errors, isSubmitting },
  } = useForm<FacilityFormData>({
    resolver: zodResolver(facilitySchema) as any,
    defaultValues: {
      name: '',
      type: 'Depot' as const,
      active: true,
    },
  });

  // Load facilities
  const loadFacilities = async () => {
    try {
      setLoading(true);
      const response = await api.get('/facilities', {
        params: { limit: 100000 }
      });

      const facilitiesData = response.data?.data && Array.isArray(response.data.data)
        ? response.data.data
        : [];

      setFacilities(facilitiesData);
    } catch (error) {
      toast.error('Failed to load facilities');
      console.error('Error loading facilities:', error);
      setFacilities([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadFacilities();
  }, []);

  // Filter facilities based on search term and type
  const filteredFacilities = useMemo(() => {
    let filtered = facilities;

    // Filter by type
    if (typeFilter !== 'all') {
      filtered = filtered.filter((facility) => facility.type === typeFilter);
    }

    // Filter by search term
    const query = searchTerm.trim().toLowerCase();
    if (query) {
      filtered = filtered.filter(
        (facility) =>
          facility.name.toLowerCase().includes(query)
      );
    }

    return filtered;
  }, [facilities, searchTerm, typeFilter]);

  // Sorting function
  const handleSort = (property: OrderableKeys) => {
    const isAsc = orderBy === property && order === 'asc';
    setOrder(isAsc ? 'desc' : 'asc');
    setOrderBy(property);
    setPage(0);
  };

  // Sort the filtered facilities
  const sortedFacilities = useMemo(() => {
    const next = [...filteredFacilities];
    next.sort((a, b) => {
      let aValue: unknown;
      let bValue: unknown;

      if (orderBy === 'created_at' || orderBy === 'updated_at') {
        aValue = new Date(a[orderBy]).getTime();
        bValue = new Date(b[orderBy]).getTime();
      } else if (orderBy === 'created_by') {
        aValue = a.created_by?.username ?? '';
        bValue = b.created_by?.username ?? '';
      } else if (orderBy === 'active') {
        aValue = a.active ? 1 : 0;
        bValue = b.active ? 1 : 0;
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
  }, [filteredFacilities, order, orderBy]);

  const fetchAllFacilities = useCallback(async () => [...sortedFacilities], [sortedFacilities]);

  // Paginate the sorted facilities
  const paginatedFacilities = sortedFacilities.slice(
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
  const onSubmit = async (data: FacilityFormData) => {
    try {
      if (editingFacility) {
        await api.put(`/facilities/${editingFacility._id}`, data);
        toast.success('Facility updated successfully');
      } else {
        await api.post('/facilities', data);
        toast.success('Facility created successfully');
      }

      setOpenDialog(false);
      reset();
      setEditingFacility(null);
      loadFacilities();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to save facility';
      toast.error(errorMessage);
    }
  };

  // Handle delete facility
  const handleDeleteFacility = async () => {
    if (!facilityToDelete) return;

    try {
      await api.delete(`/facilities/${facilityToDelete}`);
      toast.success('Facility deleted successfully');
      setDeleteConfirmOpen(false);
      setFacilityToDelete(null);
      loadFacilities();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to delete facility';
      toast.error(errorMessage);
    }
  };

  // Handle edit facility
  const handleEditFacility = useCallback(
    (facility: Facility) => {
      setEditingFacility(facility);
      reset({
        name: facility.name,
        type: facility.type,
        active: facility.active,
      });
      setOpenDialog(true);
    },
    [reset]
  );

  // Handle add new facility
  const handleAddFacility = useCallback(() => {
    setEditingFacility(null);
    reset({
      name: '',
      type: 'Depot',
      active: true,
    });
    setOpenDialog(true);
  }, [reset]);

  const facilityColumns = useMemo<FacilityColumnDefinition[]>(
    () => [
      {
        id: 'type',
        label: 'Type',
        sortableKey: 'type',
        renderCell: (facility) => (
          <Chip
            icon={facility.type === 'Factory' ? <FactoryIcon /> : <WarehouseIcon />}
            label={facility.type}
            color={facility.type === 'Factory' ? 'primary' : 'secondary'}
            size="small"
          />
        ),
      },
      {
        id: 'name',
        label: 'Facility Name',
        sortableKey: 'name',
        renderCell: (facility) => (
          <Typography variant="body1" fontWeight="medium">
            {facility.name}
          </Typography>
        ),
      },
      {
        id: 'active',
        label: 'Status',
        sortableKey: 'active',
        renderCell: (facility) => (
          <Chip
            label={facility.active ? 'Active' : 'Inactive'}
            color={facility.active ? 'success' : 'default'}
            variant={facility.active ? 'filled' : 'outlined'}
            size="small"
          />
        ),
      },
      {
        id: 'created_by',
        label: 'Created By',
        sortableKey: 'created_by',
        renderCell: (facility) => facility.created_by?.username ?? '-',
      },
      {
        id: 'created_at',
        label: 'Created Date',
        sortableKey: 'created_at',
        renderCell: (facility) => formatDate(facility.created_at),
      },
      {
        id: 'updated_at',
        label: 'Updated Date',
        sortableKey: 'updated_at',
        renderCell: (facility) => formatDate(facility.updated_at),
      },
      {
        id: 'actions',
        label: 'Actions',
        alwaysVisible: true,
        align: 'right',
        renderCell: (facility) => (
          <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1 }}>
            <Tooltip title="Edit Facility">
              <IconButton size="small" onClick={() => handleEditFacility(facility)} color="primary">
                <EditIcon />
              </IconButton>
            </Tooltip>
            <Tooltip title="Delete Facility">
              <IconButton
                size="small"
                onClick={() => {
                  setFacilityToDelete(facility._id);
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
    [handleEditFacility]
  );

  const selectableFacilityColumnIds = useMemo(
    () => facilityColumns.filter((column) => !column.alwaysVisible).map((column) => column.id),
    [facilityColumns]
  );

  const handleVisibleFacilityColumnsChange = useCallback(
    (nextSelected: string[]) => {
      const sanitized = selectableFacilityColumnIds.filter((id) => nextSelected.includes(id));
      setVisibleFacilityColumnIds(sanitized.length ? sanitized : selectableFacilityColumnIds);
    },
    [selectableFacilityColumnIds]
  );

  const sanitizeFacilitySelection = useCallback(
    (ids: string[]) => selectableFacilityColumnIds.filter((id) => ids.includes(id)),
    [selectableFacilityColumnIds]
  );

  const facilityColumnVisibilityOptions = useMemo(
    () => facilityColumns.map(({ id, label, alwaysVisible }) => ({ id, label, alwaysVisible })),
    [facilityColumns]
  );

  useEffect(() => {
    if (!selectableFacilityColumnIds.length) {
      setVisibleFacilityColumnIds([]);
      setPersistedFacilityColumnIds([]);
      return;
    }

    if (!facilityColumnStateHydratedRef.current) {
      facilityColumnStateHydratedRef.current = true;

      let initialSelection = selectableFacilityColumnIds;

      try {
        const stored = window.localStorage.getItem(FACILITY_COLUMN_STORAGE_KEY);
        if (stored) {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed)) {
            const sanitized = sanitizeFacilitySelection(parsed);
            if (sanitized.length) {
              initialSelection = sanitized;
            }
          }
        }
      } catch (error) {
        console.warn('Failed to read facility column preferences', error);
      }

      setVisibleFacilityColumnIds(initialSelection);
      setPersistedFacilityColumnIds(initialSelection);
      return;
    }

    setVisibleFacilityColumnIds((previous) => {
      const sanitizedPrevious = sanitizeFacilitySelection(previous);
      if (sanitizedPrevious.length) {
        return sanitizedPrevious;
      }
      return selectableFacilityColumnIds;
    });

    setPersistedFacilityColumnIds((previous) => {
      const sanitizedPrevious = sanitizeFacilitySelection(previous);
      if (sanitizedPrevious.length) {
        return sanitizedPrevious;
      }
      return selectableFacilityColumnIds;
    });
  }, [sanitizeFacilitySelection, selectableFacilityColumnIds]);

  const facilityHasUnsavedChanges = useMemo(() => {
    if (visibleFacilityColumnIds.length !== persistedFacilityColumnIds.length) {
      return true;
    }
    const persistedSet = new Set(persistedFacilityColumnIds);
    return visibleFacilityColumnIds.some((id) => !persistedSet.has(id));
  }, [persistedFacilityColumnIds, visibleFacilityColumnIds]);

  const handleSaveFacilityColumnSelection = useCallback(() => {
    const sanitized = sanitizeFacilitySelection(visibleFacilityColumnIds);
    setVisibleFacilityColumnIds(sanitized);
    setPersistedFacilityColumnIds(sanitized);
    try {
      window.localStorage.setItem(FACILITY_COLUMN_STORAGE_KEY, JSON.stringify(sanitized));
      toast.success('Column selection saved');
    } catch (error) {
      console.warn('Failed to persist facility column preferences', error);
      toast.error('Failed to save column selection');
    }
  }, [sanitizeFacilitySelection, visibleFacilityColumnIds]);

  const visibleFacilityColumns = useMemo(
    () =>
      facilityColumns.filter(
        (column) => column.alwaysVisible || visibleFacilityColumnIds.includes(column.id)
      ),
    [facilityColumns, visibleFacilityColumnIds]
  );

  const facilityTableMinWidth = useMemo(
    () => calculateTableMinWidth(visibleFacilityColumns.length),
    [visibleFacilityColumns.length]
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
        {paginatedFacilities.map((facility) => (
          <Grid size={{ xs: 12, sm: 6, md: 4 }} key={facility._id}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', mb: 1 }}>
                  <Typography variant="h6" component="h2">
                    {facility.name}
                  </Typography>
                  <Chip
                    icon={facility.type === 'Factory' ? <FactoryIcon /> : <WarehouseIcon />}
                    label={facility.type}
                    color={facility.type === 'Factory' ? 'primary' : 'secondary'}
                    size="small"
                  />
                </Box>
                
                <Box sx={{ mt: 1.5 }}>
                  <Chip
                    label={facility.active ? 'Active' : 'Inactive'}
                    color={facility.active ? 'success' : 'default'}
                    variant={facility.active ? 'filled' : 'outlined'}
                    size="small"
                  />
                </Box>
                
                <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 2 }}>
                  Created: {formatDate(facility.created_at)}
                </Typography>
                {facility.created_by && (
                  <Typography variant="caption" color="text.secondary" display="block">
                    By: {facility.created_by.username}
                  </Typography>
                )}
              </CardContent>

              <CardActions sx={{ justifyContent: 'flex-end', pt: 0 }}>
                <Tooltip title="Edit Facility">
                  <IconButton
                    size="small"
                    onClick={() => handleEditFacility(facility)}
                    color="primary"
                  >
                    <EditIcon />
                  </IconButton>
                </Tooltip>
                <Tooltip title="Delete Facility">
                  <IconButton
                    size="small"
                    onClick={() => {
                      setFacilityToDelete(facility._id);
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
          count={sortedFacilities.length}
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
      <Table sx={{ minWidth: facilityTableMinWidth }}>
        <TableHead>
          <TableRow>
            {visibleFacilityColumns.map((column) => {
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
          {paginatedFacilities.map((facility) => (
            <TableRow key={facility._id} hover>
              {visibleFacilityColumns.map((column) => {
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
                    {column.renderCell(facility)}
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
        count={sortedFacilities.length}
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
          Facility Management
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
          <BusinessIcon sx={{ color: 'primary.main' }} />
          <Typography variant="h4" component="h1">
            Facility Management
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={handleAddFacility}
          sx={{ minWidth: 'max-content' }}
        >
          Add Facility
        </Button>
      </Box>

      {/* Search, Filter and View Controls */}
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
        <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
          <TextField
            placeholder="Search facilities..."
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
          
          <FormControl sx={{ minWidth: 150 }}>
            <InputLabel>Type</InputLabel>
            <Select
              value={typeFilter}
              label="Type"
              onChange={(e) => setTypeFilter(e.target.value as typeof typeFilter)}
            >
              <MenuItem value="all">All Types</MenuItem>
              <MenuItem value="Depot">
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <WarehouseIcon fontSize="small" />
                  Depots
                </Box>
              </MenuItem>
              <MenuItem value="Factory">
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <FactoryIcon fontSize="small" />
                  Factories
                </Box>
              </MenuItem>
            </Select>
          </FormControl>
        </Box>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <ExportMenu
            title="Facility Report"
            fileBaseName="facilities"
            currentRows={paginatedFacilities}
            columns={facilityExportColumns}
            onFetchAll={fetchAllFacilities}
            disabled={loading || (facilities.length === 0 && paginatedFacilities.length === 0)}
          />
          <ColumnVisibilityMenu
            options={facilityColumnVisibilityOptions}
            selected={visibleFacilityColumnIds}
            onChange={handleVisibleFacilityColumnsChange}
            onSaveSelection={handleSaveFacilityColumnSelection}
            saveDisabled={!facilityHasUnsavedChanges}
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
        Showing {filteredFacilities.length} of {facilities.length} facilities
        {typeFilter !== 'all' && ` (${typeFilter}s only)`}
      </Typography>

      {/* Content based on view mode */}
      {viewMode === 'cards' ? renderCardsView() : renderListView()}

      {/* Floating action button */}
      <Fab
        color="primary"
        aria-label="add facility"
        onClick={handleAddFacility}
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
        <form onSubmit={handleSubmit(onSubmit)}>
          <DialogTitle>
            {editingFacility ? 'Edit Facility' : 'Add Facility'}
          </DialogTitle>
          <DialogContent>
            <Grid container spacing={2} sx={{ mt: 1 }}>
              <Grid size={{ xs: 12 }}>
                <Controller
                  name="type"
                  control={control}
                  render={({ field }) => (
                    <FormControl fullWidth error={Boolean(errors.type)}>
                      <InputLabel>Facility Type *</InputLabel>
                      <Select {...field} label="Facility Type *">
                        <MenuItem value="Depot">
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <WarehouseIcon />
                            Depot
                          </Box>
                        </MenuItem>
                        <MenuItem value="Factory">
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <FactoryIcon />
                            Factory
                          </Box>
                        </MenuItem>
                      </Select>
                      {errors.type && (
                        <FormHelperText>{errors.type.message}</FormHelperText>
                      )}
                    </FormControl>
                  )}
                />
              </Grid>

              <Grid size={{ xs: 12 }}>
                <TextField
                  fullWidth
                  label="Facility Name *"
                  {...register('name')}
                  error={Boolean(errors.name)}
                  helperText={errors.name?.message}
                  disabled={isSubmitting}
                  placeholder="Enter facility name"
                />
              </Grid>
              
              <Grid size={{ xs: 12 }}>
                <Controller
                  name="active"
                  control={control}
                  render={({ field }) => (
                    <FormControlLabel
                      control={
                        <Switch
                          checked={field.value ?? true}
                          onChange={(event) => field.onChange(event.target.checked)}
                        />
                      }
                      label="Active"
                    />
                  )}
                />
              </Grid>
            </Grid>
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 3 }}>
            <Button onClick={() => setOpenDialog(false)} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button
              type="submit"
              variant="contained"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Saving...' : (editingFacility ? 'Update' : 'Create')}
            </Button>
          </DialogActions>
        </form>
      </Dialog>

      {/* Delete confirmation dialog */}
      <Dialog
        open={deleteConfirmOpen}
        onClose={() => setDeleteConfirmOpen(false)}
        fullWidth
        maxWidth="xs"
      >
        <DialogTitle>Delete Facility</DialogTitle>
        <DialogContent>
          <Alert severity="warning" sx={{ mb: 1 }}>
            Are you sure you want to delete this facility? This action cannot be undone.
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
            onClick={handleDeleteFacility}
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
