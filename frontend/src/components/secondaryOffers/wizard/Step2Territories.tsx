"use client";

/**
 * Step 2: Territory Targeting
 * Top-down cascading design following Primary Offers pattern
 * Allows multi-level territory targeting: Zones → Regions → Areas → DB Points
 */

import React, { useState, useEffect } from "react";
import {
  Box,
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
  Divider,
  FormControlLabel,
  Radio,
  RadioGroup,
  Card,
  CardContent,
} from "@mui/material";
import LocationOnIcon from "@mui/icons-material/LocationOn";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import CancelIcon from "@mui/icons-material/Cancel";
import SelectAllIcon from "@mui/icons-material/SelectAll";
import { territoriesApi } from "@/lib/api/offers";
import { SecondaryOfferFormData } from "@/types/secondaryOffer";

interface Step2Props {
  formData: SecondaryOfferFormData;
  onChange: (updates: Partial<SecondaryOfferFormData>) => void;
}

interface Territory {
  _id: string;
  name: string;
  type: string;
  level: number;
}

const Step2Territories: React.FC<Step2Props> = ({ formData, onChange }) => {
  const [zones, setZones] = useState<Territory[]>([]);
  const [regions, setRegions] = useState<Territory[]>([]);
  const [areas, setAreas] = useState<Territory[]>([]);
  const [dbPoints, setDbPoints] = useState<Territory[]>([]);
  const [loading, setLoading] = useState({
    zones: false,
    regions: false,
    areas: false,
    dbPoints: false,
  });

  // Load zones on mount
  useEffect(() => {
    loadZones();
  }, []);

  // Load regions when zones change
  useEffect(() => {
    if (zones.length === 0) return;

    const mode = formData.territories.zones.mode;
    if (mode === "include") {
      if (formData.territories.zones.ids.length > 0) {
        loadRegionsForZones(formData.territories.zones.ids);
      } else {
        setRegions([]);
        setAreas([]);
        setDbPoints([]);
      }
    } else {
      // Exclude mode: load regions for all zones except selected ones
      const zonesToLoad =
        formData.territories.zones.ids.length > 0
          ? zones.filter((z) => !formData.territories.zones.ids.includes(z._id)).map((z) => z._id)
          : zones.map((z) => z._id);

      if (zonesToLoad.length > 0) {
        loadRegionsForZones(zonesToLoad);
      } else {
        setRegions([]);
      }
    }
  }, [formData.territories.zones.ids, formData.territories.zones.mode, zones]);

  // Load areas when regions change
  useEffect(() => {
    if (regions.length === 0 && formData.territories.regions.ids.length === 0) return;

    const mode = formData.territories.regions.mode;
    if (mode === "include") {
      if (formData.territories.regions.ids.length > 0) {
        loadAreasForRegions(formData.territories.regions.ids);
      } else {
        setAreas([]);
        setDbPoints([]);
      }
    } else {
      const regionsToLoad =
        formData.territories.regions.ids.length > 0
          ? regions.filter((r) => !formData.territories.regions.ids.includes(r._id)).map((r) => r._id)
          : regions.map((r) => r._id);

      if (regionsToLoad.length > 0) {
        loadAreasForRegions(regionsToLoad);
      } else {
        setAreas([]);
      }
    }
  }, [formData.territories.regions.ids, formData.territories.regions.mode, regions]);

  // Load db points when areas change
  useEffect(() => {
    if (areas.length === 0 && formData.territories.areas.ids.length === 0) return;

    const mode = formData.territories.areas.mode;
    if (mode === "include") {
      if (formData.territories.areas.ids.length > 0) {
        loadDbPointsForAreas(formData.territories.areas.ids);
      } else {
        setDbPoints([]);
      }
    } else {
      const areasToLoad =
        formData.territories.areas.ids.length > 0
          ? areas.filter((a) => !formData.territories.areas.ids.includes(a._id)).map((a) => a._id)
          : areas.map((a) => a._id);

      if (areasToLoad.length > 0) {
        loadDbPointsForAreas(areasToLoad);
      } else {
        setDbPoints([]);
      }
    }
  }, [formData.territories.areas.ids, formData.territories.areas.mode, areas]);

  const loadZones = async () => {
    setLoading((prev) => ({ ...prev, zones: true }));
    try {
      const zonesData = await territoriesApi.getByType("zone");
      setZones(zonesData);
    } catch (error) {
      console.error("Failed to load zones:", error);
    } finally {
      setLoading((prev) => ({ ...prev, zones: false }));
    }
  };

  const loadRegionsForZones = async (zoneIds: string[]) => {
    setLoading((prev) => ({ ...prev, regions: true }));
    try {
      const allRegions = await territoriesApi.getChildren(zoneIds, "region");
      setRegions(allRegions);
    } catch (error) {
      console.error("Failed to load regions:", error);
    } finally {
      setLoading((prev) => ({ ...prev, regions: false }));
    }
  };

  const loadAreasForRegions = async (regionIds: string[]) => {
    setLoading((prev) => ({ ...prev, areas: true }));
    try {
      const allAreas = await territoriesApi.getChildren(regionIds, "area");
      setAreas(allAreas);
    } catch (error) {
      console.error("Failed to load areas:", error);
    } finally {
      setLoading((prev) => ({ ...prev, areas: false }));
    }
  };

  const loadDbPointsForAreas = async (areaIds: string[]) => {
    setLoading((prev) => ({ ...prev, dbPoints: true }));
    try {
      const allDbPoints = await territoriesApi.getChildren(areaIds, "db_point");
      setDbPoints(allDbPoints);
    } catch (error) {
      console.error("Failed to load db points:", error);
    } finally {
      setLoading((prev) => ({ ...prev, dbPoints: false }));
    }
  };

  const handleZoneToggle = (zoneId: string) => {
    const newIds = formData.territories.zones.ids.includes(zoneId)
      ? formData.territories.zones.ids.filter((id) => id !== zoneId)
      : [...formData.territories.zones.ids, zoneId];

    onChange({
      territories: {
        ...formData.territories,
        zones: {
          ...formData.territories.zones,
          ids: newIds,
        },
      },
    });
  };

  const handleRegionToggle = (regionId: string) => {
    const newIds = formData.territories.regions.ids.includes(regionId)
      ? formData.territories.regions.ids.filter((id) => id !== regionId)
      : [...formData.territories.regions.ids, regionId];

    onChange({
      territories: {
        ...formData.territories,
        regions: {
          ...formData.territories.regions,
          ids: newIds,
        },
      },
    });
  };

  const handleAreaToggle = (areaId: string) => {
    const newIds = formData.territories.areas.ids.includes(areaId)
      ? formData.territories.areas.ids.filter((id) => id !== areaId)
      : [...formData.territories.areas.ids, areaId];

    onChange({
      territories: {
        ...formData.territories,
        areas: {
          ...formData.territories.areas,
          ids: newIds,
        },
      },
    });
  };

  const handleDbPointToggle = (dbPointId: string) => {
    const newIds = formData.territories.db_points.ids.includes(dbPointId)
      ? formData.territories.db_points.ids.filter((id) => id !== dbPointId)
      : [...formData.territories.db_points.ids, dbPointId];

    onChange({
      territories: {
        ...formData.territories,
        db_points: {
          ...formData.territories.db_points,
          ids: newIds,
        },
      },
    });
  };

  const handleSelectAll = (level: "zones" | "regions" | "areas" | "db_points", items: Territory[]) => {
    const currentIds = formData.territories[level].ids;
    const allIds = items.map((item) => item._id);
    const newIds = currentIds.length === allIds.length ? [] : allIds;

    onChange({
      territories: {
        ...formData.territories,
        [level]: {
          ...formData.territories[level],
          ids: newIds,
        },
      },
    });
  };

  const handleModeChange = (level: "zones" | "regions" | "areas" | "db_points", mode: "include" | "exclude") => {
    onChange({
      territories: {
        ...formData.territories,
        [level]: {
          ...formData.territories[level],
          mode,
        },
      },
    });
  };

  const renderTerritorySection = (
    title: string,
    items: Territory[],
    selectedIds: string[],
    mode: "include" | "exclude",
    onToggle: (id: string) => void,
    onModeChange: (mode: "include" | "exclude") => void,
    level: "zones" | "regions" | "areas" | "db_points",
    isLoading: boolean
  ) => {
    return (
      <Box>
        <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
          <Typography variant="subtitle2" fontWeight={600}>
            {title}
          </Typography>
          <Stack direction="row" spacing={1} alignItems="center">
            <Chip
              label={`${selectedIds.length} selected`}
              size="small"
              color={selectedIds.length > 0 ? "primary" : "default"}
            />
            {items.length > 0 && (
              <Chip
                icon={<SelectAllIcon />}
                label={selectedIds.length === items.length ? "Deselect All" : "Select All"}
                size="small"
                onClick={() => handleSelectAll(level, items)}
                clickable
                variant="outlined"
              />
            )}
          </Stack>
        </Stack>

        {selectedIds.length > 0 && (
          <RadioGroup
            row
            value={mode}
            onChange={(e) => onModeChange(e.target.value as "include" | "exclude")}
            sx={{ mb: 2 }}
          >
            <FormControlLabel
              value="include"
              control={<Radio size="small" />}
              label={
                <Stack direction="row" spacing={0.5} alignItems="center">
                  <CheckCircleIcon fontSize="small" color="success" />
                  <Typography variant="body2">Include</Typography>
                </Stack>
              }
            />
            <FormControlLabel
              value="exclude"
              control={<Radio size="small" />}
              label={
                <Stack direction="row" spacing={0.5} alignItems="center">
                  <CancelIcon fontSize="small" color="error" />
                  <Typography variant="body2">Exclude</Typography>
                </Stack>
              }
            />
          </RadioGroup>
        )}

        {isLoading ? (
          <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
            <CircularProgress size={32} />
          </Box>
        ) : items.length > 0 ? (
          <List sx={{ maxHeight: 300, overflow: "auto", bgcolor: "background.paper", borderRadius: 1 }}>
            {items.map((item) => (
              <ListItem key={item._id} dense disablePadding>
                <ListItemButton onClick={() => onToggle(item._id)} role={undefined} dense>
                  <ListItemIcon sx={{ minWidth: 36 }}>
                    <Checkbox
                      edge="start"
                      checked={selectedIds.includes(item._id)}
                      tabIndex={-1}
                      disableRipple
                    />
                  </ListItemIcon>
                  <ListItemText
                    primary={
                      <Stack direction="row" spacing={1} alignItems="center">
                        <LocationOnIcon fontSize="small" color="action" />
                        <Typography variant="body2">{item.name}</Typography>
                      </Stack>
                    }
                  />
                </ListItemButton>
              </ListItem>
            ))}
          </List>
        ) : (
          <Alert severity="info" sx={{ mt: 1 }}>
            {level === "zones" ? "No zones available" : "Select parent territories first"}
          </Alert>
        )}
      </Box>
    );
  };

  return (
    <Box>
      <Typography variant="h6" gutterBottom sx={{ mb: 1 }}>
        Territory Targeting
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Select territories to target. Leave empty to include all territories.
      </Typography>

      <Alert severity="info" sx={{ mb: 3 }}>
        Territories filter the outlets geographically. Outlets will be selected from the territories you choose here.
      </Alert>

      <Card variant="outlined">
        <CardContent>
          <Stack spacing={3} divider={<Divider />}>
            {renderTerritorySection(
              "Zones",
              zones,
              formData.territories.zones.ids,
              formData.territories.zones.mode,
              handleZoneToggle,
              (mode) => handleModeChange("zones", mode),
              "zones",
              loading.zones
            )}

            {renderTerritorySection(
              "Regions",
              regions,
              formData.territories.regions.ids,
              formData.territories.regions.mode,
              handleRegionToggle,
              (mode) => handleModeChange("regions", mode),
              "regions",
              loading.regions
            )}

            {renderTerritorySection(
              "Areas",
              areas,
              formData.territories.areas.ids,
              formData.territories.areas.mode,
              handleAreaToggle,
              (mode) => handleModeChange("areas", mode),
              "areas",
              loading.areas
            )}

            {renderTerritorySection(
              "DB Points",
              dbPoints,
              formData.territories.db_points.ids,
              formData.territories.db_points.mode,
              handleDbPointToggle,
              (mode) => handleModeChange("db_points", mode),
              "db_points",
              loading.dbPoints
            )}
          </Stack>
        </CardContent>
      </Card>
    </Box>
  );
};

export default Step2Territories;
