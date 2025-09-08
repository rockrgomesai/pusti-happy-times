'use client';

import React from 'react';
import { Box, Typography, useTheme } from '@mui/material';

const FOOTER_HEIGHT = 32; // 50% of navbar height (64px)

export function Footer() {
  const theme = useTheme();
  const currentYear = new Date().getFullYear();

  return (
    <Box
      component="footer"
      sx={{
        height: FOOTER_HEIGHT,
        backgroundColor: theme.palette.background.paper,
        borderTop: `1px solid ${theme.palette.divider}`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        px: 2,
        position: 'relative',
        bottom: 0,
        width: '100%',
      }}
    >
      <Typography
        variant="caption"
        color="text.secondary"
        sx={{
          fontSize: '0.75rem',
          textAlign: 'center',
        }}
      >
        © {currentYear} Pusti Happy Times. All rights reserved.
      </Typography>
    </Box>
  );
}
