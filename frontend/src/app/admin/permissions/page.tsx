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
  Tooltip,
  Chip,
} from "@mui/material";
import DragIndicatorIcon from "@mui/icons-material/DragIndicator";
import PushPinIcon from "@mui/icons-material/PushPin";
import { SelectChangeEvent } from "@mui/material/Select";
import api from "@/lib/api";

interface Role {
  _id: string;
  role: string;
}

interface MenuItem {
  _id: string;
  name: string;
  href: string | null;
  icon: string;
  m_order: number;
  role_m_order?: number | null;
  parent_id?: string | null;
  is_submenu?: boolean;
  assigned?: boolean;
}

// Heuristic: treat the dashboard menu row as pinned/locked. It is always shown
// first in the sidebar regardless of role assignment, so we exclude it from the
// drag-and-drop reordering UI.
function isDashboardItem(it: MenuItem): boolean {
  const href = (it.href ?? "").toLowerCase();
  const name = (it.name ?? "").toLowerCase();
  return href === "/dashboard" || name === "dashboard";
}

interface MenuTreeNode {
  item: MenuItem;
  children: MenuTreeNode[];
}

// Build a parent/child tree from a flat list. Items keep their incoming order
// (the caller sorts the list once, by role_m_order ?? m_order).
function buildTree(items: MenuItem[]): MenuTreeNode[] {
  const byParent = new Map<string | null, MenuItem[]>();
  items.forEach((it) => {
    const key = it.parent_id ? String(it.parent_id) : null;
    const list = byParent.get(key) ?? [];
    list.push(it);
    byParent.set(key, list);
  });
  const buildLevel = (parentKey: string | null): MenuTreeNode[] =>
    (byParent.get(parentKey) ?? []).map((it) => ({
      item: it,
      children: buildLevel(String(it._id)),
    }));
  return buildLevel(null);
}

// Flatten the tree depth-first, parents before their children. Used when
// persisting role assignments — the backend writes m_order = arrayIndex.
function flattenTree(items: MenuItem[]): MenuItem[] {
  const tree = buildTree(items);
  const out: MenuItem[] = [];
  const walk = (nodes: MenuTreeNode[]) => {
    nodes.forEach((n) => {
      out.push(n.item);
      if (n.children.length) walk(n.children);
    });
  };
  walk(tree);
  return out;
}

