'use client';

import React, {
  useState,
  useEffect,
  useMemo,
  useCallback,
  useRef,
} from 'react';
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
  Chip,
  Stack,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormControlLabel,
  Switch,
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Restore as RestoreIcon,
  Map as MapIcon,
  ViewList as ViewListIcon,
  ViewModule as ViewModuleIcon,
  Search as SearchIcon,
} from '@mui/icons-material';
import type { SelectChangeEvent } from '@mui/material/Select';
import { useForm, Controller, type SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'react-hot-toast';
import api from '@/lib/api';
import ExportMenu from '@/components/common/ExportMenu';
import ColumnVisibilityMenu from '@/components/common/ColumnVisibilityMenu';
import type { ExportColumn } from '@/lib/exportUtils';
import { formatDateForExport } from '@/lib/exportUtils';
import { calculateTableMinWidth } from '@/lib/tableUtils';

const TERRITORY_META = [
  { value: 'zone', label: 'Zone', level: 0, description: 'Top-level territory, no parent required.' },
  { value: 'region', label: 'Region', level: 1, description: 'Child of a Zone, groups multiple areas.' },
  { value: 'area', label: 'Area', level: 2, description: 'Child of a Region, groups distributor points.' },
  { value: 'db_point', label: 'DB Point', level: 3, description: 'Child of an Area, distributor/point of sale node.' },
] as const;

type TerritoryType = (typeof TERRITORY_META)[number]['value'];

type TerritoryMetaMap = Record<TerritoryType, { label: string; level: number; description: string }>;

const TERRITORY_META_MAP: TerritoryMetaMap = TERRITORY_META.reduce((acc, meta) => {
  acc[meta.value] = { label: meta.label, level: meta.level, description: meta.description };
  return acc;
}, {} as TerritoryMetaMap);

const TERRITORY_COLUMN_STORAGE_KEY = 'master:territories:visibleColumns';

interface TerritoryUserRef {
  _id?: string;
  username?: string;
}

interface TerritoryParentRef {
  _id: string;
  name: string;
  type: TerritoryType;
  level: number;
}

interface Territory {
  _id: string;
  name: string;
  type: TerritoryType;
  level: number;
  parent: TerritoryParentRef | null;
  ancestors: string[];
  active: boolean;
  created_at: string;
  created_by?: TerritoryUserRef | null;
  updated_at: string;
  updated_by?: TerritoryUserRef | null;
}

const territorySchema = z
  .object({
    name: z
      .string()
      .min(2, 'Name must be at least 2 characters')
      .max(160, 'Name must be 160 characters or fewer'),
    type: z.enum(['zone', 'region', 'area', 'db_point']),
    parent_id: z.string().optional().nullable(),
  active: z.boolean(),
  })
  .refine(
    (data) => {
      const meta = TERRITORY_META_MAP[data.type];
      if (!meta) return false;
      if (meta.level === 0) {
        return data.parent_id === null || data.parent_id === undefined || data.parent_id === '';
      }
      return Boolean(data.parent_id);
    },
    {
      path: ['parent_id'],
      message: 'Parent territory selection is required for this level',
    }
  );

type TerritoryFormData = z.infer<typeof territorySchema>;

type Order = 'asc' | 'desc';

type OrderableKeys = keyof Pick<
  Territory,
  'name' | 'type' | 'level' | 'active' | 'created_at' | 'updated_at'
>;

interface TerritoryColumnDefinition {
  id: string;
  label: string;
  sortableKey?: OrderableKeys;
  align?: 'inherit' | 'left' | 'center' | 'right' | 'justify';
  alwaysVisible?: boolean;
  minWidth?: number;
  renderCell: (territory: Territory) => React.ReactNode;
}

type NormalizedTerritoryPayload = Record<string, unknown>;

const toStringId = (value: unknown): string => {
  if (!value) return '';
  if (typeof value === 'string') return value;
  if (typeof value === 'object' && value !== null && '_id' in (value as Record<string, unknown>)) {
    const nested = (value as Record<string, unknown>)._id;
    return toStringId(nested);
  }
  if (typeof value === 'object' && value !== null && typeof (value as { toString?: () => string }).toString === 'function') {
    const result = (value as { toString: () => string }).toString();
    return result === '[object Object]' ? '' : result;
  }
  if (typeof value === 'number' || typeof value === 'bigint') return String(value);
  return '';
};

const normalizeParent = (rawParent: unknown): TerritoryParentRef | null => {
  const id = toStringId(rawParent);
  if (!id) return null;
  if (typeof rawParent === 'object' && rawParent !== null) {
    const parent = rawParent as Record<string, unknown>;
    const type = (parent.type as TerritoryType) ?? 'zone';
    return {
      _id: id,
      name: typeof parent.name === 'string' ? parent.name : '',
      type,
      level: typeof parent.level === 'number' ? parent.level : Number(parent.level ?? 0),
    };
  }
  return {
    _id: id,
    name: '',
    type: 'zone',
    level: 0,
  };
};

const coerceIsoString = (value: unknown): string => {
  if (typeof value === 'string' && value.length) {
    return value;
  }
  if (value instanceof Date) {
    return value.toISOString();
  }
  if (typeof value === 'number') {
    return new Date(value).toISOString();
  }
  return new Date().toISOString();
};

const normalizeTerritory = (raw: NormalizedTerritoryPayload): Territory => {
  const parent = normalizeParent(raw.parent_id ?? raw.parent);
  const type = (raw.type as TerritoryType) ?? 'zone';
  const level = typeof raw.level === 'number' ? raw.level : TERRITORY_META_MAP[type]?.level ?? 0;

  return {
    _id: toStringId(raw._id),
    name: typeof raw.name === 'string' ? raw.name : String(raw.name ?? ''),
    type,
    level,
    parent,
    ancestors: Array.isArray(raw.ancestors)
      ? raw.ancestors.map((ancestor) => toStringId(ancestor)).filter(Boolean)
      : [],
    active: Boolean(raw.active ?? true),
    created_at: coerceIsoString(raw.created_at),
    created_by: (raw.created_by as TerritoryUserRef | null) ?? null,
    updated_at: coerceIsoString(raw.updated_at),
    updated_by: (raw.updated_by as TerritoryUserRef | null) ?? null,
  };
};

const formatDate = (dateString: string) =>
  new Date(dateString).toLocaleDateString('en-BD', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });

