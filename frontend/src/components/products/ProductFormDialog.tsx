"use client";

import React, { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Card,
  CardActionArea,
  CardHeader,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  Stack,
  Switch,
  TextField,
  Typography,
  useMediaQuery,
  useTheme,
} from "@mui/material";
import { LoadingButton } from "@mui/lab";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Autocomplete } from "@mui/material";
import { z } from "zod";
import FactoryIcon from "@mui/icons-material/Factory";
import Inventory2Icon from "@mui/icons-material/Inventory2";
import type { Product, ProductReference, ProductType } from "@/types/product";

export interface SelectOption {
  value: string;
  label: string;
  helper?: string;
}

export interface ProductFormPayload {
  product_type: ProductType;
  brand_id: string;
  category_id: string;
  factory_id: string | null;
  sku: string;
  name: string;
  bangla_name: string | null;
  description: string;
  tags: string[];
  unit: string;
  trade_price: number;
  db_price: number | null;
  mrp: number | null;
  wt_pcs: number;
  ctn_pcs: number | null;
  launch_date: string | null;
  decommission_date: string | null;
  image_url: string | null;
  erp_id: number | null;
  active: boolean;
}

interface ProductFormDialogProps {
  open: boolean;
  mode: "create" | "edit";
  initialProduct?: Product | null;
  brands: SelectOption[];
  categories: SelectOption[];
  factories: SelectOption[];
  submitting?: boolean;
  onClose: () => void;
  onSubmit: (payload: ProductFormPayload) => Promise<void>;
}

const PRODUCT_UNITS = ["BAG", "BOX", "CASE", "CTN", "JAR", "POUCH", "PCS"] as const;
const MANUFACTURED_UNITS = new Set(["BAG", "BOX", "CASE", "CTN", "JAR", "POUCH"]);

const productFormSchema = z
  .object({
    product_type: z.union([z.literal("MANUFACTURED"), z.literal("PROCURED")]),
    brand_id: z.string().min(1, "Brand is required"),
    category_id: z.string().min(1, "Category is required"),
    factory_id: z.string().optional().nullable(),
    sku: z.string().min(1, "SKU is required"),
    name: z.string().min(1, "Product name is required"),
    bangla_name: z.string().optional().nullable(),
    description: z.string().optional().nullable(),
    tags: z.array(z.string()).optional(),
    unit: z.string().min(1, "Unit is required"),
    trade_price: z.string().min(1, "Trade price is required"),
    db_price: z.string().optional().nullable(),
    mrp: z.string().optional().nullable(),
    wt_pcs: z.string().min(1, "Weight per piece is required"),
    ctn_pcs: z.string().optional().nullable(),
    launch_date: z.string().optional().nullable(),
    decommission_date: z.string().optional().nullable(),
    image_url: z.string().optional().nullable(),
    erp_id: z.string().optional().nullable(),
    active: z.boolean().optional(),
  })
  .superRefine((values, ctx) => {
    if (values.product_type === "MANUFACTURED") {
      if (!values.factory_id) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["factory_id"],
          message: "Factory is required for manufactured products",
        });
      }
      if (!MANUFACTURED_UNITS.has(values.unit.toUpperCase())) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["unit"],
          message: "Select a valid packaging unit",
        });
      }
      if (!values.db_price || Number.isNaN(Number(values.db_price))) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["db_price"],
          message: "DB price is required",
        });
      }
      if (!values.mrp || Number.isNaN(Number(values.mrp))) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["mrp"],
          message: "MRP is required",
        });
      }
      if (!values.ctn_pcs || Number.isNaN(Number(values.ctn_pcs))) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["ctn_pcs"],
          message: "Pieces per carton is required",
        });
      }
    }

    if (values.product_type === "PROCURED") {
      if (values.unit !== "PCS") {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["unit"],
          message: "Procured products must use PCS",
        });
      }
    }
  });

type ProductFormValues = z.infer<typeof productFormSchema>;

type ReferenceLike =
  | string
  | (ProductReference & { name?: string; product_segment?: string })
  | null
  | undefined;

const toOptionValue = (value: ReferenceLike): string => {
  if (!value) return "";
  if (typeof value === "string") return value;
  return value._id;
};

