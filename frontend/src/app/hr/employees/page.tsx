'use client';

import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
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
  Fab,
  FormControlLabel,
  Grid,
  IconButton,
  InputAdornment,
  MenuItem,
  Skeleton,
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
  Paper,
} from '@mui/material';
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  Edit as EditIcon,
  Badge as BadgeIcon,
  Search as SearchIcon,
  ViewList as ViewListIcon,
  ViewModule as ViewModuleIcon,
} from '@mui/icons-material';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import TerritorySelector from '@/components/common/TerritorySelector';
import { toast } from 'react-hot-toast';
import api from '@/lib/api';
import ExportMenu from '@/components/common/ExportMenu';
import ColumnVisibilityMenu from '@/components/common/ColumnVisibilityMenu';
import { ExportColumn, formatDateForExport } from '@/lib/exportUtils';
import { calculateTableMinWidth } from '@/lib/tableUtils';

interface DesignationOption {
  _id: string;
  name: string;
  active?: boolean;
}

interface EmployeeMeta {
  genders: string[];
  religions: string[];
  maritalStatuses: string[];
  bloodGroups: string[];
  divisions: string[];
  districts: string[];
  defaultNationality?: string;
}

interface PopulatedDesignation {
  _id: string;
  name: string;
}

interface PopulatedFacility {
  _id: string;
  name: string;
  type: 'Factory' | 'Depot';
}

interface PopulatedTerritory {
  _id: string;
  name: string;
  level: number;
}

interface Employee {
  _id: string;
  employee_id: string;
  employee_type: 'system_admin' | 'field' | 'facility' | 'hq';
  designation_id: string | PopulatedDesignation | null;
  facility_id?: string | PopulatedFacility | null;
  factory_store_id?: string | PopulatedFacility | null; // NEW: Factory store for Production employees
  territory_assignments?: {
    zone_ids?: (string | PopulatedTerritory)[];
    region_ids?: (string | PopulatedTerritory)[];
    area_ids?: (string | PopulatedTerritory)[];
    db_point_ids?: (string | PopulatedTerritory)[];
  };
  name: string;
  father_name?: string | null;
  mother_name?: string | null;
  date_birth: string;
  gender: string;
  religion: string;
  marital_status: string;
  nationality?: string | null;
  national_id?: string | null;
  passport_number?: string | null;
  passport_issue_date?: string | null;
  mobile_personal?: string | null;
  email?: string | null;
  emergency_contact?: string | null;
  emergency_mobile?: string | null;
  blood_group?: string | null;
  present_address?: {
    holding_no?: string | null;
    road?: string | null;
    city?: string | null;
    post_code?: number | null;
  } | null;
  permanent_address?: {
    holding_no?: string | null;
    village_road?: string | null;
    union_ward?: string | null;
    upazila_thana?: string | null;
    district?: string | null;
    division?: string | null;
  } | null;
  ssc_year?: number | null;
  highest_degree?: string | null;
  last_organization?: string | null;
  last_position?: string | null;
  experience_years?: number | null;
  reference_name?: string | null;
  reference_mobile?: string | null;
  remarks?: string | null;
  active: boolean;
  created_at: string;
  updated_at: string;
}

const employeeSchema = z.object({
  employee_id: z.string().min(1, 'Employee ID is required'),
  employee_type: z.enum(['system_admin', 'field', 'facility', 'hq']),
  designation_id: z.string().min(1, 'Designation is required'),
  facility_id: z.string().optional(),
  factory_store_id: z.string().optional(), // NEW: Factory store for Production employees
  name: z.string().min(2, 'Name must be at least 2 characters'),
  father_name: z.string().optional(),
  mother_name: z.string().optional(),
  date_birth: z.string().min(1, 'Date of birth is required'),
  gender: z.string().min(1, 'Gender is required'),
  religion: z.string().min(1, 'Religion is required'),
  marital_status: z.string().min(1, 'Marital status is required'),
  nationality: z.string().optional(),
  national_id: z.string().optional(),
  passport_number: z.string().optional(),
  passport_issue_date: z.string().optional(),
  mobile_personal: z.string().optional(),
  email: z
    .string()
    .email('Invalid email address')
    .optional()
    .or(z.literal('')),
  emergency_contact: z.string().optional(),
  emergency_mobile: z.string().optional(),
  blood_group: z.string().min(1, 'Blood group is required'),
  present_address_holding_no: z.string().optional(),
  present_address_road: z.string().optional(),
  present_address_city: z.string().optional(),
  present_address_post_code: z.string().optional(),
  permanent_address_holding_no: z.string().optional(),
  permanent_address_village_road: z.string().optional(),
  permanent_address_union_ward: z.string().optional(),
  permanent_address_upazila_thana: z.string().optional(),
  permanent_address_district: z.string().min(1, 'District is required'),
  permanent_address_division: z.string().min(1, 'Division is required'),
  ssc_year: z.string().optional(),
  highest_degree: z.string().optional(),
  last_organization: z.string().optional(),
  last_position: z.string().optional(),
  experience_years: z.string().optional(),
  reference_name: z.string().optional(),
  reference_mobile: z.string().optional(),
  remarks: z.string().optional(),
  active: z.boolean(),
});

type EmployeeFormData = z.infer<typeof employeeSchema>;

type Order = 'asc' | 'desc';
type OrderableKeys = 'name' | 'employee_id' | 'designation' | 'created_at';

interface EmployeeColumnDefinition {
  id: string;
  label: string;
  sortableKey?: OrderableKeys;
  align?: 'inherit' | 'left' | 'center' | 'right' | 'justify';
  alwaysVisible?: boolean;
  renderCell: (employee: Employee) => React.ReactNode;
}

const EMPLOYEE_COLUMN_STORAGE_KEY = 'master:employees:visibleColumns';

const getDesignationName = (
  designation: Employee['designation_id'],
  fallbackList: DesignationOption[]
) => {
  if (!designation) return '';
  if (typeof designation === 'string') {
    return fallbackList.find((item) => item._id === designation)?.name ?? '';
  }
  return designation.name ?? '';
};

