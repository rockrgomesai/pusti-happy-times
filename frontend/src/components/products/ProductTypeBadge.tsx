"use client";

import React from "react";
import { Chip, ChipProps, useTheme } from "@mui/material";
import FactoryIcon from "@mui/icons-material/Factory";
import Inventory2Icon from "@mui/icons-material/Inventory2";
import type { ProductType } from "@/types/product";

interface ProductTypeBadgeProps extends Omit<ChipProps, "label" | "color"> {
  productType: ProductType;
  sizeVariant?: "small" | "medium";
}

export const ProductTypeBadge: React.FC<ProductTypeBadgeProps> = ({
  productType,
  sizeVariant = "small",
  ...rest
}) => {
  const theme = useTheme();
  const isManufactured = productType === "MANUFACTURED";

  const icon = isManufactured ? <FactoryIcon fontSize="small" /> : <Inventory2Icon fontSize="small" />;

  const palette = isManufactured
    ? {
        background: theme.palette.mode === "dark" ? "rgba(33, 150, 243, 0.16)" : "#E3F2FD",
        color: theme.palette.primary.dark,
      }
    : {
        background: theme.palette.mode === "dark" ? "rgba(255, 152, 0, 0.16)" : "#FFF3E0",
        color: theme.palette.warning.dark,
      };

  return (
    <Chip
      {...rest}
      icon={icon}
      label={isManufactured ? "Manufactured" : "Procured"}
      size={sizeVariant}
      sx={{
        fontWeight: 600,
        px: 1,
        border: "none",
        backgroundColor: palette.background,
        color: palette.color,
        "& .MuiChip-icon": {
          color: palette.color,
        },
        ...(rest.sx || {}),
      }}
    />
  );
};
