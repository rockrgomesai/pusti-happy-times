"use client";

import React from "react";
import {
  Box,
  TextField,
  FormControl,
  FormControlLabel,
  Checkbox,
  MenuItem,
  Typography,
  Grid,
  Stack,
  FormGroup,
} from "@mui/material";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { AdapterDateFns } from "@mui/x-date-pickers/AdapterDateFns";
import { SecondaryOfferFormData, OfferType, OFFER_TYPE_LABELS } from "@/types/secondaryOffer";

interface Step1Props {
  formData: SecondaryOfferFormData;
  onChange: (updates: Partial<SecondaryOfferFormData>) => void;
}

const Step1BasicInfo: React.FC<Step1Props> = ({ formData, onChange }) => {
  const handleSegmentToggle = (segment: "BIS" | "BEV") => {
    const newSegments = formData.product_segments.includes(segment)
      ? formData.product_segments.filter((s) => s !== segment)
      : [...formData.product_segments, segment];
    onChange({ product_segments: newSegments });
  };

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns}>
      <Box>
        <Typography variant="h6" gutterBottom sx={{ mb: 3 }}>
          Basic Offer Information
        </Typography>

        <Grid container spacing={3}>
          {/* Row 1: Offer Name, Description, BIS checkbox, BEV checkbox */}
          <Grid item xs={12} sm={6} md={3}>
            <TextField
              fullWidth
              label="Offer Name *"
              value={formData.name}
              onChange={(e) => onChange({ name: e.target.value })}
              placeholder="Enter offer name"
              required
            />
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <TextField
              fullWidth
              label="Description"
              value={formData.description}
              onChange={(e) => onChange({ description: e.target.value })}
              placeholder="Enter offer description (optional)"
            />
          </Grid>

          <Grid item xs={6} sm={3} md={1.5}>
            <FormControlLabel
              control={
                <Checkbox
                  checked={formData.product_segments.includes("BIS")}
                  onChange={() => handleSegmentToggle("BIS")}
                />
              }
              label="BIS (Biscuits)"
              sx={{ mt: 1, whiteSpace: 'nowrap' }}
            />
          </Grid>

          <Grid item xs={6} sm={3} md={1.5}>
            <FormControlLabel
              control={
                <Checkbox
                  checked={formData.product_segments.includes("BEV")}
                  onChange={() => handleSegmentToggle("BEV")}
                />
              }
              label="BEV (Beverages)"
              sx={{ mt: 1, whiteSpace: 'nowrap' }}
            />
          </Grid>

          {/* Row 2: Offer Type, Start Date, End Date, Status */}
          <Grid item xs={12} sm={6} md={3}>
            <TextField
              fullWidth
              select
              label="Offer Type *"
              value={formData.offer_type}
              onChange={(e) => onChange({ offer_type: e.target.value as OfferType })}
              required
            >
              {Object.entries(OFFER_TYPE_LABELS).map(([value, label]) => (
                <MenuItem key={value} value={value}>
                  {label}
                </MenuItem>
              ))}
            </TextField>
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <DatePicker
              label="Start Date *"
              value={formData.start_date}
              onChange={(date) => onChange({ start_date: date })}
              slotProps={{ textField: { fullWidth: true, required: true } }}
            />
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <DatePicker
              label="End Date *"
              value={formData.end_date}
              onChange={(date) => onChange({ end_date: date })}
              minDate={formData.start_date || undefined}
              slotProps={{ textField: { fullWidth: true, required: true } }}
            />
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <TextField
              fullWidth
              select
              label="Status *"
              value={formData.status}
              onChange={(e) => onChange({ status: e.target.value as any })}
            >
              <MenuItem value="Draft">Draft</MenuItem>
              <MenuItem value="Active">Active</MenuItem>
              <MenuItem value="Paused">Paused</MenuItem>
            </TextField>
          </Grid>
        </Grid>
      </Box>
    </LocalizationProvider>
  );
};

export default Step1BasicInfo;
