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
  Grid2,
  Snackbar,
  Chip,
} from "@mui/material";
import { apiClient } from "@/lib/api";

export default function ScheduleRequisitionsPage() {
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [depotGroups, setDepotGroups] = useState([]);
  const [depots, setDepots] = useState([]);
  const [error, setError] = useState("");
  const [schedulingData, setSchedulingData] = useState({});
  const [snackbar, setSnackbar] = useState({ open: false, message: "", severity: "success" });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [requisitionsRes, depotsRes] = await Promise.all([
        apiClient.get("/inventory/requisition-schedulings"),
        apiClient.get("/inventory/requisition-schedulings/depots"),
      ]);
      
      // Handle response structure
      const groups = Array.isArray(requisitionsRes.data) 
        ? requisitionsRes.data 
        : (requisitionsRes.data?.data || []);
      
      const depotsData = Array.isArray(depotsRes.data)
        ? depotsRes.data
        : (depotsRes.data?.data || []);
      
      setDepotGroups(groups);
      setDepots(depotsData);
      
      // Initialize scheduling data
      const initialData = {};
      groups.forEach(group => {
        (group?.requisitions || []).forEach(req => {
          (req?.items || []).forEach(item => {
            if (item?.requisition_detail_id) {
              const key = `${req.requisition_id}_${item.requisition_detail_id}`;
              initialData[key] = {
                delivery_qty: item.unscheduled_qty || 0,
                source_depot_id: group.depot_id,
              };
            }
          });
        });
      });
      setSchedulingData(initialData);
    } catch (err) {
      console.error("Error loading data:", err);
      setError("Failed to load requisitions");
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (key, field, value) => {
    setSchedulingData(prev => ({
      ...prev,
      [key]: {
        ...prev[key],
        [field]: value,
      }
    }));
  };

  const handleSubmit = async (requisitionId) => {
    try {
      setSubmitting(true);
      
      // Collect items for this requisition
      const items = Object.entries(schedulingData)
        .filter(([key]) => key.startsWith(`${requisitionId}_`))
        .map(([key, data]) => {
          const detailId = key.split('_')[1];
          return {
            requisition_detail_id: detailId,
            delivery_qty: parseFloat(data.delivery_qty) || 0,
            source_depot_id: data.source_depot_id,
          };
        })
        .filter(item => item.delivery_qty > 0);

      if (items.length === 0) {
        setSnackbar({ open: true, message: "Please enter delivery quantities", severity: "warning" });
        return;
      }

      await apiClient.post("/inventory/requisition-schedulings", {
        requisition_id: requisitionId,
        items,
      });

      setSnackbar({ open: true, message: "Scheduling created successfully", severity: "success" });
      loadData(); // Reload data
    } catch (err) {
      console.error("Error submitting:", err);
      setSnackbar({ open: true, message: "Failed to create scheduling", severity: "error" });
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
            <Typography variant="h6" gutterBottom color="primary">
              {group?.depot_name || 'Unknown Depot'}
            </Typography>
            
            {(group?.requisitions || []).map((req, reqIdx) => (
              <Box key={req?.requisition_id || reqIdx} sx={{ mb: 3, p: 2, bgcolor: '#f9f9f9', borderRadius: 2, border: '1px solid #e0e0e0' }}>
                <Box sx={{ mb: 2 }}>
                  <Typography variant="subtitle1" fontWeight="bold">
                    {req?.requisition_no || 'N/A'}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    From: {req?.from_depot?.name || 'N/A'} • 
                    Date: {req?.requisition_date ? new Date(req.requisition_date).toLocaleDateString() : 'N/A'}
                  </Typography>
                </Box>
                
                {(req?.items || []).map((item, itemIdx) => {
                  const key = `${req.requisition_id}_${item?.requisition_detail_id}`;
                  const itemData = schedulingData[key] || {};
                  
                  return (
                    <Box key={item?.requisition_detail_id || itemIdx} sx={{ mb: 2, p: 2, bgcolor: 'white', borderRadius: 1 }}>
                      <Typography variant="body2" fontWeight="bold" gutterBottom>
                        SKU: {item?.sku || 'N/A'}
                      </Typography>
                      
                      <Box sx={{ display: 'flex', gap: 1, mb: 2, flexWrap: 'wrap' }}>
                        <Chip label={`Order: ${item?.order_qty || 0}`} size="small" />
                        <Chip label={`Unscheduled: ${item?.unscheduled_qty || 0}`} size="small" color="warning" />
                      </Box>

                      {(item?.stock_quantities || []).length > 0 && (
                        <Box sx={{ mb: 2 }}>
                          <Typography variant="caption" display="block" gutterBottom>
                            Available Stock:
                          </Typography>
                          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                            {item.stock_quantities.map((stock, stockIdx) => (
                              <Chip 
                                key={stock?.depot_id || stockIdx}
                                label={`${stock?.depot_name || 'N/A'}: ${stock?.qty || 0}`}
                                size="small"
                                color={stock?.qty > 0 ? 'primary' : 'default'}
                              />
                            ))}
                          </Box>
                        </Box>
                      )}
                      
                      <Grid2 container spacing={2}>
                        <Grid2 size={{ xs: 12, sm: 6 }}>
                          <TextField
                            fullWidth
                            label="Delivery Quantity"
                            type="number"
                            size="small"
                            value={itemData.delivery_qty || ''}
                            onChange={(e) => handleInputChange(key, 'delivery_qty', e.target.value)}
                            inputProps={{ min: 0, max: item?.unscheduled_qty || 0 }}
                          />
                        </Grid2>
                        <Grid2 size={{ xs: 12, sm: 6 }}>
                          <TextField
                            fullWidth
                            select
                            label="Source Depot"
                            size="small"
                            value={itemData.source_depot_id || ''}
                            onChange={(e) => handleInputChange(key, 'source_depot_id', e.target.value)}
                          >
                            {depots.map((depot) => (
                              <MenuItem key={depot?._id} value={depot?._id}>
                                {depot?.name || 'Unknown'}
                              </MenuItem>
                            ))}
                          </TextField>
                        </Grid2>
                      </Grid2>
                    </Box>
                  );
                })}

                <Box sx={{ mt: 2, display: 'flex', justifyContent: 'flex-end' }}>
                  <Button
                    variant="contained"
                    onClick={() => handleSubmit(req.requisition_id)}
                    disabled={submitting}
                  >
                    {submitting ? 'Submitting...' : 'Schedule Delivery'}
                  </Button>
                </Box>
              </Box>
            ))}
          </CardContent>
        </Card>
      ))}

      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
      >
        <Alert severity={snackbar.severity} onClose={() => setSnackbar({ ...snackbar, open: false })}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Container>
  );
}
