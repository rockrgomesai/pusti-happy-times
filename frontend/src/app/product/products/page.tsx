'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
import { DataGrid, GridActionsCellItem, GridColDef, GridToolbarQuickFilter } from '@mui/x-data-grid';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import VisibilityIcon from '@mui/icons-material/Visibility';
import RefreshIcon from '@mui/icons-material/Refresh';
import ToggleOnIcon from '@mui/icons-material/ToggleOn';
import ToggleOffIcon from '@mui/icons-material/ToggleOff';
import SearchIcon from '@mui/icons-material/Search';
import GridViewIcon from '@mui/icons-material/GridView';
import TableRowsIcon from '@mui/icons-material/TableRows';
import LocalOfferIcon from '@mui/icons-material/LocalOffer';
import StorefrontIcon from '@mui/icons-material/Storefront';
import FactoryIcon from '@mui/icons-material/Factory';
import CategoryIcon from '@mui/icons-material/Category';
import { toast } from 'react-hot-toast';

import { productsApi } from '@/lib/api/products';
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

interface ProductTableRow extends Product {
  id: string;
}

type ViewMode = 'table' | 'grid';

type ActiveFilter = 'ALL' | 'true' | 'false';

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

const ProductsPage: React.FC = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const isMountedRef = useRef(true);

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

  const paginationModel = useMemo(
    () => ({ page, pageSize }),
    [page, pageSize],
  );

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
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

  const loadProducts = useCallback(async () => {
    if (!isMountedRef.current) return;
    setLoading(true);
    try {
      const params: Record<string, string | number> = {
        page: page + 1,
        limit: pageSize,
        sort: 'updated_at:desc',
      };

      if (search.trim()) {
        params.search = search.trim();
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
  }, [page, pageSize, search, typeFilter, activeFilter, brandFilter, categoryFilter, factoryFilter]);

  useEffect(() => {
    loadMetadata();
  }, [loadMetadata]);

  useEffect(() => {
    loadProducts();
  }, [loadProducts]);

  const handleRefresh = useCallback(() => {
    loadProducts();
  }, [loadProducts]);

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
      loadStats();
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
        type: 'actions',
        width: 130,
        getActions: (params) => {
          const product = params.row;
          return [
            <GridActionsCellItem
              key="view"
              icon={<VisibilityIcon fontSize="small" />}
              label="View"
              onClick={() => handleViewDetails(product)}
              showInMenu={false}
            />,
            <GridActionsCellItem
              key="edit"
              icon={<EditIcon fontSize="small" />}
              label="Edit"
              onClick={() => handleOpenEdit(product)}
              showInMenu={false}
            />,
            <GridActionsCellItem
              key="toggle"
              icon={product.active ? <ToggleOffIcon fontSize="small" color="warning" /> : <ToggleOnIcon fontSize="small" color="success" />}
              label={product.active ? 'Deactivate' : 'Activate'}
              onClick={() => handleToggleActive(product)}
              showInMenu={false}
            />,
          ];
        },
      },
    ],
    [handleOpenEdit, handleToggleActive, handleViewDetails],
  );

  const productRows = useMemo(() => buildTableRows(products), [products]);

  const showGridView = viewMode === 'grid';

  const filteredGridProducts = useMemo(() => {
    if (!showGridView) return [];
    return productRows;
  }, [productRows, showGridView]);

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
          <Tooltip title={showGridView ? 'Show table view' : 'Show grid view'}>
            <IconButton
              aria-label="Toggle view mode"
              onClick={() => setViewMode((prev) => (prev === 'table' ? 'grid' : 'table'))}
            >
              {showGridView ? <TableRowsIcon /> : <GridViewIcon />}
            </IconButton>
          </Tooltip>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={handleOpenCreate}
            disabled={metadataLoading}
          >
            New Product
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
            <TextField
              label="Search products"
              placeholder="Search by name, SKU, or tags"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon fontSize="small" />
                  </InputAdornment>
                ),
              }}
              fullWidth
            />

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
            <Box sx={{ height: 560, width: '100%' }}>
              <DataGrid
                columns={tableColumns}
                rows={productRows}
                disableColumnMenu
                disableRowSelectionOnClick
                loading={loading}
                paginationModel={paginationModel}
                onPaginationModelChange={(model) => {
                  setPage(model.page);
                  setPageSize(model.pageSize);
                }}
                pageSizeOptions={PAGE_SIZE_OPTIONS}
                rowCount={rowCount}
                paginationMode="server"
                slots={{ toolbar: GridToolbarQuickFilter }}
                slotProps={{ toolbar: { quickFilterProps: { debounceMs: 400 } } }}
              />
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
