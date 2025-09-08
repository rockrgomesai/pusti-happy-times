"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  Box,
  Typography,
  Paper,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Tabs,
  Tab,
  FormGroup,
  FormControlLabel,
  Checkbox,
  Button,
  Alert,
  CircularProgress,
  Divider,
} from "@mui/material";
import { SelectChangeEvent } from "@mui/material/Select";
import api from "@/lib/api";

interface Role {
  _id: string;
  role: string;
}

interface MenuItem {
  _id: string;
  name: string;
  href: string;
  icon: string;
  m_order: number;
  assigned?: boolean;
}

interface Permission {
  _id: string;
  pg_permissions?: string;
  api_permissions?: string;
  assigned?: boolean;
}

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`permissions-tabpanel-${index}`}
      aria-labelledby={`permissions-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  );
}

function a11yProps(index: number) {
  return {
    id: `permissions-tab-${index}`,
    "aria-controls": `permissions-tabpanel-${index}`,
  };
}

export default function PermissionsPage() {
  const [selectedRole, setSelectedRole] = useState<string>("");
  const [tabValue, setTabValue] = useState(0);
  const [roles, setRoles] = useState<Role[]>([]);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [pagePermissions, setPagePermissions] = useState<Permission[]>([]);
  const [apiPermissions, setApiPermissions] = useState<Permission[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  const fetchRoles = async () => {
    try {
      const response = await api.get("/api/roles");
      const rolesData = response.data?.data && Array.isArray(response.data.data) 
        ? response.data.data 
        : [];
      setRoles(rolesData);
    } catch (error) {
      console.error("Error fetching roles:", error);
      setMessage({
        type: "error",
        text: "Failed to fetch roles",
      });
    }
  };

  const fetchPermissions = useCallback(async () => {
    if (!selectedRole) return;

    setLoading(true);
    try {
      // Fetch menu items with role assignments
      const menuResponse = await api.get(`/api/permissions/menu-items?roleId=${selectedRole}`);
      
      if (menuResponse.data.success) {
        setMenuItems(menuResponse.data.data);
      }

      // Fetch page permissions from pg_permissions collection
      const pageResponse = await api.get(`/api/permissions/page-permissions?roleId=${selectedRole}`);
      
      if (pageResponse.data.success) {
        setPagePermissions(pageResponse.data.data);
      }
      
      // Fetch API permissions from api_permissions collection
      const apiResponse = await api.get(`/api/permissions/api-permissions?roleId=${selectedRole}`);
      
      if (apiResponse.data.success) {
        setApiPermissions(apiResponse.data.data);
      }
      
    } catch (error) {
      console.error("Error fetching permissions:", error);
      setMessage({
        type: "error",
        text: "Failed to fetch permissions",
      });
    } finally {
      setLoading(false);
    }
  }, [selectedRole]);

  // Fetch roles on component mount
  useEffect(() => {
    fetchRoles();
  }, []);

  // Fetch permissions when role changes
  useEffect(() => {
    if (selectedRole) {
      fetchPermissions();
    }
  }, [selectedRole, fetchPermissions]);

  const handleRoleChange = (event: SelectChangeEvent) => {
    setSelectedRole(event.target.value);
    setMessage(null);
  };

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  const handleMenuItemToggle = (menuItemId: string) => {
    setMenuItems((prev) =>
      prev.map((item) =>
        item._id === menuItemId ? { ...item, assigned: !item.assigned } : item
      )
    );
  };

  const handlePagePermissionToggle = (permissionId: string) => {
    setPagePermissions((prev) =>
      prev.map((perm) =>
        perm._id === permissionId ? { ...perm, assigned: !perm.assigned } : perm
      )
    );
  };

  const handleApiPermissionToggle = (permissionId: string) => {
    setApiPermissions((prev) =>
      prev.map((perm) =>
        perm._id === permissionId ? { ...perm, assigned: !perm.assigned } : perm
      )
    );
  };

  const handleAssignMenus = async () => {
    if (!selectedRole) return;

    setLoading(true);
    try {
      const selectedMenuIds = menuItems
        .filter((item) => item.assigned)
        .map((item) => item._id);

      // TODO: Implement actual assignment API call
      setMessage({
        type: "success",
        text: `Would assign ${selectedMenuIds.length} menu items to role`,
      });
    } catch (error) {
      console.error("Error assigning menus:", error);
      setMessage({
        type: "error",
        text: "Failed to assign menu permissions",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAssignPages = async () => {
    if (!selectedRole) return;

    setLoading(true);
    try {
      const selectedPermissionIds = pagePermissions
        .filter((perm) => perm.assigned)
        .map((perm) => perm._id);

      // TODO: Implement actual assignment API call
      setMessage({
        type: "success",
        text: `Would assign ${selectedPermissionIds.length} page permissions to role`,
      });
    } catch (error) {
      console.error("Error assigning page permissions:", error);
      setMessage({
        type: "error",
        text: "Failed to assign page permissions",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAssignApis = async () => {
    if (!selectedRole) return;

    setLoading(true);
    try {
      const selectedPermissionIds = apiPermissions
        .filter((perm) => perm.assigned)
        .map((perm) => perm._id);

      // TODO: Implement actual assignment API call
      setMessage({
        type: "success",
        text: `Would assign ${selectedPermissionIds.length} API permissions to role`,
      });
    } catch (error) {
      console.error("Error assigning API permissions:", error);
      setMessage({
        type: "error",
        text: "Failed to assign API permissions",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" component="h1" gutterBottom>
        Permissions Management
      </Typography>

      {message && (
        <Alert
          severity={message.type}
          onClose={() => setMessage(null)}
          sx={{ mb: 2 }}
        >
          {message.text}
        </Alert>
      )}

      <Paper sx={{ p: 3, mb: 3 }}>
        <FormControl fullWidth sx={{ mb: 3 }}>
          <InputLabel id="role-select-label">Select Role</InputLabel>
          <Select
            labelId="role-select-label"
            id="role-select"
            value={selectedRole}
            label="Select Role"
            onChange={handleRoleChange}
          >
            {roles.map((role) => (
              <MenuItem key={role._id} value={role._id}>
                {role.role}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        {selectedRole && (
          <>
            <Divider sx={{ mb: 2 }} />
            <Box sx={{ borderBottom: 1, borderColor: "divider" }}>
              <Tabs
                value={tabValue}
                onChange={handleTabChange}
                aria-label="permissions tabs"
              >
                <Tab label="Menus" {...a11yProps(0)} />
                <Tab label="Pages" {...a11yProps(1)} />
                <Tab label="Endpoints" {...a11yProps(2)} />
              </Tabs>
            </Box>

            <TabPanel value={tabValue} index={0}>
              <Box>
                <Typography variant="h6" gutterBottom>
                  Menu Items
                </Typography>
                {loading ? (
                  <CircularProgress />
                ) : (
                  <>
                    <Box
                      sx={{
                        maxHeight: 400,
                        overflow: 'auto',
                        border: '1px solid',
                        borderColor: 'divider',
                        borderRadius: 1,
                        p: 2,
                        mb: 2,
                        backgroundColor: 'background.paper'
                      }}
                    >
                      <FormGroup>
                        {menuItems.map((item) => (
                          <FormControlLabel
                            key={item._id}
                            control={
                              <Checkbox
                                checked={item.assigned || false}
                                onChange={() => handleMenuItemToggle(item._id)}
                              />
                            }
                            label={`${item.name} (${item.href})`}
                          />
                        ))}
                      </FormGroup>
                    </Box>
                    <Button
                      variant="contained"
                      onClick={handleAssignMenus}
                      disabled={loading}
                      sx={{ mt: 2 }}
                    >
                      Assign Menu Items
                    </Button>
                  </>
                )}
              </Box>
            </TabPanel>

            <TabPanel value={tabValue} index={1}>
              <Box>
                <Typography variant="h6" gutterBottom>
                  Page Permissions
                </Typography>
                {loading ? (
                  <CircularProgress />
                ) : (
                  <>
                    <Box
                      sx={{
                        maxHeight: 400,
                        overflow: 'auto',
                        border: '1px solid',
                        borderColor: 'divider',
                        borderRadius: 1,
                        p: 2,
                        mb: 2,
                        backgroundColor: 'background.paper'
                      }}
                    >
                      <FormGroup>
                        {pagePermissions.map((perm) => (
                          <FormControlLabel
                            key={perm._id}
                            control={
                              <Checkbox
                                checked={perm.assigned || false}
                                onChange={() =>
                                  handlePagePermissionToggle(perm._id)
                                }
                              />
                            }
                            label={perm.pg_permissions}
                          />
                        ))}
                      </FormGroup>
                    </Box>
                    <Button
                      variant="contained"
                      onClick={handleAssignPages}
                      disabled={loading}
                      sx={{ mt: 2 }}
                    >
                      Assign Page Permissions
                    </Button>
                  </>
                )}
              </Box>
            </TabPanel>

            <TabPanel value={tabValue} index={2}>
              <Box>
                <Typography variant="h6" gutterBottom>
                  API Permissions
                </Typography>
                {loading ? (
                  <CircularProgress />
                ) : (
                  <>
                    <Box
                      sx={{
                        maxHeight: 400,
                        overflow: 'auto',
                        border: '1px solid',
                        borderColor: 'divider',
                        borderRadius: 1,
                        p: 2,
                        mb: 2,
                        backgroundColor: 'background.paper'
                      }}
                    >
                      <FormGroup>
                        {apiPermissions.map((perm) => (
                          <FormControlLabel
                            key={perm._id}
                            control={
                              <Checkbox
                                checked={perm.assigned || false}
                                onChange={() => handleApiPermissionToggle(perm._id)}
                              />
                            }
                            label={perm.api_permissions}
                          />
                        ))}
                      </FormGroup>
                    </Box>
                    <Button
                      variant="contained"
                      onClick={handleAssignApis}
                      disabled={loading}
                      sx={{ mt: 2 }}
                    >
                      Assign API Permissions
                    </Button>
                  </>
                )}
              </Box>
            </TabPanel>
          </>
        )}
      </Paper>
    </Box>
  );
}
