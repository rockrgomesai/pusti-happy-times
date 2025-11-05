'use client';

import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  CardActions,
  CardContent,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  FormControlLabel,
  FormHelperText,
  Grid,
  IconButton,
  InputAdornment,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Stack,
  Switch,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TablePagination,
  TableRow,
  TableSortLabel,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Tooltip,
  Typography,
} from '@mui/material';
import type { SelectChangeEvent } from '@mui/material/Select';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import RestoreIcon from '@mui/icons-material/Restore';
import SearchIcon from '@mui/icons-material/Search';
import StorefrontIcon from '@mui/icons-material/Storefront';
import ViewListIcon from '@mui/icons-material/ViewList';
import ViewModuleIcon from '@mui/icons-material/ViewModule';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import toast from 'react-hot-toast';

import api from '@/lib/api';
import ExportMenu from '@/components/common/ExportMenu';
import ColumnVisibilityMenu from '@/components/common/ColumnVisibilityMenu';
import type { ExportColumn } from '@/lib/exportUtils';
import { formatDateForExport } from '@/lib/exportUtils';
import { calculateTableMinWidth } from '@/lib/tableUtils';

const ORDER_UNITS = ['CTN', 'PCS', 'BAG', 'LTR', 'KG', 'GM'] as const;
const PRODUCT_SEGMENTS = ['BIS', 'EXCLUSIVE', 'GENERAL', 'PREMIUM', 'WHOLESALE'] as const;
const DISTRIBUTOR_TYPES = ['General Distributor', 'Exclusive Distributor', 'Super Distributor'] as const;
const BINARY_CHOICES = ['Yes', 'No'] as const;

type Order = 'asc' | 'desc';

type DistributorColumnId =
  | 'name'
  | 'product_segment'
  | 'distributor_type'
  | 'erp_id'
  | 'mobile'
  | 'credit_limit'
  | 'bank_guarantee'
  | 'delivery_depot'
  | 'unit'
  | 'status'
  | 'updated_by'
  | 'updated_at'
  | 'actions';

interface TerritoryPathNode {
  name?: string;
}

interface TerritoryOption {
  value: string;
  label: string;
  path: string;
}

interface DepotOption {
  value: string;
  label: string;
}

interface ProductOption {
  value: string;
  label: string;
  helper?: string;
}

interface DistributorUserRef {
  username?: string;
}

interface Distributor {
  _id: string;
  name: string;
  product_segment: string[];
  territorries: TerritoryPathNode[];
  distributor_type: string;
  erp_id?: number | null;
  mobile?: string | null;
  credit_limit: string | number;
  bank_guarantee: string | number;
  delivery_depot_id?: string | null;
  unit: string;
  active: boolean;
  updated_by?: DistributorUserRef | null;
  updated_at?: string | null;
  db_point_id?: string | null;
  skus_exclude: string[];
  computer: typeof BINARY_CHOICES[number];
  printer: typeof BINARY_CHOICES[number];
  proprietor?: string | null;
  proprietor_dob?: string | null;
  registration_date?: string | null;
  emergency_contact?: string | null;
  emergency_relation?: string | null;
  emergency_mobile?: string | null;
  unit_label?: string | null;
  latitude?: string | null;
  longitude?: string | null;
  address?: string | null;
  note?: string | null;
}

const distributorFormSchema = z.object({
  name: z.string().trim().min(2, 'Distributor name is required'),
  db_point_id: z.string().trim().optional(),
  product_segment: z.array(z.string()).min(1, 'Select at least one segment'),
  skus_exclude: z.array(z.string()).optional(),
  distributor_type: z.string().trim().min(1, 'Distributor type is required'),
  erp_id: z.string().optional(),
  mobile: z.string().optional(),
  credit_limit: z.string().min(1),
  bank_guarantee: z.string().min(1),
  delivery_depot_id: z.string().optional(),
  computer: z.enum(BINARY_CHOICES),
  printer: z.enum(BINARY_CHOICES),
  proprietor: z.string().optional(),
  proprietor_dob: z.string().optional(),
  registration_date: z.string().optional(),
  emergency_contact: z.string().optional(),
  emergency_relation: z.string().optional(),
  emergency_mobile: z.string().optional(),
  unit: z.string().trim().min(1),
  latitude: z.string().optional(),
  longitude: z.string().optional(),
  address: z.string().optional(),
  note: z.string().optional(),
  active: z.boolean(),
});

type DistributorFormData = z.infer<typeof distributorFormSchema>;

const DEFAULT_VISIBLE_COLUMNS: DistributorColumnId[] = [
  'name',
  'product_segment',
  'distributor_type',
  'erp_id',
  'mobile',
  'credit_limit',
  'bank_guarantee',
  'delivery_depot',
  'unit',
  'status',
  'updated_at',
  'actions',
];

const DEFAULT_FORM_VALUES: DistributorFormData = {
  name: '',
  db_point_id: '',
  product_segment: ['BIS'],
  skus_exclude: [],
  distributor_type: 'General Distributor',
  erp_id: '',
  mobile: '',
  credit_limit: '0.00',
  bank_guarantee: '0.00',
  delivery_depot_id: '',
  computer: 'No',
  printer: 'No',
  proprietor: '',
  proprietor_dob: '',
  registration_date: '',
  emergency_contact: '',
  emergency_relation: '',
  emergency_mobile: '',
  unit: 'CTN',
  latitude: '',
  longitude: '',
  address: '',
  note: '',
  active: true,
};

const STORAGE_KEY_VISIBLE_COLUMNS = 'distributor:visible-columns';

const sanitizeNumericString = (value: string | number | null | undefined) => {
  if (value === null || value === undefined) {
    return '0.00';
  }

  const numericValue = Number(
    typeof value === 'string' ? value.replace(/,/g, '').trim() : value,
  );

  if (Number.isNaN(numericValue)) {
    return '0.00';
  }

  return numericValue.toFixed(2);
};

const sanitizeOptionalField = (value: string | null | undefined) => {
  if (value === null || value === undefined) {
    return '';
  }

  const trimmed = value.trim();
  return trimmed.length ? trimmed : '';
};

const formatCurrency = (value: string | number | null | undefined) => {
  const numericValue = Number(
    typeof value === 'string' ? value.replace(/,/g, '').trim() : value,
  );

  if (Number.isNaN(numericValue)) {
    return '৳0.00';
  }

  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'BDT',
    minimumFractionDigits: 2,
  }).format(numericValue);
};

const buildTerritoryLabel = (nodes: TerritoryPathNode[] | undefined) => {
  if (!nodes || !nodes.length) {
    return '—';
  }
  return nodes
    .map((node) => (typeof node.name === 'string' && node.name.trim().length ? node.name : null))
    .filter((name): name is string => Boolean(name))
    .join(' › ');
};

