'use client';

import React, { useState, useRef } from 'react';
import {
  Box,
  Stepper,
  Step,
  StepLabel,
  Button,
  Paper,
  Stack,
  useTheme,
  useMediaQuery
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import SaveIcon from '@mui/icons-material/Save';
import { toast } from 'react-hot-toast';
import type { ProductSegment, OfferTypeCode } from '@/types/offer';

// Import screen components
import Screen1OfferScope from './Screen1OfferScope';
import Screen2TerritoryDistributor, { Screen2Handle } from './Screen2TerritoryDistributor';
import Screen3OfferTypeSelection from './Screen3OfferTypeSelection';
import Screen4OfferConfiguration from './Screen4OfferConfiguration';
import Screen5ReviewSubmit from './Screen5ReviewSubmit';

interface WizardState {
  // Screen 1
  offerName: string;
  productSegments: ProductSegment[];
  validFrom: string;
  validTo: string;
  
  // Screen 2
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
  
  // Screen 3
  selectedOfferType: OfferTypeCode | '';
  
  // Screen 4 - Offer Configuration
  offerConfig: {
    // Applicable products (for all offer types that need product selection)
    selectedProducts?: string[]; // Product IDs
    applyToAllProducts?: boolean; // Apply to all products in selected segments
    
    // Discount offers
    discountPercentage?: number;
    discountAmount?: number;
    minOrderValue?: number;
    maxDiscountAmount?: number;
    
    // Slab-based offers
    slabs?: Array<{
      minValue: number;
      maxValue: number;
      discountPercentage?: number;
      discountAmount?: number;
    }>;
    
    // Product-based offers (Buy X Get Y, BOGO, Bundle)
    buyProducts?: Array<{
      productId: string;
      quantity: number;
    }>;
    getProducts?: Array<{
      productId: string;
      quantity: number;
      discountPercentage?: number;
      isPromotionalGift?: boolean; // If true, added as free gift at ৳0
    }>;
    bundlePrice?: number; // Fixed price for bundle
    buyQuantity?: number; // For BOGO
    getQuantity?: number; // For BOGO
    
    // SKU Discount Amount
    skuDiscounts?: Array<{
      productId: string;
      discountAmount: number;
      startDate: string;
      endDate: string;
    }>;
    
    // BOGO Different SKU
    qualifierProducts?: Array<{
      productId: string;
      minQuantity: number;
    }>;
    rewardProducts?: Array<{
      productId: string;
      freeQuantity: number;
      maxValueCap?: number;
    }>;
    qualifierLogic?: 'AND' | 'OR';
    distributionMode?: 'all' | 'choice';
    allowRepetition?: boolean;
    maxRewardSets?: number;
    
    // Cashback
    cashbackPercentage?: number;
    cashbackAmount?: number;
    maxCashback?: number;
    
    // Volume discount
    volumeSlabs?: Array<{
      minQuantity: number;
      maxQuantity: number;
      discountPercentage: number;
    }>;
    
    // Loyalty points
    pointsPerUnit?: number;
    pointsValue?: number; // How much 1 point is worth in currency
    
    // Flash sale
    stockLimit?: number;
    orderLimit?: number; // Max orders per distributor
  };
}

const steps = [
  'Offer Scope',
  'Territory & Distributors',
  'Choose Offer Type',
  'Configure Offer',
  'Review & Submit'
];

interface OfferWizardProps {
  mode?: 'create' | 'edit';
  initialData?: any; // The existing offer data when editing
  offerId?: string; // The offer ID when editing
  onSuccess?: () => void; // Callback after successful save
}

export default function OfferWizard({ 
  mode = 'create', 
  initialData = null,
  offerId = '',
  onSuccess
}: OfferWizardProps) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  
  const [activeStep, setActiveStep] = useState(0);
  
  // Initialize wizard data from initialData or empty state
  const getInitialWizardData = (): WizardState => {
    if (mode === 'edit' && initialData) {
      return {
        offerName: initialData.name || '',
        productSegments: initialData.product_segments || [],
        validFrom: initialData.start_date ? initialData.start_date.split('T')[0] : '',
        validTo: initialData.end_date ? initialData.end_date.split('T')[0] : '',
        
        // Backend returns 'ids' not 'items' in the API response
        selectedZones: initialData.territories?.zones?.ids?.map((z: any) => z._id || z) || [],
        selectedRegions: initialData.territories?.regions?.ids?.map((r: any) => r._id || r) || [],
        selectedAreas: initialData.territories?.areas?.ids?.map((a: any) => a._id || a) || [],
        selectedDbPoints: initialData.territories?.db_points?.ids?.map((d: any) => d._id || d) || [],
        selectedDistributors: initialData.distributors?.ids?.map((d: any) => d._id || d) || [],
        
        zonesIncludeMode: initialData.territories?.zones?.mode || 'include',
        regionsIncludeMode: initialData.territories?.regions?.mode || 'include',
        areasIncludeMode: initialData.territories?.areas?.mode || 'include',
        dbPointsIncludeMode: initialData.territories?.db_points?.mode || 'include',
        distributorsIncludeMode: initialData.distributors?.mode || 'include',
        
        selectedOfferType: initialData.offer_type || '',
        offerConfig: {
          ...initialData.config,
          // Convert populated product objects to IDs if they exist
          selectedProducts: initialData.config?.selectedProducts?.map((p: any) => p._id || p) || [],
          // Convert buy/get products if they exist
          buyProducts: initialData.config?.buyProducts?.map((bp: any) => ({
            ...bp,
            productId: bp.productId?._id || bp.productId
          })) || [],
          getProducts: initialData.config?.getProducts?.map((gp: any) => ({
            ...gp,
            productId: gp.productId?._id || gp.productId
          })) || []
        }
      };
    }
    
    return {
      offerName: '',
      productSegments: [],
      validFrom: '',
      validTo: '',
      selectedZones: [],
      selectedRegions: [],
      selectedAreas: [],
      selectedDbPoints: [],
      selectedDistributors: [],
      zonesIncludeMode: 'include',
      regionsIncludeMode: 'include',
      areasIncludeMode: 'include',
      dbPointsIncludeMode: 'include',
      distributorsIncludeMode: 'include',
      selectedOfferType: '',
      offerConfig: {}
    };
  };
  
  const [wizardData, setWizardData] = useState<WizardState>(getInitialWizardData());
  
  const [errors, setErrors] = useState<Record<string, string>>({});
  
  // Ref to access Screen2 component methods
  const screen2Ref = useRef<Screen2Handle>(null);

  const updateWizardData = (data: Partial<WizardState>) => {
    console.log('Wizard updateWizardData called with:', data);
    setWizardData(prev => {
      const newData = { ...prev, ...data };
      console.log('New wizardData:', newData);
      return newData;
    });
    // Clear errors for updated fields
    const updatedFields = Object.keys(data);
    setErrors(prev => {
      const newErrors = { ...prev };
      updatedFields.forEach(field => delete newErrors[field]);
      return newErrors;
    });
  };

  const validateScreen1 = (): boolean => {
    const newErrors: Record<string, string> = {};
    
    if (!wizardData.offerName.trim()) {
      newErrors.offerName = 'Offer name is required';
    }
    
    if (wizardData.productSegments.length === 0) {
      newErrors.productSegments = 'Select at least one product segment';
    }
    
    if (!wizardData.validFrom) {
      newErrors.validFrom = 'Start date is required';
    }
    
    if (!wizardData.validTo) {
      newErrors.validTo = 'End date is required';
    } else if (wizardData.validFrom && wizardData.validTo < wizardData.validFrom) {
      newErrors.validTo = 'End date must be after start date';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const validateScreen2 = (): boolean => {
    // No validation required - auto-cascade will handle territory selection
    // User can proceed with any level of territory selection (zones, regions, areas, db_points, or distributors)
    return true;
  };

  const validateScreen3 = (): boolean => {
    if (!wizardData.selectedOfferType) {
      toast.error('Please select an offer type template');
      return false;
    }
    return true;
  };

  const validateScreen4 = (): boolean => {
    const newErrors: Record<string, string> = {};
    const config = wizardData.offerConfig;
    
    // Validate product selection - different offer types use different fields
    const offerType = wizardData.selectedOfferType;
    
    // Skip product validation for FIRST_ORDER
    if (offerType === 'FIRST_ORDER') {
      // No product validation needed
    }
    // BOGO uses buyProducts
    else if (offerType === 'BOGO') {
      if (!config.buyProducts || config.buyProducts.length === 0) {
        newErrors.selectedProducts = 'Select at least one product for BOGO';
        toast.error('Please select at least one product for BOGO');
        setErrors(newErrors);
        return false;
      }
    }
    // FREE_PRODUCT and BUNDLE_OFFER use buyProducts
    else if (offerType === 'FREE_PRODUCT' || offerType === 'BUNDLE_OFFER') {
      if (!config.buyProducts || config.buyProducts.length === 0) {
        newErrors.selectedProducts = 'Select buy products';
        toast.error('Please add at least one buy product');
        setErrors(newErrors);
        return false;
      }
      if (offerType === 'FREE_PRODUCT' && (!config.getProducts || config.getProducts.length === 0)) {
        newErrors.selectedProducts = 'Select free products';
        toast.error('Please add at least one free product');
        setErrors(newErrors);
        return false;
      }
    }
    // BOGO_DIFFERENT_SKU uses qualifierProducts and rewardProducts
    else if (offerType === 'BOGO_DIFFERENT_SKU') {
      if (!config.qualifierProducts || config.qualifierProducts.length === 0) {
        newErrors.selectedProducts = 'Select qualifier products';
        toast.error('Please add at least one qualifier product (Buy)');
        setErrors(newErrors);
        return false;
      }
      if (!config.rewardProducts || config.rewardProducts.length === 0) {
        newErrors.selectedProducts = 'Select reward products';
        toast.error('Please add at least one reward product (Get)');
        setErrors(newErrors);
        return false;
      }
    }
    // SKU_DISCOUNT_AMOUNT uses skuDiscounts
    else if (offerType === 'SKU_DISCOUNT_AMOUNT') {
      if (!config.skuDiscounts || config.skuDiscounts.length === 0) {
        newErrors.selectedProducts = 'Add at least one SKU discount';
        toast.error('Please add at least one SKU discount');
        setErrors(newErrors);
        return false;
      }
    }
    // Most other offer types use selectedProducts
    else {
      if (!config.selectedProducts || config.selectedProducts.length === 0) {
        newErrors.selectedProducts = 'Select at least one product';
        toast.error('Please select at least one product');
        setErrors(newErrors);
        return false;
      }
    }
    
    // Validate type-specific configuration
    switch (wizardData.selectedOfferType) {
      case 'BOGO':
        console.log('BOGO Validation - buyQuantity:', config.buyQuantity, typeof config.buyQuantity);
        console.log('BOGO Validation - getQuantity:', config.getQuantity, typeof config.getQuantity);
        console.log('BOGO Validation - discountPercentage:', config.discountPercentage, typeof config.discountPercentage);
        
        if (!config.buyQuantity || config.buyQuantity <= 0) {
          newErrors.buyQuantity = 'Buy quantity is required';
          console.log('BOGO Validation Failed: buyQuantity');
        }
        if (!config.getQuantity || config.getQuantity <= 0) {
          newErrors.getQuantity = 'Get quantity is required';
          console.log('BOGO Validation Failed: getQuantity');
        }
        if (config.discountPercentage === undefined || config.discountPercentage === null || config.discountPercentage < 0 || config.discountPercentage > 100) {
          newErrors.discountPercentage = 'Discount percentage must be between 0 and 100';
          console.log('BOGO Validation Failed: discountPercentage');
        }
        break;
      case 'FLAT_DISCOUNT_PCT':
        if (!config.discountPercentage || config.discountPercentage <= 0) {
          newErrors.discountPercentage = 'Discount percentage is required';
        }
        break;
      case 'FLAT_DISCOUNT_AMT':
        if (!config.discountAmount || config.discountAmount <= 0) {
          newErrors.discountAmount = 'Discount amount is required';
        }
        break;
      case 'DISCOUNT_SLAB_PCT':
      case 'DISCOUNT_SLAB_AMT':
        if (!config.slabs || config.slabs.length === 0) {
          toast.error('Please add at least one discount slab');
          return false;
        }
        break;
      case 'LOYALTY_POINTS':
        if (!config.pointsPerUnit || config.pointsPerUnit <= 0) {
          newErrors.pointsPerUnit = 'Points per unit is required';
        }
        if (!config.pointsValue || config.pointsValue <= 0) {
          newErrors.pointsValue = 'Point value is required';
        }
        break;
      case 'FLASH_SALE':
        if (!config.discountPercentage || config.discountPercentage <= 0) {
          newErrors.discountPercentage = 'Discount percentage is required';
        }
        break;
    }
    
    setErrors(newErrors);
    console.log('Validation errors:', newErrors);
    console.log('Number of errors:', Object.keys(newErrors).length);
    
    if (Object.keys(newErrors).length > 0) {
      toast.error('Please fill all required configuration fields');
      return false;
    }
    return true;
  };

  const handleNext = async () => {
    let isValid = true;
    
    // For Screen 2, perform auto-cascade before validation
    if (activeStep === 1) {
      try {
        await screen2Ref.current?.performAutoCascade();
      } catch (error) {
        console.error('Auto-cascade failed:', error);
        toast.error('Failed to auto-select territories');
        return;
      }
    }
    
    switch (activeStep) {
      case 0:
        isValid = validateScreen1();
        break;
      case 1:
        isValid = validateScreen2();
        break;
      case 2:
        isValid = validateScreen3();
        break;
      case 3:
        isValid = validateScreen4();
        break;
      default:
        break;
    }
    
    if (isValid) {
      setActiveStep((prevActiveStep) => prevActiveStep + 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      toast.error('Please fill all required fields correctly');
    }
  };

  const handleBack = () => {
    setActiveStep((prevActiveStep) => prevActiveStep - 1);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSave = () => {
    console.log('Saving offer:', wizardData);
    toast.success('Offer saved successfully!');
    // TODO: Implement actual save logic
  };

  const renderStepContent = (step: number) => {
    switch (step) {
      case 0:
        return (
          <Screen1OfferScope
            data={{
              offerName: wizardData.offerName,
              productSegments: wizardData.productSegments,
              validFrom: wizardData.validFrom,
              validTo: wizardData.validTo
            }}
            onChange={updateWizardData}
            errors={errors}
          />
        );
      case 1:
        return (
          <Screen2TerritoryDistributor
            ref={screen2Ref}
            data={{
              selectedZones: wizardData.selectedZones,
              selectedRegions: wizardData.selectedRegions,
              selectedAreas: wizardData.selectedAreas,
              selectedDbPoints: wizardData.selectedDbPoints,
              selectedDistributors: wizardData.selectedDistributors,
              zonesIncludeMode: wizardData.zonesIncludeMode,
              regionsIncludeMode: wizardData.regionsIncludeMode,
              areasIncludeMode: wizardData.areasIncludeMode,
              dbPointsIncludeMode: wizardData.dbPointsIncludeMode,
              distributorsIncludeMode: wizardData.distributorsIncludeMode
            }}
            productSegments={wizardData.productSegments}
            onChange={updateWizardData}
            errors={errors}
          />
        );
      case 2:
        return (
          <Screen3OfferTypeSelection
            selectedOfferType={wizardData.selectedOfferType}
            onSelectOfferType={(code) => updateWizardData({ selectedOfferType: code })}
          />
        );
      case 3:
        return (
          <Screen4OfferConfiguration
            data={{
              selectedOfferType: wizardData.selectedOfferType,
              productSegments: wizardData.productSegments,
              offerConfig: wizardData.offerConfig
            }}
            onChange={updateWizardData}
            errors={errors}
          />
        );
      case 4:
        return (
          <Screen5ReviewSubmit
            data={{
              offerName: wizardData.offerName,
              productSegments: wizardData.productSegments,
              startDate: wizardData.validFrom,
              endDate: wizardData.validTo,
              selectedOfferType: wizardData.selectedOfferType,
              territories: {
                zones: {
                  items: wizardData.selectedZones.map(id => ({ _id: id })),
                  mode: wizardData.zonesIncludeMode
                },
                regions: {
                  items: wizardData.selectedRegions.map(id => ({ _id: id })),
                  mode: wizardData.regionsIncludeMode
                },
                areas: {
                  items: wizardData.selectedAreas.map(id => ({ _id: id })),
                  mode: wizardData.areasIncludeMode
                },
                dbPoints: {
                  items: wizardData.selectedDbPoints.map(id => ({ _id: id })),
                  mode: wizardData.dbPointsIncludeMode
                }
              },
              distributors: {
                items: wizardData.selectedDistributors.map(id => ({ _id: id })),
                mode: wizardData.distributorsIncludeMode
              },
              offerConfig: wizardData.offerConfig
            }}
            onStepChange={setActiveStep}
            mode={mode}
            offerId={offerId}
            onSubmit={() => {
              if (onSuccess) {
                onSuccess();
              } else {
                toast.success(`Offer ${mode === 'edit' ? 'updated' : 'created'} successfully!`);
              }
            }}
          />
        );
      default:
        return null;
    }
  };

  return (
    <Box sx={{ width: '100%' }}>
      {/* Stepper */}
      <Paper 
        elevation={1} 
        sx={{ 
          p: { xs: 2, sm: 3 }, 
          mb: 3,
          position: 'sticky',
          top: 0,
          zIndex: 10,
          bgcolor: 'background.paper'
        }}
      >
        <Stepper 
          activeStep={activeStep} 
          alternativeLabel={isMobile}
          orientation={isMobile ? 'horizontal' : 'horizontal'}
        >
          {steps.map((label, index) => (
            <Step key={label}>
              <StepLabel
                sx={{
                  '& .MuiStepLabel-label': {
                    fontSize: { xs: '0.75rem', sm: '0.875rem' }
                  }
                }}
              >
                {isMobile && index > activeStep ? '' : label}
              </StepLabel>
            </Step>
          ))}
        </Stepper>
      </Paper>

      {/* Step Content */}
      <Box sx={{ mb: 3 }}>
        {renderStepContent(activeStep)}
      </Box>

      {/* Navigation Buttons */}
      <Paper 
        elevation={2} 
        sx={{ 
          p: { xs: 2, sm: 3 },
          position: 'sticky',
          bottom: 0,
          zIndex: 10,
          bgcolor: 'background.paper'
        }}
      >
        <Stack 
          direction="row" 
          spacing={2} 
          justifyContent="space-between"
          sx={{ maxWidth: 1200, mx: 'auto' }}
        >
          <Button
            disabled={activeStep === 0}
            onClick={handleBack}
            startIcon={<ArrowBackIcon />}
            variant="outlined"
            size={isMobile ? 'medium' : 'large'}
          >
            Back
          </Button>
          
          <Box sx={{ flex: 1 }} />
          
          {activeStep === steps.length - 1 ? (
            <Button
              variant="contained"
              onClick={handleSave}
              startIcon={<SaveIcon />}
              size={isMobile ? 'medium' : 'large'}
            >
              Save Offer
            </Button>
          ) : (
            <Button
              variant="contained"
              onClick={handleNext}
              endIcon={<ArrowForwardIcon />}
              size={isMobile ? 'medium' : 'large'}
            >
              Next
            </Button>
          )}
        </Stack>
      </Paper>
    </Box>
  );
}
