import React from 'react';
import { Box, Skeleton } from '@mui/material';

export default function DashboardSkeleton() {
  return (
    <Box>
      {/* Header Skeleton */}
      <Box sx={{ mb: 4 }}>
        <Skeleton variant="text" width={250} height={48} />
        <Skeleton variant="text" width={400} height={24} sx={{ mt: 1 }} />
      </Box>

      {/* Stats Grid Skeleton */}
      <Box 
        sx={{ 
          display: 'grid',
          gridTemplateColumns: {
            xs: '1fr',
            sm: 'repeat(2, 1fr)',
            lg: 'repeat(4, 1fr)'
          },
          gap: 3,
          mb: 4
        }}
      >
        {[...Array(4)].map((_, index) => (
          <Skeleton 
            key={index} 
            variant="rectangular" 
            height={120} 
            sx={{ borderRadius: 2 }} 
          />
        ))}
      </Box>

      {/* Content Cards Skeleton */}
      <Box 
        sx={{ 
          display: 'grid',
          gridTemplateColumns: {
            xs: '1fr',
            md: '2fr 1fr'
          },
          gap: 3
        }}
      >
        <Skeleton variant="rectangular" height={400} sx={{ borderRadius: 2 }} />
        <Skeleton variant="rectangular" height={400} sx={{ borderRadius: 2 }} />
      </Box>
    </Box>
  );
}
