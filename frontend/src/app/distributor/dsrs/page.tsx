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
import PersonIcon from '@mui/icons-material/Person';
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
import { useAuth } from '@/contexts/AuthContext';

const GENDER_OPTIONS = ['male', 'female', 'other'] as const;
const BLOOD_GROUP_OPTIONS = ['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-'] as const;

type Order = 'asc' | 'desc';

type DSRColumnId =
  | 'dsr_code'
  | 'name'
  | 'distributor'
  | 'mobile'
  | 'employment_status'
  | 'user_account'
  | 'status'
  | 'created_at'
  | 'actions';

interface DistributorRef {
  _id: string;
  name: string;
  erp_id?: number | string | null;
}

interface UserRef {
  _id: string;
  username: string;
  active: boolean;
}

interface DSR {
  _id: string;
  dsr_code: string;
  name: string;
  distributor_id: DistributorRef;
  mobile: string;
  email?: string | null;
  nid_number?: string | null;
  date_of_birth?: string | null;
  gender?: string | null;
  blood_group?: string | null;
  present_address?: {
    street?: string;
    city?: string;
    district?: string;
    postal_code?: string;
  };
  permanent_address?: {
    street?: string;
    city?: string;
    district?: string;
    postal_code?: string;
  };
  joining_date?: string | null;
  employment_status: string;
  emergency_contact_name?: string | null;
  emergency_contact_relation?: string | null;
  emergency_contact_mobile?: string | null;
  assigned_areas?: string[];
  notes?: string | null;
  user_id?: UserRef | null;
  active: boolean;
  created_at: string;
  updated_at?: string;
}

interface DistributorOption {
  value: string;
  label: string;
  code: string;
}

const dsrFormSchema = z
  .object({
    name: z.string().trim().min(1, 'Name is required').min(2, 'Name must be at least 2 characters'),
    distributor_id: z.string().trim().min(1, 'Distributor is required'),
    mobile: z
      .string()
      .trim()
      .min(1, 'Mobile is required')
      .regex(/^(\+88)?01[3-9]\d{8}$/, 'Invalid mobile number format (e.g., 01XXXXXXXXX)'),
    email: z.string().email('Invalid email address').optional().or(z.literal('')),
    nid_number: z.string().trim().min(1, 'NID number is required'),
    date_of_birth: z.string().optional(),
    gender: z.enum(['male', 'female', 'other'], {
      errorMap: () => ({ message: 'Gender is required' }),
    }),
    blood_group: z.string().min(1, 'Blood group is required'),
    present_address_street: z.string().optional(),
    present_address_city: z.string().optional(),
    present_address_district: z.string().optional(),
    present_address_postal_code: z.string().optional(),
    permanent_address_street: z.string().optional(),
    permanent_address_city: z.string().optional(),
    permanent_address_district: z.string().optional(),
    permanent_address_postal_code: z.string().optional(),
    joining_date: z.string().optional(),
    emergency_contact_name: z.string().optional(),
    emergency_contact_relation: z.string().optional(),
    emergency_contact_mobile: z
      .string()
      .optional()
      .or(z.literal(''))
      .refine(
        (val) => !val || /^(\+88)?01[3-9]\d{8}$/.test(val),
        'Invalid mobile number format (e.g., 01XXXXXXXXX)'
      ),
    notes: z.string().optional(),
    active: z.boolean(),
    create_user_account: z.boolean().optional(),
    username: z.string().optional(),
    password: z.string().optional(),
  })
  .refine(
    (data) => !data.create_user_account || (data.username && data.username.trim().length >= 3),
    {
      message: 'Username is required and must be at least 3 characters when creating user account',
      path: ['username'],
    }
  )
  .refine(
    (data) => !data.create_user_account || (data.password && data.password.length >= 6),
    {
      message: 'Password is required and must be at least 6 characters when creating user account',
      path: ['password'],
    }
  );

type DSRFormData = z.infer<typeof dsrFormSchema>;

const DEFAULT_VISIBLE_COLUMNS: DSRColumnId[] = [
  'dsr_code',
  'name',
  'distributor',
  'mobile',
  'employment_status',
  'user_account',
  'status',
  'actions',
];

const DEFAULT_FORM_VALUES: DSRFormData = {
  name: '',
  distributor_id: '',
  mobile: '',
  email: '',
  nid_number: '',
  date_of_birth: '',
  gender: '' as any,
  blood_group: '',
  present_address_street: '',
  present_address_city: '',
  present_address_district: '',
  present_address_postal_code: '',
  permanent_address_street: '',
  permanent_address_city: '',
  permanent_address_district: '',
  permanent_address_postal_code: '',
  joining_date: '',
  emergency_contact_name: '',
  emergency_contact_relation: '',
  emergency_contact_mobile: '',
  notes: '',
  active: true,
  create_user_account: false,
  username: '',
  password: '',
};

const STORAGE_KEY_VISIBLE_COLUMNS = 'dsr:visible-columns';

