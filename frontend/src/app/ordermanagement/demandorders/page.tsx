"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
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
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Checkbox,
  FormControlLabel,
  FormGroup,
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
  ExpandMore,
  AttachMoney,
  Send,
} from "@mui/icons-material";
import api from "@/lib/api";

// Types
interface Category {
  _id: string;
  name: string;
  parent_id?: string;
  product_segment: string;
  children?: Category[];
}

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
  category?: {
    _id: string;
    name: string;
    parent_id?: string;
    product_segment: string;
  };
  brand?: {
    _id: string;
    name: string;
  };
}

interface Offer {
  _id: string;
  name: string;
  offer_type: string;
  product_segments: string[];
  start_date: string;
  end_date: string;
  status: string;
  active: boolean;
  config: {
    selectedProducts: string[];
    applyToAllProducts?: boolean;
    discountPercentage?: number;
    discountAmount?: number;
    minOrderValue?: number;
    maxDiscountAmount?: number;
  };
  description?: string;
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
  offer_id?: string;
  offer_name?: string;
  discount_percentage?: number;
  discount_amount?: number;
  original_subtotal?: number;
}

interface ValidationResult {
  product_id: string;
  sku: string;
  requested_qty: number;
  distributor_depot_qty: number;
  product_depots_qty: number;
  total_available: number;
  pending_qty: number;
  available_after_pending: number;
  valid: boolean;
  error: string | null;
}

interface OrderItem {
  source: "product" | "offer";
  source_id: string;
  sku: string;
  quantity: number;
  unit_price: number;
  subtotal: number;
  product_details?: {
    short_description?: string;
    category?: string;
    brand?: string;
    unit_per_case?: number;
  };
  offer_details?: {
    offer_id?: string;
    offer_name?: string;
    offer_code?: string;
    discount_percentage?: number;
    discount_amount?: number;
    original_subtotal?: number;
    offer_short_name?: string;
  };
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
  const [categoryHierarchy, setCategoryHierarchy] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [productsByCategory, setProductsByCategory] = useState<Record<string, { category: any; products: Product[] }>>({});
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
  const [segmentFilter, setSegmentFilter] = useState<string>("all");
  
  // Product selection dialog
  const [selectedProductForDialog, setSelectedProductForDialog] = useState<Product | null>(null);
  const [dialogQuantity, setDialogQuantity] = useState<number>(1);
  const [productDialogOpen, setProductDialogOpen] = useState(false);

  // Offer details dialog
  const [selectedOffer, setSelectedOffer] = useState<Offer | null>(null);
  const [offerDialogOpen, setOfferDialogOpen] = useState(false);
  const [offerProducts, setOfferProducts] = useState<Product[]>([]);
  const [loadingOfferProducts, setLoadingOfferProducts] = useState(false);

  // Accordion control for simple category groups
  const [expandedPanel, setExpandedPanel] = useState<string | null>(null);

  const handleAccordionChange = useCallback((panel: string) => {
    setExpandedPanel((prev) => (prev === panel ? null : panel));
  }, []);

  // Open product dialog
  const handleProductClick = useCallback((product: Product) => {
    setSelectedProductForDialog(product);
    setDialogQuantity(1);
    setProductDialogOpen(true);
  }, []);

  // Add product from dialog to cart
  const handleAddFromDialog = useCallback(() => {
    if (selectedProductForDialog && dialogQuantity > 0) {
      // Check if we're adding from an offer (offer dialog is still open)
      if (selectedOffer) {
        addToCartWithQuantity(selectedProductForDialog, "product", dialogQuantity, selectedOffer);
      } else {
        addToCartWithQuantity(selectedProductForDialog, "product", dialogQuantity);
      }
      setProductDialogOpen(false);
      setSelectedProductForDialog(null);
      setDialogQuantity(1);
      setSuccess(`Added ${dialogQuantity} carton(s) of ${selectedProductForDialog.sku} to cart`);
    }
  }, [selectedProductForDialog, dialogQuantity, selectedOffer]);

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
      // Load category hierarchy, products (manufactured only), and offers
      // Note: Procured products are used in offers/gifts only, not in direct orders
      const [hierarchyRes, productsRes, offersRes] = await Promise.all([
        api.get("/ordermanagement/demandorders/catalog/category-hierarchy"),
        api.get("/ordermanagement/demandorders/catalog/products"),
        api.get("/ordermanagement/demandorders/catalog/offers"),
      ]);

      setCategoryHierarchy(hierarchyRes.data.data || []);
      setProducts(productsRes.data.data.products || []);
      setProductsByCategory(productsRes.data.data.productsByCategory || {});
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

      const response = await api.get(
        "/ordermanagement/demandorders",
        { params }
      );

      setOrders(response.data.data.orders || []);
      setTotalOrders(response.data.data.pagination?.total || 0);
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

  // Group products by category for accordion view
  const productGroups = useMemo(() => {
    const groups: Array<{
      categoryId: string;
      categoryName: string;
      subcategoryName: string;
      segment: string;
      products: Product[];
    }> = [];

    Object.entries(productsByCategory).forEach(([categoryId, data]) => {
      const { category, products: categoryProducts } = data;
      
      // Filter by search
      const filtered = categoryProducts.filter((product) => {
        if (!searchTerm) return true;
        return (
          product.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
          product.short_description.toLowerCase().includes(searchTerm.toLowerCase())
        );
      });

      if (filtered.length > 0) {
        groups.push({
          categoryId,
          categoryName: category.parent_name || category.name,
          subcategoryName: category.parent_name ? category.name : '',
          segment: category.product_segment,
          products: filtered,
        });
      }
    });

    // Filter by segment
    return segmentFilter === 'all' 
      ? groups 
      : groups.filter(g => g.segment === segmentFilter);
  }, [productsByCategory, searchTerm, segmentFilter]);

