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
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  Switch,
  FormControlLabel,
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Person as PersonIcon,
  ViewList as ViewListIcon,
  ViewModule as ViewModuleIcon,
  Search as SearchIcon,
  Email as EmailIcon,
} from '@mui/icons-material';
import { TableSortLabel, TablePagination } from '@mui/material';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'react-hot-toast';
import api from '@/lib/api';
import ColumnVisibilityMenu from '@/components/common/ColumnVisibilityMenu';
import { calculateTableMinWidth } from '@/lib/tableUtils';

// User type definition (matches backend model exactly)
interface User {
  _id: string;
  username: string;
  email: string;
  role_id: {
    _id: string;
    role: string;
  };
  active: boolean;
  created_at: string;
  updated_at: string;
  created_by?: { username: string } | null;
  updated_by?: { username: string } | null;
}

// Role type for form dropdown
interface Role {
  _id: string;
  role: string;
}

// User form schema (matches actual database fields)
const userSchema = z.object({
  username: z.string().min(3, 'Username must be at least 3 characters'),
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters').optional(),
  role_id: z.string().min(1, 'Role is required'),
  active: z.boolean(),
});

type UserFormData = z.infer<typeof userSchema>;

const USER_COLUMN_STORAGE_KEY = 'admin-users-visible-columns-v1';

interface UserColumnDefinition {
  id: string;
  label: string;
  sortableKey?: keyof User;
  align?: 'inherit' | 'left' | 'center' | 'right' | 'justify';
  alwaysVisible?: boolean;
  renderCell: (user: User) => React.ReactNode;
}