const sanitizeNumber = (value: string | null | undefined): number | null => {
  if (value === undefined || value === null) return null;
  const trimmed = value.toString().trim();
  if (!trimmed) return null;
  const parsed = Number(trimmed);
  return Number.isNaN(parsed) ? null : parsed;
};

const sanitizeString = (value: string | null | undefined): string | null => {
  if (value === undefined || value === null) return null;
  const trimmed = value.trim();
  return trimmed.length ? trimmed : null;
};

export const ProductFormDialog: React.FC<ProductFormDialogProps> = ({
  open,
  mode,
  initialProduct,
  brands,
  categories,
  factories,
  submitting = false,
  onClose,
  onSubmit,
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));

  const [selectedType, setSelectedType] = useState<ProductType | null>(
    initialProduct?.product_type ?? null
  );

  const {
    control,
    handleSubmit,
    reset,
    setValue,
    watch,
    trigger,
    getValues,
    formState: { errors },
  } = useForm<ProductFormValues>({
    resolver: zodResolver(productFormSchema),
    defaultValues: {
      product_type: initialProduct?.product_type ?? "MANUFACTURED",
      brand_id: "",
      category_id: "",
      factory_id: null,
      sku: "",
      name: "",
      bangla_name: "",
      description: "",
      tags: [],
      unit: "",
      trade_price: "",
      db_price: "",
      mrp: "",
      wt_pcs: "",
      ctn_pcs: "",
      launch_date: "",
      decommission_date: "",
      image_url: "",
      erp_id: "",
      active: true,
    },
  });

  const watchProductType = watch("product_type");
  const effectiveType: ProductType | null = selectedType ?? watchProductType ?? null;
  const isManufactured = effectiveType === "MANUFACTURED";

  useEffect(() => {
    if (open) {
      if (initialProduct) {
        const {
          product_type,
          brand_id,
          category_id,
          factory_id,
          sku,
          name,
          bangla_name,
          description,
          tags,
          unit,
          trade_price,
          db_price,
          mrp,
          wt_pcs,
          ctn_pcs,
          launch_date,
          decommission_date,
          image_url,
          erp_id,
          active,
        } = initialProduct;

        const factoryValue = toOptionValue(factory_id);
        setSelectedType(product_type);
        reset({
          product_type,
          brand_id: toOptionValue(brand_id),
          category_id: toOptionValue(category_id),
          factory_id: factoryValue || null,
          sku,
          name,
          bangla_name: bangla_name ?? "",
          description: description ?? "",
          tags: tags ?? [],
          unit,
          trade_price: trade_price?.toString() ?? "",
          db_price: db_price?.toString() ?? "",
          mrp: mrp?.toString() ?? "",
          wt_pcs: wt_pcs?.toString() ?? "",
          ctn_pcs: ctn_pcs?.toString() ?? "",
          launch_date: launch_date?.substring(0, 10) ?? "",
          decommission_date: decommission_date?.substring(0, 10) ?? "",
          image_url: image_url ?? "",
          erp_id: erp_id != null ? erp_id.toString() : "",
          active: active ?? true,
        });
      } else {
        setSelectedType(null);
        reset({
          product_type: "MANUFACTURED",
          brand_id: "",
          category_id: "",
          factory_id: null,
          sku: "",
          name: "",
          bangla_name: "",
          description: "",
          tags: [],
          unit: "",
          trade_price: "",
          db_price: "",
          mrp: "",
          wt_pcs: "",
          ctn_pcs: "",
          launch_date: "",
          decommission_date: "",
          image_url: "",
          erp_id: "",
          active: true,
        });
      }
    }
  }, [open, initialProduct, reset]);

  useEffect(() => {
    if (!selectedType) return;

    setValue("product_type", selectedType);

    if (selectedType === "PROCURED") {
      setValue("unit", "PCS", { shouldValidate: true });
      setValue("factory_id", null);
      setValue("db_price", "");
      setValue("mrp", "");
      setValue("ctn_pcs", "");
      setValue("bangla_name", "");
      setValue("launch_date", "");
      setValue("decommission_date", "");
      setValue("erp_id", "");
    } else if (selectedType === "MANUFACTURED") {
      const currentUnit = getValues("unit");
      if (!currentUnit || currentUnit === "PCS") {
        setValue("unit", "BOX");
      }
    }

    trigger(["unit"]);
  }, [selectedType, setValue, trigger, getValues]);

  const unitOptions = useMemo(() => {
    if (!selectedType || selectedType === "MANUFACTURED") {
      return PRODUCT_UNITS.filter((unit) => unit !== "PCS");
    }
    return ["PCS"];
  }, [selectedType]);

  const handleTypeSelection = (type: ProductType) => {
    setSelectedType(type);
  };

  const handleFormSubmit = async (values: ProductFormValues) => {
    const payload: ProductFormPayload = {
      product_type: selectedType ?? values.product_type,
      brand_id: values.brand_id,
      category_id: values.category_id,
      factory_id: isManufactured ? values.factory_id || null : null,
      sku: values.sku.trim().toUpperCase(),
      name: values.name.trim(),
      bangla_name: isManufactured ? sanitizeString(values.bangla_name) : null,
      description: sanitizeString(values.description) ?? "",
      tags: Array.from(new Set(values.tags ?? [])).map((tag) => tag.trim()).filter(Boolean),
      unit: selectedType === "PROCURED" ? "PCS" : values.unit.trim().toUpperCase(),
      trade_price: sanitizeNumber(values.trade_price) ?? 0,
      db_price: isManufactured ? sanitizeNumber(values.db_price) : null,
      mrp: isManufactured ? sanitizeNumber(values.mrp) : null,
      wt_pcs: sanitizeNumber(values.wt_pcs) ?? 0,
      ctn_pcs: isManufactured ? sanitizeNumber(values.ctn_pcs) : null,
      launch_date: isManufactured ? sanitizeString(values.launch_date) : null,
      decommission_date: isManufactured ? sanitizeString(values.decommission_date) : null,
      image_url: sanitizeString(values.image_url),
      erp_id: isManufactured ? sanitizeNumber(values.erp_id) : null,
      active: values.active ?? true,
    };

    await onSubmit(payload);
  };

  const dialogTitle = mode === "edit" ? "Edit Product" : "Add New Product";

  const disableForm = !selectedType && mode === "create";

  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullScreen={isMobile}
      maxWidth="md"
      fullWidth
      aria-labelledby="product-form-dialog"
    >
      <DialogTitle id="product-form-dialog">{dialogTitle}</DialogTitle>
      <DialogContent dividers sx={{ pb: 3 }}>
        {mode === "create" && (
          <Box sx={{ mb: 3 }}>
            <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>
              Step 1 • Select Product Type
            </Typography>
            <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
              <Card
                variant={selectedType === "MANUFACTURED" ? "elevation" : "outlined"}
                sx={{
                  flex: 1,
                  borderColor: selectedType === "MANUFACTURED" ? "primary.main" : "divider",
                }}
              >
                <CardActionArea onClick={() => handleTypeSelection("MANUFACTURED")}> 
                  <CardHeader
                    avatar={<FactoryIcon color="primary" />}
                    title="Manufactured"
                    subheader="Products produced in our factories"
                  />
                </CardActionArea>
              </Card>
              <Card
                variant={selectedType === "PROCURED" ? "elevation" : "outlined"}
                sx={{
                  flex: 1,
                  borderColor: selectedType === "PROCURED" ? "warning.main" : "divider",
                }}
              >
                <CardActionArea onClick={() => handleTypeSelection("PROCURED")}> 
                  <CardHeader
                    avatar={<Inventory2Icon color="warning" />}
                    title="Procured"
                    subheader="Products sourced from partners"
                  />
                </CardActionArea>
              </Card>
            </Stack>
            {!selectedType && (
              <Alert severity="info" sx={{ mt: 2 }}>
                Choose a product type to continue with details.
              </Alert>
            )}
          </Box>
        )}

        <Box component="form" id="product-form" onSubmit={handleSubmit(handleFormSubmit)}>
          <Stack spacing={3}>
            <Box>
              <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>
                Basic Information
              </Typography>
              <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
                <Controller
                  name="brand_id"
                  control={control}
                  render={({ field }) => {
                    const { value, onChange, ref, ...rest } = field;
                    return (
                      <TextField
                        {...rest}
                        inputRef={ref}
                        value={value ?? ""}
                        onChange={(event) => onChange(event.target.value)}
                        select
                        fullWidth
                        disabled={disableForm}
                        label="Brand"
                        error={Boolean(errors.brand_id)}
                        helperText={errors.brand_id?.message}
                        SelectProps={{
                          native: true,
                          inputProps: { "aria-label": "Brand" },
                        }}
                        InputLabelProps={{ shrink: true }}
                      >
                        <option value="" disabled>
                          Select brand
                        </option>
                        {brands.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </TextField>
                    );
                  }}
                />
                <Controller
                  name="category_id"
                  control={control}
                  render={({ field }) => {
                    const { value, onChange, ref, ...rest } = field;
                    return (
                      <TextField
                        {...rest}
                        inputRef={ref}
                        value={value ?? ""}
                        onChange={(event) => onChange(event.target.value)}
                        select
                        fullWidth
                        disabled={disableForm}
                        label="Category"
                        error={Boolean(errors.category_id)}
                        helperText={errors.category_id?.message}
                        SelectProps={{
                          native: true,
                          inputProps: { "aria-label": "Category" },
                        }}
                        InputLabelProps={{ shrink: true }}
                      >
                        <option value="" disabled>
                          Select category
                        </option>
                        {categories.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </TextField>
                    );
                  }}
                />
              </Stack>
              <Stack direction={{ xs: "column", sm: "row" }} spacing={2} sx={{ mt: 2 }}>
                <Controller
                  name="sku"
                  control={control}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      label="SKU"
                      fullWidth
                      disabled={disableForm}
                      error={Boolean(errors.sku)}
                      helperText={errors.sku?.message}
                    />
                  )}
                />
                <Controller
                  name="name"
                  control={control}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      label="Product Name"
                      fullWidth
                      disabled={disableForm}
                      error={Boolean(errors.name)}
                      helperText={errors.name?.message}
                    />
                  )}
                />
              </Stack>
              {isManufactured && (
                <Controller
                  name="bangla_name"
                  control={control}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      label="Bangla Name"
                      fullWidth
                      sx={{ mt: 2 }}
                      disabled={disableForm}
                    />
                  )}
                />
              )}
              <Controller
                name="description"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    label="Description"
                    multiline
                    rows={3}
                    fullWidth
                    sx={{ mt: 2 }}
                    disabled={disableForm}
                  />
                )}
              />
              <Controller
                name="tags"
                control={control}
                render={({ field }) => (
                  <Autocomplete
                    multiple
                    freeSolo
                    options={[]}
                    value={field.value ?? []}
                    onChange={(_, value) => field.onChange(value)}
                    renderInput={(params) => (
                      <TextField
                        {...params}
                        label="Tags"
                        placeholder="Press enter to add tag"
                        sx={{ mt: 2 }}
                      />
                    )}
                    disabled={disableForm}
                  />
                )}
              />
            </Box>

            {isManufactured && (
              <Box>
                <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>
                  Manufacturing Details
                </Typography>
                <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
                  <Controller
                    name="factory_id"
                    control={control}
                    render={({ field }) => {
                      const { value, onChange, ref, ...rest } = field;
                      return (
                        <TextField
                          {...rest}
                          inputRef={ref}
                          value={value ?? ""}
                          onChange={(event) => onChange(event.target.value)}
                          select
                          fullWidth
                          label="Factory"
                          error={Boolean(errors.factory_id)}
                          helperText={errors.factory_id?.message}
                          SelectProps={{
                            native: true,
                            inputProps: { "aria-label": "Factory" },
                          }}
                          InputLabelProps={{ shrink: true }}
                        >
                          <option value="" disabled>
                            Select factory
                          </option>
                          {factories.map((option) => (
                            <option key={option.value} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </TextField>
                      );
                    }}
                  />
                  <Controller
                    name="erp_id"
                    control={control}
                    render={({ field }) => (
                      <TextField
                        {...field}
                        label="ERP ID"
                        fullWidth
                        type="number"
                      />
                    )}
                  />
                </Stack>
                <Stack direction={{ xs: "column", sm: "row" }} spacing={2} sx={{ mt: 2 }}>
                  <Controller
                    name="launch_date"
                    control={control}
                    render={({ field }) => (
                      <TextField
                        {...field}
                        label="Launch Date"
                        type="date"
                        fullWidth
                        InputLabelProps={{ shrink: true }}
                      />
                    )}
                  />
                  <Controller
                    name="decommission_date"
                    control={control}
                    render={({ field }) => (
                      <TextField
                        {...field}
                        label="Decommission Date"
                        type="date"
                        fullWidth
                        InputLabelProps={{ shrink: true }}
                      />
                    )}
                  />
                </Stack>
              </Box>
            )}

            <Box>
              <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>
                Pricing & Packaging
              </Typography>
              <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
                <Controller
                  name="unit"
                  control={control}
                  render={({ field }) => {
                    const { value, onChange, ref, ...rest } = field;
                    return (
                      <TextField
                        {...rest}
                        inputRef={ref}
                        value={value ?? ""}
                        onChange={(event) => onChange(event.target.value)}
                        select
                        fullWidth
                        label="Unit"
                        disabled={selectedType === "PROCURED" || disableForm}
                        error={Boolean(errors.unit)}
                        helperText={errors.unit?.message}
                        SelectProps={{
                          native: true,
                          inputProps: { "aria-label": "Unit" },
                        }}
                        InputLabelProps={{ shrink: true }}
                      >
                        <option value="" disabled>
                          Select unit
                        </option>
                        {unitOptions.map((unit) => (
                          <option key={unit} value={unit}>
                            {unit}
                          </option>
                        ))}
                      </TextField>
                    );
                  }}
                />
                <Controller
                  name="wt_pcs"
                  control={control}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      label="Weight per Piece (kg)"
                      type="number"
                      fullWidth
                      error={Boolean(errors.wt_pcs)}
                      helperText={errors.wt_pcs?.message}
                    />
                  )}
                />
              </Stack>

              {isManufactured && (
                <Controller
                  name="ctn_pcs"
                  control={control}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      label="Pieces per Carton"
                      type="number"
                      fullWidth
                      sx={{ mt: 2 }}
                      error={Boolean(errors.ctn_pcs)}
                      helperText={errors.ctn_pcs?.message}
                    />
                  )}
                />
              )}

              <Stack direction={{ xs: "column", sm: "row" }} spacing={2} sx={{ mt: 2 }}>
                <Controller
                  name="trade_price"
                  control={control}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      label="Trade Price (৳)"
                      type="number"
                      fullWidth
                      error={Boolean(errors.trade_price)}
                      helperText={errors.trade_price?.message}
                    />
                  )}
                />
                {isManufactured && (
                  <Controller
                    name="db_price"
                    control={control}
                    render={({ field }) => (
                      <TextField
                        {...field}
                        label="DB Price (৳)"
                        type="number"
                        fullWidth
                        error={Boolean(errors.db_price)}
                        helperText={errors.db_price?.message}
                      />
                    )}
                  />
                )}
                {isManufactured && (
                  <Controller
                    name="mrp"
                    control={control}
                    render={({ field }) => (
                      <TextField
                        {...field}
                        label="MRP (৳)"
                        type="number"
                        fullWidth
                        error={Boolean(errors.mrp)}
                        helperText={errors.mrp?.message}
                      />
                    )}
                  />
                )}
              </Stack>
            </Box>

            <Box>
              <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>
                Media
              </Typography>
              <Controller
                name="image_url"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    label="Image URL"
                    fullWidth
                    placeholder="https://example.com/product.jpg"
                  />
                )}
              />
            </Box>

            <FormControlLabel
              control={
                <Controller
                  name="active"
                  control={control}
                  render={({ field }) => (
                    <Switch
                      {...field}
                      checked={Boolean(field.value)}
                      color="success"
                    />
                  )}
                />
              }
              label="Product is active"
              sx={{ alignSelf: "flex-start" }}
            />
          </Stack>
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} color="inherit">
          Cancel
        </Button>
        <LoadingButton
          form="product-form"
          type="submit"
          variant="contained"
          loading={submitting}
          disabled={disableForm}
        >
          {mode === "edit" ? "Save Changes" : "Create Product"}
        </LoadingButton>
      </DialogActions>
    </Dialog>
  );
};
