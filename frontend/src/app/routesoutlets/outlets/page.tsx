'use client';

import { Box, Container, Paper, Typography } from '@mui/material';
import { Construction } from '@mui/icons-material';

export default function OutletsPage() {
  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Paper
        elevation={0}
        sx={{
          p: 8,
          textAlign: 'center',
          borderRadius: 2,
          border: '1px dashed',
          borderColor: 'divider',
        }}
      >
        <Construction sx={{ fontSize: 80, color: 'text.secondary', mb: 3 }} />
        <Typography variant="h4" gutterBottom sx={{ fontWeight: 600 }}>
          Outlets
        </Typography>
        <Typography variant="h6" color="text.secondary">
          Under Development
        </Typography>
        <Typography variant="body1" color="text.secondary" sx={{ mt: 2 }}>
          This module is currently being developed. Please check back later.
        </Typography>
      </Paper>
    </Container>
  );
}