const getTypeLabel = (type: TerritoryType) => TERRITORY_META_MAP[type]?.label ?? type;

const getLevelLabel = (level: number) => {
  const meta = TERRITORY_META.find((item) => item.level === level);
  return meta ? meta.label : `Level ${level}`;
};

export default function TerritoriesPage() {
  const [territories, setTerritories] = useState<Territory[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'cards' | 'list'>('cards');
  const [searchTerm, setSearchTerm] = useState('');
  const [showInactive, setShowInactive] = useState(false);
  const [openDialog, setOpenDialog] = useState(false);
  const [editingTerritory, setEditingTerritory] = useState<Territory | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [territoryToDelete, setTerritoryToDelete] = useState<Territory | null>(null);
  const [restoreConfirmOpen, setRestoreConfirmOpen] = useState(false);
  const [territoryToRestore, setTerritoryToRestore] = useState<Territory | null>(null);
  const [orderBy, setOrderBy] = useState<OrderableKeys>('name');
  const [order, setOrder] = useState<Order>('asc');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [visibleColumnIds, setVisibleColumnIds] = useState<string[]>([]);
  const columnStateHydratedRef = useRef(false);
  const [formError, setFormError] = useState<string | null>(null);

  const {
    control,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<TerritoryFormData>({
    resolver: zodResolver(territorySchema),
    defaultValues: {
      name: '',
      type: 'zone',
      parent_id: null,
      active: true,
    },
  });

  const selectedType = watch('type');
  const selectedParentId = watch('parent_id');

  const loadTerritories = useCallback(async () => {
    try {
      setLoading(true);
      const response = await api.get('/territories', {
        params: {
          limit: 200,
          includeInactive: true,
          sortBy: 'level',
          sortOrder: 'asc',
        },
      });

      const rawData = Array.isArray(response.data?.data) ? response.data.data : [];
      const normalized = rawData.map((item: NormalizedTerritoryPayload) => normalizeTerritory(item));
      setTerritories(normalized);
    } catch (error) {
      toast.error('Failed to load territories');
      console.error('Error loading territories:', error);
      setTerritories([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadTerritories();
  }, [loadTerritories]);

  const filteredTerritories = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    return territories
      .filter((territory) => (showInactive ? true : territory.active))
      .filter((territory) => {
        if (!query) return true;
        const nameMatch = territory.name.toLowerCase().includes(query);
        const typeMatch = getTypeLabel(territory.type).toLowerCase().includes(query);
        return nameMatch || typeMatch;
      });
  }, [territories, searchTerm, showInactive]);

  const handleSort = (property: OrderableKeys) => {
    const isAsc = orderBy === property && order === 'asc';
    setOrder(isAsc ? 'desc' : 'asc');
    setOrderBy(property);
    setPage(0);
  };

  const sortedTerritories = useMemo(() => {
    const next = [...filteredTerritories];
    next.sort((a, b) => {
      let aValue: unknown = a[orderBy];
      let bValue: unknown = b[orderBy];

      if (orderBy === 'created_at' || orderBy === 'updated_at') {
        aValue = new Date(a[orderBy]).getTime();
        bValue = new Date(b[orderBy]).getTime();
      }

      if (aValue == null && bValue == null) return 0;
      if (aValue == null) return order === 'asc' ? -1 : 1;
      if (bValue == null) return order === 'asc' ? 1 : -1;

  const aCompare: string | number = typeof aValue === 'number' ? aValue : String(aValue).toLowerCase();
  const bCompare: string | number = typeof bValue === 'number' ? bValue : String(bValue).toLowerCase();

      if (order === 'asc') {
        return aCompare < bCompare ? -1 : aCompare > bCompare ? 1 : 0;
      }
      return aCompare > bCompare ? -1 : aCompare < bCompare ? 1 : 0;
    });
    return next;
  }, [filteredTerritories, order, orderBy]);

  const paginatedTerritories = useMemo(
    () =>
      sortedTerritories.slice(
        page * rowsPerPage,
        page * rowsPerPage + rowsPerPage
      ),
    [sortedTerritories, page, rowsPerPage]
  );

  const currentTerritoryRows = paginatedTerritories;

  const fetchAllTerritories = useCallback(async () => [...sortedTerritories], [sortedTerritories]);

  const territoryExportColumns = useMemo<ExportColumn<Territory>[]>(
    () => [
      { header: 'Name', accessor: (row) => row.name },
      { header: 'Type', accessor: (row) => getTypeLabel(row.type) },
      { header: 'Parent', accessor: (row) => row.parent?.name ?? '-' },
      { header: 'Status', accessor: (row) => (row.active ? 'Active' : 'Inactive') },
      { header: 'Created By', accessor: (row) => row.created_by?.username ?? '' },
      { header: 'Created Date', accessor: (row) => formatDateForExport(row.created_at) },
      { header: 'Updated Date', accessor: (row) => formatDateForExport(row.updated_at) },
    ],
    []
  );

  const handleAddTerritory = useCallback(() => {
    setEditingTerritory(null);
    setFormError(null);
    reset({
      name: '',
      type: 'zone',
      parent_id: null,
      active: true,
    });
    setOpenDialog(true);
  }, [reset]);

  const handleEditTerritory = useCallback(
    (territory: Territory) => {
      setEditingTerritory(territory);
      setFormError(null);
      reset({
        name: territory.name,
        type: territory.type,
        parent_id: territory.parent?._id ?? null,
        active: territory.active,
      });
      setOpenDialog(true);
    },
    [reset]
  );

  const territoryColumns = useMemo<TerritoryColumnDefinition[]>(
    () => [
      {
        id: 'name',
        label: 'Name',
        sortableKey: 'name',
        minWidth: 200,
        renderCell: (territory) => (
          <Box>
            <Typography variant="body1" fontWeight="medium">
              {territory.name}
            </Typography>
          </Box>
        ),
      },
      {
        id: 'type',
        label: 'Type',
        sortableKey: 'type',
        renderCell: (territory) => (
          <Chip
            size="small"
            color={territory.level === 3 ? 'secondary' : 'primary'}
            label={getTypeLabel(territory.type)}
          />
        ),
      },
      {
        id: 'parent',
        label: 'Parent',
        renderCell: (territory) => territory.parent?.name ?? '—',
      },
      {
        id: 'level',
        label: 'Level',
        sortableKey: 'level',
        renderCell: (territory) => getLevelLabel(territory.level),
      },
      {
        id: 'status',
        label: 'Status',
        sortableKey: 'active',
        renderCell: (territory) => (
          <Chip
            size="small"
            color={territory.active ? 'success' : 'default'}
            label={territory.active ? 'Active' : 'Inactive'}
          />
        ),
      },
      {
        id: 'created_at',
        label: 'Created Date',
        sortableKey: 'created_at',
        renderCell: (territory) => formatDate(territory.created_at),
      },
      {
        id: 'updated_at',
        label: 'Updated Date',
        sortableKey: 'updated_at',
        renderCell: (territory) => formatDate(territory.updated_at),
      },
      {
        id: 'actions',
        label: 'Actions',
        alwaysVisible: true,
        align: 'right',
        renderCell: (territory) => (
          <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1 }}>
            <Tooltip title="Edit Territory">
              <IconButton size="small" onClick={() => handleEditTerritory(territory)} color="primary">
                <EditIcon />
              </IconButton>
            </Tooltip>
            {territory.active ? (
              <Tooltip title="Deactivate Territory">
                <IconButton
                  size="small"
                  onClick={() => {
                    setTerritoryToDelete(territory);
                    setDeleteConfirmOpen(true);
                  }}
                  color="error"
                >
                  <DeleteIcon />
                </IconButton>
              </Tooltip>
            ) : (
              <Tooltip title="Restore Territory">
                <IconButton
                  size="small"
                  onClick={() => {
                    setTerritoryToRestore(territory);
                    setRestoreConfirmOpen(true);
                  }}
                  color="success"
                >
                  <RestoreIcon />
                </IconButton>
              </Tooltip>
            )}
          </Box>
        ),
      },
    ],
    [handleEditTerritory]
  );

  const selectableColumnIds = useMemo(
    () => territoryColumns.filter((column) => !column.alwaysVisible).map((column) => column.id),
    [territoryColumns]
  );

  const sanitizeColumnSelection = useCallback(
    (ids: string[]) => selectableColumnIds.filter((id) => ids.includes(id)),
    [selectableColumnIds]
  );

  useEffect(() => {
    if (!selectableColumnIds.length) {
      setVisibleColumnIds([]);
      return;
    }

    if (typeof window === 'undefined' || columnStateHydratedRef.current) {
      return;
    }

    const stored = window.localStorage.getItem(TERRITORY_COLUMN_STORAGE_KEY);
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          const sanitized = sanitizeColumnSelection(parsed);
          if (sanitized.length) {
            setVisibleColumnIds(sanitized);
            columnStateHydratedRef.current = true;
            return;
          }
        }
      } catch {
        // Ignore malformed storage
      }
    }

    setVisibleColumnIds(selectableColumnIds);
    columnStateHydratedRef.current = true;
  }, [selectableColumnIds, sanitizeColumnSelection]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!columnStateHydratedRef.current) return;
    window.localStorage.setItem(
      TERRITORY_COLUMN_STORAGE_KEY,
      JSON.stringify(visibleColumnIds.length ? visibleColumnIds : selectableColumnIds)
    );
  }, [visibleColumnIds, selectableColumnIds]);

  const handleVisibleColumnsChange = useCallback(
    (next: string[]) => {
      const sanitized = sanitizeColumnSelection(next);
      setVisibleColumnIds(sanitized.length ? sanitized : selectableColumnIds);
    },
    [sanitizeColumnSelection, selectableColumnIds]
  );

  const parentOptions = useMemo(() => {
    const meta = TERRITORY_META_MAP[selectedType];
    if (!meta || meta.level === 0) {
      return [];
    }
    const expectedLevel = meta.level - 1;

    const options = territories
      .filter((territory) => territory.level === expectedLevel)
      .map((territory) => ({
        value: territory._id,
        label: territory.name,
        active: territory.active,
      }));

    if (editingTerritory?.parent && editingTerritory.parent._id && !options.some((opt) => opt.value === editingTerritory.parent?._id)) {
      options.push({
        value: editingTerritory.parent._id,
        label: editingTerritory.parent.name,
        active: true,
      });
    }

    return options.sort((a, b) => a.label.localeCompare(b.label));
  }, [territories, selectedType, editingTerritory]);

  useEffect(() => {
    const meta = TERRITORY_META_MAP[selectedType];
    if (meta && meta.level === 0) {
      setValue('parent_id', null);
    }
  }, [selectedType, setValue]);

  const onSubmit: SubmitHandler<TerritoryFormData> = async (data) => {
    try {
      setFormError(null);
      const payload = {
        name: data.name.trim(),
        type: data.type,
        parent_id: data.type === 'zone' ? null : data.parent_id,
        active: data.active,
      };

      if (editingTerritory) {
        await api.put(`/territories/${editingTerritory._id}`, payload);
        toast.success('Territory updated successfully');
      } else {
        await api.post('/territories', payload);
        toast.success('Territory created successfully');
      }

      setOpenDialog(false);
      setEditingTerritory(null);
      reset({
        name: '',
        type: 'zone',
        parent_id: null,
        active: true,
      });
      loadTerritories();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to save territory';
      setFormError(message);
      toast.error(message);
    }
  };

  const handleConfirmDelete = async () => {
    if (!territoryToDelete) return;
    try {
      await api.delete(`/territories/${territoryToDelete._id}`);
      toast.success('Territory deactivated successfully');
      setDeleteConfirmOpen(false);
      setTerritoryToDelete(null);
      loadTerritories();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to deactivate territory';
      toast.error(message);
    }
  };

  const handleConfirmRestore = async () => {
    if (!territoryToRestore) return;
    try {
      await api.patch(`/territories/${territoryToRestore._id}/restore`);
      toast.success('Territory restored successfully');
      setRestoreConfirmOpen(false);
      setTerritoryToRestore(null);
      loadTerritories();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to restore territory';
      toast.error(message);
    }
  };

  const handleChangePage = (_event: unknown, newPage: number) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const handleViewModeChange = (_: React.MouseEvent<HTMLElement>, mode: 'cards' | 'list' | null) => {
    if (mode) {
      setViewMode(mode);
    }
  };

  const tableMinWidth = useMemo(() => calculateTableMinWidth(territoryColumns.length), [territoryColumns.length]);

  return (
    <Box sx={{ p: 3 }}>
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          mb: 3,
          flexWrap: 'wrap',
          gap: 2,
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <MapIcon sx={{ color: 'primary.main' }} />
          <Box>
            <Typography variant="h4" component="h1" gutterBottom>
              Territory Management
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Manage hierarchical sales territories across zones, regions, areas, and DB points.
            </Typography>
          </Box>
        </Box>
        <Button variant="contained" startIcon={<AddIcon />} onClick={handleAddTerritory}>
          Add Territory
        </Button>
      </Box>

      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          mb: 3,
          flexWrap: 'wrap',
          gap: 2,
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap' }}>
          <TextField
            variant="outlined"
            size="small"
            placeholder="Search territories..."
            value={searchTerm}
            onChange={(event) => {
              setSearchTerm(event.target.value);
              setPage(0);
            }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon fontSize="small" />
                </InputAdornment>
              ),
            }}
            sx={{ minWidth: 250 }}
          />
          <FormControlLabel
            control={
              <Switch
                checked={showInactive}
                onChange={(event) => {
                  setShowInactive(event.target.checked);
                  setPage(0);
                }}
              />
            }
            label="Show inactive"
          />
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap' }}>
          <ExportMenu
            title="Territory Export"
            fileBaseName="territories"
            currentRows={currentTerritoryRows}
            columns={territoryExportColumns}
            onFetchAll={fetchAllTerritories}
            disabled={!territories.length}
          />
          <ColumnVisibilityMenu
            options={territoryColumns.map(({ id, label, alwaysVisible }) => ({ id, label, alwaysVisible }))}
            selected={visibleColumnIds.length ? visibleColumnIds : selectableColumnIds}
            onChange={handleVisibleColumnsChange}
          />
          <ToggleButtonGroup
            value={viewMode}
            exclusive
            onChange={handleViewModeChange}
            size="small"
            aria-label="view mode"
          >
            <ToggleButton value="cards" aria-label="card view">
              <Tooltip title="Card View">
                <ViewModuleIcon />
              </Tooltip>
            </ToggleButton>
            <ToggleButton value="list" aria-label="list view">
              <Tooltip title="List View">
                <ViewListIcon />
              </Tooltip>
            </ToggleButton>
          </ToggleButtonGroup>
        </Box>
      </Box>

      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Showing {filteredTerritories.length} of {territories.length} territories
      </Typography>

      {loading ? (
        <Box
          display="grid"
          gap={2}
          gridTemplateColumns={{ xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(3, 1fr)' }}
        >
          {Array.from({ length: 6 }).map((_, index) => (
            <Skeleton
              key={`territory-skeleton-${index}`}
              variant="rectangular"
              height={180}
            />
          ))}
        </Box>
      ) : currentTerritoryRows.length === 0 ? (
        <Box textAlign="center" py={6}>
          <MapIcon sx={{ fontSize: 60, color: 'text.secondary', mb: 2 }} />
          <Typography variant="h6">No territories found</Typography>
          <Typography variant="body2" color="text.secondary">
            Try adjusting filters or add a new territory to get started.
          </Typography>
        </Box>
      ) : viewMode === 'cards' ? (
        <>
          <Box
            display="grid"
            gap={2}
            gridTemplateColumns={{ xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(3, 1fr)' }}
          >
            {currentTerritoryRows.map((territory) => (
              <Card
                key={territory._id}
                variant="outlined"
                sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}
              >
                <CardContent sx={{ flexGrow: 1 }}>
                  <Stack direction="row" alignItems="center" spacing={1} mb={1}>
                    <MapIcon color="primary" />
                    <Typography variant="h6" fontWeight="bold">
                      {territory.name}
                    </Typography>
                  </Stack>
                  <Stack direction="row" spacing={1} mb={1}>
                    <Chip size="small" color="primary" label={getTypeLabel(territory.type)} />
                    <Chip
                      size="small"
                      color={territory.active ? 'success' : 'default'}
                      label={territory.active ? 'Active' : 'Inactive'}
                    />
                  </Stack>
                  <Typography variant="body2" color="text.secondary">
                    Parent: <strong>{territory.parent?.name ?? '—'}</strong>
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Level: <strong>{getLevelLabel(territory.level)}</strong>
                  </Typography>
                </CardContent>
                <CardActions sx={{ justifyContent: 'space-between' }}>
                  <Typography variant="caption" color="text.secondary">
                    Updated {formatDate(territory.updated_at)}
                  </Typography>
                  <Stack direction="row" spacing={1}>
                    <Tooltip title="Edit Territory">
                      <IconButton size="small" onClick={() => handleEditTerritory(territory)} color="primary">
                        <EditIcon />
                      </IconButton>
                    </Tooltip>
                    {territory.active ? (
                      <Tooltip title="Deactivate Territory">
                        <IconButton
                          size="small"
                          onClick={() => {
                            setTerritoryToDelete(territory);
                            setDeleteConfirmOpen(true);
                          }}
                          color="error"
                        >
                          <DeleteIcon />
                        </IconButton>
                      </Tooltip>
                    ) : (
                      <Tooltip title="Restore Territory">
                        <IconButton
                          size="small"
                          onClick={() => {
                            setTerritoryToRestore(territory);
                            setRestoreConfirmOpen(true);
                          }}
                          color="success"
                        >
                          <RestoreIcon />
                        </IconButton>
                      </Tooltip>
                    )}
                  </Stack>
                </CardActions>
              </Card>
            ))}
          </Box>
          <TablePagination
            component="div"
            count={sortedTerritories.length}
            page={page}
            onPageChange={handleChangePage}
            rowsPerPage={rowsPerPage}
            onRowsPerPageChange={handleChangeRowsPerPage}
            rowsPerPageOptions={[10, 25, 50, 100, 500]}
            sx={{ mt: 2, borderTop: 1, borderColor: 'divider' }}
          />
        </>
      ) : (
        <Paper>
          <TableContainer>
            <Table sx={{ minWidth: tableMinWidth }}>
              <TableHead>
                <TableRow>
                  {territoryColumns
                    .filter((column) => column.alwaysVisible || (visibleColumnIds.length ? visibleColumnIds.includes(column.id) : true))
                    .map((column) => (
                      <TableCell
                        key={column.id}
                        sortDirection={orderBy === column.sortableKey ? order : false}
                        align={column.align}
                        sx={{
                          minWidth: column.minWidth,
                          ...(column.id === 'actions'
                            ? {
                                position: 'sticky',
                                right: 0,
                                zIndex: 3,
                                backgroundColor: (theme) => theme.palette.background.paper,
                              }
                            : {}),
                        }}
                      >
                        {column.sortableKey ? (
                          <TableSortLabel
                            active={orderBy === column.sortableKey}
                            direction={orderBy === column.sortableKey ? order : 'asc'}
                            onClick={() => handleSort(column.sortableKey as OrderableKeys)}
                          >
                            {column.label}
                          </TableSortLabel>
                        ) : (
                          column.label
                        )}
                      </TableCell>
                    ))}
                </TableRow>
              </TableHead>
              <TableBody>
                {currentTerritoryRows.map((territory) => (
                  <TableRow key={territory._id} hover>
                    {territoryColumns
                      .filter((column) => column.alwaysVisible || (visibleColumnIds.length ? visibleColumnIds.includes(column.id) : true))
                      .map((column) => (
                        <TableCell
                          key={`${territory._id}-${column.id}`}
                          align={column.align}
                          sx={{
                            ...(column.id === 'actions'
                              ? {
                                  position: 'sticky',
                                  right: 0,
                                  backgroundColor: (theme) => theme.palette.background.paper,
                                  zIndex: 2,
                                }
                              : {}),
                          }}
                        >
                          {column.renderCell(territory)}
                        </TableCell>
                      ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
          <TablePagination
            component="div"
            count={sortedTerritories.length}
            page={page}
            onPageChange={handleChangePage}
            rowsPerPage={rowsPerPage}
            onRowsPerPageChange={handleChangeRowsPerPage}
            rowsPerPageOptions={[10, 25, 50, 100, 500]}
          />
        </Paper>
      )}

      <Dialog open={openDialog} onClose={() => setOpenDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{editingTerritory ? 'Edit Territory' : 'Add Territory'}</DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2} mt={1}>
            {formError && (
              <Alert severity="error" onClose={() => setFormError(null)}>
                {formError}
              </Alert>
            )}
            <Controller
              name="name"
              control={control}
              render={({ field }) => (
                <TextField
                  {...field}
                  label="Territory Name"
                  fullWidth
                  error={Boolean(errors.name)}
                  helperText={errors.name?.message}
                />
              )}
            />
            <Controller
              name="type"
              control={control}
              render={({ field }) => (
                <FormControl fullWidth error={Boolean(errors.type)}>
                  <InputLabel id="territory-type-label">Type</InputLabel>
                  <Select
                    {...field}
                    labelId="territory-type-label"
                    label="Type"
                    disabled={Boolean(editingTerritory)}
                    onChange={(event: SelectChangeEvent<TerritoryType>) => {
                      field.onChange(event.target.value as TerritoryType);
                    }}
                  >
                    {TERRITORY_META.map((meta) => (
                      <MenuItem key={meta.value} value={meta.value}>
                        <Stack spacing={0.5}>
                          <Typography variant="body2" fontWeight="medium">
                            {meta.label}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {meta.description}
                          </Typography>
                        </Stack>
                      </MenuItem>
                    ))}
                  </Select>
                  {errors.type && (
                    <Typography variant="caption" color="error" sx={{ mt: 0.5 }}>
                      {errors.type.message}
                    </Typography>
                  )}
                </FormControl>
              )}
            />
            {selectedType !== 'zone' && (
              <Controller
                name="parent_id"
                control={control}
                render={({ field }) => (
                  <FormControl fullWidth error={Boolean(errors.parent_id)}>
                    <InputLabel id="parent-territory-label">Parent Territory</InputLabel>
                    <Select
                      {...field}
                      labelId="parent-territory-label"
                      label="Parent Territory"
                      value={field.value ?? ''}
                      onChange={(event: SelectChangeEvent<string>) => {
                        field.onChange(event.target.value || null);
                      }}
                    >
                      {parentOptions.length === 0 ? (
                        <MenuItem value="" disabled>
                          No eligible parents found. Create a higher-level territory first.
                        </MenuItem>
                      ) : (
                        parentOptions.map((option) => (
                          <MenuItem key={option.value} value={option.value}>
                            {option.label}
                            {!option.active && (
                              <Typography component="span" variant="caption" color="error" ml={1}>
                                (inactive)
                              </Typography>
                            )}
                          </MenuItem>
                        ))
                      )}
                    </Select>
                    {errors.parent_id && (
                      <Typography variant="caption" color="error" sx={{ mt: 0.5 }}>
                        {errors.parent_id.message}
                      </Typography>
                    )}
                  </FormControl>
                )}
              />
            )}
            <Controller
              name="active"
              control={control}
              render={({ field }) => (
                <FormControlLabel
                  control={<Switch checked={field.value} onChange={(event) => field.onChange(event.target.checked)} />}
                  label={field.value ? 'Active territory' : 'Inactive territory'}
                />
              )}
            />
            {selectedParentId && selectedType !== 'zone' && (
              <Alert severity="info">
                Selected parent will determine the ancestry path and access scope for this territory.
              </Alert>
            )}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDialog(false)} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button onClick={handleSubmit(onSubmit)} variant="contained" disabled={isSubmitting}>
            {editingTerritory ? 'Save Changes' : 'Create Territory'}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={deleteConfirmOpen} onClose={() => setDeleteConfirmOpen(false)}>
        <DialogTitle>Deactivate Territory</DialogTitle>
        <DialogContent dividers>
          <Typography>
            Are you sure you want to deactivate <strong>{territoryToDelete?.name}</strong>? This will hide the territory but keep its data.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteConfirmOpen(false)}>Cancel</Button>
          <Button onClick={handleConfirmDelete} color="error" variant="contained">
            Deactivate
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={restoreConfirmOpen} onClose={() => setRestoreConfirmOpen(false)}>
        <DialogTitle>Restore Territory</DialogTitle>
        <DialogContent dividers>
          <Typography>
            Restore <strong>{territoryToRestore?.name}</strong> and make it active again?
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRestoreConfirmOpen(false)}>Cancel</Button>
          <Button onClick={handleConfirmRestore} color="success" variant="contained">
            Restore
          </Button>
        </DialogActions>
      </Dialog>

      <Fab
        color="primary"
        sx={{ position: 'fixed', bottom: 32, right: 32, display: { xs: 'flex', md: 'none' } }}
        onClick={handleAddTerritory}
        aria-label="Add territory"
      >
        <AddIcon />
      </Fab>
    </Box>
  );
}
