"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  Container,
  Paper,
  Box,
  Stepper,
  Step,
  StepLabel,
  Button,
  Typography,
  CircularProgress,
  Alert,
} from "@mui/material";
import { ArrowBack, ArrowForward, Save } from "@mui/icons-material";
import { SecondaryOfferFormData } from "@/types/secondaryOffer";
import {
  getSecondaryOfferById,
  updateSecondaryOffer,
} from "@/lib/api/secondaryOffers";
import Step1BasicInfo from "@/components/secondaryOffers/wizard/Step1BasicInfo";
import Step2Territories from "@/components/secondaryOffers/wizard/Step2Territories";
import Step3DistributorRoutes from "@/components/secondaryOffers/wizard/Step3DistributorRoutes";
import Step4OutletTargeting from "@/components/secondaryOffers/wizard/Step4OutletTargeting";
import Step5OfferConfig from "@/components/secondaryOffers/wizard/Step5OfferConfig";

const steps = [
  "Basic Information",
  "Territories",
  "Distributors & Routes",
  "Outlet Targeting",
  "Offer Configuration",
];

export default function EditSecondaryOfferPage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;

  const [activeStep, setActiveStep] = useState(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState<SecondaryOfferFormData>({
    name: "",
    offer_type: "",
    status: "Draft",
    product_segments: [],
    start_date: new Date(),
    end_date: null,
    active: true,
    description: "",
    territories: {
      zones: [],
      regions: [],
      areas: [],
      db_points: [],
    },
    targeting: {
      distributors: [],
      routes: [],
    },
    outlets: {
      selection_mode: "all",
    },
    offer_config: {},
  });

  // Load existing offer data
  useEffect(() => {
    const loadOffer = async () => {
      if (!id) return;

      setLoading(true);
      setError(null);
      try {
        const response = await getSecondaryOfferById(id);
        const offer = response.data;

        // Map backend data to form data
        setFormData({
          name: offer.name,
          offer_type: offer.offer_type,
          status: offer.status,
          product_segments: offer.product_segments || [],
          start_date: offer.start_date ? new Date(offer.start_date) : new Date(),
          end_date: offer.end_date ? new Date(offer.end_date) : null,
          active: offer.active,
          description: offer.description || "",
          territories: {
            zones: offer.territories?.zones?.map((z: any) => z._id || z) || [],
            regions: offer.territories?.regions?.map((r: any) => r._id || r) || [],
            areas: offer.territories?.areas?.map((a: any) => a._id || a) || [],
            db_points: offer.territories?.db_points?.map((d: any) => d._id || d) || [],
            zone_mode: offer.territories?.zone_mode,
            region_mode: offer.territories?.region_mode,
            area_mode: offer.territories?.area_mode,
            db_point_mode: offer.territories?.db_point_mode,
          },
          targeting: {
            distributors:
              offer.targeting?.distributors?.map((d: any) => d._id || d) || [],
            routes: offer.targeting?.routes?.map((r: any) => r._id || r) || [],
            distributor_mode: offer.targeting?.distributor_mode,
            route_mode: offer.targeting?.route_mode,
            apply_to_all_routes: offer.targeting?.apply_to_all_routes,
          },
          outlets: {
            selection_mode: offer.outlets?.selection_mode || "all",
            specific_outlets:
              offer.outlets?.specific_outlets?.map((o: any) => o._id || o) || [],
            filters: offer.outlets?.filters || {},
          },
          offer_config: offer.offer_config || {},
        });
      } catch (err: any) {
        setError(err.response?.data?.message || "Failed to load offer");
      } finally {
        setLoading(false);
      }
    };

    loadOffer();
  }, [id]);

  const handleNext = () => {
    setActiveStep((prev) => prev + 1);
  };

  const handleBack = () => {
    setActiveStep((prev) => prev - 1);
  };

  const handleFormChange = (updates: Partial<SecondaryOfferFormData>) => {
    setFormData((prev) => ({ ...prev, ...updates }));
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      await updateSecondaryOffer(id, formData as any);
      router.push("/product/secondaryoffers");
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to update offer");
      setSaving(false);
    }
  };

  const renderStepContent = () => {
    switch (activeStep) {
      case 0:
        return <Step1BasicInfo formData={formData} onChange={handleFormChange} />;
      case 1:
        return <Step2Territories formData={formData} onChange={handleFormChange} />;
      case 2:
        return <Step3DistributorRoutes formData={formData} onChange={handleFormChange} />;
      case 3:
        return <Step4OutletTargeting formData={formData} onChange={handleFormChange} />;
      case 4:
        return <Step5OfferConfig formData={formData} onChange={handleFormChange} />;
      default:
        return null;
    }
  };

  if (loading) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: 400 }}>
          <CircularProgress />
        </Box>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Paper sx={{ p: { xs: 2, md: 4 } }}>
        <Typography variant="h4" gutterBottom>
          Edit Secondary Offer
        </Typography>

        {error && (
          <Alert severity="error" sx={{ mb: 3 }}>
            {error}
          </Alert>
        )}

        {/* Stepper - Desktop */}
        <Box sx={{ display: { xs: "none", md: "block" }, mb: 4 }}>
          <Stepper activeStep={activeStep}>
            {steps.map((label) => (
              <Step key={label}>
                <StepLabel>{label}</StepLabel>
              </Step>
            ))}
          </Stepper>
        </Box>

        {/* Stepper - Mobile */}
        <Box sx={{ display: { xs: "block", md: "none" }, mb: 3 }}>
          <Typography variant="body2" color="text.secondary" align="center">
            Step {activeStep + 1} of {steps.length}
          </Typography>
          <Typography variant="h6" align="center">
            {steps[activeStep]}
          </Typography>
        </Box>

        {/* Step Content */}
        <Box sx={{ my: 4 }}>{renderStepContent()}</Box>

        {/* Navigation Buttons */}
        <Box sx={{ display: "flex", flexDirection: { xs: "column", sm: "row" }, gap: 2, pt: 2 }}>
          <Button
            color="inherit"
            disabled={activeStep === 0}
            onClick={handleBack}
            startIcon={<ArrowBack />}
            fullWidth={true}
            sx={{ display: { xs: "flex", sm: "inline-flex" } }}
          >
            Back
          </Button>
          <Box sx={{ flex: "1 1 auto" }} />
          {activeStep === steps.length - 1 ? (
            <Button
              variant="contained"
              onClick={handleSave}
              disabled={saving}
              startIcon={saving ? <CircularProgress size={20} /> : <Save />}
              fullWidth={true}
              sx={{ display: { xs: "flex", sm: "inline-flex" } }}
            >
              {saving ? "Saving..." : "Save Changes"}
            </Button>
          ) : (
            <Button
              variant="contained"
              onClick={handleNext}
              endIcon={<ArrowForward />}
              fullWidth={true}
              sx={{ display: { xs: "flex", sm: "inline-flex" } }}
            >
              Next
            </Button>
          )}
        </Box>
      </Paper>
    </Container>
  );
}
