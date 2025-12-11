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
} from "@mui/material";
import { apiClient } from "@/lib/api";
import toast from "react-hot-toast";

interface DeliveryQty {
  [key: string]: {
    delivery_qty: number;
    depot_id: string;
  };
}

export default function ScheduleRequisitionsPage() {
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [depotGroups, setDepotGroups] = useState([]);
  const [facilities, setFacilities] = useState([]);
  const [error, setError] = useState("");
  const [deliveryQtys, setDeliveryQtys] = useState<DeliveryQty>({});

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

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Typography variant="h5" gutterBottom>
        Schedule Requisitions
      </Typography>

      {depotGroups.map((group, idx) => (
        <Card key={group?.depot_id || idx} sx={{ mb: 3 }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              {group?.depot_name || 'Unknown Depot'}
            </Typography>
            
            {(group?.requisitions || []).map((req, reqIdx) => (
              <Box key={req?.requisition_id || reqIdx} sx={{ mb: 2, p: 2, bgcolor: '#f5f5f5', borderRadius: 1 }}>
                <Typography variant="subtitle1">
                  <strong>Requisition:</strong> {req?.requisition_no || 'N/A'}
                </Typography>
                <Typography variant="body2">
                  <strong>From:</strong> {req?.from_depot?.name || 'N/A'}
                </Typography>
                <Typography variant="body2">
                  <strong>Date:</strong> {req?.requisition_date ? new Date(req.requisition_date).toLocaleDateString() : 'N/A'}
                </Typography>
                
                <Box sx={{ mt: 2 }}>
                  <Typography variant="subtitle2" gutterBottom>Items:</Typography>
                  {(req?.items || [])
                    .filter(item => (item?.unscheduled_qty || 0) > 0)
                    .map((item, itemIdx) => {
                      const itemKey = `${req.requisition_id}_${item.requisition_detail_id}`;
                      const delivery = deliveryQtys[itemKey] || { delivery_qty: 0, depot_id: group.depot_id };
                      
                      return (
                        <Box key={item?.requisition_detail_id || itemIdx} sx={{ ml: 2, mb: 2, p: 2, bgcolor: 'white', borderRadius: 1 }}>
                          <Typography variant="body2" fontWeight="bold">
                            SKU: {item?.sku || 'N/A'}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            Order: {item?.order_qty || 0} | Unscheduled: {item?.unscheduled_qty || 0}
                          </Typography>
                          
                          <Box sx={{ display: 'flex', gap: 2, mt: 1 }}>
                            <TextField
                              label="Delivery Qty"
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
                              sx={{ width: 150 }}
                            />
                            <TextField
                              select
                              label="Source Depot"
                              size="small"
                              value={delivery.depot_id}
                              onChange={(e) => {
                                setDeliveryQtys(prev => ({
                                  ...prev,
                                  [itemKey]: { ...prev[itemKey], depot_id: e.target.value }
                                }));
                              }}
                              sx={{ width: 200 }}
                            >
                              {facilities.map((facility: any) => (
                                <MenuItem key={facility._id} value={facility._id}>
                                  {facility.name}
                                </MenuItem>
                              ))}
                            </TextField>
                          </Box>
                        </Box>
                      );
                    })}
                </Box>
                
                <Box sx={{ mt: 2, display: 'flex', justifyContent: 'flex-end' }}>
                  <Button
                    variant="contained"
                    disabled={submitting}
                    onClick={async () => {
                      try {
                        setSubmitting(true);
                        
                        const items = (req.items || [])
                          .map((item: any) => {
                            const itemKey = `${req.requisition_id}_${item.requisition_detail_id}`;
                            const delivery = deliveryQtys[itemKey];
                            if (delivery && delivery.delivery_qty > 0) {
                              return {
                                requisition_detail_id: item.requisition_detail_id,
                                delivery_qty: delivery.delivery_qty,
                                source_depot_id: delivery.depot_id,
                              };
                            }
                            return null;
                          })
                          .filter((d: any) => d !== null);

                        if (items.length === 0) {
                          toast.error("Please enter delivery quantities");
                          return;
                        }

                        await apiClient.post("/inventory/requisition-schedulings", {
                          requisition_id: req.requisition_id,
                          items,
                        });

                        toast.success("Scheduling created successfully");
                        loadData();
                      } catch (err: any) {
                        toast.error(err.response?.data?.message || "Failed to create scheduling");
                      } finally {
                        setSubmitting(false);
                      }
                    }}
                  >
                    {submitting ? 'Submitting...' : 'Schedule Delivery'}
                  </Button>
                </Box>
              </Box>
            ))}
          </CardContent>
        </Card>
      ))}
    </Container>
  );
}
