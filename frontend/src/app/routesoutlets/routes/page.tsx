"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Box,
  Button,
  TextField,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  Paper,
  Typography,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Chip,
  Tabs,
  Tab,
  Card,
  CardContent,
  Alert,
  Switch,
  FormControlLabel,
  Checkbox,
  FormGroup,
} from "@mui/material";
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Search as SearchIcon,
  Refresh as RefreshIcon,
  Upload as UploadIcon,
  Assessment as AssessmentIcon,
  FileDownload as FileDownloadIcon,
} from "@mui/icons-material";
import { DataGrid, GridColDef } from "@mui/x-data-grid";
import { listRoutes, createRoute, updateRoute, deleteRoute, activateRoute } from "@/lib/api/routes";
import { listTerritories, getTerritoryById } from "@/lib/api/territories";
import { listDistributors } from "@/lib/api/distributors";
import { listEmployees } from "@/lib/api/employees";
import { Route, RouteFormData } from "@/types/route";
import { useAuth } from "@/contexts/AuthContext";

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;
  return (
    <div role="tabpanel" hidden={value !== index} {...other}>
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  );
}

const DAYS = [
  { value: "SAT", label: "Saturday" },
  { value: "SUN", label: "Sunday" },
  { value: "MON", label: "Monday" },
  { value: "TUE", label: "Tuesday" },
  { value: "WED", label: "Wednesday" },
  { value: "THU", label: "Thursday" },
  { value: "FRI", label: "Friday" },
];

