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
  Autocomplete,
  Chip,
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Search as SearchIcon,
  Book as LedgerIcon,
  ViewList as ViewListIcon,
  ViewModule as ViewModuleIcon,
  TrendingUp as DebitIcon,
  TrendingDown as CreditIcon,
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

interface CustomerLedgerEntry {
  _id: string;
  distributor_id: {
    _id: string;
    name: string;
  };
  transaction_date: string;
  voucher_type: string;
  voucher_no: string;
  debit: number;
  credit: number;
  closing: number;
  note?: string;
  created_at: string;
  created_by?: { username: string } | null;
  updated_at: string;
  updated_by?: { username: string } | null;
}

interface Distributor {
  _id: string;
  name: string;
  erp_id?: number;
}

const ledgerSchema = z.object({
  distributor_id: z.string().min(1, 'Distributor is required'),
  particulars: z.string().optional(),
  transaction_date: z.string().min(1, 'Transaction date is required'),
  voucher_type: z.string().min(1, 'Voucher type is required'),
  voucher_no: z.string().min(1, 'Voucher number is required'),
  debit: z.number().min(0, 'Debit must be 0 or positive'),
  credit: z.number().min(0, 'Credit must be 0 or positive'),
  note: z.string().optional(),
}).refine(
  (data) => data.debit > 0 || data.credit > 0,
  {
    message: 'Either debit or credit must be greater than 0',
    path: ['debit'],
  }
).refine(
  (data) => !(data.debit > 0 && data.credit > 0),
  {
    message: 'Cannot have both debit and credit in the same entry',
    path: ['debit'],
  }
);

type LedgerFormData = z.infer<typeof ledgerSchema>;

type Order = 'asc' | 'desc';
type OrderableKeys = 'transaction_date' | 'voucher_type' | 'voucher_no' | 'debit' | 'credit' | 'closing' | 'created_at';

interface LedgerColumnDefinition {
  id: string;
  label: string;
  sortableKey?: OrderableKeys;
  align?: 'inherit' | 'left' | 'center' | 'right' | 'justify';
  alwaysVisible?: boolean;
  minWidth?: number;
  renderCell: (entry: CustomerLedgerEntry) => React.ReactNode;
}

const LEDGER_COLUMN_STORAGE_KEY = 'finance:customerledger:visibleColumns';

