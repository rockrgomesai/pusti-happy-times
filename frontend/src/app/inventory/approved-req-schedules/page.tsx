"use client";

import React, { useState, useEffect } from "react";
import {
  Box,
  Typography,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Button,
  Checkbox,
  TextField,
  CircularProgress,
  Alert,
  Chip,
  FormControl,
  Select,
  MenuItem,
  InputLabel,
} from "@mui/material";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import { format } from "date-fns";
import toast from "react-hot-toast";
import { useAuth } from "@/contexts/AuthContext";
import { apiClient } from "@/lib/api";
import { useRouter } from "next/navigation";

interface ReqSchedulingItem {
  requisition_scheduling_id: string;
  requisition_detail_id: string;
  requisition_id: string;
  requisition_no: string;
  requisition_date: string;
  sku: string;
  erp_id: number | null;
  product_name: string;
  dp_price: number;
  order_qty: number;
  scheduled_qty: number;
  delivered_qty: number;
  remaining_qty: number;
  stock_qty: number; // Available stock in source depot
  total_stock_qty: number; // Total stock
  blocked_qty: number; // Blocked stock
  is_partial: boolean;
}

interface RequestingDepotGroup {
  requesting_depot_id: string;
  requesting_depot_name: string;
  requesting_depot_code: string;
  items: ReqSchedulingItem[];
}

interface SelectedItem {
  requisition_detail_id: string;
  delivery_qty: number;
  stock_available: number;
}

