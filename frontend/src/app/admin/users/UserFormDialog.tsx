'use client';

import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormControlLabel,
  Switch,
  Box,
  Alert,
  Divider,
  Typography,
  CircularProgress,
  FormHelperText,
  Autocomplete,
} from '@mui/material';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import api from '@/lib/api';
import TerritorySelector from '@/components/common/TerritorySelector';

interface Role {
  _id: string;
  role: string;
}

interface Employee {
  _id: string;
  employee_id: string;
  name: string;
  employee_type: 'system_admin' | 'field' | 'facility' | 'hq';
  designation_id?: {
    _id: string;
    name: string;
  };
  facility_id?: {
    _id: string;
    name: string;
    type: string;
  } | string | null;
  territory_assignments?: {
    zone_ids: string[];
    region_ids: string[];
    area_ids: string[];
  };
}

interface Distributor {
  _id: string;
  name: string;
  db_point_id: {
    _id: string;
    name: string;
  };
}

interface Facility {
  _id: string;
  name: string;
  type: 'Depot' | 'Factory';
}

interface User {
  _id: string;
  username: string;
  email: string;
  role_id: {
    _id: string;
    role: string;
  };
  user_type: 'employee' | 'distributor';
  employee_id?: {
    _id: string;
    employee_id: string;
    name: string;
  } | string | null;
  distributor_id?: {
    _id: string;
    name: string;
  } | string | null;
  active: boolean;
}

const userSchema = z.object({
  username: z.string().min(3, 'Username must be at least 3 characters'),
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters').optional(),
  role_id: z.string().min(1, 'Role is required'),
  user_type: z.enum(['employee', 'distributor']),
  employee_id: z.string().optional().nullable(),
  distributor_id: z.string().optional().nullable(),
  active: z.boolean(),
});

type UserFormData = z.infer<typeof userSchema>;

interface UserFormDialogProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  editingUser: User | null;
  roles: Role[];
}

