"use client";

import React, { useState, useEffect } from "react";
import {
  Box,
  Container,
  Typography,
  Card,
  CardContent,
  CircularProgress,
  Alert,
  TextField,
  MenuItem,
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
} from "@mui/material";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import { apiClient } from "@/lib/api";
import toast from "react-hot-toast";

interface DeliveryQty {
  [key: string]: {
    delivery_qty: number;
    depot_id: string;
  };
}

interface SelectedItems {
  [groupId: string]: {
    [itemKey: string]: boolean;
  };
}

export default function ScheduleRequisitionsPage() {
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [depotGroups, setDepotGroups] = useState([]);
  const [facilities, setFacilities] = useState([]);
  const [error, setError] = useState("");
  const [deliveryQtys, setDeliveryQtys] = useState<DeliveryQty>({});
  const [selectedItems, setSelectedItems] = useState<SelectedItems>({});
  const [expandedGroup, setExpandedGroup] = useState<string | false>(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [reqResponse, facilitiesResponse] = await Promise.all([
        apiClient.get("/inventory/requisition-schedulings"),
        apiClient.get("/inventory/requisition-schedulings/depots"),
      ]);
      
      // Handle response structure
      const groups = Array.isArray(reqResponse.data) 
        ? reqResponse.data 
        : (reqResponse.data?.data || []);
      
      const facilitiesData = Array.isArray(facilitiesResponse.data)
        ? facilitiesResponse.data
        : (facilitiesResponse.data?.data || []);
      
      setDepotGroups(groups);
      setFacilities(facilitiesData);
      
      // Pre-fill delivery quantities
      const initialDeliveryQtys: DeliveryQty = {};
      groups.forEach((depot: any) => {
        (depot.requisitions || []).forEach((req: any) => {
          (req.items || [])
            .filter((item: any) => item.unscheduled_qty > 0)
            .forEach((item: any) => {
              const itemKey = `${req.requisition_id}_${item.requisition_detail_id}`;
              initialDeliveryQtys[itemKey] = {
                delivery_qty: item.unscheduled_qty,
                depot_id: depot.depot_id,
              };
            });
        });
      });
      setDeliveryQtys(initialDeliveryQtys);
    } catch (err) {
      console.error("Error loading data:", err);
      setError("Failed to load requisitions");
    } finally {
      setLoading(false);
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
      <Container maxWidth="lg" sx={{ mt: 4 }}>
        <Alert severity="error">{error}</Alert>
      </Container>
    );
  }

  if (!depotGroups || depotGroups.length === 0) {
    return (
      <Container maxWidth="lg" sx={{ mt: 4 }}>
        <Alert severity="info">No pending requisitions to schedule</Alert>
      </Container>
    );
  }

  const handleSelectAll = (groupId: string, requisitions: any[]) => {
    const allItemKeys: string[] = [];
    requisitions.forEach((req: any) => {
      (req.items || [])
        .filter((item: any) => (item.unscheduled_qty || 0) > 0)
        .forEach((item: any) => {
          allItemKeys.push(`${req.requisition_id}_${item.requisition_detail_id}`);
        });
    });

    const allSelected = allItemKeys.every(key => selectedItems[groupId]?.[key]);
    
    setSelectedItems(prev => ({
      ...prev,
      [groupId]: allItemKeys.reduce((acc, key) => ({
        ...acc,
        [key]: !allSelected
      }), {})
    }));
  };

  const handleScheduleGroup = async (group: any) => {
    try {
      setSubmitting(true);
      const groupId = group.depot_id;
      
      // Collect all selected items from all requisitions in this group
      const schedulings: any[] = [];
      
      (group.requisitions || []).forEach((req: any) => {
        const items = (req.items || [])
          .map((item: any) => {
            const itemKey = `${req.requisition_id}_${item.requisition_detail_id}`;
            const isSelected = selectedItems[groupId]?.[itemKey];
            const delivery = deliveryQtys[itemKey];
            
            if (isSelected && delivery && delivery.delivery_qty > 0) {
              return {
                requisition_detail_id: item.requisition_detail_id,
                delivery_qty: delivery.delivery_qty,
                source_depot_id: delivery.depot_id,
              };
            }
            return null;
          })
          .filter((d: any) => d !== null);

        if (items.length > 0) {
          schedulings.push({
            requisition_id: req.requisition_id,
            items,
          });
        }
      });

      if (schedulings.length === 0) {
        toast.error("Please select items and enter delivery quantities");
        return;
      }

      // Submit each requisition separately
      for (const scheduling of schedulings) {
        await apiClient.post("/inventory/requisition-schedulings", scheduling);
      }

      toast.success("Schedulings created successfully");
      loadData();
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to create scheduling");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
      <Typography variant="h5" gutterBottom>
        Schedule Requisitions
      </Typography>

      {depotGroups.map((group: any, idx) => {
        const groupId = group.depot_id;
        const allItems: any[] = [];
        (group.requisitions || []).forEach((req: any) => {
          (req.items || [])
            .filter((item: any) => (item.unscheduled_qty || 0) > 0)
            .forEach((item: any) => {
              allItems.push({
                ...item,
                requisition_id: req.requisition_id,
                requisition_no: req.requisition_no,
                requisition_date: req.requisition_date,
                from_depot: req.from_depot,
              });
            });
        });

        return (
          <Accordion
            key={groupId || idx}
            expanded={expandedGroup === groupId}
            onChange={() => setExpandedGroup(expandedGroup === groupId ? false : groupId)}
            sx={{ mb: 2 }}
          >
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, width: '100%' }}>
                <Typography variant="h6">{group.depot_name || 'Unknown Depot'}</Typography>
                <Typography variant="body2" color="text.secondary">
                  ({allItems.length} items pending)
                </Typography>
              </Box>
            </AccordionSummary>
            <AccordionDetails>
              <Box sx={{ mb: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Checkbox
                  checked={allItems.every(item => {
                    const itemKey = `${item.requisition_id}_${item.requisition_detail_id}`;
                    return selectedItems[groupId]?.[itemKey];
                  })}
                  indeterminate={
                    allItems.some(item => {
                      const itemKey = `${item.requisition_id}_${item.requisition_detail_id}`;
                      return selectedItems[groupId]?.[itemKey];
                    }) && !allItems.every(item => {
                      const itemKey = `${item.requisition_id}_${item.requisition_detail_id}`;
                      return selectedItems[groupId]?.[itemKey];
                    })
                  }
                  onChange={() => handleSelectAll(groupId, group.requisitions)}
                />
                <Typography variant="body2">Select All</Typography>
                <Box sx={{ flexGrow: 1 }} />
                <Button
                  variant="contained"
                  disabled={submitting}
                  onClick={() => handleScheduleGroup(group)}
                >
                  {submitting ? 'Scheduling...' : 'Schedule'}
                </Button>
              </Box>

              <TableContainer component={Paper}>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell padding="checkbox"></TableCell>
                      <TableCell>Req No</TableCell>
                      <TableCell>SKU</TableCell>
                      <TableCell>ERP ID</TableCell>
                      <TableCell>Ord Date</TableCell>
                      <TableCell align="right">Ord Qty</TableCell>
                      <TableCell align="right">Schld Qty</TableCell>
                      <TableCell align="right">Unschld Qty</TableCell>
                      <TableCell>Stock Qty</TableCell>
                      <TableCell>Dlvr Qty</TableCell>
                      <TableCell>Depots</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {allItems.map((item, itemIdx) => {
                      const itemKey = `${item.requisition_id}_${item.requisition_detail_id}`;
                      const delivery = deliveryQtys[itemKey] || { delivery_qty: 0, depot_id: groupId };
                      const isSelected = selectedItems[groupId]?.[itemKey] || false;

                      return (
                        <TableRow key={itemKey} selected={isSelected}>
                          <TableCell padding="checkbox">
                            <Checkbox
                              checked={isSelected}
                              onChange={(e) => {
                                setSelectedItems(prev => ({
                                  ...prev,
                                  [groupId]: {
                                    ...prev[groupId],
                                    [itemKey]: e.target.checked
                                  }
                                }));
                              }}
                            />
                          </TableCell>
                          <TableCell>{item.requisition_no}</TableCell>
                          <TableCell>{item.sku}</TableCell>
                          <TableCell>{item.erp_id || '-'}</TableCell>
                          <TableCell>
                            {item.requisition_date ? new Date(item.requisition_date).toLocaleDateString() : '-'}
                          </TableCell>
                          <TableCell align="right">{item.order_qty || 0}</TableCell>
                          <TableCell align="right">{item.scheduled_qty || 0}</TableCell>
                          <TableCell align="right">{item.unscheduled_qty || 0}</TableCell>
                          <TableCell>
                            {(item.stock_quantities || []).map((stock: any, stockIdx: number) => (
                              <Box key={stockIdx}>
                                <Typography variant="caption">
                                  {stock.depot_name}: {stock.qty}
                                </Typography>
                              </Box>
                            ))}
                          </TableCell>
                          <TableCell>
                            <TextField
                              type="number"
                              size="small"
                              value={delivery.delivery_qty}
                              onChange={(e) => {
                                const value = parseInt(e.target.value) || 0;
                                if (value < 0) return;
                                if (value > (item.unscheduled_qty || 0)) {
                                  toast.error(`Cannot exceed ${item.unscheduled_qty}`);
                                  return;
                                }
                                setDeliveryQtys(prev => ({
                                  ...prev,
                                  [itemKey]: { ...prev[itemKey], delivery_qty: value }
                                }));
                              }}
                              sx={{ width: 100 }}
                              inputProps={{ min: 0, max: item.unscheduled_qty }}
                            />
                          </TableCell>
                          <TableCell>
                            <TextField
                              select
                              size="small"
                              value={delivery.depot_id}
                              onChange={(e) => {
                                setDeliveryQtys(prev => ({
                                  ...prev,
                                  [itemKey]: { ...prev[itemKey], depot_id: e.target.value }
                                }));
                              }}
                              sx={{ width: 150 }}
                            >
                              {facilities.map((facility: any) => (
                                <MenuItem key={facility._id} value={facility._id}>
                                  {facility.name}
                                </MenuItem>
                              ))}
                            </TextField>
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
