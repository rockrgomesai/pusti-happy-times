"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  Container,
  Box,
  Typography,
  Paper,
  Grid as Grid2,
  Button,
  IconButton,
  TextField,
  InputAdornment,
  Card,
  CardContent,
  CardActions,
  Chip,
  Badge,
  Drawer,
  List,
  ListItem,
  ListItemText,
  Divider,
  Alert,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tabs,
  Tab,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Tooltip,
  useMediaQuery,
  useTheme,
  TablePagination,
} from "@mui/material";
import {
  Search,
  ShoppingCart,
  Add,
  Remove,
  Delete,
  Close,
  LocalOffer,
  Inventory,
  FilterList,
  CheckCircle,
  Warning,
  Visibility,
  Edit,
  Receipt,
  AddShoppingCart,
} from "@mui/icons-material";
import axios from "axios";

// Types
interface Product {
  _id: string;
  sku: string;
  short_description: string;
  mrp: number;
  unit_per_case: number;
  available_quantity: number;
  distributor_depot_qty: number;
  product_depots_qty: number;
  pending_qty: number;
}

interface Offer {
  _id: string;
  sku: string;
  offer_name: string;
  offer_short_name: string;
  original_price: number;
  offer_price: number;
  savings: number;
  discount_percentage: number;
  available_quantity: number;
  distributor_depot_qty: number;
  product_depots_qty: number;
  pending_qty: number;
}

interface CartItem {
  source: "product" | "offer";
  source_id: string;
  sku: string;
  quantity: number;
  unit_price: number;
  subtotal: number;
  name: string;
  available_quantity: number;
}

interface ValidationResult {
  sku: string;
  requested: number;
  available: number;
  valid: boolean;
  details: {
    distributor_depot: number;
    product_depots: number;
    pending_qty: number;
  };
}

interface OrderItem {
  source: "product" | "offer";
  source_id: string;
  sku: string;
  quantity: number;
  unit_price: number;
  subtotal: number;
  product_details?: any;
  offer_details?: any;
}

interface Order {
  _id: string;
  distributor_id: string;
  order_number: string;
  status: "draft" | "submitted" | "approved" | "rejected" | "cancelled";
  items: OrderItem[];
  total_amount: number;
  item_count: number;
  created_at: string;
  submitted_at?: string;
  approved_at?: string;
  rejected_at?: string;
  cancelled_at?: string;
  rejection_reason?: string;
  cancellation_reason?: string;
}