const ApprovedReqSchedulesPage = () => {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<RequestingDepotGroup[]>([]);
  const [selectedItems, setSelectedItems] = useState<Record<string, SelectedItem>>({});
  const [filterType, setFilterType] = useState<"all" | "new" | "partial">("all");
  const [page, setPage] = useState(1);
  const [limit] = useState(50);
  const [totalCount, setTotalCount] = useState(0);

  useEffect(() => {
    if (!authLoading && user) {
      fetchData();
    }
  }, [filterType, page, user, authLoading]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const params: any = {
        page,
        limit,
      };

      if (filterType !== "all") {
        params.filter = filterType;
      }

      const response: any = await apiClient.get("/inventory/approved-req-schedules", params);

      console.log("📥 Response:", {
        success: response.success,
        dataLength: response.data?.length,
        data: response.data,
      });

      if (response.success) {
        // Sort depots alphabetically
        const sortedData = response.data.sort((a: RequestingDepotGroup, b: RequestingDepotGroup) =>
          a.requesting_depot_name.localeCompare(b.requesting_depot_name)
        );
        console.log("✅ Setting data:", sortedData.length, "requesting depots");
        setData(sortedData);
        setTotalCount(response.pagination?.total || 0);
      } else {
        toast.error(response.message || "Failed to fetch approved requisition schedules");
      }
    } catch (error: any) {
      console.error("Error fetching approved requisition schedules:", error);
      toast.error(
        error.response?.data?.message || "Failed to fetch approved requisition schedules"
      );
    } finally {
      setLoading(false);
    }
  };

  const handleSelectItem = (
    requisition_detail_id: string,
    remaining_qty: number,
    stock_qty: number,
    blocked_qty: number,
    sku: string,
    checked: boolean
  ) => {
    if (checked) {
      setSelectedItems((prev) => {
        // Calculate currently selected for this SKU (excluding this row)
        let currentlySelected = 0;
        Object.entries(prev).forEach(([detailId, selected]) => {
          for (const depot of data) {
            const item = depot.items.find((i) => i.requisition_detail_id === detailId);
            if (item && item.sku === sku) {
              currentlySelected += selected.delivery_qty;
              break;
            }
          }
        });

        // Calculate available stock: stock_qty - blocked_qty - already selected
        const availableStock = stock_qty - blocked_qty - currentlySelected;

        // Prefill with minimum of (remaining_qty, availableStock)
        const prefillQty = Math.min(remaining_qty, Math.max(0, availableStock));

        return {
          ...prev,
          [requisition_detail_id]: {
            requisition_detail_id,
            delivery_qty: prefillQty,
            stock_available: availableStock,
          },
        };
      });
    } else {
      setSelectedItems((prev) => {
        const updated = { ...prev };
        delete updated[requisition_detail_id];
        return updated;
      });
    }
  };

  const handleSelectAllForDepot = (depotId: string, checked: boolean) => {
    const depot = data.find((d) => d.requesting_depot_id === depotId);
    if (!depot) return;

    if (checked) {
      setSelectedItems((prev) => {
        const updated = { ...prev };
        depot.items.forEach((item) => {
          // Calculate current selection for this SKU
          let currentlySelected = 0;
          Object.entries(prev).forEach(([detailId, selected]) => {
            for (const d of data) {
              const i = d.items.find((itm) => itm.requisition_detail_id === detailId);
              if (i && i.sku === item.sku) {
                currentlySelected += selected.delivery_qty;
                break;
              }
            }
          });

          const availableStock = item.stock_qty - item.blocked_qty - currentlySelected;
          const prefillQty = Math.min(item.remaining_qty, Math.max(0, availableStock));

          updated[item.requisition_detail_id] = {
            requisition_detail_id: item.requisition_detail_id,
            delivery_qty: prefillQty,
            stock_available: availableStock,
          };
        });
        return updated;
      });
    } else {
      setSelectedItems((prev) => {
        const updated = { ...prev };
        depot.items.forEach((item) => {
          delete updated[item.requisition_detail_id];
        });
        return updated;
      });
    }
  };

  const handleDeliveryQtyChange = (requisition_detail_id: string, value: string) => {
    const numValue = parseFloat(value) || 0;
    setSelectedItems((prev) => {
      const existing = prev[requisition_detail_id];
      if (!existing) return prev;

      return {
        ...prev,
        [requisition_detail_id]: {
          ...existing,
          delivery_qty: numValue,
        },
      };
    });
  };

  const handleCreateLoadSheet = async (depotId: string) => {
    const depot = data.find((d) => d.requesting_depot_id === depotId);
    if (!depot) return;

    // Get selected items for this depot
    const depotSelectedItems = depot.items
      .filter((item) => selectedItems[item.requisition_detail_id])
      .map((item) => ({
        requisition_scheduling_id: item.requisition_scheduling_id,
        requisition_detail_id: item.requisition_detail_id,
        delivery_qty: selectedItems[item.requisition_detail_id].delivery_qty,
        sku: item.sku,
      }));

    if (depotSelectedItems.length === 0) {
      toast.error("Please select at least one item");
      return;
    }

    // Validate delivery quantities
    for (const selectedItem of depotSelectedItems) {
      const item = depot.items.find((i) => i.requisition_detail_id === selectedItem.requisition_detail_id);
      if (!item) continue;

      if (selectedItem.delivery_qty <= 0) {
        toast.error(`Delivery quantity must be greater than 0 for ${selectedItem.sku}`);
        return;
      }

      if (selectedItem.delivery_qty > item.remaining_qty) {
        toast.error(
          `Delivery quantity for ${selectedItem.sku} exceeds remaining quantity (${item.remaining_qty})`
        );
        return;
      }

      // Validate stock availability
      const selected = selectedItems[selectedItem.requisition_detail_id];
      if (selectedItem.delivery_qty > selected.stock_available) {
        toast.error(
          `Delivery quantity for ${selectedItem.sku} exceeds available stock (${selected.stock_available})`
        );
        return;
      }
    }

    try {
      setLoading(true);

      const response: any = await apiClient.post("/inventory/req-load-sheets", {
        requesting_depot_id: depotId,
        items: depotSelectedItems,
      });

      if (response.success) {
        toast.success(`Load sheet created successfully: ${response.data.load_sheet_number}`);
        
        // Clear selections for this depot
        setSelectedItems((prev) => {
          const updated = { ...prev };
          depot.items.forEach((item) => {
            delete updated[item.requisition_detail_id];
          });
          return updated;
        });

        // Refresh data
        fetchData();
      } else {
        toast.error(response.message || "Failed to create load sheet");
      }
    } catch (error: any) {
      console.error("Error creating load sheet:", error);
      toast.error(error.response?.data?.message || "Failed to create load sheet");
    } finally {
      setLoading(false);
    }
  };

  if (authLoading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  const getSelectedCountForDepot = (depotId: string): number => {
    const depot = data.find((d) => d.requesting_depot_id === depotId);
    if (!depot) return 0;
    return depot.items.filter((item) => selectedItems[item.requisition_detail_id]).length;
  };

  const isAllSelectedForDepot = (depotId: string): boolean => {
    const depot = data.find((d) => d.requesting_depot_id === depotId);
    if (!depot || depot.items.length === 0) return false;
    return depot.items.every((item) => selectedItems[item.requisition_detail_id]);
  };

  return (
    <Box sx={{ p: { xs: 2, sm: 3 } }}>
      <Box sx={{ mb: 3, display: "flex", flexDirection: { xs: "column", sm: "row" }, gap: 2, alignItems: { sm: "center" } }}>
        <Typography variant="h4" component="h1" sx={{ flexGrow: 1 }}>
          Approved Req. Schedules
        </Typography>

        <FormControl size="small" sx={{ minWidth: 150 }}>
          <InputLabel>Filter</InputLabel>
          <Select
            value={filterType}
            label="Filter"
            onChange={(e) => setFilterType(e.target.value as any)}
          >
            <MenuItem value="all">All Schedules</MenuItem>
            <MenuItem value="new">New Only</MenuItem>
            <MenuItem value="partial">Partial Only</MenuItem>
          </Select>
        </FormControl>

        <Button variant="outlined" onClick={fetchData} disabled={loading}>
          Refresh
        </Button>
      </Box>

      {loading && data.length === 0 ? (
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
          <CircularProgress />
        </Box>
      ) : data.length === 0 ? (
        <Alert severity="info">No approved requisition schedules found for your depot.</Alert>
      ) : (
        <Box>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Total: {totalCount} items across {data.length} requesting depots
          </Typography>

          {data.map((depot) => (
            <Accordion key={depot.requesting_depot_id} defaultExpanded={data.length === 1}>
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Box sx={{ display: "flex", alignItems: "center", gap: 2, width: "100%" }}>
                  <Checkbox
                    checked={isAllSelectedForDepot(depot.requesting_depot_id)}
                    indeterminate={
                      getSelectedCountForDepot(depot.requesting_depot_id) > 0 &&
                      !isAllSelectedForDepot(depot.requesting_depot_id)
                    }
                    onChange={(e) => {
                      e.stopPropagation();
                      handleSelectAllForDepot(depot.requesting_depot_id, e.target.checked);
                    }}
                    onClick={(e) => e.stopPropagation()}
                  />
                  <Box>
                    <Typography variant="h6">
                      {depot.requesting_depot_name}
                      {depot.requesting_depot_code && (
                        <Chip
                          label={depot.requesting_depot_code}
                          size="small"
                          sx={{ ml: 1 }}
                        />
                      )}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {depot.items.length} items
                      {getSelectedCountForDepot(depot.requesting_depot_id) > 0 && (
                        <> • {getSelectedCountForDepot(depot.requesting_depot_id)} selected</>
                      )}
                    </Typography>
                  </Box>
                </Box>
              </AccordionSummary>

              <AccordionDetails>
                <TableContainer component={Paper} variant="outlined">
                  <Table size="small" sx={{ minWidth: { xs: 1000, md: "100%" } }}>
                    <TableHead>
                      <TableRow>
                        <TableCell padding="checkbox" />
                        <TableCell>Req No</TableCell>
                        <TableCell>SKU</TableCell>
                        <TableCell>ERP ID</TableCell>
                        <TableCell>Product</TableCell>
                        <TableCell align="right">Ord Qty</TableCell>
                        <TableCell align="right">Schld Qty</TableCell>
                        <TableCell align="right">Dlvrd Qty</TableCell>
                        <TableCell align="right">Remaining</TableCell>
                        <TableCell align="right">Stock (Avail)</TableCell>
                        <TableCell align="right">Dlvr Qty</TableCell>
                        <TableCell>Status</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {depot.items.map((item) => {
                        const isSelected = !!selectedItems[item.requisition_detail_id];
                        const selectedData = selectedItems[item.requisition_detail_id];

                        return (
                          <TableRow key={item.requisition_detail_id} hover>
                            <TableCell padding="checkbox">
                              <Checkbox
                                checked={isSelected}
                                onChange={(e) =>
                                  handleSelectItem(
                                    item.requisition_detail_id,
                                    item.remaining_qty,
                                    item.stock_qty,
                                    item.blocked_qty,
                                    item.sku,
                                    e.target.checked
                                  )
                                }
                              />
                            </TableCell>
                            <TableCell>{item.requisition_no}</TableCell>
                            <TableCell>
                              <Typography variant="body2" fontWeight="medium">
                                {item.sku}
                              </Typography>
                            </TableCell>
                            <TableCell>{item.erp_id || "-"}</TableCell>
                            <TableCell>
                              <Typography variant="body2" noWrap sx={{ maxWidth: 200 }}>
                                {item.product_name}
                              </Typography>
                            </TableCell>
                            <TableCell align="right">{item.order_qty.toFixed(2)}</TableCell>
                            <TableCell align="right">{item.scheduled_qty.toFixed(2)}</TableCell>
                            <TableCell align="right">{item.delivered_qty.toFixed(2)}</TableCell>
                            <TableCell align="right">
                              <Typography fontWeight="medium">
                                {item.remaining_qty.toFixed(2)}
                              </Typography>
                            </TableCell>
                            <TableCell align="right">
                              <Typography
                                color={item.stock_qty < item.remaining_qty ? "error" : "success"}
                                fontWeight="medium"
                              >
                                {item.stock_qty.toFixed(2)}
                              </Typography>
                              <Typography variant="caption" color="text.secondary">
                                ({item.total_stock_qty.toFixed(2)} - {item.blocked_qty.toFixed(2)})
                              </Typography>
                            </TableCell>
                            <TableCell align="right">
                              {isSelected ? (
                                <TextField
                                  type="number"
                                  size="small"
                                  value={selectedData.delivery_qty}
                                  onChange={(e) =>
                                    handleDeliveryQtyChange(item.requisition_detail_id, e.target.value)
                                  }
                                  inputProps={{
                                    min: 0,
                                    max: Math.min(item.remaining_qty, selectedData.stock_available),
                                    step: 0.01,
                                  }}
                                  sx={{ width: 100 }}
                                  error={
                                    selectedData.delivery_qty > item.remaining_qty ||
                                    selectedData.delivery_qty > selectedData.stock_available
                                  }
                                />
                              ) : (
                                "-"
                              )}
                            </TableCell>
                            <TableCell>
                              {item.is_partial && (
                                <Chip label="Partial" size="small" color="warning" />
                              )}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </TableContainer>

                {getSelectedCountForDepot(depot.requesting_depot_id) > 0 && (
                  <Box sx={{ mt: 2, display: "flex", justifyContent: "flex-end" }}>
                    <Button
                      variant="contained"
                      onClick={() => handleCreateLoadSheet(depot.requesting_depot_id)}
                      disabled={loading}
                    >
                      Create Load Sheet ({getSelectedCountForDepot(depot.requesting_depot_id)} items)
                    </Button>
                  </Box>
                )}
              </AccordionDetails>
            </Accordion>
          ))}
        </Box>
      )}
    </Box>
  );
};

export default ApprovedReqSchedulesPage;