// Reorder helper: returns a new array with `from` moved to `to`.
function arrayMove<T>(arr: T[], from: number, to: number): T[] {
  const next = arr.slice();
  const [moved] = next.splice(from, 1);
  next.splice(to, 0, moved);
  return next;
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
      const response = await api.get("/roles", {
        params: { limit: 100000 }
      });
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
      const menuResponse = await api.get(`/permissions/menu-items?roleId=${selectedRole}`);

      if (menuResponse.data?.success) {
        const raw: MenuItem[] = menuResponse.data.data || [];
        // Stable sort: prefer per-role order when set, fall back to global m_order.
        const ordered = [...raw].sort((a, b) => {
          const ao = a.role_m_order ?? null;
          const bo = b.role_m_order ?? null;
          if (ao != null && bo != null) return ao - bo;
          if (ao != null) return -1;
          if (bo != null) return 1;
          return (a.m_order ?? 0) - (b.m_order ?? 0);
        });
        setMenuItems(ordered);
        console.log("Menu items loaded:", ordered);
      } else {
        setMenuItems([]);
      }

      // Fetch page permissions from pg_permissions collection
      const pageResponse = await api.get(`/permissions/page-permissions?roleId=${selectedRole}`);

      if (pageResponse.data?.success) {
        setPagePermissions(pageResponse.data.data || []);
      } else {
        setPagePermissions([]);
      }

      // Fetch API permissions from api_permissions collection
      const apiResponse = await api.get(`/permissions/api-permissions?roleId=${selectedRole}`);

      if (apiResponse.data?.success) {
        setApiPermissions(apiResponse.data.data || []);
      } else {
        setApiPermissions([]);
      }

    } catch (error: any) {
      console.error("Error fetching permissions:", error);
      console.error("Error response:", error.response?.data);
      console.error("Error status:", error.response?.status);
      setMessage({
        type: "error",
        text: error.response?.data?.message || "Failed to fetch permissions",
      });
      // Set empty arrays on error to prevent undefined issues
      setMenuItems([]);
      setPagePermissions([]);
      setApiPermissions([]);
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

  // ── Drag-and-drop reordering ────────────────────────────────────────────────
  // Two scopes are supported:
  //   1. Top-level groups (parent_id == null) reorder among themselves.
  //   2. Children of the same parent reorder among themselves.
  // Cross-parent moves are intentionally disabled to keep the model simple.
  // The Dashboard row is locked at the top and never participates.
  const dragRef = React.useRef<{
    parentKey: string | null;
    fromIndex: number;
  } | null>(null);

  const reorderWithinScope = useCallback(
    (parentKey: string | null, fromIndex: number, toIndex: number) => {
      if (fromIndex === toIndex) return;
      setMenuItems((prev) => {
        // Indices into `prev` of items belonging to this scope, preserving
        // their current relative order. We move within those positions only.
        const scopeIndices: number[] = [];
        prev.forEach((it, idx) => {
          if (isDashboardItem(it)) return;
          const itParent = it.parent_id ? String(it.parent_id) : null;
          if (itParent === parentKey) scopeIndices.push(idx);
        });
        if (
          fromIndex < 0 ||
          toIndex < 0 ||
          fromIndex >= scopeIndices.length ||
          toIndex >= scopeIndices.length
        ) {
          return prev;
        }
        const reorderedScope = arrayMove(scopeIndices, fromIndex, toIndex);
        // Rebuild `prev` by walking original indices, substituting scope
        // members in their new order.
        let cursor = 0;
        return prev.map((it, idx) => {
          if (scopeIndices.includes(idx)) {
            const replacement = prev[reorderedScope[cursor]];
            cursor += 1;
            return replacement;
          }
          return it;
        });
      });
    },
    []
  );

  const onDragStart = (parentKey: string | null, fromIndex: number) => {
    dragRef.current = { parentKey, fromIndex };
  };
  const onDragOver = (e: React.DragEvent) => {
    if (dragRef.current) e.preventDefault(); // allow drop
  };
  const onDrop = (parentKey: string | null, toIndex: number) => {
    const d = dragRef.current;
    dragRef.current = null;
    if (!d) return;
    if (d.parentKey !== parentKey) return; // ignore cross-scope drops
    reorderWithinScope(parentKey, d.fromIndex, toIndex);
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
      // Send IDs in the user's chosen tree order (parents first, then their
      // children) so the backend persists per-role m_order matching the UI.
      const selectedMenuIds = flattenTree(menuItems)
        .filter((item) => item.assigned)
        .map((item) => item._id);
      await api.post('/permissions/assign-menus', {
        roleId: selectedRole,
        menuItemIds: selectedMenuIds,
      });
      setMessage({
        type: 'success',
        text: `Assigned ${selectedMenuIds.length} menu item(s)`,
      });
      // Refresh to reflect persisted assignments
      await fetchPermissions();
    } catch (error) {
      console.error("Error assigning menus:", error);
      setMessage({
        type: "error",
        text:
          (typeof error === "object" &&
            error !== null &&
            "response" in error &&
            typeof (error as { response?: { data?: { message?: string } } }).response?.data?.message === "string"
            ? (error as { response?: { data?: { message?: string } } }).response!.data!.message!
            : "Failed to assign menu permissions"),
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
      await api.post('/permissions/assign-pages', {
        roleId: selectedRole,
        permissionIds: selectedPermissionIds,
      });
      setMessage({
        type: 'success',
        text: `Assigned ${selectedPermissionIds.length} page permission(s)`,
      });
      await fetchPermissions();
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
      await api.post('/permissions/assign-apis-upsert', {
        roleId: selectedRole,
        permissionIds: selectedPermissionIds,
      });
      setMessage({
        type: 'success',
        text: `Assigned ${selectedPermissionIds.length} API permission(s)`,
      });
      // Refresh to reflect latest assignments
      await fetchPermissions();
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
            MenuProps={{
              PaperProps: {
                style: {
                  maxHeight: 400,
                },
              },
            }}
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
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  Drag rows to reorder groups and the items within each group.
                  Dashboard is always pinned at the top.
                </Typography>
                {loading ? (
                  <CircularProgress />
                ) : menuItems.length === 0 ? (
                  <Alert severity="info">No menu items found</Alert>
                ) : (
                  <>
                    <Box
                      sx={{
                        maxHeight: 480,
                        overflow: 'auto',
                        border: '1px solid',
                        borderColor: 'divider',
                        borderRadius: 1,
                        p: 1,
                        mb: 2,
                        backgroundColor: 'background.paper'
                      }}
                    >
                      {/* Pinned Dashboard row — always first, never draggable */}
                      {(() => {
                        const dash = menuItems.find(isDashboardItem);
                        if (!dash) return null;
                        return (
                          <Box
                            sx={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: 1,
                              px: 1,
                              py: 0.5,
                              mb: 1,
                              borderRadius: 1,
                              bgcolor: 'action.hover',
                            }}
                          >
                            <Tooltip title="Pinned to top for every role">
                              <PushPinIcon fontSize="small" color="primary" />
                            </Tooltip>
                            <Checkbox
                              checked={dash.assigned || false}
                              onChange={() => handleMenuItemToggle(dash._id)}
                            />
                            <Typography sx={{ flex: 1, fontWeight: 600 }}>
                              {dash.name}{' '}
                              <Typography
                                component="span"
                                variant="caption"
                                color="text.secondary"
                              >
                                ({dash.href})
                              </Typography>
                            </Typography>
                            <Chip size="small" label="Pinned" color="primary" />
                          </Box>
                        );
                      })()}

                      {/* Top-level groups — drag to reorder among themselves. */}
                      {(() => {
                        const tree = buildTree(
                          menuItems.filter((it) => !isDashboardItem(it))
                        );
                        return tree.map((node, topIdx) => {
                          const isGroup = node.children.length > 0;
                          return (
                            <Box
                              key={node.item._id}
                              draggable
                              onDragStart={() => onDragStart(null, topIdx)}
                              onDragOver={onDragOver}
                              onDrop={() => onDrop(null, topIdx)}
                              sx={{
                                border: '1px solid',
                                borderColor: 'divider',
                                borderRadius: 1,
                                mb: 1,
                                bgcolor: 'background.default',
                              }}
                            >
                              <Box
                                sx={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: 1,
                                  px: 1,
                                  py: 0.5,
                                }}
                              >
                                <Tooltip title="Drag to reorder">
                                  <DragIndicatorIcon
                                    fontSize="small"
                                    sx={{ cursor: 'grab', color: 'text.secondary' }}
                                  />
                                </Tooltip>
                                <Checkbox
                                  checked={node.item.assigned || false}
                                  onChange={() => handleMenuItemToggle(node.item._id)}
                                />
                                <Typography
                                  sx={{ flex: 1, fontWeight: isGroup ? 600 : 400 }}
                                >
                                  {node.item.name}{' '}
                                  <Typography
                                    component="span"
                                    variant="caption"
                                    color="text.secondary"
                                  >
                                    ({node.item.href ?? 'group'})
                                  </Typography>
                                </Typography>
                                {isGroup && (
                                  <Chip size="small" label="Group" variant="outlined" />
                                )}
                              </Box>

                              {/* Children — drag to reorder within this group only. */}
                              {isGroup && (
                                <Box sx={{ pl: 4, pr: 1, pb: 1 }}>
                                  {node.children.map((child, childIdx) => (
                                    <Box
                                      key={child.item._id}
                                      draggable
                                      onDragStart={(e) => {
                                        e.stopPropagation();
                                        onDragStart(String(node.item._id), childIdx);
                                      }}
                                      onDragOver={onDragOver}
                                      onDrop={(e) => {
                                        e.stopPropagation();
                                        onDrop(String(node.item._id), childIdx);
                                      }}
                                      sx={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: 1,
                                        px: 1,
                                        py: 0.25,
                                        borderRadius: 1,
                                        '&:hover': { bgcolor: 'action.hover' },
                                      }}
                                    >
                                      <DragIndicatorIcon
                                        fontSize="small"
                                        sx={{ cursor: 'grab', color: 'text.secondary' }}
                                      />
                                      <Checkbox
                                        size="small"
                                        checked={child.item.assigned || false}
                                        onChange={() =>
                                          handleMenuItemToggle(child.item._id)
                                        }
                                      />
                                      <Typography variant="body2" sx={{ flex: 1 }}>
                                        {child.item.name}{' '}
                                        <Typography
                                          component="span"
                                          variant="caption"
                                          color="text.secondary"
                                        >
                                          ({child.item.href ?? '—'})
                                        </Typography>
                                      </Typography>
                                    </Box>
                                  ))}
                                </Box>
                              )}
                            </Box>
                          );
                        });
                      })()}
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
                ) : pagePermissions.length === 0 ? (
                  <Alert severity="info">No page permissions found</Alert>
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
                ) : apiPermissions.length === 0 ? (
                  <Alert severity="info">No API permissions found</Alert>
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
                      <Box
                        sx={{
                          display: 'grid',
                          gridTemplateColumns: {
                            xs: '1fr',
                            sm: '1fr 1fr',
                            md: '1fr 1fr 1fr 1fr',
                          },
                          gap: 1,
                        }}
                      >
                        {apiPermissions.map((perm) => (
                          <FormGroup key={perm._id}>
                            <FormControlLabel
                              control={
                                <Checkbox
                                  checked={perm.assigned || false}
                                  onChange={() => handleApiPermissionToggle(perm._id)}
                                />
                              }
                              label={perm.api_permissions}
                            />
                          </FormGroup>
                        ))}
                      </Box>
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
