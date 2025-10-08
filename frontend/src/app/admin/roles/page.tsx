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
  Chip,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Fab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Skeleton,
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  ViewList as ViewListIcon,
  ViewModule as ViewModuleIcon,
  Search as SearchIcon,
  Security as SecurityIcon,
  Group as GroupIcon,
} from '@mui/icons-material';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'react-hot-toast';
import api from '@/lib/api';
import ColumnVisibilityMenu from '@/components/common/ColumnVisibilityMenu';
import { calculateTableMinWidth } from '@/lib/tableUtils';

// Role type definition matching backend
interface Role {
  _id: string;
  role: string;
  userCount?: number;
  createdAt?: string;
  updatedAt?: string;
}

// Role form schema
const roleSchema = z.object({
  role: z.string()
    .min(2, 'Role name must be at least 2 characters')
    .regex(/^[a-zA-Z0-9\s]+$/, 'Role name can only contain letters, numbers, and spaces'),
});

type RoleFormData = z.infer<typeof roleSchema>;

const ROLE_COLUMN_STORAGE_KEY = 'admin-roles-visible-columns-v1';

interface RoleColumnDefinition {
  id: string;
  label: string;
  align?: 'inherit' | 'left' | 'center' | 'right' | 'justify';
  alwaysVisible?: boolean;
  renderCell: (role: Role) => React.ReactNode;
}

