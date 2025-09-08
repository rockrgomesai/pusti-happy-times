'use client';

import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Button,
  Card,
  CardContent,
  CardActions,
  IconButton,
  Switch,
  FormControlLabel,
  Chip,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
  Fab,
  Grid as Grid,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Skeleton,
  FormGroup,
  Checkbox,
  Divider,
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

// Role type definition
interface Role {
  _id: string;
  name: string;
  description?: string;
  permissions: string[];
  isActive: boolean;
  userCount?: number;
  createdAt: string;
  updatedAt: string;
}

// Available permissions
const availablePermissions = [
  { id: 'users.create', label: 'Create Users', category: 'User Management' },
  { id: 'users.read', label: 'View Users', category: 'User Management' },
  { id: 'users.update', label: 'Edit Users', category: 'User Management' },
  { id: 'users.delete', label: 'Delete Users', category: 'User Management' },
  { id: 'roles.create', label: 'Create Roles', category: 'Role Management' },
  { id: 'roles.read', label: 'View Roles', category: 'Role Management' },
  { id: 'roles.update', label: 'Edit Roles', category: 'Role Management' },
  { id: 'roles.delete', label: 'Delete Roles', category: 'Role Management' },
  { id: 'brands.create', label: 'Create Brands', category: 'Brand Management' },
  { id: 'brands.read', label: 'View Brands', category: 'Brand Management' },
  { id: 'brands.update', label: 'Edit Brands', category: 'Brand Management' },
  { id: 'brands.delete', label: 'Delete Brands', category: 'Brand Management' },
  { id: 'system.settings', label: 'System Settings', category: 'System' },
  { id: 'system.logs', label: 'View Logs', category: 'System' },
];

// Permission categories
const permissionCategories = Array.from(
  new Set(availablePermissions.map(p => p.category))
);

// Role form schema
const roleSchema = z.object({
  name: z.string().min(2, 'Role name must be at least 2 characters'),
  description: z.string().optional(),
  permissions: z.array(z.string()).min(1, 'At least one permission is required'),
  isActive: z.boolean(),
});

type RoleFormData = z.infer<typeof roleSchema>;

