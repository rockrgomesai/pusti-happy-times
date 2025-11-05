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
  FormControlLabel,
  Switch,
  Chip,
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Search as SearchIcon,
  AccountBalance as BankIcon,
  ViewList as ViewListIcon,
  ViewModule as ViewModuleIcon,
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

interface Bank {
  _id: string;
  sales_organization: string;
  bank_name: string;
  account_no: string;
  active: boolean;
  created_at: string;
  created_by?: { username: string } | null;
  updated_at: string;
  updated_by?: { username: string } | null;
}

const bankSchema = z.object({
  sales_organization: z.string().min(2, 'Sales organization must be at least 2 characters'),
  bank_name: z.string().min(2, 'Bank name must be at least 2 characters'),
  account_no: z.string().min(5, 'Account number must be at least 5 characters'),
  active: z.boolean(),
});

type BankFormData = z.infer<typeof bankSchema>;

type Order = 'asc' | 'desc';
type OrderableKeys = 'sales_organization' | 'bank_name' | 'account_no' | 'active' | 'created_at' | 'updated_at' | 'created_by' | 'updated_by';

interface BankColumnDefinition {
  id: string;
  label: string;
  sortableKey?: OrderableKeys;
  align?: 'inherit' | 'left' | 'center' | 'right' | 'justify';
  alwaysVisible?: boolean;
  minWidth?: number;
  renderCell: (bank: Bank) => React.ReactNode;
}

const BANK_COLUMN_STORAGE_KEY = 'master:banks:visibleColumns';

