'use client';

import React, { useState, useEffect } from 'react';
import {
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormHelperText,
  Box,
  CircularProgress,
} from '@mui/material';
import api from '@/lib/api';

interface Territory {
  _id: string;
  name: string;
  type: 'zone' | 'region' | 'area' | 'db_point';
  level: number;
  parent_id: string | null;
  active: boolean;
}

interface TerritorySelectorProps {
  role?: string; // 'ZSM', 'RSM', 'ASM', 'SO' - optional for backward compatibility
  mode?: 'role-based' | 'free'; // 'role-based' uses role prop, 'free' allows user to determine scope
  value: {
    zone_id?: string;
    region_id?: string;
    area_id?: string;
  };
  onChange: (value: {
    zone_id?: string;
    region_id?: string;
    area_id?: string;
  }) => void;
  error?: {
    zone_id?: string;
    region_id?: string;
    area_id?: string;
  };
  disabled?: boolean;
}

/**
 * TerritorySelector Component
 * 
 * Two modes:
 * 1. Role-based: Zone/Region/Area fields shown based on role (ZSM/RSM/ASM/SO)
 * 2. Free mode: Always shows Zone → Region → Area cascade, user's selection determines scope
 */
export default function TerritorySelector({
  role,
  mode = 'role-based',
  value,
  onChange,
  error,
  disabled = false,
}: TerritorySelectorProps) {
  const [zones, setZones] = useState<Territory[]>([]);
  const [regions, setRegions] = useState<Territory[]>([]);
  const [areas, setAreas] = useState<Territory[]>([]);
  const [loading, setLoading] = useState({
    zones: false,
    regions: false,
    areas: false,
  });

  // Determine which fields to show based on mode
  let showZone = true; // Always show zone
  let showRegion = true; // Always show region (enabled only after zone selection)
  let showArea = true; // Always show area (enabled only after region selection)

  if (mode === 'role-based' && role) {
    // Role-based mode: show fields based on role
    showZone = ['ZSM', 'RSM', 'ASM', 'SO'].includes(role);
    showRegion = ['RSM', 'ASM', 'SO'].includes(role);
    showArea = ['ASM', 'SO'].includes(role);
  }
  // In free mode, all fields are shown

  // Load zones on mount
  useEffect(() => {
    if (showZone) {
      loadZones();
    }
  }, [showZone]);

  // Load regions when zone changes
  useEffect(() => {
    if (showRegion && value.zone_id) {
      loadRegions(value.zone_id);
    } else {
      setRegions([]);
    }
  }, [value.zone_id, showRegion]);

  // Load areas when region changes
  useEffect(() => {
    if (showArea && value.region_id) {
      loadAreas(value.region_id);
    } else {
      setAreas([]);
    }
  }, [value.region_id, showArea]);

  const loadZones = async () => {
    setLoading((prev) => ({ ...prev, zones: true }));
    try {
      const response = await api.get('/territories', {
        params: { type: 'zone', includeInactive: false, limit: 200 },
      });
      const zonesData = response.data?.data || [];
      setZones(zonesData);
    } catch (err) {
      console.error('Failed to load zones:', err);
      setZones([]);
    } finally {
      setLoading((prev) => ({ ...prev, zones: false }));
    }
  };

  const loadRegions = async (zoneId: string) => {
    setLoading((prev) => ({ ...prev, regions: true }));
    try {
      const response = await api.get('/territories', {
        params: { type: 'region', parentId: zoneId, includeInactive: false, limit: 200 },
      });
      const regionsData = response.data?.data || [];
      setRegions(regionsData);
    } catch (err) {
      console.error('Failed to load regions:', err);
      setRegions([]);
    } finally {
      setLoading((prev) => ({ ...prev, regions: false }));
    }
  };

  const loadAreas = async (regionId: string) => {
    setLoading((prev) => ({ ...prev, areas: true }));
    try {
      const response = await api.get('/territories', {
        params: { type: 'area', parentId: regionId, includeInactive: false, limit: 200 },
      });
      const areasData = response.data?.data || [];
      setAreas(areasData);
    } catch (err) {
      console.error('Failed to load areas:', err);
      setAreas([]);
    } finally {
      setLoading((prev) => ({ ...prev, areas: false }));
    }
  };

  const handleZoneChange = (zoneId: string) => {
    onChange({
      zone_id: zoneId,
      region_id: undefined,
      area_id: undefined,
    });
  };

  const handleRegionChange = (regionId: string) => {
    onChange({
      ...value,
      region_id: regionId,
      area_id: undefined,
    });
  };

  const handleAreaChange = (areaId: string) => {
    onChange({
      ...value,
      area_id: areaId,
    });
  };

  if (!showZone) {
    return null;
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      {/* Zone Selection */}
      {showZone && (
        <FormControl
          fullWidth
          error={!!error?.zone_id}
          disabled={disabled || loading.zones}
        >
          <InputLabel id="zone-label">Zone{mode === 'role-based' ? ' *' : ''}</InputLabel>
          <Select
            labelId="zone-label"
            value={value.zone_id || ''}
            onChange={(e) => handleZoneChange(e.target.value)}
            label={`Zone${mode === 'role-based' ? ' *' : ''}`}
            endAdornment={
              loading.zones ? (
                <CircularProgress size={20} sx={{ mr: 2 }} />
              ) : null
            }
          >
            <MenuItem value="">
              <em>Select Zone</em>
            </MenuItem>
            {zones.map((zone) => (
              <MenuItem key={zone._id} value={zone._id}>
                {zone.name}
              </MenuItem>
            ))}
          </Select>
          {error?.zone_id && (
            <FormHelperText>{error.zone_id}</FormHelperText>
          )}
        </FormControl>
      )}

      {/* Region Selection (for RSM, ASM, SO or free mode) */}
      {showRegion && (
        <FormControl
          fullWidth
          error={!!error?.region_id}
          disabled={disabled || !value.zone_id || loading.regions}
        >
          <InputLabel id="region-label">Region{mode === 'role-based' && role !== 'ZSM' ? ' *' : ' (Optional)'}</InputLabel>
          <Select
            labelId="region-label"
            value={value.region_id || ''}
            onChange={(e) => handleRegionChange(e.target.value)}
            label={`Region${mode === 'role-based' && role !== 'ZSM' ? ' *' : ' (Optional)'}`}
            endAdornment={
              loading.regions ? (
                <CircularProgress size={20} sx={{ mr: 2 }} />
              ) : null
            }
          >
            <MenuItem value="">
              <em>{value.zone_id ? 'Select Region' : 'Select Zone first'}</em>
            </MenuItem>
            {regions.map((region) => (
              <MenuItem key={region._id} value={region._id}>
                {region.name}
              </MenuItem>
            ))}
          </Select>
          {error?.region_id && (
            <FormHelperText>{error.region_id}</FormHelperText>
          )}
          {!value.zone_id && (
            <FormHelperText>Please select a Zone first</FormHelperText>
          )}
        </FormControl>
      )}

      {/* Area Selection (for ASM, SO or free mode) */}
      {showArea && (
        <FormControl
          fullWidth
          error={!!error?.area_id}
          disabled={disabled || !value.region_id || loading.areas}
        >
          <InputLabel id="area-label">Area{mode === 'role-based' && ['ASM', 'SO'].includes(role || '') ? ' *' : ' (Optional)'}</InputLabel>
          <Select
            labelId="area-label"
            value={value.area_id || ''}
            onChange={(e) => handleAreaChange(e.target.value)}
            label={`Area${mode === 'role-based' && ['ASM', 'SO'].includes(role || '') ? ' *' : ' (Optional)'}`}
            endAdornment={
              loading.areas ? (
                <CircularProgress size={20} sx={{ mr: 2 }} />
              ) : null
            }
          >
            <MenuItem value="">
              <em>{value.region_id ? 'Select Area' : 'Select Region first'}</em>
            </MenuItem>
            {areas.map((area) => (
              <MenuItem key={area._id} value={area._id}>
                {area.name}
              </MenuItem>
            ))}
          </Select>
          {error?.area_id && (
            <FormHelperText>{error.area_id}</FormHelperText>
          )}
          {!value.region_id && (
            <FormHelperText>Please select a Region first</FormHelperText>
          )}
        </FormControl>
      )}
    </Box>
  );
}