export default function RolesPage() {
  // State management
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'cards' | 'list'>('cards');
  const [searchTerm, setSearchTerm] = useState('');
  const [openDialog, setOpenDialog] = useState(false);
  const [editingRole, setEditingRole] = useState<Role | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [roleToDelete, setRoleToDelete] = useState<string | null>(null);
  const [visibleRoleColumnIds, setVisibleRoleColumnIds] = useState<string[]>([]);
  const [persistedRoleColumnIds, setPersistedRoleColumnIds] = useState<string[]>([]);
  const roleColumnStateHydratedRef = useRef(false);

  // Form setup
  const {
    control,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<RoleFormData>({
    resolver: zodResolver(roleSchema),
    defaultValues: {
      role: '',
    },
  });

  // Load roles
  const loadRoles = async () => {
    try {
      setLoading(true);
      const response = await api.get('/roles');
      if (response.data.success) {
        setRoles(response.data.data);
      } else {
        throw new Error(response.data.message || 'Failed to load roles');
      }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to load roles';
      toast.error(errorMessage);
      console.error('Error loading roles:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRoles();
  }, []);

  // Filter roles based on search
  const filteredRoles = roles.filter((role) => {
    return role.role.toLowerCase().includes(searchTerm.toLowerCase());
  });

  // Handle form submission
  const onSubmit = async (data: RoleFormData) => {
    try {
      if (editingRole) {
        const response = await api.put(`/api/roles/${editingRole._id}`, data);
        if (response.data.success) {
          toast.success('Role updated successfully');
        } else {
          throw new Error(response.data.message || 'Failed to update role');
        }
      } else {
        const response = await api.post('/roles', data);
        if (response.data.success) {
          toast.success('Role created successfully');
        } else {
          throw new Error(response.data.message || 'Failed to create role');
        }
      }
      
      setOpenDialog(false);
      reset();
      setEditingRole(null);
      loadRoles();
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to save role';
      toast.error(errorMessage);
    }
  };

  // Handle delete role
  const handleDeleteRole = async () => {
    if (!roleToDelete) return;
    
    try {
      const response = await api.delete(`/api/roles/${roleToDelete}`);
      if (response.data.success) {
        toast.success('Role deleted successfully');
      } else {
        throw new Error(response.data.message || 'Failed to delete role');
      }
      setDeleteConfirmOpen(false);
      setRoleToDelete(null);
      loadRoles();
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to delete role';
      toast.error(errorMessage);
    }
  };

  // Handle edit role
  const handleEditRole = useCallback((role: Role) => {
    setEditingRole(role);
    reset({
      role: role.role,
    });
    setOpenDialog(true);
  }, [reset]);

  // Handle add new role
  const handleAddRole = () => {
    setEditingRole(null);
    reset();
    setOpenDialog(true);
  };

  // Format date
  const formatDate = useCallback((dateString?: string) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-BD', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  }, []);

  const roleColumns = useMemo<RoleColumnDefinition[]>(
    () => [
      {
        id: 'role',
        label: 'Role Name',
        renderCell: (role) => (
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <SecurityIcon sx={{ mr: 2, color: 'primary.main' }} />
            <Typography variant="body1" fontWeight="medium">
              {role.role}
            </Typography>
          </Box>
        ),
      },
      {
        id: 'userCount',
        label: 'Users',
        align: 'center',
        renderCell: (role) => (
          <Chip
            icon={<GroupIcon />}
            label={role.userCount ?? 0}
            size="small"
            variant="outlined"
          />
        ),
      },
      {
        id: 'createdAt',
        label: 'Created',
        align: 'center',
        renderCell: (role) => (
          <Typography variant="body2" color="text.secondary">
            {formatDate(role.createdAt)}
          </Typography>
        ),
      },
      {
        id: 'actions',
        label: 'Actions',
        align: 'center',
        alwaysVisible: true,
        renderCell: (role) => (
          <Box sx={{ display: 'flex', justifyContent: 'center', gap: 1 }}>
            <Tooltip title="Edit Role">
              <IconButton
                onClick={() => handleEditRole(role)}
                size="small"
                color="primary"
              >
                <EditIcon />
              </IconButton>
            </Tooltip>
            <Tooltip title="Delete Role">
              <IconButton
                onClick={() => {
                  setRoleToDelete(role._id);
                  setDeleteConfirmOpen(true);
                }}
                size="small"
                color="error"
                disabled={role.role === 'SuperAdmin'}
              >
                <DeleteIcon />
              </IconButton>
            </Tooltip>
          </Box>
        ),
      },
    ],
    [formatDate, handleEditRole]
  );

  const selectableRoleColumnIds = useMemo(
    () => roleColumns.filter((column) => !column.alwaysVisible).map((column) => column.id),
    [roleColumns]
  );

  const sanitizeRoleSelection = useCallback(
    (ids: string[]) => selectableRoleColumnIds.filter((id) => ids.includes(id)),
    [selectableRoleColumnIds]
  );

  const handleVisibleRoleColumnsChange = useCallback(
    (nextSelected: string[]) => {
      const sanitized = sanitizeRoleSelection(nextSelected);
      setVisibleRoleColumnIds(sanitized.length ? sanitized : selectableRoleColumnIds);
    },
    [sanitizeRoleSelection, selectableRoleColumnIds]
  );

  const roleColumnVisibilityOptions = useMemo(
    () => roleColumns.map(({ id, label, alwaysVisible }) => ({ id, label, alwaysVisible })),
    [roleColumns]
  );

  useEffect(() => {
    if (!selectableRoleColumnIds.length) {
      setVisibleRoleColumnIds([]);
      setPersistedRoleColumnIds([]);
      return;
    }

    if (!roleColumnStateHydratedRef.current) {
      roleColumnStateHydratedRef.current = true;

      let initialSelection = selectableRoleColumnIds;

      try {
        const stored = window.localStorage.getItem(ROLE_COLUMN_STORAGE_KEY);
        if (stored) {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed)) {
            const sanitized = sanitizeRoleSelection(parsed);
            if (sanitized.length) {
              initialSelection = sanitized;
            }
          }
        }
      } catch (error) {
        console.warn('Failed to read role column preferences', error);
      }

      setVisibleRoleColumnIds(initialSelection);
      setPersistedRoleColumnIds(initialSelection);
      return;
    }

    setVisibleRoleColumnIds((previous) => {
      const sanitizedPrevious = sanitizeRoleSelection(previous);
      if (sanitizedPrevious.length) {
        return sanitizedPrevious;
      }
      return selectableRoleColumnIds;
    });

    setPersistedRoleColumnIds((previous) => {
      const sanitizedPrevious = sanitizeRoleSelection(previous);
      if (sanitizedPrevious.length) {
        return sanitizedPrevious;
      }
      return selectableRoleColumnIds;
    });
  }, [sanitizeRoleSelection, selectableRoleColumnIds]);

  const roleHasUnsavedChanges = useMemo(() => {
    if (visibleRoleColumnIds.length !== persistedRoleColumnIds.length) {
      return true;
    }
    const persistedSet = new Set(persistedRoleColumnIds);
    return visibleRoleColumnIds.some((id) => !persistedSet.has(id));
  }, [persistedRoleColumnIds, visibleRoleColumnIds]);

  const handleSaveRoleColumnSelection = useCallback(() => {
    const sanitized = sanitizeRoleSelection(visibleRoleColumnIds);
    setVisibleRoleColumnIds(sanitized);
    setPersistedRoleColumnIds(sanitized);
    try {
      window.localStorage.setItem(ROLE_COLUMN_STORAGE_KEY, JSON.stringify(sanitized));
      toast.success('Column selection saved');
    } catch (error) {
      console.warn('Failed to persist role column preferences', error);
      toast.error('Failed to save column selection');
    }
  }, [sanitizeRoleSelection, visibleRoleColumnIds]);

  const visibleRoleColumns = useMemo(() => {
    if (!visibleRoleColumnIds.length || !selectableRoleColumnIds.length) {
      return roleColumns;
    }

    return roleColumns.filter(
      (column) => column.alwaysVisible || visibleRoleColumnIds.includes(column.id)
    );
  }, [roleColumns, selectableRoleColumnIds, visibleRoleColumnIds]);

  const roleTableMinWidth = useMemo(
    () => calculateTableMinWidth(visibleRoleColumns.length || roleColumns.length, 160, 640),
    [roleColumns, visibleRoleColumns]
  );

  const menuSelectedRoleColumnIds = visibleRoleColumnIds.length
    ? visibleRoleColumnIds
    : selectableRoleColumnIds;

  // Render loading skeleton
  const renderSkeleton = () => {
    if (viewMode === 'cards') {
      return (
        <Box sx={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', 
          gap: 3 
        }}>
          {Array.from({ length: 6 }).map((_, index) => (
            <Card key={index}>
              <CardContent>
                <Skeleton variant="text" width="60%" height={32} />
                <Skeleton variant="text" width="100%" />
                <Skeleton variant="text" width="80%" />
                <Box sx={{ mt: 2 }}>
                  <Skeleton variant="rectangular" width="100%" height={40} />
                </Box>
              </CardContent>
            </Card>
          ))}
        </Box>
      );
    }

    const skeletonColumns = visibleRoleColumns;

    return (
      <TableContainer component={Paper}>
        <Table sx={{ minWidth: roleTableMinWidth }}>
          <TableHead>
            <TableRow>
              {skeletonColumns.map((column) => (
                <TableCell key={column.id} align={column.align}>
                  <Skeleton variant="text" />
                </TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {Array.from({ length: 5 }).map((_, index) => (
              <TableRow key={index}>
                {skeletonColumns.map((column) => (
                  <TableCell key={column.id} align={column.align}>
                    <Skeleton variant="text" />
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    );
  };

  // Render card view
  const renderCardView = () => (
    <Box sx={{ maxHeight: 'calc(100vh - 300px)', overflow: 'auto', pr: 1 }}>
      <Box sx={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', 
        gap: 3 
      }}>
        {filteredRoles.map((role) => (
          <Card
            key={role._id}
            sx={{
              height: '100%',
              display: 'flex',
              flexDirection: 'column',
              transition: 'all 0.2s',
              '&:hover': {
                transform: 'translateY(-2px)',
                boxShadow: (theme) => theme.shadows[8],
              },
            }}
          >
              <CardContent sx={{ flex: 1 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                  <SecurityIcon sx={{ mr: 2, color: 'primary.main' }} />
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography variant="h6" noWrap>
                      {role.role}
                    </Typography>
                  </Box>
                </Box>

                {role.userCount !== undefined && (
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    <GroupIcon sx={{ fontSize: 16, mr: 1, verticalAlign: 'text-bottom' }} />
                    Users: {role.userCount}
                  </Typography>
                )}
                
                {role.createdAt && (
                  <Typography variant="body2" color="text.secondary">
                    Created: {formatDate(role.createdAt)}
                  </Typography>
                )}
              </CardContent>

              <CardActions sx={{ justifyContent: 'space-between', p: 2 }}>
                <Box>
                  <Tooltip title="Edit Role">
                    <IconButton 
                      onClick={() => handleEditRole(role)}
                      size="small"
                      color="primary"
                    >
                      <EditIcon />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Delete Role">
                    <IconButton 
                      onClick={() => {
                        setRoleToDelete(role._id);
                        setDeleteConfirmOpen(true);
                      }}
                      size="small"
                      color="error"
                      disabled={role.role === 'SuperAdmin'} // Prevent deleting SuperAdmin
                    >
                      <DeleteIcon />
                    </IconButton>
                  </Tooltip>
                </Box>
              </CardActions>
            </Card>
        ))}
      </Box>
    </Box>
  );

  // Render list view
  const renderListView = () => (
    <Box sx={{ maxHeight: 'calc(100vh - 300px)', overflow: 'auto' }}>
      <TableContainer component={Paper}>
        <Table stickyHeader sx={{ minWidth: roleTableMinWidth }}>
          <TableHead>
            <TableRow>
              {visibleRoleColumns.map((column) => (
                <TableCell key={column.id} align={column.align}>
                  <Typography sx={{ fontWeight: 'bold' }}>{column.label}</Typography>
                </TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredRoles.map((role) => (
              <TableRow key={role._id}>
                {visibleRoleColumns.map((column) => (
                  <TableCell key={column.id} align={column.align}>
                    {column.renderCell(role)}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <SecurityIcon sx={{ mr: 2, color: 'primary.main' }} />
          <Typography variant="h4" component="h1" fontWeight="bold">
            Role Management
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={handleAddRole}
        >
          Add Role
        </Button>
      </Box>

      {/* Controls */}
      <Box sx={{ 
        mb: 3, 
        display: 'flex', 
        gap: 2, 
        flexWrap: 'wrap',
        alignItems: 'center',
        justifyContent: 'space-between'
      }}>
        <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center' }}>
          {/* Search */}
          <TextField
            size="small"
            placeholder="Search roles..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            InputProps={{
              startAdornment: <SearchIcon sx={{ mr: 1, color: 'text.secondary' }} />,
            }}
            sx={{ minWidth: 200 }}
          />
        </Box>

        {/* View Toggle and Column Controls */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap' }}>
          <ColumnVisibilityMenu
            options={roleColumnVisibilityOptions}
            selected={menuSelectedRoleColumnIds}
            onChange={handleVisibleRoleColumnsChange}
            onSaveSelection={handleSaveRoleColumnSelection}
            saveDisabled={!roleHasUnsavedChanges}
            minSelectable={1}
          />

          <Tooltip title="Card View">
            <IconButton
              onClick={() => setViewMode('cards')}
              color={viewMode === 'cards' ? 'primary' : 'default'}
              size="small"
            >
              <ViewModuleIcon />
            </IconButton>
          </Tooltip>
          <Tooltip title="List View">
            <IconButton
              onClick={() => setViewMode('list')}
              color={viewMode === 'list' ? 'primary' : 'default'}
              size="small"
            >
              <ViewListIcon />
            </IconButton>
          </Tooltip>
        </Box>
      </Box>

      {/* Content */}
      {loading ? renderSkeleton() : viewMode === 'cards' ? renderCardView() : renderListView()}

      {/* Add/Edit Role Dialog */}
      <Dialog 
        open={openDialog} 
        onClose={() => setOpenDialog(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          {editingRole ? 'Edit Role' : 'Add New Role'}
        </DialogTitle>
        <form onSubmit={handleSubmit(onSubmit)}>
          <DialogContent>
            <Controller
              name="role"
              control={control}
              render={({ field }) => (
                <TextField
                  {...field}
                  autoFocus
                  margin="dense"
                  label="Role Name"
                  fullWidth
                  variant="outlined"
                  error={!!errors.role}
                  helperText={errors.role?.message}
                />
              )}
            />
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setOpenDialog(false)}>Cancel</Button>
            <Button 
              type="submit" 
              variant="contained"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Saving...' : editingRole ? 'Update' : 'Create'}
            </Button>
          </DialogActions>
        </form>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={deleteConfirmOpen}
        onClose={() => setDeleteConfirmOpen(false)}
      >
        <DialogTitle>Delete Role</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete this role? This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteConfirmOpen(false)}>Cancel</Button>
          <Button 
            onClick={handleDeleteRole}
            color="error" 
            variant="contained"
          >
            Delete
          </Button>
        </DialogActions>
      </Dialog>

      {/* Floating Action Button for Mobile */}
      <Fab
        color="primary"
        onClick={handleAddRole}
        sx={{
          position: 'fixed',
          bottom: 24,
          right: 24,
          display: { xs: 'flex', sm: 'none' },
        }}
      >
        <AddIcon />
      </Fab>
    </Box>
  );
}