const DemandOrdersPage = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));

  // State
  const [mainTab, setMainTab] = useState(0); // 0 = Catalog, 1 = My Orders
  const [catalogTab, setCatalogTab] = useState(0); // 0 = Products, 1 = Offers
  const [products, setProducts] = useState<Product[]>([]);
  const [offers, setOffers] = useState<Offer[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [cartDrawerOpen, setCartDrawerOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [validating, setValidating] = useState(false);
  const [validationResults, setValidationResults] = useState<ValidationResult[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [submitDialogOpen, setSubmitDialogOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Orders state
  const [orders, setOrders] = useState<Order[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [orderDetailsOpen, setOrderDetailsOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [totalOrders, setTotalOrders] = useState(0);

  // Filters
  const [categoryFilter, setCategoryFilter] = useState("");
  const [brandFilter, setBrandFilter] = useState("");

  // Load catalogs
  useEffect(() => {
    if (mainTab === 0) {
      loadCatalogs();
    }
  }, [mainTab]);

  // Load orders
  useEffect(() => {
    if (mainTab === 1) {
      loadOrders();
    }
  }, [mainTab, page, rowsPerPage, statusFilter]);

  const loadCatalogs = async () => {
    setLoading(true);
    setError(null);
    try {
      const [productsRes, offersRes] = await Promise.all([
        axios.get(`${process.env.NEXT_PUBLIC_API_BASE_URL}/ordermanagement/demandorders/catalog/products`),
        axios.get(`${process.env.NEXT_PUBLIC_API_BASE_URL}/ordermanagement/demandorders/catalog/offers`),
      ]);

      setProducts(productsRes.data.data || []);
      setOffers(offersRes.data.data || []);
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to load catalogs");
    } finally {
      setLoading(false);
    }
  };

  const loadOrders = async () => {
    setOrdersLoading(true);
    setError(null);
    try {
      const params: any = {
        page: page + 1,
        limit: rowsPerPage,
      };
      
      if (statusFilter !== "all") {
        params.status = statusFilter;
      }

      const response = await axios.get(
        `${process.env.NEXT_PUBLIC_API_BASE_URL}/ordermanagement/demandorders`,
        { params }
      );

      setOrders(response.data.data || []);
      setTotalOrders(response.data.total || 0);
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to load orders");
    } finally {
      setOrdersLoading(false);
    }
  };

  // Filter products
  const filteredProducts = useMemo(() => {
    return products.filter((product) => {
      const matchesSearch =
        searchTerm === "" ||
        product.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
        product.short_description.toLowerCase().includes(searchTerm.toLowerCase());
      
      return matchesSearch;
    });
  }, [products, searchTerm]);

  // Filter offers
  const filteredOffers = useMemo(() => {
    return offers.filter((offer) => {
      const matchesSearch =
        searchTerm === "" ||
        offer.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
        offer.offer_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        offer.offer_short_name.toLowerCase().includes(searchTerm.toLowerCase());
      
      return matchesSearch;
    });
  }, [offers, searchTerm]);

  // Cart functions
  const addToCart = (item: Product | Offer, source: "product" | "offer") => {
    const existingItem = cart.find(
      (ci) => ci.source === source && ci.source_id === item._id
    );

    if (existingItem) {
      updateCartItemQuantity(existingItem.source_id, existingItem.source, existingItem.quantity + 1);
    } else {
      const newItem: CartItem = {
        source,
        source_id: item._id,
        sku: item.sku,
        quantity: 1,
        unit_price: source === "product" ? (item as Product).mrp : (item as Offer).offer_price,
        subtotal: source === "product" ? (item as Product).mrp : (item as Offer).offer_price,
        name: source === "product" 
          ? (item as Product).short_description 
          : (item as Offer).offer_short_name,
        available_quantity: item.available_quantity,
      };
      setCart([...cart, newItem]);
      if (isMobile) setCartDrawerOpen(true);
    }
  };

  const updateCartItemQuantity = (sourceId: string, source: string, newQuantity: number) => {
    if (newQuantity <= 0) {
      removeFromCart(sourceId, source);
      return;
    }

    setCart(
      cart.map((item) => {
        if (item.source_id === sourceId && item.source === source) {
          return {
            ...item,
            quantity: newQuantity,
            subtotal: item.unit_price * newQuantity,
          };
        }
        return item;
      })
    );
  };

  const removeFromCart = (sourceId: string, source: string) => {
    setCart(cart.filter((item) => !(item.source_id === sourceId && item.source === source)));
  };

  const clearCart = () => {
    setCart([]);
    setValidationResults([]);
  };

  // Calculate totals
  const cartTotals = useMemo(() => {
    const total = cart.reduce((sum, item) => sum + item.subtotal, 0);
    const itemCount = cart.reduce((sum, item) => sum + item.quantity, 0);
    return { total, itemCount };
  }, [cart]);

  // Validate cart
  const validateCart = async () => {
    if (cart.length === 0) {
      setError("Cart is empty");
      return;
    }

    setValidating(true);
    setError(null);
    try {
      const response = await axios.post(
        `${process.env.NEXT_PUBLIC_API_BASE_URL}/ordermanagement/demandorders/validate-cart`,
        {
          items: cart.map((item) => ({
            source: item.source,
            source_id: item.source_id,
            sku: item.sku,
            quantity: item.quantity,
          })),
        }
      );

      setValidationResults(response.data.data.validation);
      const allValid = response.data.data.validation.every((v: ValidationResult) => v.valid);
      
      if (allValid) {
        setSuccess("Cart validated successfully! You can proceed to submit.");
        setSubmitDialogOpen(true);
      } else {
        setError("Some items have insufficient stock. Please adjust quantities.");
      }
    } catch (err: any) {
      setError(err.response?.data?.message || "Validation failed");
    } finally {
      setValidating(false);
    }
  };

  // Submit order
  const submitOrder = async () => {
    setLoading(true);
    setError(null);
    setSuccess(null);
    try {
      // Create draft order
      const createResponse = await axios.post(
        `${process.env.NEXT_PUBLIC_API_BASE_URL}/ordermanagement/demandorders`,
        {
          items: cart.map((item) => ({
            source: item.source,
            source_id: item.source_id,
            sku: item.sku,
            quantity: item.quantity,
            unit_price: item.unit_price,
          })),
        }
      );

      const orderId = createResponse.data.data._id;

      // Submit order
      const submitResponse = await axios.post(
        `${process.env.NEXT_PUBLIC_API_BASE_URL}/ordermanagement/demandorders/${orderId}/submit`
      );

      setSuccess(`Order ${submitResponse.data.data.order_number} submitted successfully!`);
      clearCart();
      setSubmitDialogOpen(false);
      loadCatalogs(); // Refresh available quantities
      
      // Switch to orders tab to see the new order
      setMainTab(1);
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to submit order");
    } finally {
      setLoading(false);
    }
  };

  // View order details
  const viewOrderDetails = async (orderId: string) => {
    try {
      const response = await axios.get(
        `${process.env.NEXT_PUBLIC_API_BASE_URL}/ordermanagement/demandorders/${orderId}`
      );
      setSelectedOrder(response.data.data);
      setOrderDetailsOpen(true);
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to load order details");
    }
  };

  // Delete draft order
  const deleteDraftOrder = async (orderId: string) => {
    if (!confirm("Are you sure you want to delete this draft order?")) return;

    try {
      await axios.delete(
        `${process.env.NEXT_PUBLIC_API_BASE_URL}/ordermanagement/demandorders/${orderId}`
      );
      setSuccess("Draft order deleted successfully");
      loadOrders();
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to delete order");
    }
  };

  // Edit draft order (load to cart)
  const editDraftOrder = async (orderId: string) => {
    try {
      const response = await axios.get(
        `${process.env.NEXT_PUBLIC_API_BASE_URL}/ordermanagement/demandorders/${orderId}`
      );
      const order = response.data.data;

      if (order.status !== "draft") {
        setError("Only draft orders can be edited");
        return;
      }

      // Load items to cart
      const cartItems: CartItem[] = order.items.map((item: OrderItem) => ({
        source: item.source,
        source_id: item.source_id,
        sku: item.sku,
        quantity: item.quantity,
        unit_price: item.unit_price,
        subtotal: item.subtotal,
        name: item.source === "product" 
          ? item.product_details?.short_description || item.sku
          : item.offer_details?.offer_short_name || item.sku,
        available_quantity: 0, // Will be refreshed from catalog
      }));

      setCart(cartItems);
      setMainTab(0); // Switch to catalog tab
      setCartDrawerOpen(true);
      setSuccess("Draft order loaded to cart. You can modify and resubmit.");

      // Delete the draft since we're editing it
      await axios.delete(
        `${process.env.NEXT_PUBLIC_API_BASE_URL}/ordermanagement/demandorders/${orderId}`
      );
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to load draft order");
    }
  };

  // Get status color
  const getStatusColor = (status: string) => {
    switch (status) {
      case "draft":
        return "default";
      case "submitted":
        return "info";
      case "approved":
        return "success";
      case "rejected":
        return "error";
      case "cancelled":
        return "warning";
      default:
        return "default";
    }
  };

  // Format date
  const formatDate = (dateString: string) => {
    if (!dateString) return "-";
    return new Date(dateString).toLocaleString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // Get validation for specific item
  const getItemValidation = (sourceId: string, source: string) => {
    const cartItem = cart.find((item) => item.source_id === sourceId && item.source === source);
    if (!cartItem) return null;

    return validationResults.find((v) => v.sku === cartItem.sku);
  };

  // Cart component
  const CartContent = () => (
    <Box sx={{ p: 2 }}>
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2 }}>
        <Typography variant="h6">Shopping Cart ({cartTotals.itemCount})</Typography>
        {isMobile && (
          <IconButton onClick={() => setCartDrawerOpen(false)}>
            <Close />
          </IconButton>
        )}
      </Box>

      {cart.length === 0 ? (
        <Alert severity="info">Your cart is empty</Alert>
      ) : (
        <>
          <List>
            {cart.map((item) => {
              const validation = getItemValidation(item.source_id, item.source);
              return (
                <React.Fragment key={`${item.source}-${item.source_id}`}>
                  <ListItem
                    sx={{
                      flexDirection: "column",
                      alignItems: "stretch",
                      bgcolor: validation && !validation.valid ? "error.light" : "transparent",
                      borderRadius: 1,
                      mb: 1,
                    }}
                  >
                    <Box sx={{ display: "flex", justifyContent: "space-between", mb: 1 }}>
                      <Box sx={{ flex: 1 }}>
                        <Typography variant="body2" fontWeight="bold">
                          {item.sku}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {item.name}
                        </Typography>
                        <Chip
                          label={item.source}
                          size="small"
                          color={item.source === "product" ? "primary" : "secondary"}
                          sx={{ ml: 1 }}
                        />
                      </Box>
                      <IconButton
                        size="small"
                        onClick={() => removeFromCart(item.source_id, item.source)}
                      >
                        <Delete />
                      </IconButton>
                    </Box>

                    <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                        <IconButton
                          size="small"
                          onClick={() =>
                            updateCartItemQuantity(item.source_id, item.source, item.quantity - 1)
                          }
                        >
                          <Remove fontSize="small" />
                        </IconButton>
                        <Typography>{item.quantity}</Typography>
                        <IconButton
                          size="small"
                          onClick={() =>
                            updateCartItemQuantity(item.source_id, item.source, item.quantity + 1)
                          }
                        >
                          <Add fontSize="small" />
                        </IconButton>
                      </Box>
                      <Typography fontWeight="bold">₹{item.subtotal.toFixed(2)}</Typography>
                    </Box>

                    {validation && (
                      <Alert
                        severity={validation.valid ? "success" : "error"}
                        sx={{ mt: 1 }}
                        icon={validation.valid ? <CheckCircle /> : <Warning />}
                      >
                        {validation.valid ? (
                          `Available: ${validation.available}`
                        ) : (
                          <>
                            Insufficient stock!
                            <br />
                            Requested: {validation.requested}, Available: {validation.available}
                            <br />
                            <Typography variant="caption">
                              (Depot: {validation.details.distributor_depot} + Product Depots:{" "}
                              {validation.details.product_depots} - Pending: {validation.details.pending_qty})
                            </Typography>
                          </>
                        )}
                      </Alert>
                    )}
                  </ListItem>
                  <Divider />
                </React.Fragment>
              );
            })}
          </List>

          <Box sx={{ mt: 2, p: 2, bgcolor: "grey.100", borderRadius: 1 }}>
            <Typography variant="h6">
              Total: ₹{cartTotals.total.toFixed(2)}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {cartTotals.itemCount} items
            </Typography>
          </Box>

          <Box sx={{ mt: 2, display: "flex", gap: 1, flexDirection: "column" }}>
            <Button
              variant="outlined"
              color="secondary"
              onClick={clearCart}
              fullWidth
            >
              Clear Cart
            </Button>
            <Button
              variant="contained"
              color="primary"
              onClick={validateCart}
              disabled={validating || cart.length === 0}
              fullWidth
              startIcon={validating ? <CircularProgress size={20} /> : <CheckCircle />}
            >
              {validating ? "Validating..." : "Validate & Submit"}
            </Button>
          </Box>
        </>
      )}
    </Box>
  );

  // Product card
  const ProductCard = ({ product }: { product: Product }) => {
    const inCart = cart.find((item) => item.source === "product" && item.source_id === product._id);
    
    return (
      <Card sx={{ height: "100%", display: "flex", flexDirection: "column" }}>
        <CardContent sx={{ flex: 1 }}>
          <Box sx={{ display: "flex", justifyContent: "space-between", mb: 1 }}>
            <Typography variant="h6" component="div" fontWeight="bold">
              {product.sku}
            </Typography>
            <Chip icon={<Inventory />} label="Product" size="small" color="primary" />
          </Box>
          
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2, minHeight: 40 }}>
            {product.short_description}
          </Typography>

          <Box sx={{ mb: 1 }}>
            <Typography variant="body2">
              <strong>MRP:</strong> ₹{product.mrp.toFixed(2)}
            </Typography>
            <Typography variant="body2">
              <strong>Unit/Case:</strong> {product.unit_per_case}
            </Typography>
            <Typography
              variant="body2"
              color={product.available_quantity > 0 ? "success.main" : "error.main"}
            >
              <strong>Available:</strong> {product.available_quantity}
            </Typography>
          </Box>

          {inCart && (
            <Alert severity="info" sx={{ mt: 1 }}>
              In cart: {inCart.quantity}
            </Alert>
          )}
        </CardContent>

        <CardActions>
          <Button
            variant="contained"
            fullWidth
            startIcon={<Add />}
            onClick={() => addToCart(product, "product")}
            disabled={product.available_quantity <= 0}
          >
            Add to Cart
          </Button>
        </CardActions>
      </Card>
    );
  };

  // Offer card
  const OfferCard = ({ offer }: { offer: Offer }) => {
    const inCart = cart.find((item) => item.source === "offer" && item.source_id === offer._id);
    
    return (
      <Card sx={{ height: "100%", display: "flex", flexDirection: "column" }}>
        <CardContent sx={{ flex: 1 }}>
          <Box sx={{ display: "flex", justifyContent: "space-between", mb: 1 }}>
            <Typography variant="h6" component="div" fontWeight="bold">
              {offer.sku}
            </Typography>
            <Chip icon={<LocalOffer />} label="Offer" size="small" color="secondary" />
          </Box>
          
          <Typography variant="body1" sx={{ mb: 1 }}>
            {offer.offer_short_name}
          </Typography>
          <Typography variant="caption" color="text.secondary" sx={{ mb: 2, display: "block" }}>
            {offer.offer_name}
          </Typography>

          <Box sx={{ mb: 1 }}>
            <Box sx={{ display: "flex", gap: 1, alignItems: "center", mb: 0.5 }}>
              <Typography
                variant="body2"
                sx={{ textDecoration: "line-through", color: "text.disabled" }}
              >
                ₹{offer.original_price.toFixed(2)}
              </Typography>
              <Typography variant="h6" color="error.main">
                ₹{offer.offer_price.toFixed(2)}
              </Typography>
            </Box>
            <Typography variant="caption" color="success.main">
              Save ₹{offer.savings.toFixed(2)} ({offer.discount_percentage.toFixed(0)}% off)
            </Typography>
            
            <Typography
              variant="body2"
              color={offer.available_quantity > 0 ? "success.main" : "error.main"}
              sx={{ mt: 1 }}
            >
              <strong>Available:</strong> {offer.available_quantity}
            </Typography>
          </Box>

          {inCart && (
            <Alert severity="info" sx={{ mt: 1 }}>
              In cart: {inCart.quantity}
            </Alert>
          )}
        </CardContent>

        <CardActions>
          <Button
            variant="contained"
            fullWidth
            startIcon={<Add />}
            onClick={() => addToCart(offer, "offer")}
            disabled={offer.available_quantity <= 0}
          >
            Add to Cart
          </Button>
        </CardActions>
      </Card>
    );
  };

  return (
    <Container maxWidth="xl" sx={{ py: 3 }}>
      {/* Header */}
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 3 }}>
        <Typography variant="h4" component="h1" fontWeight="bold">
          Demand Orders
        </Typography>
        {!isMobile && mainTab === 0 && (
          <Badge badgeContent={cartTotals.itemCount} color="primary">
            <Button
              variant="outlined"
              startIcon={<ShoppingCart />}
              onClick={() => setCartDrawerOpen(true)}
            >
              Cart (₹{cartTotals.total.toFixed(2)})
            </Button>
          </Badge>
        )}
      </Box>

      {/* Mobile cart button - only show on catalog tab */}
      {isMobile && mainTab === 0 && (
        <Box
          sx={{
            position: "fixed",
            bottom: 16,
            right: 16,
            zIndex: 1000,
          }}
        >
          <Badge badgeContent={cartTotals.itemCount} color="primary">
            <Button
              variant="contained"
              color="primary"
              onClick={() => setCartDrawerOpen(true)}
              sx={{
                borderRadius: "50%",
                minWidth: 56,
                minHeight: 56,
                p: 0,
              }}
            >
              <ShoppingCart />
            </Button>
          </Badge>
        </Box>
      )}

      {/* Alerts */}
      {error && (
        <Alert severity="error" onClose={() => setError(null)} sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}
      {success && (
        <Alert severity="success" onClose={() => setSuccess(null)} sx={{ mb: 2 }}>
          {success}
        </Alert>
      )}

      {/* Main tabs */}
      <Box sx={{ borderBottom: 1, borderColor: "divider", mb: 3 }}>
        <Tabs value={mainTab} onChange={(e, newValue) => setMainTab(newValue)}>
          <Tab label="Browse Catalog" icon={<AddShoppingCart />} iconPosition="start" />
          <Tab label="My Orders" icon={<Receipt />} iconPosition="start" />
        </Tabs>
      </Box>

      {/* Catalog Tab */}
      {mainTab === 0 && (
        <>
          {/* Search and filters */}
          <Paper sx={{ p: 2, mb: 3 }}>
            <Grid2 container spacing={2}>
              <Grid2 size={{ xs: 12, md: 6 }}>
                <TextField
                  fullWidth
                  placeholder="Search by SKU or description..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <Search />
                      </InputAdornment>
                    ),
                  }}
                />
              </Grid2>
            </Grid2>
          </Paper>

          {/* Catalog sub-tabs */}
          <Box sx={{ borderBottom: 1, borderColor: "divider", mb: 3 }}>
            <Tabs value={catalogTab} onChange={(e, newValue) => setCatalogTab(newValue)}>
              <Tab label={`Products (${filteredProducts.length})`} icon={<Inventory />} iconPosition="start" />
              <Tab label={`Offers (${filteredOffers.length})`} icon={<LocalOffer />} iconPosition="start" />
            </Tabs>
          </Box>

          {/* Loading */}
          {loading && (
            <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
              <CircularProgress />
            </Box>
          )}

          {/* Products tab */}
          {catalogTab === 0 && !loading && (
            <Grid2 container spacing={2}>
              {filteredProducts.length === 0 ? (
                <Grid2 size={{ xs: 12 }}>
                  <Alert severity="info">No products found</Alert>
                </Grid2>
              ) : (
                filteredProducts.map((product) => (
                  <Grid2 size={{ xs: 12, sm: 6, md: 4, lg: 3 }} key={product._id}>
                    <ProductCard product={product} />
                  </Grid2>
                ))
              )}
            </Grid2>
          )}

          {/* Offers tab */}
          {catalogTab === 1 && !loading && (
            <Grid2 container spacing={2}>
              {filteredOffers.length === 0 ? (
                <Grid2 size={{ xs: 12 }}>
                  <Alert severity="info">No offers found</Alert>
                </Grid2>
              ) : (
                filteredOffers.map((offer) => (
                  <Grid2 size={{ xs: 12, sm: 6, md: 4, lg: 3 }} key={offer._id}>
                    <OfferCard offer={offer} />
                  </Grid2>
                ))
              )}
            </Grid2>
          )}
        </>
      )}

      {/* Orders Tab */}
      {mainTab === 1 && (
        <>
          {/* Status filter */}
          <Paper sx={{ p: 2, mb: 3 }}>
            <FormControl sx={{ minWidth: 200 }}>
              <InputLabel>Status Filter</InputLabel>
              <Select
                value={statusFilter}
                label="Status Filter"
                onChange={(e) => {
                  setStatusFilter(e.target.value);
                  setPage(0);
                }}
              >
                <MenuItem value="all">All Orders</MenuItem>
                <MenuItem value="draft">Draft</MenuItem>
                <MenuItem value="submitted">Submitted</MenuItem>
                <MenuItem value="approved">Approved</MenuItem>
                <MenuItem value="rejected">Rejected</MenuItem>
                <MenuItem value="cancelled">Cancelled</MenuItem>
              </Select>
            </FormControl>
          </Paper>

          {/* Orders table */}
          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell><strong>Order Number</strong></TableCell>
                  <TableCell><strong>Status</strong></TableCell>
                  <TableCell align="right"><strong>Items</strong></TableCell>
                  <TableCell align="right"><strong>Total Amount</strong></TableCell>
                  <TableCell><strong>Created</strong></TableCell>
                  <TableCell><strong>Submitted</strong></TableCell>
                  <TableCell align="center"><strong>Actions</strong></TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {ordersLoading ? (
                  <TableRow>
                    <TableCell colSpan={7} align="center">
                      <CircularProgress />
                    </TableCell>
                  </TableRow>
                ) : orders.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} align="center">
                      <Alert severity="info">No orders found</Alert>
                    </TableCell>
                  </TableRow>
                ) : (
                  orders.map((order) => (
                    <TableRow key={order._id} hover>
                      <TableCell>{order.order_number || "Draft"}</TableCell>
                      <TableCell>
                        <Chip
                          label={order.status.toUpperCase()}
                          color={getStatusColor(order.status) as any}
                          size="small"
                        />
                      </TableCell>
                      <TableCell align="right">{order.item_count}</TableCell>
                      <TableCell align="right">₹{order.total_amount.toFixed(2)}</TableCell>
                      <TableCell>{formatDate(order.created_at)}</TableCell>
                      <TableCell>{formatDate(order.submitted_at || "")}</TableCell>
                      <TableCell align="center">
                        <Tooltip title="View Details">
                          <IconButton
                            size="small"
                            onClick={() => viewOrderDetails(order._id)}
                            color="primary"
                          >
                            <Visibility />
                          </IconButton>
                        </Tooltip>
                        {order.status === "draft" && (
                          <>
                            <Tooltip title="Edit">
                              <IconButton
                                size="small"
                                onClick={() => editDraftOrder(order._id)}
                                color="info"
                              >
                                <Edit />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="Delete">
                              <IconButton
                                size="small"
                                onClick={() => deleteDraftOrder(order._id)}
                                color="error"
                              >
                                <Delete />
                              </IconButton>
                            </Tooltip>
                          </>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
            <TablePagination
              component="div"
              count={totalOrders}
              page={page}
              onPageChange={(e, newPage) => setPage(newPage)}
              rowsPerPage={rowsPerPage}
              onRowsPerPageChange={(e) => {
                setRowsPerPage(parseInt(e.target.value, 10));
                setPage(0);
              }}
              rowsPerPageOptions={[5, 10, 25, 50]}
            />
          </TableContainer>
        </>
      )}

      {/* Cart drawer */}
      <Drawer
        anchor="right"
        open={cartDrawerOpen}
        onClose={() => setCartDrawerOpen(false)}
        PaperProps={{
          sx: { width: isMobile ? "100%" : 400 },
        }}
      >
        <CartContent />
      </Drawer>

      {/* Submit confirmation dialog */}
      <Dialog open={submitDialogOpen} onClose={() => setSubmitDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Confirm Order Submission</DialogTitle>
        <DialogContent>
          <Typography variant="body1" sx={{ mb: 2 }}>
            You are about to submit an order with {cartTotals.itemCount} items totaling ₹
            {cartTotals.total.toFixed(2)}.
          </Typography>
          <Alert severity="info">
            Once submitted, your order will be sent for approval. You cannot modify it after submission.
          </Alert>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSubmitDialogOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            onClick={submitOrder}
            disabled={loading}
            startIcon={loading ? <CircularProgress size={20} /> : null}
          >
            {loading ? "Submitting..." : "Confirm & Submit"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Order Details Dialog */}
      <Dialog
        open={orderDetailsOpen}
        onClose={() => setOrderDetailsOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <Typography variant="h6">Order Details</Typography>
            <IconButton onClick={() => setOrderDetailsOpen(false)}>
              <Close />
            </IconButton>
          </Box>
        </DialogTitle>
        <DialogContent dividers>
          {selectedOrder && (
            <>
              {/* Order Info */}
              <Grid2 container spacing={2} sx={{ mb: 3 }}>
                <Grid2 size={{ xs: 12, sm: 6 }}>
                  <Typography variant="body2" color="text.secondary">
                    Order Number
                  </Typography>
                  <Typography variant="body1" fontWeight="bold">
                    {selectedOrder.order_number || "Draft"}
                  </Typography>
                </Grid2>
                <Grid2 size={{ xs: 12, sm: 6 }}>
                  <Typography variant="body2" color="text.secondary">
                    Status
                  </Typography>
                  <Chip
                    label={selectedOrder.status.toUpperCase()}
                    color={getStatusColor(selectedOrder.status) as any}
                    size="small"
                  />
                </Grid2>
                <Grid2 size={{ xs: 12, sm: 6 }}>
                  <Typography variant="body2" color="text.secondary">
                    Created
                  </Typography>
                  <Typography variant="body1">{formatDate(selectedOrder.created_at)}</Typography>
                </Grid2>
                {selectedOrder.submitted_at && (
                  <Grid2 size={{ xs: 12, sm: 6 }}>
                    <Typography variant="body2" color="text.secondary">
                      Submitted
                    </Typography>
                    <Typography variant="body1">
                      {formatDate(selectedOrder.submitted_at)}
                    </Typography>
                  </Grid2>
                )}
                {selectedOrder.approved_at && (
                  <Grid2 size={{ xs: 12, sm: 6 }}>
                    <Typography variant="body2" color="text.secondary">
                      Approved
                    </Typography>
                    <Typography variant="body1">
                      {formatDate(selectedOrder.approved_at)}
                    </Typography>
                  </Grid2>
                )}
                {selectedOrder.rejected_at && (
                  <Grid2 size={{ xs: 12, sm: 6 }}>
                    <Typography variant="body2" color="text.secondary">
                      Rejected
                    </Typography>
                    <Typography variant="body1">
                      {formatDate(selectedOrder.rejected_at)}
                    </Typography>
                  </Grid2>
                )}
                {selectedOrder.rejection_reason && (
                  <Grid2 size={{ xs: 12 }}>
                    <Alert severity="error">
                      <Typography variant="body2" fontWeight="bold">
                        Rejection Reason:
                      </Typography>
                      <Typography variant="body2">{selectedOrder.rejection_reason}</Typography>
                    </Alert>
                  </Grid2>
                )}
                {selectedOrder.cancellation_reason && (
                  <Grid2 size={{ xs: 12 }}>
                    <Alert severity="warning">
                      <Typography variant="body2" fontWeight="bold">
                        Cancellation Reason:
                      </Typography>
                      <Typography variant="body2">
                        {selectedOrder.cancellation_reason}
                      </Typography>
                    </Alert>
                  </Grid2>
                )}
              </Grid2>

              <Divider sx={{ my: 2 }} />

              {/* Order Items */}
              <Typography variant="h6" sx={{ mb: 2 }}>
                Order Items ({selectedOrder.item_count})
              </Typography>
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell><strong>SKU</strong></TableCell>
                      <TableCell><strong>Source</strong></TableCell>
                      <TableCell align="right"><strong>Quantity</strong></TableCell>
                      <TableCell align="right"><strong>Unit Price</strong></TableCell>
                      <TableCell align="right"><strong>Subtotal</strong></TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {selectedOrder.items.map((item, index) => (
                      <TableRow key={index}>
                        <TableCell>
                          <Typography variant="body2" fontWeight="bold">
                            {item.sku}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {item.source === "product"
                              ? item.product_details?.short_description
                              : item.offer_details?.offer_short_name}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={item.source}
                            size="small"
                            color={item.source === "product" ? "primary" : "secondary"}
                          />
                        </TableCell>
                        <TableCell align="right">{item.quantity}</TableCell>
                        <TableCell align="right">₹{item.unit_price.toFixed(2)}</TableCell>
                        <TableCell align="right">₹{item.subtotal.toFixed(2)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>

              <Divider sx={{ my: 2 }} />

              {/* Total */}
              <Box sx={{ display: "flex", justifyContent: "flex-end" }}>
                <Box sx={{ minWidth: 200 }}>
                  <Box sx={{ display: "flex", justifyContent: "space-between", mb: 1 }}>
                    <Typography variant="body1">Items:</Typography>
                    <Typography variant="body1">{selectedOrder.item_count}</Typography>
                  </Box>
                  <Divider />
                  <Box sx={{ display: "flex", justifyContent: "space-between", mt: 1 }}>
                    <Typography variant="h6">Total:</Typography>
                    <Typography variant="h6">₹{selectedOrder.total_amount.toFixed(2)}</Typography>
                  </Box>
                </Box>
              </Box>
            </>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOrderDetailsOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default DemandOrdersPage;