const extractId = (value: unknown): string => {
  if (!value) return '';
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'bigint') return String(value);
  if (typeof value === 'object') {
    const record = value as Record<string, unknown>;
    if (typeof record._id === 'string') {
      return record._id;
    }
  }
  return '';
};

const toDateInputValue = (value: string | null | undefined) => {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return '';
  }
  return date.toISOString().slice(0, 10);
};

const fetchDistributors = async (): Promise<Distributor[]> => {
  try {
    const response = await api.get('/distributors', {
      params: {
        limit: 500,
        includeInactive: true,
      },
    });

    const rawData = Array.isArray(response.data?.data) ? response.data.data : [];

    return rawData
      .map((entry) => {
        if (!entry || typeof entry !== 'object') return null;
        const record = entry as Record<string, unknown>;
        const id = extractId(record._id);
        if (!id) return null;

        return {
          _id: id,
          name: typeof record.name === 'string' ? record.name : 'Distributor',
          product_segment: Array.isArray(record.product_segment)
            ? (record.product_segment.filter((item): item is string => typeof item === 'string'))
            : [],
          territorries: Array.isArray(record.territorries)
            ? (record.territorries as TerritoryPathNode[])
            : [],
          distributor_type: typeof record.distributor_type === 'string'
            ? record.distributor_type
            : 'General Distributor',
          erp_id: typeof record.erp_id === 'number' ? record.erp_id : Number(record.erp_id ?? null) || null,
          mobile: typeof record.mobile === 'string' ? record.mobile : null,
          credit_limit: record.credit_limit ?? '0.00',
          bank_guarantee: record.bank_guarantee ?? '0.00',
          delivery_depot_id: extractId(record.delivery_depot_id ?? null),
          unit: typeof record.unit === 'string' ? record.unit : 'CTN',
          active: Boolean(record.active ?? true),
          updated_by: (record.updated_by ?? null) as DistributorUserRef | null,
          updated_at: typeof record.updated_at === 'string' ? record.updated_at : null,
          db_point_id: extractId(record.db_point_id ?? null),
          skus_exclude: Array.isArray(record.skus_exclude)
            ? (record.skus_exclude.filter((item): item is string => typeof item === 'string'))
            : [],
          computer: (record.computer === 'Yes' ? 'Yes' : 'No') as typeof BINARY_CHOICES[number],
          printer: (record.printer === 'Yes' ? 'Yes' : 'No') as typeof BINARY_CHOICES[number],
          proprietor: typeof record.proprietor === 'string' ? record.proprietor : null,
          proprietor_dob: typeof record.proprietor_dob === 'string' ? record.proprietor_dob : null,
          registration_date: typeof record.registration_date === 'string' ? record.registration_date : null,
          emergency_contact: typeof record.emergency_contact === 'string' ? record.emergency_contact : null,
          emergency_relation: typeof record.emergency_relation === 'string' ? record.emergency_relation : null,
          emergency_mobile: typeof record.emergency_mobile === 'string' ? record.emergency_mobile : null,
          latitude: typeof record.latitude === 'string' ? record.latitude : null,
          longitude: typeof record.longitude === 'string' ? record.longitude : null,
          address: typeof record.address === 'string' ? record.address : null,
          note: typeof record.note === 'string' ? record.note : null,
        } satisfies Distributor;
      })
      .filter((entry): entry is Distributor => Boolean(entry));
  } catch (error) {
    console.error('Failed to load distributors', error);
    toast.error('Failed to load distributors');
    return [];
  }
};

const fetchDbPoints = async (): Promise<TerritoryOption[]> => {
  try {
    const response = await api.get('/territories', {
      params: {
        type: 'db_point',
        limit: 200,
        includeInactive: true,
      },
    });

    const rawData = Array.isArray(response.data?.data) ? response.data.data : [];

    return rawData
      .map((territory) => {
        if (!territory || typeof territory !== 'object') return null;
        const record = territory as Record<string, unknown>;
        const value = extractId(record._id);
        if (!value) return null;

        const name = typeof record.name === 'string' ? record.name : 'Unnamed';
        const parent = record.parent_id as Record<string, unknown> | undefined;
        const parentName = parent && typeof parent.name === 'string' ? parent.name : null;
        const label = parentName ? `${name} (${parentName})` : name;

        return {
          value,
          label,
          path: label,
        } satisfies TerritoryOption;
      })
      .filter((entry): entry is TerritoryOption => Boolean(entry));
  } catch (error) {
    console.error('Failed to load DB points', error);
    toast.error('Failed to load DB points');
    return [];
  }
};

const fetchDepots = async (): Promise<DepotOption[]> => {
  try {
    const response = await api.get('/facilities/depots', {
      params: {
        limit: 200,
      },
    });

    const rawData = Array.isArray(response.data?.data) ? response.data.data : [];

    return rawData
      .map((depot) => {
        if (!depot || typeof depot !== 'object') return null;
        const record = depot as Record<string, unknown>;
        const value = extractId(record._id);
        if (!value) return null;

        const label = typeof record.name === 'string' ? record.name : 'Depot';
        return { value, label } satisfies DepotOption;
      })
      .filter((entry): entry is DepotOption => Boolean(entry));
  } catch (error) {
    console.error('Failed to load depots', error);
    toast.error('Failed to load depots');
    return [];
  }
};

const fetchProducts = async (): Promise<ProductOption[]> => {
  try {
    const response = await api.get('/products', {
      params: {
        limit: 200,
      },
    });

    const rawData = Array.isArray(response.data?.data) ? response.data.data : [];

    return rawData
      .map((product) => {
        if (!product || typeof product !== 'object') return null;
        const record = product as Record<string, unknown>;
        const value = extractId(record._id);
        if (!value) return null;

        const label = typeof record.name === 'string' ? record.name : 'Product';
        const helper = typeof record.sku === 'string' ? record.sku : undefined;
        return { value, label, helper } satisfies ProductOption;
      })
      .filter((entry): entry is ProductOption => Boolean(entry));
  } catch (error) {
    console.error('Failed to load products', error);
    toast.error('Failed to load products');
    return [];
  }
};

const filterDistributors = (
  distributors: Distributor[],
  { searchTerm, includeInactive }: { searchTerm: string; includeInactive: boolean },
) => {
  const trimmed = searchTerm.trim().toLowerCase();

  return distributors.filter((distributor) => {
    if (!includeInactive && !distributor.active) {
      return false;
    }

    if (!trimmed.length) {
      return true;
    }

    const haystack = [
      distributor.name,
      distributor.mobile ?? '',
      distributor.erp_id != null ? distributor.erp_id.toString() : '',
      distributor.distributor_type,
      distributor.product_segment.join(' '),
      buildTerritoryLabel(distributor.territorries),
    ]
      .join(' ')
      .toLowerCase();

    return haystack.includes(trimmed);
  });
};

