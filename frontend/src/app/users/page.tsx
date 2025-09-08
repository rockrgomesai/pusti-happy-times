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
  Avatar,
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
  TableSortLabel,
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  ViewList as ViewListIcon,
  ViewModule as ViewModuleIcon,
  Search as SearchIcon,
  Person as PersonIcon,
} from '@mui/icons-material';
import { TablePagination } from '@mui/material';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'react-hot-toast';
import api from '@/lib/api';

// User type definition
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
}

// User form schema
const userSchema = z.object({
  username: z.string().min(2, 'Username must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
  role_id: z.string().min(1, 'Role is required'),
  active: z.boolean(),
});

type UserFormData = z.infer<typeof userSchema>;

export default function UsersPage() {
  // State management
  const [users, setUsers] = useState<User[]>([]);
  const [roles, setRoles] = useState<{_id: string; role: string}[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'cards' | 'list'>('list');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterRole, setFilterRole] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [openDialog, setOpenDialog] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState<string | null>(null);
  
  // Pagination state
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  
  // Sorting state
  const [sortBy, setSortBy] = useState<string>('created_at');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

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
      role_id: '',
      active: true,
    },
  });

  // Load users and roles
  const loadUsers = async () => {
    try {
      setLoading(true);
      const response = await api.get('/api/users');
      setUsers(response.data);
    } catch (error) {
      toast.error('Failed to load users');
      console.error('Error loading users:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadRoles = async () => {
    try {
      const response = await api.get('/api/roles');
      setRoles(response.data);
    } catch (error) {
      console.error('Error loading roles:', error);
      // Fallback to hardcoded roles if API fails
      setRoles([
        { _id: 'admin', role: 'Admin' },
        { _id: 'manager', role: 'Manager' },
        { _id: 'employee', role: 'Employee' },
        { _id: 'viewer', role: 'Viewer' }
      ]);
    }
  };

  useEffect(() => {
    loadUsers();
    loadRoles();
  }, []);

  // Reset page when filters change
  useEffect(() => {
    setPage(0);
  }, [searchTerm, filterRole, filterStatus]);

  // Filter users based on search and filters
  const filteredUsers = users.filter((user) => {
    const matchesSearch = 
      user.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.role_id.role.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesRole = !filterRole || user.role_id.role === filterRole;
    const matchesStatus = !filterStatus || (filterStatus === 'active' ? user.active : !user.active);
    
    return matchesSearch && matchesRole && matchesStatus;
  });

  // Sort filtered users
  const sortedUsers = [...filteredUsers].sort((a, b) => {
    let aValue: unknown = a[sortBy as keyof User];
    let bValue: unknown = b[sortBy as keyof User];
    
    // Handle nested role object
    if (sortBy === 'role') {
      aValue = a.role_id.role;
      bValue = b.role_id.role;
    }
    
    // Handle active status
    if (sortBy === 'active') {
      aValue = a.active ? 'active' : 'inactive';
      bValue = b.active ? 'active' : 'inactive';
    }
    
    // Handle date values
    if (sortBy === 'created_at' || sortBy === 'updated_at') {
      aValue = new Date(aValue as string);
      bValue = new Date(bValue as string);
    }
    
    // Handle null/undefined values
    if (aValue == null && bValue == null) return 0;
    if (aValue == null) return sortDirection === 'asc' ? -1 : 1;
    if (bValue == null) return sortDirection === 'asc' ? 1 : -1;
    
    // Compare values
    if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
    if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
    return 0;
  });

  // Get paginated data
  const paginatedUsers = sortedUsers.slice(
    page * rowsPerPage,
    page * rowsPerPage + rowsPerPage
  );

  // Handle sorting
  const handleSort = (column: string) => {
    if (sortBy === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(column);
      setSortDirection('asc');
    }
  };

  // Handle pagination change
  const handleChangePage = (event: unknown, newPage: number) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0); // Reset to first page when changing rows per page
  };

  // Handle form submission
  const onSubmit = async (data: UserFormData) => {
    try {
      if (editingUser) {
        await api.put(`/api/users/${editingUser._id}`, data);
        toast.success('User updated successfully');
      } else {
        await api.post('/api/users', data);
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
      await api.delete(`/api/users/${userToDelete}`);
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
  const handleEditUser = (user: User) => {
    setEditingUser(user);
    reset({
      username: user.username,
      email: user.email,
      role_id: user.role_id._id,
      active: user.active,
    });
    setOpenDialog(true);
  };

  // Handle add new user
  const handleAddUser = () => {
    setEditingUser(null);
    reset();
    setOpenDialog(true);
  };

  // Format date
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-BD', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
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
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                    <Skeleton variant="circular" width={40} height={40} />
                    <Box sx={{ ml: 2, flex: 1 }}>
                      <Skeleton variant="text" width="60%" />
                      <Skeleton variant="text" width="40%" />
                    </Box>
                  </Box>
                  <Skeleton variant="text" width="80%" />
                  <Skeleton variant="text" width="60%" />
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
              {['Name', 'Email', 'Role', 'Status', 'Last Login', 'Actions'].map((header) => (
                <TableCell key={header}>
                  <Skeleton variant="text" />
                </TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {Array.from({ length: 5 }).map((_, index) => (
              <TableRow key={index}>
                {Array.from({ length: 6 }).map((_, cellIndex) => (
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
    <Box>
      <Box sx={{ maxHeight: 'calc(100vh - 400px)', overflow: 'auto', pr: 1 }}>
        <Grid container spacing={3}>
          {paginatedUsers.map((user) => (
            <Grid key={user._id} size={{ xs: 12, sm: 6, md: 4 }}>
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
                    <Avatar sx={{ mr: 2, bgcolor: 'primary.main' }}>
                      <PersonIcon />
                    </Avatar>
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Typography variant="h6" noWrap>
                        {user.username}
                      </Typography>
                      <Typography variant="body2" color="text.secondary" noWrap>
                        {user.email}
                      </Typography>
                    </Box>
                  </Box>
                  
                  <Box sx={{ mb: 2 }}>
                    <Chip
                      label={user.role_id.role}
                      size="small"
                      color="primary"
                      variant="outlined"
                      sx={{ mr: 1 }}
                    />
                    <Chip
                      label={user.active ? 'Active' : 'Inactive'}
                      size="small"
                      color={user.active ? 'success' : 'error'}
                    />
                  </Box>
                  
                  <Typography variant="body2" color="text.secondary">
                    Created: {formatDate(user.created_at)}
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
      </Box>
      <TablePagination
        component="div"
        count={sortedUsers.length}
        page={page}
        onPageChange={handleChangePage}
        rowsPerPage={rowsPerPage}
        onRowsPerPageChange={handleChangeRowsPerPage}
        rowsPerPageOptions={[6, 12, 24, 48]}
        sx={{
          borderTop: '1px solid',
          borderColor: 'divider',
          bgcolor: 'background.paper',
          mt: 2,
        }}
      />
    </Box>
  );

  // Render list view with frozen action column
  const renderListView = () => (
    <Box>
      <Box sx={{ maxHeight: 'calc(100vh - 400px)', overflow: 'auto' }}>
        <TableContainer component={Paper}>
          <Table stickyHeader>
            <TableHead>
              <TableRow sx={{ '& .MuiTableCell-root': { backgroundColor: 'grey.50' } }}>
                <TableCell sx={{ fontWeight: 'bold', backgroundColor: 'grey.50' }}>
                  <TableSortLabel
                    active={sortBy === 'username'}
                    direction={sortBy === 'username' ? sortDirection : 'asc'}
                    onClick={() => handleSort('username')}
                    hideSortIcon={false}
                    sx={{
                      fontWeight: 'bold',
                      cursor: 'pointer',
                      '& .MuiTableSortLabel-icon': {
                        fontSize: '1.2rem !important',
                        color: 'text.primary !important',
                        opacity: '1 !important',
                        visibility: 'visible !important',
                      },
                      '&:hover': {
                        backgroundColor: 'action.hover',
                      },
                      '&:hover .MuiTableSortLabel-icon': {
                        opacity: '1 !important',
                        color: 'primary.main !important',
                      },
                      '&.Mui-active .MuiTableSortLabel-icon': {
                        color: 'primary.main !important',
                        opacity: '1 !important',
                        fontSize: '1.3rem !important',
                      }
                    }}
                  >
                    Username
                  </TableSortLabel>
                </TableCell>
                <TableCell sx={{ fontWeight: 'bold', backgroundColor: 'grey.50' }}>
                  <TableSortLabel
                    active={sortBy === 'email'}
                    direction={sortBy === 'email' ? sortDirection : 'asc'}
                    onClick={() => handleSort('email')}
                    hideSortIcon={false}
                    sx={{
                      fontWeight: 'bold',
                      cursor: 'pointer',
                      '& .MuiTableSortLabel-icon': {
                        fontSize: '1.2rem !important',
                        color: 'text.primary !important',
                        opacity: '1 !important',
                        visibility: 'visible !important',
                      },
                      '&:hover': {
                        backgroundColor: 'action.hover',
                      },
                      '&:hover .MuiTableSortLabel-icon': {
                        opacity: '1 !important',
                        color: 'primary.main !important',
                      },
                      '&.Mui-active .MuiTableSortLabel-icon': {
                        color: 'primary.main !important',
                        opacity: '1 !important',
                        fontSize: '1.3rem !important',
                      }
                    }}
                  >
                    Email
                  </TableSortLabel>
                </TableCell>
                <TableCell sx={{ fontWeight: 'bold', backgroundColor: 'grey.50' }}>
                  <TableSortLabel
                    active={sortBy === 'role'}
                    direction={sortBy === 'role' ? sortDirection : 'asc'}
                    onClick={() => handleSort('role')}
                    hideSortIcon={false}
                    sx={{
                      fontWeight: 'bold',
                      cursor: 'pointer',
                      '& .MuiTableSortLabel-icon': {
                        fontSize: '1.2rem !important',
                        color: 'text.primary !important',
                        opacity: '1 !important',
                        visibility: 'visible !important',
                      },
                      '&:hover': {
                        backgroundColor: 'action.hover',
                      },
                      '&:hover .MuiTableSortLabel-icon': {
                        opacity: '1 !important',
                        color: 'primary.main !important',
                      },
                      '&.Mui-active .MuiTableSortLabel-icon': {
                        color: 'primary.main !important',
                        opacity: '1 !important',
                        fontSize: '1.3rem !important',
                      }
                    }}
                  >
                    Role
                  </TableSortLabel>
                </TableCell>
                <TableCell sx={{ fontWeight: 'bold', backgroundColor: 'grey.50' }}>
                  <TableSortLabel
                    active={sortBy === 'active'}
                    direction={sortBy === 'active' ? sortDirection : 'asc'}
                    onClick={() => handleSort('active')}
                    hideSortIcon={false}
                    sx={{
                      fontWeight: 'bold',
                      cursor: 'pointer',
                      '& .MuiTableSortLabel-icon': {
                        fontSize: '1.2rem !important',
                        color: 'text.primary !important',
                        opacity: '1 !important',
                        visibility: 'visible !important',
                      },
                      '&:hover': {
                        backgroundColor: 'action.hover',
                      },
                      '&:hover .MuiTableSortLabel-icon': {
                        opacity: '1 !important',
                        color: 'primary.main !important',
                      },
                      '&.Mui-active .MuiTableSortLabel-icon': {
                        color: 'primary.main !important',
                        opacity: '1 !important',
                        fontSize: '1.3rem !important',
                      }
                    }}
                  >
                    Status
                  </TableSortLabel>
                </TableCell>
                <TableCell sx={{ fontWeight: 'bold', backgroundColor: 'grey.50' }}>
                  <TableSortLabel
                    active={sortBy === 'created_at'}
                    direction={sortBy === 'created_at' ? sortDirection : 'asc'}
                    onClick={() => handleSort('created_at')}
                    hideSortIcon={false}
                    sx={{
                      fontWeight: 'bold',
                      cursor: 'pointer',
                      '& .MuiTableSortLabel-icon': {
                        fontSize: '1.2rem !important',
                        color: 'text.primary !important',
                        opacity: '1 !important',
                        visibility: 'visible !important',
                      },
                      '&:hover': {
                        backgroundColor: 'action.hover',
                      },
                      '&:hover .MuiTableSortLabel-icon': {
                        opacity: '1 !important',
                        color: 'primary.main !important',
                      },
                      '&.Mui-active .MuiTableSortLabel-icon': {
                        color: 'primary.main !important',
                        opacity: '1 !important',
                        fontSize: '1.3rem !important',
                      }
                    }}
                  >
                    Created
                  </TableSortLabel>
                </TableCell>
                <TableCell 
                  sx={{ 
                    position: 'sticky', 
                    right: 0, 
                    bgcolor: 'grey.50',
                    fontWeight: 'bold',
                    zIndex: 1,
                    borderLeft: (theme) => `1px solid ${theme.palette.divider}`,
                  }}
                >
                  Actions
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {paginatedUsers.map((user) => (
                <TableRow key={user._id} hover>
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      <Avatar sx={{ mr: 2, width: 32, height: 32 }}>
                        <PersonIcon />
                      </Avatar>
                      <Typography variant="body2">
                        {user.username}
                      </Typography>
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" noWrap>
                      {user.email}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={user.role_id.role}
                      size="small"
                      color="primary"
                      variant="outlined"
                    />
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={user.active ? 'Active' : 'Inactive'}
                      size="small"
                      color={user.active ? 'success' : 'error'}
                    />
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2">
                      {formatDate(user.created_at)}
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
                    </Box>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Box>
      <TablePagination
        component="div"
        count={sortedUsers.length}
        page={page}
        onPageChange={handleChangePage}
        rowsPerPage={rowsPerPage}
        onRowsPerPageChange={handleChangeRowsPerPage}
        rowsPerPageOptions={[5, 10, 25, 50]}
        sx={{
          borderTop: '2px solid',
          borderColor: 'divider',
          bgcolor: 'background.paper',
          p: 2,
          '& .MuiTablePagination-toolbar': {
            minHeight: 64,
          },
          '& .MuiTablePagination-spacer': {
            flex: '1 1 100%',
          },
          '& .MuiTablePagination-selectLabel': {
            fontSize: '1rem',
            fontWeight: 500,
          },
          '& .MuiTablePagination-displayedRows': {
            fontSize: '1rem',
            fontWeight: 500,
          },
          '& .MuiIconButton-root': {
            fontSize: '1.2rem',
          },
        }}
      />
    </Box>
  );

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box sx={{ mb: 3 }}>
        <Typography variant="h4" gutterBottom>
          User Management
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Manage system users, roles, and permissions
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
            placeholder="Search users..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            InputProps={{
              startAdornment: <SearchIcon sx={{ mr: 1, color: 'text.secondary' }} />,
            }}
            sx={{ minWidth: 200 }}
          />
          
          {/* Filters */}
          <FormControl size="small" sx={{ minWidth: 120 }}>
            <InputLabel>Role</InputLabel>
            <Select
              value={filterRole}
              label="Role"
              onChange={(e) => setFilterRole(e.target.value)}
            >
              <MenuItem value="">All Roles</MenuItem>
              {roles.map((role) => (
                <MenuItem key={role._id} value={role.role}>
                  {role.role}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

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
            onClick={handleAddUser}
          >
            Add User
          </Button>
        </Box>
      </Box>

      {/* Results Count */}
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        {loading ? 'Loading...' : `${sortedUsers.length} user(s) found`}
      </Typography>

      {/* Content */}
      {loading ? renderSkeleton() : (
        <>
          {sortedUsers.length === 0 ? (
            <Box sx={{ 
              textAlign: 'center', 
              py: 8,
              color: 'text.secondary'
            }}>
              <PersonIcon sx={{ fontSize: 64, mb: 2, opacity: 0.5 }} />
              <Typography variant="h6" gutterBottom>
                No users found
              </Typography>
              <Typography variant="body2">
                {searchTerm || filterRole || filterStatus
                  ? 'Try adjusting your search criteria'
                  : 'Get started by adding your first user'
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

      {/* User Form Dialog */}
      <Dialog 
        open={openDialog} 
        onClose={() => setOpenDialog(false)}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: { minHeight: '400px' }
        }}
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
                      <Select {...field} label="Role">
                        {roles.map((role) => (
                          <MenuItem key={role._id} value={role._id}>
                            {role.role}
                          </MenuItem>
                        ))}
                      </Select>
                      {errors.role_id && (
                        <Typography variant="caption" color="error" sx={{ mt: 1, ml: 2 }}>
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
                    <FormControl fullWidth margin="normal">
                      <InputLabel>Status</InputLabel>
                      <Select 
                        value={field.value ? 'active' : 'inactive'}
                        onChange={(e) => field.onChange(e.target.value === 'active')}
                        label="Status"
                      >
                        <MenuItem value="active">Active</MenuItem>
                        <MenuItem value="inactive">Inactive</MenuItem>
                      </Select>
                    </FormControl>
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
            Are you sure you want to delete this user? This will permanently remove
            all user data and cannot be reversed.
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
    </Box>
  );
}