const formatDate = (value?: string | null) => {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return date.toLocaleDateString('en-BD', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
};

const toNullable = (value?: string | null) => {
  if (value === undefined || value === null) return null;
  const trimmed = value.trim();
  return trimmed.length === 0 ? null : trimmed;
};

const toNumberOrNull = (value?: string | null) => {
  if (!value) return null;
  const parsed = Number(value);
  return Number.isNaN(parsed) ? null : parsed;
};

const getErrorMessage = (error: unknown, fallback: string) => {
  if (error && typeof error === 'object' && 'response' in error) {
    const response = (error as { response?: { data?: { message?: string } } }).response;
    if (response?.data?.message) {
      return response.data.message;
    }
  }
  if (error instanceof Error) {
    return error.message;
  }
  return fallback;
};

export default function EmployeesPage() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [meta, setMeta] = useState<EmployeeMeta | null>(null);
  const [designations, setDesignations] = useState<DesignationOption[]>([]);
  const [facilities, setFacilities] = useState<PopulatedFacility[]>([]);
  const [depotFacilities, setDepotFacilities] = useState<PopulatedFacility[]>([]); // NEW: Depot-type facilities for factory_store_id
  const [territorySelection, setTerritorySelection] = useState<{
    zone_id?: string;
    region_id?: string;
    area_id?: string;
  }>({});
  const [loading, setLoading] = useState(true);
  const [metaLoading, setMetaLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'cards' | 'list'>('cards');
  const [searchTerm, setSearchTerm] = useState('');
  const [openDialog, setOpenDialog] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [employeeToDelete, setEmployeeToDelete] = useState<string | null>(null);
  const [orderBy, setOrderBy] = useState<OrderableKeys>('name');
  const [order, setOrder] = useState<Order>('asc');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [visibleEmployeeColumnIds, setVisibleEmployeeColumnIds] = useState<string[]>([]);
  const [persistedEmployeeColumnIds, setPersistedEmployeeColumnIds] = useState<string[]>([]);
  const columnStateHydratedRef = useRef(false);

  const employeeExportColumns = useMemo<ExportColumn<Employee>[]>(
    () => [
      {
        header: 'Name',
        accessor: (row) => row.name,
      },
      {
        header: 'Employee ID',
        accessor: (row) => row.employee_id,
      },
      {
        header: 'Designation',
        accessor: (row) => getDesignationName(row.designation_id, designations) || '',
      },
      {
        header: 'Mobile',
        accessor: (row) => row.mobile_personal ?? '',
      },
      {
        header: 'Status',
        accessor: (row) => (row.active ? 'Active' : 'Inactive'),
      },
      {
        header: 'Created Date',
        accessor: (row) => formatDateForExport(row.created_at),
      },
    ],
    [designations]
  );

  const fetchAllEmployees = useCallback(async (): Promise<Employee[]> => {
    const limitPerRequest = 500;
    const sortField = orderBy === 'designation' ? 'name' : orderBy;
    const paramsBase: Record<string, string | number> = {
      limit: limitPerRequest,
      sort: sortField,
      order,
    };

    const searchValue = searchTerm.trim();
    if (searchValue) {
      paramsBase.search = searchValue;
    }

    let pageNumber = 1;
    const aggregated: Employee[] = [];
    const MAX_PAGES = 50;

    while (pageNumber <= MAX_PAGES) {
      const response = await api.get('/employees', {
        params: {
          ...paramsBase,
          page: pageNumber,
        },
      });

      const pageData: Employee[] = Array.isArray(response.data?.data)
        ? response.data.data
        : [];

      aggregated.push(...pageData);

      const pagination = response.data?.pagination;
      if (!pageData.length || !pagination?.hasNextPage) {
        break;
      }

      pageNumber += 1;
    }

    if (pageNumber > MAX_PAGES) {
      console.warn('Export aborted after reaching maximum page threshold.');
    }

    return aggregated;
  }, [order, orderBy, searchTerm]);

  const {
    register,
    control,
    handleSubmit,
    reset,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<EmployeeFormData>({
    resolver: zodResolver(employeeSchema),
    defaultValues: {
      employee_id: '',
      employee_type: 'hq',
      designation_id: '',
      name: '',
      father_name: '',
      mother_name: '',
      date_birth: '',
      gender: '',
      religion: '',
      marital_status: '',
      nationality: '',
      national_id: '',
      passport_number: '',
      passport_issue_date: '',
      mobile_personal: '',
      email: '',
      emergency_contact: '',
      emergency_mobile: '',
      blood_group: '',
      present_address_holding_no: '',
      present_address_road: '',
      present_address_city: '',
      present_address_post_code: '',
      permanent_address_holding_no: '',
      permanent_address_village_road: '',
      permanent_address_union_ward: '',
      permanent_address_upazila_thana: '',
      permanent_address_district: '',
      permanent_address_division: '',
      ssc_year: '',
      highest_degree: '',
      last_organization: '',
      last_position: '',
      experience_years: '',
      reference_name: '',
      reference_mobile: '',
      remarks: '',
      active: true,
    },
  });

  // Watch employee_type to determine what context fields to show
  const selectedEmployeeType = watch('employee_type');
  const selectedFacilityId = watch('facility_id');
  
  // Determine if facility selector should show
  const shouldShowFacilitySelector = useMemo(() => {
    return selectedEmployeeType === 'facility';
  }, [selectedEmployeeType]);
  
  // Determine if factory store selector should show
  // Only for facility employees at Factory-type facilities (for Production role)
  // Inventory employees at Depot-type facilities don't need this
  const shouldShowFactoryStoreSelector = useMemo(() => {
    if (selectedEmployeeType !== 'facility' || !selectedFacilityId) {
      return false;
    }
    // Find the selected facility and check if it's a Factory type
    const selectedFacility = facilities.find(f => f._id === selectedFacilityId);
    return selectedFacility?.type === 'Factory';
  }, [selectedEmployeeType, selectedFacilityId, facilities]);
  
  // Determine if territory selector should show (for any field employee)
  const shouldShowTerritorySelector = useMemo(() => {
    return selectedEmployeeType === 'field';
  }, [selectedEmployeeType]);

  const loadEmployees = async () => {
    try {
      setLoading(true);
      const response = await api.get('/employees', {
        params: {
          limit: 500,
        },
      });

      const employeesData = Array.isArray(response.data?.data)
        ? response.data.data
        : [];

      setEmployees(employeesData);
    } catch (error) {
      console.error('Error loading employees:', error);
      toast.error('Failed to load employees');
      setEmployees([]);
    } finally {
      setLoading(false);
    }
  };

  const loadMeta = async () => {
    try {
      setMetaLoading(true);
      const response = await api.get('/employees/meta');
      if (response.data?.data) {
        setMeta(response.data.data as EmployeeMeta);
      } else {
        setMeta(null);
      }
    } catch (error) {
      console.error('Error loading employee metadata:', error);
      toast.error('Failed to load employee metadata');
      setMeta(null);
    } finally {
      setMetaLoading(false);
    }
  };

  const loadDesignations = async () => {
    try {
      const response = await api.get('/designations');
      if (Array.isArray(response.data?.data)) {
        setDesignations(response.data.data as DesignationOption[]);
      } else if (Array.isArray(response.data)) {
        setDesignations(response.data as DesignationOption[]);
      } else {
        setDesignations([]);
      }
    } catch (error) {
      console.error('Error loading designations:', error);
      toast.error('Failed to load designations');
      setDesignations([]);
    }
  };

  const loadFacilities = async () => {
    try {
      const response = await api.get('/facilities', {
        params: { limit: 200 },
      });
      const facilitiesData = response.data?.data?.items || response.data?.data || [];
      setFacilities(facilitiesData);
    } catch (error) {
      console.error('Error loading facilities:', error);
      // Don't show error toast - facilities are optional
      setFacilities([]);
    }
  };

  const loadDepotFacilities = async () => {
    try {
      const response = await api.get('/facilities/depots');
      const depotsData = response.data?.data || [];
      setDepotFacilities(depotsData);
    } catch (error) {
      console.error('Error loading depot facilities:', error);
      setDepotFacilities([]);
    }
  };

  useEffect(() => {
    loadEmployees();
    loadMeta();
    loadDesignations();
    loadFacilities();
    loadDepotFacilities(); // NEW: Load depot facilities for factory_store_id
  }, []);

  const filteredEmployees = useMemo(() => {
    const value = searchTerm.trim().toLowerCase();
    if (!value) return employees;
    return employees.filter((employee) => {
      const designationName = getDesignationName(employee.designation_id, designations);
      return [
        employee.name,
        employee.employee_id,
        designationName,
        employee.mobile_personal ?? '',
      ]
        .join(' ')
        .toLowerCase()
        .includes(value);
    });
  }, [employees, searchTerm, designations]);

  const handleSort = (property: OrderableKeys) => {
    const isAsc = orderBy === property && order === 'asc';
    setOrder(isAsc ? 'desc' : 'asc');
    setOrderBy(property);
    setPage(0);
  };

  const sortedEmployees = useMemo(() => {
    return [...filteredEmployees].sort((a, b) => {
      let aValue: string | number | null = null;
      let bValue: string | number | null = null;

      switch (orderBy) {
        case 'employee_id':
          aValue = a.employee_id;
          bValue = b.employee_id;
          break;
        case 'designation':
          aValue = getDesignationName(a.designation_id, designations);
          bValue = getDesignationName(b.designation_id, designations);
          break;
        case 'created_at':
          aValue = new Date(a.created_at).getTime();
          bValue = new Date(b.created_at).getTime();
          break;
        case 'name':
        default:
          aValue = a.name;
          bValue = b.name;
          break;
      }

      if (aValue === null && bValue === null) return 0;
      if (aValue === null) return order === 'asc' ? -1 : 1;
      if (bValue === null) return order === 'asc' ? 1 : -1;

      if (typeof aValue === 'number' && typeof bValue === 'number') {
        return order === 'asc' ? aValue - bValue : bValue - aValue;
      }

      const aString = String(aValue).toLowerCase();
      const bString = String(bValue).toLowerCase();

      if (aString < bString) return order === 'asc' ? -1 : 1;
      if (aString > bString) return order === 'asc' ? 1 : -1;
      return 0;
    });
  }, [filteredEmployees, order, orderBy, designations]);

  const paginatedEmployees = sortedEmployees.slice(
    page * rowsPerPage,
    page * rowsPerPage + rowsPerPage
  );

  const handleChangePage = (_event: unknown, newPage: number) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const buildPayload = (values: EmployeeFormData) => {
    const payload: any = {
      employee_id: values.employee_id.trim(),
      employee_type: values.employee_type,
      designation_id: values.designation_id,
      name: values.name.trim(),
      father_name: toNullable(values.father_name),
      mother_name: toNullable(values.mother_name),
      date_birth: values.date_birth,
      gender: values.gender,
      religion: values.religion,
      marital_status: values.marital_status,
      nationality: toNullable(values.nationality),
      national_id: toNullable(values.national_id),
      passport_number: toNullable(values.passport_number),
      passport_issue_date: toNullable(values.passport_issue_date),
      mobile_personal: toNullable(values.mobile_personal),
      email: toNullable(values.email),
      emergency_contact: toNullable(values.emergency_contact),
      emergency_mobile: toNullable(values.emergency_mobile),
      blood_group: values.blood_group, // Required field, don't convert to null
      present_address: {
        holding_no: toNullable(values.present_address_holding_no),
        road: toNullable(values.present_address_road),
        city: toNullable(values.present_address_city),
        post_code: toNumberOrNull(values.present_address_post_code),
      },
      permanent_address: {
        holding_no: toNullable(values.permanent_address_holding_no),
        village_road: toNullable(values.permanent_address_village_road),
        union_ward: toNullable(values.permanent_address_union_ward),
        upazila_thana: toNullable(values.permanent_address_upazila_thana),
        district: values.permanent_address_district, // Required field, don't convert to null
        division: values.permanent_address_division, // Required field, don't convert to null
      },
      ssc_year: toNumberOrNull(values.ssc_year),
      highest_degree: toNullable(values.highest_degree),
      last_organization: toNullable(values.last_organization),
      last_position: toNullable(values.last_position),
      experience_years: toNumberOrNull(values.experience_years),
      reference_name: toNullable(values.reference_name),
      reference_mobile: toNullable(values.reference_mobile),
      remarks: toNullable(values.remarks),
      active: values.active,
    };

    // Add facility_id if employee_type is 'facility'
    if (values.employee_type === 'facility' && values.facility_id) {
      payload.facility_id = values.facility_id;
      
      // Add factory_store_id if provided (for Production role employees)
      if (values.factory_store_id) {
        payload.factory_store_id = values.factory_store_id;
      }
    }

    // Add territory assignments if employee_type is 'field'
    if (values.employee_type === 'field' && territorySelection) {
      const territory_assignments: any = {};
      
      if (territorySelection.zone_id) {
        territory_assignments.zone_ids = [territorySelection.zone_id];
      }
      if (territorySelection.region_id) {
        territory_assignments.region_ids = [territorySelection.region_id];
      }
      if (territorySelection.area_id) {
        territory_assignments.area_ids = [territorySelection.area_id];
      }
      
      if (Object.keys(territory_assignments).length > 0) {
        payload.territory_assignments = territory_assignments;
      }
    }

    return payload;
  };

  const onSubmit = async (formData: EmployeeFormData) => {
    try {
      const payload = buildPayload(formData);
      if (editingEmployee) {
        await api.put(`/employees/${editingEmployee._id}`, payload);
        toast.success('Employee updated successfully');
      } else {
        await api.post('/employees', payload);
        toast.success('Employee created successfully');
      }

      handleCloseDialog();
      reset();
      loadEmployees();
    } catch (error) {
      console.error('Error saving employee:', error);
      toast.error(getErrorMessage(error, 'Failed to save employee'));
    }
  };

  const handleDeleteEmployee = async () => {
    if (!employeeToDelete) return;

    try {
      await api.delete(`/employees/${employeeToDelete}`);
      toast.success('Employee deleted successfully');
      setDeleteConfirmOpen(false);
      setEmployeeToDelete(null);
      loadEmployees();
    } catch (error) {
      console.error('Error deleting employee:', error);
      toast.error(getErrorMessage(error, 'Failed to delete employee'));
    }
  };

  const mapEmployeeToForm = useCallback((employee: Employee): EmployeeFormData => ({
    employee_id: employee.employee_id ?? '',
    employee_type: employee.employee_type ?? 'hq',
    designation_id: (() => {
      if (!employee.designation_id) return '';
      if (typeof employee.designation_id === 'string') return employee.designation_id;
      return employee.designation_id._id ?? '';
    })(),
    facility_id: (() => {
      if (!employee.facility_id) return '';
      if (typeof employee.facility_id === 'string') return employee.facility_id;
      return employee.facility_id._id ?? '';
    })(),
    factory_store_id: (() => {
      if (!employee.factory_store_id) return '';
      if (typeof employee.factory_store_id === 'string') return employee.factory_store_id;
      return employee.factory_store_id._id ?? '';
    })(),
    name: employee.name ?? '',
    father_name: employee.father_name ?? '',
    mother_name: employee.mother_name ?? '',
    date_birth: employee.date_birth ? employee.date_birth.substring(0, 10) : '',
    gender: employee.gender ?? '',
    religion: employee.religion ?? '',
    marital_status: employee.marital_status ?? '',
    nationality: employee.nationality ?? meta?.defaultNationality ?? '',
    national_id: employee.national_id ?? '',
    passport_number: employee.passport_number ?? '',
    passport_issue_date: employee.passport_issue_date
      ? employee.passport_issue_date.substring(0, 10)
      : '',
    mobile_personal: employee.mobile_personal ?? '',
    email: employee.email ?? '',
    emergency_contact: employee.emergency_contact ?? '',
    emergency_mobile: employee.emergency_mobile ?? '',
    blood_group: employee.blood_group ?? '',
    present_address_holding_no: employee.present_address?.holding_no ?? '',
    present_address_road: employee.present_address?.road ?? '',
    present_address_city: employee.present_address?.city ?? '',
    present_address_post_code:
      employee.present_address?.post_code !== undefined &&
      employee.present_address?.post_code !== null
        ? String(employee.present_address.post_code)
        : '',
    permanent_address_holding_no: employee.permanent_address?.holding_no ?? '',
    permanent_address_village_road: employee.permanent_address?.village_road ?? '',
    permanent_address_union_ward: employee.permanent_address?.union_ward ?? '',
    permanent_address_upazila_thana: employee.permanent_address?.upazila_thana ?? '',
    permanent_address_district: employee.permanent_address?.district ?? '',
    permanent_address_division: employee.permanent_address?.division ?? '',
    ssc_year:
      employee.ssc_year !== undefined && employee.ssc_year !== null
        ? String(employee.ssc_year)
        : '',
    highest_degree: employee.highest_degree ?? '',
    last_organization: employee.last_organization ?? '',
    last_position: employee.last_position ?? '',
    experience_years:
      employee.experience_years !== undefined && employee.experience_years !== null
        ? String(employee.experience_years)
        : '',
    reference_name: employee.reference_name ?? '',
    reference_mobile: employee.reference_mobile ?? '',
    remarks: employee.remarks ?? '',
    active: employee.active ?? true,
  }), [meta]);

  const handleEditEmployee = useCallback(
    (employee: Employee) => {
      setEditingEmployee(employee);
      reset(mapEmployeeToForm(employee));
      
      // Extract territory assignments
      if (employee.territory_assignments) {
        const zone_id = employee.territory_assignments.zone_ids?.[0];
        const region_id = employee.territory_assignments.region_ids?.[0];
        const area_id = employee.territory_assignments.area_ids?.[0];
        
        setTerritorySelection({
          zone_id: typeof zone_id === 'string' ? zone_id : zone_id?._id,
          region_id: typeof region_id === 'string' ? region_id : region_id?._id,
          area_id: typeof area_id === 'string' ? area_id : area_id?._id,
        });
      } else {
        setTerritorySelection({});
      }
      
      setOpenDialog(true);
    },
    [mapEmployeeToForm, reset]
  );

  const handleAddEmployee = useCallback(() => {
    setEditingEmployee(null);
    setTerritorySelection({});
    reset({
      employee_id: '',
      employee_type: 'hq',
      designation_id: '',
      facility_id: '',
      factory_store_id: '', // NEW: Factory store ID
      name: '',
      father_name: '',
      mother_name: '',
      date_birth: '',
      gender: '',
      religion: '',
      marital_status: '',
      nationality: meta?.defaultNationality ?? '',
      national_id: '',
      passport_number: '',
      passport_issue_date: '',
      mobile_personal: '',
      email: '',
      emergency_contact: '',
      emergency_mobile: '',
      blood_group: '',
      present_address_holding_no: '',
      present_address_road: '',
      present_address_city: '',
      present_address_post_code: '',
      permanent_address_holding_no: '',
      permanent_address_village_road: '',
      permanent_address_union_ward: '',
      permanent_address_upazila_thana: '',
      permanent_address_district: '',
      permanent_address_division: '',
      ssc_year: '',
      highest_degree: '',
      last_organization: '',
      last_position: '',
      experience_years: '',
      reference_name: '',
      reference_mobile: '',
      remarks: '',
      active: true,
    });
    setOpenDialog(true);
  }, [meta?.defaultNationality, reset]);

  const handleCloseDialog = useCallback(() => {
    setOpenDialog(false);
    setEditingEmployee(null);
    setTerritorySelection({});
  }, []);

  const employeeColumns = useMemo<EmployeeColumnDefinition[]>(
    () => [
      {
        id: 'employee_id',
        label: 'Employee ID',
        sortableKey: 'employee_id',
        renderCell: (employee) => employee.employee_id,
      },
      {
        id: 'name',
        label: 'Name',
        sortableKey: 'name',
        renderCell: (employee) => (
          <Typography variant="body1" fontWeight="medium">
            {employee.name}
          </Typography>
        ),
      },
      {
        id: 'designation',
        label: 'Designation',
        sortableKey: 'designation',
        renderCell: (employee) => getDesignationName(employee.designation_id, designations) || '-',
      },
      {
        id: 'gender',
        label: 'Gender',
        renderCell: (employee) => employee.gender || '-',
      },
      {
        id: 'marital_status',
        label: 'Marital Status',
        renderCell: (employee) => employee.marital_status || '-',
      },
      {
        id: 'religion',
        label: 'Religion',
        renderCell: (employee) => employee.religion || '-',
      },
      {
        id: 'date_birth',
        label: 'Birth Date',
        renderCell: (employee) => formatDate(employee.date_birth),
      },
      {
        id: 'mobile_personal',
        label: 'Mobile (Personal)',
        renderCell: (employee) => employee.mobile_personal || '-',
      },
      {
        id: 'email',
        label: 'Email',
        renderCell: (employee) => employee.email || '-',
      },
      {
        id: 'emergency_contact',
        label: 'Emergency Contact',
        renderCell: (employee) => employee.emergency_contact || '-',
      },
      {
        id: 'emergency_mobile',
        label: 'Emergency Mobile',
        renderCell: (employee) => employee.emergency_mobile || '-',
      },
      {
        id: 'blood_group',
        label: 'Blood Group',
        renderCell: (employee) => employee.blood_group || '-',
      },
      {
        id: 'nationality',
        label: 'Nationality',
        renderCell: (employee) => employee.nationality || '-',
      },
      {
        id: 'present_city',
        label: 'Present City',
        renderCell: (employee) => employee.present_address?.city || '-',
      },
      {
        id: 'present_post_code',
        label: 'Present Post Code',
        renderCell: (employee) =>
          employee.present_address?.post_code != null
            ? String(employee.present_address.post_code)
            : '-',
      },
      {
        id: 'permanent_district',
        label: 'Permanent District',
        renderCell: (employee) => employee.permanent_address?.district || '-',
      },
      {
        id: 'permanent_division',
        label: 'Permanent Division',
        renderCell: (employee) => employee.permanent_address?.division || '-',
      },
      {
        id: 'last_position',
        label: 'Last Position',
        renderCell: (employee) => employee.last_position || '-',
      },
      {
        id: 'experience_years',
        label: 'Experience (yrs)',
        renderCell: (employee) =>
          employee.experience_years != null ? `${employee.experience_years}` : '-',
      },
      {
        id: 'status',
        label: 'Status',
        renderCell: (employee) => (
          <Chip
            label={employee.active ? 'Active' : 'Inactive'}
            color={employee.active ? 'success' : 'default'}
            size="small"
          />
        ),
      },
      {
        id: 'created_at',
        label: 'Created Date',
        sortableKey: 'created_at',
        renderCell: (employee) => formatDate(employee.created_at),
      },
      {
        id: 'updated_at',
        label: 'Updated Date',
        renderCell: (employee) => formatDate(employee.updated_at),
      },
      {
        id: 'actions',
        label: 'Actions',
        alwaysVisible: true,
        align: 'right',
        renderCell: (employee) => (
          <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1 }}>
            <Tooltip title="Edit Employee">
              <IconButton size="small" onClick={() => handleEditEmployee(employee)} color="primary">
                <EditIcon />
              </IconButton>
            </Tooltip>
            <Tooltip title="Delete Employee">
              <IconButton
                size="small"
                onClick={() => {
                  setEmployeeToDelete(employee._id);
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
    [designations, handleEditEmployee]
  );

  const selectableEmployeeColumnIds = useMemo(
    () => employeeColumns.filter((column) => !column.alwaysVisible).map((column) => column.id),
    [employeeColumns]
  );

  const handleVisibleColumnsChange = useCallback(
    (nextSelected: string[]) => {
      const sanitized = selectableEmployeeColumnIds.filter((id) => nextSelected.includes(id));
      setVisibleEmployeeColumnIds(sanitized.length ? sanitized : selectableEmployeeColumnIds);
    },
    [selectableEmployeeColumnIds]
  );

  const columnVisibilityOptions = useMemo(
    () => employeeColumns.map(({ id, label, alwaysVisible }) => ({ id, label, alwaysVisible })),
    [employeeColumns]
  );

  const sanitizeEmployeeSelection = useCallback(
    (ids: string[]) => selectableEmployeeColumnIds.filter((id) => ids.includes(id)),
    [selectableEmployeeColumnIds]
  );

  useEffect(() => {
    if (!selectableEmployeeColumnIds.length) {
      setVisibleEmployeeColumnIds([]);
      setPersistedEmployeeColumnIds([]);
      return;
    }

    if (!columnStateHydratedRef.current) {
      columnStateHydratedRef.current = true;

      let initialSelection = selectableEmployeeColumnIds;

      try {
        const stored = window.localStorage.getItem(EMPLOYEE_COLUMN_STORAGE_KEY);
        if (stored) {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed)) {
            const sanitized = sanitizeEmployeeSelection(parsed);
            if (sanitized.length) {
              initialSelection = sanitized;
            }
          }
        }
      } catch (error) {
        console.warn('Failed to read employee column preferences', error);
      }

      setVisibleEmployeeColumnIds(initialSelection);
      setPersistedEmployeeColumnIds(initialSelection);
      return;
    }

    setVisibleEmployeeColumnIds((prev) => {
      const sanitizedPrevious = sanitizeEmployeeSelection(prev);
      if (sanitizedPrevious.length) {
        return sanitizedPrevious;
      }
      return selectableEmployeeColumnIds;
    });

    setPersistedEmployeeColumnIds((previous) => {
      const sanitizedPrevious = sanitizeEmployeeSelection(previous);
      if (sanitizedPrevious.length) {
        return sanitizedPrevious;
      }
      return selectableEmployeeColumnIds;
    });
  }, [sanitizeEmployeeSelection, selectableEmployeeColumnIds]);

  const employeeHasUnsavedChanges = useMemo(() => {
    if (visibleEmployeeColumnIds.length !== persistedEmployeeColumnIds.length) {
      return true;
    }
    const persistedSet = new Set(persistedEmployeeColumnIds);
    return visibleEmployeeColumnIds.some((id) => !persistedSet.has(id));
  }, [persistedEmployeeColumnIds, visibleEmployeeColumnIds]);

  const handleSaveEmployeeColumnSelection = useCallback(() => {
    const sanitized = sanitizeEmployeeSelection(visibleEmployeeColumnIds);
    setVisibleEmployeeColumnIds(sanitized);
    setPersistedEmployeeColumnIds(sanitized);
    try {
      window.localStorage.setItem(EMPLOYEE_COLUMN_STORAGE_KEY, JSON.stringify(sanitized));
      toast.success('Column selection saved');
    } catch (error) {
      console.warn('Failed to persist employee column preferences', error);
      toast.error('Failed to save column selection');
    }
  }, [sanitizeEmployeeSelection, visibleEmployeeColumnIds]);

  const visibleEmployeeColumns = useMemo(
    () =>
      employeeColumns.filter(
        (column) => column.alwaysVisible || visibleEmployeeColumnIds.includes(column.id)
      ),
    [employeeColumns, visibleEmployeeColumnIds]
  );

  const tableMinWidth = useMemo(
    () => calculateTableMinWidth(visibleEmployeeColumns.length, 160, 1200),
    [visibleEmployeeColumns.length]
  );

  const renderCardsView = () => (
    <>
      <Grid container spacing={2}>
        {paginatedEmployees.map((employee) => (
          <Grid key={employee._id} size={{ xs: 12, sm: 6, md: 4 }}>
            <Card>
              <CardContent>
                <Stack direction="row" spacing={1.5} alignItems="center" sx={{ mb: 2 }}>
                  <BadgeIcon color="primary" />
                  <Box>
                    <Typography variant="h6" component="h2">
                      {employee.name}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      ID: {employee.employee_id}
                    </Typography>
                  </Box>
                  <Chip
                    label={employee.active ? 'Active' : 'Inactive'}
                    color={employee.active ? 'success' : 'default'}
                    size="small"
                    sx={{ ml: 'auto' }}
                  />
                </Stack>
                <Typography variant="body2" color="text.secondary">
                  Designation: {getDesignationName(employee.designation_id, designations) || '-'}
                </Typography>
                {employee.facility_id && typeof employee.facility_id === 'object' && (
                  <Typography variant="body2" color="text.secondary">
                    Facility: {employee.facility_id.name} ({employee.facility_id.type})
                  </Typography>
                )}
                {employee.factory_store_id && typeof employee.factory_store_id === 'object' && (
                  <Typography variant="body2" color="text.secondary">
                    Factory Store: {employee.factory_store_id.name}
                  </Typography>
                )}
                <Typography variant="body2" color="text.secondary">
                  Mobile: {employee.mobile_personal || '-'}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Email: {employee.email || '-'}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Joined: {formatDate(employee.created_at)}
                </Typography>
              </CardContent>
              <CardActions sx={{ justifyContent: 'flex-end', pt: 0 }}>
                <Tooltip title="Edit Employee">
                  <IconButton size="small" onClick={() => handleEditEmployee(employee)} color="primary">
                    <EditIcon />
                  </IconButton>
                </Tooltip>
                <Tooltip title="Delete Employee">
                  <IconButton
                    size="small"
                    onClick={() => {
                      setEmployeeToDelete(employee._id);
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
      <Box sx={{ display: 'flex', justifyContent: 'center', mt: 3 }}>
        <TablePagination
          rowsPerPageOptions={[10, 25, 50, 100, 500]}
          component="div"
          count={sortedEmployees.length}
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
            {visibleEmployeeColumns.map((column) => {
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
                          zIndex: 4,
                          boxShadow: (theme) => `-4px 0 8px -4px ${theme.palette.grey[300]}`,
                        }
                      : {}),
                  }}
                >
                  {column.sortableKey ? (
                    <TableSortLabel
                      active={orderBy === column.sortableKey}
                      direction={orderBy === column.sortableKey ? order : 'asc'}
                      onClick={() => handleSort(column.sortableKey!)}
                      sx={{ fontWeight: 'bold' }}
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
          {paginatedEmployees.map((employee) => (
            <TableRow key={employee._id} hover>
              {visibleEmployeeColumns.map((column) => {
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
                            zIndex: 3,
                            boxShadow: (theme) => `-4px 0 8px -4px ${theme.palette.grey[200]}`,
                          }
                        : {}),
                    }}
                  >
                    {column.renderCell(employee)}
                  </TableCell>
                );
              })}
            </TableRow>
          ))}
        </TableBody>
      </Table>
      <TablePagination
        rowsPerPageOptions={[10, 25, 50, 100, 500]}
        component="div"
        count={sortedEmployees.length}
        rowsPerPage={rowsPerPage}
        page={page}
        onPageChange={handleChangePage}
        onRowsPerPageChange={handleChangeRowsPerPage}
      />
    </TableContainer>
  );

  if (loading) {
    return (
      <Box sx={{ p: 3 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          Employee Management
        </Typography>
        <Grid container spacing={3}>
          {[...Array(6)].map((_, index) => (
            <Grid key={index} size={{ xs: 12, sm: 6, md: 4 }}>
              <Skeleton variant="rectangular" height={220} />
            </Grid>
          ))}
        </Grid>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
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
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <BadgeIcon sx={{ color: 'primary.main' }} />
          <Typography variant="h4" component="h1">
            Employee Management
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={handleAddEmployee}
          sx={{ minWidth: 'max-content' }}
        >
          Add Employee
        </Button>
      </Box>

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
          placeholder="Search employees..."
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
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <ExportMenu
            title="Employee Report"
            fileBaseName="employees"
            currentRows={paginatedEmployees}
            columns={employeeExportColumns}
            onFetchAll={fetchAllEmployees}
            disabled={loading || (employees.length === 0 && paginatedEmployees.length === 0)}
          />
          <ColumnVisibilityMenu
            options={columnVisibilityOptions}
            selected={visibleEmployeeColumnIds}
            onChange={handleVisibleColumnsChange}
            onSaveSelection={handleSaveEmployeeColumnSelection}
            saveDisabled={!employeeHasUnsavedChanges}
            minSelectable={1}
          />
          <ToggleButtonGroup
            value={viewMode}
            exclusive
            onChange={(_event, newMode) => newMode && setViewMode(newMode)}
            aria-label="view mode"
          >
            <ToggleButton value="cards" aria-label="card view">
              <ViewModuleIcon />
            </ToggleButton>
            <ToggleButton value="list" aria-label="list view">
              <ViewListIcon />
            </ToggleButton>
          </ToggleButtonGroup>
        </Box>
      </Box>

      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Showing {filteredEmployees.length} of {employees.length} employees
      </Typography>

      {viewMode === 'cards' ? renderCardsView() : renderListView()}

      <Fab
        color="primary"
        aria-label="add employee"
        onClick={handleAddEmployee}
        sx={{
          position: 'fixed',
          bottom: 24,
          right: 24,
          display: { xs: 'flex', md: 'none' },
        }}
      >
        <AddIcon />
      </Fab>

      <Dialog
        open={openDialog}
        onClose={handleCloseDialog}
        fullWidth
        maxWidth="lg"
      >
        <DialogTitle>{editingEmployee ? 'Edit Employee' : 'Add Employee'}</DialogTitle>
        <form onSubmit={handleSubmit(onSubmit)} noValidate>
          <DialogContent dividers>
          {metaLoading && (
            <Alert severity="info" sx={{ mb: 2 }}>
              Loading employee metadata...
            </Alert>
          )}
          {!metaLoading && !meta && (
            <Alert severity="warning" sx={{ mb: 2 }}>
              Metadata could not be loaded. Some select options may be unavailable.
            </Alert>
          )}
          <Box sx={{ mt: 2 }}>
            <Grid container spacing={2}>
              <Grid size={{ xs: 12, md: 6 }}>
                <Controller
                  name="employee_id"
                  control={control}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      label="Employee ID"
                      fullWidth
                      error={Boolean(errors.employee_id)}
                      helperText={errors.employee_id?.message}
                      disabled={isSubmitting}
                    />
                  )}
                />
              </Grid>
              <Grid size={{ xs: 12, md: 6 }}>
                <Controller
                  name="employee_type"
                  control={control}
                  render={({ field }) => (
                    <TextField
                      select
                      label="Employee Type"
                      fullWidth
                      {...field}
                      value={field.value || 'hq'}
                      error={Boolean(errors.employee_type)}
                      helperText={errors.employee_type?.message || 'Select employee type to determine context requirements'}
                      disabled={isSubmitting}
                    >
                      <MenuItem value="hq">HQ</MenuItem>
                      <MenuItem value="field">Field</MenuItem>
                      <MenuItem value="facility">Facility</MenuItem>
                      <MenuItem value="system_admin">System Admin</MenuItem>
                    </TextField>
                  )}
                />
              </Grid>
              <Grid size={{ xs: 12, md: 6 }}>
                <Controller
                  name="designation_id"
                  control={control}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      select
                      label="Designation"
                      fullWidth
                      error={Boolean(errors.designation_id)}
                      helperText={errors.designation_id?.message}
                      disabled={isSubmitting || designations.length === 0}
                    >
                      {designations.map((designation) => (
                        <MenuItem key={designation._id} value={designation._id}>
                          {designation.name}
                        </MenuItem>
                      ))}
                    </TextField>
                  )}
                />
              </Grid>
              
              {/* Facility Selector - Only for 'facility' employee type */}
              {shouldShowFacilitySelector && (
                <Grid size={{ xs: 12, md: 6 }}>
                  <TextField
                    select
                    label="Facility"
                    fullWidth
                    {...register('facility_id')}
                    value={watch('facility_id') || ''}
                    error={Boolean(errors.facility_id)}
                    helperText={
                      errors.facility_id?.message || 
                      'Production role: Select Factory. Inventory role: Select Depot'
                    }
                    disabled={isSubmitting || facilities.length === 0}
                  >
                    <MenuItem value="">
                      <em>No Facility</em>
                    </MenuItem>
                    {facilities.map((facility) => (
                      <MenuItem key={facility._id} value={facility._id}>
                        {facility.name} ({facility.type})
                      </MenuItem>
                    ))}
                  </TextField>
                </Grid>
              )}

              {/* Factory Store Selector - Only for facility employees at Factory-type facilities (Production) */}
              {shouldShowFactoryStoreSelector && (
                <Grid size={{ xs: 12, md: 6 }}>
                  <TextField
                    select
                    label="Factory Store (Depot)"
                    fullWidth
                    {...register('factory_store_id')}
                    value={watch('factory_store_id') || ''}
                    error={Boolean(errors.factory_store_id)}
                    helperText={
                      errors.factory_store_id?.message || 
                      'Select the depot within the factory for production storage (for Production role)'
                    }
                    disabled={isSubmitting || depotFacilities.length === 0}
                  >
                    <MenuItem value="">
                      <em>No Factory Store</em>
                    </MenuItem>
                    {depotFacilities.map((depot) => (
                      <MenuItem key={depot._id} value={depot._id}>
                        {depot.name}
                      </MenuItem>
                    ))}
                  </TextField>
                </Grid>
              )}
              
              {/* Territory Selector - Only for 'field' employee type */}
              {shouldShowTerritorySelector && (
                <Grid size={{ xs: 12 }}>
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                      Territory Assignment (Required for field employees)
                    </Typography>
                    <Typography variant="caption" color="text.secondary" display="block" gutterBottom>
                      Select territories based on employee's scope:
                      • Zone only = Zonal level employee
                      • Zone + Region = Regional level employee  
                      • Zone + Region + Area = Area level employee
                    </Typography>
                    <TerritorySelector
                      mode="free"
                      value={territorySelection}
                      onChange={setTerritorySelection}
                      disabled={isSubmitting}
                    />
                  </Box>
                </Grid>
              )}
              
              <Grid size={{ xs: 12, md: 6 }}>
                <Controller
                  name="name"
                  control={control}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      label="Full Name"
                      fullWidth
                      error={Boolean(errors.name)}
                      helperText={errors.name?.message}
                      disabled={isSubmitting}
                    />
                  )}
                />
              </Grid>
              <Grid size={{ xs: 12, md: 6 }}>
                <TextField
                  label="Father's Name"
                  fullWidth
                  {...register('father_name')}
                  disabled={isSubmitting}
                />
              </Grid>
              <Grid size={{ xs: 12, md: 6 }}>
                <TextField
                  label="Mother's Name"
                  fullWidth
                  {...register('mother_name')}
                  disabled={isSubmitting}
                />
              </Grid>
              <Grid size={{ xs: 12, md: 6 }}>
                <Controller
                  name="date_birth"
                  control={control}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      type="date"
                      label="Date of Birth"
                      fullWidth
                      InputLabelProps={{ shrink: true }}
                      error={Boolean(errors.date_birth)}
                      helperText={errors.date_birth?.message}
                      disabled={isSubmitting}
                    />
                  )}
                />
              </Grid>
              <Grid size={{ xs: 12, md: 4 }}>
                <Controller
                  name="gender"
                  control={control}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      select
                      label="Gender"
                      fullWidth
                      error={Boolean(errors.gender)}
                      helperText={errors.gender?.message}
                      disabled={isSubmitting || !meta?.genders?.length}
                    >
                      {(meta?.genders ?? []).map((gender) => (
                        <MenuItem key={gender} value={gender}>
                          {gender}
                        </MenuItem>
                      ))}
                    </TextField>
                  )}
                />
              </Grid>
              <Grid size={{ xs: 12, md: 4 }}>
                <Controller
                  name="religion"
                  control={control}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      select
                      label="Religion"
                      fullWidth
                      error={Boolean(errors.religion)}
                      helperText={errors.religion?.message}
                      disabled={isSubmitting || !meta?.religions?.length}
                    >
                      {(meta?.religions ?? []).map((religion) => (
                        <MenuItem key={religion} value={religion}>
                          {religion}
                        </MenuItem>
                      ))}
                    </TextField>
                  )}
                />
              </Grid>
              <Grid size={{ xs: 12, md: 4 }}>
                <Controller
                  name="marital_status"
                  control={control}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      select
                      label="Marital Status"
                      fullWidth
                      error={Boolean(errors.marital_status)}
                      helperText={errors.marital_status?.message}
                      disabled={isSubmitting || !meta?.maritalStatuses?.length}
                    >
                      {(meta?.maritalStatuses ?? []).map((status) => (
                        <MenuItem key={status} value={status}>
                          {status}
                        </MenuItem>
                      ))}
                    </TextField>
                  )}
                />
              </Grid>
              <Grid size={{ xs: 12, md: 4 }}>
                <TextField
                  label="Nationality"
                  fullWidth
                  {...register('nationality')}
                  disabled={isSubmitting}
                />
              </Grid>
              <Grid size={{ xs: 12, md: 4 }}>
                <TextField
                  label="National ID"
                  fullWidth
                  {...register('national_id')}
                  disabled={isSubmitting}
                />
              </Grid>
              <Grid size={{ xs: 12, md: 4 }}>
                <TextField
                  label="Passport Number"
                  fullWidth
                  {...register('passport_number')}
                  disabled={isSubmitting}
                />
              </Grid>
              <Grid size={{ xs: 12, md: 4 }}>
                <TextField
                  type="date"
                  label="Passport Issue Date"
                  fullWidth
                  InputLabelProps={{ shrink: true }}
                  {...register('passport_issue_date')}
                  disabled={isSubmitting}
                />
              </Grid>
              <Grid size={{ xs: 12, md: 4 }}>
                <TextField
                  label="Personal Mobile"
                  fullWidth
                  {...register('mobile_personal')}
                  disabled={isSubmitting}
                />
              </Grid>
              <Grid size={{ xs: 12, md: 4 }}>
                <TextField
                  label="Email"
                  fullWidth
                  {...register('email')}
                  error={Boolean(errors.email)}
                  helperText={errors.email?.message}
                  disabled={isSubmitting}
                />
              </Grid>
              <Grid size={{ xs: 12, md: 6 }}>
                <TextField
                  label="Emergency Contact Person"
                  fullWidth
                  {...register('emergency_contact')}
                  disabled={isSubmitting}
                />
              </Grid>
              <Grid size={{ xs: 12, md: 6 }}>
                <TextField
                  label="Emergency Mobile"
                  fullWidth
                  {...register('emergency_mobile')}
                  disabled={isSubmitting}
                />
              </Grid>
              <Grid size={{ xs: 12, md: 4 }}>
                <Controller
                  name="blood_group"
                  control={control}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      select
                      label="Blood Group"
                      fullWidth
                      error={Boolean(errors.blood_group)}
                      helperText={errors.blood_group?.message}
                      disabled={isSubmitting || !meta?.bloodGroups?.length}
                    >
                      {(meta?.bloodGroups ?? []).map((group) => (
                        <MenuItem key={group} value={group}>
                          {group}
                        </MenuItem>
                      ))}
                    </TextField>
                  )}
                />
              </Grid>

              <Grid size={{ xs: 12 }}>
                <Typography variant="subtitle1" sx={{ mt: 2 }}>
                  Present Address
                </Typography>
              </Grid>
              <Grid size={{ xs: 12, md: 3 }}>
                <TextField
                  label="Holding No"
                  fullWidth
                  {...register('present_address_holding_no')}
                  disabled={isSubmitting}
                />
              </Grid>
              <Grid size={{ xs: 12, md: 3 }}>
                <TextField
                  label="Road"
                  fullWidth
                  {...register('present_address_road')}
                  disabled={isSubmitting}
                />
              </Grid>
              <Grid size={{ xs: 12, md: 3 }}>
                <TextField
                  label="City"
                  fullWidth
                  {...register('present_address_city')}
                  disabled={isSubmitting}
                />
              </Grid>
              <Grid size={{ xs: 12, md: 3 }}>
                <TextField
                  label="Post Code"
                  fullWidth
                  {...register('present_address_post_code')}
                  disabled={isSubmitting}
                />
              </Grid>

              <Grid size={{ xs: 12 }}>
                <Typography variant="subtitle1" sx={{ mt: 2 }}>
                  Permanent Address
                </Typography>
              </Grid>
              <Grid size={{ xs: 12, md: 3 }}>
                <TextField
                  label="Holding No"
                  fullWidth
                  {...register('permanent_address_holding_no')}
                  disabled={isSubmitting}
                />
              </Grid>
              <Grid size={{ xs: 12, md: 3 }}>
                <TextField
                  label="Village/Road"
                  fullWidth
                  {...register('permanent_address_village_road')}
                  disabled={isSubmitting}
                />
              </Grid>
              <Grid size={{ xs: 12, md: 3 }}>
                <TextField
                  label="Union/Ward"
                  fullWidth
                  {...register('permanent_address_union_ward')}
                  disabled={isSubmitting}
                />
              </Grid>
              <Grid size={{ xs: 12, md: 3 }}>
                <TextField
                  label="Upazila/Thana"
                  fullWidth
                  {...register('permanent_address_upazila_thana')}
                  disabled={isSubmitting}
                />
              </Grid>
              <Grid size={{ xs: 12, md: 6 }}>
                <Controller
                  name="permanent_address_district"
                  control={control}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      select
                      label="District"
                      fullWidth
                      error={Boolean(errors.permanent_address_district)}
                      helperText={errors.permanent_address_district?.message}
                      disabled={isSubmitting || !meta?.districts?.length}
                    >
                      {(meta?.districts ?? []).map((district) => (
                        <MenuItem key={district} value={district}>
                          {district}
                        </MenuItem>
                      ))}
                    </TextField>
                  )}
                />
              </Grid>
              <Grid size={{ xs: 12, md: 6 }}>
                <Controller
                  name="permanent_address_division"
                  control={control}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      select
                      label="Division"
                      fullWidth
                      error={Boolean(errors.permanent_address_division)}
                      helperText={errors.permanent_address_division?.message}
                      disabled={isSubmitting || !meta?.divisions?.length}
                    >
                      {(meta?.divisions ?? []).map((division) => (
                        <MenuItem key={division} value={division}>
                          {division}
                        </MenuItem>
                      ))}
                    </TextField>
                  )}
                />
              </Grid>

              <Grid size={{ xs: 12, md: 4 }}>
                <TextField
                  label="SSC Passing Year"
                  fullWidth
                  {...register('ssc_year')}
                  disabled={isSubmitting}
                />
              </Grid>
              <Grid size={{ xs: 12, md: 4 }}>
                <TextField
                  label="Highest Degree"
                  fullWidth
                  {...register('highest_degree')}
                  disabled={isSubmitting}
                />
              </Grid>
              <Grid size={{ xs: 12, md: 4 }}>
                <TextField
                  label="Experience (years)"
                  fullWidth
                  {...register('experience_years')}
                  disabled={isSubmitting}
                />
              </Grid>
              <Grid size={{ xs: 12, md: 6 }}>
                <TextField
                  label="Last Organization"
                  fullWidth
                  {...register('last_organization')}
                  disabled={isSubmitting}
                />
              </Grid>
              <Grid size={{ xs: 12, md: 6 }}>
                <TextField
                  label="Last Position"
                  fullWidth
                  {...register('last_position')}
                  disabled={isSubmitting}
                />
              </Grid>
              <Grid size={{ xs: 12, md: 6 }}>
                <TextField
                  label="Reference Name"
                  fullWidth
                  {...register('reference_name')}
                  disabled={isSubmitting}
                />
              </Grid>
              <Grid size={{ xs: 12, md: 6 }}>
                <TextField
                  label="Reference Mobile"
                  fullWidth
                  {...register('reference_mobile')}
                  disabled={isSubmitting}
                />
              </Grid>
              <Grid size={{ xs: 12 }}>
                <TextField
                  label="Remarks"
                  fullWidth
                  multiline
                  minRows={3}
                  {...register('remarks')}
                  disabled={isSubmitting}
                />
              </Grid>
              <Grid size={{ xs: 12 }}>
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
              </Grid>
            </Grid>
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 3 }}>
          <Button onClick={handleCloseDialog} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button type="submit" variant="contained" disabled={isSubmitting}>
            {editingEmployee ? 'Update' : 'Create'}
          </Button>
        </DialogActions>
        </form>
      </Dialog>

      <Dialog
        open={deleteConfirmOpen}
        onClose={() => setDeleteConfirmOpen(false)}
        fullWidth
        maxWidth="xs"
      >
        <DialogTitle>Delete Employee</DialogTitle>
        <DialogContent>
          <Alert severity="warning" sx={{ mb: 1 }}>
            Are you sure you want to delete this employee? This action cannot be undone.
          </Alert>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 3 }}>
          <Button onClick={() => setDeleteConfirmOpen(false)} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button
            onClick={handleDeleteEmployee}
            color="error"
            variant="contained"
            disabled={isSubmitting}
          >
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
