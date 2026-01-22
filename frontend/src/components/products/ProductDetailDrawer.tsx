"use client";

import React from "react";
import {
  Box,
  Chip,
  Divider,
  Drawer,
  IconButton,
  Stack,
  Typography,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import EventAvailableIcon from "@mui/icons-material/EventAvailable";
import EventBusyIcon from "@mui/icons-material/EventBusy";
import type { Product, ProductReference } from "@/types/product";
import { ProductTypeBadge } from "./ProductTypeBadge";
import { DEFAULT_PRODUCT_IMAGE, resolveProductImageSrc } from "@/lib/productImage";

interface ProductDetailDrawerProps {
  product: Product | null;
  open: boolean;
  onClose: () => void;
}

const formatCurrency = (value?: number | null) => {
  if (value === null || value === undefined) return "-";
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "BDT",
    maximumFractionDigits: 2,
  }).format(value);
};

const formatDate = (value?: string | null) => {
  if (!value) return "-";
  return new Date(value).toLocaleDateString("en-BD", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
};

const resolveRefName = (
  ref: string | ProductReference | null | undefined,
  fallback = "-"
) => {
  if (!ref) return fallback;
  if (typeof ref === "string") return ref;
  return ref.brand || ref.name || fallback;
};

const resolveDepotNames = (
  refs?: Array<string | ProductReference> | string | ProductReference | null,
  fallback = "-"
) => {
  if (!refs) return fallback ? [fallback] : [];
  const collection = Array.isArray(refs) ? refs : [refs];
  const names = collection
    .map((ref) => resolveRefName(ref, ""))
    .filter((name): name is string => Boolean(name));
  if (!names.length) {
    return fallback ? [fallback] : [];
  }
  return names;
};

export const ProductDetailDrawer: React.FC<ProductDetailDrawerProps> = ({
  product,
  open,
  onClose,
}) => {
  if (!product) return null;

  const {
    bangla_name,
    sku,
    product_type,
    unit,
    wt_pcs,
    ctn_pcs,
    trade_price,
    db_price,
    mrp,
    active,
    launch_date,
    decommission_date,
    created_at,
    created_by,
    updated_at,
    updated_by,
  } = product;

  const brand = resolveRefName(product.brand_id);
  const category = resolveRefName(product.category_id, "-");
  const depotRefs = product.depot_ids ?? [];
  const depots = resolveDepotNames(depotRefs, "-");
  const imageSrc = resolveProductImageSrc(product.image_url);

  const handleImageError = (event: React.SyntheticEvent<HTMLImageElement>) => {
    event.currentTarget.onerror = null;
    event.currentTarget.src = DEFAULT_PRODUCT_IMAGE;
  };

  return (
    <Drawer anchor="right" open={open} onClose={onClose} PaperProps={{ sx: { width: { xs: "100%", sm: 420, md: 520 } } }}>
      <Box sx={{ p: 3, pb: 6 }}>
        <Stack direction="row" alignItems="flex-start" justifyContent="space-between" spacing={2}>
          <Stack direction={{ xs: "column", sm: "row" }} spacing={2} flex={1}>
            <Box
              sx={{
                width: 128,
                height: 128,
                borderRadius: 2,
                border: "1px solid",
                borderColor: "divider",
                overflow: "hidden",
                flexShrink: 0,
              }}
            >
              <Box
                component="img"
                src={imageSrc}
                alt={`${sku} preview`}
                onError={handleImageError}
                sx={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
              />
            </Box>
            <Box>
              <Typography variant="h5" sx={{ fontWeight: 700 }}>
                {sku}
              </Typography>
              {bangla_name && (
                <Typography variant="subtitle1" color="text.secondary">
                  {bangla_name}
                </Typography>
              )}
              <Stack direction="row" spacing={1.5} sx={{ mt: 1.5 }}>
                <ProductTypeBadge productType={product_type} />
                <Chip
                  label={active ? "Active" : "Inactive"}
                  color={active ? "success" : "default"}
                  size="small"
                />
                <Chip label={`Unit: ${unit}`} size="small" variant="outlined" />
              </Stack>
            </Box>
          </Stack>
          <IconButton onClick={onClose} aria-label="Close product details">
            <CloseIcon />
          </IconButton>
        </Stack>

        <Box sx={{ mt: 3 }}>
          <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>
            Identifiers
          </Typography>
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: { xs: "1fr", sm: "repeat(2, minmax(0, 1fr))" },
              gap: 1.5,
            }}
          >
            <Box>
              <Typography variant="body2" color="text.secondary">
                SKU
              </Typography>
              <Typography variant="body1" sx={{ fontWeight: 600 }}>
                {sku}
              </Typography>
            </Box>
            <Box>
              <Typography variant="body2" color="text.secondary">
                Brand
              </Typography>
              <Typography variant="body1" sx={{ fontWeight: 600 }}>
                {brand}
              </Typography>
            </Box>
            <Box>
              <Typography variant="body2" color="text.secondary">
                Category
              </Typography>
              <Typography variant="body1" sx={{ fontWeight: 600 }}>
                {category}
              </Typography>
            </Box>
            <Box>
              <Typography variant="body2" color="text.secondary">
                Depots
              </Typography>
              <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ mt: 0.5 }}>
                {depots.map((name) => (
                  <Chip key={name} label={name} size="small" variant="outlined" />
                ))}
              </Stack>
            </Box>
          </Box>
        </Box>

        <Divider sx={{ my: 3 }} />

        <Box>
          <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>
            Pricing & Packaging
          </Typography>
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: { xs: "1fr", sm: "repeat(2, minmax(0, 1fr))" },
              gap: 1.5,
            }}
          >
            <Box>
              <Typography variant="body2" color="text.secondary">
                Trade Price
              </Typography>
              <Typography variant="body1" sx={{ fontWeight: 600 }}>
                {formatCurrency(trade_price)}
              </Typography>
            </Box>
            <Box>
              <Typography variant="body2" color="text.secondary">
                DB Price
              </Typography>
              <Typography variant="body1" sx={{ fontWeight: 600 }}>
                {formatCurrency(db_price)}
              </Typography>
            </Box>
            <Box>
              <Typography variant="body2" color="text.secondary">
                MRP
              </Typography>
              <Typography variant="body1" sx={{ fontWeight: 600 }}>
                {formatCurrency(mrp)}
              </Typography>
            </Box>
            <Box>
              <Typography variant="body2" color="text.secondary">
                Weight / Piece
              </Typography>
              <Typography variant="body1" sx={{ fontWeight: 600 }}>
                {wt_pcs} gm
              </Typography>
            </Box>
            <Box>
              <Typography variant="body2" color="text.secondary">
                Pieces / Carton
              </Typography>
              <Typography variant="body1" sx={{ fontWeight: 600 }}>
                {ctn_pcs ?? "-"}
              </Typography>
            </Box>
          </Box>
        </Box>

        <Divider sx={{ my: 3 }} />

        <Box>
          <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>
            Lifecycle
          </Typography>
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: { xs: "1fr", sm: "repeat(2, minmax(0, 1fr))" },
              gap: 1.5,
            }}
          >
            <Stack direction="row" spacing={1} alignItems="center">
              <EventAvailableIcon fontSize="small" color="primary" />
              <Box>
                <Typography variant="body2" color="text.secondary">
                  Launch Date
                </Typography>
                <Typography variant="body1" sx={{ fontWeight: 600 }}>
                  {formatDate(launch_date)}
                </Typography>
              </Box>
            </Stack>
            <Stack direction="row" spacing={1} alignItems="center">
              <EventBusyIcon fontSize="small" color="error" />
              <Box>
                <Typography variant="body2" color="text.secondary">
                  Decommissioned
                </Typography>
                <Typography variant="body1" sx={{ fontWeight: 600 }}>
                  {formatDate(decommission_date)}
                </Typography>
              </Box>
            </Stack>
          </Box>
        </Box>

        <Divider sx={{ my: 3 }} />

        <Divider sx={{ my: 3 }} />

        <Box>
          <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>
            Audit Trail
          </Typography>
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: { xs: "1fr", sm: "repeat(2, minmax(0, 1fr))" },
              gap: 1.5,
            }}
          >
            <Box>
              <Typography variant="body2" color="text.secondary">
                Created
              </Typography>
              <Typography variant="body2">
                {formatDate(created_at)}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                by {created_by || "system"}
              </Typography>
            </Box>
            <Box>
              <Typography variant="body2" color="text.secondary">
                Last Updated
              </Typography>
              <Typography variant="body2">
                {formatDate(updated_at)}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                by {updated_by || "system"}
              </Typography>
            </Box>
          </Box>
        </Box>
      </Box>
    </Drawer>
  );
};