export default function RolesPage() {
  // State management
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'cards' | 'list'>('cards');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [openDialog, setOpenDialog] = useState(false);
  const [editingRole, setEditingRole] = useState<Role | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [roleToDelete, setRoleToDelete] = useState<string | null>(null);

  // Form setup
  const {
    control,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<RoleFormData>({
    resolver: zodResolver(roleSchema),
    defaultValues: {
      name: '',
      description: '',
      permissions: [],
      isActive: true,
    },
  });

  const watchedPermissions = watch('permissions');

  // Load roles
  const loadRoles = async () => {
    try {
      setLoading(true);
      const response = await api.get('/api/roles');
      setRoles(response.data);
    } catch (error) {
      toast.error('Failed to load roles');
      console.error('Error loading roles:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRoles();
  }, []);

  // Filter roles based on search and filters
  const filteredRoles = roles.filter((role) => {
    const matchesSearch = 
      role.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (role.description && role.description.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesStatus = !filterStatus || 
      (filterStatus === 'active' && role.isActive) ||
      (filterStatus === 'inactive' && !role.isActive);
    
    return matchesSearch && matchesStatus;
  });

  // Handle form submission
  const onSubmit = async (data: RoleFormData) => {
    try {
      if (editingRole) {
        await api.put(`/api/roles/${editingRole._id}`, data);
        toast.success('Role updated successfully');
      } else {
        await api.post('/api/roles', data);
        toast.success('Role created successfully');
      }
      
      setOpenDialog(false);
      reset();
      setEditingRole(null);
      loadRoles();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to save role';
      toast.error(errorMessage);
    }
  };

  // Handle delete role
  const handleDeleteRole = async () => {
    if (!roleToDelete) return;
    
    try {
      await api.delete(`/api/roles/${roleToDelete}`);
      toast.success('Role deleted successfully');
      setDeleteConfirmOpen(false);
      setRoleToDelete(null);
      loadRoles();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to delete role';
      toast.error(errorMessage);
    }
  };

  // Handle edit role
  const handleEditRole = (role: Role) => {
    setEditingRole(role);
    reset({
      name: role.name,
      description: role.description || '',
      permissions: role.permissions,
      isActive: role.isActive,
    });
    setOpenDialog(true);
  };

  // Handle add new role
  const handleAddRole = () => {
    setEditingRole(null);
    reset();
    setOpenDialog(true);
  };

  // Handle permission selection
  const handlePermissionToggle = (permissionId: string) => {
    const currentPermissions = watchedPermissions || [];
    const isSelected = currentPermissions.includes(permissionId);
    
    if (isSelected) {
      setValue('permissions', currentPermissions.filter(p => p !== permissionId));
    } else {
      setValue('permissions', [...currentPermissions, permissionId]);
    }
  };

  // Handle category selection (select all permissions in category)
  const handleCategoryToggle = (category: string) => {
    const categoryPermissions = availablePermissions
      .filter(p => p.category === category)
      .map(p => p.id);
    
    const currentPermissions = watchedPermissions || [];
    const allCategorySelected = categoryPermissions.every(p => 
      currentPermissions.includes(p)
    );
    
    if (allCategorySelected) {
      // Remove all permissions from this category
      setValue('permissions', currentPermissions.filter(p => 
        !categoryPermissions.includes(p)
      ));
    } else {
      // Add all permissions from this category
      const newPermissions = [...currentPermissions];
      categoryPermissions.forEach(p => {
        if (!newPermissions.includes(p)) {
          newPermissions.push(p);
        }
      });
      setValue('permissions', newPermissions);
    }
  };

  // Format date
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-BD', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  // Get permission label
  const getPermissionLabel = (permissionId: string) => {
    const permission = availablePermissions.find(p => p.id === permissionId);
    return permission ? permission.label : permissionId;
  };

  // Render loading skeleton
  const renderSkeleton = () => {
    if (viewMode === 'cards') {
      return (
        <Grid container spacing={3}>
          {Array.from({ length: 6 }).map((_, index) => (
            <Grid key={index} size={{ xs: 12, sm: 6, md: 4 }}>
              <Card>
                <CardContent>
                  <Skeleton variant="text" width="60%" height={32} />
                  <Skeleton variant="text" width="100%" />
                  <Skeleton variant="text" width="80%" />
                  <Box sx={{ mt: 2 }}>
                    <Skeleton variant="rectangular" width="100%" height={40} />
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      );
    }

    return (
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              {['Role Name', 'Description', 'Permissions', 'Status', 'Users', 'Created', 'Actions'].map((header) => (
                <TableCell key={header}>
                  <Skeleton variant="text" />
                </TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {Array.from({ length: 5 }).map((_, index) => (
              <TableRow key={index}>
                {Array.from({ length: 7 }).map((_, cellIndex) => (
                  <TableCell key={cellIndex}>
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
      <Grid container spacing={3}>
        {filteredRoles.map((role) => (
          <Grid key={role._id} size={{ xs: 12, sm: 6, md: 4 }}>
            <Card
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
                      {role.name}
                    </Typography>
                    <Chip
                      label={role.isActive ? 'Active' : 'Inactive'}
                      size="small"
                      color={role.isActive ? 'success' : 'error'}
                    />
                  </Box>
                </Box>
                
                {role.description && (
                  <Typography 
                    variant="body2" 
                    color="text.secondary" 
                    gutterBottom
                    sx={{
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      display: '-webkit-box',
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: 'vertical',
                    }}
                  >
                    {role.description}
                  </Typography>
                )}

                <Typography variant="body2" color="text.secondary" gutterBottom>
                  Permissions: {role.permissions.length}
                </Typography>

                {role.userCount !== undefined && (
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    Users: {role.userCount}
                  </Typography>
                )}
                
                <Typography variant="body2" color="text.secondary">
                  Created: {formatDate(role.createdAt)}
                </Typography>

                {/* Preview of permissions */}
                <Box sx={{ mt: 2, maxHeight: 60, overflow: 'hidden' }}>
                  {role.permissions.slice(0, 3).map((permission) => (
                    <Chip
                      key={permission}
                      label={getPermissionLabel(permission)}
                      size="small"
                      variant="outlined"
                      sx={{ mr: 0.5, mb: 0.5, fontSize: '0.75rem' }}
                    />
                  ))}
                  {role.permissions.length > 3 && (
                    <Chip
                      label={`+${role.permissions.length - 3} more`}
                      size="small"
                      variant="outlined"
                      sx={{ mr: 0.5, mb: 0.5, fontSize: '0.75rem' }}
                    />
                  )}
                </Box>
              </CardContent>
              
              <CardActions sx={{ justifyContent: 'flex-end', pt: 0 }}>
                <Tooltip title="Edit Role">
                  <IconButton
                    size="small"
                    onClick={() => handleEditRole(role)}
                    color="primary"
                  >
                    <EditIcon />
                  </IconButton>
                </Tooltip>
                <Tooltip title="Delete Role">
                  <IconButton
                    size="small"
                    onClick={() => {
                      setRoleToDelete(role._id);
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
    </Box>
  );

  // Render list view with frozen action column
  const renderListView = () => (
    <Box sx={{ maxHeight: 'calc(100vh - 300px)', overflow: 'auto' }}>
      <TableContainer component={Paper}>
        <Table stickyHeader>
          <TableHead>
            <TableRow>
              <TableCell>Role Name</TableCell>
              <TableCell>Description</TableCell>
              <TableCell>Permissions</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Users</TableCell>
              <TableCell>Created</TableCell>
              <TableCell 
                sx={{ 
                  position: 'sticky', 
                  right: 0, 
                  bgcolor: 'background.paper',
                  zIndex: 1,
                  borderLeft: (theme) => `1px solid ${theme.palette.divider}`,
                }}
              >
                Actions
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredRoles.map((role) => (
              <TableRow key={role._id} hover>
                <TableCell>
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <SecurityIcon sx={{ mr: 2, color: 'primary.main' }} />
                    <Typography variant="body2" fontWeight="medium">
                      {role.name}
                    </Typography>
                  </Box>
                </TableCell>
                <TableCell>
                  <Typography 
                    variant="body2" 
                    sx={{
                      maxWidth: 200,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {role.description || '-'}
                  </Typography>
                </TableCell>
                <TableCell>
                  <Typography variant="body2">
                    {role.permissions.length} permissions
                  </Typography>
                </TableCell>
                <TableCell>
                  <Chip
                    label={role.isActive ? 'Active' : 'Inactive'}
                    size="small"
                    color={role.isActive ? 'success' : 'error'}
                  />
                </TableCell>
                <TableCell>
                  <Typography variant="body2">
                    {role.userCount || 0} users
                  </Typography>
                </TableCell>
                <TableCell>
                  <Typography variant="body2">
                    {formatDate(role.createdAt)}
                  </Typography>
                </TableCell>
                <TableCell 
                  sx={{ 
                    position: 'sticky', 
                    right: 0, 
                    bgcolor: 'background.paper',
                    borderLeft: (theme) => `1px solid ${theme.palette.divider}`,
                  }}
                >
                  <Box sx={{ display: 'flex', gap: 1 }}>
                    <Tooltip title="Edit Role">
                      <IconButton
                        size="small"
                        onClick={() => handleEditRole(role)}
                        color="primary"
                      >
                        <EditIcon />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Delete Role">
                      <IconButton
                        size="small"
                        onClick={() => {
                          setRoleToDelete(role._id);
                          setDeleteConfirmOpen(true);
                        }}
                        color="error"
                      >
                        <DeleteIcon />
                      </IconButton>
                    </Tooltip>
                  </Box>
                </TableCell>
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
      <Box sx={{ mb: 3 }}>
        <Typography variant="h4" gutterBottom>
          Role Management
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Manage user roles and permissions
        </Typography>
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
          
          {/* Status Filter */}
          <FormControl size="small" sx={{ minWidth: 120 }}>
            <InputLabel>Status</InputLabel>
            <Select
              value={filterStatus}
              label="Status"
              onChange={(e) => setFilterStatus(e.target.value)}
            >
              <MenuItem value="">All Status</MenuItem>
              <MenuItem value="active">Active</MenuItem>
              <MenuItem value="inactive">Inactive</MenuItem>
            </Select>
          </FormControl>
        </Box>

        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
          {/* View Mode Toggle */}
          <FormControlLabel
            control={
              <Switch
                checked={viewMode === 'list'}
                onChange={(e) => setViewMode(e.target.checked ? 'list' : 'cards')}
                icon={<ViewModuleIcon />}
                checkedIcon={<ViewListIcon />}
              />
            }
            label={viewMode === 'cards' ? 'Cards' : 'List'}
          />
          
          {/* Add Button */}
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={handleAddRole}
          >
            Add Role
          </Button>
        </Box>
      </Box>

      {/* Results Count */}
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        {loading ? 'Loading...' : `${filteredRoles.length} role(s) found`}
      </Typography>

      {/* Content */}
      {loading ? renderSkeleton() : (
        <>
          {filteredRoles.length === 0 ? (
            <Box sx={{ 
              textAlign: 'center', 
              py: 8,
              color: 'text.secondary'
            }}>
              <GroupIcon sx={{ fontSize: 64, mb: 2, opacity: 0.5 }} />
              <Typography variant="h6" gutterBottom>
                No roles found
              </Typography>
              <Typography variant="body2">
                {searchTerm || filterStatus
                  ? 'Try adjusting your search criteria'
                  : 'Get started by adding your first role'
                }
              </Typography>
            </Box>
          ) : (
            viewMode === 'cards' ? renderCardView() : renderListView()
          )}
        </>
      )}

      {/* Floating Action Button for mobile */}
      <Fab
        color="primary"
        aria-label="add role"
        onClick={handleAddRole}
        sx={{
          position: 'fixed',
          bottom: 16,
          right: 16,
          display: { xs: 'flex', sm: 'none' },
        }}
      >
        <AddIcon />
      </Fab>

      {/* Role Form Dialog */}
      <Dialog 
        open={openDialog} 
        onClose={() => setOpenDialog(false)}
        maxWidth="md"
        fullWidth
        PaperProps={{
          sx: { minHeight: '500px' }
        }}
      >
        <DialogTitle>
          {editingRole ? 'Edit Role' : 'Add New Role'}
        </DialogTitle>
        <form onSubmit={handleSubmit(onSubmit)}>
          <DialogContent>
            <Grid container spacing={2}>
              <Grid size={12}>
                <Controller
                  name="name"
                  control={control}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      label="Role Name"
                      fullWidth
                      error={!!errors.name}
                      helperText={errors.name?.message}
                      margin="normal"
                    />
                  )}
                />
              </Grid>
              <Grid size={12}>
                <Controller
                  name="description"
                  control={control}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      label="Description (Optional)"
                      fullWidth
                      multiline
                      rows={2}
                      error={!!errors.description}
                      helperText={errors.description?.message}
                      margin="normal"
                    />
                  )}
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <Controller
                  name="isActive"
                  control={control}
                  render={({ field }) => (
                    <FormControlLabel
                      control={
                        <Switch
                          checked={field.value}
                          onChange={field.onChange}
                        />
                      }
                      label="Active"
                      sx={{ mt: 2 }}
                    />
                  )}
                />
              </Grid>
              
              {/* Permissions Section */}
              <Grid size={12}>
                <Typography variant="h6" gutterBottom sx={{ mt: 2 }}>
                  Permissions
                </Typography>
                {errors.permissions && (
                  <Alert severity="error" sx={{ mb: 2 }}>
                    {errors.permissions.message}
                  </Alert>
                )}
                
                <Box sx={{ maxHeight: 300, overflow: 'auto', border: 1, borderColor: 'divider', borderRadius: 1, p: 1 }}>
                  {permissionCategories.map((category) => {
                    const categoryPermissions = availablePermissions.filter(p => p.category === category);
                    const allCategorySelected = categoryPermissions.every(p => 
                      watchedPermissions?.includes(p.id)
                    );
                    const someCategorySelected = categoryPermissions.some(p => 
                      watchedPermissions?.includes(p.id)
                    );

                    return (
                      <Box key={category} sx={{ mb: 2 }}>
                        <FormControlLabel
                          control={
                            <Checkbox
                              checked={allCategorySelected}
                              indeterminate={!allCategorySelected && someCategorySelected}
                              onChange={() => handleCategoryToggle(category)}
                            />
                          }
                          label={
                            <Typography variant="subtitle2" fontWeight="medium">
                              {category}
                            </Typography>
                          }
                        />
                        <FormGroup sx={{ ml: 3 }}>
                          {categoryPermissions.map((permission) => (
                            <FormControlLabel
                              key={permission.id}
                              control={
                                <Checkbox
                                  checked={watchedPermissions?.includes(permission.id) || false}
                                  onChange={() => handlePermissionToggle(permission.id)}
                                />
                              }
                              label={permission.label}
                            />
                          ))}
                        </FormGroup>
                        {category !== permissionCategories[permissionCategories.length - 1] && (
                          <Divider sx={{ mt: 1 }} />
                        )}
                      </Box>
                    );
                  })}
                </Box>
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
              {isSubmitting ? 'Saving...' : (editingRole ? 'Update' : 'Create')}
            </Button>
          </DialogActions>
        </form>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={deleteConfirmOpen}
        onClose={() => setDeleteConfirmOpen(false)}
      >
        <DialogTitle>Confirm Delete</DialogTitle>
        <DialogContent>
          <Alert severity="warning" sx={{ mb: 2 }}>
            This action cannot be undone.
          </Alert>
          <Typography>
            Are you sure you want to delete this role? Users with this role will need 
            to be assigned a different role before this can be deleted.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteConfirmOpen(false)}>
            Cancel
          </Button>
          <Button 
            onClick={handleDeleteRole}
            color="error"
            variant="contained"
          >
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