export default function UserFormDialog({
  open,
  onClose,
  onSuccess,
  editingUser,
  roles,
}: UserFormDialogProps) {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [distributors, setDistributors] = useState<Distributor[]>([]);
  const [facilities, setFacilities] = useState<Facility[]>([]);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);
  const [territorySelection, setTerritorySelection] = useState<{
    zone_id?: string;
    region_id?: string;
    area_id?: string;
  }>({});
  const [facilityId, setFacilityId] = useState<string>('');
  const [loadingEmployees, setLoadingEmployees] = useState(false);
  const [loadingDistributors, setLoadingDistributors] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const {
    control,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<UserFormData>({
    resolver: zodResolver(userSchema),
    defaultValues: {
      username: '',
      email: '',
      password: '',
      role_id: '',
      user_type: 'employee',
      employee_id: null,
      distributor_id: null,
      active: true,
    },
  });

  const watchUserType = watch('user_type');
  const watchEmployeeId = watch('employee_id');
  const watchDistributorId = watch('distributor_id');
  const watchRoleId = watch('role_id');

  // Load employees and distributors
  useEffect(() => {
    if (open) {
      loadEmployees();
      loadDistributors();
      loadFacilities();
    }
  }, [open]);

  // Update form when editing user or when dialog opens
  useEffect(() => {
    if (open) {
      if (editingUser) {
        reset({
          username: editingUser.username,
          email: editingUser.email,
          password: '',
          role_id: editingUser.role_id._id,
          user_type: editingUser.user_type,
          employee_id: typeof editingUser.employee_id === 'object' && editingUser.employee_id 
            ? editingUser.employee_id._id 
            : editingUser.employee_id || null,
          distributor_id: typeof editingUser.distributor_id === 'object' && editingUser.distributor_id
            ? editingUser.distributor_id._id
            : editingUser.distributor_id || null,
          active: editingUser.active,
        });
      } else {
        reset({
          username: '',
          email: '',
          password: '',
          role_id: '',
          user_type: 'employee',
          employee_id: null,
          distributor_id: null,
          active: true,
        });
        setSelectedEmployee(null);
        setTerritorySelection({
          zone_id: undefined,
          region_id: undefined,
          area_id: undefined,
        });
        setFacilityId('');
      }
    }
  }, [open, editingUser, reset]);

  // Load selected employee details when employee_id changes
  useEffect(() => {
    if (watchEmployeeId && employees.length > 0) {
      const employee = employees.find((e) => e._id === watchEmployeeId);
      setSelectedEmployee(employee || null);
      
      if (employee) {
        // Pre-populate territory or facility selections
        if (employee.territory_assignments) {
          const ta = employee.territory_assignments;
          setTerritorySelection({
            zone_id: ta.zone_ids?.[0] || undefined,
            region_id: ta.region_ids?.[0] || undefined,
            area_id: ta.area_ids?.[0] || undefined,
          });
        }
        
        if (employee.facility_id) {
          const facilityIdStr = typeof employee.facility_id === 'object' 
            ? employee.facility_id._id 
            : employee.facility_id;
          setFacilityId(facilityIdStr);
        }
      }
    }
  }, [watchEmployeeId, employees]);

  // Update selected role
  useEffect(() => {
    if (watchRoleId && roles.length > 0) {
      const role = roles.find((r) => r._id === watchRoleId);
      setSelectedRole(role || null);
    }
  }, [watchRoleId, roles]);

  // Sync User Type with Role - enforce Distributor role for Distributor user type
  useEffect(() => {
    if (watchUserType && watchRoleId && roles.length > 0) {
      const selectedRole = roles.find((r) => r._id === watchRoleId);
      
      if (watchUserType === 'distributor') {
        // User Type is Distributor - Role must be Distributor
        if (selectedRole && selectedRole.role !== 'Distributor') {
          // Find Distributor role and set it
          const distributorRole = roles.find((r) => r.role === 'Distributor');
          if (distributorRole) {
            setValue('role_id', distributorRole._id);
          }
        }
      } else if (watchUserType === 'employee') {
        // User Type is Employee - Role cannot be Distributor
        if (selectedRole && selectedRole.role === 'Distributor') {
          // Clear the role, user needs to select a non-Distributor role
          setValue('role_id', '');
        }
      }
    }
  }, [watchUserType, watchRoleId, roles, setValue]);

  const loadEmployees = async () => {
    setLoadingEmployees(true);
    try {
      const response = await api.get('/employees', {
        params: { limit: 500 },
      });
      const employeesData = response.data?.data || [];
      setEmployees(employeesData);
    } catch (error) {
      console.error('Failed to load employees:', error);
      setEmployees([]);
    } finally {
      setLoadingEmployees(false);
    }
  };

  const loadDistributors = async () => {
    setLoadingDistributors(true);
    try {
      const response = await api.get('/distributors', {
        params: { limit: 500 },
      });
      const distributorsData = response.data?.data || [];
      setDistributors(distributorsData);
    } catch (error) {
      console.error('Failed to load distributors:', error);
      setDistributors([]);
    } finally {
      setLoadingDistributors(false);
    }
  };

  const loadFacilities = async () => {
    try {
      const response = await api.get('/facilities', {
        params: { limit: 200 },
      });
      const facilitiesData = response.data?.data || [];
      setFacilities(facilitiesData);
    } catch (error) {
      console.error('Failed to load facilities:', error);
      setFacilities([]);
    }
  };

  const validateContextRequirements = (): string | null => {
    if (!selectedRole || !selectedEmployee) return null;

    const roleName = selectedRole.role;

    switch (roleName) {
      case 'Inventory':
        if (!facilityId) {
          return 'Inventory role requires a Depot facility assignment';
        }
        // Only validate facility type if facilities were loaded
        if (facilities.length > 0) {
          const inventoryFacility = facilities.find((f) => f._id === facilityId);
          if (inventoryFacility && inventoryFacility.type !== 'Depot') {
            return 'Inventory role must be assigned to a Depot facility';
          }
        }
        break;

      case 'Production':
        if (!facilityId) {
          return 'Production role requires a Factory facility assignment';
        }
        // Only validate facility type if facilities were loaded
        if (facilities.length > 0) {
          const productionFacility = facilities.find((f) => f._id === facilityId);
          if (productionFacility && productionFacility.type !== 'Factory') {
            return 'Production role must be assigned to a Factory facility';
          }
        }
        break;

      case 'ZSM':
        if (!territorySelection.zone_id) {
          return 'ZSM role requires a Zone assignment';
        }
        break;

      case 'RSM':
        if (!territorySelection.region_id) {
          return 'RSM role requires a Region assignment';
        }
        break;

      case 'ASM':
      case 'SO':
        if (!territorySelection.area_id) {
          return `${roleName} role requires an Area assignment`;
        }
        break;
    }

    return null;
  };

  const onSubmit = async (data: UserFormData) => {
    setFormError(null);

    // Validate context requirements
    const contextError = validateContextRequirements();
    if (contextError) {
      setFormError(contextError);
      return;
    }

    // If employee selected, update employee with territory/facility assignments
    if (data.user_type === 'employee' && data.employee_id && selectedRole) {
      try {
        const updatePayload: any = {};
        const roleName = selectedRole.role;

        // Territory assignments for field roles
        if (['ZSM', 'RSM', 'ASM', 'SO'].includes(roleName)) {
          const territoryAssignments: any = {
            zone_ids: [],
            region_ids: [],
            area_ids: [],
            db_point_ids: [],
            all_territory_ids: [],
          };

          if (territorySelection.zone_id) {
            territoryAssignments.zone_ids = [territorySelection.zone_id];
            territoryAssignments.all_territory_ids.push(territorySelection.zone_id);
          }

          if (territorySelection.region_id) {
            territoryAssignments.region_ids = [territorySelection.region_id];
            territoryAssignments.all_territory_ids.push(territorySelection.region_id);
          }

          if (territorySelection.area_id) {
            territoryAssignments.area_ids = [territorySelection.area_id];
            territoryAssignments.all_territory_ids.push(territorySelection.area_id);
          }

          updatePayload.territory_assignments = territoryAssignments;
        }

        // Facility assignment for facility roles
        if (['Inventory', 'Production'].includes(roleName) && facilityId) {
          updatePayload.facility_id = facilityId;
        }

        // Update employee if there are assignments to save
        if (Object.keys(updatePayload).length > 0) {
          await api.put(`/employees/${data.employee_id}`, updatePayload);
        }
      } catch (error: any) {
        setFormError(error.response?.data?.message || 'Failed to update employee context');
        return;
      }
    }

    // Create or update user
    try {
      const payload: any = {
        username: data.username,
        email: data.email,
        role_id: data.role_id,
        user_type: data.user_type,
        active: data.active,
      };

      if (data.user_type === 'employee') {
        payload.employee_id = data.employee_id;
        payload.distributor_id = null;
      } else {
        payload.distributor_id = data.distributor_id;
        payload.employee_id = null;
      }

      if (data.password && data.password.length > 0) {
        payload.password = data.password;
      }

      console.log('Submitting user payload:', payload);

      if (editingUser) {
        await api.put(`/users/${editingUser._id}`, payload);
      } else {
        await api.post('/users', payload);
      }

      onSuccess();
      handleClose();
    } catch (error: any) {
      console.error('Error saving user:', error);
      console.error('Error response:', error.response?.data);
      const errorMessage = error.response?.data?.message || error.response?.data?.errors?.[0]?.msg || 'Failed to save user';
      setFormError(errorMessage);
    }
  };

  const handleClose = () => {
    reset();
    setSelectedEmployee(null);
    setTerritorySelection({
      zone_id: undefined,
      region_id: undefined,
      area_id: undefined,
    });
    setFacilityId('');
    setFormError(null);
    onClose();
  };

  const showTerritorySelector = 
    selectedRole && 
    ['ZSM', 'RSM', 'ASM', 'SO'].includes(selectedRole.role) &&
    watchUserType === 'employee' &&
    selectedEmployee;

  const showFacilitySelector = 
    selectedRole && 
    ['Inventory', 'Production'].includes(selectedRole.role) &&
    watchUserType === 'employee' &&
    selectedEmployee;

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth>
      <DialogTitle>
        {editingUser ? 'Edit User' : 'Create New User'}
      </DialogTitle>

      <form onSubmit={handleSubmit(onSubmit)}>
        <DialogContent>
          {formError && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {formError}
            </Alert>
          )}

          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {/* Basic User Info */}
            <Typography variant="subtitle2" color="text.secondary">
              User Credentials
            </Typography>

            <Controller
              name="username"
              control={control}
              render={({ field }) => (
                <TextField
                  {...field}
                  label="Username"
                  error={!!errors.username}
                  helperText={errors.username?.message}
                  required
                  fullWidth
                  autoComplete="off"
                />
              )}
            />

            <Controller
              name="email"
              control={control}
              render={({ field }) => (
                <TextField
                  {...field}
                  label="Email"
                  type="email"
                  error={!!errors.email}
                  helperText={errors.email?.message}
                  required
                  fullWidth
                  autoComplete="off"
                />
              )}
            />

            <Controller
              name="password"
              control={control}
              render={({ field }) => (
                <TextField
                  {...field}
                  label={editingUser ? 'New Password (leave blank to keep current)' : 'Password'}
                  type="password"
                  error={!!errors.password}
                  helperText={errors.password?.message}
                  required={!editingUser}
                  fullWidth
                  autoComplete="new-password"
                />
              )}
            />

            <Divider />

            {/* Role and User Type */}
            <Typography variant="subtitle2" color="text.secondary">
              User Type & Role
            </Typography>

            <Controller
              name="user_type"
              control={control}
              render={({ field }) => (
                <FormControl fullWidth required>
                  <InputLabel>User Type</InputLabel>
                  <Select {...field} label="User Type">
                    <MenuItem value="employee">Employee</MenuItem>
                    <MenuItem value="distributor">Distributor</MenuItem>
                  </Select>
                  <FormHelperText>
                    {watchUserType === 'distributor' 
                      ? 'Distributor users can only have the "Distributor" role'
                      : 'Employee users can have any role except "Distributor"'}
                  </FormHelperText>
                </FormControl>
              )}
            />

            <Controller
              name="role_id"
              control={control}
              render={({ field }) => (
                <FormControl fullWidth error={!!errors.role_id} required>
                  <InputLabel>Role</InputLabel>
                  <Select {...field} label="Role">
                    <MenuItem value="">
                      <em>Select Role</em>
                    </MenuItem>
                    {roles
                      .filter((role) => {
                        // Filter roles based on user type
                        if (watchUserType === 'distributor') {
                          // Only show Distributor role for distributor user type
                          return role.role === 'Distributor';
                        } else {
                          // Show all roles except Distributor for employee user type
                          return role.role !== 'Distributor';
                        }
                      })
                      .map((role) => (
                        <MenuItem key={role._id} value={role._id}>
                          {role.role}
                        </MenuItem>
                      ))}
                  </Select>
                  {errors.role_id && (
                    <FormHelperText>{errors.role_id.message}</FormHelperText>
                  )}
                </FormControl>
              )}
            />

            <Divider />

            {/* Employee Selection */}
            {watchUserType === 'employee' && (
              <>
                <Typography variant="subtitle2" color="text.secondary">
                  Employee Assignment
                </Typography>

                <Controller
                  name="employee_id"
                  control={control}
                  render={({ field }) => (
                    <Autocomplete
                      options={employees}
                      getOptionLabel={(option) =>
                        `${option.employee_id} - ${option.name}${
                          option.designation_id
                            ? ` (${typeof option.designation_id === 'object' 
                                ? option.designation_id.name 
                                : ''})`
                            : ''
                        }`
                      }
                      value={employees.find((e) => e._id === field.value) || null}
                      onChange={(_, newValue) => field.onChange(newValue?._id || null)}
                      loading={loadingEmployees}
                      renderInput={(params) => (
                        <TextField
                          {...params}
                          label="Select Employee"
                          required
                          error={!!errors.employee_id}
                          helperText={errors.employee_id?.message}
                          InputProps={{
                            ...params.InputProps,
                            endAdornment: (
                              <>
                                {loadingEmployees ? <CircularProgress size={20} /> : null}
                                {params.InputProps.endAdornment}
                              </>
                            ),
                          }}
                        />
                      )}
                    />
                  )}
                />

                {selectedEmployee && (
                  <Alert severity="info">
                    <Typography variant="body2" component="div">
                      <strong>Employee ID:</strong> {selectedEmployee.employee_id}
                      <br />
                      <strong>Name:</strong> {selectedEmployee.name}
                      <br />
                      <strong>Employee Type:</strong> {selectedEmployee.employee_type}
                      {selectedEmployee.designation_id && typeof selectedEmployee.designation_id === 'object' && (
                        <>
                          <br />
                          <strong>Designation:</strong> {selectedEmployee.designation_id.name}
                        </>
                      )}
                      {selectedEmployee.facility_id && typeof selectedEmployee.facility_id === 'object' && (
                        <>
                          <br />
                          <strong>Facility:</strong> {selectedEmployee.facility_id.name} ({selectedEmployee.facility_id.type})
                        </>
                      )}
                      {selectedEmployee.territory_assignments && (
                        <>
                          {selectedEmployee.territory_assignments.zone_ids && selectedEmployee.territory_assignments.zone_ids.length > 0 && (
                            <>
                              <br />
                              <strong>Zone(s):</strong> {selectedEmployee.territory_assignments.zone_ids.length} assigned
                            </>
                          )}
                          {selectedEmployee.territory_assignments.region_ids && selectedEmployee.territory_assignments.region_ids.length > 0 && (
                            <>
                              <br />
                              <strong>Region(s):</strong> {selectedEmployee.territory_assignments.region_ids.length} assigned
                            </>
                          )}
                          {selectedEmployee.territory_assignments.area_ids && selectedEmployee.territory_assignments.area_ids.length > 0 && (
                            <>
                              <br />
                              <strong>Area(s):</strong> {selectedEmployee.territory_assignments.area_ids.length} assigned
                            </>
                          )}
                        </>
                      )}
                    </Typography>
                  </Alert>
                )}
              </>
            )}

            {/* Distributor Selection */}
            {watchUserType === 'distributor' && (
              <>
                <Typography variant="subtitle2" color="text.secondary">
                  Distributor Assignment
                </Typography>

                <Controller
                  name="distributor_id"
                  control={control}
                  render={({ field }) => (
                    <Autocomplete
                      options={distributors}
                      getOptionLabel={(option) =>
                        `${option.name}${
                          option.db_point_id && typeof option.db_point_id === 'object'
                            ? ` (${option.db_point_id.name})`
                            : ''
                        }`
                      }
                      value={distributors.find((d) => d._id === field.value) || null}
                      onChange={(_, newValue) => field.onChange(newValue?._id || null)}
                      loading={loadingDistributors}
                      renderInput={(params) => (
                        <TextField
                          {...params}
                          label="Select Distributor"
                          required
                          error={!!errors.distributor_id}
                          helperText={errors.distributor_id?.message}
                          InputProps={{
                            ...params.InputProps,
                            endAdornment: (
                              <>
                                {loadingDistributors ? <CircularProgress size={20} /> : null}
                                {params.InputProps.endAdornment}
                              </>
                            ),
                          }}
                        />
                      )}
                    />
                  )}
                />

                {distributors.find((d) => d._id === watchDistributorId) && (
                  <Alert severity="info">
                    <Typography variant="body2" component="div">
                      <strong>Distributor Name:</strong> {distributors.find((d) => d._id === watchDistributorId)?.name}
                      {distributors.find((d) => d._id === watchDistributorId)?.db_point_id && 
                       typeof distributors.find((d) => d._id === watchDistributorId)?.db_point_id === 'object' && (
                        <>
                          <br />
                          <strong>DB Point:</strong> {(distributors.find((d) => d._id === watchDistributorId)?.db_point_id as any)?.name}
                        </>
                      )}
                    </Typography>
                  </Alert>
                )}
              </>
            )}

            {/* Territory Selector for Field Roles */}
            {showTerritorySelector && (
              <>
                <Divider />
                <Typography variant="subtitle2" color="text.secondary">
                  Territory Assignment ({selectedRole.role})
                </Typography>
                <TerritorySelector
                  role={selectedRole.role}
                  value={territorySelection}
                  onChange={setTerritorySelection}
                  disabled={isSubmitting}
                />
              </>
            )}

            {/* Facility Selector for Facility Roles */}
            {showFacilitySelector && (
              <>
                <Divider />
                <Typography variant="subtitle2" color="text.secondary">
                  Facility Assignment ({selectedRole.role})
                </Typography>
                
                {facilities.length === 0 ? (
                  <Alert severity="warning">
                    Unable to load facilities. Please ensure you have the necessary permissions.
                  </Alert>
                ) : (
                  <FormControl fullWidth required>
                    <InputLabel>
                      {selectedRole.role === 'Inventory' ? 'Depot' : 'Factory'}
                    </InputLabel>
                    <Select
                      value={facilityId}
                      onChange={(e) => setFacilityId(e.target.value)}
                      label={selectedRole.role === 'Inventory' ? 'Depot' : 'Factory'}
                    >
                      <MenuItem value="">
                        <em>Select {selectedRole.role === 'Inventory' ? 'Depot' : 'Factory'}</em>
                      </MenuItem>
                      {facilities
                        .filter((f) =>
                          selectedRole.role === 'Inventory'
                            ? f.type === 'Depot'
                            : f.type === 'Factory'
                        )
                        .map((facility) => (
                          <MenuItem key={facility._id} value={facility._id}>
                            {facility.name} ({facility.type})
                          </MenuItem>
                        ))}
                    </Select>
                    <FormHelperText>
                      {selectedRole.role === 'Inventory' 
                        ? 'Select the depot where this user will manage inventory'
                        : 'Select the factory where this user will manage production'}
                    </FormHelperText>
                  </FormControl>
                )}
              </>
            )}

            <Divider />

            {/* Active Status */}
            <Controller
              name="active"
              control={control}
              render={({ field }) => (
                <FormControlLabel
                  control={<Switch {...field} checked={field.value} />}
                  label="Active"
                />
              )}
            />
          </Box>
        </DialogContent>

        <DialogActions>
          <Button onClick={handleClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button type="submit" variant="contained" disabled={isSubmitting}>
            {isSubmitting ? <CircularProgress size={24} /> : editingUser ? 'Update' : 'Create'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}
