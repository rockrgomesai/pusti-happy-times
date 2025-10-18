'use client';

import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Stack,
  Chip,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  ListItemIcon,
  Checkbox,
  CircularProgress,
  Alert,
  Paper,
  Divider
} from '@mui/material';
import { territoriesApi, distributorsApi } from '@/lib/api/offers';
import type { Territory, Distributor, ProductSegment } from '@/types/offer';
import StorefrontIcon from '@mui/icons-material/Storefront';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';
import SelectAllIcon from '@mui/icons-material/SelectAll';

interface Screen2Props {
  data: {
    selectedZones: string[];
    selectedRegions: string[];
    selectedAreas: string[];
    selectedDbPoints: string[];
    selectedDistributors: string[];
    zonesIncludeMode: 'include' | 'exclude';
    regionsIncludeMode: 'include' | 'exclude';
    areasIncludeMode: 'include' | 'exclude';
    dbPointsIncludeMode: 'include' | 'exclude';
    distributorsIncludeMode: 'include' | 'exclude';
  };
  productSegments: ProductSegment[];
  onChange: (data: Partial<Screen2Props['data']>) => void;
  errors?: {
    selectedZones?: string;
    selectedRegions?: string;
    selectedAreas?: string;
    selectedDbPoints?: string;
    selectedDistributors?: string;
  };
}

