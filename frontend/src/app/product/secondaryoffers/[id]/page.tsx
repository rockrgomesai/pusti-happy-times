"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  Container,
  Paper,
  Box,
  Typography,
  Grid,
  Chip,
  CircularProgress,
  Alert,
  Button,
  Card,
  CardContent,
  Divider,
  List,
  ListItem,
  ListItemText,
  Stack,
} from "@mui/material";
import {
  ArrowBack,
  Edit,
  CalendarToday,
  Category,
  Store,
  LocationOn,
  Description,
  Inventory,
} from "@mui/icons-material";
import { format } from "date-fns";
import { getSecondaryOfferById } from "@/lib/api/secondaryOffers";
import { SecondaryOffer, OFFER_TYPE_LABELS, STATUS_COLORS } from "@/types/secondaryOffer";

export default function ViewSecondaryOfferPage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;

  const [offer, setOffer] = useState<SecondaryOffer | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadOffer = async () => {
      if (!id) return;

      setLoading(true);
      setError(null);
      try {
        const response = await getSecondaryOfferById(id);
        setOffer(response.data);
      } catch (err: any) {
        setError(err.response?.data?.message || "Failed to load offer");
      } finally {
        setLoading(false);
      }
    };

    loadOffer();
  }, [id]);

  if (loading) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: 400 }}>
          <CircularProgress />
        </Box>
      </Container>
    );
  }

  if (error || !offer) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Alert severity="error">{error || "Offer not found"}</Alert>
        <Button
          startIcon={<ArrowBack />}
          onClick={() => router.push("/product/secondaryoffers")}
          sx={{ mt: 2 }}
        >
          Back to List
        </Button>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Paper sx={{ p: { xs: 2, md: 4 } }}>
        {/* Header */}
        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", mb: 3, flexWrap: "wrap", gap: 2 }}>
          <Box>
            <Typography variant="h4" gutterBottom>
              {offer.name}
            </Typography>
            <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
              <Chip
                label={OFFER_TYPE_LABELS[offer.offer_type]}
                color="primary"
                size="small"
              />
              <Chip
                label={offer.status}
                color={STATUS_COLORS[offer.status] || "default"}
                size="small"
              />
              <Chip
                label={offer.active ? "Active" : "Inactive"}
                color={offer.active ? "success" : "default"}
                size="small"
              />
              <Chip
                label="Distributor Stock"
                color="info"
                size="small"
                icon={<Inventory />}
              />
            </Stack>
          </Box>
          <Stack direction="row" spacing={2}>
            <Button
              variant="outlined"
              startIcon={<Edit />}
              onClick={() => router.push(`/product/secondaryoffers/${id}/edit`)}
            >
              Edit
            </Button>
            <Button
              variant="outlined"
              startIcon={<ArrowBack />}
              onClick={() => router.push("/product/secondaryoffers")}
            >
              Back
            </Button>
          </Stack>
        </Box>

        <Grid container spacing={3}>
          {/* Basic Information */}
          <Grid item xs={12} md={6}>
            <Card variant="outlined">
              <CardContent>
                <Typography variant="h6" gutterBottom sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                  <CalendarToday fontSize="small" />
                  Basic Information
                </Typography>
                <Divider sx={{ my: 2 }} />
                <List dense>
                  <ListItem>
                    <ListItemText
                      primary="Offer Type"
                      secondary={OFFER_TYPE_LABELS[offer.offer_type]}
                    />
                  </ListItem>
                  <ListItem>
                    <ListItemText
                      primary="Product Segments"
                      secondary={offer.product_segments.join(", ") || "N/A"}
                    />
                  </ListItem>
                  <ListItem>
                    <ListItemText
                      primary="Start Date"
                      secondary={format(new Date(offer.start_date), "PPP")}
                    />
                  </ListItem>
                  <ListItem>
                    <ListItemText
                      primary="End Date"
                      secondary={
                        offer.end_date
                          ? format(new Date(offer.end_date), "PPP")
                          : "No end date"
                      }
                    />
                  </ListItem>
                  {offer.description && (
                    <ListItem>
                      <ListItemText
                        primary="Description"
                        secondary={offer.description}
                      />
                    </ListItem>
                  )}
                </List>
              </CardContent>
            </Card>
          </Grid>

          {/* Targeting Summary */}
          <Grid item xs={12} md={6}>
            <Card variant="outlined">
              <CardContent>
                <Typography variant="h6" gutterBottom sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                  <LocationOn fontSize="small" />
                  Targeting Summary
                </Typography>
                <Divider sx={{ my: 2 }} />
                <List dense>
                  <ListItem>
                    <ListItemText
                      primary="Target Outlets"
                      secondary={
                        offer.resolvedOutlets
                          ? `${offer.resolvedOutlets.length.toLocaleString()} outlets`
                          : "Not calculated"
                      }
                    />
                  </ListItem>
                  <ListItem>
                    <ListItemText
                      primary="Distributors"
                      secondary={
                        offer.targeting?.distributors?.length
                          ? `${offer.targeting.distributors.length} selected (${offer.targeting.distributor_mode || "include"})`
                          : "All distributors"
                      }
                    />
                  </ListItem>
                  <ListItem>
                    <ListItemText
                      primary="Routes"
                      secondary={
                        offer.targeting?.apply_to_all_routes
                          ? "All routes"
                          : offer.targeting?.routes?.length
                          ? `${offer.targeting.routes.length} selected (${offer.targeting.route_mode || "include"})`
                          : "Not specified"
                      }
                    />
                  </ListItem>
                  <ListItem>
                    <ListItemText
                      primary="Outlet Selection"
                      secondary={
                        offer.outlets?.selection_mode === "all"
                          ? "All outlets"
                          : offer.outlets?.selection_mode === "specific"
                          ? `${offer.outlets.specific_outlets?.length || 0} specific outlets`
                          : "Filtered outlets"
                      }
                    />
                  </ListItem>
                </List>
              </CardContent>
            </Card>
          </Grid>

          {/* Territories */}
          {(offer.territories?.zones?.length ||
            offer.territories?.regions?.length ||
            offer.territories?.areas?.length ||
            offer.territories?.db_points?.length) && (
            <Grid item xs={12}>
              <Card variant="outlined">
                <CardContent>
                  <Typography variant="h6" gutterBottom sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                    <LocationOn fontSize="small" />
                    Territories
                  </Typography>
                  <Divider sx={{ my: 2 }} />
                  <Grid container spacing={2}>
                    {offer.territories.zones && offer.territories.zones.length > 0 && (
                      <Grid item xs={12} sm={6}>
                        <Typography variant="subtitle2" gutterBottom>
                          Zones ({offer.territories.zone_mode || "include"})
                        </Typography>
                        <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5 }}>
                          {offer.territories.zones.map((zone: any) => (
                            <Chip
                              key={zone._id || zone}
                              label={zone.name || zone}
                              size="small"
                            />
                          ))}
                        </Box>
                      </Grid>
                    )}
                    {offer.territories.regions && offer.territories.regions.length > 0 && (
                      <Grid item xs={12} sm={6}>
                        <Typography variant="subtitle2" gutterBottom>
                          Regions ({offer.territories.region_mode || "include"})
                        </Typography>
                        <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5 }}>
                          {offer.territories.regions.map((region: any) => (
                            <Chip
                              key={region._id || region}
                              label={region.name || region}
                              size="small"
                            />
                          ))}
                        </Box>
                      </Grid>
                    )}
                    {offer.territories.areas && offer.territories.areas.length > 0 && (
                      <Grid item xs={12} sm={6}>
                        <Typography variant="subtitle2" gutterBottom>
                          Areas ({offer.territories.area_mode || "include"})
                        </Typography>
                        <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5 }}>
                          {offer.territories.areas.map((area: any) => (
                            <Chip
                              key={area._id || area}
                              label={area.name || area}
                              size="small"
                            />
                          ))}
                        </Box>
                      </Grid>
                    )}
                    {offer.territories.db_points && offer.territories.db_points.length > 0 && (
                      <Grid item xs={12} sm={6}>
                        <Typography variant="subtitle2" gutterBottom>
                          DB Points ({offer.territories.db_point_mode || "include"})
                        </Typography>
                        <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5 }}>
                          {offer.territories.db_points.map((dbPoint: any) => (
                            <Chip
                              key={dbPoint._id || dbPoint}
                              label={dbPoint.name || dbPoint}
                              size="small"
                            />
                          ))}
                        </Box>
                      </Grid>
                    )}
                  </Grid>
                </CardContent>
              </Card>
            </Grid>
          )}

          {/* Offer Configuration */}
          <Grid item xs={12}>
            <Card variant="outlined">
              <CardContent>
                <Typography variant="h6" gutterBottom sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                  <Category fontSize="small" />
                  Offer Configuration
                </Typography>
                <Divider sx={{ my: 2 }} />
                <List dense>
                  {offer.offer_config?.selected_products && (
                    <ListItem>
                      <ListItemText
                        primary="Selected Products"
                        secondary={`${offer.offer_config.selected_products.length} products`}
                      />
                    </ListItem>
                  )}
                  {offer.offer_config?.discount_percentage !== undefined && (
                    <ListItem>
                      <ListItemText
                        primary="Discount Percentage"
                        secondary={`${offer.offer_config.discount_percentage}%`}
                      />
                    </ListItem>
                  )}
                  {offer.offer_config?.discount_amount !== undefined && (
                    <ListItem>
                      <ListItemText
                        primary="Discount Amount"
                        secondary={`৳${offer.offer_config.discount_amount}`}
                      />
                    </ListItem>
                  )}
                  {offer.offer_config?.max_discount_amount !== undefined && (
                    <ListItem>
                      <ListItemText
                        primary="Max Discount Amount"
                        secondary={`৳${offer.offer_config.max_discount_amount}`}
                      />
                    </ListItem>
                  )}
                  {offer.offer_config?.buy_quantity !== undefined && (
                    <ListItem>
                      <ListItemText
                        primary="Buy Quantity"
                        secondary={offer.offer_config.buy_quantity}
                      />
                    </ListItem>
                  )}
                  {offer.offer_config?.get_quantity !== undefined && (
                    <ListItem>
                      <ListItemText
                        primary="Get Quantity (Free)"
                        secondary={offer.offer_config.get_quantity}
                      />
                    </ListItem>
                  )}
                  {offer.offer_config?.bundle_price !== undefined && (
                    <ListItem>
                      <ListItemText
                        primary="Bundle Price"
                        secondary={`৳${offer.offer_config.bundle_price}`}
                      />
                    </ListItem>
                  )}
                  {offer.offer_config?.cashback_percentage !== undefined && (
                    <ListItem>
                      <ListItemText
                        primary="Cashback Percentage"
                        secondary={`${offer.offer_config.cashback_percentage}%`}
                      />
                    </ListItem>
                  )}
                  {offer.offer_config?.cashback_amount !== undefined && (
                    <ListItem>
                      <ListItemText
                        primary="Cashback Amount"
                        secondary={`৳${offer.offer_config.cashback_amount}`}
                      />
                    </ListItem>
                  )}
                  {offer.offer_config?.slabs && offer.offer_config.slabs.length > 0 && (
                    <ListItem>
                      <ListItemText
                        primary="Discount Slabs"
                        secondary={`${offer.offer_config.slabs.length} slabs configured`}
                      />
                    </ListItem>
                  )}
                </List>
              </CardContent>
            </Card>
          </Grid>

          {/* Metadata */}
          <Grid item xs={12}>
            <Card variant="outlined">
              <CardContent>
                <Typography variant="h6" gutterBottom sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                  <Description fontSize="small" />
                  Metadata
                </Typography>
                <Divider sx={{ my: 2 }} />
                <List dense>
                  <ListItem>
                    <ListItemText
                      primary="Created At"
                      secondary={format(new Date(offer.created_at), "PPpp")}
                    />
                  </ListItem>
                  <ListItem>
                    <ListItemText
                      primary="Last Updated"
                      secondary={format(new Date(offer.updated_at), "PPpp")}
                    />
                  </ListItem>
                  {offer.created_by && (
                    <ListItem>
                      <ListItemText
                        primary="Created By"
                        secondary={
                          typeof offer.created_by === "object"
                            ? offer.created_by.name
                            : offer.created_by
                        }
                      />
                    </ListItem>
                  )}
                </List>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </Paper>
    </Container>
  );
}
