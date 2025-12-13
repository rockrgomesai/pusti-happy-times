"use client";

import React, { useState, useEffect } from "react";
import {
  Box,
  Container,
  Typography,
  CircularProgress,
  Alert,
  TextField,
  Button,
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
  Checkbox,
  Chip,
} from "@mui/material";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import { apiClient } from "@/lib/api";
import toast from "react-hot-toast";

interface Item {
  requisition_scheduling_id: string;
  requisition_detail_id: string;
  requisition_id: string;
  requisition_no: string;
  requisition_date: string;
  sku: string;
  erp_id: string;
  product_name: string;
  dp_price: number;
  order_qty: number;
  scheduled_qty: number;
  delivered_qty: number;
  remaining_qty: number;
  stock_qty: number;
  total_stock_qty: number;
  blocked_qty: number;
  is_partial: boolean;
}

interface DepotGroup {
  requesting_depot_id: string;
  requesting_depot_name: string;
  requesting_depot_code: string;
  items: Item[];
}

interface SelectedItems {
  [depotId: string]: {
    [itemKey: string]: boolean;
  };
}

interface DeliveryQtys {
  [itemKey: string]: number;
}

export default function ScheduleRequisitionsPage() {
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [depotGroups, setDepotGroups] = useState<DepotGroup[]>([]);
  const [error, setError] = useState("");
  const [selectedItems, setSelectedItems] = useState<SelectedItems>({});
  const [deliveryQtys, setDeliveryQtys] = useState<DeliveryQtys>({});
  const [expandedGroup, setExpandedGroup] = useState<string | false>(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      setError("");
      
      const response = await apiClient.get("/inventory/approved-req-schedules");
      
      const groups = response.data?.data || [];
      setDepotGroups(groups);
      
      // Pre-fill delivery quantities with remaining_qty
      const initialQtys: DeliveryQtys = {};
      groups.forEach((depot: DepotGroup) => {
        depot.items.forEach((item: Item) => {
          const itemKey = `${depot.requesting_depot_id}_${item.requisition_detail_id}`;
          initialQtys[itemKey] = item.remaining_qty;
        });
      });
      setDeliveryQtys(initialQtys);
      
    } catch (err: any) {
      console.error("Error loading data:", err);
      setError(err.response?.data?.message || "Failed to load scheduled requisitions");
    } finally {
      setLoading(false);
    }
  };

  const handleSelectAll = (depotId: string, items: Item[]) => {
    const allItemKeys = items.map(item => 
      `${depotId}_${item.requisition_detail_id}`
    );
    
    const allSelected = allItemKeys.every(key => selectedItems[depotId]?.[key]);
    
    setSelectedItems(prev => ({
      ...prev,
      [depotId]: allItemKeys.reduce((acc, key) => ({
        ...acc,
        [key]: !allSelected
      }), {})
    }));
  };

  const handleCreateLoadSheet = async (group: DepotGroup) => {
    try {
      setSubmitting(true);
      
      const depotId = group.requesting_depot_id;
      const selectedItemKeys = Object.keys(selectedItems[depotId] || {}).filter(
        key => selectedItems[depotId][key]
      );
      
      if (selectedItemKeys.length === 0) {
        toast.error("Please select at least one item");
        return;
      }
      
      // Build items array for load sheet
      const items = group.items
        .filter(item => {
          const itemKey = `${depotId}_${item.requisition_detail_id}`;
          return selectedItems[depotId]?.[itemKey];
        })
        .map(item => {
          const itemKey = `${depotId}_${item.requisition_detail_id}`;
          const deliveryQty = deliveryQtys[itemKey] || 0;
          
          if (deliveryQty <= 0) {
            throw new Error(`Delivery quantity must be greater than 0 for ${item.sku}`);
          }
          
          if (deliveryQty > item.remaining_qty) {
            throw new Error(`Delivery quantity cannot exceed remaining quantity (${item.remaining_qty}) for ${item.sku}`);
          }
          
          if (deliveryQty > item.stock_qty) {
            throw new Error(`Insufficient stock for ${item.sku}. Available: ${item.stock_qty}, Requested: ${deliveryQty}`);
          }
          
          return {
            requisition_detail_id: item.requisition_detail_id,
            delivery_qty: deliveryQty,
          };
        });
      
      // Create load sheet payload
      const payload = {
        requesting_depot_id: group.requesting_depot_id,
        items,
        notes: `Load sheet for ${group.requesting_depot_name}`,
      };
      
      await apiClient.post("/inventory/req-load-sheets", payload);
      
      toast.success("Load sheet created successfully");
      
      // Clear selections for this depot
      setSelectedItems(prev => ({
        ...prev,
        [depotId]: {}
      }));
      
      // Reload data
      loadData();
      
    } catch (err: any) {
      console.error("Error creating load sheet:", err);
      toast.error(err.message || err.response?.data?.message || "Failed to create load sheet");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="80vh">
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Container maxWidth="xl" sx={{ mt: 4 }}>
        <Alert severity="error">{error}</Alert>
      </Container>
    );
  }

  if (!depotGroups || depotGroups.length === 0) {
    return (
      <Container maxWidth="xl" sx={{ mt: 4 }}>
        <Alert severity="info">
          No scheduled requisitions pending delivery. All requisitions have been fulfilled or no items have been scheduled yet.
        </Alert>
      </Container>
    );
  }

  return (
    <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
      <Box sx={{ mb: 3 }}>
        <Typography variant="h5" gutterBottom>
          Schedule Requisitions
        </Typography>
        <Typography variant="body2" color="text.secondary">
          View approved requisition schedules and create load sheets for delivery
        </Typography>
      </Box>

      {depotGroups.map((group) => {
        const depotId = group.requesting_depot_id;
        const selectedCount = Object.values(selectedItems[depotId] || {}).filter(Boolean).length;
        const totalItems = group.items.length;

        return (
          <Accordion
            key={depotId}
            expanded={expandedGroup === depotId}
            onChange={() => setExpandedGroup(expandedGroup === depotId ? false : depotId)}
            sx={{ mb: 2 }}
          >
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, width: '100%' }}>
                <Typography variant="h6">
                  {group.requesting_depot_name}
                </Typography>
                <Chip 
                  label={`${totalItems} items pending`} 
                  size="small" 
                  color="primary" 
                  variant="outlined"
                />
                {selectedCount > 0 && (
                  <Chip 
                    label={`${selectedCount} selected`} 
                    size="small" 
                    color="secondary"
                  />
                )}
              </Box>
            </AccordionSummary>
            
            <AccordionDetails>
              <Box sx={{ mb: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Checkbox
                    checked={totalItems > 0 && selectedCount === totalItems}
                    indeterminate={selectedCount > 0 && selectedCount < totalItems}
                    onChange={() => handleSelectAll(depotId, group.items)}
                  />
                  <Typography variant="body2">Select All</Typography>
                </Box>
                
                <Button
                  variant="contained"
                  disabled={submitting || selectedCount === 0}
                  onClick={() => handleCreateLoadSheet(group)}
                >
                  {submitting ? 'Creating...' : `Create Load Sheet (${selectedCount})`}
                </Button>
              </Box>

              <TableContainer component={Paper} sx={{ maxHeight: 600 }}>
                <Table size="small" stickyHeader>
                  <TableHead>
                    <TableRow>
                      <TableCell padding="checkbox"></TableCell>
                      <TableCell>Req No</TableCell>
                      <TableCell>SKU</TableCell>
                      <TableCell>ERP ID</TableCell>
                      <TableCell>Product Name</TableCell>
                      <TableCell align="right">Schld Qty</TableCell>
                      <TableCell align="right">Delivered</TableCell>
                      <TableCell align="right">Remaining</TableCell>
                      <TableCell align="right">Stock</TableCell>
                      <TableCell>Delivery Qty</TableCell>
                      <TableCell>Status</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {group.items.map((item) => {
                      const itemKey = `${depotId}_${item.requisition_detail_id}`;
                      const isSelected = selectedItems[depotId]?.[itemKey] || false;
                      const deliveryQty = deliveryQtys[itemKey] || 0;
                      const hasStock = item.stock_qty >= deliveryQty;

                      return (
                        <TableRow 
                          key={itemKey} 
                          selected={isSelected}
                          sx={{ 
                            backgroundColor: !hasStock && isSelected ? 'error.light' : undefined 
                          }}
                        >
                          <TableCell padding="checkbox">
                            <Checkbox
                              checked={isSelected}
                              onChange={(e) => {
                                setSelectedItems(prev => ({
                                  ...prev,
                                  [depotId]: {
                                    ...prev[depotId],
                                    [itemKey]: e.target.checked
                                  }
                                }));
                              }}
                            />
                          </TableCell>
                          <TableCell>{item.requisition_no}</TableCell>
                          <TableCell>{item.sku}</TableCell>
                          <TableCell>{item.erp_id || '-'}</TableCell>
                          <TableCell>{item.product_name}</TableCell>
                          <TableCell align="right">{item.scheduled_qty}</TableCell>
                          <TableCell align="right">{item.delivered_qty}</TableCell>
                          <TableCell align="right">
                            <strong>{item.remaining_qty}</strong>
                          </TableCell>
                          <TableCell align="right">
                            <Typography 
                              variant="body2" 
                              color={item.stock_qty >= deliveryQty ? 'success.main' : 'error.main'}
                            >
                              {item.stock_qty}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <TextField
                              type="number"
                              size="small"
                              value={deliveryQty}
                              onChange={(e) => {
                                const value = parseInt(e.target.value) || 0;
                                if (value < 0) return;
                                if (value > item.remaining_qty) {
                                  toast.error(`Cannot exceed remaining quantity: ${item.remaining_qty}`);
                                  return;
                                }
                                setDeliveryQtys(prev => ({
                                  ...prev,
                                  [itemKey]: value
                                }));
                              }}
                              sx={{ width: 100 }}
                              inputProps={{ 
                                min: 0, 
                                max: item.remaining_qty,
                                step: 1 
                              }}
                              error={isSelected && (!hasStock || deliveryQty <= 0)}
                            />
                          </TableCell>
                          <TableCell>
                            {item.is_partial && (
                              <Chip label="Partial" size="small" color="warning" />
                            )}
                            {!hasStock && isSelected && (
                              <Chip label="Low Stock" size="small" color="error" />
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
        );
      })}
    </Container>
  );
}