export default function Screen2TerritoryDistributor({ 
  data, 
  productSegments,
  onChange, 
  errors 
}: Screen2Props) {
  const [zones, setZones] = useState<Territory[]>([]);
  const [regions, setRegions] = useState<Territory[]>([]);
  const [areas, setAreas] = useState<Territory[]>([]);
  const [dbPoints, setDbPoints] = useState<Territory[]>([]);
  const [distributors, setDistributors] = useState<Distributor[]>([]);
  
  const [loading, setLoading] = useState({
    zones: false,
    regions: false,
    areas: false,
    dbPoints: false,
    distributors: false
  });

  // Load zones on mount
  useEffect(() => {
    loadZones();
  }, []);

  // Load regions when zones change
  useEffect(() => {
    if (data.selectedZones.length > 0) {
      loadRegionsForZones(data.selectedZones);
    } else {
      setRegions([]);
      setAreas([]);
      setDbPoints([]);
      setDistributors([]);
      onChange({ 
        selectedRegions: [], 
        selectedAreas: [], 
        selectedDbPoints: [],
        selectedDistributors: []
      });
    }
  }, [data.selectedZones]);

  // Load areas when regions change
  useEffect(() => {
    if (data.selectedRegions.length > 0) {
      loadAreasForRegions(data.selectedRegions);
    } else {
      setAreas([]);
      setDbPoints([]);
      setDistributors([]);
      onChange({ 
        selectedAreas: [], 
        selectedDbPoints: [],
        selectedDistributors: []
      });
    }
  }, [data.selectedRegions]);

  // Load db points when areas change
  useEffect(() => {
    if (data.selectedAreas.length > 0) {
      loadDbPointsForAreas(data.selectedAreas);
    } else {
      setDbPoints([]);
      setDistributors([]);
      onChange({ 
        selectedDbPoints: [],
        selectedDistributors: []
      });
    }
  }, [data.selectedAreas]);

  // Load distributors when db points change
  useEffect(() => {
    if (data.selectedDbPoints.length > 0 && productSegments.length > 0) {
      loadDistributors(data.selectedDbPoints, productSegments);
    } else {
      setDistributors([]);
      onChange({ selectedDistributors: [] });
    }
  }, [data.selectedDbPoints, productSegments]);

  const loadZones = async () => {
    setLoading(prev => ({ ...prev, zones: true }));
    try {
      const zonesData = await territoriesApi.getByType('zone');
      setZones(zonesData);
    } catch (error) {
      console.error('Failed to load zones:', error);
    } finally {
      setLoading(prev => ({ ...prev, zones: false }));
    }
  };

  const loadRegionsForZones = async (zoneIds: string[]) => {
    setLoading(prev => ({ ...prev, regions: true }));
    try {
      const allRegions: Territory[] = [];
      for (const zoneId of zoneIds) {
        const regionsData = await territoriesApi.getByType('region', zoneId);
        allRegions.push(...regionsData);
      }
      setRegions(allRegions);
    } catch (error) {
      console.error('Failed to load regions:', error);
    } finally {
      setLoading(prev => ({ ...prev, regions: false }));
    }
  };

  const loadAreasForRegions = async (regionIds: string[]) => {
    setLoading(prev => ({ ...prev, areas: true }));
    try {
      const allAreas: Territory[] = [];
      for (const regionId of regionIds) {
        const areasData = await territoriesApi.getByType('area', regionId);
        allAreas.push(...areasData);
      }
      setAreas(allAreas);
    } catch (error) {
      console.error('Failed to load areas:', error);
    } finally {
      setLoading(prev => ({ ...prev, areas: false }));
    }
  };

  const loadDbPointsForAreas = async (areaIds: string[]) => {
    setLoading(prev => ({ ...prev, dbPoints: true }));
    try {
      const allDbPoints: Territory[] = [];
      for (const areaId of areaIds) {
        const dbPointsData = await territoriesApi.getByType('db_point', areaId);
        allDbPoints.push(...dbPointsData);
      }
      setDbPoints(allDbPoints);
    } catch (error) {
      console.error('Failed to load db points:', error);
    } finally {
      setLoading(prev => ({ ...prev, dbPoints: false }));
    }
  };

  const loadDistributors = async (dbPointIds: string[], segments: ProductSegment[]) => {
    setLoading(prev => ({ ...prev, distributors: true }));
    try {
      const distributorsData = await distributorsApi.getEligible(dbPointIds, segments);
      setDistributors(distributorsData);
    } catch (error) {
      console.error('Failed to load distributors:', error);
      setDistributors([]);
    } finally {
      setLoading(prev => ({ ...prev, distributors: false }));
    }
  };

  // Toggle handlers
  const handleZoneToggle = (zoneId: string) => {
    const newSelection = data.selectedZones.includes(zoneId)
      ? data.selectedZones.filter(id => id !== zoneId)
      : [...data.selectedZones, zoneId];
    onChange({ selectedZones: newSelection });
  };

  const handleRegionToggle = (regionId: string) => {
    const newSelection = data.selectedRegions.includes(regionId)
      ? data.selectedRegions.filter(id => id !== regionId)
      : [...data.selectedRegions, regionId];
    onChange({ selectedRegions: newSelection });
  };

  const handleAreaToggle = (areaId: string) => {
    const newSelection = data.selectedAreas.includes(areaId)
      ? data.selectedAreas.filter(id => id !== areaId)
      : [...data.selectedAreas, areaId];
    onChange({ selectedAreas: newSelection });
  };

  const handleDbPointToggle = (dbPointId: string) => {
    const newSelection = data.selectedDbPoints.includes(dbPointId)
      ? data.selectedDbPoints.filter(id => id !== dbPointId)
      : [...data.selectedDbPoints, dbPointId];
    onChange({ selectedDbPoints: newSelection });
  };

  const handleDistributorToggle = (distributorId: string) => {
    const newSelection = data.selectedDistributors.includes(distributorId)
      ? data.selectedDistributors.filter(id => id !== distributorId)
      : [...data.selectedDistributors, distributorId];
    onChange({ selectedDistributors: newSelection });
  };

  // Select All handlers
  const handleSelectAllZones = () => {
    if (data.selectedZones.length === zones.length) {
      onChange({ selectedZones: [] });
    } else {
      onChange({ selectedZones: zones.map(z => z._id) });
    }
  };

  const handleSelectAllRegions = () => {
    if (data.selectedRegions.length === regions.length) {
      onChange({ selectedRegions: [] });
    } else {
      onChange({ selectedRegions: regions.map(r => r._id) });
    }
  };

  const handleSelectAllAreas = () => {
    if (data.selectedAreas.length === areas.length) {
      onChange({ selectedAreas: [] });
    } else {
      onChange({ selectedAreas: areas.map(a => a._id) });
    }
  };

  const handleSelectAllDbPoints = () => {
    if (data.selectedDbPoints.length === dbPoints.length) {
      onChange({ selectedDbPoints: [] });
    } else {
      onChange({ selectedDbPoints: dbPoints.map(d => d._id) });
    }
  };

  const handleSelectAllDistributors = () => {
    if (data.selectedDistributors.length === distributors.length) {
      onChange({ selectedDistributors: [] });
    } else {
      onChange({ selectedDistributors: distributors.map(d => d._id) });
    }
  };

  // Render territory section with checkboxes
  const renderTerritorySection = (
    title: string,
    items: Territory[],
    selectedItems: string[],
    includeMode: 'include' | 'exclude',
    onToggle: (id: string) => void,
    onIncludeModeChange: (mode: 'include' | 'exclude') => void,
    onSelectAll: () => void,
    isLoading: boolean,
    error?: string
  ) => (
    <Paper sx={{ p: 2, bgcolor: 'grey.50' }}>
      <Typography variant="subtitle2" gutterBottom fontWeight={600}>
        <LocationOnIcon sx={{ fontSize: 18, verticalAlign: 'middle', mr: 0.5 }} />
        {title}
      </Typography>

      {/* Controls Row */}
      <Stack direction="row" spacing={1} sx={{ mb: 2, flexWrap: 'wrap', gap: 1 }}>
        <Chip
          icon={<CheckCircleIcon />}
          label="Include"
          size="small"
          color={includeMode === 'include' ? 'success' : 'default'}
          onClick={() => onIncludeModeChange('include')}
          sx={{ cursor: 'pointer' }}
        />
        <Chip
          icon={<CancelIcon />}
          label="Exclude"
          size="small"
          color={includeMode === 'exclude' ? 'error' : 'default'}
          onClick={() => onIncludeModeChange('exclude')}
          sx={{ cursor: 'pointer' }}
        />
        <Chip
          icon={<SelectAllIcon />}
          label={selectedItems.length === items.length ? "Deselect All" : "Select All"}
          size="small"
          color="primary"
          variant="outlined"
          onClick={onSelectAll}
          disabled={items.length === 0 || isLoading}
          sx={{ cursor: 'pointer' }}
        />
      </Stack>

      {/* Mode Alert */}
      {selectedItems.length > 0 && (
        <Alert severity={includeMode === 'include' ? 'success' : 'warning'} sx={{ mb: 2 }}>
          {includeMode === 'include' 
            ? `Offer will ONLY be available to the ${selectedItems.length} selected ${title.toLowerCase()}.`
            : `Offer will be available to ALL ${title.toLowerCase()} EXCEPT the ${selectedItems.length} selected.`
          }
        </Alert>
      )}

      {/* Error */}
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {/* Loading */}
      {isLoading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
          <CircularProgress size={32} />
        </Box>
      ) : items.length === 0 ? (
        <Typography variant="body2" color="text.secondary" sx={{ py: 2, textAlign: 'center' }}>
          No {title.toLowerCase()} available. Please select parent territories first.
        </Typography>
      ) : (
        <List dense sx={{ maxHeight: 250, overflow: 'auto', bgcolor: 'background.paper', borderRadius: 1 }}>
          {items.map((item) => (
            <ListItem key={item._id} disablePadding>
              <ListItemButton onClick={() => onToggle(item._id)} dense>
                <ListItemIcon sx={{ minWidth: 36 }}>
                  <Checkbox
                    edge="start"
                    checked={selectedItems.includes(item._id)}
                    tabIndex={-1}
                    disableRipple
                  />
                </ListItemIcon>
                <ListItemText 
                  primary={item.name}
                  primaryTypographyProps={{ fontSize: '0.875rem', fontWeight: 500 }}
                />
              </ListItemButton>
            </ListItem>
          ))}
        </List>
      )}
    </Paper>
  );

  // Render distributor section
  const renderDistributorSection = () => (
    <Paper sx={{ p: 2, bgcolor: 'grey.50' }}>
      <Typography variant="subtitle2" gutterBottom fontWeight={600}>
        <StorefrontIcon sx={{ fontSize: 18, verticalAlign: 'middle', mr: 0.5 }} />
        Eligible Distributors
      </Typography>

      {/* Controls Row */}
      <Stack direction="row" spacing={1} sx={{ mb: 2, flexWrap: 'wrap', gap: 1 }}>
        <Chip
          icon={<CheckCircleIcon />}
          label="Include"
          size="small"
          color={data.distributorsIncludeMode === 'include' ? 'success' : 'default'}
          onClick={() => onChange({ distributorsIncludeMode: 'include' })}
          sx={{ cursor: 'pointer' }}
        />
        <Chip
          icon={<CancelIcon />}
          label="Exclude"
          size="small"
          color={data.distributorsIncludeMode === 'exclude' ? 'error' : 'default'}
          onClick={() => onChange({ distributorsIncludeMode: 'exclude' })}
          sx={{ cursor: 'pointer' }}
        />
        <Chip
          icon={<SelectAllIcon />}
          label={data.selectedDistributors.length === distributors.length ? "Deselect All" : "Select All"}
          size="small"
          color="primary"
          variant="outlined"
          onClick={handleSelectAllDistributors}
          disabled={distributors.length === 0 || loading.distributors}
          sx={{ cursor: 'pointer' }}
        />
      </Stack>

      {/* Mode Alert */}
      {data.selectedDistributors.length > 0 && (
        <Alert severity={data.distributorsIncludeMode === 'include' ? 'success' : 'warning'} sx={{ mb: 2 }}>
          {data.distributorsIncludeMode === 'include' 
            ? `Offer will ONLY be available to the ${data.selectedDistributors.length} selected distributors.`
            : `Offer will be available to ALL eligible distributors EXCEPT the ${data.selectedDistributors.length} selected.`
          }
        </Alert>
      )}

      {errors?.selectedDistributors && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {errors.selectedDistributors}
        </Alert>
      )}

      {loading.distributors ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
          <CircularProgress size={32} />
        </Box>
      ) : distributors.length === 0 ? (
        <Typography variant="body2" color="text.secondary" sx={{ py: 2, textAlign: 'center' }}>
          {data.selectedDbPoints.length === 0 
            ? 'Please select DB Points to see eligible distributors.'
            : productSegments.length === 0
            ? 'Please select product segments in Screen 1.'
            : 'No eligible distributors found for selected territories and segments.'
          }
        </Typography>
      ) : (
        <List dense sx={{ maxHeight: 250, overflow: 'auto', bgcolor: 'background.paper', borderRadius: 1 }}>
          {distributors.map((distributor) => (
            <ListItem key={distributor._id} disablePadding>
              <ListItemButton onClick={() => handleDistributorToggle(distributor._id)} dense>
                <ListItemIcon sx={{ minWidth: 36 }}>
                  <Checkbox
                    edge="start"
                    checked={data.selectedDistributors.includes(distributor._id)}
                    tabIndex={-1}
                    disableRipple
                  />
                </ListItemIcon>
                <ListItemText 
                  primary={distributor.name}
                  secondary={`DB Point: ${distributor.db_point_id} • ${distributor.contact_number || distributor.mobile}`}
                  primaryTypographyProps={{ fontSize: '0.875rem' }}
                  secondaryTypographyProps={{ fontSize: '0.75rem' }}
                />
              </ListItemButton>
            </ListItem>
          ))}
        </List>
      )}
    </Paper>
  );

  return (
    <Box sx={{ width: '100%', maxWidth: 1000, mx: 'auto', p: { xs: 2, sm: 3 } }}>
      <Card elevation={2}>
        <CardContent sx={{ p: { xs: 2, sm: 3 } }}>
          <Typography 
            variant="h5" 
            gutterBottom 
            sx={{ 
              fontSize: { xs: '1.25rem', sm: '1.5rem' },
              fontWeight: 600,
              mb: 3 
            }}
          >
            Screen 2: Territory & Distributor Selection
          </Typography>

          {productSegments.length === 0 && (
            <Alert severity="warning" sx={{ mb: 3 }}>
              Please select at least one product segment in Screen 1 to continue.
            </Alert>
          )}

          <Stack spacing={3}>
            {renderTerritorySection(
              'Zones',
              zones,
              data.selectedZones,
              data.zonesIncludeMode,
              handleZoneToggle,
              (mode) => onChange({ zonesIncludeMode: mode }),
              handleSelectAllZones,
              loading.zones,
              errors?.selectedZones
            )}

            {renderTerritorySection(
              'Regions',
              regions,
              data.selectedRegions,
              data.regionsIncludeMode,
              handleRegionToggle,
              (mode) => onChange({ regionsIncludeMode: mode }),
              handleSelectAllRegions,
              loading.regions,
              errors?.selectedRegions
            )}

            {renderTerritorySection(
              'Areas',
              areas,
              data.selectedAreas,
              data.areasIncludeMode,
              handleAreaToggle,
              (mode) => onChange({ areasIncludeMode: mode }),
              handleSelectAllAreas,
              loading.areas,
              errors?.selectedAreas
            )}

            {renderTerritorySection(
              'DB Points',
              dbPoints,
              data.selectedDbPoints,
              data.dbPointsIncludeMode,
              handleDbPointToggle,
              (mode) => onChange({ dbPointsIncludeMode: mode }),
              handleSelectAllDbPoints,
              loading.dbPoints,
              errors?.selectedDbPoints
            )}

            <Divider />

            {renderDistributorSection()}
          </Stack>
        </CardContent>
      </Card>
    </Box>
  );
}