export default function RoutesPage() {
  const { hasPermission } = useAuth();
  const [routes, setRoutes] = useState<Route[]>([]);
  const [loading, setLoading] = useState(false);
  const [openDialog, setOpenDialog] = useState(false);
  const [editingRoute, setEditingRoute] = useState<Route | null>(null);
  const [tabValue, setTabValue] = useState(0);
  const [isMobile, setIsMobile] = useState(false);
  
  // Filter states
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedZone, setSelectedZone] = useState<string>("");
  const [selectedRegion, setSelectedRegion] = useState<string>("");
  const [selectedArea, setSelectedArea] = useState<string>("");
  const [selectedDistributor, setSelectedDistributor] = useState<string>("");
  const [showActiveOnly, setShowActiveOnly] = useState(true);
  
  // Dropdown data
  const [zones, setZones] = useState<Array<{ _id: string; name: string; territory_id: string }>>([]);
  const [regions, setRegions] = useState<Array<{ _id: string; name: string; territory_id: string }>>([]);
  const [areas, setAreas] = useState<Array<{ _id: string; name: string; territory_id: string }>>([]);
  const [dbPoints, setDbPoints] = useState<Array<{ _id: string; name: string; territory_id: string }>>([]);
  const [distributors, setDistributors] = useState<Array<{ _id: string; name: string; distributor_id: string }>>([]);
  const [salesReps, setSalesReps] = useState<Array<{ _id: string; name: string; employee_id: string }>>([]);
  
  // Form state
  const [formData, setFormData] = useState<RouteFormData & { zone_id?: string; region_id?: string }>({
    route_id: "",
    route_name: "",
    zone_id: "",
    region_id: "",
    area_id: "",
    db_point_id: "",
    distributor_id: "",
    sr_assignments: {
      sr_1: { sr_id: null, visit_days: [] },
      sr_2: { sr_id: null, visit_days: [] },
    },
    frequency: 0,
    contribution: 0,
    contribution_mf: 0,
    route_pf: 0,
    outlet_qty: 0,
    actual_outlet_qty: 0,
  });
  
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  const canCreate = hasPermission("routes:create");
  const canUpdate = hasPermission("routes:update");
  const canDelete = hasPermission("routes:delete");

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 600);
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const loadRoutes = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const params: { limit: number; active: boolean; search?: string; area_id?: string; distributor_id?: string } = { 
        limit: 100000, 
        active: showActiveOnly 
      };
      if (searchTerm) params.search = searchTerm;
      if (selectedArea) params.area_id = selectedArea;
      if (selectedDistributor) params.distributor_id = selectedDistributor;
      
      const data = await listRoutes(params);
      setRoutes(data.routes || []);
    } catch (err) {
      console.error("Failed to load routes:", err);
      const errorMessage = err instanceof Error ? err.message : "Failed to load routes";
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [searchTerm, selectedArea, selectedDistributor, showActiveOnly]);

  const loadZones = useCallback(async () => {
    try {
      const response = await listTerritories({ limit: 100000, type: "ZONE", active: true });
      setZones(response.data || []);
    } catch (err) {
      console.error("Failed to load zones:", err);
    }
  }, []);

  const loadRegions = useCallback(async (zoneId?: string) => {
    try {
      const params: any = { limit: 100000, type: "REGION", active: true };
      if (zoneId) params.parentId = zoneId;
      const response = await listTerritories(params);
      setRegions(response.data || []);
    } catch (err) {
      console.error("Failed to load regions:", err);
    }
  }, []);

  const loadAreas = useCallback(async (regionId?: string) => {
    try {
      const params: any = { limit: 100000, type: "AREA", active: true };
      if (regionId) params.parentId = regionId;
      const response = await listTerritories(params);
      setAreas(response.data || []);
    } catch (err) {
      console.error("Failed to load areas:", err);
    }
  }, []);

  const loadSalesReps = useCallback(async (areaId?: string) => {
    try {
      const params: any = { limit: 100000, active: true, employee_type: 'field', designation_name: 'Sales Officer' };
      if (areaId) {
        params.area_id = areaId;
      }
      const response = await listEmployees(params);
      setSalesReps(response.employees || []);
    } catch (err) {
      console.error("Failed to load sales reps:", err);
    }
  }, []);

  useEffect(() => {
    loadRoutes();
    loadZones();
    loadSalesReps();
  }, [loadRoutes, loadZones, loadSalesReps]);

  const loadDbPoints = async (areaId: string) => {
    try {
      const response = await listTerritories({ 
        limit: 100000, 
        type: "DB_POINT", 
        parentId: areaId, 
        active: true 
      });
      setDbPoints(response.data || []);
    } catch (err) {
      console.error("Failed to load DB points:", err);
    }
  };

  const loadDistributors = async (dbPointId: string) => {
    try {
      const response = await listDistributors({ limit: 100000, db_point_id: dbPointId, active: true });
      setDistributors(response.data || []);
    } catch (err) {
      console.error("Failed to load distributors:", err);
    }
  };

  // Cascading handlers for filters
  const handleZoneFilterChange = async (zoneId: string) => {
    setSelectedZone(zoneId);
    setSelectedRegion("");
    setSelectedArea("");
    setRegions([]);
    setAreas([]);
    if (zoneId) {
      loadRegions(zoneId);
    }
  };

  const handleRegionFilterChange = async (regionId: string) => {
    setSelectedRegion(regionId);
    setSelectedArea("");
    setAreas([]);
    if (regionId) {
      loadAreas(regionId);
    }
  };

  // Cascading handlers for form
  const handleAreaChange = async (areaId: string) => {
    setFormData({
      ...formData,
      area_id: areaId,
      db_point_id: "",
      distributor_id: "",
    });
    
    if (areaId) {
      await loadDbPoints(areaId);
      await loadSalesReps(areaId);
    } else {
      setDbPoints([]);
      setDistributors([]);
      setSalesReps([]);
    }
  };

  const handleOpenDialog = async (route?: Route) => {
    if (route) {
      setEditingRoute(route);
      
      // Extract territory hierarchy from route data
      const areaId = route.area_id._id;
      const dbPointId = route.db_point_id?._id;
      
      // Get region_id from area's parent_id
      const regionId = route.area_id.parent_id || "";
      console.log("Edit Route - Area:", route.area_id, "RegionId:", regionId);
      
      // Load zones first
      await loadZones();
      
      // Fetch the region to get its parent_id (zone_id)
      let zoneId = "";
      if (regionId) {
        try {
          const regionData = await getTerritoryById(regionId);
          console.log("Region Data:", regionData);
          if (regionData.data?.parent_id) {
            // Extract the ID string from the parent_id (could be populated object or string)
            zoneId = typeof regionData.data.parent_id === 'string' 
              ? regionData.data.parent_id 
              : regionData.data.parent_id._id;
            console.log("ZoneId from region:", zoneId);
            // Load regions for this zone
            await loadRegions(zoneId);
          }
        } catch (err) {
          console.error("Failed to load region details:", err);
        }
      }
      
      // Load areas for the region
      if (regionId) {
        await loadAreas(regionId);
      }
      
      // Load DB points and distributors
      await loadDbPoints(areaId);
      if (dbPointId) {
        await loadDistributors(dbPointId);
      }
      
      // Load sales reps for this area
      await loadSalesReps(areaId);
      
      console.log("Setting formData with zone_id:", zoneId, "region_id:", regionId);
      
      // Extract just the _id from populated sr_id objects
      const sr1Id = route.sr_assignments?.sr_1?.sr_id?._id || route.sr_assignments?.sr_1?.sr_id || null;
      const sr2Id = route.sr_assignments?.sr_2?.sr_id?._id || route.sr_assignments?.sr_2?.sr_id || null;
      
      setFormData({
        route_id: route.route_id,
        route_name: route.route_name,
        zone_id: zoneId,
        region_id: regionId,
        area_id: areaId,
        db_point_id: route.db_point_id._id,
        distributor_id: route.distributor_id._id,
        sr_assignments: {
          sr_1: {
            sr_id: sr1Id,
            visit_days: route.sr_assignments?.sr_1?.visit_days || [],
          },
          sr_2: {
            sr_id: sr2Id,
            visit_days: route.sr_assignments?.sr_2?.visit_days || [],
          },
        },
        frequency: route.frequency,
        contribution: route.contribution,
        contribution_mf: route.contribution_mf,
        route_pf: route.route_pf,
        outlet_qty: route.outlet_qty,
        actual_outlet_qty: route.actual_outlet_qty,
      });
    } else {
      setEditingRoute(null);
      setFormData({
        route_id: "",
        route_name: "",
        zone_id: "",
        region_id: "",
        area_id: "",
        db_point_id: "",
        distributor_id: "",
        sr_assignments: {
          sr_1: { sr_id: null, visit_days: [] },
          sr_2: { sr_id: null, visit_days: [] },
        },
        frequency: 0,
        contribution: 0,
        contribution_mf: 0,
        route_pf: 0,
        outlet_qty: 0,
        actual_outlet_qty: 0,
      });
    }
    setOpenDialog(true);
    setTabValue(0);
    setError(null);
    setSuccess(null);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setEditingRoute(null);
    setError(null);
    setSuccess(null);
  };

  const handleSubmit = async () => {
    try {
      setError(null);
      setSuccess(null);
      
      if (editingRoute) {
        await updateRoute(editingRoute._id, formData);
        setSuccess("Route updated successfully");
      } else {
        await createRoute(formData);
        setSuccess("Route created successfully");
      }
      
      await loadRoutes();
      setTimeout(() => {
        handleCloseDialog();
      }, 1500);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to save route";
      setError(errorMessage);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("Are you sure you want to deactivate this route?")) return;
    
    try {
      await deleteRoute(id);
      setSuccess("Route deactivated successfully");
      await loadRoutes();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to deactivate route";
      setError(errorMessage);
    }
  };

  const handleActivate = async (id: string) => {
    try {
      await activateRoute(id);
      setSuccess("Route activated successfully");
      await loadRoutes();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to activate route";
      setError(errorMessage);
    }
  };

  const handleDayToggle = (srKey: "sr_1" | "sr_2", day: string) => {
    const currentDays = formData.sr_assignments[srKey].visit_days;
    const newDays = currentDays.includes(day)
      ? currentDays.filter((d) => d !== day)
      : [...currentDays, day];
    
    setFormData({
      ...formData,
      sr_assignments: {
        ...formData.sr_assignments,
        [srKey]: {
          ...formData.sr_assignments[srKey],
          visit_days: newDays,
        },
      },
    });
  };

  const columns: GridColDef[] = [
    { field: "route_id", headerName: "Route ID", width: 120 },
    { field: "route_name", headerName: "Route Name", width: 200 },
    {
      field: "area",
      headerName: "Area",
      width: 150,
      valueGetter: (value, row) => row.area_id?.name || "N/A",
    },
    {
      field: "distributor",
      headerName: "Distributor",
      width: 200,
      valueGetter: (value, row) => row.distributor_id?.name || "N/A",
    },
    {
      field: "sr_1",
      headerName: "SR 1",
      width: 150,
      valueGetter: (value, row) => row.sr_assignments?.sr_1?.sr_id?.name || "N/A",
    },
    {
      field: "sr_2",
      headerName: "SR 2",
      width: 150,
      valueGetter: (value, row) => row.sr_assignments?.sr_2?.sr_id?.name || "N/A",
    },
    { field: "frequency", headerName: "Frequency", width: 100 },
    { field: "outlet_qty", headerName: "Outlets", width: 100 },
    {
      field: "active",
      headerName: "Status",
      width: 100,
      renderCell: (params) => (
        <Chip
          label={params.row.active ? "Active" : "Inactive"}
          color={params.row.active ? "success" : "default"}
          size="small"
        />
      ),
    },
    {
      field: "actions",
      headerName: "Actions",
      width: 150,
      sortable: false,
      renderCell: (params) => (
        <Box>
          {canUpdate && (
            <IconButton
              size="small"
              onClick={() => handleOpenDialog(params.row)}
              color="primary"
            >
              <EditIcon fontSize="small" />
            </IconButton>
          )}
          {canDelete && params.row.active && (
            <IconButton
              size="small"
              onClick={() => handleDelete(params.row._id)}
              color="error"
            >
              <DeleteIcon fontSize="small" />
            </IconButton>
          )}
          {canUpdate && !params.row.active && (
            <Button
              size="small"
              onClick={() => handleActivate(params.row._id)}
              variant="outlined"
            >
              Activate
            </Button>
          )}
        </Box>
      ),
    },
  ];

  return (
    <Box sx={{ p: { xs: 2, sm: 3 } }}>
      <Paper sx={{ p: { xs: 2, sm: 3 }, mb: 3 }}>
        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 3, flexWrap: "wrap", gap: 2 }}>
          <Typography variant="h5" component="h1">
            Routes Management
          </Typography>
          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
            <Button
              variant="outlined"
              startIcon={<FileDownloadIcon />}
              size="small"
            >
              Export CSV
            </Button>
            {canCreate && (
              <>
                <Button
                  variant="outlined"
                  startIcon={<UploadIcon />}
                  size="small"
                >
                  Import CSV
                </Button>
                <Button
                  variant="outlined"
                  startIcon={<AssessmentIcon />}
                  size="small"
                >
                  KPI Report
                </Button>
                <Button
                  variant="contained"
                  startIcon={<AddIcon />}
                  onClick={() => handleOpenDialog()}
                  size="small"
                >
                  Add Route
                </Button>
              </>
            )}
          </Box>
        </Box>

        {(error || success) && (
          <Alert severity={error ? "error" : "success"} sx={{ mb: 2 }} onClose={() => { setError(null); setSuccess(null); }}>
            {error || success}
          </Alert>
        )}

        <Box sx={{ display: 'flex', gap: 2, mb: 3, flexWrap: 'wrap' }}>
          <Box sx={{ flex: '1 1 200px', minWidth: 200 }}>
            <TextField
              fullWidth
              size="small"
              label="Search"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              InputProps={{
                endAdornment: (
                  <IconButton size="small" onClick={loadRoutes}>
                    <SearchIcon />
                  </IconButton>
                ),
              }}
            />
          </Box>
          <Box sx={{ flex: '1 1 200px', minWidth: 200 }}>
            <FormControl fullWidth size="small">
              <InputLabel>Zone</InputLabel>
              <Select
                value={selectedZone}
                onChange={(e) => handleZoneFilterChange(e.target.value)}
                label="Zone"
              >
                <MenuItem value="">All Zones</MenuItem>
                {zones.map((zone) => (
                  <MenuItem key={zone._id} value={zone._id}>
                    {zone.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Box>
          <Box sx={{ flex: '1 1 200px', minWidth: 200 }}>
            <FormControl fullWidth size="small">
              <InputLabel>Region</InputLabel>
              <Select
                value={selectedRegion}
                onChange={(e) => handleRegionFilterChange(e.target.value)}
                label="Region"
                disabled={!selectedZone}
              >
                <MenuItem value="">All Regions</MenuItem>
                {regions.map((region) => (
                  <MenuItem key={region._id} value={region._id}>
                    {region.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Box>
          <Box sx={{ flex: '1 1 200px', minWidth: 200 }}>
            <FormControl fullWidth size="small">
              <InputLabel>Area</InputLabel>
              <Select
                value={selectedArea}
                onChange={(e) => setSelectedArea(e.target.value)}
                label="Area"
                disabled={!selectedRegion}
              >
                <MenuItem value="">All Areas</MenuItem>
                {areas.map((area) => (
                  <MenuItem key={area._id} value={area._id}>
                    {area.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Box>
          <Box sx={{ flex: '1 1 200px', minWidth: 200 }}>
            <FormControl fullWidth size="small">
              <InputLabel>Filter by Distributor</InputLabel>
              <Select
                value={selectedDistributor}
                onChange={(e) => setSelectedDistributor(e.target.value)}
                label="Filter by Distributor"
              >
                <MenuItem value="">All Distributors</MenuItem>
                {distributors.map((dist) => (
                  <MenuItem key={dist._id} value={dist._id}>
                    {dist.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <FormControlLabel
              control={
                <Switch
                  checked={showActiveOnly}
                  onChange={(e) => setShowActiveOnly(e.target.checked)}
                />
              }
              label="Active Only"
            />
            <IconButton onClick={loadRoutes} color="primary">
              <RefreshIcon />
            </IconButton>
          </Box>
        </Box>

        <Box sx={{ height: 600, width: "100%" }}>
          <DataGrid
            rows={routes}
            columns={columns}
            getRowId={(row) => row._id}
            loading={loading}
            pageSizeOptions={[10, 25, 50, 100]}
            initialState={{
              pagination: { paginationModel: { pageSize: 25 } },
            }}
            sx={{
              "& .MuiDataGrid-cell": {
                fontSize: { xs: "0.75rem", sm: "0.875rem" },
              },
            }}
          />
        </Box>
      </Paper>

      {/* Add/Edit Dialog */}
      <Dialog 
        open={openDialog} 
        onClose={handleCloseDialog} 
        maxWidth="md" 
        fullWidth
        fullScreen={isMobile}
      >
        <DialogTitle>
          {editingRoute ? "Edit Route" : "Add New Route"}
        </DialogTitle>
        <DialogContent>
          {(error || success) && (
            <Alert severity={error ? "error" : "success"} sx={{ mb: 2 }}>
              {error || success}
            </Alert>
          )}

          <Tabs value={tabValue} onChange={(e, v) => setTabValue(v)} sx={{ borderBottom: 1, borderColor: "divider", mb: 2 }}>
            <Tab label="Basic Info" />
            <Tab label="SR Assignment" />
            <Tab label="KPI Metrics" />
          </Tabs>

          {/* Tab 1: Basic Info */}
          <TabPanel value={tabValue} index={0}>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                <Box sx={{ flex: '1 1 200px' }}>
                  <TextField
                    fullWidth
                    label="Route ID"
                    value={formData.route_id}
                    onChange={(e) => setFormData({ ...formData, route_id: e.target.value.toUpperCase() })}
                    required
                    disabled={!!editingRoute}
                  />
                </Box>
                <Box sx={{ flex: '1 1 200px' }}>
                  <TextField
                    fullWidth
                    label="Route Name"
                    value={formData.route_name}
                    onChange={(e) => setFormData({ ...formData, route_name: e.target.value })}
                    required
                  />
                </Box>
              </Box>
              <Typography variant="subtitle2" color="text.secondary" sx={{ mt: 1 }}>
                Territory Selection (Cascading)
              </Typography>
              <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                <Box sx={{ flex: '1 1 200px' }}>
                  <FormControl fullWidth>
                    <InputLabel>Zone</InputLabel>
                    <Select
                      value={formData.zone_id || ''}
                      onChange={(e) => {
                        const zoneId = e.target.value;
                        setFormData({ 
                          ...formData, 
                          zone_id: zoneId,
                          region_id: '',
                          area_id: '',
                          db_point_id: '',
                          distributor_id: ''
                        });
                        setRegions([]);
                        setAreas([]);
                        setDbPoints([]);
                        setDistributors([]);
                        if (zoneId) loadRegions(zoneId);
                      }}
                      label="Zone"
                    >
                      <MenuItem value="">Select Zone</MenuItem>
                      {zones.map((zone) => (
                        <MenuItem key={zone._id} value={zone._id}>
                          {zone.name}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Box>
                <Box sx={{ flex: '1 1 200px' }}>
                  <FormControl fullWidth disabled={!formData.zone_id}>
                    <InputLabel>Region</InputLabel>
                    <Select
                      value={formData.region_id || ''}
                      onChange={(e) => {
                        const regionId = e.target.value;
                        setFormData({ 
                          ...formData, 
                          region_id: regionId,
                          area_id: '',
                          db_point_id: '',
                          distributor_id: ''
                        });
                        setAreas([]);
                        setDbPoints([]);
                        setDistributors([]);
                        if (regionId) loadAreas(regionId);
                      }}
                      label="Region"
                    >
                      <MenuItem value="">Select Region</MenuItem>
                      {regions.map((region) => (
                        <MenuItem key={region._id} value={region._id}>
                          {region.name}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Box>
              </Box>
              <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                <Box sx={{ flex: '1 1 200px' }}>
                  <FormControl fullWidth required disabled={!formData.region_id}>
                    <InputLabel>Area</InputLabel>
                    <Select
                      value={formData.area_id}
                      onChange={(e) => handleAreaChange(e.target.value)}
                      label="Area"
                    >
                      <MenuItem value="">Select Area</MenuItem>
                      {areas.map((area) => (
                        <MenuItem key={area._id} value={area._id}>
                          {area.name}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Box>
                <Box sx={{ flex: '1 1 200px' }}>
                  <FormControl fullWidth required disabled={!formData.area_id}>
                    <InputLabel>DB Point</InputLabel>
                    <Select
                      value={formData.db_point_id}
                      onChange={(e) => {
                        const dbPointId = e.target.value;
                        setFormData({ ...formData, db_point_id: dbPointId, distributor_id: '' });
                        if (dbPointId) {
                          loadDistributors(dbPointId);
                        } else {
                          setDistributors([]);
                        }
                      }}
                      label="DB Point"
                      disabled={!formData.area_id}
                    >
                      {dbPoints.map((dbPoint) => (
                        <MenuItem key={dbPoint._id} value={dbPoint._id}>
                          {dbPoint.name}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Box>
              </Box>
              <FormControl fullWidth required>
                <InputLabel>Distributor</InputLabel>
                <Select
                  value={formData.distributor_id}
                  onChange={(e) => setFormData({ ...formData, distributor_id: e.target.value })}
                  label="Distributor"
                  disabled={!formData.area_id}
                >
                  {distributors.map((dist) => (
                    <MenuItem key={dist._id} value={dist._id}>
                      {dist.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Box>
          </TabPanel>

          {/* Tab 2: SR Assignment */}
          <TabPanel value={tabValue} index={1}>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              {/* SR 1 */}
              <Card variant="outlined">
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Sales Representative 1
                  </Typography>
                  <FormControl fullWidth sx={{ mb: 2 }}>
                    <InputLabel>Select SR</InputLabel>
                    <Select
                      value={formData.sr_assignments.sr_1.sr_id || ""}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          sr_assignments: {
                            ...formData.sr_assignments,
                            sr_1: {
                              ...formData.sr_assignments.sr_1,
                              sr_id: e.target.value || null,
                            },
                          },
                        })
                      }
                      label="Select SR"
                    >
                      <MenuItem value="">None</MenuItem>
                      {salesReps.map((sr) => (
                        <MenuItem key={sr._id} value={sr._id}>
                          {sr.name} ({sr.employee_id})
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                  <Typography variant="subtitle2" gutterBottom>
                    Visit Days:
                  </Typography>
                  <FormGroup row>
                    {DAYS.map((day) => (
                      <FormControlLabel
                        key={day.value}
                        control={
                          <Checkbox
                            checked={formData.sr_assignments.sr_1.visit_days.includes(day.value)}
                            onChange={() => handleDayToggle("sr_1", day.value)}
                            disabled={!formData.sr_assignments.sr_1.sr_id}
                          />
                        }
                        label={day.label}
                      />
                    ))}
                  </FormGroup>
                </CardContent>
              </Card>

              {/* SR 2 */}
              <Card variant="outlined">
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Sales Representative 2
                  </Typography>
                  <FormControl fullWidth sx={{ mb: 2 }}>
                    <InputLabel>Select SR</InputLabel>
                    <Select
                      value={formData.sr_assignments.sr_2.sr_id || ""}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          sr_assignments: {
                            ...formData.sr_assignments,
                            sr_2: {
                              ...formData.sr_assignments.sr_2,
                              sr_id: e.target.value || null,
                            },
                          },
                        })
                      }
                      label="Select SR"
                    >
                      <MenuItem value="">None</MenuItem>
                      {salesReps.map((sr) => (
                        <MenuItem key={sr._id} value={sr._id}>
                          {sr.name} ({sr.employee_id})
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                  <Typography variant="subtitle2" gutterBottom>
                    Visit Days:
                  </Typography>
                  <FormGroup row>
                    {DAYS.map((day) => (
                      <FormControlLabel
                        key={day.value}
                        control={
                          <Checkbox
                            checked={formData.sr_assignments.sr_2.visit_days.includes(day.value)}
                            onChange={() => handleDayToggle("sr_2", day.value)}
                            disabled={!formData.sr_assignments.sr_2.sr_id}
                          />
                        }
                        label={day.label}
                      />
                    ))}
                  </FormGroup>
                </CardContent>
              </Card>
            </Box>
          </TabPanel>

          {/* Tab 3: KPI Metrics */}
          <TabPanel value={tabValue} index={2}>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                <Box sx={{ flex: '1 1 200px' }}>
                  <TextField
                    fullWidth
                    type="number"
                    label="Frequency"
                    value={formData.frequency}
                    onChange={(e) => setFormData({ ...formData, frequency: Number(e.target.value) })}
                  />
                </Box>
                <Box sx={{ flex: '1 1 200px' }}>
                  <TextField
                    fullWidth
                    type="number"
                    label="Contribution"
                    value={formData.contribution}
                    onChange={(e) => setFormData({ ...formData, contribution: Number(e.target.value) })}
                  />
                </Box>
              </Box>
              <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                <Box sx={{ flex: '1 1 200px' }}>
                  <TextField
                    fullWidth
                    type="number"
                    label="Contribution MF"
                    value={formData.contribution_mf}
                    onChange={(e) => setFormData({ ...formData, contribution_mf: Number(e.target.value) })}
                  />
                </Box>
                <Box sx={{ flex: '1 1 200px' }}>
                  <TextField
                    fullWidth
                    type="number"
                    label="Route PF"
                    value={formData.route_pf}
                    onChange={(e) => setFormData({ ...formData, route_pf: Number(e.target.value) })}
                  />
                </Box>
              </Box>
              <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                <Box sx={{ flex: '1 1 200px' }}>
                  <TextField
                    fullWidth
                    type="number"
                    label="Outlet Quantity"
                    value={formData.outlet_qty}
                    onChange={(e) => setFormData({ ...formData, outlet_qty: Number(e.target.value) })}
                  />
                </Box>
                <Box sx={{ flex: '1 1 200px' }}>
                  <TextField
                    fullWidth
                    type="number"
                    label="Actual Outlet Quantity"
                    value={formData.actual_outlet_qty}
                    onChange={(e) => setFormData({ ...formData, actual_outlet_qty: Number(e.target.value) })}
                  />
                </Box>
              </Box>
            </Box>
          </TabPanel>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Cancel</Button>
          <Button 
            onClick={handleSubmit} 
            variant="contained" 
            disabled={!formData.route_id || !formData.route_name || !formData.area_id || !formData.distributor_id}
          >
            {editingRoute ? "Update" : "Create"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
