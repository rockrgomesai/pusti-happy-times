"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Box,
  Button,
  Card,
  CardContent,
  Container,
  Step,
  StepLabel,
  Stepper,
  Typography,
  Alert,
  Stack,
  Paper,
} from "@mui/material";
import {
  ArrowBack as BackIcon,
  ArrowForward as NextIcon,
  Save as SaveIcon,
} from "@mui/icons-material";
import { createSecondaryOffer } from "@/lib/api/secondaryOffers";
import { SecondaryOfferFormData, OfferStatus, ProductSegment } from "@/types/secondaryOffer";
import Step1BasicInfo from "@/components/secondaryOffers/wizard/Step1BasicInfo";
import Step2Territories from "@/components/secondaryOffers/wizard/Step2Territories";
import Step3DistributorRoutes from "@/components/secondaryOffers/wizard/Step3DistributorRoutes";
import Step4OutletTargeting from "@/components/secondaryOffers/wizard/Step4OutletTargeting";
import Step5OfferConfig from "@/components/secondaryOffers/wizard/Step5OfferConfig";

const steps = [
  "Basic Information",
  "Territory Targeting",
  "Distributor & Routes",
  "Outlet Targeting",
  "Offer Configuration",
];

const CreateSecondaryOfferPage = () => {
  const router = useRouter();
  const [activeStep, setActiveStep] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const [formData, setFormData] = useState<SecondaryOfferFormData>({
    name: "",
    offer_type: "FLAT_DISCOUNT_PCT",
    product_segments: ["BIS"],
    start_date: null,
    end_date: null,
    status: "Draft",
    active: true,
    description: "",
    territories: {
      zones: { ids: [], mode: "include" },
      regions: { ids: [], mode: "include" },
      areas: { ids: [], mode: "include" },
      db_points: { ids: [], mode: "include" },
    },
    targeting: {
      distributors: { ids: [], mode: "include", applyToAllRoutes: true },
      routes: { ids: [], mode: "include", applyToAllOutlets: true },
    },
    outlets: {
      selectionMode: "all",
      ids: [],
      mode: "include",
      filters: {},
    },
    config: {
      applyToAllProducts: false,
      selectedProducts: [],
    },
    internal_notes: "",
  });

  const handleNext = () => {
    setActiveStep((prev) => prev + 1);
    setError(null);
  };

  const handleBack = () => {
    setActiveStep((prev) => prev - 1);
    setError(null);
  };

  const handleFormDataChange = (updates: Partial<SecondaryOfferFormData>) => {
    setFormData((prev) => ({ ...prev, ...updates }));
  };

  const handleSubmit = async () => {
    try {
      setLoading(true);
      setError(null);

      const payload = {
        ...formData,
        start_date: formData.start_date?.toISOString(),
        end_date: formData.end_date?.toISOString(),
      };

      await createSecondaryOffer(payload);
      router.push("/product/secondaryoffers");
    } catch (err: any) {
      console.error("Error creating secondary offer:", err);
      setError(err.response?.data?.message || "Failed to create secondary offer");
    } finally {
      setLoading(false);
    }
  };

  const getStepContent = (step: number) => {
    switch (step) {
      case 0:
        return <Step1BasicInfo formData={formData} onChange={handleFormDataChange} />;
      case 1:
        return <Step2Territories formData={formData} onChange={handleFormDataChange} />;
      case 2:
        return <Step3DistributorRoutes formData={formData} onChange={handleFormDataChange} />;
      case 3:
        return <Step4OutletTargeting formData={formData} onChange={handleFormDataChange} />;
      case 4:
        return <Step5OfferConfig formData={formData} onChange={handleFormDataChange} />;
      default:
        return null;
    }
  };

  const isStepValid = () => {
    switch (activeStep) {
      case 0:
        return (
          formData.name.trim() !== "" &&
          formData.start_date !== null &&
          formData.end_date !== null &&
          formData.product_segments.length > 0
        );
      case 1:
        // Territories optional
        return true;
      case 2:
        // Distributors/routes optional
        return true;
      case 3:
        // Outlets - must have selection mode
        return formData.outlets.selectionMode !== undefined;
      case 4:
        // Config validation based on offer type
        return true;
      default:
        return false;
    }
  };

  return (
    <Container maxWidth="lg" sx={{ py: { xs: 2, sm: 3 } }}>
      {/* Header */}
      <Box sx={{ mb: 3 }}>
        <Typography variant="h4" component="h1" sx={{ fontSize: { xs: "1.5rem", sm: "2rem" }, mb: 1 }}>
          Create Secondary Offer
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Follow the wizard to configure your secondary offer targeting specific outlets
        </Typography>
      </Box>

      {/* Error Display */}
      {error && (
        <Alert severity="error" onClose={() => setError(null)} sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {/* Stepper - Mobile Simplified */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Stepper activeStep={activeStep} alternativeLabel sx={{ display: { xs: "none", sm: "flex" } }}>
          {steps.map((label) => (
            <Step key={label}>
              <StepLabel>{label}</StepLabel>
            </Step>
          ))}
        </Stepper>

        {/* Mobile Step Indicator */}
        <Box sx={{ display: { xs: "block", sm: "none" }, textAlign: "center" }}>
          <Typography variant="body2" color="text.secondary">
            Step {activeStep + 1} of {steps.length}
          </Typography>
          <Typography variant="h6" sx={{ mt: 0.5 }}>
            {steps[activeStep]}
          </Typography>
        </Box>
      </Paper>

      {/* Step Content */}
      <Card sx={{ mb: 3 }}>
        <CardContent sx={{ p: { xs: 2, sm: 3 } }}>{getStepContent(activeStep)}</CardContent>
      </Card>

      {/* Navigation Buttons */}
      <Stack
        direction={{ xs: "column", sm: "row" }}
        spacing={2}
        justifyContent="space-between"
      >
        <Button
          variant="outlined"
          startIcon={<BackIcon />}
          onClick={() => (activeStep === 0 ? router.back() : handleBack())}
          disabled={loading}
          fullWidth={false}
          sx={{ minWidth: { xs: "100%", sm: "auto" } }}
        >
          {activeStep === 0 ? "Cancel" : "Back"}
        </Button>

        {activeStep === steps.length - 1 ? (
          <Button
            variant="contained"
            startIcon={<SaveIcon />}
            onClick={handleSubmit}
            disabled={loading || !isStepValid()}
            fullWidth={false}
            sx={{ minWidth: { xs: "100%", sm: "auto" } }}
          >
            {loading ? "Creating..." : "Create Offer"}
          </Button>
        ) : (
          <Button
            variant="contained"
            endIcon={<NextIcon />}
            onClick={handleNext}
            disabled={!isStepValid()}
            fullWidth={false}
            sx={{ minWidth: { xs: "100%", sm: "auto" } }}
          >
            Next
          </Button>
        )}
      </Stack>
    </Container>
  );
};

export default CreateSecondaryOfferPage;