const sortDistributors = (
  distributors: Distributor[],
  orderBy: DistributorColumnId,
  order: Order,
) => {
  const getValue = (distributor: Distributor) => {
    switch (orderBy) {
      case 'name':
        return distributor.name.toLowerCase();
      case 'product_segment':
        return distributor.product_segment.join(',').toLowerCase();
      case 'distributor_type':
        return distributor.distributor_type.toLowerCase();
      case 'erp_id':
        return distributor.erp_id ?? Number.MIN_SAFE_INTEGER;
      case 'mobile':
        return (distributor.mobile ?? '').toLowerCase();
      case 'credit_limit':
        return Number(distributor.credit_limit);
      case 'bank_guarantee':
        return Number(distributor.bank_guarantee);
      case 'delivery_depot':
        return distributor.delivery_depot_id ?? '';
      case 'unit':
        return distributor.unit.toLowerCase();
      case 'status':
        return distributor.active ? 1 : 0;
      case 'updated_by':
        return distributor.updated_by?.username?.toLowerCase() ?? '';
      case 'updated_at':
        return distributor.updated_at ?? '';
      default:
        return distributor.name.toLowerCase();
    }
  };

  const sorted = [...distributors].sort((a, b) => {
    const aValue = getValue(a);
    const bValue = getValue(b);

    if (aValue == null && bValue == null) return 0;
    if (aValue == null) return order === 'asc' ? -1 : 1;
    if (bValue == null) return order === 'asc' ? 1 : -1;

    if (typeof aValue === 'number' && typeof bValue === 'number') {
      if (aValue < bValue) return order === 'asc' ? -1 : 1;
      if (aValue > bValue) return order === 'asc' ? 1 : -1;
      return 0;
    }

    const aString = String(aValue).toLowerCase();
    const bString = String(bValue).toLowerCase();

    if (aString < bString) return order === 'asc' ? -1 : 1;
    if (aString > bString) return order === 'asc' ? 1 : -1;
    return 0;
  });

  return sorted;
};