const sanitizeOptionalField = (value: string | null | undefined) => {
  if (value === null || value === undefined) {
    return '';
  }
  const trimmed = value.trim();
  return trimmed.length ? trimmed : '';
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

const fetchDSRs = async (): Promise<DSR[]> => {
  try {
    const response = await api.get('/dsrs', {
      params: {
        limit: 500,
      },
    });

    const rawData = Array.isArray(response.data?.data) ? response.data.data : [];

    return rawData
      .map((entry: unknown) => {
        if (!entry || typeof entry !== 'object') return null;
        const record = entry as Record<string, unknown>;
        const id = extractId(record._id);
        if (!id) return null;

        return {
          _id: id,
          dsr_code: typeof record.dsr_code === 'string' ? record.dsr_code : '',
          name: typeof record.name === 'string' ? record.name : 'DSR',
          distributor_id: (record.distributor_id ?? {}) as DistributorRef,
          mobile: typeof record.mobile === 'string' ? record.mobile : '',
          email: typeof record.email === 'string' ? record.email : null,
          nid_number: typeof record.nid_number === 'string' ? record.nid_number : null,
          date_of_birth: typeof record.date_of_birth === 'string' ? record.date_of_birth : null,
          gender: typeof record.gender === 'string' ? record.gender : null,
          blood_group: typeof record.blood_group === 'string' ? record.blood_group : null,
          present_address: (record.present_address ?? {}) as DSR['present_address'],
          permanent_address: (record.permanent_address ?? {}) as DSR['permanent_address'],
          joining_date: typeof record.joining_date === 'string' ? record.joining_date : null,
          employment_status: typeof record.employment_status === 'string' ? record.employment_status : 'active',
          emergency_contact_name: typeof record.emergency_contact_name === 'string' ? record.emergency_contact_name : null,
          emergency_contact_relation: typeof record.emergency_contact_relation === 'string' ? record.emergency_contact_relation : null,
          emergency_contact_mobile: typeof record.emergency_contact_mobile === 'string' ? record.emergency_contact_mobile : null,
          assigned_areas: Array.isArray(record.assigned_areas) ? record.assigned_areas : [],
          notes: typeof record.notes === 'string' ? record.notes : null,
          user_id: (record.user_id ?? null) as UserRef | null,
          active: Boolean(record.active ?? true),
          created_at: typeof record.created_at === 'string' ? record.created_at : new Date().toISOString(),
          updated_at: typeof record.updated_at === 'string' ? record.updated_at : undefined,
        } satisfies DSR;
      })
      .filter((entry): entry is DSR => Boolean(entry));
  } catch (error) {
    console.error('Failed to load DSRs', error);
    toast.error('Failed to load DSRs');
    return [];
  }
};

const fetchDistributors = async (): Promise<DistributorOption[]> => {
  try {
    const response = await api.get('/distributors', {
      params: {
        limit: 500,
        active: true,
      },
    });

    const rawData = Array.isArray(response.data?.data) ? response.data.data : [];

    return rawData
      .map((distributor) => {
        if (!distributor || typeof distributor !== 'object') return null;
        const record = distributor as Record<string, unknown>;
        const value = extractId(record._id);
        if (!value) return null;

        const label = typeof record.name === 'string' ? record.name : 'Distributor';
        const code = typeof record.erp_id === 'string' ? record.erp_id : (typeof record.erp_id === 'number' ? String(record.erp_id) : '');
        return { value, label, code } satisfies DistributorOption;
      })
      .filter((entry): entry is DistributorOption => Boolean(entry));
  } catch (error) {
    console.error('Failed to load distributors', error);
    toast.error('Failed to load distributors');
    return [];
  }
};

const filterDSRs = (
  dsrs: DSR[],
  { searchTerm, includeInactive }: { searchTerm: string; includeInactive: boolean },
) => {
  const trimmed = searchTerm.trim().toLowerCase();

  return dsrs.filter((dsr) => {
    if (!includeInactive && !dsr.active) {
      return false;
    }

    if (!trimmed.length) {
      return true;
    }

    const haystack = [
      dsr.name,
      dsr.dsr_code,
      dsr.mobile,
      dsr.distributor_id.name ?? '',
      String(dsr.distributor_id.erp_id ?? ''),
      dsr.email ?? '',
    ]
      .join(' ')
      .toLowerCase();

    return haystack.includes(trimmed);
  });
};

const sortDSRs = (dsrs: DSR[], orderBy: DSRColumnId, order: Order) => {
  const getValue = (dsr: DSR) => {
    switch (orderBy) {
      case 'dsr_code':
        return dsr.dsr_code.toLowerCase();
      case 'name':
        return dsr.name.toLowerCase();
      case 'distributor':
        return dsr.distributor_id.name.toLowerCase();
      case 'mobile':
        return dsr.mobile.toLowerCase();
      case 'employment_status':
        return dsr.employment_status.toLowerCase();
      case 'user_account':
        return dsr.user_id ? 1 : 0;
      case 'status':
        return dsr.active ? 1 : 0;
      case 'created_at':
        return dsr.created_at;
      default:
        return dsr.name.toLowerCase();
    }
  };

  const sorted = [...dsrs].sort((a, b) => {
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

const DSRsPage: React.FC = () => {
  const { user } = useAuth();
  const [dsrs, setDsrs] = useState<DSR[]>([]);
  const [loading, setLoading] = useState(true);
  const [metadataLoading, setMetadataLoading] = useState(false);
  const [viewMode, setViewMode] = useState<'cards' | 'list'>('cards');
  const [searchTerm, setSearchTerm] = useState('');
  const [includeInactive, setIncludeInactive] = useState(false);
  const [openDialog, setOpenDialog] = useState(false);
  const [editingDSR, setEditingDSR] = useState<DSR | null>(null);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const [confirmRestoreOpen, setConfirmRestoreOpen] = useState(false);
  const [targetDSR, setTargetDSR] = useState<DSR | null>(null);
  const [orderBy, setOrderBy] = useState<DSRColumnId>('name');
  const [order, setOrder] = useState<Order>('asc');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  // Check if user is a distributor (not admin)
  const isDistributorUser = user?.role?.role === 'Distributor';
  const userDistributorId = user?.distributor_id;

  // Filter default columns for distributor users (hide 'distributor' column)
  const defaultColumns = useMemo(
    () => (isDistributorUser ? DEFAULT_VISIBLE_COLUMNS.filter((col) => col !== 'distributor') : DEFAULT_VISIBLE_COLUMNS),
    [isDistributorUser],
  );

  const [visibleColumnIds, setVisibleColumnIds] = useState<DSRColumnId[]>(defaultColumns);
  const [persistedColumnIds, setPersistedColumnIds] = useState<DSRColumnId[]>(defaultColumns);
  const columnStateHydratedRef = useRef(false);
  const [distributorOptions, setDistributorOptions] = useState<DistributorOption[]>([]);
  const [formError, setFormError] = useState<string | null>(null);

  const {
    control,
    handleSubmit,
    reset,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<DSRFormData>({
    resolver: zodResolver(dsrFormSchema),
    defaultValues: DEFAULT_FORM_VALUES,
  });

  const createUserAccount = watch('create_user_account');
  const isEditMode = Boolean(editingDSR);

  const loadDSRs = useCallback(async () => {
    try {
      setLoading(true);
      const records = await fetchDSRs();
      setDsrs(records);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadMetadata = useCallback(async () => {
    try {
      setMetadataLoading(true);
      const distributors = await fetchDistributors();
      setDistributorOptions(distributors);
    } finally {
      setMetadataLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDSRs();
    loadMetadata();
  }, [loadDSRs, loadMetadata]);

  useEffect(() => {
    if (!columnStateHydratedRef.current) {
      columnStateHydratedRef.current = true;
      try {
        const stored = window.localStorage.getItem(STORAGE_KEY_VISIBLE_COLUMNS);
        if (stored) {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed)) {
            // Filter stored columns to only include those allowed for current user role
            const sanitized = parsed.filter((id: unknown): id is DSRColumnId =>
              typeof id === 'string' && defaultColumns.includes(id as DSRColumnId));
            if (sanitized.length) {
              setVisibleColumnIds(sanitized);
              setPersistedColumnIds(sanitized);
              return;
            }
          }
        }
      } catch (error) {
        console.warn('Failed to load DSR column preferences', error);
      }
      setVisibleColumnIds(defaultColumns);
      setPersistedColumnIds(defaultColumns);
      return;
    }

    setVisibleColumnIds((previous) => {
      const sanitized = previous.filter((id) => defaultColumns.includes(id));
      return sanitized.length ? sanitized : defaultColumns;
    });
    setPersistedColumnIds((previous) => {
      const sanitized = previous.filter((id) => defaultColumns.includes(id));
      return sanitized.length ? sanitized : defaultColumns;
    });
  }, [defaultColumns]);

  const columnSelectionChanged = useMemo(() => {
    if (visibleColumnIds.length !== persistedColumnIds.length) {
      return true;
    }
    const persistedSet = new Set(persistedColumnIds);
    return visibleColumnIds.some((id) => !persistedSet.has(id));
  }, [persistedColumnIds, visibleColumnIds]);

  const handleSaveColumnSelection = useCallback(() => {
    const sanitized = visibleColumnIds.filter((id) => defaultColumns.includes(id));
    setVisibleColumnIds(sanitized.length ? sanitized : defaultColumns);
    setPersistedColumnIds(sanitized.length ? sanitized : defaultColumns);
    try {
      window.localStorage.setItem(STORAGE_KEY_VISIBLE_COLUMNS, JSON.stringify(sanitized));
      toast.success('Column preferences saved');
    } catch (error) {
      console.warn('Failed to persist DSR column preferences', error);
      toast.error('Unable to persist column selection');
    }
  }, [visibleColumnIds, defaultColumns]);

  const handleRequestSort = useCallback(
    (property: DSRColumnId) => {
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
    setEditingDSR(null);
    setFormError(null);
    reset(DEFAULT_FORM_VALUES);
  }, [reset]);

  const handleAddDSR = useCallback(() => {
    setEditingDSR(null);
    const initialValues = { ...DEFAULT_FORM_VALUES };
    
    // If user is a distributor, pre-populate their distributor ID
    if (isDistributorUser && userDistributorId) {
      initialValues.distributor_id = userDistributorId;
    }
    
    reset(initialValues);
    setOpenDialog(true);
  }, [reset, isDistributorUser, userDistributorId]);

  const handleEditDSR = useCallback(
    (dsr: DSR) => {
      setEditingDSR(dsr);
      reset({
        name: dsr.name,
        distributor_id: dsr.distributor_id._id,
        mobile: dsr.mobile,
        email: dsr.email ?? '',
        nid_number: dsr.nid_number ?? '',
        date_of_birth: toDateInputValue(dsr.date_of_birth),
        gender: (dsr.gender ?? '') as DSRFormData['gender'],
        blood_group: dsr.blood_group ?? '',
        present_address_street: dsr.present_address?.street ?? '',
        present_address_city: dsr.present_address?.city ?? '',
        present_address_district: dsr.present_address?.district ?? '',
        present_address_postal_code: dsr.present_address?.postal_code ?? '',
        permanent_address_street: dsr.permanent_address?.street ?? '',
        permanent_address_city: dsr.permanent_address?.city ?? '',
        permanent_address_district: dsr.permanent_address?.district ?? '',
        permanent_address_postal_code: dsr.permanent_address?.postal_code ?? '',
        joining_date: toDateInputValue(dsr.joining_date),
        emergency_contact_name: dsr.emergency_contact_name ?? '',
        emergency_contact_relation: dsr.emergency_contact_relation ?? '',
        emergency_contact_mobile: dsr.emergency_contact_mobile ?? '',
        notes: dsr.notes ?? '',
        active: dsr.active,
        create_user_account: false,
        username: '',
        password: '',
      });
      setOpenDialog(true);
    },
    [reset],
  );

  const submitDSR = useCallback(
    async (formValues: DSRFormData) => {
      setFormError(null);
      const payload = {
        name: formValues.name.trim(),
        distributor_id: formValues.distributor_id,
        mobile: formValues.mobile.trim(),
        email: sanitizeOptionalField(formValues.email) || undefined,
        nid_number: sanitizeOptionalField(formValues.nid_number) || undefined,
        date_of_birth: sanitizeOptionalField(formValues.date_of_birth) || undefined,
        gender: sanitizeOptionalField(formValues.gender) || undefined,
        blood_group: sanitizeOptionalField(formValues.blood_group) || undefined,
        present_address: {
          street: sanitizeOptionalField(formValues.present_address_street) || undefined,
          city: sanitizeOptionalField(formValues.present_address_city) || undefined,
          district: sanitizeOptionalField(formValues.present_address_district) || undefined,
          postal_code: sanitizeOptionalField(formValues.present_address_postal_code) || undefined,
        },
        permanent_address: {
          street: sanitizeOptionalField(formValues.permanent_address_street) || undefined,
          city: sanitizeOptionalField(formValues.permanent_address_city) || undefined,
          district: sanitizeOptionalField(formValues.permanent_address_district) || undefined,
          postal_code: sanitizeOptionalField(formValues.permanent_address_postal_code) || undefined,
        },
        joining_date: sanitizeOptionalField(formValues.joining_date) || undefined,
        emergency_contact_name: sanitizeOptionalField(formValues.emergency_contact_name) || undefined,
        emergency_contact_relation: sanitizeOptionalField(formValues.emergency_contact_relation) || undefined,
        emergency_contact_mobile: sanitizeOptionalField(formValues.emergency_contact_mobile) || undefined,
        notes: sanitizeOptionalField(formValues.notes) || undefined,
        active: formValues.active,
        create_user_account: !isEditMode && formValues.create_user_account,
        username: !isEditMode && formValues.create_user_account ? formValues.username : undefined,
        password: !isEditMode && formValues.create_user_account ? formValues.password : undefined,
      };

      try {
        if (editingDSR) {
          await api.put(`/dsrs/${editingDSR._id}`, payload);
          toast.success('DSR updated successfully');
        } else {
          await api.post('/dsrs', payload);
          toast.success('DSR created successfully');
        }
        handleDialogClose();
        await loadDSRs();
      } catch (error) {
        console.error('Failed to save DSR', error);
        const message =
          (error as { response?: { data?: { message?: string } } })?.response?.data?.message ||
          'Failed to save DSR';
        setFormError(message);
        toast.error(message);
      }
    },
    [editingDSR, handleDialogClose, isEditMode, loadDSRs],
  );

  const handleDeleteDSR = useCallback(async () => {
    if (!targetDSR) return;
    try {
      await api.delete(`/dsrs/${targetDSR._id}`);
      toast.success('DSR deleted');
      setConfirmDeleteOpen(false);
      setTargetDSR(null);
      await loadDSRs();
    } catch (error) {
      console.error('Failed to delete DSR', error);
      toast.error('Failed to delete DSR');
    }
  }, [loadDSRs, targetDSR]);

  const handleRestoreDSR = useCallback(async () => {
    if (!targetDSR) return;
    try {
      await api.put(`/dsrs/${targetDSR._id}`, { active: true });
      toast.success('DSR restored');
      setConfirmRestoreOpen(false);
      setTargetDSR(null);
      await loadDSRs();
    } catch (error) {
      console.error('Failed to restore DSR', error);
      toast.error('Failed to restore DSR');
    }
  }, [loadDSRs, targetDSR]);

  const filteredDSRs = useMemo(
    () => filterDSRs(dsrs, { searchTerm, includeInactive }),
    [dsrs, includeInactive, searchTerm],
  );

  const sortedDSRs = useMemo(
    () => sortDSRs(filteredDSRs, orderBy, order),
    [filteredDSRs, order, orderBy],
  );

  const paginatedDSRs = useMemo(
    () => sortedDSRs.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage),
    [page, rowsPerPage, sortedDSRs],
  );

  const fetchAllForExport = useCallback(async () => sortedDSRs, [sortedDSRs]);

  const dsrColumns = useMemo(
    () => [
      {
        id: 'dsr_code',
        label: 'DSR Code',
        sortable: true,
        renderCell: (dsr: DSR) => dsr.dsr_code,
      },
      {
        id: 'name',
        label: 'Name',
        sortable: true,
        renderCell: (dsr: DSR) => (
          <Box>
            <Typography variant="body1" fontWeight="medium">
              {dsr.name}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {dsr.mobile}
            </Typography>
          </Box>
        ),
      },
      {
        id: 'distributor',
        label: 'Distributor',
        sortable: true,
        renderCell: (dsr: DSR) => (
          <Box>
            <Typography variant="body2">{dsr.distributor_id.name}</Typography>
            <Typography variant="caption" color="text.secondary">
              {dsr.distributor_id.erp_id ?? ''}
            </Typography>
          </Box>
        ),
      },
      {
        id: 'mobile',
        label: 'Mobile',
        sortable: true,
        renderCell: (dsr: DSR) => dsr.mobile,
      },
      {
        id: 'employment_status',
        label: 'Employment Status',
        sortable: true,
        renderCell: (dsr: DSR) => (
          <Chip
            label={dsr.employment_status}
            size="small"
            color={dsr.employment_status === 'active' ? 'success' : 'default'}
          />
        ),
      },
      {
        id: 'user_account',
        label: 'User Account',
        sortable: true,
        renderCell: (dsr: DSR) =>
          dsr.user_id ? (
            <Chip icon={<PersonIcon />} label={dsr.user_id.username} size="small" color="primary" />
          ) : (
            <Typography variant="caption" color="text.secondary">
              No account
            </Typography>
          ),
      },
      {
        id: 'status',
        label: 'Status',
        sortable: true,
        renderCell: (dsr: DSR) => (
          <Chip size="small" color={dsr.active ? 'success' : 'default'} label={dsr.active ? 'Active' : 'Inactive'} />
        ),
      },
      {
        id: 'created_at',
        label: 'Created At',
        sortable: true,
        renderCell: (dsr: DSR) => formatDateForExport(dsr.created_at),
      },
      {
        id: 'actions',
        label: 'Actions',
        alwaysVisible: true,
        align: 'right',
        renderCell: (dsr: DSR) => (
          <Box sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end' }}>
            <Tooltip title="Edit DSR">
              <IconButton size="small" color="primary" onClick={() => handleEditDSR(dsr)}>
                <EditIcon fontSize="small" />
              </IconButton>
            </Tooltip>
            {dsr.active ? (
              <Tooltip title={dsr.user_id ? 'Cannot delete DSR with user account' : 'Delete DSR'}>
                <span>
                  <IconButton
                    size="small"
                    color="error"
                    disabled={!!dsr.user_id}
                    onClick={() => {
                      setTargetDSR(dsr);
                      setConfirmDeleteOpen(true);
                    }}
                  >
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                </span>
              </Tooltip>
            ) : (
              <Tooltip title="Restore DSR">
                <IconButton
                  size="small"
                  color="success"
                  onClick={() => {
                    setTargetDSR(dsr);
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
    [handleEditDSR],
  );

  const visibleColumns = useMemo(
    () => dsrColumns.filter((column) => column.alwaysVisible || visibleColumnIds.includes(column.id)),
    [dsrColumns, visibleColumnIds],
  );

  const tableMinWidth = useMemo(() => calculateTableMinWidth(visibleColumns.length), [visibleColumns.length]);

  const columnVisibilityOptions = useMemo(
    () =>
      dsrColumns
        .filter((column) => !isDistributorUser || column.id !== 'distributor') // Hide distributor column for distributor users
        .map((column) => ({
          id: column.id,
          label: column.label,
          alwaysVisible: column.alwaysVisible,
        })),
    [dsrColumns, isDistributorUser],
  );

  const dsrExportColumns = useMemo<ExportColumn<DSR>[]>(
    () => [
      { header: 'DSR Code', accessor: (row) => row.dsr_code },
      { header: 'Name', accessor: (row) => row.name },
      { header: 'Distributor', accessor: (row) => row.distributor_id.name },
      { header: 'Distributor ERP ID', accessor: (row) => String(row.distributor_id.erp_id ?? '') },
      { header: 'Mobile', accessor: (row) => row.mobile },
      { header: 'Email', accessor: (row) => row.email ?? '' },
      { header: 'Employment Status', accessor: (row) => row.employment_status },
      { header: 'User Account', accessor: (row) => row.user_id?.username ?? '' },
      { header: 'Status', accessor: (row) => (row.active ? 'Active' : 'Inactive') },
      { header: 'Created At', accessor: (row) => formatDateForExport(row.created_at) },
    ],
    [],
  );

  const renderCardsView = () => (
    <>
      <Grid container spacing={2}>
        {paginatedDSRs.map((dsr) => (
          <Grid item xs={12} sm={6} md={4} key={dsr._id}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  {dsr.name}
                </Typography>
                <Stack spacing={1}>
                  <Typography variant="body2" color="text.secondary">
                    Code: {dsr.dsr_code}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Distributor: {dsr.distributor_id.name}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Mobile: {dsr.mobile}
                  </Typography>
                  <Box>
                    <Chip
                      label={dsr.employment_status}
                      size="small"
                      color={dsr.employment_status === 'active' ? 'success' : 'default'}
                    />
                    <Chip
                      label={dsr.active ? 'Active' : 'Inactive'}
                      size="small"
                      color={dsr.active ? 'success' : 'default'}
                      sx={{ ml: 1 }}
                    />
                  </Box>
                  {dsr.user_id && (
                    <Chip icon={<PersonIcon />} label={dsr.user_id.username} size="small" color="primary" />
                  )}
                </Stack>
              </CardContent>
              <CardActions sx={{ justifyContent: 'flex-end' }}>
                <Tooltip title="Edit DSR">
                  <IconButton size="small" color="primary" onClick={() => handleEditDSR(dsr)}>
                    <EditIcon />
                  </IconButton>
                </Tooltip>
                {dsr.active ? (
                  <Tooltip title={dsr.user_id ? 'Cannot delete DSR with user account' : 'Delete DSR'}>
                    <span>
                      <IconButton
                        size="small"
                        color="error"
                        disabled={!!dsr.user_id}
                        onClick={() => {
                          setTargetDSR(dsr);
                          setConfirmDeleteOpen(true);
                        }}
                      >
                        <DeleteIcon />
                      </IconButton>
                    </span>
                  </Tooltip>
                ) : (
                  <Tooltip title="Restore DSR">
                    <IconButton
                      size="small"
                      color="success"
                      onClick={() => {
                        setTargetDSR(dsr);
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
          count={sortedDSRs.length}
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
          {paginatedDSRs.map((dsr) => (
            <TableRow key={dsr._id} hover>
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
                    {column.renderCell(dsr)}
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
        count={sortedDSRs.length}
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
          <PersonIcon color="primary" sx={{ fontSize: 36 }} />
          <Box>
            <Typography variant="h4" component="h1">
              DSR Management
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Manage Distributor Sales Representatives
            </Typography>
          </Box>
        </Box>
        <Button variant="contained" startIcon={<AddIcon />} onClick={handleAddDSR}>
          Add DSR
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
            placeholder="Search DSRs..."
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
            title="DSR Report"
            fileBaseName="dsrs"
            currentRows={paginatedDSRs}
            columns={dsrExportColumns}
            onFetchAll={fetchAllForExport}
            disabled={loading || dsrs.length === 0}
          />

          <ColumnVisibilityMenu
            options={columnVisibilityOptions}
            selected={visibleColumnIds}
            onChange={(next) => setVisibleColumnIds(next as DSRColumnId[])}
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
        Showing {filteredDSRs.length} of {dsrs.length} DSRs
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
      ) : sortedDSRs.length === 0 ? (
        <Alert severity="info">
          {searchTerm
            ? `No DSRs match "${searchTerm}". Adjust your search criteria.`
            : 'No DSRs found. Add a DSR to get started.'}
        </Alert>
      ) : viewMode === 'cards' ? (
        renderCardsView()
      ) : (
        renderListView()
      )}

      <Dialog open={openDialog} onClose={handleDialogClose} maxWidth="lg" fullWidth>
        <DialogTitle>{editingDSR ? 'Edit DSR' : 'Add DSR'}</DialogTitle>
        <form onSubmit={handleSubmit(submitDSR)} noValidate>
          <DialogContent dividers>
            <Stack spacing={3}>
              {metadataLoading && <Alert severity="info">Loading distributor data...</Alert>}
              {formError && (
                <Alert severity="error" onClose={() => setFormError(null)}>
                  {formError}
                </Alert>
              )}

              <Typography variant="subtitle2" color="primary">
                Basic Information
              </Typography>
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
                        label="Name"
                        fullWidth
                        required
                        disabled={isSubmitting}
                        error={Boolean(errors.name)}
                        helperText={errors.name?.message}
                      />
                    )}
                  />
                </Box>
                {!isDistributorUser && (
                  <Box sx={{ minWidth: 0 }}>
                    <FormControl fullWidth error={Boolean(errors.distributor_id)}>
                      <InputLabel id="distributor-label">Distributor *</InputLabel>
                      <Controller
                        name="distributor_id"
                        control={control}
                        render={({ field }) => (
                          <Select
                            {...field}
                            labelId="distributor-label"
                            label="Distributor *"
                            disabled={isEditMode}
                            value={field.value}
                            onChange={(event: SelectChangeEvent<string>) => field.onChange(event.target.value)}
                          >
                            {distributorOptions.map((option) => (
                              <MenuItem key={option.value} value={option.value}>
                                {option.label}
                              </MenuItem>
                            ))}
                          </Select>
                        )}
                      />
                      <FormHelperText>{errors.distributor_id?.message}</FormHelperText>
                    </FormControl>
                  </Box>
                )}
                <Box sx={{ minWidth: 0 }}>
                  <Controller
                    name="mobile"
                    control={control}
                    render={({ field }) => (
                      <TextField
                        {...field}
                        label="Mobile"
                        fullWidth
                        required
                        placeholder="01XXXXXXXXX or +8801XXXXXXXXX"
                        disabled={isSubmitting}
                        error={Boolean(errors.mobile)}
                        helperText={errors.mobile?.message}
                      />
                    )}
                  />
                </Box>
                <Box sx={{ minWidth: 0 }}>
                  <Controller
                    name="email"
                    control={control}
                    render={({ field }) => (
                      <TextField
                        {...field}
                        label="Email"
                        fullWidth
                        type="email"
                        error={Boolean(errors.email)}
                        helperText={errors.email?.message}
                      />
                    )}
                  />
                </Box>
                <Box sx={{ minWidth: 0 }}>
                  <Controller
                    name="nid_number"
                    control={control}
                    render={({ field }) => (
                      <TextField
                        {...field}
                        label="NID Number"
                        fullWidth
                        required
                        disabled={isSubmitting}
                        error={Boolean(errors.nid_number)}
                        helperText={errors.nid_number?.message}
                      />
                    )}
                  />
                </Box>
                <Box sx={{ minWidth: 0 }}>
                  <Controller
                    name="date_of_birth"
                    control={control}
                    render={({ field }) => (
                      <TextField
                        {...field}
                        type="date"
                        label="Date of Birth"
                        fullWidth
                        InputLabelProps={{ shrink: true }}
                      />
                    )}
                  />
                </Box>
                <Box sx={{ minWidth: 0 }}>
                  <FormControl fullWidth required error={Boolean(errors.gender)}>
                    <InputLabel id="gender-label">Gender</InputLabel>
                    <Controller
                      name="gender"
                      control={control}
                      render={({ field }) => (
                        <Select {...field} labelId="gender-label" label="Gender" disabled={isSubmitting}>
                          <MenuItem value="">
                            <em>None</em>
                          </MenuItem>
                          {GENDER_OPTIONS.map((gender) => (
                            <MenuItem key={gender} value={gender}>
                              {gender.charAt(0).toUpperCase() + gender.slice(1)}
                            </MenuItem>
                          ))}
                        </Select>
                      )}
                    />
                    {errors.gender && <FormHelperText>{errors.gender?.message}</FormHelperText>}
                  </FormControl>
                </Box>
                <Box sx={{ minWidth: 0 }}>
                  <FormControl fullWidth required error={Boolean(errors.blood_group)}>
                    <InputLabel id="blood-label">Blood Group</InputLabel>
                    <Controller
                      name="blood_group"
                      control={control}
                      render={({ field }) => (
                        <Select {...field} labelId="blood-label" label="Blood Group" disabled={isSubmitting}>
                          <MenuItem value="">
                            <em>None</em>
                          </MenuItem>
                          {BLOOD_GROUP_OPTIONS.map((bg) => (
                            <MenuItem key={bg} value={bg}>
                              {bg}
                            </MenuItem>
                          ))}
                        </Select>
                      )}
                    />
                    {errors.blood_group && <FormHelperText>{errors.blood_group?.message}</FormHelperText>}
                  </FormControl>
                </Box>
                <Box sx={{ minWidth: 0 }}>
                  <Controller
                    name="joining_date"
                    control={control}
                    render={({ field }) => (
                      <TextField
                        {...field}
                        type="date"
                        label="Joining Date"
                        fullWidth
                        disabled={isSubmitting}
                        InputLabelProps={{ shrink: true }}
                      />
                    )}
                  />
                </Box>
              </Box>

              <Typography variant="subtitle2" color="primary">
                Present Address
              </Typography>
              <Box
                sx={{
                  display: 'grid',
                  gridTemplateColumns: {
                    xs: 'repeat(1, minmax(0, 1fr))',
                    sm: 'repeat(2, minmax(0, 1fr))',
                  },
                  gap: 2,
                }}
              >
                <Box sx={{ minWidth: 0 }}>
                  <Controller
                    name="present_address_street"
                    control={control}
                    render={({ field }) => <TextField {...field} label="Street" fullWidth />}
                  />
                </Box>
                <Box sx={{ minWidth: 0 }}>
                  <Controller
                    name="present_address_city"
                    control={control}
                    render={({ field }) => <TextField {...field} label="City" fullWidth />}
                  />
                </Box>
                <Box sx={{ minWidth: 0 }}>
                  <Controller
                    name="present_address_district"
                    control={control}
                    render={({ field }) => <TextField {...field} label="District" fullWidth />}
                  />
                </Box>
                <Box sx={{ minWidth: 0 }}>
                  <Controller
                    name="present_address_postal_code"
                    control={control}
                    render={({ field }) => <TextField {...field} label="Postal Code" fullWidth />}
                  />
                </Box>
              </Box>

              <Typography variant="subtitle2" color="primary">
                Permanent Address
              </Typography>
              <Box
                sx={{
                  display: 'grid',
                  gridTemplateColumns: {
                    xs: 'repeat(1, minmax(0, 1fr))',
                    sm: 'repeat(2, minmax(0, 1fr))',
                  },
                  gap: 2,
                }}
              >
                <Box sx={{ minWidth: 0 }}>
                  <Controller
                    name="permanent_address_street"
                    control={control}
                    render={({ field }) => <TextField {...field} label="Street" fullWidth />}
                  />
                </Box>
                <Box sx={{ minWidth: 0 }}>
                  <Controller
                    name="permanent_address_city"
                    control={control}
                    render={({ field }) => <TextField {...field} label="City" fullWidth />}
                  />
                </Box>
                <Box sx={{ minWidth: 0 }}>
                  <Controller
                    name="permanent_address_district"
                    control={control}
                    render={({ field }) => <TextField {...field} label="District" fullWidth />}
                  />
                </Box>
                <Box sx={{ minWidth: 0 }}>
                  <Controller
                    name="permanent_address_postal_code"
                    control={control}
                    render={({ field }) => <TextField {...field} label="Postal Code" fullWidth />}
                  />
                </Box>
              </Box>

              <Typography variant="subtitle2" color="primary">
                Emergency Contact
              </Typography>
              <Box
                sx={{
                  display: 'grid',
                  gridTemplateColumns: {
                    xs: 'repeat(1, minmax(0, 1fr))',
                    sm: 'repeat(3, minmax(0, 1fr))',
                  },
                  gap: 2,
                }}
              >
                <Box sx={{ minWidth: 0 }}>
                  <Controller
                    name="emergency_contact_name"
                    control={control}
                    render={({ field }) => <TextField {...field} label="Contact Name" fullWidth />}
                  />
                </Box>
                <Box sx={{ minWidth: 0 }}>
                  <Controller
                    name="emergency_contact_relation"
                    control={control}
                    render={({ field }) => <TextField {...field} label="Relation" fullWidth />}
                  />
                </Box>
                <Box sx={{ minWidth: 0 }}>
                  <Controller
                    name="emergency_contact_mobile"
                    control={control}
                    render={({ field }) => <TextField {...field} label="Mobile" fullWidth placeholder="01XXXXXXXXX or +8801XXXXXXXXX" />}
                  />
                </Box>
              </Box>

              <Typography variant="subtitle2" color="primary">
                Additional Information
              </Typography>
              <Box sx={{ minWidth: 0 }}>
                <Controller
                  name="notes"
                  control={control}
                  render={({ field }) => <TextField {...field} label="Notes" fullWidth multiline minRows={3} />}
                />
              </Box>

              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  flexWrap: 'wrap',
                  gap: 2,
                }}
              >
                <Controller
                  name="active"
                  control={control}
                  render={({ field }) => (
                    <FormControlLabel
                      control={
                        <Switch color="primary" checked={field.value} onChange={(event) => field.onChange(event.target.checked)} />
                      }
                      label="DSR is active"
                    />
                  )}
                />

                {!isEditMode && (
                  <Controller
                    name="create_user_account"
                    control={control}
                    render={({ field }) => (
                      <FormControlLabel
                        control={
                          <Switch color="primary" checked={field.value} onChange={(event) => field.onChange(event.target.checked)} />
                        }
                        label="Create User Account"
                      />
                    )}
                  />
                )}
              </Box>

              {!isEditMode && createUserAccount && (
                <>
                  <Typography variant="subtitle2" color="primary">
                    User Account Details
                  </Typography>
                  <Box
                    sx={{
                      display: 'grid',
                      gridTemplateColumns: {
                        xs: 'repeat(1, minmax(0, 1fr))',
                        sm: 'repeat(2, minmax(0, 1fr))',
                      },
                      gap: 2,
                    }}
                  >
                    <Box sx={{ minWidth: 0 }}>
                      <Controller
                        name="username"
                        control={control}
                        render={({ field }) => (
                          <TextField
                            {...field}
                            label="Username"
                            fullWidth
                            required={createUserAccount}
                            disabled={isSubmitting}
                            error={Boolean(errors.username)}
                            helperText={errors.username?.message}
                            inputProps={{ style: { textTransform: 'none' } }}
                          />
                        )}
                      />
                    </Box>
                    <Box sx={{ minWidth: 0 }}>
                      <Controller
                        name="password"
                        control={control}
                        render={({ field }) => (
                          <TextField
                            {...field}
                            type="password"
                            label="Password"
                            fullWidth
                            required={createUserAccount}
                            disabled={isSubmitting}
                            error={Boolean(errors.password)}
                            helperText={errors.password?.message}
                          />
                        )}
                      />
                    </Box>
                  </Box>
                </>
              )}
            </Stack>
          </DialogContent>
          <DialogActions sx={{ justifyContent: 'flex-end', gap: 1, flexWrap: 'wrap' }}>
            <Button onClick={handleDialogClose} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" variant="contained" disabled={isSubmitting}>
              {isSubmitting ? 'Saving…' : editingDSR ? 'Update DSR' : 'Create DSR'}
            </Button>
          </DialogActions>
        </form>
      </Dialog>

      <Dialog
        open={confirmDeleteOpen}
        onClose={() => {
          setConfirmDeleteOpen(false);
          setTargetDSR(null);
        }}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Delete DSR?</DialogTitle>
        <DialogContent dividers>
          <Typography>
            Are you sure you want to delete{' '}
            <Typography component="span" fontWeight={600}>
              {targetDSR?.name ?? 'this DSR'}
            </Typography>
            ?
          </Typography>
          {targetDSR?.user_id && (
            <Alert severity="warning" sx={{ mt: 2 }}>
              This DSR has a linked user account and cannot be deleted. Deactivate the user first.
            </Alert>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmDeleteOpen(false)}>Cancel</Button>
          <Button onClick={handleDeleteDSR} color="error" variant="contained" disabled={!targetDSR || !!targetDSR.user_id}>
            Delete
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={confirmRestoreOpen}
        onClose={() => {
          setConfirmRestoreOpen(false);
          setTargetDSR(null);
        }}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Restore DSR?</DialogTitle>
        <DialogContent dividers>
          <Typography>
            Restore{' '}
            <Typography component="span" fontWeight={600}>
              {targetDSR?.name ?? 'this DSR'}
            </Typography>{' '}
            to the active roster?
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmRestoreOpen(false)}>Cancel</Button>
          <Button onClick={handleRestoreDSR} color="primary" variant="contained" disabled={!targetDSR}>
            Restore
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default DSRsPage;
