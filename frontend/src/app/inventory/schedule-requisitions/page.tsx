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
} from "@mui/material";
import { apiClient } from "@/lib/api";

export default function ScheduleRequisitionsPage() {
  const [loading, setLoading] = useState(true);
  const [depotGroups, setDepotGroups] = useState([]);
  const [error, setError] = useState("");

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const response = await apiClient.get("/inventory/requisition-schedulings");
      
      // Handle response structure
      const groups = Array.isArray(response.data) 
        ? response.data 
        : (response.data?.data || []);
      
      console.log("Loaded groups:", groups);
      setDepotGroups(groups);
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
                  {(req?.items || []).map((item, itemIdx) => (
                    <Box key={item?.requisition_detail_id || itemIdx} sx={{ ml: 2, mb: 1 }}>
                      <Typography variant="body2">
                        • SKU: {item?.sku || 'N/A'} - 
                        Order: {item?.order_qty || 0} - 
                        Unscheduled: {item?.unscheduled_qty || 0}
                      </Typography>
                    </Box>
                  ))}
                </Box>
              </Box>
            ))}
          </CardContent>
        </Card>
      ))}
    </Container>
  );
}
