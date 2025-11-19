'use client';

import React, { useState, useEffect, useImperativeHandle, forwardRef } from 'react';
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

export interface Screen2Handle {
  performAutoCascade: () => Promise<void>;
}

const Screen2TerritoryDistributor = forwardRef<Screen2Handle, Screen2Props>(({ 
  data, 
  productSegments,
  onChange, 
  errors 
}, ref) => {
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
    distributors: false,
    cascading: false
  });

  // Load zones on mount
  useEffect(() => {
    loadZones();
  }, []);

  // Load regions when zones change OR when zones mode changes
  useEffect(() => {
    if (zones.length === 0) return; // Wait for zones to load first

    if (data.zonesIncludeMode === 'include') {
      // Include mode: load regions only for selected zones
      if (data.selectedZones.length > 0) {
        loadRegionsForZones(data.selectedZones);
      } else {
        setRegions([]);
        // Clear child selections if there are no zones selected
        if (data.selectedRegions.length > 0 || data.selectedAreas.length > 0 || data.selectedDbPoints.length > 0 || data.selectedDistributors.length > 0) {
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
      }
    } else {
      // Exclude mode: load regions for all zones EXCEPT selected ones
      const zonesToLoad = data.selectedZones.length > 0
        ? zones.filter(z => !data.selectedZones.includes(z._id)).map(z => z._id)
        : zones.map(z => z._id); // If nothing selected, load all
      
      if (zonesToLoad.length > 0) {
        loadRegionsForZones(zonesToLoad);
      } else {
        setRegions([]);
      }
    }
  }, [data.selectedZones, data.zonesIncludeMode, zones]);

  // Load areas when regions change OR when regions mode changes
  useEffect(() => {
    if (regions.length === 0 && data.selectedRegions.length === 0) return;

    if (data.regionsIncludeMode === 'include') {
      // Include mode: load areas only for selected regions
      if (data.selectedRegions.length > 0) {
        loadAreasForRegions(data.selectedRegions);
      } else {
        setAreas([]);
        // Clear child selections if there are items to clear
        if (data.selectedAreas.length > 0 || data.selectedDbPoints.length > 0 || data.selectedDistributors.length > 0) {
          setDbPoints([]);
          setDistributors([]);
          onChange({ 
            selectedAreas: [], 
            selectedDbPoints: [],
            selectedDistributors: []
          });
        }
      }
    } else {
      // Exclude mode: load areas for all regions EXCEPT selected ones
      const regionsToLoad = data.selectedRegions.length > 0
        ? regions.filter(r => !data.selectedRegions.includes(r._id)).map(r => r._id)
        : regions.map(r => r._id);
      
      if (regionsToLoad.length > 0) {
        loadAreasForRegions(regionsToLoad);
      } else {
        setAreas([]);
      }
    }
  }, [data.selectedRegions, data.regionsIncludeMode, regions]);

  // Load db points when areas change OR when areas mode changes
  useEffect(() => {
    if (areas.length === 0 && data.selectedAreas.length === 0) return;

    if (data.areasIncludeMode === 'include') {
      // Include mode: load db points only for selected areas
      if (data.selectedAreas.length > 0) {
        loadDbPointsForAreas(data.selectedAreas);
      } else {
        setDbPoints([]);
        // Clear child selections if there are items to clear
        if (data.selectedDbPoints.length > 0 || data.selectedDistributors.length > 0) {
          setDistributors([]);
          onChange({ 
            selectedDbPoints: [],
            selectedDistributors: []
          });
        }
      }
    } else {
      // Exclude mode: load db points for all areas EXCEPT selected ones
      const areasToLoad = data.selectedAreas.length > 0
        ? areas.filter(a => !data.selectedAreas.includes(a._id)).map(a => a._id)
        : areas.map(a => a._id);
      
      if (areasToLoad.length > 0) {
        loadDbPointsForAreas(areasToLoad);
      } else {
        setDbPoints([]);
      }
    }
  }, [data.selectedAreas, data.areasIncludeMode, areas]);

  // Load distributors when db points change OR when db points mode changes
  useEffect(() => {
    if (dbPoints.length === 0 && data.selectedDbPoints.length === 0) return;
    if (productSegments.length === 0) return;

    if (data.dbPointsIncludeMode === 'include') {
      // Include mode: load distributors only for selected db points
      if (data.selectedDbPoints.length > 0) {
        loadDistributors(data.selectedDbPoints, productSegments);
      } else {
        setDistributors([]);
        onChange({ selectedDistributors: [] });
      }
    } else {
      // Exclude mode: load distributors for all db points EXCEPT selected ones
      const dbPointsToLoad = data.selectedDbPoints.length > 0
        ? dbPoints.filter(d => !data.selectedDbPoints.includes(d._id)).map(d => d._id)
        : dbPoints.map(d => d._id);
      
      if (dbPointsToLoad.length > 0) {
        loadDistributors(dbPointsToLoad, productSegments);
      } else {
        setDistributors([]);
      }
    }
  }, [data.selectedDbPoints, data.dbPointsIncludeMode, dbPoints, productSegments]);

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

  /**
   * AUTO-CASCADE TERRITORY SELECTION
   * Automatically selects all descendants from the highest selected level
   * Performance optimized with single bulk API call
   */
  const performAutoCascade = async (): Promise<void> => {
    setLoading(prev => ({ ...prev, cascading: true }));
    
    try {
      let parentIds: string[] = [];
      let startLevel = 0;
      let cascadeFrom: 'zones' | 'regions' | 'areas' | 'db_points' | null = null;

      // Determine the highest level where user made a selection
      if (data.selectedZones.length > 0) {
        cascadeFrom = 'zones';
        parentIds = data.selectedZones;
        startLevel = 0; // Zone level
      } else if (data.selectedRegions.length > 0) {
        cascadeFrom = 'regions';
        parentIds = data.selectedRegions;
        startLevel = 1; // Region level
      } else if (data.selectedAreas.length > 0) {
        cascadeFrom = 'areas';
        parentIds = data.selectedAreas;
        startLevel = 2; // Area level
      } else if (data.selectedDbPoints.length > 0) {
        cascadeFrom = 'db_points';
        parentIds = data.selectedDbPoints;
        startLevel = 3; // DB Point level
      }

      // If no selection at any level, nothing to cascade
      if (!cascadeFrom || parentIds.length === 0) {
        return;
      }

      console.log(`Auto-cascading from ${cascadeFrom}, ${parentIds.length} parent(s)`);

      // PERFORMANCE: Single bulk API call to get ALL descendants
      const descendants = await territoriesApi.getDescendants(parentIds, startLevel);
      
      const updates: Partial<Screen2Props['data']> = {};

      // Auto-select based on include/exclude mode
      if (cascadeFrom === 'zones') {
        // Cascade: zones → regions → areas → db_points → distributors
        
        if (data.zonesIncludeMode === 'include') {
          // Include mode: select all descendants
          updates.selectedRegions = descendants.grouped.regions.map(r => r._id);
          updates.selectedAreas = descendants.grouped.areas.map(a => a._id);
          updates.selectedDbPoints = descendants.grouped.db_points.map(d => d._id);
        } else {
          // Exclude mode: select all EXCEPT the excluded zones' descendants
          // Get all territories and filter out the descendants
          const allTerritories = await territoriesApi.getAll();
          const excludedIds = new Set([...parentIds, ...descendants.all.map(t => t._id)]);
          
          updates.selectedRegions = allTerritories
            .filter(t => t.type === 'region' && !excludedIds.has(t._id))
            .map(t => t._id);
          updates.selectedAreas = allTerritories
            .filter(t => t.type === 'area' && !excludedIds.has(t._id))
            .map(t => t._id);
          updates.selectedDbPoints = allTerritories
            .filter(t => t.type === 'db_point' && !excludedIds.has(t._id))
            .map(t => t._id);
        }
      } else if (cascadeFrom === 'regions') {
        // Cascade: regions → areas → db_points → distributors
        
        if (data.regionsIncludeMode === 'include') {
          updates.selectedAreas = descendants.grouped.areas.map(a => a._id);
          updates.selectedDbPoints = descendants.grouped.db_points.map(d => d._id);
        } else {
          const allTerritories = await territoriesApi.getAll();
          const excludedIds = new Set([...parentIds, ...descendants.all.map(t => t._id)]);
          
          updates.selectedAreas = allTerritories
            .filter(t => t.type === 'area' && !excludedIds.has(t._id))
            .map(t => t._id);
          updates.selectedDbPoints = allTerritories
            .filter(t => t.type === 'db_point' && !excludedIds.has(t._id))
            .map(t => t._id);
        }
      } else if (cascadeFrom === 'areas') {
        // Cascade: areas → db_points → distributors
        
        if (data.areasIncludeMode === 'include') {
          updates.selectedDbPoints = descendants.grouped.db_points.map(d => d._id);
        } else {
          const allTerritories = await territoriesApi.getAll();
          const excludedIds = new Set([...parentIds, ...descendants.all.map(t => t._id)]);
          
          updates.selectedDbPoints = allTerritories
            .filter(t => t.type === 'db_point' && !excludedIds.has(t._id))
            .map(t => t._id);
        }
      }

      // NEW BEHAVIOR: Do NOT auto-cascade to distributors
      // Distributors will be populated in the dropdown but NOT auto-selected
      // This allows users to manually select specific distributors if needed
      // If no distributors are selected, the offer applies to ALL distributors under selected db_points

      // Apply all updates at once
      if (Object.keys(updates).length > 0) {
        onChange(updates);
        console.log(`Auto-cascade complete:`, {
          regions: updates.selectedRegions?.length || 0,
          areas: updates.selectedAreas?.length || 0,
          db_points: updates.selectedDbPoints?.length || 0,
          distributors: updates.selectedDistributors?.length || 0,
        });
      }
    } catch (error) {
      console.error('Auto-cascade failed:', error);
      throw error; // Re-throw so parent can handle
    } finally {
      setLoading(prev => ({ ...prev, cascading: false }));
    }
  };

  // Expose the auto-cascade function to parent component via ref
  useImperativeHandle(ref, () => ({
    performAutoCascade
  }));

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

      {/* Info Alert */}
      {distributors.length > 0 && data.selectedDistributors.length === 0 && (
        <Alert severity="info" sx={{ mb: 2 }}>
          No distributors selected. Offer will apply to <strong>ALL {distributors.length} eligible distributors</strong> under the selected DB Points.
        </Alert>
      )}

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
});

// Display name for debugging
Screen2TerritoryDistributor.displayName = 'Screen2TerritoryDistributor';

export default Screen2TerritoryDistributor;
