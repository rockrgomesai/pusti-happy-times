"use client";

import React, { useEffect, useState } from "react";
import {
  Box,
  Typography,
  Grid,
  FormControl,
  FormLabel,
  RadioGroup,
  FormControlLabel,
  Radio,
  Autocomplete,
  TextField,
  Alert,
  Chip,
  CircularProgress,
  Button,
  Paper,
  List,
  ListItem,
  ListItemText,
  Divider,
} from "@mui/material";
import { Preview as PreviewIcon } from "@mui/icons-material";
import { SecondaryOfferFormData } from "@/types/secondaryOffer";
import {
  resolveTargetedOutlets,
  getOutletTypes,
  getOutletChannels,
} from "@/lib/api/secondaryOffers";

interface Outlet {
  _id: string;
  outlet_name: string;
  outlet_id?: string;
  route_id?: {
    _id: string;
    route_id?: string;
    route_name?: string;
  };
  outlet_type_id?: string;
  channel_id?: string;
}

interface OutletType {
  _id: string;
  name: string;
}

interface OutletChannel {
  _id: string;
  name: string;
}

interface Step4Props {
  formData: SecondaryOfferFormData;
  onChange: (updates: Partial<SecondaryOfferFormData>) => void;
}

const Step4OutletTargeting: React.FC<Step4Props> = ({ formData, onChange }) => {
  const [outlets, setOutlets] = useState<Outlet[]>([]);
  const [outletTypes, setOutletTypes] = useState<OutletType[]>([]);
  const [outletChannels, setOutletChannels] = useState<OutletChannel[]>([]);
  const [loadingOutlets, setLoadingOutlets] = useState(false);
  const [loadingTypes, setLoadingTypes] = useState(false);
  const [loadingChannels, setLoadingChannels] = useState(false);
  const [previewing, setPreviewing] = useState(false);
  const [previewData, setPreviewData] = useState<{
    count: number;
    outlets: Outlet[];
  } | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Fetch outlet types
  useEffect(() => {
    const fetchTypes = async () => {
      setLoadingTypes(true);
      try {
        const response = await getOutletTypes();
        setOutletTypes(response.data || []);
      } catch (err) {
        console.error("Failed to load outlet types:", err);
      } finally {
        setLoadingTypes(false);
      }
    };
    fetchTypes();
  }, []);

  // Fetch outlet channels
  useEffect(() => {
    const fetchChannels = async () => {
      setLoadingChannels(true);
      try {
        const response = await getOutletChannels();
        setOutletChannels(response.data || []);
      } catch (err) {
        console.error("Failed to load outlet channels:", err);
      } finally {
        setLoadingChannels(false);
      }
    };
    fetchChannels();
  }, []);

  // Fetch outlets for "specific" mode
  useEffect(() => {
    const fetchOutlets = async () => {
      if (formData.outlets?.selectionMode !== "specific") {
        setOutlets([]);
        return;
      }

      setLoadingOutlets(true);
      setError(null);
      try {
        const scopeForOptions = {
          territories: formData.territories,
          targeting: formData.targeting,
          outlets: {
            selectionMode: "all",
            ids: [],
            mode: "include",
            filters: {},
          },
        };

        const response = await resolveTargetedOutlets(scopeForOptions);
        setOutlets(response.data.outlets || []);
      } catch (err: any) {
        setError(err.response?.data?.message || "Failed to load outlets");
      } finally {
        setLoadingOutlets(false);
      }
    };

    fetchOutlets();
  }, [formData.outlets?.selectionMode, formData.territories, formData.targeting]);

  const handleSelectionModeChange = (mode: "all" | "specific" | "filtered") => {
    onChange({
      outlets: {
        ...formData.outlets,
        selectionMode: mode,
        // Reset selections when mode changes
        ids: mode === "specific" ? (formData.outlets?.ids || []) : [],
        filters: mode === "filtered" ? (formData.outlets?.filters || {}) : {},
      },
    });
  };

  const handleSpecificOutletsChange = (newOutlets: string[]) => {
    onChange({
      outlets: {
        ...formData.outlets,
        ids: newOutlets,
      },
    });
  };

  const handleFilterChange = (field: string, value: any) => {
    onChange({
      outlets: {
        ...formData.outlets,
        filters: {
          ...formData.outlets?.filters,
          [field]: value,
        },
      },
    });
  };

  const handlePreview = async () => {
    setPreviewing(true);
    setError(null);
    try {
      const response = await resolveTargetedOutlets({
        territories: formData.territories,
        targeting: formData.targeting,
        outlets: formData.outlets,
      });
      setPreviewData({
        count: response.data.totalOutlets,
        outlets: response.data.outlets.slice(0, 10), // Show first 10
      });
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to preview outlets");
    } finally {
      setPreviewing(false);
    }
  };

  const selectedOutlets = outlets.filter((o) =>
    formData.outlets?.ids?.includes(o._id)
  );

  return (
    <Box>
      <Typography variant="h6" gutterBottom sx={{ mb: 3 }}>
        Outlet Targeting
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      <Grid container spacing={3}>
        {/* Selection Mode */}
        <Grid item xs={12}>
          <FormControl component="fieldset" fullWidth>
            <FormLabel component="legend" sx={{ mb: 1, fontWeight: 600 }}>
              Outlet Selection Mode
            </FormLabel>
            <RadioGroup
              value={formData.outlets?.selectionMode || "all"}
              onChange={(e) => handleSelectionModeChange(e.target.value as any)}
            >
              <FormControlLabel
                value="all"
                control={<Radio />}
                label="All Outlets (within selected territories/distributors/routes)"
              />
              <FormControlLabel
                value="specific"
                control={<Radio />}
                label="Specific Outlets (manually select)"
              />
              <FormControlLabel
                value="filtered"
                control={<Radio />}
                label="Filtered Outlets (by type, channel, or market size)"
              />
            </RadioGroup>
          </FormControl>
        </Grid>

        {/* Specific Outlets Selection */}
        {formData.outlets?.selectionMode === "specific" && (
          <Grid item xs={12}>
            <FormControl fullWidth>
              <FormLabel sx={{ mb: 1, fontWeight: 600 }}>
                Select Specific Outlets
              </FormLabel>
              <Autocomplete
                multiple
                options={outlets}
                getOptionLabel={(option) => `${option.outlet_name}${option.outlet_id ? ` (${option.outlet_id})` : ""}`}
                value={selectedOutlets}
                onChange={(_, newValue) => handleSpecificOutletsChange(newValue.map((o) => o._id))}
                loading={loadingOutlets}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    placeholder="Search and select outlets"
                    InputProps={{
                      ...params.InputProps,
                      endAdornment: (
                        <>
                          {loadingOutlets ? <CircularProgress size={20} /> : null}
                          {params.InputProps.endAdornment}
                        </>
                      ),
                    }}
                  />
                )}
                renderTags={(value, getTagProps) =>
                  value.map((option, index) => (
                    <Chip
                      {...getTagProps({ index })}
                      key={option._id}
                      label={option.outlet_name}
                      size="small"
                    />
                  ))
                }
              />
            </FormControl>
          </Grid>
        )}

        {/* Filtered Outlets Options */}
        {formData.outlets?.selectionMode === "filtered" && (
          <>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <FormLabel sx={{ mb: 1, fontWeight: 600 }}>
                  Outlet Types (Optional)
                </FormLabel>
                <Autocomplete
                  multiple
                  options={outletTypes}
                  getOptionLabel={(option) => option.name}
                  value={outletTypes.filter((type) =>
                    formData.outlets?.filters?.outletTypes?.includes(type._id)
                  )}
                  onChange={(_, newValue) =>
                    handleFilterChange("outletTypes", newValue.map((t) => t._id))
                  }
                  loading={loadingTypes}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      placeholder="Select outlet types"
                      InputProps={{
                        ...params.InputProps,
                        endAdornment: (
                          <>
                            {loadingTypes ? <CircularProgress size={20} /> : null}
                            {params.InputProps.endAdornment}
                          </>
                        ),
                      }}
                    />
                  )}
                  renderTags={(value, getTagProps) =>
                    value.map((option, index) => (
                      <Chip
                        {...getTagProps({ index })}
                        key={option._id}
                        label={option.name}
                        size="small"
                      />
                    ))
                  }
                />
              </FormControl>
            </Grid>

            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <FormLabel sx={{ mb: 1, fontWeight: 600 }}>
                  Outlet Channels (Optional)
                </FormLabel>
                <Autocomplete
                  multiple
                  options={outletChannels}
                  getOptionLabel={(option) => option.name}
                  value={outletChannels.filter((channel) =>
                    formData.outlets?.filters?.channels?.includes(channel._id)
                  )}
                  onChange={(_, newValue) =>
                    handleFilterChange("channels", newValue.map((c) => c._id))
                  }
                  loading={loadingChannels}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      placeholder="Select outlet channels"
                      InputProps={{
                        ...params.InputProps,
                        endAdornment: (
                          <>
                            {loadingChannels ? <CircularProgress size={20} /> : null}
                            {params.InputProps.endAdornment}
                          </>
                        ),
                      }}
                    />
                  )}
                  renderTags={(value, getTagProps) =>
                    value.map((option, index) => (
                      <Chip
                        {...getTagProps({ index })}
                        key={option._id}
                        label={option.name}
                        size="small"
                      />
                    ))
                  }
                />
              </FormControl>
            </Grid>

            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                type="number"
                label="Minimum Market Size"
                value={formData.outlets?.filters?.minMarketSize || ""}
                onChange={(e) =>
                  handleFilterChange("minMarketSize", e.target.value ? Number(e.target.value) : undefined)
                }
                inputProps={{ min: 0 }}
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                type="number"
                label="Maximum Market Size"
                value={formData.outlets?.filters?.maxMarketSize || ""}
                onChange={(e) =>
                  handleFilterChange("maxMarketSize", e.target.value ? Number(e.target.value) : undefined)
                }
                inputProps={{ min: 0 }}
              />
            </Grid>
          </>
        )}

        {/* Preview Button */}
        <Grid item xs={12}>
          <Button
            variant="outlined"
            startIcon={previewing ? <CircularProgress size={20} /> : <PreviewIcon />}
            onClick={handlePreview}
            disabled={previewing}
            fullWidth
            sx={{ mb: 2 }}
          >
            Preview Targeted Outlets
          </Button>
        </Grid>

        {/* Preview Results */}
        {previewData && (
          <Grid item xs={12}>
            <Paper variant="outlined" sx={{ p: 2 }}>
              <Typography variant="h6" gutterBottom>
                Preview Results: {previewData.count.toLocaleString()} Outlets
              </Typography>
              <Divider sx={{ my: 2 }} />
              {previewData.outlets.length > 0 ? (
                <>
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    Showing first {previewData.outlets.length} outlets:
                  </Typography>
                  <List dense>
                    {previewData.outlets.map((outlet) => (
                      <ListItem key={outlet._id}>
                        <ListItemText
                          primary={outlet.outlet_name}
                          secondary={`${outlet.outlet_id || "N/A"} • ${outlet.route_id?.route_name || "N/A"}`}
                        />
                      </ListItem>
                    ))}
                  </List>
                  {previewData.count > 10 && (
                    <Typography variant="caption" color="text.secondary">
                      ... and {(previewData.count - 10).toLocaleString()} more outlets
                    </Typography>
                  )}
                </>
              ) : (
                <Alert severity="warning">No outlets match the current criteria</Alert>
              )}
            </Paper>
          </Grid>
        )}

        {/* Info Alert */}
        {formData.outlets?.selectionMode === "all" && (
          <Grid item xs={12}>
            <Alert severity="info">
              All outlets within your selected territories, distributors, and routes will be targeted.
            </Alert>
          </Grid>
        )}
      </Grid>
    </Box>
  );
};

export default Step4OutletTargeting;