  // Filter offers
  const filteredOffers = useMemo(() => {
    return offers.filter((offer) => {
      const matchesSearch =
        searchTerm === "" ||
        offer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (offer.description && offer.description.toLowerCase().includes(searchTerm.toLowerCase()));
      
      return matchesSearch;
    });
  }, [offers, searchTerm]);

  // Get active offers for a product - optimized with useMemo
  const productOfferMap = useMemo(() => {
    const map = new Map<string, Array<{offer: Offer, discount: number}>>();
    
    offers.forEach(offer => {
      if (offer.status !== 'active' || !offer.active) return;
      
      // Check if offer applies to all products or specific ones
      const productIds = offer.config?.applyToAllProducts 
        ? products.map(p => p._id)
        : (offer.config?.selectedProducts || []);
      
      productIds.forEach(productId => {
        const discount = offer.config?.discountPercentage || 0;
        if (!map.has(productId)) {
          map.set(productId, []);
        }
        map.get(productId)!.push({ offer, discount });
      });
    });
    
    return map;
  }, [offers, products]);

  // Get best offer for a product
  const getProductOfferInfo = (productId: string) => {
    const productOffers = productOfferMap.get(productId);
    if (!productOffers || productOffers.length === 0) return null;
    
    // Return offer with highest discount
    const bestOffer = productOffers.reduce((best, current) => 
      current.discount > best.discount ? current : best
    );
    
    return {
      hasOffer: true,
      offerCount: productOffers.length,
      bestDiscount: bestOffer.discount,
      bestOfferName: bestOffer.offer.name,
    };
  };

  // Offer functions
  const openOfferDetails = async (offer: Offer) => {
    setSelectedOffer(offer);
    setOfferDialogOpen(true);
    setLoadingOfferProducts(true);
    
    try {
      // Fetch products that are eligible for this offer
      const response = await api.get(`/ordermanagement/demandorders/catalog/products?segment=${offer.product_segments[0] || 'BIS'}`);
      
      if (response.data.success && response.data.data?.products) {
        // Filter products to only show those in the offer's selectedProducts
        const eligibleProducts = response.data.data.products.filter((product: Product) => 
          offer.config?.selectedProducts?.includes(product._id)
        );
        setOfferProducts(eligibleProducts);
      }
    } catch (err) {
      console.error("Error fetching offer products:", err);
      setError("Failed to load offer products");
    } finally {
      setLoadingOfferProducts(false);
    }
  };

  const closeOfferDialog = () => {
    setOfferDialogOpen(false);
    setSelectedOffer(null);
    setOfferProducts([]);
  };

  // Calculate discount for a group of items with the same offer
  const calculateOfferGroupDiscount = (items: CartItem[], offer?: Offer) => {
    if (!offer?.config || items.length === 0) {
      return { 
        groupSubtotal: items.reduce((sum, item) => sum + (item.unit_price * item.quantity), 0),
        discountAmount: 0, 
        discountPercentage: 0,
        groupTotal: items.reduce((sum, item) => sum + (item.unit_price * item.quantity), 0),
      };
    }

    // Calculate group subtotal (before discount)
    const groupSubtotal = items.reduce((sum, item) => sum + (item.unit_price * item.quantity), 0);
    
    let discountAmount = 0;
    let discountPercentage = 0;

    // Check minimum order value for the entire group
    if (offer.config.minOrderValue && groupSubtotal < offer.config.minOrderValue) {
      return { 
        groupSubtotal, 
        discountAmount: 0, 
        discountPercentage: 0,
        groupTotal: groupSubtotal,
        meetsMinimum: false,
        minOrderValue: offer.config.minOrderValue,
      };
    }

    // Calculate discount on the group total
    if (offer.config.discountPercentage) {
      discountPercentage = offer.config.discountPercentage;
      discountAmount = (groupSubtotal * discountPercentage) / 100;
    } else if (offer.config.discountAmount) {
      // For flat discount, apply once per group (not per item)
      discountAmount = offer.config.discountAmount;
    }

    // Cap at maximum discount amount if specified
    if (offer.config.maxDiscountAmount && discountAmount > offer.config.maxDiscountAmount) {
      discountAmount = offer.config.maxDiscountAmount;
    }

    return { 
      groupSubtotal,
      discountAmount, 
      discountPercentage,
      groupTotal: groupSubtotal - discountAmount,
      meetsMinimum: true,
      minOrderValue: offer.config.minOrderValue,
      maxDiscountAmount: offer.config.maxDiscountAmount,
      isCapped: offer.config.maxDiscountAmount ? discountAmount >= offer.config.maxDiscountAmount : false,
    };
  };

  // Legacy function for individual item discount (used in product dialog preview)
  const calculateOfferDiscount = (originalSubtotal: number, quantity: number, offer?: Offer) => {
    if (!offer?.config) {
      return { discountAmount: 0, discountPercentage: 0 };
    }

    let discountAmount = 0;
    let discountPercentage = 0;

    // Check minimum order value (applies to this item's subtotal)
    if (offer.config.minOrderValue && originalSubtotal < offer.config.minOrderValue) {
      return { discountAmount: 0, discountPercentage: 0 };
    }

    // Calculate discount
    if (offer.config.discountPercentage) {
      discountPercentage = offer.config.discountPercentage;
      discountAmount = (originalSubtotal * discountPercentage) / 100;
    } else if (offer.config.discountAmount) {
      discountAmount = offer.config.discountAmount * quantity;
    }

    // Cap at maximum discount amount if specified
    if (offer.config.maxDiscountAmount && discountAmount > offer.config.maxDiscountAmount) {
      discountAmount = offer.config.maxDiscountAmount;
    }

    return { discountAmount, discountPercentage };
  };

