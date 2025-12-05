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

interface SchedulingItem {
  scheduling_id: string;
  scheduling_detail_id: string;
  order_id: string;
  order_number: string;
  order_date: string;
  item_id: string;
  sku: string;
  product_name: string;
  dp_price: number;
  scheduled_qty: number;
  delivered_qty: number;
  remaining_qty: number;
  stock_qty: number; // Available stock in depot
  total_stock_qty: number; // Total stock
  blocked_qty: number; // Blocked stock
  current_status: string;
  is_partial: boolean;
}

interface DistributorGroup {
  distributor_id: string;
  distributor_name: string;
  distributor_erp_id: string;
  items: SchedulingItem[];
}

interface SelectedItem {
  scheduling_detail_id: string;
  delivery_qty: number;
  stock_available: number;
}

const DepotDeliveriesPage = () => {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<DistributorGroup[]>([]);
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

      const response: any = await apiClient.get("/inventory/depot-deliveries", params);

      console.log('📥 Response:', { success: response.success, dataLength: response.data?.length, data: response.data });

      if (response.success) {
        // Sort distributors alphabetically
        const sortedData = response.data.sort((a: DistributorGroup, b: DistributorGroup) =>
          a.distributor_name.localeCompare(b.distributor_name)
        );
        console.log('✅ Setting data:', sortedData.length, 'distributors');
        setData(sortedData);
        setTotalCount(response.pagination?.total || 0);
      } else {
        toast.error(response.message || "Failed to fetch deliveries");
      }
    } catch (error: any) {
      console.error("Error fetching depot deliveries:", error);
      toast.error(error.response?.data?.message || "Failed to fetch deliveries");
    } finally {
      setLoading(false);
    }
  };

  const handleSelectItem = (
    scheduling_detail_id: string,
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
          for (const distributor of data) {
            const item = distributor.items.find((i) => i.scheduling_detail_id === detailId);
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
          [scheduling_detail_id]: {
            scheduling_detail_id,
            delivery_qty: prefillQty,
            stock_available: stock_qty,
          },
        };
      });
    } else {
      setSelectedItems((prev) => {
        const updated = { ...prev };
        delete updated[scheduling_detail_id];
        return updated;
      });
    }
  };

  const handleQuantityChange = (scheduling_detail_id: string, value: string, sku: string, stock_qty: number, blocked_qty: number) => {
    const qty = parseInt(value) || 0;
    const item = selectedItems[scheduling_detail_id];
    
    if (item) {
      setSelectedItems((prev) => {
        // Calculate currently selected for this SKU (excluding this row)
        let currentlySelected = 0;
        Object.entries(prev).forEach(([detailId, selected]) => {
          if (detailId !== scheduling_detail_id) {
            for (const distributor of data) {
              const itm = distributor.items.find((i) => i.scheduling_detail_id === detailId);
              if (itm && itm.sku === sku) {
                currentlySelected += selected.delivery_qty;
                break;
              }
            }
          }
        });
        
        // Calculate available stock
        const availableStock = stock_qty - blocked_qty - currentlySelected;
        
        // Cap the quantity to available stock
        const cappedQty = Math.min(qty, Math.max(0, availableStock));
        
        return {
          ...prev,
          [scheduling_detail_id]: {
            ...item,
            delivery_qty: cappedQty,
          },
        };
      });
    }
  };

  // Calculate total selected quantity per SKU across all distributors
  const getTotalSelectedBySku = (sku: string): number => {
    let total = 0;
    Object.entries(selectedItems).forEach(([detailId, selected]) => {
      for (const distributor of data) {
        const item = distributor.items.find((i) => i.scheduling_detail_id === detailId);
        if (item && item.sku === sku) {
          total += selected.delivery_qty;
          break;
        }
      }
    });
    return total;
  };

  const validateSelection = (): boolean => {
    // Group by SKU to check total selected quantity against available stock
    const skuStockCheck: Record<string, { selected: number; available: number; blocked: number; total: number }> = {};

    Object.entries(selectedItems).forEach(([detailId, selected]) => {
      // Find the item in data
      for (const distributor of data) {
        const item = distributor.items.find(
          (i) => i.scheduling_detail_id === detailId
        );
        if (item) {
          if (!skuStockCheck[item.sku]) {
            skuStockCheck[item.sku] = {
              selected: 0,
              available: item.stock_qty,
              blocked: item.blocked_qty || 0,
              total: item.total_stock_qty || item.stock_qty,
            };
          }
          skuStockCheck[item.sku].selected += selected.delivery_qty;
        }
      }
    });

    console.log('📊 Validation check:', skuStockCheck);

    // Check if any SKU exceeds available stock (considering blocked qty)
    for (const [sku, check] of Object.entries(skuStockCheck)) {
      console.log(`Checking ${sku}: selected=${check.selected}, available=${check.available}, blocked=${check.blocked}, total=${check.total}`);
      if (check.selected > check.available) {
        toast.error(
          `${sku}: Selected quantity (${check.selected}) exceeds available stock (${check.available}). Total stock: ${check.total}, Already blocked: ${check.blocked}`
        );
        return false;
      }
    }

    return true;
  };

  const handleCreateLoadSheet = async () => {
    if (Object.keys(selectedItems).length === 0) {
      toast.error("Please select at least one item");
      return;
    }

    if (!validateSelection()) {
      return;
    }

    try {
      // Send items directly - backend will handle finding the right scheduling details
      const items = Object.values(selectedItems).map((item) => ({
        scheduling_detail_id: item.scheduling_detail_id,
        delivery_qty: item.delivery_qty,
      }));

      console.log('📤 Sending to backend:', items);

      const response: any = await apiClient.post("/inventory/load-sheets", {
        items,
      });

      if (response.success) {
        toast.success(response.message || "Load sheet created successfully");
        setSelectedItems({});
        fetchData(); // Refresh data
        // Note: Load sheet creation is pending full implementation
        // router.push(`/distribution/load-sheets/${response.data._id}`);
      } else {
        toast.error(response.message || "Failed to create load sheet");
      }
    } catch (error: any) {
      console.error("Error creating load sheet:", error);
      toast.error(error.response?.data?.message || "Failed to create load sheet");
    }
  };

  const getTotalSelectedByItem = (item_id: string): number => {
    let total = 0;
    Object.entries(selectedItems).forEach(([detailId, selected]) => {
      for (const distributor of data) {
        const item = distributor.items.find(
          (i) => i.scheduling_detail_id === detailId && i.item_id === item_id
        );
        if (item) {
          total += selected.delivery_qty;
        }
      }
    });
    return total;
  };

  const formatDate = (dateString: string) => {
    return format(new Date(dateString), "dd/MM/yyyy");
  };

  if (authLoading) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: 400 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 3 }}>
        <Typography variant="h4">Depot Deliveries</Typography>
        <Box sx={{ display: "flex", gap: 2 }}>
          <Button
            variant="outlined"
            color="primary"
            onClick={() => router.push("/inventory/load-sheets")}
          >
            View Load Sheets
          </Button>
          <FormControl sx={{ minWidth: 150 }}>
            <InputLabel>Filter</InputLabel>
            <Select
              value={filterType}
              label="Filter"
              onChange={(e) => setFilterType(e.target.value as any)}
            >
              <MenuItem value="all">All</MenuItem>
              <MenuItem value="new">New Orders</MenuItem>
              <MenuItem value="partial">Partial Deliveries</MenuItem>
            </Select>
          </FormControl>
          <Button
            variant="contained"
            color="primary"
            onClick={handleCreateLoadSheet}
            disabled={Object.keys(selectedItems).length === 0}
          >
            Create Load Sheet ({Object.keys(selectedItems).length} items)
          </Button>
        </Box>
      </Box>

      {loading ? (
        <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
          <CircularProgress />
        </Box>
      ) : data.length === 0 ? (
        <Alert severity="info">No deliveries pending at this time</Alert>
      ) : (
        <>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Total: {totalCount} items | Showing distributors: {data.length}
          </Typography>

          {data.map((distributor) => (
            <Accordion key={distributor.distributor_id} defaultExpanded>
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Box sx={{ display: "flex", alignItems: "center", gap: 2, width: "100%" }}>
                  <Typography variant="h6">{distributor.distributor_name}</Typography>
                  <Chip
                    label={distributor.distributor_erp_id}
                    size="small"
                    color="primary"
                    variant="outlined"
                  />
                  <Chip
                    label={`${distributor.items.length} items`}
                    size="small"
                    color="default"
                  />
                </Box>
              </AccordionSummary>
              <AccordionDetails>
                <TableContainer>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell padding="checkbox">Select</TableCell>
                        <TableCell>DO Number</TableCell>
                        <TableCell>Order Date</TableCell>
                        <TableCell>SKU</TableCell>
                        <TableCell align="right">DP Price</TableCell>
                        <TableCell align="right">Scheduled</TableCell>
                        <TableCell align="right">Delivered</TableCell>
                        <TableCell align="right">Remaining</TableCell>
                        <TableCell align="right">Stock Qty</TableCell>
                        <TableCell align="right">Blocked Qty</TableCell>
                        <TableCell>Status</TableCell>
                        <TableCell align="right">Delivery Qty</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {distributor.items.map((item) => {
                        const isSelected = !!selectedItems[item.scheduling_detail_id];
                        const totalSelected = getTotalSelectedByItem(item.item_id);
                        const stockExceeded = totalSelected > item.stock_qty;

                        return (
                          <TableRow
                            key={item.scheduling_detail_id}
                            sx={{
                              bgcolor: isSelected
                                ? stockExceeded
                                  ? "error.lighter"
                                  : "primary.lighter"
                                : "inherit",
                            }}
                          >
                            <TableCell padding="checkbox">
                              <Checkbox
                                checked={isSelected}
                                onChange={(e) =>
                                  handleSelectItem(
                                    item.scheduling_detail_id,
                                    item.remaining_qty,
                                    item.stock_qty,
                                    item.blocked_qty || 0,
                                    item.sku,
                                    e.target.checked
                                  )
                                }
                              />
                            </TableCell>
                            <TableCell>{item.order_number}</TableCell>
                            <TableCell>{formatDate(item.order_date)}</TableCell>
                            <TableCell>
                              <Typography variant="body2" sx={{ fontWeight: 500 }}>
                                {item.sku}
                              </Typography>
                            </TableCell>
                            <TableCell align="right">৳{item.dp_price.toFixed(2)}</TableCell>
                            <TableCell align="right">{item.scheduled_qty}</TableCell>
                            <TableCell align="right">{item.delivered_qty}</TableCell>
                            <TableCell align="right">
                              <Typography variant="body2" sx={{ fontWeight: 600 }}>
                                {item.remaining_qty}
                              </Typography>
                            </TableCell>
                            <TableCell align="right">
                              <Typography
                                variant="body2"
                                color={
                                  item.stock_qty >= item.remaining_qty
                                    ? "success.main"
                                    : "error.main"
                                }
                                sx={{ fontWeight: 600 }}
                              >
                                {item.stock_qty}
                              </Typography>
                            </TableCell>
                            <TableCell align="right">
                              <Typography variant="body2" color="warning.main" sx={{ fontWeight: 600 }}>
                                {(item.blocked_qty || 0) + getTotalSelectedBySku(item.sku)}
                              </Typography>
                            </TableCell>
                            <TableCell>
                              <Chip
                                label={item.is_partial ? "Partial" : "New"}
                                size="small"
                                color={item.is_partial ? "warning" : "success"}
                              />
                            </TableCell>
                            <TableCell>
                              {isSelected && (
                                <TextField
                                  type="number"
                                  size="small"
                                  value={selectedItems[item.scheduling_detail_id].delivery_qty}
                                  onChange={(e) =>
                                    handleQuantityChange(
                                      item.scheduling_detail_id,
                                      e.target.value,
                                      item.sku,
                                      item.stock_qty,
                                      item.blocked_qty || 0
                                    )
                                  }
                                  inputProps={{
                                    min: 1,
                                    max: Math.min(item.remaining_qty, item.stock_qty),
                                  }}
                                  sx={{ width: 100 }}
                                  error={
                                    selectedItems[item.scheduling_detail_id].delivery_qty >
                                    Math.min(item.remaining_qty, item.stock_qty)
                                  }
                                />
                              )}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </TableContainer>
              </AccordionDetails>
            </Accordion>
          ))}

          {Object.keys(selectedItems).length > 0 && (
            <Paper sx={{ p: 2, mt: 3, bgcolor: "primary.lighter" }}>
              <Typography variant="h6" gutterBottom>
                Selection Summary
              </Typography>
              <Typography variant="body2">
                Total items selected: {Object.keys(selectedItems).length}
              </Typography>
              <Typography variant="body2">
                Total quantity: {Object.values(selectedItems).reduce((sum, item) => sum + item.delivery_qty, 0)}
              </Typography>
            </Paper>
          )}
        </>
      )}
    </Box>
  );
};

export default DepotDeliveriesPage;
