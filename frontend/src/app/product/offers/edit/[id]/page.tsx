"use client";

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  Box,
  Typography,
  CircularProgress,
  Alert,
  Button,
  Container,
  Breadcrumbs,
  Link
} from '@mui/material';
import NavigateNextIcon from '@mui/icons-material/NavigateNext';
import { ArrowBack as ArrowBackIcon } from '@mui/icons-material';
import { offersApi } from '@/lib/api/offers';
import OfferWizard from '@/components/offers/wizard/OfferTypeWizard';
import { toast } from 'react-hot-toast';

export default function EditOfferPage() {
  const params = useParams();
  const router = useRouter();
  const offerId = params.id as string;
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [offer, setOffer] = useState<any>(null);

  useEffect(() => {
    loadOffer();
  }, [offerId]);

  const loadOffer = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await offersApi.getById(offerId);
      setOffer(data);
    } catch (err: any) {
      console.error('Error loading offer:', err);
      setError(err.response?.data?.message || 'Failed to load offer');
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    router.push('/product/browseoffers');
  };

  const handleSuccess = () => {
    toast.success('Offer updated successfully!');
    setTimeout(() => {
      router.push('/product/browseoffers');
    }, 1500);
  };

  if (loading) {
    return (
      <Container maxWidth="xl" sx={{ py: 4 }}>
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px' }}>
          <CircularProgress />
        </Box>
      </Container>
    );
  }

  if (error || !offer) {
    return (
      <Container maxWidth="xl" sx={{ py: 4 }}>
        <Alert severity="error" sx={{ mb: 3 }}>
          {error || 'Offer not found'}
        </Alert>
        <Button
          variant="outlined"
          startIcon={<ArrowBackIcon />}
          onClick={handleBack}
        >
          Back to Offers
        </Button>
      </Container>
    );
  }

  return (
    <Container maxWidth="xl" sx={{ py: 3 }}>
      {/* Breadcrumbs */}
      <Breadcrumbs 
        separator={<NavigateNextIcon fontSize="small" />} 
        sx={{ mb: 2 }}
      >
        <Link color="inherit" href="/dashboard" underline="hover">
          Dashboard
        </Link>
        <Link color="inherit" href="/product" underline="hover">
          Product
        </Link>
        <Link color="inherit" href="/product/browseoffers" underline="hover">
          Browse Offers
        </Link>
        <Typography color="text.primary">Edit Offer</Typography>
      </Breadcrumbs>

      {/* Page Header */}
      <Box sx={{ mb: 4 }}>
        <Typography 
          variant="h4" 
          component="h1" 
          gutterBottom
          sx={{ 
            fontSize: { xs: '1.5rem', sm: '2rem' },
            fontWeight: 700
          }}
        >
          Edit Offer: {offer.name}
        </Typography>
        <Typography 
          variant="body1" 
          color="text.secondary"
          sx={{ fontSize: { xs: '0.9rem', sm: '1rem' } }}
        >
          Modify the offer configuration and save changes
        </Typography>
      </Box>

      {/* Wizard Component */}
      <OfferWizard 
        mode="edit"
        initialData={offer}
        offerId={offerId}
        onSuccess={handleSuccess}
      />
    </Container>
  );
}
