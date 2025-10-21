import React from 'react';
import { Box, Card, CardContent, Typography, useTheme } from '@mui/material';

interface StatCardProps {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  color: string;
  subtitle?: string;
  trend?: {
    value: number;
    label: string;
    isPositive: boolean;
  };
}

export default function StatCard({ 
  title, 
  value, 
  icon, 
  color, 
  subtitle,
  trend 
}: StatCardProps) {
  const theme = useTheme();

  return (
    <Card
      sx={{
        height: '100%',
        background: `linear-gradient(135deg, ${color}15 0%, ${color}05 100%)`,
        border: `1px solid ${color}30`,
        transition: 'all 0.3s ease-in-out',
        '&:hover': {
          transform: 'translateY(-4px)',
          boxShadow: 4,
          borderColor: `${color}60`,
        },
      }}
    >
      <CardContent>
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <Box sx={{ flex: 1 }}>
            <Typography 
              color="text.secondary" 
              gutterBottom 
              variant="body2"
              sx={{ fontWeight: 500 }}
            >
              {title}
            </Typography>
            <Typography 
              variant="h4" 
              component="div" 
              sx={{ 
                color, 
                fontWeight: 700,
                mb: subtitle || trend ? 1 : 0
              }}
            >
              {value}
            </Typography>
            
            {subtitle && (
              <Typography variant="caption" color="text.secondary">
                {subtitle}
              </Typography>
            )}
            
            {trend && (
              <Box 
                sx={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: 0.5,
                  mt: 0.5
                }}
              >
                <Typography
                  variant="caption"
                  sx={{
                    color: trend.isPositive 
                      ? theme.palette.success.main 
                      : theme.palette.error.main,
                    fontWeight: 600,
                  }}
                >
                  {trend.isPositive ? '↑' : '↓'} {Math.abs(trend.value)}%
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {trend.label}
                </Typography>
              </Box>
            )}
          </Box>
          
          <Box
            sx={{
              p: 2,
              borderRadius: 2,
              backgroundColor: `${color}20`,
              color: color,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {icon}
          </Box>
        </Box>
      </CardContent>
    </Card>
  );
}
