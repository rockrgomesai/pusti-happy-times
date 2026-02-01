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
  Checkbox,
  Autocomplete,
  TextField,
  Alert,
  Chip,
  CircularProgress,
} from "@mui/material";
import { SecondaryOfferFormData } from "@/types/secondaryOffer";
import { listDistributors } from "@/lib/api/distributors";
import { getEligibleRoutes } from "@/lib/api/secondaryOffers";

interface Distributor {
  _id: string;
  name: string;
  distributor_id?: string;
  db_point_id?: string | { _id: string; name: string };
}

interface Route {
  _id: string;
  route_name: string;
  route_id: string;
  distributor_id?: { _id: string; name: string };
}

interface Step3Props {
  formData: SecondaryOfferFormData;
  onChange: (updates: Partial<SecondaryOfferFormData>) => void;
}

const Step3DistributorRoutes: React.FC<Step3Props> = ({ formData, onChange }) => {
  const [distributors, setDistributors] = useState<Distributor[]>([]);
  const [routes, setRoutes] = useState<Route[]>([]);
  const [loadingDistributors, setLoadingDistributors] = useState(false);
  const [loadingRoutes, setLoadingRoutes] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch distributors filtered by selected territories
  useEffect(() => {
    const fetchDistributors = async () => {
      setLoadingDistributors(true);
      setError(null);
      try {
        const dbPointIds = formData.territories?.db_points?.ids || [];
        const params: any = {};
        
        console.log('Fetching distributors for DB points:', dbPointIds);
        
        // Send all db_point_ids in a single request (comma-separated)
        if (dbPointIds.length > 0) {
          params.db_point_id = dbPointIds.join(',');
          console.log('Request params:', params);
        }
        
        const response = await listDistributors(params);
        console.log('Distributors response:', response);
        setDistributors(response.data || []);
      } catch (err: any) {
        console.error('Error loading distributors:', err);
        setError(err.response?.data?.message || "Failed to load distributors");
      } finally {
        setLoadingDistributors(false);
      }
    };

    fetchDistributors();
  }, [JSON.stringify(formData.territories?.db_points?.ids)]);

  // Fetch routes when distributors are selected (only if not applying to all routes)
  useEffect(() => {
    const distributorIds = formData.targeting?.distributors?.ids || [];
    const applyToAllRoutes = formData.targeting?.distributors?.applyToAllRoutes;
    
    // Don't fetch routes if:
    // 1. No distributors selected
    // 2. "Apply to all routes" is checked
    if (distributorIds.length === 0 || applyToAllRoutes) {
      setRoutes([]);
      return;
    }

    const fetchRoutes = async () => {
      setLoadingRoutes(true);
      setError(null);
      try {
        console.log('Fetching routes for distributors:', distributorIds);
        const response = await getEligibleRoutes(distributorIds);
        console.log('Routes response:', response);
        setRoutes(response.data || []);
      } catch (err: any) {
        console.error('Error loading routes:', err);
        setError(err.response?.data?.message || err.message || "Failed to load routes");
      } finally {
        setLoadingRoutes(false);
      }
    };

    fetchRoutes();
  }, [JSON.stringify(formData.targeting?.distributors?.ids), formData.targeting?.distributors?.applyToAllRoutes]);

  const handleDistributorsChange = (newDistributors: string[]) => {
    onChange({
      targeting: {
        ...formData.targeting,
        distributors: {
          ...formData.targeting.distributors,
          ids: newDistributors,
        },
        // Reset routes when distributors change
        routes: {
          ...formData.targeting.routes,
          ids: [],
        },
      },
    });
  };

  const handleDistributorModeChange = (mode: "include" | "exclude") => {
    onChange({
      targeting: {
        ...formData.targeting,
        distributors: {
          ...formData.targeting.distributors,
          mode,
        },
      },
    });
  };

  const handleApplyToAllRoutesChange = (checked: boolean) => {
    onChange({
      targeting: {
        ...formData.targeting,
        distributors: {
          ...formData.targeting.distributors,
          applyToAllRoutes: checked,
        },
        // Clear routes selection if applying to all
        routes: {
          ...formData.targeting.routes,
          ids: checked ? [] : formData.targeting.routes.ids,
        },
      },
    });
  };

  const handleRoutesChange = (newRoutes: string[]) => {
    onChange({
      targeting: {
        ...formData.targeting,
        routes: {
          ...formData.targeting.routes,
          ids: newRoutes,
        },
      },
    });
  };

  const handleRouteModeChange = (mode: "include" | "exclude") => {
    onChange({
      targeting: {
        ...formData.targeting,
        routes: {
          ...formData.targeting.routes,
          mode,
        },
      },
    });
  };

  const selectedDistributors = distributors.filter((d) =>
    (formData.targeting?.distributors?.ids || []).includes(d._id)
  );

  const selectedRoutes = routes.filter((r) =>
    (formData.targeting?.routes?.ids || []).includes(r._id)
  );

  const showDistributorMode = (formData.targeting?.distributors?.ids || []).length > 0;
  const showRouteMode = (formData.targeting?.routes?.ids || []).length > 0 && !formData.targeting?.distributors?.applyToAllRoutes;

  return (
    <Box>
      <Typography variant="h6" gutterBottom sx={{ mb: 3 }}>
        Distributor & Route Targeting
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      <Grid container spacing={3}>
        {/* Distributor Selection */}
        <Grid item xs={12}>
          <FormControl fullWidth>
            <FormLabel sx={{ mb: 1, fontWeight: 600 }}>
              Select Distributors
            </FormLabel>
            <Autocomplete
              multiple
              options={distributors}
              getOptionLabel={(option) => {
                if (typeof option === 'string') return option;
                return `${option.name || ''}${option.distributor_id ? ` (${option.distributor_id})` : ''}`;
              }}
              value={selectedDistributors}
              onChange={(_, newValue) => handleDistributorsChange(newValue.map((d) => d._id))}
              loading={loadingDistributors}
              renderInput={(params) => (
                <TextField
                  {...params}
                  placeholder="Select distributors (filtered by territories)"
                  InputProps={{
                    ...params.InputProps,
                    endAdornment: (
                      <>
                        {loadingDistributors ? <CircularProgress size={20} /> : null}
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

        {/* Distributor Mode */}
        {showDistributorMode && (
          <Grid item xs={12} sm={6}>
            <FormControl component="fieldset">
              <FormLabel component="legend">Distributor Filter Mode</FormLabel>
              <RadioGroup
                row
                value={formData.targeting?.distributors?.mode || "include"}
                onChange={(e) => handleDistributorModeChange(e.target.value as "include" | "exclude")}
              >
                <FormControlLabel value="include" control={<Radio />} label="Include" />
                <FormControlLabel value="exclude" control={<Radio />} label="Exclude" />
              </RadioGroup>
            </FormControl>
          </Grid>
        )}

        {/* Apply to All Routes Checkbox */}
        {(formData.targeting?.distributors?.ids || []).length > 0 && (
          <Grid item xs={12}>
            <FormControlLabel
              control={
                <Checkbox
                  checked={formData.targeting?.distributors?.applyToAllRoutes || false}
                  onChange={(e) => handleApplyToAllRoutesChange(e.target.checked)}
                />
              }
              label="Apply to all routes under selected distributors"
            />
            {formData.targeting?.distributors?.applyToAllRoutes && (
              <Typography variant="caption" color="text.secondary" display="block" sx={{ ml: 4 }}>
                Offer will apply to all routes managed by the selected distributors
              </Typography>
            )}
          </Grid>
        )}

        {/* Route Selection */}
        {(formData.targeting?.distributors?.ids || []).length > 0 && !formData.targeting?.distributors?.applyToAllRoutes && (
          <Grid item xs={12}>
            <FormControl fullWidth>
              <FormLabel sx={{ mb: 1, fontWeight: 600 }}>
                Select Routes (Optional)
              </FormLabel>
              <Autocomplete
                multiple
                options={routes}
                getOptionLabel={(option) => `${option.route_name}${option.route_id ? ` (${option.route_id})` : ""}`}
                value={selectedRoutes}
                onChange={(_, newValue) => handleRoutesChange(newValue.map((r) => r._id))}
                loading={loadingRoutes}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    placeholder="Select specific routes (leave empty for all routes)"
                    InputProps={{
                      ...params.InputProps,
                      endAdornment: (
                        <>
                          {loadingRoutes ? <CircularProgress size={20} /> : null}
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
                      label={option.route_name}
                      size="small"
                    />
                  ))
                }
              />
            </FormControl>
          </Grid>
        )}

        {/* Route Mode */}
        {showRouteMode && (
          <Grid item xs={12} sm={6}>
            <FormControl component="fieldset">
              <FormLabel component="legend">Route Filter Mode</FormLabel>
              <RadioGroup
                row
                value={formData.targeting?.routes?.mode || "include"}
                onChange={(e) => handleRouteModeChange(e.target.value as "include" | "exclude")}
              >
                <FormControlLabel value="include" control={<Radio />} label="Include" />
                <FormControlLabel value="exclude" control={<Radio />} label="Exclude" />
              </RadioGroup>
            </FormControl>
          </Grid>
        )}

        {/* Info Alert */}
        {(!formData.targeting?.distributors || formData.targeting.distributors.length === 0) && (
          <Grid item xs={12}>
            <Alert severity="info">
              Select distributors to target for this offer. Routes will be filtered based on your distributor selection.
            </Alert>
          </Grid>
        )}
      </Grid>
    </Box>
  );
};

export default Step3DistributorRoutes;