const getLedgerErrorMessage = (error: unknown, fallback: string): string => {
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

export default function CustomerLedgerPage() {
  const [entries, setEntries] = useState<CustomerLedgerEntry[]>([]);
  const [distributors, setDistributors] = useState<Distributor[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'cards' | 'list'>('list');
  const [searchTerm, setSearchTerm] = useState('');
  const [openDialog, setOpenDialog] = useState(false);
  const [editingEntry, setEditingEntry] = useState<CustomerLedgerEntry | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [entryToDelete, setEntryToDelete] = useState<string | null>(null);
  const [selectedDistributor, setSelectedDistributor] = useState<string>('');
  const [selectedDistributorObj, setSelectedDistributorObj] = useState<Distributor | null>(null);
  const [distributorSearchTerm, setDistributorSearchTerm] = useState('');
  const [loadingDistributors, setLoadingDistributors] = useState(false);

  // Sorting and pagination state
  const [orderBy, setOrderBy] = useState<OrderableKeys>('transaction_date');
  const [order, setOrder] = useState<Order>('desc');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(25);
  const [visibleLedgerColumnIds, setVisibleLedgerColumnIds] = useState<string[]>([]);
  const [persistedLedgerColumnIds, setPersistedLedgerColumnIds] = useState<string[]>([]);
  const ledgerColumnStateHydratedRef = useRef(false);

  const ledgerExportColumns = useMemo<ExportColumn<CustomerLedgerEntry>[]>(
    () => [
      {
        header: 'Transaction Date',
        accessor: (row) => formatDateForExport(row.transaction_date),
      },
      {
        header: 'Distributor Name',
        accessor: (row) => row.distributor_id?.name ?? '',
      },
      {
        header: 'Particulars',
        accessor: (row) => (row as any).particulars ?? '',
      },
      {
        header: 'Voucher Type',
        accessor: (row) => row.voucher_type,
      },
      {
        header: 'Voucher No',
        accessor: (row) => row.voucher_no,
      },
      {
        header: 'Debit',
        accessor: (row) => row.debit.toFixed(2),
      },
      {
        header: 'Credit',
        accessor: (row) => row.credit.toFixed(2),
      },
      {
        header: 'Closing Balance',
        accessor: (row) => row.closing.toFixed(2),
      },
      {
        header: 'Note',
        accessor: (row) => row.note ?? '',
      },
      {
        header: 'Created By',
        accessor: (row) => row.created_by?.username ?? '',
      },
      {
        header: 'Created Date',
        accessor: (row) => formatDateForExport(row.created_at),
      },
    ],
    []
  );

  const {
    control,
    handleSubmit,
    reset,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<LedgerFormData>({
    resolver: zodResolver(ledgerSchema),
    defaultValues: {
      distributor_id: '',
      particulars: '',
      transaction_date: new Date().toISOString().split('T')[0],
      voucher_type: '',
      voucher_no: '',
      debit: 0,
      credit: 0,
      note: '',
    },
  });

  const debitValue = watch('debit');
  const creditValue = watch('credit');

  const loadDistributors = useCallback(async (searchTerm = '') => {
    try {
      setLoadingDistributors(true);
      const response = await api.get('/distributors', {
        params: { 
          active: true, 
          limit: 50,
          search: searchTerm || undefined,
        },
      });
      const distributorsData = response.data?.data && Array.isArray(response.data.data)
        ? response.data.data
        : [];
      setDistributors(distributorsData);
    } catch (error: unknown) {
      console.error('Error loading distributors:', error);
      toast.error('Failed to load distributors');
      setDistributors([]);
    } finally {
      setLoadingDistributors(false);
    }
  }, []);

  // Debounced distributor search
  useEffect(() => {
    const timer = setTimeout(() => {
      loadDistributors(distributorSearchTerm);
    }, 300);

    return () => clearTimeout(timer);
  }, [distributorSearchTerm, loadDistributors]);

  const loadEntries = useCallback(async () => {
    try {
      setLoading(true);
      const params: any = { page: 1, limit: 1000 };
      if (selectedDistributor) {
        params.distributor_id = selectedDistributor;
      }

      const response = await api.get('/finance/customerledger', { params });
      const entriesData = response.data?.data?.entries && Array.isArray(response.data.data.entries)
        ? response.data.data.entries
        : [];
      setEntries(entriesData);
    } catch (error: unknown) {
      toast.error('Failed to load ledger entries');
      console.error('Error loading entries:', error);
      setEntries([]);
    } finally {
      setLoading(false);
    }
  }, [selectedDistributor]);

  useEffect(() => {
    loadEntries();
  }, [loadEntries]);

  // Merge selected distributor with search results
  const distributorOptions = useMemo(() => {
    const options = [...distributors];
    
    // Add selected filter distributor if not in list
    if (selectedDistributorObj && !options.some(d => d._id === selectedDistributorObj._id)) {
      options.unshift(selectedDistributorObj);
    }
    
    // Add editing entry's distributor if not in list
    if (editingEntry && editingEntry.distributor_id && !options.some(d => d._id === editingEntry.distributor_id._id)) {
      options.unshift({
        _id: editingEntry.distributor_id._id,
        name: editingEntry.distributor_id.name,
      });
    }
    
    return options;
  }, [distributors, selectedDistributorObj, editingEntry]);

  const filteredEntries = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    if (!query) {
      return entries;
    }
    return entries.filter(
      (entry) =>
        entry.voucher_no.toLowerCase().includes(query) ||
        entry.voucher_type.toLowerCase().includes(query) ||
        entry.distributor_id?.name?.toLowerCase().includes(query)
    );
  }, [entries, searchTerm]);

  const handleSort = useCallback(
    (property: OrderableKeys) => {
      const isAsc = orderBy === property && order === 'asc';
      setOrder(isAsc ? 'desc' : 'asc');
      setOrderBy(property);
      setPage(0);
    },
    [order, orderBy]
  );

  const sortedEntries = useMemo(() => {
    const next = [...filteredEntries];
    next.sort((a, b) => {
      let aValue: unknown;
      let bValue: unknown;

      if (orderBy === 'transaction_date' || orderBy === 'created_at') {
        aValue = new Date(a[orderBy]).getTime();
        bValue = new Date(b[orderBy]).getTime();
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
  }, [filteredEntries, order, orderBy]);

  const fetchAllEntries = useCallback(async () => [...sortedEntries], [sortedEntries]);

  const paginatedEntries = useMemo(() => {
    const startIndex = page * rowsPerPage;
    return sortedEntries.slice(startIndex, startIndex + rowsPerPage);
  }, [sortedEntries, page, rowsPerPage]);

  const ledgerColumnDefinitions = useMemo<LedgerColumnDefinition[]>(
    () => [
      {
        id: 'transaction_date',
        label: 'Transaction Date',
        sortableKey: 'transaction_date',
        alwaysVisible: true,
        minWidth: 130,
        renderCell: (entry) => new Date(entry.transaction_date).toLocaleDateString(),
      },
      {
        id: 'distributor',
        label: 'Distributor',
        alwaysVisible: true,
        minWidth: 200,
        renderCell: (entry) => (
          <Typography variant="body2">{entry.distributor_id?.name}</Typography>
        ),
      },
      {
        id: 'particulars',
        label: 'Particulars',
        minWidth: 200,
        renderCell: (entry) => (
          <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
            {(entry as any).particulars || '-'}
          </Typography>
        ),
      },
      {
        id: 'voucher_type',
        label: 'Voucher Type',
        sortableKey: 'voucher_type',
        minWidth: 130,
        renderCell: (entry) => (
          <Chip label={entry.voucher_type} size="small" variant="outlined" />
        ),
      },
      {
        id: 'voucher_no',
        label: 'Voucher No',
        sortableKey: 'voucher_no',
        minWidth: 150,
        renderCell: (entry) => entry.voucher_no,
      },
      {
        id: 'debit',
        label: 'Debit',
        sortableKey: 'debit',
        align: 'right',
        minWidth: 120,
        renderCell: (entry) => (
          <Typography
            variant="body2"
            color={entry.debit > 0 ? 'error.main' : 'text.disabled'}
            sx={{ fontWeight: entry.debit > 0 ? 'bold' : 'normal' }}
          >
            {entry.debit > 0 ? entry.debit.toFixed(2) : '-'}
          </Typography>
        ),
      },
      {
        id: 'credit',
        label: 'Credit',
        sortableKey: 'credit',
        align: 'right',
        minWidth: 120,
        renderCell: (entry) => (
          <Typography
            variant="body2"
            color={entry.credit > 0 ? 'success.main' : 'text.disabled'}
            sx={{ fontWeight: entry.credit > 0 ? 'bold' : 'normal' }}
          >
            {entry.credit > 0 ? entry.credit.toFixed(2) : '-'}
          </Typography>
        ),
      },
      {
        id: 'closing',
        label: 'Closing Balance',
        sortableKey: 'closing',
        align: 'right',
        minWidth: 140,
        renderCell: (entry) => (
          <Typography
            variant="body2"
            sx={{ fontWeight: 'bold' }}
            color={entry.closing >= 0 ? 'primary.main' : 'error.main'}
          >
            {entry.closing.toFixed(2)}
          </Typography>
        ),
      },
      {
        id: 'note',
        label: 'Note',
        minWidth: 150,
        renderCell: (entry) => (
          <Typography variant="body2" sx={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 200 }}>
            {entry.note || '-'}
          </Typography>
        ),
      },
      {
        id: 'created_by',
        label: 'Created By',
        minWidth: 120,
        renderCell: (entry) => entry.created_by?.username ?? '-',
      },
      {
        id: 'actions',
        label: 'Actions',
        align: 'center',
        alwaysVisible: true,
        minWidth: 100,
        renderCell: (entry) => (
          <Box sx={{ display: 'flex', justifyContent: 'center', gap: 0.5 }}>
            <Tooltip title="Edit">
              <IconButton size="small" onClick={() => handleOpenDialog(entry)} color="primary">
                <EditIcon fontSize="small" />
              </IconButton>
            </Tooltip>
            <Tooltip title="Delete">
              <IconButton
                size="small"
                onClick={() => {
                  setEntryToDelete(entry._id);
                  setDeleteConfirmOpen(true);
                }}
                color="error"
              >
                <DeleteIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          </Box>
        ),
      },
    ],
    []
  );

  const defaultVisibleLedgerColumnIds = useMemo(
    () => ledgerColumnDefinitions.filter((col) => col.alwaysVisible).map((col) => col.id),
    [ledgerColumnDefinitions]
  );

  useEffect(() => {
    if (ledgerColumnStateHydratedRef.current) return;
    ledgerColumnStateHydratedRef.current = true;

    try {
      const saved = localStorage.getItem(LEDGER_COLUMN_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setVisibleLedgerColumnIds(parsed);
          setPersistedLedgerColumnIds(parsed);
          return;
        }
      }
    } catch (e) {
      console.error('Failed to load column visibility from localStorage', e);
    }

    const initial = [...defaultVisibleLedgerColumnIds, 'voucher_type', 'voucher_no', 'debit', 'credit', 'closing'];
    setVisibleLedgerColumnIds(initial);
    setPersistedLedgerColumnIds(initial);
  }, [defaultVisibleLedgerColumnIds]);

  const visibleLedgerColumns = useMemo(
    () => ledgerColumnDefinitions.filter((col) => visibleLedgerColumnIds.includes(col.id)),
    [ledgerColumnDefinitions, visibleLedgerColumnIds]
  );

  const ledgerColumnVisibilityOptions = useMemo(
    () =>
      ledgerColumnDefinitions
        .filter((col) => !col.alwaysVisible)
        .map((col) => ({ id: col.id, label: col.label })),
    [ledgerColumnDefinitions]
  );

  const ledgerHasUnsavedChanges = useMemo(() => {
    if (visibleLedgerColumnIds.length !== persistedLedgerColumnIds.length) return true;
    return !visibleLedgerColumnIds.every((id) => persistedLedgerColumnIds.includes(id));
  }, [visibleLedgerColumnIds, persistedLedgerColumnIds]);

  const handleVisibleLedgerColumnsChange = useCallback(
    (newIds: string[]) => {
      setVisibleLedgerColumnIds([...defaultVisibleLedgerColumnIds, ...newIds]);
    },
    [defaultVisibleLedgerColumnIds]
  );

  const handleSaveLedgerColumnSelection = useCallback(() => {
    try {
      localStorage.setItem(LEDGER_COLUMN_STORAGE_KEY, JSON.stringify(visibleLedgerColumnIds));
      setPersistedLedgerColumnIds([...visibleLedgerColumnIds]);
      toast.success('Column visibility saved!');
    } catch (e) {
      console.error('Failed to save column visibility', e);
      toast.error('Failed to save column visibility');
    }
  }, [visibleLedgerColumnIds]);

  const tableMinWidth = useMemo(() => calculateTableMinWidth(visibleLedgerColumns.length), [visibleLedgerColumns]);

  const handleOpenDialog = (entry?: CustomerLedgerEntry) => {
    if (entry) {
      setEditingEntry(entry);
      reset({
        distributor_id: entry.distributor_id._id,
        particulars: (entry as any).particulars || '',
        transaction_date: new Date(entry.transaction_date).toISOString().split('T')[0],
        voucher_type: entry.voucher_type,
        voucher_no: entry.voucher_no,
        debit: entry.debit,
        credit: entry.credit,
        note: entry.note || '',
      });
    } else {
      setEditingEntry(null);
      reset({
        distributor_id: '',
        particulars: '',
        transaction_date: new Date().toISOString().split('T')[0],
        voucher_type: '',
        voucher_no: '',
        debit: 0,
        credit: 0,
        note: '',
      });
    }
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setEditingEntry(null);
    reset();
  };

  const onSubmit = useCallback(
    async (data: LedgerFormData) => {
      try {
        const payload = {
          ...data,
          transaction_date: new Date(data.transaction_date).toISOString(),
        };

        if (editingEntry) {
          await api.put(`/finance/customerledger/${editingEntry._id}`, payload);
          toast.success('Ledger entry updated successfully');
        } else {
          await api.post('/finance/customerledger', payload);
          toast.success('Ledger entry created successfully');
        }

        setOpenDialog(false);
        reset();
        setEditingEntry(null);
        loadEntries();
      } catch (error: unknown) {
        toast.error(getLedgerErrorMessage(error, 'Failed to save ledger entry'));
      }
    },
    [editingEntry, reset, loadEntries]
  );

  const handleDeleteConfirm = useCallback(async () => {
    if (!entryToDelete) return;

    try {
      await api.delete(`/finance/customerledger/${entryToDelete}`);
      toast.success('Ledger entry deleted successfully');
      setDeleteConfirmOpen(false);
      setEntryToDelete(null);
      loadEntries();
    } catch (error: unknown) {
      toast.error(getLedgerErrorMessage(error, 'Failed to delete ledger entry'));
    }
  }, [entryToDelete, loadEntries]);

  const handleDeleteCancel = useCallback(() => {
    setDeleteConfirmOpen(false);
    setEntryToDelete(null);
  }, []);

  const handleChangePage = (_event: unknown, newPage: number) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  if (loading) {
    return (
      <Box sx={{ p: 3 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          Customer Ledger
        </Typography>
        <Grid container spacing={3}>
          {[...Array(6)].map((_, index) => (
            <Grid size={{ xs: 12 }} key={index}>
              <Skeleton variant="rectangular" height={100} />
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
          <Typography variant="h4" component="h1">
            Customer Ledger
          </Typography>
          <Button variant="contained" startIcon={<AddIcon />} onClick={() => handleOpenDialog()} sx={{ minWidth: 'max-content' }}>
            Add Entry
          </Button>
        </Box>

        {/* Filters */}
        <Box sx={{ mb: 3, display: 'flex', gap: 2, flexWrap: 'wrap' }}>
          <Autocomplete
            options={distributorOptions}
            loading={loadingDistributors}
            getOptionLabel={(option) => option.name}
            isOptionEqualToValue={(option, value) => option._id === value._id}
            value={selectedDistributorObj}
            onChange={(_, newValue) => {
              setSelectedDistributor(newValue?._id || '');
              setSelectedDistributorObj(newValue);
              setPage(0);
            }}
            onInputChange={(_, newInputValue) => {
              setDistributorSearchTerm(newInputValue);
            }}
            filterOptions={(x) => x}
            clearOnBlur={false}
            blurOnSelect={true}
            renderInput={(params) => (
              <TextField 
                {...params} 
                label="Filter by Distributor" 
                size="small"
                placeholder="Type to search..."
              />
            )}
            sx={{ minWidth: 300 }}
          />
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
            placeholder="Search voucher no, type..."
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
              title="Customer Ledger Report"
              fileBaseName="customer_ledger"
              currentRows={paginatedEntries}
              columns={ledgerExportColumns}
              onFetchAll={fetchAllEntries}
              disabled={loading || entries.length === 0}
            />

            <ColumnVisibilityMenu
              options={ledgerColumnVisibilityOptions}
              selected={visibleLedgerColumnIds.filter((id) => !defaultVisibleLedgerColumnIds.includes(id))}
              onChange={handleVisibleLedgerColumnsChange}
              onSaveSelection={handleSaveLedgerColumnSelection}
              saveDisabled={!ledgerHasUnsavedChanges}
              minSelectable={1}
            />

            <ToggleButtonGroup value={viewMode} exclusive onChange={(_, newMode) => newMode && setViewMode(newMode)} size="small">
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
          Showing {filteredEntries.length} of {entries.length} entries
        </Typography>

        {/* Cards View */}
        {viewMode === 'cards' && (
          <Grid container spacing={3}>
            {paginatedEntries.length === 0 ? (
              <Grid size={12}>
                <Paper sx={{ p: 4, textAlign: 'center' }}>
                  <LedgerIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
                  <Typography variant="h6" color="text.secondary" gutterBottom>
                    No ledger entries found
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {searchTerm ? 'Try adjusting your search terms' : 'Start by adding a new entry'}
                  </Typography>
                </Paper>
              </Grid>
            ) : (
              paginatedEntries.map((entry) => (
                <Grid size={{ xs: 12, sm: 6, md: 4 }} key={entry._id}>
                  <Card>
                    <CardContent>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                        <Typography variant="h6" component="div">
                          {entry.distributor_id?.name}
                        </Typography>
                        <Chip label={entry.voucher_type} size="small" color="primary" />
                      </Box>
                      <Typography variant="body2" color="text.secondary" gutterBottom>
                        <strong>Date:</strong> {new Date(entry.transaction_date).toLocaleDateString()}
                      </Typography>
                      <Typography variant="body2" color="text.secondary" gutterBottom>
                        <strong>Voucher No:</strong> {entry.voucher_no}
                      </Typography>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 2 }}>
                        <Box>
                          <Typography variant="caption" color="text.secondary">
                            Debit
                          </Typography>
                          <Typography variant="body1" color="error.main" sx={{ fontWeight: 'bold' }}>
                            {entry.debit > 0 ? entry.debit.toFixed(2) : '-'}
                          </Typography>
                        </Box>
                        <Box>
                          <Typography variant="caption" color="text.secondary">
                            Credit
                          </Typography>
                          <Typography variant="body1" color="success.main" sx={{ fontWeight: 'bold' }}>
                            {entry.credit > 0 ? entry.credit.toFixed(2) : '-'}
                          </Typography>
                        </Box>
                        <Box>
                          <Typography variant="caption" color="text.secondary">
                            Balance
                          </Typography>
                          <Typography variant="body1" color="primary.main" sx={{ fontWeight: 'bold' }}>
                            {entry.closing.toFixed(2)}
                          </Typography>
                        </Box>
                      </Box>
                    </CardContent>
                    <CardActions sx={{ justifyContent: 'flex-end', pt: 0 }}>
                      <Tooltip title="Edit">
                        <IconButton size="small" onClick={() => handleOpenDialog(entry)} color="primary">
                          <EditIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Delete">
                        <IconButton
                          size="small"
                          onClick={() => {
                            setEntryToDelete(entry._id);
                            setDeleteConfirmOpen(true);
                          }}
                          color="error"
                        >
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </CardActions>
                  </Card>
                </Grid>
              ))
            )}
          </Grid>
        )}

        {/* Table View */}
        {viewMode === 'list' && (
          <Paper>
            <TableContainer sx={{ overflowX: 'auto' }}>
              <Table sx={{ minWidth: tableMinWidth }}>
                <TableHead>
                  <TableRow>
                    {visibleLedgerColumns.map((col) => {
                      const isActions = col.id === 'actions';
                      return (
                        <TableCell 
                          key={col.id} 
                          align={col.align} 
                          sx={{ 
                            fontWeight: 'bold', 
                            minWidth: col.minWidth,
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
                          {col.sortableKey ? (
                            <TableSortLabel
                              active={orderBy === col.sortableKey}
                              direction={orderBy === col.sortableKey ? order : 'asc'}
                              onClick={() => handleSort(col.sortableKey!)}
                            >
                              {col.label}
                            </TableSortLabel>
                          ) : (
                            col.label
                          )}
                        </TableCell>
                      );
                    })}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {paginatedEntries.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={visibleLedgerColumns.length} align="center" sx={{ py: 5 }}>
                        <LedgerIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
                        <Typography variant="h6" color="text.secondary" gutterBottom>
                          No ledger entries found
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          {searchTerm ? 'Try adjusting your search terms' : 'Start by adding a new entry'}
                        </Typography>
                      </TableCell>
                    </TableRow>
                  ) : (
                    paginatedEntries.map((entry) => (
                      <TableRow key={entry._id} hover>
                        {visibleLedgerColumns.map((col) => {
                          const isActions = col.id === 'actions';
                          return (
                            <TableCell 
                              key={col.id} 
                              align={col.align}
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
                              {col.renderCell(entry)}
                            </TableCell>
                          );
                        })}
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </TableContainer>
            <TablePagination
              component="div"
              count={filteredEntries.length}
              page={page}
              onPageChange={handleChangePage}
              rowsPerPage={rowsPerPage}
              onRowsPerPageChange={handleChangeRowsPerPage}
              rowsPerPageOptions={[10, 25, 50, 100]}
            />
          </Paper>
        )}

        {/* Add/Edit Dialog */}
        <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="md" fullWidth>
          <DialogTitle>{editingEntry ? 'Edit Ledger Entry' : 'Add New Ledger Entry'}</DialogTitle>
          <form onSubmit={handleSubmit(onSubmit)}>
            <DialogContent>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <Controller
                  name="distributor_id"
                  control={control}
                  render={({ field }) => (
                    <Autocomplete
                      {...field}
                      options={distributorOptions}
                      loading={loadingDistributors}
                      getOptionLabel={(option) => {
                        if (typeof option === 'string') {
                          const dist = distributorOptions.find((d) => d._id === option);
                          return dist ? dist.name : '';
                        }
                        return option.name;
                      }}
                      isOptionEqualToValue={(option, value) => option._id === value._id}
                      value={distributorOptions.find((d) => d._id === field.value) || null}
                      onChange={(_, newValue) => field.onChange(newValue?._id || '')}
                      onInputChange={(_, newInputValue) => {
                        setDistributorSearchTerm(newInputValue);
                      }}
                      filterOptions={(x) => x}
                      clearOnBlur={false}
                      blurOnSelect={true}
                      disabled={!!editingEntry}
                      renderInput={(params) => (
                        <TextField 
                          {...params} 
                          label="Distributor" 
                          placeholder="Type to search..."
                          error={!!errors.distributor_id} 
                          helperText={errors.distributor_id?.message} 
                        />
                      )}
                    />
                  )}
                />

                <Controller
                  name="particulars"
                  control={control}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      label="Particulars"
                      fullWidth
                      multiline
                      rows={3}
                      error={!!errors.particulars}
                      helperText={errors.particulars?.message}
                    />
                  )}
                />

                <Box sx={{ display: 'flex', gap: 2 }}>
                  <Controller
                    name="transaction_date"
                    control={control}
                    render={({ field }) => (
                      <TextField
                        {...field}
                        label="Transaction Date"
                        type="date"
                        fullWidth
                        InputLabelProps={{ shrink: true }}
                        error={!!errors.transaction_date}
                        helperText={errors.transaction_date?.message}
                      />
                    )}
                  />

                  <Controller
                    name="voucher_type"
                    control={control}
                    render={({ field }) => (
                      <TextField
                        {...field}
                        label="Voucher Type"
                        fullWidth
                        error={!!errors.voucher_type}
                        helperText={errors.voucher_type?.message}
                      />
                    )}
                  />

                  <Controller
                    name="voucher_no"
                    control={control}
                    render={({ field }) => (
                      <TextField
                        {...field}
                        label="Voucher Number"
                        fullWidth
                        error={!!errors.voucher_no}
                        helperText={errors.voucher_no?.message}
                      />
                    )}
                  />
                </Box>

                <Box sx={{ display: 'flex', gap: 2 }}>
                  <Controller
                    name="debit"
                    control={control}
                    render={({ field }) => (
                      <TextField
                        {...field}
                        type="number"
                        label="Debit Amount"
                        fullWidth
                        inputProps={{ min: 0, step: 0.01 }}
                        error={!!errors.debit}
                        helperText={errors.debit?.message}
                        onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                        disabled={creditValue > 0}
                        InputProps={{
                          startAdornment: (
                            <InputAdornment position="start">
                              <DebitIcon color="error" />
                            </InputAdornment>
                          ),
                        }}
                      />
                    )}
                  />

                  <Controller
                    name="credit"
                    control={control}
                    render={({ field }) => (
                      <TextField
                        {...field}
                        type="number"
                        label="Credit Amount"
                        fullWidth
                        inputProps={{ min: 0, step: 0.01 }}
                        error={!!errors.credit}
                        helperText={errors.credit?.message}
                        onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                        disabled={debitValue > 0}
                        InputProps={{
                          startAdornment: (
                            <InputAdornment position="start">
                              <CreditIcon color="success" />
                            </InputAdornment>
                          ),
                        }}
                      />
                    )}
                  />
                </Box>

                <Controller
                  name="note"
                  control={control}
                  render={({ field }) => <TextField {...field} label="Note" fullWidth multiline rows={3} />}
                />
              </Box>
            </DialogContent>
            <DialogActions>
              <Button onClick={handleCloseDialog}>Cancel</Button>
              <Button type="submit" variant="contained" disabled={isSubmitting}>
                {editingEntry ? 'Update' : 'Create'}
              </Button>
            </DialogActions>
          </form>
        </Dialog>

        {/* Delete Confirmation Dialog */}
        <Dialog open={deleteConfirmOpen} onClose={handleDeleteCancel}>
          <DialogTitle>Confirm Deletion</DialogTitle>
          <DialogContent>
            <Typography>Are you sure you want to delete this ledger entry? This action cannot be undone.</Typography>
          </DialogContent>
          <DialogActions>
            <Button onClick={handleDeleteCancel}>Cancel</Button>
            <Button onClick={handleDeleteConfirm} color="error" variant="contained">
              Delete
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
  );
}
