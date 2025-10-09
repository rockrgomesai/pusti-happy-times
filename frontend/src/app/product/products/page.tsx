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
  Stack,
  Tab,
  Tabs,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Tooltip,
  Typography,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import {
  DataGrid,
  GridActionsCellItem,
  GridColumnVisibilityModel,
  GridColDef,
} from '@mui/x-data-grid';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import VisibilityIcon from '@mui/icons-material/Visibility';
import RefreshIcon from '@mui/icons-material/Refresh';
import ToggleOnIcon from '@mui/icons-material/ToggleOn';
import ToggleOffIcon from '@mui/icons-material/ToggleOff';
import SearchIcon from '@mui/icons-material/Search';
import LocalOfferIcon from '@mui/icons-material/LocalOffer';
import StorefrontIcon from '@mui/icons-material/Storefront';
import FactoryIcon from '@mui/icons-material/Factory';
import CategoryIcon from '@mui/icons-material/Category';
import ViewModuleIcon from '@mui/icons-material/ViewModule';
import ViewListIcon from '@mui/icons-material/ViewList';
import { toast } from 'react-hot-toast';

import { productsApi, type ProductListParams } from '@/lib/api/products';
import api from '@/lib/api';
import type {
  Product,
  ProductListResponse,
  ProductType,
} from '@/types/product';
import { ProductTypeBadge } from '@/components/products/ProductTypeBadge';
import { ProductDetailDrawer } from '@/components/products/ProductDetailDrawer';
import {
  ProductFormDialog,
  ProductFormPayload,
  SelectOption,
} from '@/components/products/ProductFormDialog';
import ColumnVisibilityMenu from '@/components/common/ColumnVisibilityMenu';
import ExportMenu from '@/components/common/ExportMenu';
import type { ExportColumn } from '@/lib/exportUtils';
import { formatDateForExport } from '@/lib/exportUtils';

interface ProductTableRow extends Product {
  id: string;
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
    helper: helperKey && (item as Record<string, string>)[helperKey] ? (item as Record<string, string>)[helperKey] : undefined,
  }));

