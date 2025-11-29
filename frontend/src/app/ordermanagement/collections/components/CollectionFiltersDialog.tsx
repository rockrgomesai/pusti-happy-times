"use client";

import React, { useState } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  TextField,
  MenuItem,
  Stack,
  Typography,
} from "@mui/material";


export interface CollectionFilters {
  approval_status?: string;
  payment_method?: string;
  date_from?: Date | null;
  date_to?: Date | null;
  amount_min?: string;
  amount_max?: string;
  transaction_id?: string;
  do_no?: string;
}

interface CollectionFiltersDialogProps {
  open: boolean;
  onClose: () => void;
  filters: CollectionFilters;
  onApplyFilters: (filters: CollectionFilters) => void;
}

export default function CollectionFiltersDialog({
  open,
  onClose,
  filters,
  onApplyFilters,
}: CollectionFiltersDialogProps) {
  const [localFilters, setLocalFilters] = useState<CollectionFilters>(filters);

  const handleChange = (field: keyof CollectionFilters, value: any) => {
    setLocalFilters((prev) => ({ ...prev, [field]: value }));
  };

  const handleApply = () => {
    onApplyFilters(localFilters);
    onClose();
  };

  const handleClear = () => {
    const emptyFilters: CollectionFilters = {
      approval_status: "",
      payment_method: "",
      date_from: null,
      date_to: null,
      amount_min: "",
      amount_max: "",
      transaction_id: "",
      do_no: "",
    };
    setLocalFilters(emptyFilters);
    onApplyFilters(emptyFilters);
  };

  const statusOptions = [
    { value: "", label: "All Statuses" },
    { value: "pending", label: "Pending" },
    { value: "forwarded_to_area_manager", label: "With ASM" },
    { value: "forwarded_to_regional_manager", label: "With RSM" },
    { value: "forwarded_to_zonal_manager_and_sales_admin", label: "With ZSM & Sales Admin" },
    { value: "returned_to_sales_admin", label: "Returned for Rework" },
    { value: "forwarded_to_order_management", label: "With Order Management" },
    { value: "forwarded_to_finance", label: "With Finance" },
    { value: "approved", label: "Approved" },
    { value: "cancelled", label: "Cancelled" },
  ];

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>Advanced Filters</DialogTitle>
      <DialogContent>
        <Stack spacing={3} sx={{ mt: 2 }}>
          {/* Status Filter */}
          <TextField
            select
            fullWidth
            label="Status"
            value={localFilters.approval_status || ""}
            onChange={(e) => handleChange("approval_status", e.target.value)}
          >
            {statusOptions.map((option) => (
              <MenuItem key={option.value} value={option.value}>
                {option.label}
              </MenuItem>
            ))}
          </TextField>

          {/* Payment Method Filter */}
          <TextField
            select
            fullWidth
            label="Payment Method"
            value={localFilters.payment_method || ""}
            onChange={(e) => handleChange("payment_method", e.target.value)}
          >
            <MenuItem value="">All Methods</MenuItem>
            <MenuItem value="Bank">Bank</MenuItem>
            <MenuItem value="Cash">Cash</MenuItem>
          </TextField>

          {/* Date Range */}
          <Box>
            <Typography variant="subtitle2" gutterBottom>
              Date Range
            </Typography>
            <Stack direction="row" spacing={2}>
              <TextField
                type="date"
                label="From Date"
                value={localFilters.date_from ? new Date(localFilters.date_from).toISOString().split('T')[0] : ''}
                onChange={(e) => handleChange("date_from", e.target.value ? new Date(e.target.value) : null)}
                InputLabelProps={{ shrink: true }}
                helperText="Format: DD/MM/YYYY"
                fullWidth
              />
              <TextField
                type="date"
                label="To Date"
                value={localFilters.date_to ? new Date(localFilters.date_to).toISOString().split('T')[0] : ''}
                onChange={(e) => handleChange("date_to", e.target.value ? new Date(e.target.value) : null)}
                InputLabelProps={{ shrink: true }}
                helperText="Format: DD/MM/YYYY"
                fullWidth
              />
            </Stack>
          </Box>

          {/* Amount Range */}
          <Box>
            <Typography variant="subtitle2" gutterBottom>
              Amount Range (BDT)
            </Typography>
            <Stack direction="row" spacing={2}>
              <TextField
                fullWidth
                type="number"
                label="Minimum"
                value={localFilters.amount_min || ""}
                onChange={(e) => handleChange("amount_min", e.target.value)}
              />
              <TextField
                fullWidth
                type="number"
                label="Maximum"
                value={localFilters.amount_max || ""}
                onChange={(e) => handleChange("amount_max", e.target.value)}
              />
            </Stack>
          </Box>

          {/* Transaction ID Search */}
          <TextField
            fullWidth
            label="Transaction ID"
            value={localFilters.transaction_id || ""}
            onChange={(e) => handleChange("transaction_id", e.target.value)}
            placeholder="COL-20250115-00001"
          />

          {/* DO Number Search */}
          <TextField
            fullWidth
            label="Demand Order Number"
            value={localFilters.do_no || ""}
            onChange={(e) => handleChange("do_no", e.target.value)}
            placeholder="DO-2025-001"
          />
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClear} color="warning">
          Clear All
        </Button>
        <Button onClick={onClose}>Cancel</Button>
        <Button onClick={handleApply} variant="contained">
          Apply Filters
        </Button>
      </DialogActions>
    </Dialog>
  );
}