const DistributorsPage: React.FC = () => {
  const [distributors, setDistributors] = useState<Distributor[]>([]);
  const [loading, setLoading] = useState(true);
  const [metadataLoading, setMetadataLoading] = useState(false);
  const [viewMode, setViewMode] = useState<'cards' | 'list'>('cards');
  const [searchTerm, setSearchTerm] = useState('');
  const [includeInactive, setIncludeInactive] = useState(false);
  const [openDialog, setOpenDialog] = useState(false);
  const [editingDistributor, setEditingDistributor] = useState<Distributor | null>(null);
  const [confirmDeactivateOpen, setConfirmDeactivateOpen] = useState(false);
  const [confirmRestoreOpen, setConfirmRestoreOpen] = useState(false);
  const [targetDistributor, setTargetDistributor] = useState<Distributor | null>(null);
  const [orderBy, setOrderBy] = useState<DistributorColumnId>('name');
  const [order, setOrder] = useState<Order>('asc');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [visibleColumnIds, setVisibleColumnIds] = useState<DistributorColumnId[]>(DEFAULT_VISIBLE_COLUMNS);
  const [persistedColumnIds, setPersistedColumnIds] = useState<DistributorColumnId[]>(DEFAULT_VISIBLE_COLUMNS);
  const columnStateHydratedRef = useRef(false);
  const [dbPointOptions, setDbPointOptions] = useState<TerritoryOption[]>([]);
  const [depotOptions, setDepotOptions] = useState<DepotOption[]>([]);
  const [productOptions, setProductOptions] = useState<ProductOption[]>([]);
  const [formError, setFormError] = useState<string | null>(null);

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<DistributorFormData>({
    resolver: zodResolver(distributorFormSchema),
    defaultValues: DEFAULT_FORM_VALUES,
  });

  const loadDistributors = useCallback(async () => {
    try {
      setLoading(true);
      const records = await fetchDistributors();
      setDistributors(records);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadMetadata = useCallback(async () => {
    try {
      setMetadataLoading(true);
      const [dbPoints, depots, products] = await Promise.all([
        fetchDbPoints(),
        fetchDepots(),
        fetchProducts(),
      ]);
      setDbPointOptions(dbPoints);
      setDepotOptions(depots);
      setProductOptions(products);
    } finally {
      setMetadataLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDistributors();
    loadMetadata();
  }, [loadDistributors, loadMetadata]);

  useEffect(() => {
    if (!columnStateHydratedRef.current) {
      columnStateHydratedRef.current = true;
      try {
        const stored = window.localStorage.getItem(STORAGE_KEY_VISIBLE_COLUMNS);
        if (stored) {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed)) {
            const sanitized = parsed.filter((id: unknown): id is DistributorColumnId =>
              typeof id === 'string' && DEFAULT_VISIBLE_COLUMNS.includes(id as DistributorColumnId));
            if (sanitized.length) {
              setVisibleColumnIds(sanitized);
              setPersistedColumnIds(sanitized);
              return;
            }
          }
        }
      } catch (error) {
        console.warn('Failed to load distributor column preferences', error);
      }
      setVisibleColumnIds(DEFAULT_VISIBLE_COLUMNS);
      setPersistedColumnIds(DEFAULT_VISIBLE_COLUMNS);
      return;
    }

    setVisibleColumnIds((previous) => {
      const sanitized = previous.filter((id) => DEFAULT_VISIBLE_COLUMNS.includes(id));
      return sanitized.length ? sanitized : DEFAULT_VISIBLE_COLUMNS;
    });
    setPersistedColumnIds((previous) => {
      const sanitized = previous.filter((id) => DEFAULT_VISIBLE_COLUMNS.includes(id));
      return sanitized.length ? sanitized : DEFAULT_VISIBLE_COLUMNS;
    });
  }, []);

  const columnSelectionChanged = useMemo(() => {
    if (visibleColumnIds.length !== persistedColumnIds.length) {
      return true;
    }
    const persistedSet = new Set(persistedColumnIds);
    return visibleColumnIds.some((id) => !persistedSet.has(id));
  }, [persistedColumnIds, visibleColumnIds]);

  const handleSaveColumnSelection = useCallback(() => {
    const sanitized = visibleColumnIds.filter((id) => DEFAULT_VISIBLE_COLUMNS.includes(id));
    setVisibleColumnIds(sanitized.length ? sanitized : DEFAULT_VISIBLE_COLUMNS);
    setPersistedColumnIds(sanitized.length ? sanitized : DEFAULT_VISIBLE_COLUMNS);
    try {
      window.localStorage.setItem(STORAGE_KEY_VISIBLE_COLUMNS, JSON.stringify(sanitized));
      toast.success('Column preferences saved');
    } catch (error) {
      console.warn('Failed to persist distributor column preferences', error);
      toast.error('Unable to persist column selection');
    }
  }, [visibleColumnIds]);

  const handleRequestSort = useCallback(
    (property: DistributorColumnId) => {
      const isAsc = orderBy === property && order === 'asc';
      setOrder(isAsc ? 'desc' : 'asc');
      setOrderBy(property);
      setPage(0);
    },
    [order, orderBy],
  );

  const handleChangePage = (_: unknown, newPage: number) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const handleDialogClose = useCallback(() => {
    setOpenDialog(false);
    setEditingDistributor(null);
    setFormError(null);
    reset(DEFAULT_FORM_VALUES);
  }, [reset]);

  const handleAddDistributor = useCallback(() => {
    setEditingDistributor(null);
    reset(DEFAULT_FORM_VALUES);
    setOpenDialog(true);
  }, [reset]);

  const handleEditDistributor = useCallback(
    (distributor: Distributor) => {
      setEditingDistributor(distributor);
      reset({
        name: distributor.name,
        db_point_id: distributor.db_point_id ?? '',
        product_segment: distributor.product_segment.length ? distributor.product_segment : ['BIS'],
        skus_exclude: distributor.skus_exclude ?? [],
        distributor_type: distributor.distributor_type,
        erp_id: distributor.erp_id != null ? distributor.erp_id.toString() : '',
        mobile: distributor.mobile ?? '',
        credit_limit: sanitizeNumericString(distributor.credit_limit),
        bank_guarantee: sanitizeNumericString(distributor.bank_guarantee),
        delivery_depot_id: distributor.delivery_depot_id ?? '',
        computer: distributor.computer,
        printer: distributor.printer,
        proprietor: distributor.proprietor ?? '',
        proprietor_dob: toDateInputValue(distributor.proprietor_dob),
        registration_date: toDateInputValue(distributor.registration_date),
        emergency_contact: distributor.emergency_contact ?? '',
        emergency_relation: distributor.emergency_relation ?? '',
        emergency_mobile: distributor.emergency_mobile ?? '',
        unit: distributor.unit,
        latitude: distributor.latitude ?? '',
        longitude: distributor.longitude ?? '',
        address: distributor.address ?? '',
        note: distributor.note ?? '',
        active: distributor.active,
      });
      setOpenDialog(true);
    },
    [reset],
  );

  const submitDistributor = useCallback(
    async (formValues: DistributorFormData) => {
      setFormError(null);
      const payload = {
        name: formValues.name.trim(),
        db_point_id: formValues.db_point_id || null,
        product_segment: formValues.product_segment,
        skus_exclude: formValues.skus_exclude ?? [],
        distributor_type: formValues.distributor_type,
        erp_id: formValues.erp_id ? Number(formValues.erp_id) : undefined,
        mobile: sanitizeOptionalField(formValues.mobile) || undefined,
        credit_limit: sanitizeNumericString(formValues.credit_limit),
        bank_guarantee: sanitizeNumericString(formValues.bank_guarantee),
        delivery_depot_id: formValues.delivery_depot_id || null,
        computer: formValues.computer,
        printer: formValues.printer,
        proprietor: sanitizeOptionalField(formValues.proprietor) || undefined,
        proprietor_dob: sanitizeOptionalField(formValues.proprietor_dob) || undefined,
        registration_date: sanitizeOptionalField(formValues.registration_date) || undefined,
        emergency_contact: sanitizeOptionalField(formValues.emergency_contact) || undefined,
        emergency_relation: sanitizeOptionalField(formValues.emergency_relation) || undefined,
        emergency_mobile: sanitizeOptionalField(formValues.emergency_mobile) || undefined,
        unit: formValues.unit,
        latitude: sanitizeOptionalField(formValues.latitude) || undefined,
        longitude: sanitizeOptionalField(formValues.longitude) || undefined,
        address: sanitizeOptionalField(formValues.address) || undefined,
        note: sanitizeOptionalField(formValues.note) || undefined,
        active: formValues.active,
      };

      try {
        if (editingDistributor) {
          await api.put(`/distributors/${editingDistributor._id}`, payload);
          toast.success('Distributor updated successfully');
        } else {
          await api.post('/distributors', payload);
          toast.success('Distributor created successfully');
        }
        handleDialogClose();
        await loadDistributors();
      } catch (error) {
        console.error('Failed to save distributor', error);
        const message =
          (error as { response?: { data?: { message?: string } } })?.response?.data?.message ||
          'Failed to save distributor';
        setFormError(message);
        toast.error(message);
      }
    },
    [editingDistributor, handleDialogClose, loadDistributors],
  );

  const handleDeactivateDistributor = useCallback(async () => {
    if (!targetDistributor) return;
    try {
      await api.delete(`/distributors/${targetDistributor._id}`);
      toast.success('Distributor deactivated');
      setConfirmDeactivateOpen(false);
      setTargetDistributor(null);
      await loadDistributors();
    } catch (error) {
      console.error('Failed to deactivate distributor', error);
      toast.error('Failed to deactivate distributor');
    }
  }, [loadDistributors, targetDistributor]);

  const handleRestoreDistributor = useCallback(async () => {
    if (!targetDistributor) return;
    try {
      await api.put(`/distributors/${targetDistributor._id}`, { active: true });
      toast.success('Distributor restored');
      setConfirmRestoreOpen(false);
      setTargetDistributor(null);
      await loadDistributors();
    } catch (error) {
      console.error('Failed to restore distributor', error);
      toast.error('Failed to restore distributor');
    }
  }, [loadDistributors, targetDistributor]);

  const filteredDistributors = useMemo(
    () => filterDistributors(distributors, { searchTerm, includeInactive }),
    [distributors, includeInactive, searchTerm],
  );

  const sortedDistributors = useMemo(
    () => sortDistributors(filteredDistributors, orderBy, order),
    [filteredDistributors, order, orderBy],
  );

  const paginatedDistributors = useMemo(
    () => sortedDistributors.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage),
    [page, rowsPerPage, sortedDistributors],
  );

  const fetchAllForExport = useCallback(async () => sortedDistributors, [sortedDistributors]);

  const distributorColumns = useMemo(
    () => [
      {
        id: 'name',
        label: 'Distributor',
        sortable: true,
        renderCell: (distributor: Distributor) => (
          <Box>
            <Typography variant="body1" fontWeight="medium">
              {distributor.name}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {distributor.product_segment.join(', ')}
            </Typography>
          </Box>
        ),
      },
      {
        id: 'product_segment',
        label: 'Segments',
        renderCell: (distributor: Distributor) => (
          <Stack direction="row" spacing={0.5} useFlexGap flexWrap="wrap">
            {distributor.product_segment.map((segment) => (
              <Chip key={`${distributor._id}-${segment}`} size="small" label={segment} />
            ))}
          </Stack>
        ),
      },
      {
        id: 'distributor_type',
        label: 'Type',
        sortable: true,
        renderCell: (distributor: Distributor) => distributor.distributor_type,
      },
      {
        id: 'erp_id',
        label: 'ERP ID',
        sortable: true,
        renderCell: (distributor: Distributor) => distributor.erp_id ?? '—',
      },
      {
        id: 'mobile',
        label: 'Mobile',
        sortable: true,
        renderCell: (distributor: Distributor) => distributor.mobile ?? '—',
      },
      {
        id: 'credit_limit',
        label: 'Credit Limit',
        sortable: true,
        align: 'right',
        renderCell: (distributor: Distributor) => formatCurrency(distributor.credit_limit),
      },
      {
        id: 'bank_guarantee',
        label: 'Bank Guarantee',
        align: 'right',
        renderCell: (distributor: Distributor) => formatCurrency(distributor.bank_guarantee),
      },
      {
        id: 'delivery_depot',
        label: 'Delivery Depot',
        renderCell: (distributor: Distributor) => {
          if (!distributor.delivery_depot_id) return '—';
          const depot = depotOptions.find((option) => option.value === distributor.delivery_depot_id);
          return depot ? depot.label : '—';
        },
      },
      {
        id: 'unit',
        label: 'Unit',
        sortable: true,
        renderCell: (distributor: Distributor) => distributor.unit,
      },
      {
        id: 'status',
        label: 'Status',
        sortable: true,
        renderCell: (distributor: Distributor) => (
          <Chip
            size="small"
            color={distributor.active ? 'success' : 'default'}
            label={distributor.active ? 'Active' : 'Inactive'}
          />
        ),
      },
      {
        id: 'updated_by',
        label: 'Updated By',
        renderCell: (distributor: Distributor) => distributor.updated_by?.username ?? '—',
      },
      {
        id: 'updated_at',
        label: 'Updated At',
        sortable: true,
        renderCell: (distributor: Distributor) => (distributor.updated_at ? formatDateForExport(distributor.updated_at) : '—'),
      },
      {
        id: 'actions',
        label: 'Actions',
        alwaysVisible: true,
        align: 'right',
        renderCell: (distributor: Distributor) => (
          <Box sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end' }}>
            <Tooltip title="Edit distributor">
              <IconButton size="small" color="primary" onClick={() => handleEditDistributor(distributor)}>
                <EditIcon fontSize="small" />
              </IconButton>
            </Tooltip>
            {distributor.active ? (
              <Tooltip title="Deactivate distributor">
                <IconButton
                  size="small"
                  color="error"
                  onClick={() => {
                    setTargetDistributor(distributor);
                    setConfirmDeactivateOpen(true);
                  }}
                >
                  <DeleteIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            ) : (
              <Tooltip title="Restore distributor">
                <IconButton
                  size="small"
                  color="success"
                  onClick={() => {
                    setTargetDistributor(distributor);
                    setConfirmRestoreOpen(true);
                  }}
                >
                  <RestoreIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            )}
          </Box>
        ),
      },
    ],
    [depotOptions, handleEditDistributor],
  );

  const visibleColumns = useMemo(
    () => distributorColumns.filter((column) => column.alwaysVisible || visibleColumnIds.includes(column.id)),
    [distributorColumns, visibleColumnIds],
  );

  const tableMinWidth = useMemo(
    () => calculateTableMinWidth(visibleColumns.length),
    [visibleColumns.length],
  );

  const columnVisibilityOptions = useMemo(
    () =>
      distributorColumns.map((column) => ({
        id: column.id,
        label: column.label,
        alwaysVisible: column.alwaysVisible,
      })),
    [distributorColumns],
  );

  const distributorExportColumns = useMemo<ExportColumn<Distributor>[]>(
    () => [
      { header: 'Distributor', accessor: (row) => row.name },
      { header: 'Segments', accessor: (row) => row.product_segment.join(', ') },
      { header: 'Type', accessor: (row) => row.distributor_type },
      { header: 'ERP ID', accessor: (row) => (row.erp_id == null ? '' : row.erp_id.toString()) },
      { header: 'Mobile', accessor: (row) => row.mobile ?? '' },
      { header: 'Credit Limit', accessor: (row) => sanitizeNumericString(row.credit_limit) },
      { header: 'Bank Guarantee', accessor: (row) => sanitizeNumericString(row.bank_guarantee) },
      { header: 'Unit', accessor: (row) => row.unit },
      { header: 'Status', accessor: (row) => (row.active ? 'Active' : 'Inactive') },
      { header: 'Updated By', accessor: (row) => row.updated_by?.username ?? '' },
      { header: 'Updated At', accessor: (row) => (row.updated_at ? formatDateForExport(row.updated_at) : '') },
    ],
    [],
  );

  const renderCardsView = () => (
    <>
      <Grid container spacing={2}>
        {paginatedDistributors.map((distributor) => (
          <Grid item xs={12} sm={6} md={4} key={distributor._id}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  {distributor.name}
                </Typography>
                <Stack spacing={1}>
                  <Typography variant="body2" color="text.secondary">
                    Segments: {distributor.product_segment.join(', ')}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Distributor Type: {distributor.distributor_type}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Credit Limit: {formatCurrency(distributor.credit_limit)}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Bank Guarantee: {formatCurrency(distributor.bank_guarantee)}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Status: {distributor.active ? 'Active' : 'Inactive'}
                  </Typography>
                </Stack>
              </CardContent>
              <CardActions sx={{ justifyContent: 'flex-end' }}>
                <Tooltip title="Edit distributor">
                  <IconButton size="small" color="primary" onClick={() => handleEditDistributor(distributor)}>
                    <EditIcon />
                  </IconButton>
                </Tooltip>
                {distributor.active ? (
                  <Tooltip title="Deactivate distributor">
                    <IconButton
                      size="small"
                      color="error"
                      onClick={() => {
                        setTargetDistributor(distributor);
                        setConfirmDeactivateOpen(true);
                      }}
                    >
                      <DeleteIcon />
                    </IconButton>
                  </Tooltip>
                ) : (
                  <Tooltip title="Restore distributor">
                    <IconButton
                      size="small"
                      color="success"
                      onClick={() => {
                        setTargetDistributor(distributor);
                        setConfirmRestoreOpen(true);
                      }}
                    >
                      <RestoreIcon />
                    </IconButton>
                  </Tooltip>
                )}
              </CardActions>
            </Card>
          </Grid>
        ))}
      </Grid>
      <Box sx={{ display: 'flex', justifyContent: 'center', mt: 3 }}>
        <TablePagination
          rowsPerPageOptions={[5, 10, 25, 50]}
          component="div"
          count={sortedDistributors.length}
          rowsPerPage={rowsPerPage}
          page={page}
          onPageChange={handleChangePage}
          onRowsPerPageChange={handleChangeRowsPerPage}
        />
      </Box>
    </>
  );

  const renderListView = () => (
    <TableContainer component={Paper} sx={{ overflowX: 'auto' }}>
      <Table sx={{ minWidth: tableMinWidth }}>
        <TableHead>
          <TableRow>
            {visibleColumns.map((column) => {
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
                          zIndex: 3,
                          boxShadow: (theme) => `-4px 0 8px -4px ${theme.palette.grey[300]}`,
                        }
                      : {}),
                  }}
                >
                  {column.sortable ? (
                    <TableSortLabel
                      active={orderBy === column.id}
                      direction={orderBy === column.id ? order : 'asc'}
                      onClick={() => handleRequestSort(column.id)}
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
          {paginatedDistributors.map((distributor) => (
            <TableRow key={distributor._id} hover>
              {visibleColumns.map((column) => {
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
                            zIndex: 2,
                            boxShadow: (theme) => `-4px 0 8px -4px ${theme.palette.grey[200]}`,
                          }
                        : {}),
                    }}
                  >
                    {column.renderCell(distributor)}
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
        count={sortedDistributors.length}
        rowsPerPage={rowsPerPage}
        page={page}
        onPageChange={handleChangePage}
        onRowsPerPageChange={handleChangeRowsPerPage}
      />
    </TableContainer>
  );

  return (
    <Box sx={{ p: 3 }}>
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 2,
          mb: 3,
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <StorefrontIcon color="primary" sx={{ fontSize: 36 }} />
          <Box>
            <Typography variant="h4" component="h1">
              Distributor Management
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Manage distributor master data with full parity to the brand experience.
            </Typography>
          </Box>
        </Box>
        <Button variant="contained" startIcon={<AddIcon />} onClick={handleAddDistributor}>
          Add Distributor
        </Button>
      </Box>

      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 2,
          mb: 3,
        }}
      >
        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          spacing={1.5}
          alignItems={{ xs: 'stretch', sm: 'center' }}
          sx={{ flexGrow: 1, minWidth: { xs: '100%', sm: 360 } }}
        >
          <TextField
            size="small"
            placeholder="Search distributors..."
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
            sx={{ flexGrow: 1, minWidth: { xs: '100%', sm: 320 } }}
          />

          <FormControlLabel
            control={
              <Switch
                color="primary"
                checked={includeInactive}
                onChange={(event) => setIncludeInactive(event.target.checked)}
              />
            }
            label="Include inactive"
            sx={{ m: 0 }}
          />
        </Stack>

        <Stack
          direction="row"
          spacing={1.5}
          alignItems="center"
          sx={{ flexWrap: 'wrap', justifyContent: { xs: 'flex-start', md: 'flex-end' } }}
        >
          <ExportMenu
            title="Distributor Report"
            fileBaseName="distributors"
            currentRows={paginatedDistributors}
            columns={distributorExportColumns}
            onFetchAll={fetchAllForExport}
            disabled={loading || distributors.length === 0}
          />

          <ColumnVisibilityMenu
            options={columnVisibilityOptions}
            selected={visibleColumnIds}
            onChange={(next) => setVisibleColumnIds(next as DistributorColumnId[])}
            onSaveSelection={handleSaveColumnSelection}
            saveDisabled={!columnSelectionChanged}
            minSelectable={1}
          />

          <ToggleButtonGroup
            value={viewMode}
            exclusive
            size="small"
            onChange={(_, nextViewMode) => {
              if (nextViewMode !== null) {
                setViewMode(nextViewMode);
              }
            }}
          >
            <ToggleButton value="cards" aria-label="Card view">
              <Tooltip title="Card view">
                <ViewModuleIcon fontSize="small" />
              </Tooltip>
            </ToggleButton>
            <ToggleButton value="list" aria-label="List view">
              <Tooltip title="List view">
                <ViewListIcon fontSize="small" />
              </Tooltip>
            </ToggleButton>
          </ToggleButtonGroup>
        </Stack>
      </Box>

      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Showing {filteredDistributors.length} of {distributors.length} distributors
      </Typography>

      {loading ? (
        <Grid container spacing={2}>
          {Array.from({ length: 6 }).map((_, index) => (
            <Grid item xs={12} sm={6} md={4} key={index}>
              <Card>
                <CardContent>
                  <Stack spacing={1}>
                    <Box sx={{ width: '60%', height: 28, bgcolor: 'grey.200', borderRadius: 1 }} />
                    <Box sx={{ width: '40%', height: 20, bgcolor: 'grey.200', borderRadius: 1 }} />
                    <Box sx={{ width: '80%', height: 18, bgcolor: 'grey.200', borderRadius: 1 }} />
                  </Stack>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      ) : sortedDistributors.length === 0 ? (
        <Alert severity="info">
          {searchTerm
            ? `No distributors match "${searchTerm}". Adjust your search criteria.`
            : 'No distributors found. Add a distributor to get started.'}
        </Alert>
      ) : viewMode === 'cards' ? (
        renderCardsView()
      ) : (
        renderListView()
      )}

      <Dialog open={openDialog} onClose={handleDialogClose} maxWidth="md" fullWidth>
        <DialogTitle>{editingDistributor ? 'Edit Distributor' : 'Add Distributor'}</DialogTitle>
        <form onSubmit={handleSubmit(submitDistributor)}>
          <DialogContent dividers>
            <Stack spacing={3}>
              {metadataLoading && (
                <Alert severity="info">
                  Syncing supporting data. Dropdown options will refresh shortly.
                </Alert>
              )}
              {formError && (
                <Alert severity="error" onClose={() => setFormError(null)}>
                  {formError}
                </Alert>
              )}
              <Box
                sx={{
                  display: 'grid',
                  gridTemplateColumns: {
                    xs: 'repeat(1, minmax(0, 1fr))',
                    sm: 'repeat(2, minmax(0, 1fr))',
                    md: 'repeat(3, minmax(0, 1fr))',
                  },
                  gap: 2,
                }}
              >
                <Box sx={{ minWidth: 0 }}>
                  <Controller
                    name="name"
                    control={control}
                    render={({ field }) => (
                      <TextField
                        {...field}
                        label="Distributor Name"
                        fullWidth
                        required
                        error={Boolean(errors.name)}
                        helperText={errors.name?.message}
                      />
                    )}
                  />
                </Box>
                <Box sx={{ minWidth: 0 }}>
                  <FormControl fullWidth error={Boolean(errors.db_point_id)}>
                    <InputLabel id="db-point-label">DB Point</InputLabel>
                    <Controller
                      name="db_point_id"
                      control={control}
                      render={({ field }) => (
                        <Select
                          {...field}
                          labelId="db-point-label"
                          label="DB Point"
                          value={field.value ?? ''}
                          onChange={(event: SelectChangeEvent<string>) => field.onChange(event.target.value)}
                        >
                          <MenuItem value="">
                            <em>None</em>
                          </MenuItem>
                          {dbPointOptions.map((option) => (
                            <MenuItem key={option.value} value={option.value}>
                              {option.label}
                            </MenuItem>
                          ))}
                        </Select>
                      )}
                    />
                    <FormHelperText>{errors.db_point_id?.message}</FormHelperText>
                  </FormControl>
                </Box>
                <Box sx={{ minWidth: 0 }}>
                  <FormControl fullWidth error={Boolean(errors.product_segment)}>
                    <InputLabel id="segments-label">Product Segments</InputLabel>
                    <Controller
                      name="product_segment"
                      control={control}
                      render={({ field }) => (
                        <Select
                          {...field}
                          labelId="segments-label"
                          label="Product Segments"
                          multiple
                          value={field.value ?? []}
                          onChange={(event) =>
                            field.onChange(
                              typeof event.target.value === 'string'
                                ? event.target.value.split(',')
                                : event.target.value,
                            )
                          }
                          renderValue={(selected) => (selected as string[]).join(', ')}
                        >
                          {PRODUCT_SEGMENTS.map((segment) => (
                            <MenuItem key={segment} value={segment}>
                              {segment}
                            </MenuItem>
                          ))}
                        </Select>
                      )}
                    />
                    <FormHelperText>{errors.product_segment?.message}</FormHelperText>
                  </FormControl>
                </Box>
                <Box sx={{ minWidth: 0 }}>
                  <FormControl fullWidth error={Boolean(errors.skus_exclude)}>
                    <InputLabel id="skus-label">Exclude SKUs</InputLabel>
                    <Controller
                      name="skus_exclude"
                      control={control}
                      render={({ field }) => (
                        <Select
                          {...field}
                          labelId="skus-label"
                          label="Exclude SKUs"
                          multiple
                          value={field.value ?? []}
                          onChange={(event) =>
                            field.onChange(
                              typeof event.target.value === 'string'
                                ? event.target.value.split(',')
                                : event.target.value,
                            )
                          }
                          renderValue={(selected) =>
                            (selected as string[]).length
                              ? `${(selected as string[]).length} selected`
                              : 'None'
                          }
                        >
                          {productOptions.map((product) => (
                            <MenuItem key={product.value} value={product.value}>
                              <Box>
                                <Typography variant="body2">{product.label}</Typography>
                                {product.helper && (
                                  <Typography variant="caption" color="text.secondary">
                                    SKU: {product.helper}
                                  </Typography>
                                )}
                              </Box>
                            </MenuItem>
                          ))}
                        </Select>
                      )}
                    />
                    <FormHelperText>{errors.skus_exclude?.message}</FormHelperText>
                  </FormControl>
                </Box>
                <Box sx={{ minWidth: 0 }}>
                  <FormControl fullWidth error={Boolean(errors.distributor_type)}>
                    <InputLabel id="type-label">Distributor Type</InputLabel>
                    <Controller
                      name="distributor_type"
                      control={control}
                      render={({ field }) => (
                        <Select
                          {...field}
                          labelId="type-label"
                          label="Distributor Type"
                          value={field.value}
                          onChange={(event: SelectChangeEvent<string>) => field.onChange(event.target.value)}
                        >
                          {DISTRIBUTOR_TYPES.map((type) => (
                            <MenuItem key={type} value={type}>
                              {type}
                            </MenuItem>
                          ))}
                        </Select>
                      )}
                    />
                    <FormHelperText>{errors.distributor_type?.message}</FormHelperText>
                  </FormControl>
                </Box>
                <Box sx={{ minWidth: 0 }}>
                  <Controller
                    name="erp_id"
                    control={control}
                    render={({ field }) => (
                      <TextField
                        {...field}
                        label="ERP ID"
                        fullWidth
                        error={Boolean(errors.erp_id)}
                        helperText={errors.erp_id?.message}
                        inputMode="numeric"
                      />
                    )}
                  />
                </Box>
                <Box sx={{ minWidth: 0 }}>
                  <Controller
                    name="mobile"
                    control={control}
                    render={({ field }) => (
                      <TextField
                        {...field}
                        label="Mobile"
                        fullWidth
                        placeholder="+8801XXXXXX"
                        error={Boolean(errors.mobile)}
                        helperText={errors.mobile?.message}
                      />
                    )}
                  />
                </Box>
                <Box sx={{ minWidth: 0 }}>
                  <Controller
                    name="credit_limit"
                    control={control}
                    render={({ field }) => (
                      <TextField
                        {...field}
                        label="Credit Limit"
                        fullWidth
                        inputMode="decimal"
                        error={Boolean(errors.credit_limit)}
                        helperText={errors.credit_limit?.message}
                      />
                    )}
                  />
                </Box>
                <Box sx={{ minWidth: 0 }}>
                  <Controller
                    name="bank_guarantee"
                    control={control}
                    render={({ field }) => (
                      <TextField
                        {...field}
                        label="Bank Guarantee"
                        fullWidth
                        inputMode="decimal"
                        error={Boolean(errors.bank_guarantee)}
                        helperText={errors.bank_guarantee?.message}
                      />
                    )}
                  />
                </Box>
                <Box sx={{ minWidth: 0 }}>
                  <FormControl fullWidth>
                    <InputLabel id="depot-label">Delivery Depot</InputLabel>
                    <Controller
                      name="delivery_depot_id"
                      control={control}
                      render={({ field }) => (
                        <Select
                          {...field}
                          labelId="depot-label"
                          label="Delivery Depot"
                          value={field.value ?? ''}
                          onChange={(event: SelectChangeEvent<string>) => field.onChange(event.target.value)}
                        >
                          <MenuItem value="">
                            <em>None</em>
                          </MenuItem>
                          {depotOptions.map((option) => (
                            <MenuItem key={option.value} value={option.value}>
                              {option.label}
                            </MenuItem>
                          ))}
                        </Select>
                      )}
                    />
                  </FormControl>
                </Box>
                <Box sx={{ minWidth: 0 }}>
                  <FormControl fullWidth>
                    <InputLabel id="computer-label">Computer</InputLabel>
                    <Controller
                      name="computer"
                      control={control}
                      render={({ field }) => (
                        <Select {...field} labelId="computer-label" label="Computer">
                          {BINARY_CHOICES.map((choice) => (
                            <MenuItem key={choice} value={choice}>
                              {choice}
                            </MenuItem>
                          ))}
                        </Select>
                      )}
                    />
                  </FormControl>
                </Box>
                <Box sx={{ minWidth: 0 }}>
                  <FormControl fullWidth>
                    <InputLabel id="printer-label">Printer</InputLabel>
                    <Controller
                      name="printer"
                      control={control}
                      render={({ field }) => (
                        <Select {...field} labelId="printer-label" label="Printer">
                          {BINARY_CHOICES.map((choice) => (
                            <MenuItem key={choice} value={choice}>
                              {choice}
                            </MenuItem>
                          ))}
                        </Select>
                      )}
                    />
                  </FormControl>
                </Box>
                <Box sx={{ minWidth: 0 }}>
                  <Controller
                    name="proprietor"
                    control={control}
                    render={({ field }) => (
                      <TextField
                        {...field}
                        label="Proprietor"
                        fullWidth
                        error={Boolean(errors.proprietor)}
                        helperText={errors.proprietor?.message}
                      />
                    )}
                  />
                </Box>
                <Box sx={{ minWidth: 0 }}>
                  <Controller
                    name="proprietor_dob"
                    control={control}
                    render={({ field }) => (
                      <TextField
                        {...field}
                        type="date"
                        label="Proprietor DOB"
                        fullWidth
                        InputLabelProps={{ shrink: true }}
                        error={Boolean(errors.proprietor_dob)}
                        helperText={errors.proprietor_dob?.message}
                      />
                    )}
                  />
                </Box>
                <Box sx={{ minWidth: 0 }}>
                  <Controller
                    name="registration_date"
                    control={control}
                    render={({ field }) => (
                      <TextField
                        {...field}
                        type="date"
                        label="Registration Date"
                        fullWidth
                        InputLabelProps={{ shrink: true }}
                        error={Boolean(errors.registration_date)}
                        helperText={errors.registration_date?.message}
                      />
                    )}
                  />
                </Box>
                <Box sx={{ minWidth: 0 }}>
                  <Controller
                    name="emergency_contact"
                    control={control}
                    render={({ field }) => (
                      <TextField
                        {...field}
                        label="Emergency Contact"
                        fullWidth
                        error={Boolean(errors.emergency_contact)}
                        helperText={errors.emergency_contact?.message}
                      />
                    )}
                  />
                </Box>
                <Box sx={{ minWidth: 0 }}>
                  <Controller
                    name="emergency_relation"
                    control={control}
                    render={({ field }) => (
                      <TextField
                        {...field}
                        label="Emergency Relation"
                        fullWidth
                        error={Boolean(errors.emergency_relation)}
                        helperText={errors.emergency_relation?.message}
                      />
                    )}
                  />
                </Box>
                <Box sx={{ minWidth: 0 }}>
                  <Controller
                    name="emergency_mobile"
                    control={control}
                    render={({ field }) => (
                      <TextField
                        {...field}
                        label="Emergency Mobile"
                        fullWidth
                        placeholder="+8801XXXXXX"
                        inputMode="tel"
                        error={Boolean(errors.emergency_mobile)}
                        helperText={errors.emergency_mobile?.message}
                      />
                    )}
                  />
                </Box>
                <Box sx={{ minWidth: 0 }}>
                  <FormControl fullWidth error={Boolean(errors.unit)}>
                    <InputLabel id="unit-label">Unit</InputLabel>
                    <Controller
                      name="unit"
                      control={control}
                      render={({ field }) => (
                        <Select {...field} labelId="unit-label" label="Unit">
                          {ORDER_UNITS.map((unit) => (
                            <MenuItem key={unit} value={unit}>
                              {unit}
                            </MenuItem>
                          ))}
                        </Select>
                      )}
                    />
                    <FormHelperText>{errors.unit?.message}</FormHelperText>
                  </FormControl>
                </Box>
                <Box sx={{ minWidth: 0 }}>
                  <Controller
                    name="latitude"
                    control={control}
                    render={({ field }) => (
                      <TextField
                        {...field}
                        label="Latitude"
                        fullWidth
                        inputMode="decimal"
                        error={Boolean(errors.latitude)}
                        helperText={errors.latitude?.message}
                      />
                    )}
                  />
                </Box>
                <Box sx={{ minWidth: 0 }}>
                  <Controller
                    name="longitude"
                    control={control}
                    render={({ field }) => (
                      <TextField
                        {...field}
                        label="Longitude"
                        fullWidth
                        inputMode="decimal"
                        error={Boolean(errors.longitude)}
                        helperText={errors.longitude?.message}
                      />
                    )}
                  />
                </Box>
                <Box
                  sx={{
                    minWidth: 0,
                    gridColumn: {
                      sm: 'span 2',
                      md: 'span 3',
                    },
                  }}
                >
                  <Controller
                    name="address"
                    control={control}
                    render={({ field }) => (
                      <TextField
                        {...field}
                        label="Address"
                        fullWidth
                        multiline
                        minRows={2}
                        error={Boolean(errors.address)}
                        helperText={errors.address?.message}
                      />
                    )}
                  />
                </Box>
                <Box
                  sx={{
                    minWidth: 0,
                    gridColumn: {
                      sm: 'span 2',
                      md: 'span 3',
                    },
                  }}
                >
                  <Controller
                    name="note"
                    control={control}
                    render={({ field }) => (
                      <TextField
                        {...field}
                        label="Note"
                        fullWidth
                        multiline
                        minRows={2}
                        error={Boolean(errors.note)}
                        helperText={errors.note?.message}
                      />
                    )}
                  />
                </Box>
                <Box
                  sx={{
                    minWidth: 0,
                    gridColumn: {
                      sm: 'span 2',
                      md: 'span 3',
                    },
                    display: 'flex',
                    alignItems: 'center',
                  }}
                >
                  <Controller
                    name="active"
                    control={control}
                    render={({ field }) => (
                      <FormControlLabel
                        control={
                          <Switch
                            color="primary"
                            checked={field.value}
                            onChange={(event) => field.onChange(event.target.checked)}
                          />
                        }
                        label="Distributor is active"
                      />
                    )}
                  />
                </Box>
              </Box>
            </Stack>
          </DialogContent>
          <DialogActions sx={{ justifyContent: 'flex-end', gap: 1, flexWrap: 'wrap' }}>
            <Button onClick={handleDialogClose} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" variant="contained" disabled={isSubmitting}>
              {isSubmitting
                ? 'Saving…'
                : editingDistributor
                  ? 'Update Distributor'
                  : 'Create Distributor'}
            </Button>
          </DialogActions>
        </form>
      </Dialog>

      <Dialog
        open={confirmDeactivateOpen}
        onClose={() => {
          setConfirmDeactivateOpen(false);
          setTargetDistributor(null);
        }}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Deactivate distributor?</DialogTitle>
        <DialogContent dividers>
          <Typography>
            Are you sure you want to deactivate{' '}
            <Typography component="span" fontWeight={600}>
              {targetDistributor?.name ?? 'this distributor'}
            </Typography>
            ? They will be removed from active workflows but can be restored later.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmDeactivateOpen(false)}>Cancel</Button>
          <Button
            onClick={handleDeactivateDistributor}
            color="error"
            variant="contained"
            disabled={!targetDistributor}
          >
            Deactivate
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={confirmRestoreOpen}
        onClose={() => {
          setConfirmRestoreOpen(false);
          setTargetDistributor(null);
        }}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Restore distributor?</DialogTitle>
        <DialogContent dividers>
          <Typography>
            Restore{' '}
            <Typography component="span" fontWeight={600}>
              {targetDistributor?.name ?? 'this distributor'}
            </Typography>{' '}
            to the active roster?
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmRestoreOpen(false)}>Cancel</Button>
          <Button
            onClick={handleRestoreDistributor}
            color="primary"
            variant="contained"
            disabled={!targetDistributor}
          >
            Restore
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default DistributorsPage;