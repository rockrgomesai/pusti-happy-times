'use client';

import React from 'react';
import {
  Box,
  Card,
  CardContent,
  TextField,
  FormControl,
  FormGroup,
  FormControlLabel,
  Checkbox,
  Typography,
  Stack,
  FormHelperText
} from '@mui/material';
import type { ProductSegment } from '@/types/offer';

interface Screen1Props {
  data: {
    offerName: string;
    productSegments: ProductSegment[];
    validFrom: string;
    validTo: string;
  };
  onChange: (data: Partial<Screen1Props['data']>) => void;
  errors?: {
    offerName?: string;
    productSegments?: string;
    validFrom?: string;
    validTo?: string;
  };
}

export default function Screen1OfferScope({ data, onChange, errors }: Screen1Props) {
  const handleSegmentToggle = (segment: ProductSegment) => {
    const newSegments = data.productSegments.includes(segment)
      ? data.productSegments.filter(s => s !== segment)
      : [...data.productSegments, segment];
    onChange({ productSegments: newSegments });
  };

  // Get today's date in YYYY-MM-DD format for min date
  const today = new Date().toISOString().split('T')[0];

  return (
    <Box sx={{ width: '100%', maxWidth: 800, mx: 'auto', p: { xs: 2, sm: 3 } }}>
        <Card elevation={2}>
          <CardContent sx={{ p: { xs: 2, sm: 3 } }}>
            <Typography 
              variant="h5" 
              gutterBottom 
              sx={{ 
                fontSize: { xs: '1.25rem', sm: '1.5rem' },
                fontWeight: 600,
                mb: 3 
              }}
            >
              Screen 1: Offer Scope
            </Typography>

            <Stack spacing={3}>
              {/* Offer Name */}
              <TextField
                fullWidth
                label="Offer Name *"
                placeholder="e.g., Summer Mega Sale 2024"
                value={data.offerName}
                onChange={(e) => onChange({ offerName: e.target.value })}
                error={!!errors?.offerName}
                helperText={errors?.offerName}
                sx={{
                  '& .MuiOutlinedInput-root': {
                    fontSize: { xs: '0.9rem', sm: '1rem' }
                  }
                }}
              />

              {/* Product Segments */}
              <FormControl component="fieldset" error={!!errors?.productSegments}>
                <Typography 
                  variant="subtitle2" 
                  gutterBottom
                  sx={{ 
                    fontWeight: 600,
                    fontSize: { xs: '0.875rem', sm: '0.95rem' }
                  }}
                >
                  Product Segments *
                </Typography>
                <FormGroup row sx={{ gap: { xs: 1, sm: 2 } }}>
                  <FormControlLabel
                    control={
                      <Checkbox
                        checked={data.productSegments.includes('BIS')}
                        onChange={() => handleSegmentToggle('BIS')}
                        color="primary"
                      />
                    }
                    label={
                      <Box>
                        <Typography variant="body2" fontWeight={600}>
                          BIS (Biscuits)
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          All biscuit products
                        </Typography>
                      </Box>
                    }
                  />
                  <FormControlLabel
                    control={
                      <Checkbox
                        checked={data.productSegments.includes('BEV')}
                        onChange={() => handleSegmentToggle('BEV')}
                        color="primary"
                      />
                    }
                    label={
                      <Box>
                        <Typography variant="body2" fontWeight={600}>
                          BEV (Beverages)
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          All beverage products
                        </Typography>
                      </Box>
                    }
                  />
                </FormGroup>
                {errors?.productSegments && (
                  <FormHelperText>{errors.productSegments}</FormHelperText>
                )}
              </FormControl>

              {/* Date Range */}
              <Box>
                <Typography 
                  variant="subtitle2" 
                  gutterBottom
                  sx={{ 
                    fontWeight: 600,
                    fontSize: { xs: '0.875rem', sm: '0.95rem' },
                    mb: 2
                  }}
                >
                  Validity Period *
                </Typography>
                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                  <TextField
                    fullWidth
                    label="Valid From"
                    type="date"
                    value={data.validFrom}
                    onChange={(e) => onChange({ validFrom: e.target.value })}
                    error={!!errors?.validFrom}
                    helperText={errors?.validFrom}
                    InputLabelProps={{ shrink: true }}
                    inputProps={{ min: today }}
                    sx={{
                      '& .MuiOutlinedInput-root': {
                        fontSize: { xs: '0.9rem', sm: '1rem' }
                      }
                    }}
                  />
                  <TextField
                    fullWidth
                    label="Valid To"
                    type="date"
                    value={data.validTo}
                    onChange={(e) => onChange({ validTo: e.target.value })}
                    error={!!errors?.validTo}
                    helperText={errors?.validTo || (data.validFrom ? '' : 'Select "Valid From" date first')}
                    InputLabelProps={{ shrink: true }}
                    inputProps={{ min: data.validFrom || today }}
                    disabled={!data.validFrom}
                    sx={{
                      '& .MuiOutlinedInput-root': {
                        fontSize: { xs: '0.9rem', sm: '1rem' }
                      }
                    }}
                  />
                </Stack>
              </Box>

              {/* Info Message */}
              <Box 
                sx={{ 
                  bgcolor: 'info.lighter', 
                  p: 2, 
                  borderRadius: 1,
                  border: '1px solid',
                  borderColor: 'info.light'
                }}
              >
                <Typography variant="body2" color="info.darker">
                  💡 <strong>Tip:</strong> Selected product segments will be used to filter eligible distributors and products in the next steps.
                </Typography>
              </Box>
            </Stack>
          </CardContent>
        </Card>
      </Box>
  );
}
