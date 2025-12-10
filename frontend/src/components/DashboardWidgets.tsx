"use client";

import React, { useState, useEffect } from "react";
import {
  Box,
  Card,
  CardContent,
  CardActionArea,
  Typography,
  Grid2,
  CircularProgress,
  Icon,
  Chip,
} from "@mui/material";
import {
  PendingActions,
  Notifications,
  CheckCircle,
  Schedule,
  TrendingUp,
} from "@mui/icons-material";
import { useRouter } from "next/navigation";
import { apiClient } from "@/lib/api";

const iconMap = {
  PendingActions: PendingActions,
  Notifications: Notifications,
  CheckCircle: CheckCircle,
  Schedule: Schedule,
  TrendingUp: TrendingUp,
};

const colorMap = {
  primary: "primary.main",
  secondary: "secondary.main",
  success: "success.main",
  warning: "warning.main",
  error: "error.main",
  info: "info.main",
};

export default function DashboardWidgets() {
  const [widgets, setWidgets] = useState([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    loadWidgets();
  }, []);

  const loadWidgets = async () => {
    try {
      setLoading(true);
      const response = await apiClient.get("/dashboard/widgets");
      if (response.data.success) {
        setWidgets(response.data.data.widgets || []);
      }
    } catch (error) {
      console.error("Error loading dashboard widgets:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleWidgetClick = (widget) => {
    if (widget.action_url) {
      router.push(widget.action_url);
    }
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="200px">
        <CircularProgress />
      </Box>
    );
  }

  if (widgets.length === 0) {
    return null;
  }

  return (
    <Box sx={{ mb: 4 }}>
      <Typography variant="h6" gutterBottom sx={{ mb: 2 }}>
        Quick Overview
      </Typography>
      <Grid2 container spacing={2}>
        {widgets.map((widget) => {
          const IconComponent = iconMap[widget.icon] || PendingActions;
          const bgColor = colorMap[widget.color] || "primary.main";

          return (
            <Grid2 key={widget.id} size={{ xs: 12, sm: 6, md: 4, lg: 3 }}>
              <Card
                sx={{
                  height: "100%",
                  transition: "transform 0.2s, box-shadow 0.2s",
                  "&:hover": {
                    transform: "translateY(-4px)",
                    boxShadow: 4,
                  },
                }}
              >
                <CardActionArea onClick={() => handleWidgetClick(widget)} sx={{ height: "100%" }}>
                  <CardContent>
                    <Box
                      sx={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "flex-start",
                        mb: 2,
                      }}
                    >
                      <Box
                        sx={{
                          p: 1.5,
                          borderRadius: 2,
                          bgcolor: `${bgColor}15`,
                          color: bgColor,
                        }}
                      >
                        <IconComponent sx={{ fontSize: 32 }} />
                      </Box>
                      {widget.value > 0 && (
                        <Chip
                          label={widget.value}
                          color={widget.color}
                          size="small"
                          sx={{ fontWeight: "bold" }}
                        />
                      )}
                    </Box>

                    <Typography variant="h4" fontWeight="bold" gutterBottom>
                      {widget.value}
                    </Typography>

                    <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                      {widget.title}
                    </Typography>

                    {widget.description && (
                      <Typography variant="caption" color="text.secondary">
                        {widget.description}
                      </Typography>
                    )}

                    {widget.action_label && (
                      <Typography
                        variant="caption"
                        color={bgColor}
                        sx={{
                          mt: 1,
                          display: "block",
                          fontWeight: "bold",
                        }}
                      >
                        {widget.action_label} →
                      </Typography>
                    )}
                  </CardContent>
                </CardActionArea>
              </Card>
            </Grid2>
          );
        })}
      </Grid2>
    </Box>
  );
}