export default function UsersPage() {
  // State management
  const [users, setUsers] = useState<User[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'cards' | 'list'>('cards');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterRole, setFilterRole] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [openDialog, setOpenDialog] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  
  // Sorting and pagination state
  const [orderBy, setOrderBy] = useState<keyof User>('username');
  const [order, setOrder] = useState<'asc' | 'desc'>('asc');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState<string | null>(null);
  const [visibleUserColumnIds, setVisibleUserColumnIds] = useState<string[]>([]);
  const [persistedUserColumnIds, setPersistedUserColumnIds] = useState<string[]>([]);
  const userColumnStateHydratedRef = useRef(false);

  // Form setup
  const {
    control,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<UserFormData>({
    resolver: zodResolver(userSchema),
    defaultValues: {
      username: '',
      email: '',
      password: '',
      role_id: '',
      active: true,
    },
  });

  // Load users
  const loadUsers = async () => {
    try {
      setLoading(true);
      const response = await api.get('/users');
      
      // Extract users array from API response
      const usersData = response.data?.data && Array.isArray(response.data.data) 
        ? response.data.data 
        : [];
      
      setUsers(usersData);
    } catch (error) {
      toast.error('Failed to load users');
      console.error('Error loading users:', error);
      setUsers([]);
    } finally {
      setLoading(false);
    }
  };

  // Load roles for dropdown
  const loadRoles = async () => {
    try {
      const response = await api.get('/roles');
      const rolesData = response.data?.data && Array.isArray(response.data.data) 
        ? response.data.data 
        : [];
      setRoles(rolesData);
    } catch (error) {
      console.error('Error loading roles:', error);
      setRoles([]);
    }
  };

  useEffect(() => {
    loadUsers();
    loadRoles();
  }, []);

  // Filter users based on search and filters
  const filteredUsers = users.filter((user) => {
    const matchesSearch = 
      user.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.role_id.role.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesRole = !filterRole || user.role_id._id === filterRole;
    const matchesStatus = !filterStatus || 
      (filterStatus === 'active' && user.active) ||
      (filterStatus === 'inactive' && !user.active);
    
    return matchesSearch && matchesRole && matchesStatus;
  });

  // Sorting function
  const handleSort = (property: keyof User) => {
    const isAsc = orderBy === property && order === 'asc';
    setOrder(isAsc ? 'desc' : 'asc');
    setOrderBy(property);
    setPage(0); // Reset to first page when sorting
  };

  // Sort the filtered users
  const sortedUsers = [...filteredUsers].sort((a, b) => {
    let aValue: unknown, bValue: unknown;
    
    if (orderBy === 'role_id') {
      aValue = a.role_id.role;
      bValue = b.role_id.role;
    } else if (orderBy === 'created_at') {
      aValue = new Date(a.created_at).getTime();
      bValue = new Date(b.created_at).getTime();
    } else {
      aValue = a[orderBy];
      bValue = b[orderBy];
    }
    
    // Handle null/undefined values
    if (aValue == null && bValue == null) return 0;
    if (aValue == null) return order === 'asc' ? -1 : 1;
    if (bValue == null) return order === 'asc' ? 1 : -1;
    
    // Convert to comparable values
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
    } else {
      return aCompare > bCompare ? -1 : aCompare < bCompare ? 1 : 0;
    }
  });

  // Paginate the sorted users
  const paginatedUsers = sortedUsers.slice(
    page * rowsPerPage,
    page * rowsPerPage + rowsPerPage
  );

  // Pagination handlers
  const handleChangePage = (event: unknown, newPage: number) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  // Handle form submission
  const onSubmit = async (data: UserFormData) => {
    try {
      const submitData = {
        ...data,
        // Only include password if it's provided (for create) or if editing and password is changed
        ...(data.password && data.password.length > 0 ? { password: data.password } : {}),
      };

      if (editingUser) {
        // Remove password from update if empty
        if (!data.password || data.password.length === 0) {
          delete submitData.password;
        }
  await api.put(`/users/${editingUser._id}`, submitData);
        toast.success('User updated successfully');
      } else {
        await api.post('/users', submitData);
        toast.success('User created successfully');
      }
      
      setOpenDialog(false);
      reset();
      setEditingUser(null);
      loadUsers();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to save user';
      toast.error(errorMessage);
    }
  };

  // Handle delete user
  const handleDeleteUser = async () => {
    if (!userToDelete) return;
    
    try {
  await api.delete(`/users/${userToDelete}`);
      toast.success('User deleted successfully');
      setDeleteConfirmOpen(false);
      setUserToDelete(null);
      loadUsers();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to delete user';
      toast.error(errorMessage);
    }
  };

  // Handle edit user
  const handleEditUser = useCallback((user: User) => {
    setEditingUser(user);
    reset({
      username: user.username,
      email: user.email,
      password: '', // Don't populate password for security
      role_id: user.role_id._id,
      active: user.active,
    });
    setOpenDialog(true);
  }, [reset]);

  // Handle add new user
  const handleAddUser = () => {
    setEditingUser(null);
    reset();
    setOpenDialog(true);
  };

  // Format date
  const formatDate = useCallback((dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-BD', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  }, []);

  // Get status chip color
  const getStatusColor = useCallback((active: boolean) => {
    return active ? 'success' : 'error';
  }, []);

  const userColumns = useMemo<UserColumnDefinition[]>(
    () => [
      {
        id: 'username',
        label: 'Username',
        sortableKey: 'username',
        renderCell: (user) => (
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <PersonIcon sx={{ mr: 1, color: 'primary.main', fontSize: 20 }} />
            <Typography variant="body1" fontWeight="medium">
              {user.username}
            </Typography>
          </Box>
        ),
      },
      {
        id: 'email',
        label: 'Email',
        sortableKey: 'email',
        renderCell: (user) => user.email,
      },
      {
        id: 'role',
        label: 'Role',
        sortableKey: 'role_id',
        renderCell: (user) => (
          <Typography variant="body2" color="primary.main">
            {user.role_id.role}
          </Typography>
        ),
      },
      {
        id: 'status',
        label: 'Status',
        sortableKey: 'active',
        renderCell: (user) => (
          <Chip
            label={user.active ? 'Active' : 'Inactive'}
            color={getStatusColor(user.active)}
            size="small"
          />
        ),
      },
      {
        id: 'created_at',
        label: 'Created Date',
        sortableKey: 'created_at',
        renderCell: (user) => formatDate(user.created_at),
      },
      {
        id: 'actions',
        label: 'Actions',
        alwaysVisible: true,
        align: 'right',
        renderCell: (user) => (
          <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1 }}>
            <Tooltip title="Edit User">
              <IconButton size="small" onClick={() => handleEditUser(user)} color="primary">
                <EditIcon />
              </IconButton>
            </Tooltip>
            <Tooltip title="Delete User">
              <IconButton
                size="small"
                onClick={() => {
                  setUserToDelete(user._id);
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
    [formatDate, getStatusColor, handleEditUser]
  );

  const selectableUserColumnIds = useMemo(
    () => userColumns.filter((column) => !column.alwaysVisible).map((column) => column.id),
    [userColumns]
  );

  const sanitizeUserSelection = useCallback(
    (ids: string[]) => selectableUserColumnIds.filter((id) => ids.includes(id)),
    [selectableUserColumnIds]
  );

  const handleVisibleUserColumnsChange = useCallback(
    (nextSelected: string[]) => {
      const sanitized = sanitizeUserSelection(nextSelected);
      setVisibleUserColumnIds(sanitized.length ? sanitized : selectableUserColumnIds);
    },
    [sanitizeUserSelection, selectableUserColumnIds]
  );

  const userColumnVisibilityOptions = useMemo(
    () => userColumns.map(({ id, label, alwaysVisible }) => ({ id, label, alwaysVisible })),
    [userColumns]
  );

  useEffect(() => {
    if (!selectableUserColumnIds.length) {
      setVisibleUserColumnIds([]);
      setPersistedUserColumnIds([]);
      return;
    }

    if (!userColumnStateHydratedRef.current) {
      userColumnStateHydratedRef.current = true;

      let initialSelection = selectableUserColumnIds;

      try {
        const stored = window.localStorage.getItem(USER_COLUMN_STORAGE_KEY);
        if (stored) {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed)) {
            const sanitized = sanitizeUserSelection(parsed);
            if (sanitized.length) {
              initialSelection = sanitized;
            }
          }
        }
      } catch (error) {
        console.warn('Failed to read user column preferences', error);
      }

      setVisibleUserColumnIds(initialSelection);
      setPersistedUserColumnIds(initialSelection);
      return;
    }

    setVisibleUserColumnIds((previous) => {
      const sanitizedPrevious = sanitizeUserSelection(previous);
      if (sanitizedPrevious.length) {
        return sanitizedPrevious;
      }
      return selectableUserColumnIds;
    });

    setPersistedUserColumnIds((previous) => {
      const sanitizedPrevious = sanitizeUserSelection(previous);
      if (sanitizedPrevious.length) {
        return sanitizedPrevious;
      }
      return selectableUserColumnIds;
    });
  }, [sanitizeUserSelection, selectableUserColumnIds]);

  const userHasUnsavedChanges = useMemo(() => {
    if (visibleUserColumnIds.length !== persistedUserColumnIds.length) {
      return true;
    }
    const persistedSet = new Set(persistedUserColumnIds);
    return visibleUserColumnIds.some((id) => !persistedSet.has(id));
  }, [persistedUserColumnIds, visibleUserColumnIds]);

  const handleSaveUserColumnSelection = useCallback(() => {
    const sanitized = sanitizeUserSelection(visibleUserColumnIds);
    setVisibleUserColumnIds(sanitized);
    setPersistedUserColumnIds(sanitized);
    try {
      window.localStorage.setItem(USER_COLUMN_STORAGE_KEY, JSON.stringify(sanitized));
      toast.success('Column selection saved');
    } catch (error) {
      console.warn('Failed to persist user column preferences', error);
      toast.error('Failed to save column selection');
    }
  }, [sanitizeUserSelection, visibleUserColumnIds]);

  const visibleUserColumns = useMemo(() => {
    if (!visibleUserColumnIds.length || !selectableUserColumnIds.length) {
      return userColumns;
    }

    return userColumns.filter(
      (column) => column.alwaysVisible || visibleUserColumnIds.includes(column.id)
    );
  }, [selectableUserColumnIds, userColumns, visibleUserColumnIds]);

  const userTableMinWidth = useMemo(
    () => calculateTableMinWidth(visibleUserColumns.length || userColumns.length),
    [userColumns, visibleUserColumns]
  );

  const menuSelectedUserColumnIds = visibleUserColumnIds.length
    ? visibleUserColumnIds
    : selectableUserColumnIds;

  // Render cards view
  const renderCardsView = () => (
    <>
      <Grid container spacing={2}>
      {paginatedUsers.map((user) => (
        <Grid size={{ xs: 12, sm: 6, md: 4 }} key={user._id}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <PersonIcon sx={{ mr: 1, color: 'primary.main' }} />
                <Typography variant="h6" component="h2">
                  {user.username}
                </Typography>
                <Chip
                  label={user.active ? 'Active' : 'Inactive'}
                  color={getStatusColor(user.active)}
                  size="small"
                  sx={{ ml: 'auto' }}
                />
              </Box>
              
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <EmailIcon sx={{ mr: 1, fontSize: 16, color: 'text.secondary' }} />
                <Typography variant="body2" color="text.secondary">
                  {user.email}
                </Typography>
              </Box>
              
              <Typography variant="body2" color="primary.main" gutterBottom>
                Role: {user.role_id.role}
              </Typography>
              
              <Typography variant="body2" color="text.secondary">
                Created: {formatDate(user.created_at)}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Updated: {formatDate(user.updated_at)}
              </Typography>
            </CardContent>
            
            <CardActions sx={{ justifyContent: 'flex-end', pt: 0 }}>
              <Tooltip title="Edit User">
                <IconButton
                  size="small"
                  onClick={() => handleEditUser(user)}
                  color="primary"
                >
                  <EditIcon />
                </IconButton>
              </Tooltip>
              <Tooltip title="Delete User">
                <IconButton
                  size="small"
                  onClick={() => {
                    setUserToDelete(user._id);
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
        count={sortedUsers.length}
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
    <TableContainer component={Paper}>
      <Table sx={{ minWidth: userTableMinWidth }}>
        <TableHead>
          <TableRow>
            {visibleUserColumns.map((column) => {
              const isSortable = Boolean(column.sortableKey);
              return (
                <TableCell key={column.id} align={column.align}>
                  {isSortable ? (
                    <TableSortLabel
                      active={orderBy === column.sortableKey}
                      direction={orderBy === column.sortableKey ? order : 'asc'}
                      onClick={() => column.sortableKey && handleSort(column.sortableKey)}
                      sx={{
                        fontWeight: 'bold',
                        '& .MuiTableSortLabel-icon': {
                          fontSize: '1.2rem',
                        },
                      }}
                    >
                      {column.label}
                    </TableSortLabel>
                  ) : (
                    <Typography sx={{ fontWeight: 'bold' }}>{column.label}</Typography>
                  )}
                </TableCell>
              );
            })}
          </TableRow>
        </TableHead>
        <TableBody>
          {paginatedUsers.map((user) => (
            <TableRow key={user._id} hover>
              {visibleUserColumns.map((column) => (
                <TableCell key={column.id} align={column.align}>
                  {column.renderCell(user)}
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
      <TablePagination
        rowsPerPageOptions={[5, 10, 25, 50]}
        component="div"
        count={sortedUsers.length}
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

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <PersonIcon sx={{ mr: 2, color: 'primary.main' }} />
          <Typography variant="h4" component="h1" fontWeight="bold">
            User Management
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={handleAddUser}
        >
          Add User
        </Button>
      </Box>

      {/* Search and Filter Controls */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3, flexWrap: 'wrap', gap: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
          <TextField
            size="small"
            placeholder="Search users..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon />
                </InputAdornment>
              ),
            }}
            sx={{ minWidth: 200 }}
          />
          
          <FormControl size="small" sx={{ minWidth: 120 }}>
            <InputLabel>Role</InputLabel>
            <Select
              value={filterRole}
              onChange={(e) => setFilterRole(e.target.value)}
              label="Role"
            >
              <MenuItem value="">All Roles</MenuItem>
              {roles.map((role) => (
                <MenuItem key={role._id} value={role._id}>
                  {role.role}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          
          <FormControl size="small" sx={{ minWidth: 120 }}>
            <InputLabel>Status</InputLabel>
            <Select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              label="Status"
            >
              <MenuItem value="">All Status</MenuItem>
              <MenuItem value="active">Active</MenuItem>
              <MenuItem value="inactive">Inactive</MenuItem>
            </Select>
          </FormControl>
        </Box>
        
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap' }}>
          <ColumnVisibilityMenu
            options={userColumnVisibilityOptions}
            selected={menuSelectedUserColumnIds}
            onChange={handleVisibleUserColumnsChange}
            onSaveSelection={handleSaveUserColumnSelection}
            saveDisabled={!userHasUnsavedChanges}
            minSelectable={1}
          />

          <ToggleButtonGroup
            value={viewMode}
            exclusive
            onChange={(event, newViewMode) => {
              if (newViewMode !== null) {
                setViewMode(newViewMode);
              }
            }}
            aria-label="view mode"
            size="small"
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

      {/* Main Content */}
      {loading ? (
        <Grid container spacing={2}>
          {Array.from({ length: 6 }).map((_, index) => (
            <Grid size={{ xs: 12, sm: 6, md: 4 }} key={index}>
              <Card>
                <CardContent>
                  <Skeleton variant="text" width="60%" height={32} />
                  <Skeleton variant="text" width="80%" height={20} sx={{ mt: 1 }} />
                  <Skeleton variant="text" width="40%" height={20} sx={{ mt: 1 }} />
                  <Skeleton variant="text" width="70%" height={20} sx={{ mt: 1 }} />
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      ) : sortedUsers.length === 0 ? (
        <Alert severity="info">
          {searchTerm || filterRole || filterStatus
            ? 'No users found matching the current filters. Try adjusting your search criteria.'
            : 'No users found. Click "Add User" to create your first user.'
          }
        </Alert>
      ) : viewMode === 'cards' ? (
        renderCardsView()
      ) : (
        renderListView()
      )}

      {/* Add/Edit Dialog */}
      <Dialog 
        open={openDialog} 
        onClose={() => setOpenDialog(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          {editingUser ? 'Edit User' : 'Add New User'}
        </DialogTitle>
        <form onSubmit={handleSubmit(onSubmit)}>
          <DialogContent>
            <Grid container spacing={2}>
              <Grid size={12}>
                <Controller
                  name="username"
                  control={control}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      label="Username"
                      fullWidth
                      error={!!errors.username}
                      helperText={errors.username?.message}
                      margin="normal"
                      placeholder="Enter username"
                    />
                  )}
                />
              </Grid>
              
              <Grid size={12}>
                <Controller
                  name="email"
                  control={control}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      label="Email"
                      type="email"
                      fullWidth
                      error={!!errors.email}
                      helperText={errors.email?.message}
                      margin="normal"
                      placeholder="Enter email address"
                    />
                  )}
                />
              </Grid>
              
              <Grid size={12}>
                <Controller
                  name="password"
                  control={control}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      label={editingUser ? "New Password (leave blank to keep current)" : "Password"}
                      type="password"
                      fullWidth
                      error={!!errors.password}
                      helperText={errors.password?.message}
                      margin="normal"
                      placeholder="Enter password"
                    />
                  )}
                />
              </Grid>
              
              <Grid size={12}>
                <Controller
                  name="role_id"
                  control={control}
                  render={({ field }) => (
                    <FormControl fullWidth margin="normal" error={!!errors.role_id}>
                      <InputLabel>Role</InputLabel>
                      <Select
                        {...field}
                        label="Role"
                      >
                        {roles.map((role) => (
                          <MenuItem key={role._id} value={role._id}>
                            {role.role}
                          </MenuItem>
                        ))}
                      </Select>
                      {errors.role_id && (
                        <Typography variant="caption" color="error" sx={{ ml: 2, mt: 0.5 }}>
                          {errors.role_id.message}
                        </Typography>
                      )}
                    </FormControl>
                  )}
                />
              </Grid>
              
              <Grid size={12}>
                <Controller
                  name="active"
                  control={control}
                  render={({ field }) => (
                    <FormControlLabel
                      control={
                        <Switch
                          checked={field.value}
                          onChange={field.onChange}
                        />
                      }
                      label="Active User"
                      sx={{ mt: 1 }}
                    />
                  )}
                />
              </Grid>
            </Grid>
          </DialogContent>
          <DialogActions sx={{ p: 3 }}>
            <Button onClick={() => setOpenDialog(false)}>
              Cancel
            </Button>
            <Button 
              type="submit" 
              variant="contained"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Saving...' : (editingUser ? 'Update' : 'Create')}
            </Button>
          </DialogActions>
        </form>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteConfirmOpen} onClose={() => setDeleteConfirmOpen(false)}>
        <DialogTitle>Confirm Delete</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete this user? This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteConfirmOpen(false)}>
            Cancel
          </Button>
          <Button 
            onClick={handleDeleteUser}
            color="error"
            variant="contained"
          >
            Delete
          </Button>
        </DialogActions>
      </Dialog>

      {/* Floating Action Button for mobile */}
      <Fab
        color="primary"
        aria-label="add user"
        onClick={handleAddUser}
        sx={{
          position: 'fixed',
          bottom: 16,
          right: 16,
          display: { xs: 'flex', sm: 'none' },
        }}
      >
        <AddIcon />
      </Fab>
    </Box>
  );
}