const buildTableRows = (products: Product[]): ProductTableRow[] =>
  products.map((product) => ({
    ...product,
    id: product._id,
  }));

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
  const [factoryFilter, setFactoryFilter] = useState('');

  const [brands, setBrands] = useState<SelectOption[]>([]);
  const [categories, setCategories] = useState<SelectOption[]>([]);
  const [factories, setFactories] = useState<SelectOption[]>([]);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogMode, setDialogMode] = useState<'create' | 'edit'>('create');
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [detailDrawerOpen, setDetailDrawerOpen] = useState(false);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [clientReady, setClientReady] = useState(false);
  const [visibleProductColumnIds, setVisibleProductColumnIds] = useState<string[]>([]);
  const [persistedProductColumnIds, setPersistedProductColumnIds] = useState<string[]>([]);
  const columnStateHydratedRef = useRef(false);

  const paginationModel = useMemo(
    () => ({ page, pageSize }),
    [page, pageSize],
  );

  useIsomorphicLayoutEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    setClientReady(true);
  }, []);

  const loadMetadata = useCallback(async () => {
    if (!isMountedRef.current) return;
    try {
      setMetadataLoading(true);
      const [brandResponse, categoryResponse, factoryResponse] = await Promise.allSettled([
        api.get('/brands', { params: { limit: 200 } }),
        api.get('/categories', { params: { limit: 200, active: true } }),
        api.get('/factories', { params: { limit: 200 } }),
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

      if (factoryResponse.status === 'fulfilled' && isMountedRef.current) {
        const records = (factoryResponse.value.data?.data || []) as Array<{ _id: string; name: string }>;
        setFactories(mapToOptions(records));
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
      if (factoryFilter) {
        params.factory_id = factoryFilter;
      }

      return params;
    },
    [activeFilter, brandFilter, categoryFilter, factoryFilter, search, typeFilter],
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

  const tableColumns: GridColDef<ProductTableRow>[] = useMemo(
    () => [
      {
        field: 'name',
        headerName: 'Product',
        flex: 1.5,
        minWidth: 240,
        renderCell: (params) => {
          const product = params.row;
          return (
            <Stack spacing={0.5}>
              <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                {product.name}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                SKU: {product.sku}
              </Typography>
              <Stack direction="row" spacing={0.75} alignItems="center">
                <StorefrontIcon fontSize="inherit" color="primary" />
                <Typography variant="caption" color="text.secondary">
                  {resolveRefLabel(product.brand_id)}
                </Typography>
              </Stack>
            </Stack>
          );
        },
      },
      {
        field: 'product_type',
        headerName: 'Type',
        width: 150,
        renderCell: (params) => <ProductTypeBadge productType={params.row.product_type as ProductType} />,
        sortable: false,
      },
      {
        field: 'trade_price',
        headerName: 'Trade Price',
        width: 150,
        valueFormatter: (value) => formatCurrency(Number(value)),
      },
      {
        field: 'unit',
        headerName: 'Unit',
        width: 100,
      },
      {
        field: 'category',
        headerName: 'Category',
        flex: 1,
        minWidth: 180,
        valueGetter: (value, row) => resolveRefLabel(row.category_id),
      },
      {
        field: 'active',
        headerName: 'Status',
        width: 120,
        renderCell: (params) => (
          <Chip
            label={params.row.active ? 'Active' : 'Inactive'}
            color={chipColor(params.row.active)}
            size="small"
          />
        ),
      },
      {
        field: 'updated_at',
        headerName: 'Updated',
        width: 170,
        valueFormatter: (value) => formatDate(String(value)),
      },
      {
        field: 'actions',
        headerName: 'Actions',
        type: 'actions',
        width: 170,
        minWidth: 170,
        sortable: false,
        filterable: false,
        getActions: (params) => {
          const product = params.row;
          const isActive = Boolean(product.active);
        interface ProductActionCellProps {
            product: ProductTableRow;
            isActive: boolean;
            handleViewDetails: (product: ProductTableRow) => void;
            handleOpenEdit: (product: ProductTableRow) => void;
            handleToggleActive: (product: ProductTableRow) => void;
        }

        const getProductActionCells = ({
            product,
            isActive,
            handleViewDetails,
            handleOpenEdit,
            handleToggleActive,
        }: ProductActionCellProps): React.ReactNode[] => [
            <GridActionsCellItem
                key="view"
                icon={
                    <VisibilityIcon
                        fontSize="small"
                        sx={{
                            color: 'info.main',
                            '&:hover': { color: 'info.dark' },
                        }}
                    />
                }
                label="View"
                onClick={() => handleViewDetails(product)}
                showInMenu={false}
            />,
            <GridActionsCellItem
                key="edit"
                icon={
                    <EditIcon
                        fontSize="small"
                        sx={{
                            color: 'primary.main',
                            '&:hover': { color: 'primary.dark' },
                        }}
                    />
                }
                label="Edit"
                onClick={() => handleOpenEdit(product)}
                showInMenu={false}
            />,
            <GridActionsCellItem
                key="toggle"
                icon={
                    isActive ? (
                        <ToggleOffIcon
                            fontSize="small"
                            sx={(theme) => ({
                                color: theme.palette.warning.main,
                                '&:hover': {
                                    color: theme.palette.warning.dark,
                                },
                            })}
                        />
                    ) : (
                        <ToggleOnIcon
                            fontSize="small"
                            sx={(theme) => ({
                                color: theme.palette.success.main,
                                '&:hover': {
                                    color: theme.palette.success.dark,
                                },
                            })}
                        />
                    )
                }
                label={isActive ? 'Deactivate' : 'Activate'}
                onClick={() => handleToggleActive(product)}
                showInMenu={false}
            />,
        ];

        return getProductActionCells({
            product: product as ProductTableRow,
            isActive,
            handleViewDetails,
            handleOpenEdit,
            handleToggleActive,
        });
        },
        align: 'center',
        headerAlign: 'center',
      },
    ],
    [handleOpenEdit, handleToggleActive, handleViewDetails],
  );

  const productRows = useMemo(() => buildTableRows(products), [products]);

  const productColumnOptions = useMemo(
    () =>
      tableColumns.map((column) => ({
        id: column.field,
        label: column.headerName ?? column.field,
        alwaysVisible: column.field === 'actions',
      })),
    [tableColumns],
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

  const effectiveVisibleProductColumnIds = useMemo(
    () => (visibleProductColumnIds.length ? visibleProductColumnIds : selectableProductColumnIds),
    [selectableProductColumnIds, visibleProductColumnIds],
  );

  const productColumnVisibilityModel = useMemo(() => {
    const hidden: GridColumnVisibilityModel = {};
    selectableProductColumnIds.forEach((id) => {
      if (!effectiveVisibleProductColumnIds.includes(id)) {
        hidden[id] = false;
      }
    });
    return hidden;
  }, [effectiveVisibleProductColumnIds, selectableProductColumnIds]);

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
    if (effectiveVisibleProductColumnIds.length !== persistedProductColumnIds.length) {
      return true;
    }
    const persistedSet = new Set(persistedProductColumnIds);
    return effectiveVisibleProductColumnIds.some((id) => !persistedSet.has(id));
  }, [effectiveVisibleProductColumnIds, persistedProductColumnIds]);

  const handleSaveProductColumnSelection = useCallback(() => {
    const sanitized = sanitizeProductSelection(effectiveVisibleProductColumnIds);
    setVisibleProductColumnIds(sanitized);
    setPersistedProductColumnIds(sanitized);
    try {
      window.localStorage.setItem(PRODUCT_COLUMN_STORAGE_KEY, JSON.stringify(sanitized));
      toast.success('Column selection saved');
    } catch (error) {
      console.warn('Failed to persist product column preferences', error);
      toast.error('Failed to save column selection');
    }
  }, [effectiveVisibleProductColumnIds, sanitizeProductSelection]);

  const productExportColumns = useMemo<ExportColumn<ProductTableRow>[]>(
    () => [
      {
        header: 'Product',
        accessor: (row) => row.name,
      },
      {
        header: 'SKU',
        accessor: (row) => row.sku,
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
        header: 'Factory',
        accessor: (row) => resolveRefLabel(row.factory_id, 'No factory'),
      },
      {
        header: 'Trade Price',
        accessor: (row) => formatCurrency(row.trade_price),
      },
      {
        header: 'Unit',
        accessor: (row) => row.unit ?? '',
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

  const displayedProductCount = productRows.length;
  const summaryText = `Showing ${displayedProductCount} of ${rowCount} products`;

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
            selected={effectiveVisibleProductColumnIds}
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
                setFactoryFilter('');
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
                inputProps={{ 'aria-label': 'Brand filter' }}
                aria-label="Brand filter"
                title="Brand filter"
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
                inputProps={{ 'aria-label': 'Category filter' }}
                aria-label="Category filter"
                title="Category filter"
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
                label="Factory"
                value={factoryFilter}
                onChange={(event) => setFactoryFilter(event.target.value)}
                sx={{ minWidth: { xs: '100%', md: 220 } }}
                SelectProps={{ native: true }}
                InputLabelProps={{ shrink: true }}
                inputProps={{ 'aria-label': 'Factory filter' }}
                aria-label="Factory filter"
                title="Factory filter"
              >
                <option value="">All factories</option>
                {factories.map((option) => (
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
                {filteredGridProducts.map((product) => (
                  <Card key={product._id} variant="outlined">
                    <CardContent>
                      <Stack spacing={1.5}>
                        <Stack direction="row" spacing={1} alignItems="center" justifyContent="space-between">
                          <Typography variant="h6" sx={{ fontWeight: 600 }}>
                            {product.name}
                          </Typography>
                          <ProductTypeBadge productType={product.product_type} />
                        </Stack>
                        <Typography variant="body2" color="text.secondary">
                          SKU: {product.sku}
                        </Typography>
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
                          <FactoryIcon fontSize="small" color="action" />
                          <Typography variant="body2" color="text.secondary">
                            {resolveRefLabel(product.factory_id, 'No factory')}
                          </Typography>
                        </Stack>
                        <Stack direction="row" spacing={1} alignItems="center">
                          <LocalOfferIcon fontSize="small" color="success" />
                          <Typography variant="body2" color="text.secondary">
                            {formatCurrency(product.trade_price)}
                          </Typography>
                        </Stack>
                        <Stack direction="row" spacing={1}>
                          <Chip label={product.active ? 'Active' : 'Inactive'} size="small" color={chipColor(product.active)} />
                        </Stack>
                        <Stack direction="row" spacing={1}>
                          <Button size="small" startIcon={<VisibilityIcon fontSize="small" />} onClick={() => handleViewDetails(product)}>
                            View details
                          </Button>
                          <Button size="small" startIcon={<EditIcon fontSize="small" />} onClick={() => handleOpenEdit(product)}>
                            Edit
                          </Button>
                        </Stack>
                      </Stack>
                    </CardContent>
                  </Card>
                ))}
              </Stack>
            )}
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader title="Product list" subheader="Table view with quick filters and actions" />
          <CardContent>
            {controlsBar}
            <Box sx={{ height: 560, width: '100%' }}>
              {clientReady ? (
                <DataGrid
                  columns={tableColumns}
                  rows={productRows}
                  disableColumnMenu
                  disableRowSelectionOnClick
                  loading={loading}
                  paginationModel={paginationModel}
                  onPaginationModelChange={(model) => {
                    if (!isMountedRef.current) {
                      return;
                    }
                    if (model.page !== page) {
                      setPage(model.page);
                    }
                    if (model.pageSize !== pageSize) {
                      setPageSize(model.pageSize);
                    }
                  }}
                  pageSizeOptions={PAGE_SIZE_OPTIONS}
                  rowCount={rowCount}
                  paginationMode="server"
                  columnVisibilityModel={productColumnVisibilityModel}
                  sx={{
                    backgroundColor: 'common.white',
                    '& .MuiDataGrid-columnHeaders': {
                      backgroundColor: 'background.default',
                    },
                    '& .MuiDataGrid-columnHeader[data-field="actions"]': {
                      position: 'sticky',
                      right: 0,
                      zIndex: 2,
                      backgroundColor: 'background.default',
                      /*borderLeft: 1,
                      borderColor: 'divider',*/
                    },
                    '& .MuiDataGrid-cell[data-field="actions"]': {
                      position: 'sticky',
                      right: 0,
                      zIndex: 1,
                      backgroundColor: 'background.paper',
                      /*borderLeft: 1,
                      borderColor: 'divider',
                      borderBottom: 'none',
                      '&::after': {
                        display: 'none',
                      },*/
                    },
                    '& .MuiDataGrid-row:last-of-type .MuiDataGrid-cell[data-field="actions"]': {
                      borderBottom: 'none',
                      '&::after': {
                        display: 'none',
                      },
                    },
                    '& .MuiDataGrid-cell[data-field="actions"] .MuiButtonBase-root': {
                      mr: 0,
                    },
                    '& .MuiDataGrid-virtualScroller': {
                      backgroundColor: 'common.white',
                    },
                  }}
                />
              ) : (
                <Stack alignItems="center" justifyContent="center" sx={{ height: '100%' }}>
                  <CircularProgress size={28} />
                </Stack>
              )}
            </Box>
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
        factories={factories}
        submitting={submitLoading}
        onClose={() => setDialogOpen(false)}
        onSubmit={handleSubmitProduct}
      />
    </Box>
  );
};

export default ProductsPage;
