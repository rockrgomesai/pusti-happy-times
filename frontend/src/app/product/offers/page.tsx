'use client';

import React from 'react';
import { Box, Container, Typography, Breadcrumbs, Link } from '@mui/material';
import NavigateNextIcon from '@mui/icons-material/NavigateNext';
import OfferWizard from '@/components/offers/wizard/OfferTypeWizard';

export default function OffersPage() {
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
        <Typography color="text.primary">Offers</Typography>
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
          Create New Offer
        </Typography>
        <Typography 
          variant="body1" 
          color="text.secondary"
          sx={{ fontSize: { xs: '0.9rem', sm: '1rem' } }}
        >
          Configure promotional offers with territory-based targeting and distributor selection
        </Typography>
      </Box>

      {/* Wizard Component */}
      <OfferWizard />
    </Container>
  );
}