  // Group cart items by offer
  const groupedCartItems = useMemo(() => {
    const groups: Record<string, { offer: Offer | null; items: CartItem[] }> = {};
    
    cart.forEach((item) => {
      const key = item.offer_id || 'no-offer';
      if (!groups[key]) {
        const offer = item.offer_id ? offers.find(o => o._id.toString() === item.offer_id?.toString()) : null;
        groups[key] = {
          offer: offer || null,
          items: [],
        };
      }
      groups[key].items.push(item);
    });

    return groups;
  }, [cart, offers]);

  // Cart functions
  const addToCart = (item: Product | Offer, source: "product" | "offer") => {
    addToCartWithQuantity(item, source, 1);
  };

  const addToCartWithQuantity = (item: Product | Offer, source: "product" | "offer", quantity: number, offer?: Offer) => {
    const existingItem = cart.find(
      (ci) => ci.source === source && ci.source_id === item._id && ci.offer_id === offer?._id
    );

    if (existingItem) {
      updateCartItemQuantity(existingItem.source_id, existingItem.source, existingItem.quantity + quantity);
    } else {
      if (source === "offer") {
        // Offers are not directly added to cart - they're applied to products
        // Show a message or dialog to select products for this offer
        console.warn("Offers should be applied to products, not added to cart directly");
        return;
      }
      
      const product = item as Product;
      const originalSubtotal = product.mrp * quantity;
      
      // Apply offer discount if present
      const { discountAmount, discountPercentage } = calculateOfferDiscount(originalSubtotal, quantity, offer);
      
      const subtotal = originalSubtotal - discountAmount;
      
      const newItem: CartItem = {
        source,
        source_id: product._id,
        sku: product.sku,
        quantity: quantity,
        unit_price: product.mrp,
        subtotal: subtotal,
        name: product.short_description,
        available_quantity: product.available_quantity,
        ...(offer && {
          offer_id: offer._id,
          offer_name: offer.name,
          discount_percentage: discountPercentage,
          discount_amount: discountAmount,
          original_subtotal: originalSubtotal,
        }),
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
          // Just update quantity - discount will be recalculated at group level
          return {
            ...item,
            quantity: newQuantity,
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

  // Calculate totals with offer-group discounts
  const cartTotals = useMemo(() => {
    let total = 0;
    let totalSavings = 0;
    let originalTotal = 0;
    const itemCount = cart.reduce((sum, item) => sum + item.quantity, 0);

    // Calculate totals for each offer group
    Object.values(groupedCartItems).forEach(({ offer, items }) => {
      const groupCalc = calculateOfferGroupDiscount(items, offer || undefined);
      originalTotal += groupCalc.groupSubtotal;
      totalSavings += groupCalc.discountAmount;
      total += groupCalc.groupTotal;
    });

    return { total, itemCount, totalSavings, originalTotal };
  }, [cart, groupedCartItems]);

  // Validate cart
  const validateCart = async () => {
    if (cart.length === 0) {
      setError("Cart is empty");
      return;
    }

    setValidating(true);
    setError(null);
    try {
      const response = await api.post(
        "/ordermanagement/demandorders/validate-cart",
        {
          items: cart.map((item) => ({
            product_id: item.source_id, // Backend expects product_id
            sku: item.sku,
            quantity: item.quantity,
          })),
        }
      );

      setValidationResults(response.data.data.results || []);
      const allValid = response.data.data.valid;
      
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
  // Submit order - now just saves as draft
  const submitOrder = async () => {
    setLoading(true);
    setError(null);
    setSuccess(null);
    try {
      // Create draft order (no automatic submission)
      const createResponse = await api.post(
        "/ordermanagement/demandorders",
        {
          items: cart.map((item) => ({
            source: item.source,
            source_id: item.source_id,
            source_ref: item.source === "product" ? "Product" : "Offer", // Required by model
            sku: item.sku,
            quantity: item.quantity,
            unit_price: item.unit_price,
            subtotal: item.unit_price * item.quantity, // Required by model
            // Include offer details if this item is from an offer
            ...(item.offer_id && {
              offer_details: {
                offer_id: item.offer_id,
                offer_name: item.offer_name,
                discount_percentage: item.discount_percentage,
                discount_amount: item.discount_amount,
                original_subtotal: item.original_subtotal,
              },
            }),
          })),
        }
      );

      const orderNumber = createResponse.data.data.order_number;

      setSuccess(`Draft order ${orderNumber} saved successfully! You can now add payment details.`);
      clearCart();
      setSubmitDialogOpen(false);
      
      // Switch to orders tab to see the draft order
      setMainTab(1);
      await loadOrders(); // Refresh orders list
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to save draft order");
    } finally {
      setLoading(false);
    }
  };

  // View order details
  const viewOrderDetails = async (orderId: string) => {
    try {
      const response = await api.get(
        `/ordermanagement/demandorders/${orderId}`
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
      await api.delete(
        `/ordermanagement/demandorders/${orderId}`
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
      const response = await api.get(
        `/ordermanagement/demandorders/${orderId}`
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
        // Restore offer information if present
        ...(item.offer_details?.offer_id && {
          offer_id: item.offer_details.offer_id,
          offer_name: item.offer_details.offer_name,
          discount_percentage: item.offer_details.discount_percentage,
          discount_amount: item.offer_details.discount_amount,
          original_subtotal: item.offer_details.original_subtotal,
        }),
      }));

      setCart(cartItems);
      setMainTab(0); // Switch to catalog tab
      setCatalogTab(1); // Switch to Offers tab to see available offers
      setCartDrawerOpen(true);
      setSuccess("Draft loaded! Browse Offers tab to add more items to offer groups, or Products tab for regular items.");

      // Delete the draft since we're editing it
      await api.delete(
        `/ordermanagement/demandorders/${orderId}`
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

    return validationResults?.find((v) => v.sku === cartItem.sku) || null;
  };

  // Cart component with offer-based grouping
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
          {/* Render each offer group */}
          {Object.entries(groupedCartItems).map(([groupKey, { offer, items }]) => {
            const groupCalc = calculateOfferGroupDiscount(items, offer || undefined);
            const isOfferGroup = groupKey !== 'no-offer';
            
            return (
              <Accordion 
                key={groupKey}
                defaultExpanded
                sx={{ mb: 2, '&:before': { display: 'none' } }}
              >
                <AccordionSummary expandIcon={<ExpandMore />}>
                  <Box sx={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center', pr: 2 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      {isOfferGroup && <LocalOffer color="success" fontSize="small" />}
                      <Typography variant="subtitle1" fontWeight="bold">
                        {isOfferGroup ? offer?.name : 'Regular Items'}
                      </Typography>
                      <Chip 
                        label={`${items.length} ${items.length === 1 ? 'item' : 'items'}`} 
                        size="small" 
                      />
                    </Box>
                    <Box sx={{ textAlign: 'right' }}>
                      {groupCalc.discountAmount > 0 && (
                        <Typography variant="caption" color="text.secondary" sx={{ textDecoration: 'line-through', display: 'block' }}>
                          ৳{groupCalc.groupSubtotal.toFixed(2)}
                        </Typography>
                      )}
                      <Typography variant="subtitle1" fontWeight="bold" color={groupCalc.discountAmount > 0 ? "success.main" : "text.primary"}>
                        ৳{groupCalc.groupTotal.toFixed(2)}
                      </Typography>
                      {groupCalc.discountAmount > 0 && (
                        <Typography variant="caption" color="success.main">
                          Save ৳{groupCalc.discountAmount.toFixed(2)}
                        </Typography>
                      )}
                    </Box>
                  </Box>
                </AccordionSummary>
                <AccordionDetails>
                  {/* Show minimum order warning if not met */}
                  {isOfferGroup && groupCalc.meetsMinimum === false && groupCalc.minOrderValue && (
                    <Alert 
                      severity="warning" 
                      sx={{ 
                        mb: 2,
                        bgcolor: '#f3e5f5',
                        color: '#4a148c',
                        '& .MuiAlert-icon': { color: '#6a1b9a' }
                      }}
                    >
                      Minimum order value: <strong>৳{groupCalc.minOrderValue.toFixed(2)}</strong>
                      <br />
                      Add <strong>৳{(groupCalc.minOrderValue - groupCalc.groupSubtotal).toFixed(2)}</strong> more to unlock <strong>{offer?.config?.discountPercentage}%</strong> discount
                    </Alert>
                  )}
                  
                  {/* Show discount cap info */}
                  {isOfferGroup && groupCalc.isCapped && groupCalc.maxDiscountAmount && (
                    <Alert 
                      severity="info" 
                      sx={{ 
                        mb: 2,
                        bgcolor: '#ede7f6',
                        color: '#4a148c',
                        '& .MuiAlert-icon': { color: '#673ab7' }
                      }}
                    >
                      Discount capped at <strong>৳{groupCalc.maxDiscountAmount.toFixed(2)}</strong>
                    </Alert>
                  )}

                  <List>
                    {items.map((item) => {
                      const validation = getItemValidation(item.source_id, item.source);
                      const itemSubtotal = item.unit_price * item.quantity;
                      
                      return (
                        <ListItem
                          key={`${item.source}-${item.source_id}`}
                          sx={{
                            flexDirection: "column",
                            alignItems: "stretch",
                            bgcolor: validation && !validation.valid ? "error.light" : "transparent",
                            borderRadius: 1,
                            mb: 1,
                            border: '1px solid',
                            borderColor: 'divider',
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
                              <TextField
                                size="small"
                                type="number"
                                value={item.quantity}
                                onChange={(e) => {
                                  const newQty = parseInt(e.target.value) || 0;
                                  if (newQty >= 0) {
                                    updateCartItemQuantity(item.source_id, item.source, newQty);
                                  }
                                }}
                                inputProps={{ min: 1, style: { textAlign: 'center', width: '60px' } }}
                              />
                              <IconButton
                                size="small"
                                onClick={() =>
                                  updateCartItemQuantity(item.source_id, item.source, item.quantity + 1)
                                }
                              >
                                <Add fontSize="small" />
                              </IconButton>
                            </Box>
                            <Typography fontWeight="bold">
                              ৳{itemSubtotal.toFixed(2)}
                            </Typography>
                          </Box>

                          {validation && (
                            <Alert
                              severity={validation.valid ? "success" : "error"}
                              sx={{ mt: 1 }}
                              icon={validation.valid ? <CheckCircle /> : <Warning />}
                            >
                              {validation.valid ? (
                                `Available: ${validation.available_after_pending}`
                              ) : (
                                <>
                                  Insufficient stock!
                                  <br />
                                  Requested: {validation.requested_qty}, Available: {validation.available_after_pending}
                                  <br />
                                  <Typography variant="caption">
                                    (Depot: {validation.distributor_depot_qty} + Product Depots:{" "}
                                    {validation.product_depots_qty} - Pending: {validation.pending_qty})
                                  </Typography>
                                </>
                              )}
                            </Alert>
                          )}
                        </ListItem>
                      );
                    })}
                  </List>
                </AccordionDetails>
              </Accordion>
            );
          })}

          <Box sx={{ mt: 2, p: 2, bgcolor: "grey.100", borderRadius: 1 }}>
            {cartTotals.totalSavings > 0 && (
              <>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                  <Typography variant="body2" color="text.secondary">
                    Subtotal:
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    ৳{cartTotals.originalTotal.toFixed(2)}
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                  <Typography variant="body2" color="success.main">
                    Offer Savings:
                  </Typography>
                  <Typography variant="body2" color="success.main" fontWeight="bold">
                    -৳{cartTotals.totalSavings.toFixed(2)}
                  </Typography>
                </Box>
                <Divider sx={{ my: 1 }} />
              </>
            )}
            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
              <Typography variant="h6">
                Total:
              </Typography>
              <Typography variant="h6" color={cartTotals.totalSavings > 0 ? "success.main" : "text.primary"}>
                ৳{cartTotals.total.toFixed(2)}
              </Typography>
            </Box>
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
              {validating ? "Validating..." : "Validate & Save Order"}
            </Button>
          </Box>
        </>
      )}
    </Box>
  );

  // Simplified accordion view - similar to sendtostore
  const CategoryProductsAccordion = ({ group, panelId }: {
    group: {
      categoryId: string;
      categoryName: string;
      subcategoryName: string;
      segment: string;
      products: Product[];
    };
    panelId: string;
  }) => {
    const inCartCount = group.products.filter(p => 
      cart.some(item => item.source_id === p._id)
    ).length;

    return (
      <Accordion
        key={panelId}
        expanded={expandedPanel === panelId}
        onChange={() => handleAccordionChange(panelId)}
        sx={{ mb: 2 }}
      >
        <AccordionSummary expandIcon={<ExpandMore />}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flex: 1 }}>
            <Typography variant="h6">
              {group.subcategoryName 
                ? `${group.categoryName} > ${group.subcategoryName}`
                : group.categoryName}
            </Typography>
            <Chip
              label={group.segment}
              size="small"
              color={group.segment === 'BIS' ? 'warning' : 'info'}
              variant="outlined"
            />
            <Chip
              label={`${group.products.length} products`}
              size="small"
              color="default"
            />
            {inCartCount > 0 && (
              <Chip
                label={`${inCartCount} in cart`}
                size="small"
                color="success"
              />
            )}
          </Box>
        </AccordionSummary>
        <AccordionDetails>
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>SKU</TableCell>
                  <TableCell>Description</TableCell>
                  <TableCell align="right">MRP</TableCell>
                  <TableCell align="right">Unit/Case</TableCell>
                  <TableCell align="right">Available</TableCell>
                  <TableCell>Brand</TableCell>
                  <TableCell align="center">Action</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {group.products.map((product) => {
                  const inCart = cart.find(item => item.source_id === product._id);
                  const offerInfo = getProductOfferInfo(product._id);
                  
                  return (
                    <TableRow 
                      key={product._id}
                      hover
                      sx={{ 
                        cursor: 'pointer',
                        backgroundColor: inCart ? 'action.selected' : 'inherit'
                      }}
                      onClick={() => handleProductClick(product)}
                    >
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          {product.sku}
                          {offerInfo && (
                            <Chip
                              icon={<LocalOffer sx={{ fontSize: 14 }} />}
                              label={`${offerInfo.bestDiscount}% OFF`}
                              size="small"
                              sx={{
                                bgcolor: '#f3e5f5',
                                color: '#6a1b9a',
                                fontWeight: 'bold',
                                fontSize: '0.7rem',
                                height: 20,
                                '& .MuiChip-icon': { color: '#7b1fa2', fontSize: 14 }
                              }}
                            />
                          )}
                        </Box>
                      </TableCell>
                      <TableCell>{product.short_description}</TableCell>
                      <TableCell align="right">৳{product.mrp.toFixed(2)}</TableCell>
                      <TableCell align="right">{product.unit_per_case}</TableCell>
                      <TableCell align="right">
                        <Chip
                          label={product.available_quantity}
                          size="small"
                          color={product.available_quantity > 0 ? 'success' : 'error'}
                        />
                      </TableCell>
                      <TableCell>{product.brand?.name || '-'}</TableCell>
                      <TableCell align="center">
                        {inCart ? (
                          <Chip
                            label={`${inCart.quantity} in cart`}
                            size="small"
                            color="success"
                            icon={<ShoppingCart />}
                          />
                        ) : (
                          <Button
                            size="small"
                            variant="outlined"
                            startIcon={<Add />}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleProductClick(product);
                            }}
                            disabled={product.available_quantity <= 0}
                          >
                            Select
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>
        </AccordionDetails>
      </Accordion>
    );
  };

  // Product card
  const ProductCard = ({ product }: { product: Product }) => {
    const inCart = cart.find((item) => item.source === "product" && item.source_id === product._id);
    const offerInfo = getProductOfferInfo(product._id);
    
    return (
      <Card sx={{ height: "100%", display: "flex", flexDirection: "column" }}>
        <CardContent sx={{ flex: 1 }}>
          <Box sx={{ display: "flex", justifyContent: "space-between", mb: 1 }}>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5, flex: 1 }}>
              <Typography variant="h6" component="div" fontWeight="bold">
                {product.sku}
              </Typography>
              {offerInfo && (
                <Chip
                  icon={<LocalOffer sx={{ fontSize: 14 }} />}
                  label={`${offerInfo.bestDiscount}% OFF • ${offerInfo.offerCount} offer${offerInfo.offerCount > 1 ? 's' : ''}`}
                  size="small"
                  sx={{
                    bgcolor: '#f3e5f5',
                    color: '#6a1b9a',
                    fontWeight: 'bold',
                    fontSize: '0.7rem',
                    height: 22,
                    width: 'fit-content',
                    '& .MuiChip-icon': { color: '#7b1fa2', fontSize: 14 }
                  }}
                />
              )}
            </Box>
            <Chip icon={<Inventory />} label="Product" size="small" color="primary" />
          </Box>
          
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2, minHeight: 40 }}>
            {product.short_description}
          </Typography>

          <Box sx={{ mb: 1 }}>
            <Typography variant="body2">
              <strong>MRP:</strong> ৳{product.mrp.toFixed(2)}
            </Typography>
            <Typography variant="body2">
              <strong>Unit/Case:</strong> {product.unit_per_case}
            </Typography>
            <Typography
              variant="body2"
              sx={{
                bgcolor: product.available_quantity > 0 ? '#e8f5e9' : 'inherit',
                color: product.available_quantity > 0 ? '#1b5e20' : 'error.main',
                px: 1,
                py: 0.5,
                borderRadius: 1,
              }}
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
            <Chip icon={<LocalOffer />} label="Offer" size="small" color="secondary" />
          </Box>
          
          <Typography variant="h6" sx={{ mb: 0.5, fontWeight: 600 }}>
            {offer.name}
          </Typography>
          
          <Chip 
            label={offer.offer_type?.replace(/_/g, ' ') || 'OFFER'} 
            size="small" 
            color="primary" 
            sx={{ mb: 1 }}
          />

          <Box sx={{ mb: 1 }}>
            {/* Discount Information */}
            {offer.config?.discountPercentage && (
              <Typography variant="h6" color="success.main" sx={{ mb: 0.5 }}>
                {offer.config.discountPercentage.toFixed(0)}% OFF
              </Typography>
            )}
            {offer.config?.discountAmount && (
              <Typography variant="h6" color="success.main" sx={{ mb: 0.5 }}>
                ৳{offer.config.discountAmount.toFixed(2)} OFF
              </Typography>
            )}
            
            {/* Product Count */}
            {offer.config?.selectedProducts?.length > 0 && (
              <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                {offer.config.selectedProducts.length} {offer.config.selectedProducts.length === 1 ? 'Product' : 'Products'}
              </Typography>
            )}
            
            {/* Min Order Value */}
            {offer.config?.minOrderValue && (
              <Typography variant="caption" color="text.secondary" display="block">
                Min Order: ৳{offer.config.minOrderValue.toFixed(2)}
              </Typography>
            )}
            
            {/* Validity */}
            {offer.end_date && (
              <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 0.5 }}>
                Valid till: {new Date(offer.end_date).toLocaleDateString()}
              </Typography>
            )}
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
            onClick={() => openOfferDetails(offer)}
            disabled={!offer.active || offer.status !== 'active'}
          >
            View Details
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
              Cart (৳{cartTotals.total.toFixed(2)})
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
              <Grid2 size={{ xs: 12, md: 4 }}>
                <FormControl fullWidth>
                  <InputLabel>Segment Filter</InputLabel>
                  <Select
                    value={segmentFilter}
                    label="Segment Filter"
                    onChange={(e) => setSegmentFilter(e.target.value)}
                  >
                    <MenuItem value="all">All Segments</MenuItem>
                    <MenuItem value="BIS">BIS</MenuItem>
                    <MenuItem value="BEV">BEV</MenuItem>
                  </Select>
                </FormControl>
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

          {/* Products tab - Simple Accordion View */}
          {catalogTab === 0 && !loading && (
            <>
              {productGroups.length === 0 ? (
                <Alert severity="info">No products found</Alert>
              ) : (
                <Box>
                  {productGroups.map((group, idx) => (
                    <CategoryProductsAccordion
                      key={group.categoryId}
                      group={group}
                      panelId={`product-group-${idx}`}
                    />
                  ))}
                </Box>
              )}
            </>
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
                      <TableCell align="right">৳{order.total_amount.toFixed(2)}</TableCell>
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

      {/* Product Selection Dialog */}
      <Dialog 
        open={productDialogOpen} 
        onClose={() => setProductDialogOpen(false)} 
        maxWidth="sm" 
        fullWidth
      >
        <DialogTitle>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="h6">Add Product to Cart</Typography>
            <IconButton onClick={() => setProductDialogOpen(false)}>
              <Close />
            </IconButton>
          </Box>
        </DialogTitle>
        <DialogContent dividers>
          {selectedProductForDialog && (
            <>
              <Box sx={{ mb: 3 }}>
                <Typography variant="h6" gutterBottom>
                  {selectedProductForDialog.sku}
                </Typography>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  {selectedProductForDialog.short_description}
                </Typography>
                
                <Box sx={{ display: 'flex', gap: 2, mt: 2, flexWrap: 'wrap' }}>
                  <Chip 
                    label={`MRP: ৳${selectedProductForDialog.mrp.toFixed(2)}`} 
                    color="primary" 
                  />
                  <Chip 
                    label={`${selectedProductForDialog.unit_per_case} units/case`} 
                  />
                </Box>
              </Box>

              <Paper sx={{ p: 2, mb: 2, bgcolor: '#e0f7fa', border: '1px solid #00acc1' }}>
                <Typography variant="subtitle2" gutterBottom sx={{ color: '#006064', fontWeight: 'bold' }}>
                  Availability
                </Typography>
                <Typography variant="h5" sx={{ color: '#00838f', fontWeight: 'bold' }}>
                  {selectedProductForDialog.available_quantity} cartons
                </Typography>
                <Typography variant="caption" sx={{ color: '#004d40' }}>
                  ({selectedProductForDialog.available_quantity * selectedProductForDialog.unit_per_case} pieces)
                </Typography>
              </Paper>

              <TextField
                fullWidth
                label="Quantity (Cartons)"
                type="number"
                value={dialogQuantity}
                onChange={(e) => setDialogQuantity(parseInt(e.target.value) || 1)}
                inputProps={{ 
                  min: 1, 
                  max: selectedProductForDialog.available_quantity 
                }}
                helperText={`Maximum: ${selectedProductForDialog.available_quantity} cartons available`}
              />

              <Box sx={{ mt: 2, p: 2, bgcolor: 'grey.100', borderRadius: 1 }}>
                <Typography variant="subtitle2">Order Summary</Typography>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 1 }}>
                  <Typography>Quantity:</Typography>
                  <Typography fontWeight="bold">{dialogQuantity} cartons</Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography>Unit Price:</Typography>
                  <Typography>৳{selectedProductForDialog.mrp.toFixed(2)}</Typography>
                </Box>
                {selectedOffer && (() => {
                  const originalSubtotal = selectedProductForDialog.mrp * dialogQuantity;
                  
                  // Calculate current cart total for this offer group
                  const cartItemsForThisOffer = cart.filter(item => item.offer_id === selectedOffer._id);
                  const currentCartTotal = cartItemsForThisOffer.reduce((sum, item) => sum + (item.unit_price * item.quantity), 0);
                  const totalWithNewItem = currentCartTotal + originalSubtotal;
                  const meetsMinimum = !selectedOffer.config?.minOrderValue || totalWithNewItem >= selectedOffer.config.minOrderValue;
                  const remainingToMinimum = selectedOffer.config?.minOrderValue ? Math.max(0, selectedOffer.config.minOrderValue - totalWithNewItem) : 0;
                  
                  // Calculate discount on the new item ONLY if minimum is met
                  const { discountAmount, discountPercentage } = meetsMinimum 
                    ? calculateOfferDiscount(originalSubtotal, dialogQuantity, selectedOffer)
                    : { discountAmount: 0, discountPercentage: 0 };
                  
                  return (
                    <>
                      {selectedOffer.config?.minOrderValue && !meetsMinimum && (
                        <Alert 
                          severity="warning" 
                          sx={{ 
                            mt: 1,
                            bgcolor: '#f3e5f5',
                            color: '#4a148c',
                            '& .MuiAlert-icon': { color: '#6a1b9a' }
                          }}
                        >
                          Minimum order value: <strong>৳{selectedOffer.config.minOrderValue.toFixed(2)}</strong>
                          <br />
                          Current cart total: <strong>৳{currentCartTotal.toFixed(2)}</strong>
                          <br />
                          With this item: <strong>৳{totalWithNewItem.toFixed(2)}</strong>
                          <br />
                          Add <strong>৳{remainingToMinimum.toFixed(2)}</strong> more to unlock <strong>{selectedOffer.config.discountPercentage}%</strong> discount
                        </Alert>
                      )}
                      {selectedOffer.config?.minOrderValue && meetsMinimum && currentCartTotal > 0 && (
                        <Alert 
                          severity="success" 
                          sx={{ 
                            mt: 1,
                            bgcolor: '#f3e5f5',
                            color: '#4a148c',
                            '& .MuiAlert-icon': { color: '#7b1fa2' }
                          }}
                        >
                          ✓ Minimum order value met! <strong>{selectedOffer.config.discountPercentage}%</strong> discount will apply to all items in this offer.
                        </Alert>
                      )}
                      {discountAmount > 0 && (
                        <>
                          <Divider sx={{ my: 1 }} />
                          <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                            <Typography color="text.secondary">Subtotal:</Typography>
                            <Typography color="text.secondary">৳{originalSubtotal.toFixed(2)}</Typography>
                          </Box>
                          <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                            <Typography sx={{ color: '#00838f' }}>
                              Offer Discount ({discountPercentage}%):
                            </Typography>
                            <Typography sx={{ color: '#00838f', fontWeight: 'bold' }}>
                              -৳{discountAmount.toFixed(2)}
                            </Typography>
                          </Box>
                          {selectedOffer.config?.maxDiscountAmount && discountAmount >= selectedOffer.config.maxDiscountAmount && (
                            <Typography variant="caption" color="text.secondary">
                              (Capped at max discount: ৳{selectedOffer.config.maxDiscountAmount.toFixed(2)})
                            </Typography>
                          )}
                        </>
                      )}
                    </>
                  );
                })()}
                <Divider sx={{ my: 1 }} />
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography variant="h6">Total:</Typography>
                  <Typography variant="h6" sx={{ color: selectedOffer ? '#00838f' : 'primary.main', fontWeight: 'bold' }}>
                    ৳{(() => {
                      const originalSubtotal = selectedProductForDialog.mrp * dialogQuantity;
                      if (selectedOffer) {
                        const { discountAmount } = calculateOfferDiscount(originalSubtotal, dialogQuantity, selectedOffer);
                        return (originalSubtotal - discountAmount).toFixed(2);
                      }
                      return originalSubtotal.toFixed(2);
                    })()}
                  </Typography>
                </Box>
              </Box>
            </>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setProductDialogOpen(false)}>
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={handleAddFromDialog}
            disabled={!selectedProductForDialog || dialogQuantity <= 0 || dialogQuantity > (selectedProductForDialog?.available_quantity || 0)}
            startIcon={<AddShoppingCart />}
          >
            Add to Cart
          </Button>
        </DialogActions>
      </Dialog>

      {/* Offer Details Dialog */}
      <Dialog 
        open={offerDialogOpen} 
        onClose={closeOfferDialog} 
        maxWidth="md" 
        fullWidth
      >
        <DialogTitle>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="h6">{selectedOffer?.name}</Typography>
            <IconButton onClick={closeOfferDialog}>
              <Close />
            </IconButton>
          </Box>
        </DialogTitle>
        <DialogContent dividers>
          {selectedOffer && (
            <>
              {/* Offer Details */}
              <Box sx={{ mb: 3 }}>
                <Box sx={{ display: 'flex', gap: 1, mb: 2, flexWrap: 'wrap' }}>
                  <Chip 
                    label={selectedOffer.offer_type.replace(/_/g, ' ')} 
                    color="primary" 
                  />
                  <Chip 
                    label={selectedOffer.status.toUpperCase()} 
                    color={selectedOffer.status === 'active' ? 'success' : 'default'} 
                  />
                  {selectedOffer.product_segments.map((seg) => (
                    <Chip key={seg} label={seg} size="small" />
                  ))}
                </Box>

                {/* Discount Info */}
                <Paper sx={{ p: 2, mb: 2, bgcolor: '#f3e5f5', border: '1px solid #9c27b0' }}>
                  {selectedOffer.config?.discountPercentage && (
                    <Typography variant="h4" color="#6a1b9a" gutterBottom sx={{ fontWeight: 'bold' }}>
                      {selectedOffer.config.discountPercentage}% OFF
                    </Typography>
                  )}
                  {selectedOffer.config?.discountAmount && (
                    <Typography variant="h4" color="#6a1b9a" gutterBottom sx={{ fontWeight: 'bold' }}>
                      ৳{selectedOffer.config.discountAmount.toFixed(2)} OFF
                    </Typography>
                  )}
                  
                  {selectedOffer.config?.minOrderValue && (
                    <Typography variant="body2" sx={{ color: '#4a148c' }}>
                      Minimum order value: <strong>৳{selectedOffer.config.minOrderValue.toFixed(2)}</strong>
                    </Typography>
                  )}
                  
                  {selectedOffer.config?.maxDiscountAmount && (
                    <Typography variant="body2" sx={{ color: '#4a148c' }}>
                      Maximum discount: <strong>৳{selectedOffer.config.maxDiscountAmount.toFixed(2)}</strong>
                    </Typography>
                  )}
                </Paper>

                {/* Validity */}
                <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
                  <Typography variant="body2" color="text.secondary">
                    Valid from: {new Date(selectedOffer.start_date).toLocaleDateString()}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Valid till: {new Date(selectedOffer.end_date).toLocaleDateString()}
                  </Typography>
                </Box>

                {selectedOffer.description && (
                  <Typography variant="body2" sx={{ mb: 2 }}>
                    {selectedOffer.description}
                  </Typography>
                )}
              </Box>

              <Divider sx={{ my: 2 }} />

              {/* Eligible Products */}
              <Typography variant="h6" gutterBottom>
                Eligible Products ({offerProducts.length})
              </Typography>
              
              {loadingOfferProducts ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
                  <CircularProgress />
                </Box>
              ) : offerProducts.length === 0 ? (
                <Alert severity="info">
                  No eligible products found for this offer.
                </Alert>
              ) : (
                <Box sx={{ maxHeight: '400px', overflow: 'auto' }}>
                  <Grid2 container spacing={2}>
                    {offerProducts.map((product) => {
                      const offerInfo = getProductOfferInfo(product._id);
                      
                      return (
                      <Grid2 size={{ xs: 12, sm: 6 }} key={product._id}>
                        <Card variant="outlined">
                          <CardContent>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
                              <Typography variant="subtitle2" gutterBottom>
                                {product.sku}
                              </Typography>
                              {offerInfo && offerInfo.offerCount > 1 && (
                                <Chip
                                  label={`${offerInfo.offerCount} offers`}
                                  size="small"
                                  sx={{
                                    bgcolor: '#f3e5f5',
                                    color: '#6a1b9a',
                                    fontWeight: 'bold',
                                    fontSize: '0.65rem',
                                    height: 18,
                                  }}
                                />
                              )}
                            </Box>
                            <Typography variant="body2" color="text.secondary" gutterBottom>
                              {product.short_description}
                            </Typography>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 1 }}>
                              <Typography variant="body2" fontWeight="bold">
                                ৳{product.mrp.toFixed(2)}
                              </Typography>
                              <Typography variant="caption" color="text.secondary">
                                {product.available_quantity} available
                              </Typography>
                            </Box>
                          </CardContent>
                          <CardActions>
                            <Button 
                              size="small" 
                              fullWidth
                              variant="outlined"
                              onClick={() => {
                                setSelectedProductForDialog(product);
                                setDialogQuantity(1);
                                setProductDialogOpen(true);
                              }}
                              disabled={product.available_quantity <= 0}
                            >
                              Add to Cart
                            </Button>
                          </CardActions>
                        </Card>
                      </Grid2>
                    )})}
                  </Grid2>
                </Box>
              )}
            </>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={closeOfferDialog}>
            Close
          </Button>
        </DialogActions>
      </Dialog>

      {/* Submit confirmation dialog */}
      <Dialog open={submitDialogOpen} onClose={() => setSubmitDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Save Order as Draft</DialogTitle>
        <DialogContent>
          <Typography variant="body1" sx={{ mb: 2 }}>
            You are about to save a draft order with {cartTotals.itemCount} items totaling ৳
            {cartTotals.total.toFixed(2)}.
          </Typography>
          <Alert severity="info">
            The order will be saved as a draft. You can edit it, add payment receipts, and then submit for approval.
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
            {loading ? "Saving..." : "Save Draft"}
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
                        <TableCell align="right">৳{item.unit_price.toFixed(2)}</TableCell>
                        <TableCell align="right">৳{item.subtotal.toFixed(2)}</TableCell>
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
                    <Typography variant="h6">৳{selectedOrder.total_amount.toFixed(2)}</Typography>
                  </Box>
                </Box>
              </Box>
            </>
          )}
        </DialogContent>
        <DialogActions>
          {selectedOrder?.status === "draft" && (
            <>
              <Button 
                variant="outlined" 
                color="primary"
                startIcon={<AttachMoney />}
                onClick={() => {
                  // TODO: Open payment upload dialog
                  console.log("Add payment for order:", selectedOrder._id);
                }}
              >
                Add Payment
              </Button>
              <Button 
                variant="contained" 
                color="success"
                startIcon={<Send />}
                onClick={async () => {
                  try {
                    await api.post(`/ordermanagement/demandorders/${selectedOrder._id}/submit`);
                    setSuccess(`Order ${selectedOrder.order_number || selectedOrder._id} submitted for approval!`);
                    setOrderDetailsOpen(false);
                    loadOrders();
                  } catch (err: any) {
                    setError(err.response?.data?.message || "Failed to submit order");
                  }
                }}
              >
                Submit for Approval
              </Button>
            </>
          )}
          <Button onClick={() => setOrderDetailsOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default DemandOrdersPage;