const getBankErrorMessage = (error: unknown, fallback: string): string => {
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

export default function BanksPage() {
  const [banks, setBanks] = useState<Bank[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'cards' | 'list'>('cards');
  const [searchTerm, setSearchTerm] = useState('');
  const [openDialog, setOpenDialog] = useState(false);
  const [editingBank, setEditingBank] = useState<Bank | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [bankToDelete, setBankToDelete] = useState<string | null>(null);

  // Sorting and pagination state
  const [orderBy, setOrderBy] = useState<OrderableKeys>('bank_name');
  const [order, setOrder] = useState<Order>('asc');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [visibleBankColumnIds, setVisibleBankColumnIds] = useState<string[]>([]);
  const [persistedBankColumnIds, setPersistedBankColumnIds] = useState<string[]>([]);
  const bankColumnStateHydratedRef = useRef(false);

  const bankExportColumns = useMemo<ExportColumn<Bank>[]>(
    () => [
      {
        header: 'Sales Organization',
        accessor: (row) => row.sales_organization,
      },
      {
        header: 'Bank Name',
        accessor: (row) => row.bank_name,
      },
      {
        header: 'Account Number',
        accessor: (row) => row.account_no,
      },
      {
        header: 'Status',
        accessor: (row) => (row.active ? 'Active' : 'Inactive'),
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

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<BankFormData>({
    resolver: zodResolver(bankSchema),
    defaultValues: {
      sales_organization: '',
      bank_name: '',
      account_no: '',
      active: true,
    },
  });

  const loadBanks = useCallback(async () => {
    try {
      setLoading(true);
      const response = await api.get('/master/banks', {
        params: { page: 1, limit: 1000 },
      });
      const banksData = response.data?.data?.banks && Array.isArray(response.data.data.banks)
        ? response.data.data.banks
        : [];
      setBanks(banksData);
    } catch (error: unknown) {
      toast.error('Failed to load banks');
      console.error('Error loading banks:', error);
      setBanks([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadBanks();
  }, [loadBanks]);

  const filteredBanks = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    if (!query) {
      return banks;
    }
    return banks.filter(
      (bank) =>
        bank.sales_organization.toLowerCase().includes(query) ||
        bank.bank_name.toLowerCase().includes(query) ||
        bank.account_no.toLowerCase().includes(query)
    );
  }, [banks, searchTerm]);

  const handleSort = useCallback(
    (property: OrderableKeys) => {
      const isAsc = orderBy === property && order === 'asc';
      setOrder(isAsc ? 'desc' : 'asc');
      setOrderBy(property);
      setPage(0);
    },
    [order, orderBy]
  );

  const sortedBanks = useMemo(() => {
    const next = [...filteredBanks];
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
  }, [filteredBanks, order, orderBy]);

  const fetchAllBanks = useCallback(async () => [...sortedBanks], [sortedBanks]);

  const paginatedBanks = useMemo(() => {
    const startIndex = page * rowsPerPage;
    return sortedBanks.slice(startIndex, startIndex + rowsPerPage);
  }, [sortedBanks, page, rowsPerPage]);

  const bankColumnDefinitions = useMemo<BankColumnDefinition[]>(
    () => [
      {
        id: 'sales_organization',
        label: 'Sales Organization',
        sortableKey: 'sales_organization',
        alwaysVisible: true,
        minWidth: 150,
        renderCell: (bank) => bank.sales_organization,
      },
      {
        id: 'bank_name',
        label: 'Bank Name',
        sortableKey: 'bank_name',
        alwaysVisible: true,
        minWidth: 180,
        renderCell: (bank) => bank.bank_name,
      },
      {
        id: 'account_no',
        label: 'Account Number',
        sortableKey: 'account_no',
        minWidth: 150,
        renderCell: (bank) => bank.account_no,
      },
      {
        id: 'active',
        label: 'Status',
        sortableKey: 'active',
        align: 'center',
        minWidth: 100,
        renderCell: (bank) => (
          <Chip label={bank.active ? 'Active' : 'Inactive'} color={bank.active ? 'success' : 'default'} size="small" />
        ),
      },
      {
        id: 'created_by',
        label: 'Created By',
        sortableKey: 'created_by',
        minWidth: 120,
        renderCell: (bank) => bank.created_by?.username ?? '-',
      },
      {
        id: 'updated_by',
        label: 'Updated By',
        sortableKey: 'updated_by',
        minWidth: 120,
        renderCell: (bank) => bank.updated_by?.username ?? '-',
      },
      {
        id: 'created_at',
        label: 'Created Date',
        sortableKey: 'created_at',
        minWidth: 120,
        renderCell: (bank) => new Date(bank.created_at).toLocaleDateString(),
      },
      {
        id: 'updated_at',
        label: 'Updated Date',
        sortableKey: 'updated_at',
        minWidth: 120,
        renderCell: (bank) => new Date(bank.updated_at).toLocaleDateString(),
      },
      {
        id: 'actions',
        label: 'Actions',
        align: 'center',
        alwaysVisible: true,
        minWidth: 100,
        renderCell: (bank) => (
          <Box sx={{ display: 'flex', justifyContent: 'center', gap: 0.5 }}>
            <Tooltip title="Edit">
              <IconButton size="small" onClick={() => handleOpenDialog(bank)} color="primary">
                <EditIcon fontSize="small" />
              </IconButton>
            </Tooltip>
            <Tooltip title="Deactivate">
              <IconButton
                size="small"
                onClick={() => {
                  setBankToDelete(bank._id);
                  setDeleteConfirmOpen(true);
                }}
                color="error"
                disabled={!bank.active}
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

  const defaultVisibleBankColumnIds = useMemo(
    () => bankColumnDefinitions.filter((col) => col.alwaysVisible).map((col) => col.id),
    [bankColumnDefinitions]
  );

  useEffect(() => {
    if (bankColumnStateHydratedRef.current) return;
    bankColumnStateHydratedRef.current = true;

    try {
      const saved = localStorage.getItem(BANK_COLUMN_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setVisibleBankColumnIds(parsed);
          setPersistedBankColumnIds(parsed);
          return;
        }
      }
    } catch (e) {
      console.error('Failed to load column visibility from localStorage', e);
    }

    const initial = [...defaultVisibleBankColumnIds, 'account_no', 'active', 'created_by'];
    setVisibleBankColumnIds(initial);
    setPersistedBankColumnIds(initial);
  }, [defaultVisibleBankColumnIds]);

  const visibleBankColumns = useMemo(
    () => bankColumnDefinitions.filter((col) => visibleBankColumnIds.includes(col.id)),
    [bankColumnDefinitions, visibleBankColumnIds]
  );

  const bankColumnVisibilityOptions = useMemo(
    () =>
      bankColumnDefinitions
        .filter((col) => !col.alwaysVisible)
        .map((col) => ({ id: col.id, label: col.label })),
    [bankColumnDefinitions]
  );

  const bankHasUnsavedChanges = useMemo(() => {
    if (visibleBankColumnIds.length !== persistedBankColumnIds.length) return true;
    return !visibleBankColumnIds.every((id) => persistedBankColumnIds.includes(id));
  }, [visibleBankColumnIds, persistedBankColumnIds]);

  const handleVisibleBankColumnsChange = useCallback((newIds: string[]) => {
    setVisibleBankColumnIds([...defaultVisibleBankColumnIds, ...newIds]);
  }, [defaultVisibleBankColumnIds]);

  const handleSaveBankColumnSelection = useCallback(() => {
    try {
      localStorage.setItem(BANK_COLUMN_STORAGE_KEY, JSON.stringify(visibleBankColumnIds));
      setPersistedBankColumnIds([...visibleBankColumnIds]);
      toast.success('Column visibility saved!');
    } catch (e) {
      console.error('Failed to save column visibility', e);
      toast.error('Failed to save column visibility');
    }
  }, [visibleBankColumnIds]);

  const tableMinWidth = useMemo(() => calculateTableMinWidth(visibleBankColumns), [visibleBankColumns]);

  const handleOpenDialog = (bank?: Bank) => {
    if (bank) {
      setEditingBank(bank);
      reset({
        sales_organization: bank.sales_organization,
        bank_name: bank.bank_name,
        account_no: bank.account_no,
        active: bank.active,
      });
    } else {
      setEditingBank(null);
      reset({
        sales_organization: '',
        bank_name: '',
        account_no: '',
        active: true,
      });
    }
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setEditingBank(null);
    reset();
  };

  const onSubmit = useCallback(
    async (data: BankFormData) => {
      try {
        if (editingBank) {
          await api.put(`/master/banks/${editingBank._id}`, data);
          toast.success('Bank updated successfully');
        } else {
          await api.post('/master/banks', data);
          toast.success('Bank created successfully');
        }

        setOpenDialog(false);
        reset();
        setEditingBank(null);
        loadBanks();
      } catch (error: unknown) {
        toast.error(getBankErrorMessage(error, 'Failed to save bank'));
      }
    },
    [editingBank, reset, loadBanks]
  );

  const handleDeleteConfirm = useCallback(async () => {
    if (!bankToDelete) return;

    try {
      await api.delete(`/master/banks/${bankToDelete}`);
      toast.success('Bank deactivated successfully');
      setDeleteConfirmOpen(false);
      setBankToDelete(null);
      loadBanks();
    } catch (error: unknown) {
      toast.error(getBankErrorMessage(error, 'Failed to deactivate bank'));
    }
  }, [bankToDelete, loadBanks]);

  const handleDeleteCancel = useCallback(() => {
    setDeleteConfirmOpen(false);
    setBankToDelete(null);
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
          Bank Management
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
        <Typography variant="h4" component="h1">
          Bank Management
        </Typography>
        <Button variant="contained" startIcon={<AddIcon />} onClick={() => handleOpenDialog()} sx={{ minWidth: 'max-content' }}>
          Add Bank
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
          placeholder="Search banks..."
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
            title="Bank Report"
            fileBaseName="banks"
            currentRows={paginatedBanks}
            columns={bankExportColumns}
            onFetchAll={fetchAllBanks}
            disabled={loading || (banks.length === 0 && paginatedBanks.length === 0)}
          />

          <ColumnVisibilityMenu
            options={bankColumnVisibilityOptions}
            selected={visibleBankColumnIds.filter((id) => !defaultVisibleBankColumnIds.includes(id))}
            onChange={handleVisibleBankColumnsChange}
            onSaveSelection={handleSaveBankColumnSelection}
            saveDisabled={!bankHasUnsavedChanges}
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
        Showing {filteredBanks.length} of {banks.length} banks
      </Typography>

      {/* Cards View */}
      {viewMode === 'cards' && (
        <Grid container spacing={3}>
          {paginatedBanks.length === 0 ? (
            <Grid size={12}>
              <Paper sx={{ p: 4, textAlign: 'center' }}>
                <BankIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
                <Typography variant="h6" color="text.secondary" gutterBottom>
                  No banks found
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {searchTerm ? 'Try adjusting your search terms' : 'Start by adding a new bank'}
                </Typography>
              </Paper>
            </Grid>
          ) : (
            paginatedBanks.map((bank) => (
              <Grid size={{ xs: 12, sm: 6, md: 4 }} key={bank._id}>
                <Card>
                  <CardContent>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                      <Typography variant="h6" component="div" sx={{ wordBreak: 'break-word' }}>
                        {bank.bank_name}
                      </Typography>
                      <Chip label={bank.active ? 'Active' : 'Inactive'} color={bank.active ? 'success' : 'default'} size="small" />
                    </Box>
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                      <strong>Organization:</strong> {bank.sales_organization}
                    </Typography>
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                      <strong>Account:</strong> {bank.account_no}
                    </Typography>
                    <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 1 }}>
                      Updated: {new Date(bank.updated_at).toLocaleDateString()}
                    </Typography>
                  </CardContent>
                  <CardActions sx={{ justifyContent: 'flex-end', pt: 0 }}>
                    <Tooltip title="Edit">
                      <IconButton size="small" onClick={() => handleOpenDialog(bank)} color="primary">
                        <EditIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Deactivate">
                      <IconButton
                        size="small"
                        onClick={() => {
                          setBankToDelete(bank._id);
                          setDeleteConfirmOpen(true);
                        }}
                        color="error"
                        disabled={!bank.active}
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
                  {visibleBankColumns.map((col) => (
                    <TableCell key={col.id} align={col.align} sx={{ fontWeight: 'bold', minWidth: col.minWidth }}>
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
                  ))}
                </TableRow>
              </TableHead>
              <TableBody>
                {paginatedBanks.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={visibleBankColumns.length} align="center" sx={{ py: 5 }}>
                      <BankIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
                      <Typography variant="h6" color="text.secondary" gutterBottom>
                        No banks found
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {searchTerm ? 'Try adjusting your search terms' : 'Start by adding a new bank'}
                      </Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  paginatedBanks.map((bank) => (
                    <TableRow key={bank._id} hover>
                      {visibleBankColumns.map((col) => (
                        <TableCell key={col.id} align={col.align}>
                          {col.renderCell(bank)}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
          <TablePagination
            component="div"
            count={filteredBanks.length}
            page={page}
            onPageChange={handleChangePage}
            rowsPerPage={rowsPerPage}
            onRowsPerPageChange={handleChangeRowsPerPage}
            rowsPerPageOptions={[5, 10, 25, 50, 100]}
          />
        </Paper>
      )}

      {/* FAB for mobile */}
      <Fab
        color="primary"
        aria-label="add"
        sx={{
          position: 'fixed',
          bottom: 16,
          right: 16,
          display: { xs: 'flex', sm: 'none' },
        }}
        onClick={() => handleOpenDialog()}
      >
        <AddIcon />
      </Fab>

      {/* Add/Edit Dialog */}
      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
        <DialogTitle>{editingBank ? 'Edit Bank' : 'Add New Bank'}</DialogTitle>
        <form onSubmit={handleSubmit(onSubmit)}>
          <DialogContent>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <Controller
                name="sales_organization"
                control={control}
                render={({ field }) => (
                  <TextField {...field} label="Sales Organization" fullWidth error={!!errors.sales_organization} helperText={errors.sales_organization?.message} />
                )}
              />

              <Controller
                name="bank_name"
                control={control}
                render={({ field }) => (
                  <TextField {...field} label="Bank Name" fullWidth error={!!errors.bank_name} helperText={errors.bank_name?.message} />
                )}
              />

              <Controller
                name="account_no"
                control={control}
                render={({ field }) => (
                  <TextField {...field} label="Account Number" fullWidth error={!!errors.account_no} helperText={errors.account_no?.message} />
                )}
              />

              <Controller
                name="active"
                control={control}
                render={({ field }) => (
                  <FormControlLabel
                    control={<Switch checked={field.value} onChange={(e) => field.onChange(e.target.checked)} />}
                    label="Active"
                  />
                )}
              />
            </Box>
          </DialogContent>
          <DialogActions>
            <Button onClick={handleCloseDialog}>Cancel</Button>
            <Button type="submit" variant="contained" disabled={isSubmitting}>
              {editingBank ? 'Update' : 'Create'}
            </Button>
          </DialogActions>
        </form>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteConfirmOpen} onClose={handleDeleteCancel}>
        <DialogTitle>Confirm Deactivation</DialogTitle>
        <DialogContent>
          <Typography>Are you sure you want to deactivate this bank? This action will set the bank status to inactive.</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleDeleteCancel}>Cancel</Button>
          <Button onClick={handleDeleteConfirm} color="error" variant="contained">
            Deactivate
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
