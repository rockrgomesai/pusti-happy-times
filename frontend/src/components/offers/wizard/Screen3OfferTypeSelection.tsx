'use client';

import React, { useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  CardActionArea,
  Typography,
  Grid as Grid2,
  Stack,
  Chip,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  alpha,
  Tooltip
} from '@mui/material';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import { OFFER_TYPE_DEFINITIONS, type OfferTypeCode } from '@/types/offer';

interface Screen3Props {
  selectedOfferType: OfferTypeCode | '';
  onSelectOfferType: (code: OfferTypeCode) => void;
}

const categoryColors = {
  'Discount': 'primary',
  'Free Product': 'success',
  'Bundle': 'warning',
  'Special': 'secondary'
} as const;

export default function Screen3OfferTypeSelection({ 
  selectedOfferType, 
  onSelectOfferType
}: Screen3Props) {
  const [expandedCategory, setExpandedCategory] = useState<string | false>(false);

  return (
    <Box sx={{ width: '100%', maxWidth: 1200, mx: 'auto', p: { xs: 2, sm: 3 } }}>
      <Box mb={3} textAlign="center">
        <Typography 
          variant="h5" 
          gutterBottom 
          sx={{ 
            fontSize: { xs: '1.25rem', sm: '1.5rem' },
            fontWeight: 600,
            mb: 1
          }}
        >
          Screen 3: Choose Offer Type
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Select one of 13 offer type templates to configure your offer
        </Typography>
      </Box>

      <Grid2 container spacing={{ xs: 2, sm: 3 }}>
        {OFFER_TYPE_DEFINITIONS.map((offerType) => {
          const isSelected = selectedOfferType === offerType.code;
          
          // Create tooltip content with all features
          const tooltipContent = (
            <Box sx={{ p: 1 }}>
              <Typography variant="subtitle2" fontWeight={600} gutterBottom>
                Key Features:
              </Typography>
              <List dense disablePadding>
                {offerType.features.map((feature: string, index: number) => (
                  <ListItem key={index} sx={{ py: 0.25, px: 0 }}>
                    <ListItemIcon sx={{ minWidth: 24 }}>
                      <CheckCircleOutlineIcon sx={{ fontSize: 14, color: 'success.light' }} />
                    </ListItemIcon>
                    <ListItemText
                      primary={feature}
                      primaryTypographyProps={{
                        variant: 'caption',
                        sx: { fontSize: '0.75rem' }
                      }}
                    />
                  </ListItem>
                ))}
              </List>
            </Box>
          );
          
          return (
            <Grid2 size={{ xs: 12, sm: 6, md: 4, lg: 3 }} key={offerType.code}>
              <Tooltip
                title={tooltipContent}
                placement="right"
                arrow
                enterDelay={800}
                leaveDelay={200}
                componentsProps={{
                  tooltip: {
                    sx: {
                      bgcolor: 'grey.900',
                      maxWidth: 350,
                      '& .MuiTooltip-arrow': {
                        color: 'grey.900',
                      },
                    },
                  },
                }}
              >
              <Card 
                elevation={isSelected ? 8 : 2}
                sx={{
                  height: '100%',
                  minHeight: { xs: 200, sm: 220 },
                  transition: 'all 0.3s ease',
                  border: isSelected ? 2 : 1,
                  borderColor: isSelected ? 'primary.main' : 'divider',
                  bgcolor: isSelected ? alpha('#1976d2', 0.05) : 'background.paper',
                  '&:hover': {
                    transform: 'translateY(-4px)',
                    boxShadow: 6
                  }
                }}
              >
                <CardActionArea 
                  onClick={() => onSelectOfferType(offerType.code)}
                  sx={{ height: '100%' }}
                >
                  <CardContent sx={{ p: { xs: 2, sm: 2.5 }, height: '100%' }}>
                    <Stack spacing={1.5} height="100%">
                      {/* Header with Icon and Category */}
                      <Box display="flex" justifyContent="space-between" alignItems="flex-start">
                        <Typography 
                          variant="h3" 
                          sx={{ 
                            fontSize: { xs: '2rem', sm: '2.5rem' }
                          }}
                        >
                          {offerType.icon}
                        </Typography>
                        <Chip
                          label={offerType.category}
                          size="small"
                          color={categoryColors[offerType.category]}
                          sx={{ 
                            height: 22,
                            fontSize: '0.7rem',
                            fontWeight: 600
                          }}
                        />
                      </Box>

                      {/* Offer Name */}
                      <Typography 
                        variant="h6" 
                        sx={{ 
                          fontSize: { xs: '0.95rem', sm: '1.05rem' },
                          fontWeight: 600,
                          lineHeight: 1.3,
                          minHeight: { xs: 'auto', sm: 48 }
                        }}
                      >
                        {offerType.name}
                      </Typography>

                      {/* Description */}
                      <Typography 
                        variant="body2" 
                        color="text.secondary"
                        sx={{ 
                          fontSize: { xs: '0.8rem', sm: '0.85rem' },
                          lineHeight: 1.4,
                          flexGrow: 1
                        }}
                      >
                        {offerType.description}
                      </Typography>

                      {/* Selected Indicator */}
                      {isSelected && (
                        <Box 
                          display="flex" 
                          alignItems="center" 
                          justifyContent="center"
                          gap={0.5}
                          sx={{
                            bgcolor: 'primary.main',
                            color: 'white',
                            py: 0.5,
                            px: 1.5,
                            borderRadius: 1,
                            mt: 'auto'
                          }}
                        >
                          <CheckCircleOutlineIcon sx={{ fontSize: 16 }} />
                          <Typography variant="caption" fontWeight={600}>
                            Selected
                          </Typography>
                        </Box>
                      )}
                    </Stack>
                  </CardContent>
                </CardActionArea>
              </Card>
              </Tooltip>
            </Grid2>
          );
        })}
      </Grid2>

      {/* Info Message */}
      <Box 
        sx={{ 
          bgcolor: 'info.lighter', 
          p: 2, 
          borderRadius: 1,
          border: '1px solid',
          borderColor: 'info.light',
          mt: 3
        }}
      >
        <Typography variant="body2" color="info.darker">
          💡 <strong>Note:</strong> Hover over any card to see all key features. After selecting an offer type, you'll proceed to Screen 4 to configure specific parameters for the chosen offer type.
        </Typography>
      </Box>
    </Box>
  );
}
