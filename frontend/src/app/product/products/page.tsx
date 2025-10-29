'use client';

import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  CardHeader,
  Chip,
  CircularProgress,
  IconButton,
  InputAdornment,
  Paper,
  Stack,
  Tab,
  Tabs,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TablePagination,
  TableRow,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Tooltip,
  Typography,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import VisibilityIcon from '@mui/icons-material/Visibility';
import RefreshIcon from '@mui/icons-material/Refresh';
import ToggleOnIcon from '@mui/icons-material/ToggleOn';
import ToggleOffIcon from '@mui/icons-material/ToggleOff';
import SearchIcon from '@mui/icons-material/Search';
import LocalOfferIcon from '@mui/icons-material/LocalOffer';
import StorefrontIcon from '@mui/icons-material/Storefront';
import WarehouseIcon from '@mui/icons-material/Warehouse';
import CategoryIcon from '@mui/icons-material/Category';
import ViewModuleIcon from '@mui/icons-material/ViewModule';
import ViewListIcon from '@mui/icons-material/ViewList';
import { toast } from 'react-hot-toast';

import { productsApi, type ProductListParams } from '@/lib/api/products';
import api from '@/lib/api';
import type { Product, ProductListResponse, ProductType } from '@/types/product';
import { ProductTypeBadge } from '@/components/products/ProductTypeBadge';
import { ProductDetailDrawer } from '@/components/products/ProductDetailDrawer';
import {
  ProductFormDialog,
  type ProductFormPayload,
  type SelectOption,
} from '@/components/products/ProductFormDialog';
import ColumnVisibilityMenu from '@/components/common/ColumnVisibilityMenu';
import ExportMenu from '@/components/common/ExportMenu';
import type { ExportColumn } from '@/lib/exportUtils';
import { formatDateForExport } from '@/lib/exportUtils';
import { calculateTableMinWidth } from '@/lib/tableUtils';
import { DEFAULT_PRODUCT_IMAGE, resolveProductImageSrc } from '@/lib/productImage';


interface ProductTableRow extends Product {
  id: string;
}

interface ProductColumnDefinition {
  id: string;
  label: string;
  align?: 'inherit' | 'left' | 'center' | 'right' | 'justify';
  minWidth?: number;
  alwaysVisible?: boolean;
  renderCell: (product: ProductTableRow) => React.ReactNode;
}

type ViewMode = 'table' | 'grid';

type ActiveFilter = 'ALL' | 'true' | 'false';

const useIsomorphicLayoutEffect = typeof window !== 'undefined' ? useLayoutEffect : useEffect;

const DEFAULT_PAGE_SIZE = 10;
const PAGE_SIZE_OPTIONS = [10, 25, 50];

const formatCurrency = (value: number | null | undefined) => {
  if (value === null || value === undefined) return '-';
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'BDT',
    maximumFractionDigits: 0,
  }).format(value);
};

