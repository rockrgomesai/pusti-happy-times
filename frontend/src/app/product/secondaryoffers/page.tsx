"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Container,
  Grid,
  IconButton,
  Typography,
  TextField,
  InputAdornment,
  MenuItem,
  Stack,
  Tooltip,
  CircularProgress,
  Alert,
} from "@mui/material";
import {
  Add as AddIcon,
  Search as SearchIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Visibility as ViewIcon,
  PlayArrow as ActivateIcon,
  Pause as PauseIcon,
  FilterList as FilterIcon,
} from "@mui/icons-material";
import { getSecondaryOffers, toggleSecondaryOfferStatus, deleteSecondaryOffer } from "@/lib/api/secondaryOffers";
import {
  SecondaryOffer,
  OfferStatus,
  STATUS_COLORS,
  OFFER_TYPE_LABELS,
} from "@/types/secondaryOffer";
import { format } from "date-fns";

const SecondaryOffersPage = () => {
  const router = useRouter();
  const [offers, setOffers] = useState<SecondaryOffer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<OfferStatus | "">("");
  const [activeFilter, setActiveFilter] = useState<string>("");

  useEffect(() => {
    loadOffers();
  }, [statusFilter, activeFilter]);

  const loadOffers = async () => {
    try {
      setLoading(true);
      setError(null);
      const filters: any = { search: searchTerm };
      if (statusFilter) filters.status = statusFilter;
      if (activeFilter !== "") filters.active = activeFilter === "true";

      const response = await getSecondaryOffers(filters);
      setOffers(response.data);
    } catch (err: any) {
      console.error("Error loading secondary offers:", err);
      setError(err.response?.data?.message || "Failed to load secondary offers");
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = () => {
    loadOffers();
  };

  const handleToggleStatus = async (offerId: string, currentActive: boolean) => {
    try {
      await toggleSecondaryOfferStatus(offerId, !currentActive);
      loadOffers();
    } catch (err: any) {
      console.error("Error toggling offer status:", err);
      setError(err.response?.data?.message || "Failed to toggle status");
    }
  };

  const handleDelete = async (offerId: string) => {
    if (!window.confirm("Are you sure you want to delete this offer?")) return;

    try {
      await deleteSecondaryOffer(offerId);
      loadOffers();
    } catch (err: any) {
      console.error("Error deleting offer:", err);
      setError(err.response?.data?.message || "Failed to delete offer");
    }
  };

  const handleEdit = (offerId: string) => {
    router.push(`/product/secondaryoffers/${offerId}/edit`);
  };

  const handleView = (offerId: string) => {
    router.push(`/product/secondaryoffers/${offerId}`);
  };

  const handleCreate = () => {
    router.push("/product/secondaryoffers/create");
  };

  const filteredOffers = offers.filter((offer) =>
    offer.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <Container maxWidth="xl" sx={{ py: { xs: 2, sm: 3 } }}>
      {/* Header - Mobile First */}
      <Box sx={{ mb: 3 }}>
        <Stack
          direction={{ xs: "column", sm: "row" }}
          justifyContent="space-between"
          alignItems={{ xs: "stretch", sm: "center" }}
          spacing={2}
        >
          <Typography variant="h4" component="h1" sx={{ fontSize: { xs: "1.5rem", sm: "2rem" } }}>
            Secondary Offers
          </Typography>
          <Button
            variant="contained"
            color="primary"
            startIcon={<AddIcon />}
            onClick={handleCreate}
            fullWidth={false}
            sx={{ minWidth: { xs: "100%", sm: "auto" } }}
          >
            Create Offer
          </Button>
        </Stack>
      </Box>

      {/* Error Display */}
      {error && (
        <Alert severity="error" onClose={() => setError(null)} sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {/* Filters - Mobile First Stack Layout */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Grid container spacing={2}>
            {/* Search */}
            <Grid item xs={12} sm={6} md={3}>
              <TextField
                fullWidth
                size="small"
                placeholder="Search offers..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyPress={(e) => e.key === "Enter" && handleSearch()}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon />
                    </InputAdornment>
                  ),
                }}
              />
            </Grid>

            {/* Status Filter */}
            <Grid item xs={12} sm={6} md={3}>
              <TextField
                fullWidth
                size="small"
                select
                variant="outlined"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as OfferStatus | "")}
                SelectProps={{
                  displayEmpty: true,
                  renderValue: (value: any) => {
                    if (!value) return "All Statuses";
                    return value;
                  },
                }}
              >
                <MenuItem value="">All Statuses</MenuItem>
                <MenuItem value="Draft">Draft</MenuItem>
                <MenuItem value="Active">Active</MenuItem>
                <MenuItem value="Paused">Paused</MenuItem>
                <MenuItem value="Expired">Expired</MenuItem>
                <MenuItem value="Completed">Completed</MenuItem>
              </TextField>
            </Grid>

            {/* Active Filter */}
            <Grid item xs={12} sm={6} md={3}>
              <TextField
                fullWidth
                size="small"
                select
                variant="outlined"
                value={activeFilter}
                onChange={(e) => setActiveFilter(e.target.value)}
                SelectProps={{
                  displayEmpty: true,
                  renderValue: (value: any) => {
                    if (!value) return "All";
                    if (value === "true") return "Active";
                    if (value === "false") return "Inactive";
                    return value;
                  },
                }}
              >
                <MenuItem value="">All</MenuItem>
                <MenuItem value="true">Active</MenuItem>
                <MenuItem value="false">Inactive</MenuItem>
              </TextField>
            </Grid>

            {/* Search Button */}
            <Grid item xs={12} sm={6} md={3}>
              <Button
                fullWidth
                variant="contained"
                onClick={handleSearch}
                startIcon={<FilterIcon />}
                sx={{ height: "100%" }}
              >
                Filter
              </Button>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Loading State */}
      {loading && (
        <Box sx={{ display: "flex", justifyContent: "center", py: 8 }}>
          <CircularProgress />
        </Box>
      )}

      {/* Offers List - Mobile First Cards */}
      {!loading && filteredOffers.length === 0 && (
        <Card>
          <CardContent>
            <Typography variant="body1" color="text.secondary" align="center">
              No secondary offers found. Create your first offer to get started.
            </Typography>
          </CardContent>
        </Card>
      )}

      {!loading && filteredOffers.length > 0 && (
        <Grid container spacing={2}>
          {filteredOffers.map((offer) => (
            <Grid item xs={12} key={offer._id}>
              <Card
                sx={{
                  "&:hover": {
                    boxShadow: 4,
                    transition: "box-shadow 0.3s",
                  },
                }}
              >
                <CardContent>
                  {/* Mobile Layout */}
                  <Box sx={{ display: { xs: "block", md: "none" } }}>
                    {/* Title & Status */}
                    <Stack direction="row" justifyContent="space-between" alignItems="flex-start" sx={{ mb: 2 }}>
                      <Box sx={{ flex: 1, mr: 1 }}>
                        <Typography variant="h6" sx={{ fontSize: "1rem", fontWeight: 600, mb: 0.5 }}>
                          {offer.name}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {OFFER_TYPE_LABELS[offer.offer_type]}
                        </Typography>
                      </Box>
                      <Stack spacing={0.5}>
                        <Chip
                          label={offer.status}
                          color={STATUS_COLORS[offer.status] as any}
                          size="small"
                        />
                        {offer.active && <Chip label="Active" color="success" size="small" variant="outlined" />}
                      </Stack>
                    </Stack>

                    {/* Details */}
                    <Stack spacing={1} sx={{ mb: 2 }}>
                      <Box>
                        <Typography variant="caption" color="text.secondary">
                          Period
                        </Typography>
                        <Typography variant="body2">
                          {format(new Date(offer.start_date), "dd MMM yyyy")} -{" "}
                          {format(new Date(offer.end_date), "dd MMM yyyy")}
                        </Typography>
                      </Box>
                      <Box>
                        <Typography variant="caption" color="text.secondary">
                          Segments
                        </Typography>
                        <Box sx={{ mt: 0.5 }}>
                          {offer.product_segments.map((seg) => (
                            <Chip key={seg} label={seg} size="small" sx={{ mr: 0.5 }} />
                          ))}
                        </Box>
                      </Box>
                      <Box>
                        <Typography variant="caption" color="text.secondary">
                          Outlets
                        </Typography>
                        <Typography variant="body2" fontWeight={500}>
                          {offer.resolvedOutlets?.length || 0} outlets targeted
                        </Typography>
                      </Box>
                    </Stack>

                    {/* Actions */}
                    <Stack direction="row" spacing={1} justifyContent="flex-end">
                      <Tooltip title="View">
                        <IconButton size="small" onClick={() => handleView(offer._id)}>
                          <ViewIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Edit">
                        <IconButton size="small" onClick={() => handleEdit(offer._id)}>
                          <EditIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title={offer.active ? "Pause" : "Activate"}>
                        <IconButton
                          size="small"
                          onClick={() => handleToggleStatus(offer._id, offer.active)}
                          color={offer.active ? "warning" : "success"}
                        >
                          {offer.active ? <PauseIcon fontSize="small" /> : <ActivateIcon fontSize="small" />}
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Delete">
                        <IconButton size="small" onClick={() => handleDelete(offer._id)} color="error">
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </Stack>
                  </Box>

                  {/* Desktop Layout */}
                  <Box sx={{ display: { xs: "none", md: "block" } }}>
                    <Grid container spacing={2} alignItems="center">
                      {/* Name & Type */}
                      <Grid item xs={12} md={3}>
                        <Typography variant="h6" sx={{ fontSize: "1rem", fontWeight: 600, mb: 0.5 }}>
                          {offer.name}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {OFFER_TYPE_LABELS[offer.offer_type]}
                        </Typography>
                      </Grid>

                      {/* Period */}
                      <Grid item xs={12} md={2}>
                        <Typography variant="caption" color="text.secondary" display="block">
                          Period
                        </Typography>
                        <Typography variant="body2">
                          {format(new Date(offer.start_date), "dd MMM yy")} -{" "}
                          {format(new Date(offer.end_date), "dd MMM yy")}
                        </Typography>
                      </Grid>

                      {/* Segments */}
                      <Grid item xs={12} md={2}>
                        <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 0.5 }}>
                          Segments
                        </Typography>
                        {offer.product_segments.map((seg) => (
                          <Chip key={seg} label={seg} size="small" sx={{ mr: 0.5 }} />
                        ))}
                      </Grid>

                      {/* Outlets */}
                      <Grid item xs={12} md={1}>
                        <Typography variant="caption" color="text.secondary" display="block">
                          Outlets
                        </Typography>
                        <Typography variant="body2" fontWeight={500}>
                          {offer.resolvedOutlets?.length || 0}
                        </Typography>
                      </Grid>

                      {/* Status */}
                      <Grid item xs={12} md={2}>
                        <Stack spacing={0.5}>
                          <Chip
                            label={offer.status}
                            color={STATUS_COLORS[offer.status] as any}
                            size="small"
                          />
                          {offer.active && (
                            <Chip label="Active" color="success" size="small" variant="outlined" />
                          )}
                        </Stack>
                      </Grid>

                      {/* Actions */}
                      <Grid item xs={12} md={2}>
                        <Stack direction="row" spacing={1} justifyContent="flex-end">
                          <Tooltip title="View">
                            <IconButton size="small" onClick={() => handleView(offer._id)}>
                              <ViewIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Edit">
                            <IconButton size="small" onClick={() => handleEdit(offer._id)}>
                              <EditIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title={offer.active ? "Pause" : "Activate"}>
                            <IconButton
                              size="small"
                              onClick={() => handleToggleStatus(offer._id, offer.active)}
                              color={offer.active ? "warning" : "success"}
                            >
                              {offer.active ? (
                                <PauseIcon fontSize="small" />
                              ) : (
                                <ActivateIcon fontSize="small" />
                              )}
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Delete">
                            <IconButton size="small" onClick={() => handleDelete(offer._id)} color="error">
                              <DeleteIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        </Stack>
                      </Grid>
                    </Grid>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      {/* Summary Footer */}
      {!loading && filteredOffers.length > 0 && (
        <Box sx={{ mt: 3, textAlign: "center" }}>
          <Typography variant="body2" color="text.secondary">
            Showing {filteredOffers.length} offer{filteredOffers.length !== 1 ? "s" : ""}
          </Typography>
        </Box>
      )}
    </Container>
  );
};

export default SecondaryOffersPage;