const formatDate = (value?: string) => {
  if (!value) return '-';
  return new Date(value).toLocaleDateString('en-BD', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
};

const resolveRefLabel = (value: unknown, fallback = '-') => {
  if (!value) return fallback;
  if (typeof value === 'string') return value;
  if (typeof value === 'object' && value !== null) {
    const record = value as Record<string, string>;
    return record.brand || record.name || record.product_segment || fallback;
  }
  return fallback;
};

const mapToOptions = (
  records: Array<{ _id: string; name?: string; brand?: string; label?: string }> = [],
  helperKey?: string,
): SelectOption[] =>
  records.map((item) => ({
    value: item._id,
    label: item.name || item.brand || item.label || 'Unknown',
    helper:
      helperKey && (item as Record<string, string>)[helperKey]
        ? (item as Record<string, string>)[helperKey]
        : undefined,
  }));

const buildTableRows = (products: Product[]): ProductTableRow[] =>
  products.map((product) => ({
    ...product,
    id: product._id,
  }));

const formatNumber = (value: number | null | undefined) => {
  if (value === null || value === undefined) return '-';
  const formatter = new Intl.NumberFormat('en-IN', {
    maximumFractionDigits: Number.isInteger(value) ? 0 : 2,
  });
  return formatter.format(value);
};

const formatNullableDate = (value?: string | null) => {
  if (!value) return '-';
  return formatDate(value);
};

const resolveDepotDisplay = (product: ProductTableRow) => {
  if (Array.isArray(product.depot_ids) && product.depot_ids.length) {
    return product.depot_ids
      .map((depot) => resolveRefLabel(depot, ''))
      .filter(Boolean)
      .join(', ');
  }
  return 'No depot';
};

const chipColor = (active: boolean) => (active ? 'success' : 'default');

const PRODUCT_COLUMN_STORAGE_KEY = 'product:products:visibleColumns';
const EXPORT_PAGE_SIZE = 200;
const MAX_EXPORT_PAGES = 50;


const ProductsPage: React.FC = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const isMountedRef = useRef(false);

  const [loading, setLoading] = useState(false);
  const [metadataLoading, setMetadataLoading] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const [rowCount, setRowCount] = useState(0);
  const [viewMode, setViewMode] = useState<ViewMode>('table');
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<ProductType | 'ALL'>('ALL');
  const [activeFilter, setActiveFilter] = useState<ActiveFilter>('ALL');
  const [brandFilter, setBrandFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [depotFilter, setDepotFilter] = useState('');

  const [brands, setBrands] = useState<SelectOption[]>([]);
  const [categories, setCategories] = useState<SelectOption[]>([]);
  const [depots, setDepots] = useState<SelectOption[]>([]);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogMode, setDialogMode] = useState<'create' | 'edit'>('create');
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [detailDrawerOpen, setDetailDrawerOpen] = useState(false);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [visibleProductColumnIds, setVisibleProductColumnIds] = useState<string[]>([]);
  const [persistedProductColumnIds, setPersistedProductColumnIds] = useState<string[]>([]);
  const columnStateHydratedRef = useRef(false);

  useIsomorphicLayoutEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const loadMetadata = useCallback(async () => {
    if (!isMountedRef.current) return;
    try {
      setMetadataLoading(true);
      const [brandResponse, categoryResponse, depotResponse] = await Promise.allSettled([
        api.get('/brands', { params: { limit: 200 } }),
        api.get('/categories', { params: { limit: 200, active: true } }),
        api.get('/facilities/depots'),
      ]);

      if (brandResponse.status === 'fulfilled' && isMountedRef.current) {
        const records = (brandResponse.value.data?.data || []) as Array<{ _id: string; brand: string }>;
        setBrands(mapToOptions(records.map(({ _id, brand }) => ({ _id, name: brand }))));
      }

      if (categoryResponse.status === 'fulfilled' && isMountedRef.current) {
        const records = (categoryResponse.value.data?.data || []) as Array<{
          _id: string;
          name: string;
          product_segment?: string;
        }>;
        setCategories(
          records.map((item) => ({
            value: item._id,
            label: item.name,
            helper: item.product_segment,
          })),
        );
      }

      if (depotResponse.status === 'fulfilled' && isMountedRef.current) {
        const records = (depotResponse.value.data?.data || []) as Array<{ _id: string; name: string }>;
        setDepots(mapToOptions(records));
      }
    } catch (error) {
      console.error('Failed to load metadata', error);
      if (isMountedRef.current) {
        toast.error('Failed to load supporting data');
      }
    } finally {
      if (isMountedRef.current) {
        setMetadataLoading(false);
      }
    }
  }, []);

  const buildProductQueryParams = useCallback(
    (pagination: { page: number; limit: number }): ProductListParams => {
      const params: ProductListParams = {
        page: pagination.page,
        limit: pagination.limit,
        sort: 'updated_at:desc',
      };

      const trimmedSearch = search.trim();
      if (trimmedSearch) {
        params.search = trimmedSearch;
      }
      if (typeFilter !== 'ALL') {
        params.product_type = typeFilter;
      }
      if (activeFilter !== 'ALL') {
        params.active = activeFilter;
      }
      if (brandFilter) {
        params.brand_id = brandFilter;
      }
      if (categoryFilter) {
        params.category_id = categoryFilter;
      }
      if (depotFilter) {
        params.depot_id = depotFilter;
      }

      return params;
    },
    [activeFilter, brandFilter, categoryFilter, depotFilter, search, typeFilter],
  );

  const loadProducts = useCallback(async () => {
    if (!isMountedRef.current) return;
    setLoading(true);
    try {
      const params = buildProductQueryParams({ page: page + 1, limit: pageSize });

      const response: ProductListResponse = await productsApi.list(params);
      if (!isMountedRef.current) {
        return;
      }
      setProducts(response.data || []);
      setRowCount(response.pagination?.total || 0);
    } catch (error) {
      console.error('Failed to load products', error);
      if (isMountedRef.current) {
        toast.error('Failed to load products');
      }
    } finally {
      if (isMountedRef.current) {
        setLoading(false);
      }
    }
  }, [buildProductQueryParams, page, pageSize]);

  useEffect(() => {
    loadMetadata();
  }, [loadMetadata]);

  useEffect(() => {
    loadProducts();
  }, [loadProducts]);

  const handleRefresh = useCallback(() => {
    loadProducts();
  }, [loadProducts]);

  const handleViewModeChange = useCallback((
    _event: React.MouseEvent<HTMLElement>,
    nextViewMode: ViewMode | null,
  ) => {
    if (nextViewMode) {
      setViewMode(nextViewMode);
    }
  }, []);

  const handleOpenCreate = useCallback(() => {
    setDialogMode('create');
    setSelectedProduct(null);
    setDialogOpen(true);
  }, []);

  const handleOpenEdit = useCallback((product: Product) => {
    setDialogMode('edit');
    setSelectedProduct(product);
    setDialogOpen(true);
  }, []);

  const handleViewDetails = useCallback((product: Product) => {
    setSelectedProduct(product);
    setDetailDrawerOpen(true);
  }, []);

  const handleToggleActive = useCallback(async (product: Product) => {
    try {
      if (product.active) {
        await productsApi.deactivate(product._id);
        toast.success('Product deactivated');
      } else {
        await productsApi.activate(product._id);
        toast.success('Product activated');
      }
      loadProducts();
    } catch (error) {
      console.error('Failed to toggle product status', error);
      toast.error('Failed to update product status');
    }
  }, [loadProducts]);

  const handleSubmitProduct = async (payload: ProductFormPayload) => {
    try {
      if (!isMountedRef.current) return;
      setSubmitLoading(true);
      if (dialogMode === 'create') {
        await productsApi.create(payload);
        if (isMountedRef.current) {
          toast.success('Product created successfully');
        }
      } else if (selectedProduct?._id) {
        await productsApi.update(selectedProduct._id, payload);
        if (isMountedRef.current) {
          toast.success('Product updated successfully');
        }
      }
      if (isMountedRef.current) {
        setDialogOpen(false);
      }
  loadProducts();
    } catch (error) {
      console.error('Failed to save product', error);
      const message =
        (error as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        'Failed to save product';
      if (isMountedRef.current) {
        toast.error(message);
      }
      throw error;
    } finally {
      if (isMountedRef.current) {
        setSubmitLoading(false);
      }
    }
  };
  const renderProductActions = useCallback(
    (product: ProductTableRow) => {
      const isActive = Boolean(product.active);
      return (
        <Stack direction="row" spacing={1} justifyContent="flex-end">
          <Tooltip title="View details">
            <IconButton size="small" color="info" onClick={() => handleViewDetails(product)}>
              <VisibilityIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title="Edit product">
            <IconButton size="small" color="primary" onClick={() => handleOpenEdit(product)}>
              <EditIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title={isActive ? 'Deactivate product' : 'Activate product'}>
            <IconButton
              size="small"
              color={isActive ? 'warning' : 'success'}
              onClick={() => handleToggleActive(product)}
            >
              {isActive ? <ToggleOffIcon fontSize="small" /> : <ToggleOnIcon fontSize="small" />}
            </IconButton>
          </Tooltip>
        </Stack>
      );
    },
    [handleOpenEdit, handleToggleActive, handleViewDetails],
  );

  const productColumns = useMemo<ProductColumnDefinition[]>(
    () => [
      {
        id: 'overview',
        label: 'Product',
        minWidth: 320,
        alwaysVisible: true,
        renderCell: (product) => {
          const imageSrc = resolveProductImageSrc(product.image_url);
          return (
            <Stack direction="row" spacing={2} alignItems="flex-start">
              <Box
                sx={{
                  width: 72,
                  height: 72,
                  borderRadius: 1.5,
                  overflow: 'hidden',
                  border: '1px solid',
                  borderColor: 'divider',
                  flexShrink: 0,
                  bgcolor: 'background.paper',
                }}
              >
                <Box
                  component="img"
                  src={imageSrc}
                  alt={`${product.sku} thumbnail`}
                  sx={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                  onError={(event: React.SyntheticEvent<HTMLImageElement>) => {
                    event.currentTarget.onerror = null;
                    event.currentTarget.src = DEFAULT_PRODUCT_IMAGE;
                  }}
                />
              </Box>
              <Stack spacing={0.5} flex={1} minWidth={0}>
                <Stack direction="row" alignItems="center" spacing={1} justifyContent="space-between">
                  <Typography variant="subtitle1" sx={{ fontWeight: 600 }} noWrap>
                    {product.sku}
                  </Typography>
                  <ProductTypeBadge productType={product.product_type} />
                </Stack>
                {product.bangla_name && (
                  <Typography variant="body2" color="text.secondary" noWrap>
                    {product.bangla_name}
                  </Typography>
                )}
                <Typography variant="body2" color="text.secondary" noWrap>
                  Brand: {resolveRefLabel(product.brand_id)}
                </Typography>
                <Typography variant="body2" color="text.secondary" noWrap>
                  Category: {resolveRefLabel(product.category_id)}
                </Typography>
                <Typography variant="body2" color="text.secondary" noWrap>
                  Depot: {resolveDepotDisplay(product)}
                </Typography>
              </Stack>
            </Stack>
          );
        },
      },
      {
        id: 'unit',
        label: 'Unit',
        minWidth: 100,
        renderCell: (product) => product.unit ?? '-',
      },
      {
        id: 'trade_price',
        label: 'Trade Price',
        minWidth: 140,
        align: 'right',
        renderCell: (product) => formatCurrency(product.trade_price),
      },
      {
        id: 'db_price',
        label: 'DB Price',
        minWidth: 140,
        align: 'right',
        renderCell: (product) => formatCurrency(product.db_price ?? null),
      },
      {
        id: 'mrp',
        label: 'MRP',
        minWidth: 140,
        align: 'right',
        renderCell: (product) => formatCurrency(product.mrp ?? null),
      },
      {
        id: 'wt_pcs',
        label: 'Weight / Pcs',
        minWidth: 140,
        align: 'right',
        renderCell: (product) => formatNumber(product.wt_pcs),
      },
      {
        id: 'ctn_pcs',
        label: 'Carton Qty',
        minWidth: 140,
        align: 'right',
        renderCell: (product) => formatNumber(product.ctn_pcs ?? null),
      },
      {
        id: 'launch_date',
        label: 'Launch Date',
        minWidth: 150,
        renderCell: (product) => formatNullableDate(product.launch_date),
      },
      {
        id: 'decommission_date',
        label: 'Decommission Date',
        minWidth: 180,
        renderCell: (product) => formatNullableDate(product.decommission_date),
      },
      {
        id: 'erp_id',
        label: 'ERP ID',
        minWidth: 120,
        renderCell: (product) => (product.erp_id != null ? String(product.erp_id) : '-'),
      },
      {
        id: 'active',
        label: 'Status',
        minWidth: 130,
        renderCell: (product) => (
          <Chip
            label={product.active ? 'Active' : 'Inactive'}
            color={chipColor(Boolean(product.active))}
            size="small"
          />
        ),
      },
      {
        id: 'updated_at',
        label: 'Updated',
        minWidth: 170,
        renderCell: (product) => formatNullableDate(product.updated_at),
      },
      {
        id: 'created_at',
        label: 'Created',
        minWidth: 170,
        renderCell: (product) => formatNullableDate(product.created_at),
      },
      {
        id: 'actions',
        label: 'Actions',
        align: 'right',
        alwaysVisible: true,
        minWidth: 160,
        renderCell: renderProductActions,
      },
    ],
    [renderProductActions],
  );

  const productRows = useMemo(() => buildTableRows(products), [products]);

  const productColumnOptions = useMemo(
    () =>
      productColumns.map((column) => ({
        id: column.id,
        label: column.label,
        alwaysVisible: column.alwaysVisible,
      })),
    [productColumns],
  );

  const selectableProductColumnIds = useMemo(
    () => productColumnOptions.filter((option) => !option.alwaysVisible).map((option) => option.id),
    [productColumnOptions],
  );

  const sanitizeProductSelection = useCallback(
    (ids: string[]) => {
      if (!ids.length) {
        return [];
      }
      const allowed = new Set(selectableProductColumnIds);
      return ids.filter((id) => allowed.has(id));
    },
    [selectableProductColumnIds],
  );

  useEffect(() => {
    if (!selectableProductColumnIds.length) {
      setVisibleProductColumnIds([]);
      setPersistedProductColumnIds([]);
      return;
    }

    if (!columnStateHydratedRef.current) {
      columnStateHydratedRef.current = true;
      let initialSelection = selectableProductColumnIds;

      try {
        const stored = window.localStorage.getItem(PRODUCT_COLUMN_STORAGE_KEY);
        if (stored) {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed)) {
            const sanitized = sanitizeProductSelection(parsed);
            if (sanitized.length) {
              initialSelection = sanitized;
            }
          }
        }
      } catch (error) {
        console.warn('Failed to read product column preferences', error);
      }

      setVisibleProductColumnIds(initialSelection);
      setPersistedProductColumnIds(initialSelection);
      return;
    }

    setVisibleProductColumnIds((previous) => {
      const sanitizedPrevious = sanitizeProductSelection(previous);
      if (sanitizedPrevious.length) {
        return sanitizedPrevious;
      }
      return selectableProductColumnIds;
    });

    setPersistedProductColumnIds((previous) => {
      const sanitizedPrevious = sanitizeProductSelection(previous);
      if (sanitizedPrevious.length) {
        return sanitizedPrevious;
      }
      return selectableProductColumnIds;
    });
  }, [sanitizeProductSelection, selectableProductColumnIds]);

  const visibleColumnIds = useMemo(
    () => (visibleProductColumnIds.length ? visibleProductColumnIds : selectableProductColumnIds),
    [selectableProductColumnIds, visibleProductColumnIds],
  );

  const visibleProductColumns = useMemo(
    () =>
      productColumns.filter((column) => column.alwaysVisible || visibleColumnIds.includes(column.id)),
    [productColumns, visibleColumnIds],
  );

  const tableMinWidth = useMemo(
    () => calculateTableMinWidth(visibleProductColumns.length, 160, 1200),
    [visibleProductColumns.length],
  );

  const handleVisibleProductColumnsChange = useCallback(
    (nextSelected: string[]) => {
      const sanitized = sanitizeProductSelection(nextSelected);
      if (sanitized.length) {
        setVisibleProductColumnIds(sanitized);
        return;
      }
      setVisibleProductColumnIds(selectableProductColumnIds);
    },
    [sanitizeProductSelection, selectableProductColumnIds],
  );

  const productHasUnsavedChanges = useMemo(() => {
    const normalizedPersisted =
      persistedProductColumnIds.length || !selectableProductColumnIds.length
        ? persistedProductColumnIds
        : selectableProductColumnIds;
    if (visibleColumnIds.length !== normalizedPersisted.length) {
      return true;
    }
    const persistedSet = new Set(normalizedPersisted);
    return visibleColumnIds.some((id) => !persistedSet.has(id));
  }, [persistedProductColumnIds, selectableProductColumnIds, visibleColumnIds]);

  const handleSaveProductColumnSelection = useCallback(() => {
    const sanitized = sanitizeProductSelection(visibleColumnIds);
    setVisibleProductColumnIds(sanitized);
    setPersistedProductColumnIds(sanitized);
    try {
      window.localStorage.setItem(PRODUCT_COLUMN_STORAGE_KEY, JSON.stringify(sanitized));
      toast.success('Column selection saved');
    } catch (error) {
      console.warn('Failed to persist product column preferences', error);
      toast.error('Failed to save column selection');
    }
  }, [sanitizeProductSelection, visibleColumnIds]);

  const productExportColumns = useMemo<ExportColumn<ProductTableRow>[]>(
    () => [
      {
        header: 'SKU',
        accessor: (row) => row.sku,
      },
      {
        header: 'Bangla Name',
        accessor: (row) => row.bangla_name ?? '',
      },
      {
        header: 'Type',
        accessor: (row) => row.product_type,
      },
      {
        header: 'Brand',
        accessor: (row) => resolveRefLabel(row.brand_id),
      },
      {
        header: 'Category',
        accessor: (row) => resolveRefLabel(row.category_id),
      },
      {
        header: 'Depot',
        accessor: (row) => resolveDepotDisplay(row),
      },
      {
        header: 'Unit',
        accessor: (row) => row.unit ?? '',
      },
      {
        header: 'Trade Price',
        accessor: (row) => formatCurrency(row.trade_price),
      },
      {
        header: 'DB Price',
        accessor: (row) => formatCurrency(row.db_price ?? null),
      },
      {
        header: 'MRP',
        accessor: (row) => formatCurrency(row.mrp ?? null),
      },
      {
        header: 'Weight / Pcs',
        accessor: (row) => formatNumber(row.wt_pcs),
      },
      {
        header: 'Carton Qty',
        accessor: (row) => formatNumber(row.ctn_pcs ?? null),
      },
      {
        header: 'Launch Date',
        accessor: (row) => formatDateForExport(row.launch_date),
      },
      {
        header: 'Decommission Date',
        accessor: (row) => formatDateForExport(row.decommission_date),
      },
      {
        header: 'ERP ID',
        accessor: (row) => (row.erp_id != null ? String(row.erp_id) : ''),
      },
      {
        header: 'Status',
        accessor: (row) => (row.active ? 'Active' : 'Inactive'),
      },
      {
        header: 'Updated',
        accessor: (row) => formatDateForExport(row.updated_at),
      },
      {
        header: 'Created',
        accessor: (row) => formatDateForExport(row.created_at),
      },
    ],
    [],
  );

  const fetchAllProducts = useCallback(async (): Promise<ProductTableRow[]> => {
    const collected: ProductTableRow[] = [];
    let currentPage = 1;
    let totalPages = 1;

    while (currentPage <= totalPages && currentPage <= MAX_EXPORT_PAGES) {
      const params = buildProductQueryParams({ page: currentPage, limit: EXPORT_PAGE_SIZE });
      const response = await productsApi.list(params);
      const rows = response.data ?? [];
      collected.push(...buildTableRows(rows));

      const pagination = response.pagination;
      if (!pagination) {
        break;
      }

      if (pagination.pages && pagination.pages > 0) {
        totalPages = Math.max(pagination.pages, currentPage);
      } else if (pagination.total && pagination.limit) {
        const calculatedPages = Math.ceil(pagination.total / pagination.limit);
        totalPages = Math.max(calculatedPages, currentPage);
      }
      if (!rows.length || currentPage >= totalPages) {
        break;
      }

      currentPage += 1;
    }

    return collected;
  }, [buildProductQueryParams]);

  const showGridView = viewMode === 'grid';

  const filteredGridProducts = useMemo(() => {
    if (!showGridView) return [];
    return productRows;
  }, [productRows, showGridView]);

  const summaryText = useMemo(() => {
    if (rowCount > 0) {
      if (productRows.length === 0) {
        return `Showing 0 of ${rowCount} products`;
      }
      const start = page * pageSize + 1;
      const end = page * pageSize + productRows.length;
      return `Showing ${start}-${end} of ${rowCount} products`;
    }
    return `Showing ${productRows.length} products`;
  }, [page, pageSize, productRows.length, rowCount]);

  const handleChangePage = useCallback((_: unknown, newPage: number) => {
    setPage(newPage);
  }, []);

  const handleChangeRowsPerPage = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const newSize = parseInt(event.target.value, 10);
    if (Number.isNaN(newSize)) {
      return;
    }
    setPageSize(newSize);
    setPage(0);
  }, []);

  const renderTableView = useCallback(
    () => (
      <TableContainer component={Paper} sx={{ overflowX: 'auto' }}>
        <Table sx={{ minWidth: tableMinWidth }}>
          <TableHead>
            <TableRow>
              {visibleProductColumns.map((column) => {
                const isActions = column.id === 'actions';
                return (
                  <TableCell
                    key={column.id}
                    align={column.align}
                    sx={{
                      fontWeight: 600,
                      whiteSpace: 'nowrap',
                      backgroundColor: 'background.paper',
                      minWidth: column.minWidth,
                      ...(isActions
                        ? {
                            position: 'sticky',
                            right: 0,
                            zIndex: 3,
                            boxShadow: (theme) => `-4px 0 8px -4px ${theme.palette.grey[300]}`,
                          }
                        : {}),
                    }}
                  >
                    {column.label}
                  </TableCell>
                );
              })}
            </TableRow>
          </TableHead>
          <TableBody>
            {productRows.map((product) => (
              <TableRow key={product.id} hover>
                {visibleProductColumns.map((column) => {
                  const isActions = column.id === 'actions';
                  return (
                    <TableCell
                      key={column.id}
                      align={column.align}
                      sx={{
                        backgroundColor: 'background.paper',
                        minWidth: column.minWidth,
                        ...(isActions
                          ? {
                              position: 'sticky',
                              right: 0,
                              zIndex: 2,
                              boxShadow: (theme) => `-4px 0 8px -4px ${theme.palette.grey[200]}`,
                            }
                          : {}),
                      }}
                    >
                      {column.renderCell(product)}
                    </TableCell>
                  );
                })}
              </TableRow>
            ))}
          </TableBody>
        </Table>
        <TablePagination
          rowsPerPageOptions={PAGE_SIZE_OPTIONS}
          component="div"
          count={rowCount}
          rowsPerPage={pageSize}
          page={page}
          onPageChange={handleChangePage}
          onRowsPerPageChange={handleChangeRowsPerPage}
        />
      </TableContainer>
    ),
    [handleChangePage, handleChangeRowsPerPage, page, pageSize, productRows, rowCount, tableMinWidth, visibleProductColumns],
  );

  const controlsBar = (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, mb: 2 }}>
      <Box
        sx={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 2,
        }}
      >
        <TextField
          size="small"
          placeholder="Search products..."
          value={search}
          onChange={(event) => {
            setSearch(event.target.value);
            setPage(0);
          }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon fontSize="small" />
              </InputAdornment>
            ),
          }}
          sx={{ minWidth: { xs: '100%', md: 280 }, maxWidth: { md: 340 } }}
        />
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 1.5,
            flexWrap: 'wrap',
            justifyContent: { xs: 'flex-start', md: 'flex-end' },
          }}
        >
          <ExportMenu
            title="Product Report"
            fileBaseName="products"
            currentRows={productRows}
            columns={productExportColumns}
            onFetchAll={fetchAllProducts}
            disabled={loading || rowCount === 0}
          />

          <ColumnVisibilityMenu
            options={productColumnOptions}
            selected={visibleProductColumnIds}
            onChange={handleVisibleProductColumnsChange}
            onSaveSelection={handleSaveProductColumnSelection}
            saveDisabled={!productHasUnsavedChanges}
            minSelectable={1}
          />

          <ToggleButtonGroup
            value={viewMode}
            exclusive
            size="small"
            onChange={handleViewModeChange}
            aria-label="Toggle view mode"
          >
            <ToggleButton value="grid" aria-label="Grid view">
              <Tooltip title="Card View">
                <ViewModuleIcon fontSize="small" />
              </Tooltip>
            </ToggleButton>
            <ToggleButton value="table" aria-label="Table view">
              <Tooltip title="Table View">
                <ViewListIcon fontSize="small" />
              </Tooltip>
            </ToggleButton>
          </ToggleButtonGroup>
        </Box>
      </Box>
      <Typography variant="body2" color="text.secondary">
        {summaryText}
      </Typography>
    </Box>
  );

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} alignItems={{ xs: 'flex-start', md: 'center' }} justifyContent="space-between">
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 700 }}>
            Products
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Manage manufactured and procured product catalog with pricing, packaging, and lifecycle details.
          </Typography>
        </Box>
        <Stack direction="row" spacing={1} alignItems="center">
          <Tooltip title="Refresh">
            <span>
              <IconButton onClick={handleRefresh} disabled={loading} aria-label="Refresh product data">
                {loading ? <CircularProgress size={20} /> : <RefreshIcon />}
              </IconButton>
            </span>
          </Tooltip>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={handleOpenCreate}
            disabled={metadataLoading}
          >
            Add Product
          </Button>
        </Stack>
      </Stack>

      <Card>
        <CardHeader
          title="Filters"
          subheader="Refine catalog by product type, status, brand, or category"
          action={
            metadataLoading ? (
              <CircularProgress size={20} />
            ) : (
              <IconButton onClick={() => {
                setSearch('');
                setTypeFilter('ALL');
                setActiveFilter('ALL');
                setBrandFilter('');
                setCategoryFilter('');
                setDepotFilter('');
                setPage(0);
              }}
              aria-label="Reset filters"
              >
                <RefreshIcon />
              </IconButton>
            )
          }
        />
        <CardContent>
          <Stack spacing={3}>
            <Tabs
              value={typeFilter}
              onChange={(_event, value) => setTypeFilter(value)}
              variant={isMobile ? 'scrollable' : 'standard'}
              allowScrollButtonsMobile
            >
              <Tab label="All products" value="ALL" />
              <Tab label="Manufactured" value="MANUFACTURED" />
              <Tab label="Procured" value="PROCURED" />
            </Tabs>

            <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} alignItems={{ xs: 'stretch', md: 'center' }}>
              <ToggleButtonGroup
                value={activeFilter}
                exclusive
                onChange={(_event, value) => value && setActiveFilter(value)}
                size="small"
                color="primary"
              >
                <ToggleButton value="ALL">All statuses</ToggleButton>
                <ToggleButton value="true">Active</ToggleButton>
                <ToggleButton value="false">Inactive</ToggleButton>
              </ToggleButtonGroup>

              <TextField
                select
                label="Brand"
                value={brandFilter}
                onChange={(event) => setBrandFilter(event.target.value)}
                sx={{ minWidth: { xs: '100%', md: 220 } }}
                SelectProps={{ native: true }}
                InputLabelProps={{ shrink: true }}
                inputProps={{
                  name: 'brand-filter',
                  id: 'brand-filter',
                  'aria-label': 'Brand filter',
                  title: 'Brand filter',
                }}
              >
                <option value="">All brands</option>
                {brands.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </TextField>
              <TextField
                select
                label="Category"
                value={categoryFilter}
                onChange={(event) => setCategoryFilter(event.target.value)}
                sx={{ minWidth: { xs: '100%', md: 220 } }}
                SelectProps={{ native: true }}
                InputLabelProps={{ shrink: true }}
                inputProps={{
                  name: 'category-filter',
                  id: 'category-filter',
                  'aria-label': 'Category filter',
                  title: 'Category filter',
                }}
              >
                <option value="">All categories</option>
                {categories.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                    {option.helper ? ` (${option.helper})` : ''}
                  </option>
                ))}
              </TextField>
              <TextField
                select
                label="Depot"
                value={depotFilter}
                onChange={(event) => setDepotFilter(event.target.value)}
                sx={{ minWidth: { xs: '100%', md: 220 } }}
                SelectProps={{ native: true }}
                InputLabelProps={{ shrink: true }}
                inputProps={{
                  name: 'depot-filter',
                  id: 'depot-filter',
                  'aria-label': 'Depot filter',
                  title: 'Depot filter',
                }}
              >
                <option value="">All depots</option>
                {depots.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </TextField>
            </Stack>
          </Stack>
        </CardContent>
      </Card>

      {showGridView ? (
        <Card>
          <CardHeader
            title="Product cards"
            subheader="Grid view for quick scanning of product summaries"
          />
          <CardContent>
            {controlsBar}
            {loading ? (
              <Stack alignItems="center" sx={{ py: 6 }}>
                <CircularProgress />
              </Stack>
            ) : filteredGridProducts.length === 0 ? (
              <Alert severity="info">No products match the current filters.</Alert>
            ) : (
              <Stack
                direction="row"
                spacing={2}
                useFlexGap
                flexWrap="wrap"
                sx={{ '& > *': { flexBasis: { xs: '100%', sm: 'calc(50% - 16px)', lg: 'calc(33.33% - 16px)' } } }}
              >
                {filteredGridProducts.map((product) => {
                  const imageSrc = resolveProductImageSrc(product.image_url);
                  return (
                    <Card key={product._id} variant="outlined">
                      <CardContent>
                        <Stack spacing={1.5}>
                          <Box
                            sx={{
                              width: '100%',
                              height: 160,
                              borderRadius: 2,
                              overflow: 'hidden',
                              border: '1px solid',
                              borderColor: 'divider',
                              bgcolor: 'background.paper',
                            }}
                          >
                            <Box
                              component="img"
                              src={imageSrc}
                              alt={`${product.sku} preview`}
                              sx={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                              onError={(event: React.SyntheticEvent<HTMLImageElement>) => {
                                event.currentTarget.onerror = null;
                                event.currentTarget.src = DEFAULT_PRODUCT_IMAGE;
                              }}
                            />
                          </Box>
                          <Stack direction="row" spacing={1} alignItems="center" justifyContent="space-between">
                            <Typography variant="h6" sx={{ fontWeight: 600 }}>
                              {product.sku}
                            </Typography>
                            <ProductTypeBadge productType={product.product_type} />
                          </Stack>
                          {product.bangla_name && (
                            <Typography variant="body2" color="text.secondary">
                              {product.bangla_name}
                            </Typography>
                          )}
                          <Stack direction="row" spacing={1} alignItems="center">
                            <StorefrontIcon fontSize="small" color="primary" />
                            <Typography variant="body2" color="text.secondary">
                              {resolveRefLabel(product.brand_id)}
                            </Typography>
                          </Stack>
                          <Stack direction="row" spacing={1} alignItems="center">
                            <CategoryIcon fontSize="small" color="action" />
                            <Typography variant="body2" color="text.secondary">
                              {resolveRefLabel(product.category_id)}
                            </Typography>
                          </Stack>
                          <Stack direction="row" spacing={1} alignItems="center">
                            <WarehouseIcon fontSize="small" color="action" />
                            <Typography variant="body2" color="text.secondary">
                              {resolveDepotDisplay(product)}
                            </Typography>
                          </Stack>
                          <Stack direction="row" spacing={1} alignItems="center">
                            <LocalOfferIcon fontSize="small" color="success" />
                            <Typography variant="body2" color="text.secondary">
                              {formatCurrency(product.trade_price)}
                            </Typography>
                          </Stack>
                          <Stack direction="row" spacing={1}>
                            <Chip
                              label={product.active ? 'Active' : 'Inactive'}
                              size="small"
                              color={chipColor(product.active)}
                            />
                          </Stack>
                          <Stack direction="row" spacing={1}>
                            <Button
                              size="small"
                              startIcon={<VisibilityIcon fontSize="small" />}
                              onClick={() => handleViewDetails(product)}
                            >
                              View details
                            </Button>
                            <Button
                              size="small"
                              startIcon={<EditIcon fontSize="small" />}
                              onClick={() => handleOpenEdit(product)}
                            >
                              Edit
                            </Button>
                          </Stack>
                        </Stack>
                      </CardContent>
                    </Card>
                  );
                })}
              </Stack>
            )}
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader title="Product list" subheader="Table view with quick filters and actions" />
          <CardContent>
            {controlsBar}
            {loading ? (
              <Stack alignItems="center" sx={{ py: 6 }}>
                <CircularProgress />
              </Stack>
            ) : productRows.length === 0 ? (
              <Alert severity="info">No products match the current filters.</Alert>
            ) : (
              renderTableView()
            )}
          </CardContent>
        </Card>
      )}

      <ProductDetailDrawer
        open={detailDrawerOpen}
        product={detailDrawerOpen ? selectedProduct : null}
        onClose={() => setDetailDrawerOpen(false)}
      />

      <ProductFormDialog
        open={dialogOpen}
        mode={dialogMode}
        initialProduct={dialogMode === 'edit' ? selectedProduct : null}
        brands={brands}
        categories={categories}
  depots={depots}
        submitting={submitLoading}
        onClose={() => setDialogOpen(false)}
        onSubmit={handleSubmitProduct}
      />
    </Box>
  );
};

export default ProductsPage;
