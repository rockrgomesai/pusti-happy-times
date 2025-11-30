"use client";

import React, { useState, useEffect } from "react";
import { formatDateForDisplay } from "@/lib/dateUtils";
import {
  Container,
  Box,
  Typography,
  Paper,
  Button,
  Chip,
  Alert,
  CircularProgress,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  IconButton,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Divider,
  Grid as Grid2,
  Stack,
  Tabs,
  Tab,
  Card,
  CardContent,
  CardActions,
  InputAdornment,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Badge,
  Drawer,
  List,
  ListItem,
  ListItemText,
} from "@mui/material";
import {
  Visibility,
  Edit,
  Send,
  Cancel as CancelIcon,
  Refresh,
  Close,
  Delete,
  AttachMoney,
  Add,
  Remove,
  Search,
  ShoppingCart,
  LocalOffer,
  Inventory,
  ExpandMore,
  AddShoppingCart,
  Receipt,
  CheckCircle,
} from "@mui/icons-material";
import {
  Timeline,
  TimelineItem,
  TimelineSeparator,
  TimelineConnector,
  TimelineContent,
  TimelineDot,
  TimelineOppositeContent,
} from "@mui/lab";
import api from "@/lib/api";
import CollectionForm from "../collections/components/CollectionForm";

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
  db_price: number;
  unit_per_case: number;
  available_quantity: number;
  distributor_depot_qty: number;
  product_depots_qty: number;
  pending_qty: number;
  product_type: string;
  ctn_pcs: number;
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

interface OrderItem {
  source: "product" | "offer";
  source_id: string;
  sku: string;
  quantity: number;
  unit_price: number;
  subtotal: number;
  product_details?: {
    short_description?: string;
  };
  offer_details?: {
    offer_name?: string;
  };
}

interface Distributor {
  _id: string;
  name: string;
  erp_id: string;
  phone: string;
  contact_person: string;
  db_point_id?: {
    _id: string;
    name: string;
    ancestors?: Array<{
      _id: string;
      name: string;
      type: string;
    }>;
  };
}

interface Order {
  _id: string;
  distributor_id: Distributor;
  order_number: string;
  status: string;
  items: OrderItem[];
  total_amount: number;
  item_count: number;
  created_at: string;
  submitted_at?: string;
  current_approver_role?: string;
}

const ApproveOrdersPage = () => {
  // Helper function to extract numeric value from Decimal128 or regular number
  const getNumericValue = (value: any): number | string => {
    if (value === null || value === undefined) return "";
    if (typeof value === 'object' && value.$numberDecimal) {
      return parseFloat(value.$numberDecimal) || "";
    }
    if (typeof value === 'number') return value;
    return parseFloat(value) || "";
  };

  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [currentUserRole, setCurrentUserRole] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  
  // Dialog states
  const [viewOrderDialog, setViewOrderDialog] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [cancelDialog, setCancelDialog] = useState(false);
  const [cancelReason, setCancelReason] = useState("");
  
  // Financial summary state
  const [financialSummary, setFinancialSummary] = useState<any>(null);
  const [loadingFinancial, setLoadingFinancial] = useState(false);
  
  // Payment dialog states
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [editingPayment, setEditingPayment] = useState<any>(null);
  const [deletePaymentId, setDeletePaymentId] = useState<string | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);

  // Edit order states  
  const [editingOrderId, setEditingOrderId] = useState<string | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [cartDrawerOpen, setCartDrawerOpen] = useState(false);
  
  // Catalog states for editing
  const [catalogTab, setCatalogTab] = useState(0); // 0 = Products, 1 = Offers
  const [products, setProducts] = useState<Product[]>([]);
  const [productsByCategory, setProductsByCategory] = useState<Record<string, { category: any; products: Product[] }>>({});
  const [offers, setOffers] = useState<Offer[]>([]);
  const [catalogLoading, setCatalogLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [segmentFilter, setSegmentFilter] = useState<string>("all");
  
  // Offer dialog states
  const [offerDialogOpen, setOfferDialogOpen] = useState(false);
  const [selectedOffer, setSelectedOffer] = useState<Offer | null>(null);
  const [offerProducts, setOfferProducts] = useState<Product[]>([]);
  const [offerSelections, setOfferSelections] = useState<Record<string, number>>({});
  const [loadingOfferProducts, setLoadingOfferProducts] = useState(false);
  
  // Edit reason dialog
  const [editReasonDialog, setEditReasonDialog] = useState(false);
  const [editReason, setEditReason] = useState("");

  // Approve DO dialog for Finance
  const [approveDialogOpen, setApproveDialogOpen] = useState(false);
  const [unapprovedPayments, setUnapprovedPayments] = useState<any[]>([]);
  const [approveComments, setApproveComments] = useState("");

  // Fetch orders pending approval
  const fetchOrders = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await api.get("/ordermanagement/demandorders/pending-approval");
      setOrders(response.data.data || []);
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to fetch orders");
      console.error("Error fetching orders:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
    fetchCurrentUserRole();
  }, []);

  const fetchCurrentUserRole = async () => {
    try {
      const response = await api.get("/auth/me");
      const roleName = response.data.data.user?.role?.role || null;
      setCurrentUserRole(roleName);
      console.log("Current user role:", roleName);
    } catch (err: any) {
      console.error("Failed to fetch user role:", err);
    }
  };

  // Clear success message after 5 seconds
  useEffect(() => {
    if (success) {
      const timer = setTimeout(() => setSuccess(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [success]);

  const handleChangePage = (event: unknown, newPage: number) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const handleViewDetails = async (order: Order) => {
    setSelectedOrder(order);
    setViewOrderDialog(true);
    await fetchFinancialSummary(order._id);
  };
  
  // Fetch financial summary
  const fetchFinancialSummary = async (orderId: string) => {
    try {
      setLoadingFinancial(true);
      const response = await api.get(`/ordermanagement/demandorders/${orderId}/financial-summary`);
      setFinancialSummary(response.data.data);
    } catch (err: any) {
      console.error("Error fetching financial summary:", err);
    } finally {
      setLoadingFinancial(false);
    }
  };

  // Handle payment form submit (add/edit)
  // Handle delete payment
  const handleDeletePayment = async () => {
    if (!deletePaymentId || !selectedOrder) return;
    
    try {
      await api.delete(`/ordermanagement/collections/${deletePaymentId}`);
      setSuccess("Payment deleted successfully!");
      setDeleteConfirmOpen(false);
      setDeletePaymentId(null);
      await fetchFinancialSummary(selectedOrder._id);
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to delete payment");
    }
  };

  // Load catalogs for a specific distributor (used when editing orders)
  const loadCatalogs = async (distributorId: string) => {
    setCatalogLoading(true);
    try {
      const [productsRes, offersRes] = await Promise.all([
        api.get(`/ordermanagement/demandorders/catalog/products?distributor_id=${distributorId}`),
        api.get(`/ordermanagement/demandorders/catalog/offers?distributor_id=${distributorId}`),
      ]);

      setProducts(productsRes.data.data.products || []);
      setProductsByCategory(productsRes.data.data.productsByCategory || {});
      setOffers(offersRes.data.data || []);
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to load catalogs");
    } finally {
      setCatalogLoading(false);
    }
  };

  // Handle edit order - load items into cart like distributor does
  const handleEditOrder = async (order: Order) => {
    try {
      // Convert OrderItems to CartItems
      const cartItems: CartItem[] = order.items.map((item) => ({
        source: item.source,
        source_id: item.source_id,
        sku: item.sku,
        quantity: item.quantity,
        unit_price: item.unit_price,
        subtotal: item.subtotal,
        name: item.source === "product" 
          ? item.product_details?.short_description || item.sku
          : item.offer_details?.offer_name || item.sku,
        available_quantity: 0,
      }));
      
      setCart(cartItems);
      setEditingOrderId(order._id);
      setEditMode(true);
      setCartDrawerOpen(true);
      
      // Load catalogs for the order's distributor
      const distributorId = (order.distributor_id as any)?._id || order.distributor_id;
      await loadCatalogs(String(distributorId));
      
      setSuccess("Order loaded! You can now edit items, add products/offers, then save changes.");
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to load order for editing");
    }
  };

  // Add product to cart
  const addToCart = (product: Product, quantity: number = 1) => {
    const existingIndex = cart.findIndex(
      (item) => item.source === "product" && item.source_id === product._id
    );

    if (existingIndex >= 0) {
      const updatedCart = [...cart];
      updatedCart[existingIndex].quantity += quantity;
      updatedCart[existingIndex].subtotal = 
        updatedCart[existingIndex].quantity * updatedCart[existingIndex].unit_price;
      setCart(updatedCart);
      setSuccess(`Updated ${product.sku} quantity in cart`);
    } else {
      const newItem: CartItem = {
        source: "product",
        source_id: product._id,
        sku: product.sku,
        quantity: quantity,
        unit_price: product.db_price,
        subtotal: quantity * product.db_price,
        name: product.short_description,
        available_quantity: product.available_quantity,
      };
      setCart([...cart, newItem]);
      setSuccess(`Added ${product.sku} to cart`);
    }
  };

  // Update item quantity in cart
  const updateCartItemQuantity = (index: number, newQuantity: number) => {
    if (newQuantity < 1) return;
    const updatedCart = [...cart];
    updatedCart[index].quantity = newQuantity;
    updatedCart[index].subtotal = newQuantity * updatedCart[index].unit_price;
    setCart(updatedCart);
  };

  // Remove item from cart
  const removeFromCart = (index: number) => {
    setCart(cart.filter((_, i) => i !== index));
  };

  // Clear cart and exit edit mode
  const cancelEdit = () => {
    setCart([]);
    setEditingOrderId(null);
    setEditMode(false);
    setCartDrawerOpen(false);
    setEditReason("");
    setCatalogTab(0);
    setSearchTerm("");
  };

  // Open save dialog
  const openSaveDialog = () => {
    if (cart.length === 0) {
      setError("Cart is empty. Add at least one item.");
      return;
    }
    setEditReasonDialog(true);
  };

  // Save edited order
  const saveEditedOrder = async () => {
    if (!editingOrderId || cart.length === 0) {
      setError("Order must have at least one item");
      return;
    }

    if (!editReason.trim()) {
      setError("Please provide a reason for editing this order");
      return;
    }

    try {
      const orderItems = cart.map(item => ({
        source: item.source,
        source_id: item.source_id,
        sku: item.sku,
        quantity: item.quantity,
        unit_price: item.unit_price,
        subtotal: item.subtotal,
      }));

      await api.put(`/ordermanagement/demandorders/${editingOrderId}`, {
        items: orderItems,
        edit_reason: editReason,
      });
      
      setSuccess("Order updated successfully!");
      setEditReasonDialog(false);
      setEditReason("");
      cancelEdit();
      fetchOrders();
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to update order");
    }
  };

  // Calculate offer group discount (replicating distributor logic)
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

  // Open offer details dialog
  const openOfferDetails = async (offer: Offer) => {
    setSelectedOffer(offer);
    setOfferDialogOpen(true);
    setLoadingOfferProducts(true);
    
    // Check if this offer already has items in the cart
    const existingItems = cart.filter(item => item.offer_id === offer._id);
    const initialSelections: Record<string, number> = {};
    existingItems.forEach(item => {
      initialSelections[item.source_id] = item.quantity;
    });
    setOfferSelections(initialSelections);
    
    try {
      // Fetch products that are eligible for this offer
      const currentOrder = orders.find(o => o._id === editingOrderId);
      const distributorId = (currentOrder?.distributor_id as any)?._id || currentOrder?.distributor_id;
      const response = await api.get(`/ordermanagement/demandorders/catalog/products?distributor_id=${distributorId}&segment=${offer.product_segments[0] || 'BIS'}`);
      
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
    setOfferSelections({});
  };

  // Handle quantity change in offer dialog
  const updateOfferSelection = (productId: string, quantity: number) => {
    setOfferSelections(prev => {
      if (quantity <= 0) {
        const newSelections = { ...prev };
        delete newSelections[productId];
        return newSelections;
      }
      return { ...prev, [productId]: quantity };
    });
  };

  // Apply offer selections to cart
  const applyOfferToCart = () => {
    if (!selectedOffer) return;

    // Remove all existing items for this offer from cart
    const cartWithoutThisOffer = cart.filter(item => item.offer_id !== selectedOffer._id);

    // Add new selections (calculate group discount and distribute)
    const newItems: CartItem[] = [];
    let groupOriginalTotal = 0;
    
    // First pass: create items with original prices
    Object.entries(offerSelections).forEach(([productId, quantity]) => {
      const product = offerProducts.find(p => p._id === productId);
      if (product && quantity > 0) {
        const price = product.db_price || product.mrp || 0;
        const originalSubtotal = price * quantity;
        groupOriginalTotal += originalSubtotal;
        
        newItems.push({
          source: "product",
          source_id: product._id,
          sku: product.sku,
          quantity: quantity,
          unit_price: price,
          subtotal: originalSubtotal, // Will be updated after group calculation
          name: product.short_description,
          available_quantity: product.available_quantity,
          offer_id: selectedOffer._id,
          offer_name: selectedOffer.name,
          offer_type: selectedOffer.config?.type || 'DISCOUNT',
          discount_percentage: 0, // Will be updated
          discount_amount: 0, // Will be updated
          original_subtotal: originalSubtotal,
        });
      }
    });

    // Calculate group-level discount
    const groupDiscount = calculateOfferGroupDiscount(newItems, selectedOffer);
    
    // Second pass: distribute group discount proportionally across items
    if (groupDiscount.discountAmount > 0 && groupOriginalTotal > 0) {
      newItems.forEach(item => {
        const itemProportion = item.original_subtotal / groupOriginalTotal;
        const itemDiscount = groupDiscount.discountAmount * itemProportion;
        item.discount_amount = itemDiscount;
        item.subtotal = item.original_subtotal - itemDiscount;
        item.discount_percentage = (itemDiscount / item.original_subtotal) * 100;
      });
    }

    setCart([...cartWithoutThisOffer, ...newItems]);
    closeOfferDialog();
    
    if (newItems.length > 0) {
      setSuccess(`Updated ${selectedOffer.name} with ${newItems.length} products`);
    } else {
      setSuccess(`Removed all items from ${selectedOffer.name}`);
    }
  };

  const handleForwardToRSM = async (orderId: string) => {
    // Use order's current_approver_role as fallback if currentUserRole hasn't loaded yet
    const role = currentUserRole || selectedOrder?.current_approver_role;
    
    // Determine target role and confirmation message
    let targetRole = "next approver";
    if (role === "ASM") targetRole = "RSM";
    else if (role === "RSM") targetRole = "Sales Admin";
    else if (role === "ZSM") targetRole = "NSM";
    else if (role === "Sales Admin") targetRole = "Order Management";
    else if (role === "Order Management") targetRole = "Finance";
    else if (role === "Finance") targetRole = "Distribution";
    
    if (!confirm(`Forward this order to ${targetRole} for approval?`)) return;
    
    try {
      // Forward to appropriate endpoint based on role
      if (role === "ASM") {
        await api.post(`/ordermanagement/demandorders/${orderId}/forward-to-rsm`);
        setSuccess("Order forwarded to RSM successfully!");
      } else if (role === "RSM") {
        await api.post(`/ordermanagement/demandorders/${orderId}/forward-to-sales-admin`);
        setSuccess("Order forwarded to Sales Admin successfully! (ZSM notified)");
      } else if (role === "ZSM") {
        await api.post(`/ordermanagement/demandorders/${orderId}/forward-to-nsm`);
        setSuccess("Order forwarded to NSM successfully!");
      } else if (role === "Sales Admin") {
        await api.post(`/ordermanagement/demandorders/${orderId}/forward-to-order-management`);
        setSuccess("Order forwarded to Order Management successfully!");
      } else if (role === "Order Management") {
        await api.post(`/ordermanagement/demandorders/${orderId}/forward-to-finance`);
        setSuccess("Order forwarded to Finance successfully!");
      } else if (role === "Finance") {
        await api.post(`/ordermanagement/demandorders/${orderId}/forward-to-distribution`);
        setSuccess("Order forwarded to Distribution successfully!");
      } else {
        await api.post(`/ordermanagement/demandorders/${orderId}/forward-to-rsm`);
        setSuccess("Order forwarded successfully!");
      }
      fetchOrders();
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to forward order");
    }
  };

  const handleCancelOrder = async () => {
    if (!selectedOrder || !cancelReason.trim()) {
      setError("Please provide a cancellation reason");
      return;
    }
    
    try {
      await api.post(`/ordermanagement/demandorders/${selectedOrder._id}/cancel`, {
        reason: cancelReason,
      });
      setSuccess(`Order ${selectedOrder.order_number} cancelled successfully!`);
      setCancelDialog(false);
      setCancelReason("");
      setSelectedOrder(null);
      fetchOrders();
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to cancel order");
    }
  };

  // Handle approve DO (Finance only)
  const handleApproveDO = async (forceApprove: boolean = false) => {
    if (!selectedOrder) return;

    try {
      const response = await api.post(`/ordermanagement/demandorders/${selectedOrder._id}/approve`, {
        comments: approveComments,
        force_approve: forceApprove,
      });

      setSuccess(`Order ${selectedOrder.order_number} approved and forwarded to Distribution successfully!`);
      setApproveDialogOpen(false);
      setViewOrderDialog(false);
      setApproveComments("");
      setUnapprovedPayments([]);
      fetchOrders();
    } catch (err: any) {
      if (err.response?.data?.require_confirmation) {
        // Show confirmation dialog with unapproved payments
        setUnapprovedPayments(err.response.data.unapproved_payments || []);
        setApproveDialogOpen(true);
      } else {
        setError(err.response?.data?.message || "Failed to approve order");
      }
    }
  };

  // Get territory display
  const getTerritoryDisplay = (distributor: Distributor) => {
    if (!distributor.db_point_id) return "N/A";
    
    const ancestors = distributor.db_point_id.ancestors || [];
    const zone = ancestors.find((a) => a.type === "zone")?.name || "N/A";
    const region = ancestors.find((a) => a.type === "region")?.name || "N/A";
    const area = ancestors.find((a) => a.type === "area")?.name || "N/A";
    
    return `${zone} > ${region} > ${area} > ${distributor.db_point_id.name}`;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "submitted":
        return "info";
      case "approved":
        return "success";
      case "rejected":
        return "error";
      case "cancelled":
        return "default";
      default:
        return "default";
    }
  };

  if (loading && orders.length === 0) {
    return (
      <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
          <CircularProgress />
        </Box>
      </Container>
    );
  }

  const paginatedOrders = orders.slice(
    page * rowsPerPage,
    page * rowsPerPage + rowsPerPage
  );

  const cartTotal = cart.reduce((sum, item) => sum + item.subtotal, 0);

  return (
    <Container maxWidth="xl" sx={{ py: 3 }}>
      {/* Header */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4" component="h1" fontWeight="bold">
          {editMode ? "Edit Order" : "Approve Orders"}
        </Typography>
        {editMode && (
          <Badge badgeContent={cart.length} color="primary">
            <Button
              variant="outlined"
              startIcon={<ShoppingCart />}
              onClick={() => setCartDrawerOpen(true)}
            >
              Cart (৳{cartTotal.toFixed(2)})
            </Button>
          </Badge>
        )}
        {!editMode && (
          <Button
            variant="outlined"
            startIcon={<Refresh />}
            onClick={fetchOrders}
            disabled={loading}
          >
            Refresh
          </Button>
        )}
      </Box>

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

      {/* Main Content - Orders List or Edit Catalog */}
      {!editMode ? (
        /* Orders List Tab */
        <Paper>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell><strong>Order Number</strong></TableCell>
                <TableCell><strong>Distributor Details</strong></TableCell>
                <TableCell><strong>Territory</strong></TableCell>
                <TableCell align="right"><strong>Amount</strong></TableCell>
                <TableCell align="center"><strong>Items</strong></TableCell>
                <TableCell><strong>Submitted</strong></TableCell>
                <TableCell><strong>Status</strong></TableCell>
                <TableCell align="center"><strong>Actions</strong></TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {paginatedOrders.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} align="center">
                    <Typography variant="body2" color="text.secondary" py={4}>
                      No orders pending approval
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : (
                paginatedOrders.map((order) => (
                  <TableRow key={order._id} hover>
                    <TableCell>
                      <Typography variant="body2" fontWeight="bold">
                        {order.order_number}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" fontWeight="bold">
                        {order.distributor_id.name}
                      </Typography>
                      <Typography variant="caption" display="block" color="text.secondary">
                        ERP ID: {order.distributor_id.erp_id}
                      </Typography>
                      <Typography variant="caption" display="block" color="text.secondary">
                        Phone: {order.distributor_id.phone}
                      </Typography>
                      <Typography variant="caption" display="block" fontWeight="bold">
                        Contact: {order.distributor_id.contact_person}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="caption" color="text.secondary">
                        {getTerritoryDisplay(order.distributor_id)}
                      </Typography>
                    </TableCell>
                    <TableCell align="right">
                      <Typography variant="body2" fontWeight="bold">
                        ৳{order.total_amount.toLocaleString()}
                      </Typography>
                    </TableCell>
                    <TableCell align="center">
                      <Chip label={order.item_count} size="small" />
                    </TableCell>
                    <TableCell>
                      <Typography variant="caption">
                        {order.submitted_at
                          ? formatDateForDisplay(order.submitted_at)
                          : "N/A"}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={order.status.toUpperCase()}
                        color={getStatusColor(order.status) as any}
                        size="small"
                      />
                    </TableCell>
                    <TableCell align="center">
                      <Tooltip title="View Details">
                        <IconButton
                          size="small"
                          color="primary"
                          onClick={() => handleViewDetails(order)}
                        >
                          <Visibility />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Edit Order">
                        <IconButton
                          size="small"
                          color="info"
                          onClick={() => handleEditOrder(order)}
                          disabled={order.status === "approved" || order.status === "cancelled"}
                        >
                          <Edit />
                        </IconButton>
                      </Tooltip>
                      {currentUserRole === "ASM" && (
                        <Tooltip title="Forward to RSM">
                          <IconButton
                            size="small"
                            color="success"
                            onClick={() => handleForwardToRSM(order._id)}
                          >
                            <Send />
                          </IconButton>
                        </Tooltip>
                      )}
                      <Tooltip title="Cancel Order">
                        <IconButton
                          size="small"
                          color="error"
                          onClick={() => {
                            setSelectedOrder(order);
                            setCancelDialog(true);
                          }}
                        >
                          <CancelIcon />
                        </IconButton>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
        <TablePagination
          rowsPerPageOptions={[10, 25, 50]}
          component="div"
          count={orders.length}
          rowsPerPage={rowsPerPage}
          page={page}
          onPageChange={handleChangePage}
          onRowsPerPageChange={handleChangeRowsPerPage}
        />
      </Paper>
      ) : (
        /* Edit Mode - Catalog Browsing */
        <Box>
          <Alert severity="info" sx={{ mb: 3 }}>
            Editing order. Browse products/offers below and use the cart to modify items. Click "Save Order" when done.
          </Alert>
          
          <Box sx={{ display: 'flex', gap: 2, mb: 3 }}>
            <Button variant="outlined" color="error" onClick={cancelEdit}>
              Cancel Edit
            </Button>
            <Button variant="contained" color="primary" onClick={openSaveDialog} disabled={cart.length === 0}>
              Save Order
            </Button>
          </Box>

          {/* Catalog Tabs */}
          <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
            <Tabs value={catalogTab} onChange={(e, v) => setCatalogTab(v)}>
              <Tab label="Products" icon={<Inventory />} iconPosition="start" />
              <Tab label="Offers" icon={<LocalOffer />} iconPosition="start" />
            </Tabs>
          </Box>

          {/* Search Bar */}
          <TextField
            fullWidth
            placeholder="Search products by SKU or description..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <Search />
                </InputAdornment>
              ),
            }}
            sx={{ mb: 3 }}
          />

          {/* Products Tab */}
          {catalogTab === 0 && (
            <Box>
              {catalogLoading ? (
                <Box display="flex" justifyContent="center" py={4}>
                  <CircularProgress />
                </Box>
              ) : (
                Object.entries(productsByCategory)
                  .filter(([_, data]) => {
                    const products = (data as any).products || [];
                    return products.some((p: Product) =>
                      searchTerm === "" ||
                      p.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
                      p.short_description.toLowerCase().includes(searchTerm.toLowerCase())
                    );
                  })
                  .map(([categoryId, data]) => {
                    const { category, products: catProducts } = data as any;
                    const filteredProducts = catProducts.filter((p: Product) =>
                      searchTerm === "" ||
                      p.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
                      p.short_description.toLowerCase().includes(searchTerm.toLowerCase())
                    );

                    const inCartCount = filteredProducts.filter((p: Product) => 
                      cart.some(item => item.source_id === p._id)
                    ).length;

                    return (
                      <Accordion key={categoryId} sx={{ mb: 2 }}>
                        <AccordionSummary expandIcon={<ExpandMore />}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flex: 1 }}>
                            <Typography variant="h6">
                              {category.parent_name ? `${category.parent_name} > ${category.name}` : category.name}
                            </Typography>
                            <Chip
                              label={`${filteredProducts.length} products`}
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
                                  <TableCell align="right">DB Price</TableCell>
                                  <TableCell align="right">Unit/Case</TableCell>
                                  <TableCell align="right">Available</TableCell>
                                  <TableCell>Brand</TableCell>
                                  <TableCell align="center">Action</TableCell>
                                </TableRow>
                              </TableHead>
                              <TableBody>
                                {filteredProducts.map((product: Product) => {
                                  const inCart = cart.find(item => item.source_id === product._id);
                                  
                                  return (
                                    <TableRow
                                      key={product._id}
                                      hover
                                      sx={{
                                        backgroundColor: inCart ? 'action.selected' : 'inherit'
                                      }}
                                    >
                                      <TableCell>{product.sku}</TableCell>
                                      <TableCell>{product.short_description}</TableCell>
                                      <TableCell align="right">৳{(product.db_price || 0).toFixed(2)}</TableCell>
                                      <TableCell align="right">{(product as any).unit_per_case || (product as any).ctn_pcs || 0}</TableCell>
                                      <TableCell align="right">
                                        <Chip
                                          label={product.available_quantity || 0}
                                          size="small"
                                          color={(product.available_quantity || 0) > 0 ? 'success' : 'error'}
                                        />
                                      </TableCell>
                                      <TableCell>{(product as any).brand?.name || '-'}</TableCell>
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
                                            onClick={() => addToCart(product, 1)}
                                            disabled={(product.available_quantity || 0) <= 0}
                                          >
                                            Add
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
                  })
              )}
            </Box>
          )}

          {/* Offers Tab */}
          {catalogTab === 1 && (
            <Box>
              {catalogLoading ? (
                <Box display="flex" justifyContent="center" py={4}>
                  <CircularProgress />
                </Box>
              ) : offers.length === 0 ? (
                <Alert severity="info">No offers available for this distributor</Alert>
              ) : (
                <Grid2 container spacing={2}>
                  {offers
                    .filter((offer) => 
                      searchTerm === "" ||
                      offer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                      (offer.description && offer.description.toLowerCase().includes(searchTerm.toLowerCase()))
                    )
                    .map((offer) => (
                      <Grid2 size={{ xs: 12, sm: 6, md: 4 }} key={offer._id}>
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
                                  Valid till: {formatDateForDisplay(offer.end_date)}
                                </Typography>
                              )}
                            </Box>

                            {offer.description && (
                              <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                                {offer.description}
                              </Typography>
                            )}
                          </CardContent>

                          <CardActions>
                            <Button
                              variant="contained"
                              fullWidth
                              size="small"
                              startIcon={<Add />}
                              onClick={() => openOfferDetails(offer)}
                              disabled={offer.status === 'Expired' || offer.status === 'Completed' || !offer.active}
                            >
                              View Details
                            </Button>
                          </CardActions>
                        </Card>
                      </Grid2>
                    ))}
                </Grid2>
              )}
            </Box>
          )}
        </Box>
      )}

      {/* Cart Drawer */}
      <Drawer
        anchor="right"
        open={cartDrawerOpen}
        onClose={() => setCartDrawerOpen(false)}
        PaperProps={{ sx: { width: { xs: '100%', sm: 400 } } }}
      >
        <Box sx={{ p: 2 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h6">Shopping Cart ({cart.length})</Typography>
            <Box sx={{ display: 'flex', gap: 1 }}>
              <IconButton onClick={() => setCartDrawerOpen(false)}>
                <Close />
              </IconButton>
            </Box>
          </Box>

          {/* Action Buttons */}
          {editMode && (
            <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
              <Button
                size="small"
                variant="outlined"
                startIcon={<AddShoppingCart />}
                onClick={() => {
                  setCartDrawerOpen(false);
                  setCatalogTab(0);
                }}
                fullWidth
              >
                Add Product
              </Button>
              <Button
                size="small"
                variant="outlined"
                startIcon={<LocalOffer />}
                onClick={() => {
                  setCartDrawerOpen(false);
                  setCatalogTab(1);
                }}
                fullWidth
              >
                Add Offer
              </Button>
            </Box>
          )}
          
          <Divider sx={{ mb: 2 }} />

          {cart.length === 0 ? (
            <Alert severity="info">Your cart is empty</Alert>
          ) : (
            <>
              {/* Group cart items by offer */}
              {(() => {
                // Group items
                const grouped: Record<string, { offer: Offer | null; items: CartItem[] }> = {};
                cart.forEach(item => {
                  const key = item.offer_id || 'no-offer';
                  if (!grouped[key]) {
                    const offer = item.offer_id ? offers.find(o => o._id === item.offer_id) || null : null;
                    grouped[key] = { offer, items: [] };
                  }
                  grouped[key].items.push(item);
                });

                return Object.entries(grouped).map(([groupKey, { offer, items }]) => {
                  const isOfferGroup = groupKey !== 'no-offer';
                  const groupSubtotal = items.reduce((sum, item) => sum + (item.original_subtotal || item.subtotal), 0);
                  const groupTotal = items.reduce((sum, item) => sum + item.subtotal, 0);
                  const groupDiscount = groupSubtotal - groupTotal;

                  return (
                    <Accordion key={groupKey} defaultExpanded sx={{ mb: 2, '&:before': { display: 'none' } }}>
                      <AccordionSummary expandIcon={<ExpandMore />}>
                        <Box sx={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center', pr: 2 }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            {isOfferGroup && <LocalOffer color="success" fontSize="small" />}
                            <Typography variant="subtitle1" fontWeight="bold">
                              {isOfferGroup ? offer?.name : 'Regular Items'}
                            </Typography>
                            <Chip label={`${items.length}`} size="small" />
                          </Box>
                          <Box sx={{ textAlign: 'right' }}>
                            {groupDiscount > 0 && (
                              <Typography variant="caption" color="text.secondary" sx={{ textDecoration: 'line-through', display: 'block' }}>
                                ৳{groupSubtotal.toFixed(2)}
                              </Typography>
                            )}
                            <Typography variant="subtitle1" fontWeight="bold" color={groupDiscount > 0 ? "success.main" : "text.primary"}>
                              ৳{groupTotal.toFixed(2)}
                            </Typography>
                            {groupDiscount > 0 && (
                              <Typography variant="caption" color="success.main">
                                Save ৳{groupDiscount.toFixed(2)}
                              </Typography>
                            )}
                          </Box>
                        </Box>
                      </AccordionSummary>
                      <AccordionDetails>
                        <List>
                          {items.map((item, index) => (
                            <ListItem
                              key={`${item.source_id}-${index}`}
                              sx={{
                                flexDirection: 'column',
                                alignItems: 'stretch',
                                mb: 1,
                                border: '1px solid',
                                borderColor: 'divider',
                                borderRadius: 1,
                              }}
                            >
                              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                                <Box sx={{ flex: 1 }}>
                                  <Typography variant="body2" fontWeight="bold">
                                    {item.sku}
                                  </Typography>
                                  <Typography variant="caption" color="text.secondary">
                                    {item.name}
                                  </Typography>
                                </Box>
                                <IconButton size="small" onClick={() => removeFromCart(cart.indexOf(item))}>
                                  <Delete />
                                </IconButton>
                              </Box>

                              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                  <IconButton
                                    size="small"
                                    onClick={() => updateCartItemQuantity(cart.indexOf(item), item.quantity - 1)}
                                    disabled={item.quantity <= 1}
                                  >
                                    <Remove fontSize="small" />
                                  </IconButton>
                                  <TextField
                                    size="small"
                                    type="number"
                                    value={item.quantity}
                                    onChange={(e) => {
                                      const newQty = parseInt(e.target.value) || 1;
                                      if (newQty >= 1) {
                                        updateCartItemQuantity(cart.indexOf(item), newQty);
                                      }
                                    }}
                                    inputProps={{ min: 1, style: { textAlign: 'center', width: '60px' } }}
                                  />
                                  <IconButton
                                    size="small"
                                    onClick={() => updateCartItemQuantity(cart.indexOf(item), item.quantity + 1)}
                                  >
                                    <Add fontSize="small" />
                                  </IconButton>
                                </Box>
                                <Typography fontWeight="bold">
                                  ৳{item.subtotal.toFixed(2)}
                                </Typography>
                              </Box>
                            </ListItem>
                          ))}
                        </List>
                      </AccordionDetails>
                    </Accordion>
                  );
                });
              })()}

              {/* Total Summary */}
              <Box sx={{ mt: 2, p: 2, bgcolor: 'grey.100', borderRadius: 1 }}>
                {(() => {
                  const originalTotal = cart.reduce((sum, item) => sum + (item.original_subtotal || item.subtotal), 0);
                  const totalSavings = originalTotal - cartTotal;

                  return (
                    <>
                      {totalSavings > 0 && (
                        <>
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                            <Typography variant="body2" color="text.secondary">
                              Subtotal:
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                              ৳{originalTotal.toFixed(2)}
                            </Typography>
                          </Box>
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                            <Typography variant="body2" color="success.main">
                              Offer Savings:
                            </Typography>
                            <Typography variant="body2" color="success.main" fontWeight="bold">
                              -৳{totalSavings.toFixed(2)}
                            </Typography>
                          </Box>
                          <Divider sx={{ my: 1 }} />
                        </>
                      )}
                      <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                        <Typography variant="h6">Total:</Typography>
                        <Typography variant="h6" color={totalSavings > 0 ? "success.main" : "text.primary"}>
                          ৳{cartTotal.toFixed(2)}
                        </Typography>
                      </Box>
                      <Typography variant="caption" color="text.secondary">
                        {cart.length} items
                      </Typography>
                    </>
                  );
                })()}
              </Box>

              {/* Order Summary */}
              {cart.length > 0 && (
                <Box sx={{ mt: 3, p: 2, bgcolor: 'background.paper', border: '1px solid', borderColor: 'divider', borderRadius: 1 }}>
                  <Typography variant="subtitle1" fontWeight="bold" sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Receipt fontSize="small" />
                    Order Summary
                  </Typography>

                  {/* Products */}
                  <Typography variant="subtitle2" fontWeight="bold" color="primary" sx={{ mb: 1 }}>
                    Products
                  </Typography>
                  <List dense sx={{ mb: 2 }}>
                    {cart.filter(item => item.source === 'product').map((item, idx) => (
                      <ListItem key={idx} sx={{ py: 0.5, px: 0 }}>
                        <Box sx={{ width: '100%' }}>
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <Typography variant="body2" fontWeight="medium">
                              {item.sku}
                            </Typography>
                            <Chip label={`${item.quantity} qty`} size="small" color="default" sx={{ ml: 1 }} />
                          </Box>
                          <Typography variant="caption" color="text.secondary">
                            {item.name}
                          </Typography>
                        </Box>
                      </ListItem>
                    ))}
                  </List>

                  {/* Discount Breakdown */}
                  {(() => {
                    const offerGroups = cart.filter(item => item.offer_id).reduce((acc, item) => {
                      const key = item.offer_id!;
                      if (!acc[key]) {
                        acc[key] = { offerName: item.offer_name || 'Offer', discountAmount: 0 };
                      }
                      acc[key].discountAmount += (item.original_subtotal || item.subtotal) - item.subtotal;
                      return acc;
                    }, {} as Record<string, { offerName: string; discountAmount: number }>);

                    const discountBreakdown = Object.values(offerGroups).filter(g => g.discountAmount > 0);

                    return discountBreakdown.length > 0 && (
                      <>
                        <Typography variant="subtitle2" fontWeight="bold" color="warning.main" sx={{ mb: 1 }}>
                          💰 Discounts Applied
                        </Typography>
                        <List dense sx={{ mb: 1 }}>
                          {discountBreakdown.map((discount, index) => (
                            <ListItem key={index} sx={{ py: 0.5, px: 0 }}>
                              <Box sx={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}>
                                <Typography variant="body2">
                                  {discount.offerName}
                                </Typography>
                                <Typography variant="body2" fontWeight="bold" color="success.main">
                                  -৳{discount.discountAmount.toFixed(2)}
                                </Typography>
                              </Box>
                            </ListItem>
                          ))}
                        </List>
                      </>
                    );
                  })()}
                </Box>
              )}

              <Box sx={{ mt: 2, display: 'flex', gap: 1, flexDirection: 'column' }}>
                <Button variant="contained" fullWidth onClick={openSaveDialog}>
                  Save Order
                </Button>
              </Box>
            </>
          )}
        </Box>
      </Drawer>

      {/* Offer Details Dialog */}
      <Dialog 
        open={offerDialogOpen} 
        onClose={closeOfferDialog} 
        maxWidth="md" 
        fullWidth
      >
        <DialogTitle>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Box>
              <Typography variant="h6">{selectedOffer?.name}</Typography>
              {selectedOffer && cart.some(item => item.offer_id === selectedOffer._id) && (
                <Typography variant="caption" color="text.secondary">
                  Editing existing offer in cart
                </Typography>
              )}
            </Box>
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
                    color={selectedOffer.status === 'Active' ? 'success' : 'default'} 
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
                    Valid from: {formatDateForDisplay(selectedOffer.start_date)}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Valid till: {formatDateForDisplay(selectedOffer.end_date)}
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
                      const currentQty = offerSelections[product._id] || 0;
                      
                      return (
                      <Grid2 size={{ xs: 12, sm: 6 }} key={product._id}>
                        <Card 
                          variant="outlined"
                          sx={{
                            border: currentQty > 0 ? '2px solid' : '1px solid',
                            borderColor: currentQty > 0 ? 'success.main' : 'divider',
                            bgcolor: currentQty > 0 ? 'success.50' : 'background.paper'
                          }}
                        >
                          <CardContent>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
                              <Typography variant="subtitle2" gutterBottom>
                                {product.sku}
                              </Typography>
                              {currentQty > 0 && (
                                <Chip
                                  label={`${currentQty} in selection`}
                                  size="small"
                                  color="success"
                                  sx={{ height: 20, fontSize: '0.7rem' }}
                                />
                              )}
                            </Box>
                            <Typography variant="body2" color="text.secondary" gutterBottom>
                              {product.short_description}
                            </Typography>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 1 }}>
                              <Typography variant="body2" fontWeight="bold">
                                ৳{(product.db_price || product.mrp || 0).toFixed(2)}
                              </Typography>
                              <Typography variant="caption" color="text.secondary">
                                {product.available_quantity} available
                              </Typography>
                            </Box>
                          </CardContent>
                          <CardActions sx={{ justifyContent: 'space-between', px: 2 }}>
                            {currentQty > 0 ? (
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, width: '100%' }}>
                                <IconButton
                                  size="small"
                                  onClick={() => updateOfferSelection(product._id, currentQty - 1)}
                                  color="primary"
                                >
                                  <Remove />
                                </IconButton>
                                <TextField
                                  size="small"
                                  type="number"
                                  value={currentQty}
                                  onChange={(e) => {
                                    const val = parseInt(e.target.value) || 0;
                                    updateOfferSelection(product._id, Math.min(val, product.available_quantity));
                                  }}
                                  inputProps={{ 
                                    min: 0, 
                                    max: product.available_quantity,
                                    style: { textAlign: 'center', width: '60px' }
                                  }}
                                />
                                <IconButton
                                  size="small"
                                  onClick={() => updateOfferSelection(product._id, currentQty + 1)}
                                  disabled={currentQty >= product.available_quantity}
                                  color="primary"
                                >
                                  <Add />
                                </IconButton>
                                <IconButton
                                  size="small"
                                  onClick={() => updateOfferSelection(product._id, 0)}
                                  color="error"
                                >
                                  <Delete />
                                </IconButton>
                              </Box>
                            ) : (
                              <Button 
                                size="small" 
                                fullWidth
                                variant="outlined"
                                onClick={() => updateOfferSelection(product._id, 1)}
                                disabled={product.available_quantity <= 0}
                                startIcon={<Add />}
                              >
                                Add
                              </Button>
                            )}
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
        <DialogActions sx={{ flexDirection: 'column', alignItems: 'stretch', gap: 2, p: 2 }}>
          {/* Selection Summary with minimum order hints */}
          {(() => {
            const selectedProducts = Object.entries(offerSelections)
              .map(([productId, qty]) => {
                const product = offerProducts.find(p => p._id === productId);
                if (!product || qty <= 0) return null;
                return {
                  source: "offer" as const,
                  source_id: productId,
                  sku: product.sku,
                  quantity: qty,
                  unit_price: product.db_price || product.mrp || 0,
                  subtotal: (product.db_price || product.mrp || 0) * qty,
                  name: product.short_description,
                  available_quantity: product.available_quantity,
                  offer_id: selectedOffer?._id,
                  offer_name: selectedOffer?.name,
                };
              })
              .filter((item): item is NonNullable<typeof item> => item !== null);

            const subtotal = selectedProducts.reduce((sum, item) => sum + item.subtotal, 0);
            const totalQty = selectedProducts.reduce((sum, item) => sum + item.quantity, 0);
            const groupCalc = calculateOfferGroupDiscount(selectedProducts, selectedOffer || undefined);

            return (
              <Paper sx={{ p: 2, bgcolor: '#f3e5f5', border: '1px solid #9c27b0' }}>
                <Typography variant="subtitle2" gutterBottom>
                  Selection Summary
                </Typography>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                  <Typography variant="body2">
                    {Object.keys(offerSelections).length} products, {totalQty} cartons
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                  <Typography variant="body2">Subtotal:</Typography>
                  <Typography variant="body2" fontWeight="bold">
                    ৳{subtotal.toFixed(2)}
                  </Typography>
                </Box>
                {groupCalc.discountAmount > 0 && (
                  <>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                      <Typography variant="body2" color="success.main">
                        Discount ({groupCalc.discountPercentage || 0}%):
                      </Typography>
                      <Typography variant="body2" fontWeight="bold" color="success.main">
                        -৳{groupCalc.discountAmount.toFixed(2)}
                      </Typography>
                    </Box>
                    <Divider sx={{ my: 1 }} />
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Typography variant="subtitle2">
                        Final Total:
                      </Typography>
                      <Typography variant="subtitle1" fontWeight="bold" color="success.main">
                        ৳{groupCalc.groupTotal.toFixed(2)}
                      </Typography>
                    </Box>
                  </>
                )}
                {groupCalc.meetsMinimum === false && (
                  <Alert severity="warning" sx={{ mt: 1 }}>
                    Add ৳{((groupCalc.minOrderValue || 0) - subtotal).toFixed(2)} more to unlock discount
                  </Alert>
                )}
              </Paper>
            );
          })()}

          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button onClick={closeOfferDialog} fullWidth>
              Cancel
            </Button>
            <Button 
              onClick={applyOfferToCart} 
              variant="contained" 
              fullWidth
              disabled={Object.keys(offerSelections).length === 0}
              startIcon={<ShoppingCart />}
            >
              Apply to Cart
            </Button>
          </Box>
        </DialogActions>
      </Dialog>

      {/* Edit Reason Dialog */}
      <Dialog open={editReasonDialog} onClose={() => setEditReasonDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Save Order Changes</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            fullWidth
            label="Reason for Editing"
            placeholder="E.g., Correcting quantity error, adding requested items, etc."
            value={editReason}
            onChange={(e) => setEditReason(e.target.value)}
            multiline
            rows={3}
            sx={{ mt: 2 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditReasonDialog(false)}>Cancel</Button>
          <Button onClick={saveEditedOrder} variant="contained" disabled={!editReason.trim()}>
            Save Changes
          </Button>
        </DialogActions>
      </Dialog>

      {/* View Order Details Dialog */}
      <Dialog
        open={viewOrderDialog}
        onClose={() => setViewOrderDialog(false)}
        maxWidth="lg"
        fullWidth
      >
        <DialogTitle>
          <Box display="flex" justifyContent="space-between" alignItems="center">
            <Typography variant="h6">
              Order Details: {selectedOrder?.order_number}
            </Typography>
            <IconButton onClick={() => setViewOrderDialog(false)} size="small">
              <Close />
            </IconButton>
          </Box>
        </DialogTitle>
        <DialogContent dividers>
          {selectedOrder && (
            <Box>
              {/* Order Information */}
              <Grid2 container spacing={2} sx={{ mb: 3 }}>
                <Grid2 size={{ xs: 12, sm: 6 }}>
                  <Typography variant="body2" color="text.secondary">
                    Distributor
                  </Typography>
                  <Typography variant="body1" fontWeight="bold">
                    {selectedOrder.distributor_id.name}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    ERP ID: {selectedOrder.distributor_id.erp_id}
                  </Typography>
                </Grid2>
                <Grid2 size={{ xs: 12, sm: 6 }}>
                  <Typography variant="body2" color="text.secondary">
                    Contact Person
                  </Typography>
                  <Typography variant="body1" fontWeight="bold">
                    {selectedOrder.distributor_id.contact_person}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Phone: {selectedOrder.distributor_id.phone}
                  </Typography>
                </Grid2>
                <Grid2 size={{ xs: 12, sm: 6 }}>
                  <Typography variant="body2" color="text.secondary">
                    Status
                  </Typography>
                  <Chip
                    label={selectedOrder.status.toUpperCase().replace(/_/g, " ")}
                    color={getStatusColor(selectedOrder.status) as any}
                    size="small"
                    sx={{ mt: 0.5 }}
                  />
                </Grid2>
                <Grid2 size={{ xs: 12, sm: 6 }}>
                  <Typography variant="body2" color="text.secondary">
                    Submitted At
                  </Typography>
                  <Typography variant="body1">
                    {selectedOrder.submitted_at
                      ? new Date(selectedOrder.submitted_at).toLocaleString()
                      : "N/A"}
                  </Typography>
                </Grid2>
              </Grid2>

              <Divider sx={{ my: 2 }} />

              {/* Order Items */}
              <Typography variant="subtitle1" gutterBottom fontWeight="bold">
                Order Items ({selectedOrder.items.length})
              </Typography>
              <TableContainer sx={{ mb: 3 }}>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>SKU</TableCell>
                      <TableCell>Source</TableCell>
                      <TableCell>Description</TableCell>
                      <TableCell align="right">Quantity</TableCell>
                      <TableCell align="right">Unit Price</TableCell>
                      <TableCell align="right">Subtotal</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {selectedOrder.items.map((item, index) => (
                      <TableRow key={index}>
                        <TableCell>{item.sku}</TableCell>
                        <TableCell>
                          <Chip
                            label={item.source}
                            size="small"
                            color={item.source === "product" ? "primary" : "secondary"}
                          />
                        </TableCell>
                        <TableCell>
                          {item.product_details?.short_description ||
                            item.offer_details?.offer_name ||
                            "N/A"}
                        </TableCell>
                        <TableCell align="right">{item.quantity}</TableCell>
                        <TableCell align="right">
                          ৳{item.unit_price.toFixed(2)}
                        </TableCell>
                        <TableCell align="right">
                          ৳{item.subtotal.toFixed(2)}
                        </TableCell>
                      </TableRow>
                    ))}
                    <TableRow>
                      <TableCell colSpan={5} align="right">
                        <strong>Total:</strong>
                      </TableCell>
                      <TableCell align="right">
                        <strong>৳{selectedOrder.total_amount.toFixed(2)}</strong>
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </TableContainer>

              <Divider sx={{ my: 2 }} />

              {/* Financial Summary */}
              <Typography variant="subtitle1" gutterBottom fontWeight="bold">
                Financial Summary
              </Typography>
              {loadingFinancial ? (
                <Box display="flex" justifyContent="center" py={3}>
                  <CircularProgress size={30} />
                </Box>
              ) : financialSummary ? (
                <Box sx={{ display: "flex", justifyContent: "flex-end", mb: 3 }}>
                  <Box sx={{ minWidth: 300 }}>
                    <Box
                      display="flex"
                      justifyContent="space-between"
                      alignItems="center"
                      py={1}
                    >
                      <Typography variant="body2" color="text.secondary">
                        Order Total:
                      </Typography>
                      <Typography variant="body1" fontWeight="bold">
                        ৳{(financialSummary.orderTotal || 0).toFixed(2)}
                      </Typography>
                    </Box>
                    <Divider />
                    <Box
                      display="flex"
                      justifyContent="space-between"
                      alignItems="center"
                      py={1}
                    >
                      <Typography variant="body2" color="text.secondary">
                        Available Balance:
                      </Typography>
                      <Typography variant="body1" fontWeight="bold" color="success.main">
                        ৳{(financialSummary.availableBalance || 0).toFixed(2)}
                      </Typography>
                    </Box>
                    <Box
                      display="flex"
                      justifyContent="space-between"
                      alignItems="center"
                      py={1}
                    >
                      <Typography variant="body2" color="text.secondary">
                        Remaining Amount:
                      </Typography>
                      <Typography
                        variant="body1"
                        fontWeight="bold"
                        color={
                          (financialSummary.remainingAmount || 0) > 0
                            ? "error.main"
                            : "text.primary"
                        }
                      >
                        ৳{(financialSummary.remainingAmount || 0).toFixed(2)}
                      </Typography>
                    </Box>
                    <Divider />
                    <Box
                      display="flex"
                      justifyContent="space-between"
                      alignItems="center"
                      py={1}
                    >
                      <Typography variant="body2" color="text.secondary">
                        Unapproved Payments:
                      </Typography>
                      <Typography variant="body1">
                        ৳{(financialSummary.unapprovedPayments || 0).toFixed(2)}
                      </Typography>
                    </Box>
                    <Box
                      display="flex"
                      justifyContent="space-between"
                      alignItems="center"
                      py={1}
                    >
                      <Typography variant="body2" color="text.secondary">
                        Due Amount:
                      </Typography>
                      <Typography
                        variant="body1"
                        fontWeight="bold"
                        color={
                          (financialSummary.dueAmount || 0) > 0
                            ? "error.main"
                            : "success.main"
                        }
                      >
                        ৳{(financialSummary.dueAmount || 0).toFixed(2)}
                      </Typography>
                    </Box>
                  </Box>
                </Box>
              ) : null}

              <Divider sx={{ my: 2 }} />

              {/* Payments */}
              <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                <Typography variant="subtitle1" fontWeight="bold">
                  Payments
                </Typography>
                <Button
                  variant="contained"
                  startIcon={<AttachMoney />}
                  size="small"
                  onClick={() => {
                    setEditingPayment(null);
                    setPaymentDialogOpen(true);
                  }}
                  disabled={selectedOrder.status === "approved" || selectedOrder.status === "cancelled"}
                >
                  Add Payment
                </Button>
              </Box>
              {financialSummary?.payments && financialSummary.payments.length > 0 ? (
                <TableContainer>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>Transaction ID</TableCell>
                        <TableCell>Date</TableCell>
                        <TableCell>Method</TableCell>
                        <TableCell align="right">Amount</TableCell>
                        <TableCell>Status</TableCell>
                        <TableCell align="center">Actions</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {financialSummary.payments.map((payment: any) => (
                        <TableRow key={payment._id}>
                          <TableCell>{payment.transaction_id}</TableCell>
                          <TableCell>
                            {(payment.payment_date || payment.deposit_date) ? formatDateForDisplay(payment.payment_date || payment.deposit_date) : 'N/A'}
                          </TableCell>
                          <TableCell>
                            <Chip
                              label={payment.payment_method.toUpperCase()}
                              size="small"
                              variant="outlined"
                            />
                          </TableCell>
                          <TableCell align="right">
                            ৳{(payment.amount || payment.deposit_amount || 0).toFixed(2)}
                          </TableCell>
                          <TableCell>
                            <Chip
                              label={payment.status.toUpperCase().replace(/_/g, " ")}
                              size="small"
                              color={
                                payment.status === "approved"
                                  ? "success"
                                  : payment.status === "cancelled"
                                  ? "error"
                                  : "warning"
                              }
                            />
                          </TableCell>
                          <TableCell align="center">
                            {/* Approve Payment Button (Finance only) - DO-attached payments can be approved by Finance */}
                            {currentUserRole === "Finance" && 
                             payment.status !== "approved" && 
                             payment.status !== "cancelled" && (
                              <Tooltip title="Approve Payment">
                                <IconButton
                                  size="small"
                                  color="success"
                                  onClick={async () => {
                                    const paymentSource = payment.payment_method === 'Cash' 
                                      ? payment.cash_method || 'Cash'
                                      : (payment.company_bank?.name || payment.depositor_bank?.name || 'Bank');
                                    const depositDate = payment.payment_date || payment.deposit_date;
                                    if (!confirm(`Approve payment of ৳${payment.deposit_amount?.toLocaleString()} from ${paymentSource}?\n\nTransaction ID: ${payment.transaction_id}\nDeposit Date: ${depositDate ? formatDateForDisplay(depositDate) : 'N/A'}\n\nThis will create a credit entry in the distributor's ledger.`)) {
                                      return;
                                    }
                                    
                                    // Clear any previous errors
                                    setError(null);
                                    
                                    try {
                                      await api.post(`/ordermanagement/collections/${payment._id}/approve`, {
                                        comments: "Approved by Finance",
                                      });
                                      setSuccess("Payment approved successfully! Credit entry created in distributor ledger.");
                                      if (selectedOrder?._id) {
                                        fetchFinancialSummary(selectedOrder._id);
                                      }
                                    } catch (err: any) {
                                      setError(err.response?.data?.message || "Failed to approve payment");
                                    }
                                  }}
                                >
                                  <CheckCircle fontSize="small" />
                                </IconButton>
                              </Tooltip>
                            )}                            <Tooltip title="Edit Payment">
                              <span>
                                <IconButton
                                  size="small"
                                  color="primary"
                                  onClick={() => {
                                    // Transform payment data to match CollectionForm's expected format
                                    const transformedPayment = {
                                      ...payment,
                                      deposit_date: payment.deposit_date,
                                      do_no: payment.do_no || selectedOrder?.order_number,
                                      // Ensure all fields are properly mapped
                                      payment_method: payment.payment_method,
                                      cash_method: payment.cash_method,
                                      depositor_mobile: payment.depositor_mobile,
                                      depositor_branch: payment.depositor_branch,
                                      company_bank_account_no: payment.company_bank_account_no,
                                      note: payment.note,
                                      check_number: payment.check_number,
                                      image: payment.image,
                                    };
                                    setEditingPayment(transformedPayment);
                                    setPaymentDialogOpen(true);
                                  }}
                                  disabled={
                                    payment.status === "approved" ||
                                    payment.status === "cancelled"
                                  }
                                >
                                  <Edit fontSize="small" />
                                </IconButton>
                              </span>
                            </Tooltip>
                            <Tooltip title="Delete Payment">
                              <span>
                                <IconButton
                                  size="small"
                                  color="error"
                                  onClick={() => {
                                    setDeletePaymentId(payment._id);
                                    setDeleteConfirmOpen(true);
                                  }}
                                  disabled={
                                    payment.status === "approved" ||
                                    payment.status === "cancelled"
                                  }
                                >
                                  <Delete fontSize="small" />
                                </IconButton>
                              </span>
                            </Tooltip>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              ) : (
                <Alert severity="info">No payments recorded for this order yet.</Alert>
              )}

              {/* Discount and Free Products Summary */}
              {selectedOrder && selectedOrder.items && (() => {
                console.log('🚨🚨🚨 ORDER DETAILS OFFERS SUMMARY RENDERING 🚨🚨🚨');
                console.log('🔍 RAW ORDER ITEMS:', selectedOrder.items);
                console.log('🔍 Number of items:', selectedOrder.items.length);
                selectedOrder.items.forEach((item, idx) => {
                  console.log(`Item ${idx}:`, {
                    sku: item.sku,
                    has_offer_details: !!item.offer_details,
                    offer_id: item.offer_details?.offer_id,
                    offer_name: item.offer_details?.offer_name,
                    discount_amount: item.offer_details?.discount_amount,
                    original_subtotal: item.offer_details?.original_subtotal,
                  });
                });
                // Reconstruct cart items with offer details (same as editDraftOrder)
                const cartItems: any[] = selectedOrder.items.map((item) => ({
                  source: item.source,
                  source_id: item.source_id,
                  sku: item.sku,
                  quantity: item.quantity,
                  unit_price: item.unit_price,
                  subtotal: item.subtotal,
                  name: item.sku,
                  available_quantity: 0,
                  // Include offer details if ANY offer field exists
                  ...(item.offer_details && (item.offer_details.offer_id || item.offer_details.offer_name) && {
                    offer_id: item.offer_details.offer_id,
                    offer_name: item.offer_details.offer_name,
                    offer_type: item.offer_details.offer_type,
                    discount_percentage: item.offer_details.discount_percentage,
                    discount_amount: item.offer_details.discount_amount,
                    original_subtotal: item.offer_details.original_subtotal,
                  }),
                }));

                // Group cart items by offer_id or offer_name (same logic as sidebar)
                const groups: Record<string, { offer: any; items: any[] }> = {};
                cartItems.forEach((item) => {
                  const key = item.offer_id?.toString() || item.offer_name || 'no-offer';
                  if (!groups[key]) {
                    groups[key] = {
                      offer: (item.offer_id || item.offer_name) ? { _id: item.offer_id, name: item.offer_name, config: { type: item.offer_type } } : null,
                      items: [],
                    };
                  }
                  groups[key].items.push(item);
                });
                console.log('🔍 DEBUG Groups:', groups);
                console.log('🔍 DEBUG Cart Items:', cartItems);

                // Calculate discount from saved subtotals
                const discountBreakdown: Array<{ offerName: string; discountAmount: number; items: any[] }> = [];
                Object.values(groups).forEach(({ offer, items }) => {
                  let groupOriginal = 0;
                  let groupActual = 0;
                  items.forEach(item => {
                    groupOriginal += (item.original_subtotal || item.unit_price * item.quantity);
                    groupActual += item.subtotal;
                  });
                  const discountAmount = groupOriginal - groupActual;
                  console.log(`🔍 Group "${offer?.name || 'no-offer'}": original=${groupOriginal}, actual=${groupActual}, discount=${discountAmount}`);
                  if (discountAmount > 0) {
                    discountBreakdown.push({
                      offerName: offer?.name || 'Regular Discount',
                      discountAmount: discountAmount,
                      items: items,
                    });
                  }
                });
                console.log('🔍 DEBUG Discount Breakdown:', discountBreakdown);

                const totalDiscount = discountBreakdown.reduce((sum, d) => sum + d.discountAmount, 0);
                const offers = discountBreakdown.map(d => ({
                  offerName: d.offerName,
                  offerType: 'DISCOUNT',
                  items: d.items,
                  totalDiscount: d.discountAmount,
                  totalFreeValue: 0,
                }));
                const totalFreeValue = 0;
                const discountOffers = offers;
                const freeProductOffers: any[] = [];

                if (offers.length === 0) {
                  return null;
                }

                return (
                  <>
                    <Divider sx={{ my: 3 }} />
                    <Typography variant="h6" sx={{ mb: 2 }}>
                      Offers Summary
                    </Typography>
                    <Box>
                      {/* Summary Cards */}
                      <Grid2 container spacing={2} sx={{ mb: 2 }}>
                        <Grid2 size={{ xs: 12, sm: 6 }}>
                          <Paper sx={{ p: 2, bgcolor: 'success.50', border: '1px solid', borderColor: 'success.200' }}>
                            <Typography variant="caption" color="text.secondary">Total Discount</Typography>
                            <Typography variant="h6" color="success.dark">৳{totalDiscount.toFixed(2)}</Typography>
                            <Typography variant="caption">{discountOffers.length} discount offer(s)</Typography>
                          </Paper>
                        </Grid2>
                        <Grid2 size={{ xs: 12, sm: 6 }}>
                          <Paper sx={{ p: 2, bgcolor: 'secondary.50', border: '1px solid', borderColor: 'secondary.200' }}>
                            <Typography variant="caption" color="text.secondary">Free Products Value</Typography>
                            <Typography variant="h6" color="secondary.dark">৳{totalFreeValue.toFixed(2)}</Typography>
                            <Typography variant="caption">{freeProductOffers.length} free product offer(s)</Typography>
                          </Paper>
                        </Grid2>
                      </Grid2>

                      {/* Offers Breakdown */}
                      <Typography variant="subtitle2" fontWeight="bold" sx={{ mb: 1 }}>
                        Offers Applied
                      </Typography>
                      <List dense>
                        {offers.map((offer, idx) => (
                          <ListItem key={idx} sx={{ py: 1, px: 0, alignItems: 'flex-start', borderBottom: '1px solid', borderColor: 'divider' }}>
                            <ListItemText
                              primary={
                                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.5 }}>
                                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                    <Typography variant="body2" fontWeight="medium">
                                      {offer.offerName}
                                    </Typography>
                                    <Chip label={offer.offerType} size="small" color="primary" />
                                  </Box>
                                  <Typography variant="body2" fontWeight="bold" color={offer.totalDiscount > 0 ? 'success.dark' : 'secondary.dark'}>
                                    {offer.totalDiscount > 0 && `-৳${offer.totalDiscount.toFixed(2)}`}
                                    {offer.totalFreeValue > 0 && `৳${offer.totalFreeValue.toFixed(2)} free`}
                                  </Typography>
                                </Box>
                              }
                              secondary={
                                <Box>
                                  <Typography variant="caption" color="text.secondary" display="block">
                                    {offer.items.length} item(s) in this offer
                                  </Typography>
                                  <Box sx={{ mt: 1 }}>
                                    {offer.items.map((item, itemIdx) => (
                                      <Box key={itemIdx} sx={{ display: 'flex', justifyContent: 'space-between', py: 0.25 }}>
                                        <Typography variant="caption" color="text.secondary">
                                          {item.sku} × {item.quantity}
                                        </Typography>
                                        <Typography variant="caption" color="text.secondary">
                                          {(() => {
                                            const originalSubtotal = (item as any).original_subtotal || item.offer_details?.original_subtotal || item.unit_price * item.quantity;
                                            const actualSubtotal = item.subtotal || 0;
                                            const itemDiscount = originalSubtotal - actualSubtotal;
                                            if (actualSubtotal === 0 || item.offer_details?.is_free_in_bundle) {
                                              return 'Free';
                                            } else if (itemDiscount > 0) {
                                              return `-৳${itemDiscount.toFixed(2)}`;
                                            }
                                            return '';
                                          })()}
                                        </Typography>
                                      </Box>
                                    ))}
                                  </Box>
                                </Box>
                              }
                              secondaryTypographyProps={{ component: 'div' }}
                            />
                          </ListItem>
                        ))}
                      </List>
                    </Box>
                  </>
                );
              })()}

              <Divider sx={{ my: 3 }} />

              {/* Order History Timeline */}
              <Typography variant="subtitle1" gutterBottom fontWeight="bold">
                Order History
              </Typography>
              {selectedOrder.approval_history && selectedOrder.approval_history.length > 0 ? (
                <Timeline position="right">
                  {[...selectedOrder.approval_history].reverse().map((history: any, index: number) => (
                    <TimelineItem key={index}>
                      <TimelineOppositeContent color="text.secondary" sx={{ flex: 0.3 }}>
                        <Typography variant="caption">
                          {new Date(history.timestamp).toLocaleString()}
                        </Typography>
                      </TimelineOppositeContent>
                      <TimelineSeparator>
                        <TimelineDot
                          color={
                            history.action === "submit" || history.action === "submitted"
                              ? "primary"
                              : history.action === "forward" || history.action === "forwarded"
                              ? "info"
                              : history.action === "return"
                              ? "warning"
                              : history.action === "modify" || history.action === "schedule"
                              ? "warning"
                              : history.action === "approve" || history.action === "approved"
                              ? "success"
                              : history.action === "reject" || history.action === "rejected" || history.action === "cancel"
                              ? "error"
                              : "grey"
                          }
                        />
                        {index < [...selectedOrder.approval_history].reverse().length - 1 && <TimelineConnector />}
                      </TimelineSeparator>
                      <TimelineContent>
                        <Typography variant="subtitle2" fontWeight="bold">
                          {history.action.replace(/_/g, ' ').toUpperCase()}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          By: {history.performed_by_name || 'N/A'} ({history.performed_by_role || 'N/A'})
                        </Typography>
                        {history.comments && (
                          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                            Note: {history.comments}
                          </Typography>
                        )}
                      </TimelineContent>
                    </TimelineItem>
                  ))}
                </Timeline>
              ) : (
                <Alert severity="info">No history available for this order.</Alert>
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => setViewOrderDialog(false)}
            startIcon={<Close />}
          >
            Close
          </Button>
          {/* Return to Sales Admin Button (for Order Management, Finance, Distribution) */}
          {(() => {
            const role = currentUserRole || selectedOrder?.current_approver_role;
            if (role === "Order Management" || role === "Finance" || role === "Distribution") {
              return (
                <Button
                  onClick={async () => {
                    if (!confirm("Return this order to Sales Admin for review?")) return;
                    try {
                      await api.post(`/ordermanagement/demandorders/${selectedOrder?._id}/return-to-sales-admin`);
                      setSuccess("Order returned to Sales Admin successfully!");
                      setViewOrderDialog(false);
                      fetchOrders();
                    } catch (err: any) {
                      setError(err.response?.data?.message || "Failed to return order to Sales Admin");
                    }
                  }}
                  variant="outlined"
                  color="warning"
                  startIcon={<Send />}
                  disabled={
                    selectedOrder?.status === "approved" ||
                    selectedOrder?.status === "cancelled"
                  }
                >
                  Return to Sales Admin
                </Button>
              );
            }
            return null;
          })()}
          
          {/* Forward Button (not shown for Distribution or Finance) */}
          {(() => {
            const role = currentUserRole || selectedOrder?.current_approver_role;
            // Hide for Distribution and Finance roles
            if (role === "Distribution" || role === "Finance") return null;
            
            return (
              <Button
                onClick={() => {
                  setViewOrderDialog(false);
                  handleForwardToRSM(selectedOrder?._id || "");
                }}
                variant="contained"
                color="success"
                startIcon={<Send />}
                disabled={
                  selectedOrder?.status !== "submitted" && 
                  selectedOrder?.status !== "forwarded_to_rsm" && 
                  selectedOrder?.status !== "forwarded_to_sales_admin" &&
                  selectedOrder?.status !== "forwarded_to_order_management" &&
                  selectedOrder?.status !== "forwarded_to_finance"
                }
              >
                {(() => {
                  if (role === "ASM") return "Forward to RSM";
                  if (role === "RSM") return "Forward to Sales Admin";
                  if (role === "ZSM") return "Forward to NSM";
                  if (role === "Sales Admin") return "Forward to Order Management";
                  if (role === "Order Management") return "Forward to Finance";
                  return "Forward";
                })()}
              </Button>
            );
          })()}

          {/* Approve DO Button (Finance only) */}
          {(() => {
            const role = currentUserRole || selectedOrder?.current_approver_role;
            if (role !== "Finance") return null;
            
            return (
              <Button
                onClick={() => handleApproveDO(false)}
                variant="contained"
                color="success"
                startIcon={<Send />}
                disabled={
                  selectedOrder?.current_approver_role !== "Finance" || 
                  selectedOrder?.status === "approved" || 
                  selectedOrder?.status === "cancelled"
                }
              >
                Approve DO
              </Button>
            );
          })()}
          
          <Button
            onClick={() => {
              setViewOrderDialog(false);
              setCancelDialog(true);
            }}
            variant="outlined"
            color="error"
            startIcon={<CancelIcon />}
            disabled={
              selectedOrder?.status === "approved" ||
              selectedOrder?.status === "cancelled"
            }
          >
            Cancel Order
          </Button>
        </DialogActions>
      </Dialog>

      {/* Cancel Order Dialog */}
      <Dialog open={cancelDialog} onClose={() => setCancelDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Cancel Order: {selectedOrder?.order_number}</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Cancellation Reason"
            fullWidth
            multiline
            rows={4}
            value={cancelReason}
            onChange={(e) => setCancelReason(e.target.value)}
            placeholder="Please provide a reason for cancelling this order..."
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCancelDialog(false)}>Cancel</Button>
          <Button
            onClick={handleCancelOrder}
            color="error"
            variant="contained"
            disabled={!cancelReason.trim()}
          >
            Confirm Cancellation
          </Button>
        </DialogActions>
      </Dialog>

      {/* Approve DO Confirmation Dialog (Finance only) */}
      <Dialog
        open={approveDialogOpen}
        onClose={() => {
          setApproveDialogOpen(false);
          setUnapprovedPayments([]);
          setApproveComments("");
        }}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          <Box display="flex" alignItems="center" gap={1}>
            <Typography variant="h6" color="warning.main">
              ⚠️ Approve Order: {selectedOrder?.order_number}
            </Typography>
          </Box>
        </DialogTitle>
        <DialogContent>
          <Alert severity="warning" sx={{ mb: 3 }}>
            <Typography variant="subtitle2" fontWeight="bold" gutterBottom>
              Unapproved Payments Detected
            </Typography>
            <Typography variant="body2">
              This DO has {unapprovedPayments.length} attached payment(s) that are not yet approved.
              Do you want to approve this DO without approving all payments?
            </Typography>
          </Alert>

          <Typography variant="subtitle2" fontWeight="bold" gutterBottom>
            Unapproved Payments:
          </Typography>
          <TableContainer component={Paper} variant="outlined" sx={{ mb: 3 }}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Transaction ID</TableCell>
                  <TableCell align="right">Amount</TableCell>
                  <TableCell>Status</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {unapprovedPayments.map((payment) => (
                  <TableRow key={payment.transaction_id}>
                    <TableCell>{payment.transaction_id}</TableCell>
                    <TableCell align="right">৳{payment.amount?.toFixed(2)}</TableCell>
                    <TableCell>
                      <Chip
                        label={payment.status.replace(/_/g, " ")}
                        size="small"
                        color="warning"
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>

          <TextField
            margin="dense"
            label="Comments (Optional)"
            fullWidth
            multiline
            rows={3}
            value={approveComments}
            onChange={(e) => setApproveComments(e.target.value)}
            placeholder="Add any comments about this approval..."
          />
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => {
              setApproveDialogOpen(false);
              setUnapprovedPayments([]);
              setApproveComments("");
            }}
          >
            Cancel
          </Button>
          <Button
            onClick={() => handleApproveDO(true)}
            color="success"
            variant="contained"
            startIcon={<Send />}
          >
            Approve Anyway
          </Button>
        </DialogActions>
      </Dialog>

      {/* Collection/Payment Form Dialog */}
      <CollectionForm
        open={paymentDialogOpen}
        onClose={() => {
          setPaymentDialogOpen(false);
          setEditingPayment(null);
        }}
        onSuccess={() => {
          setPaymentDialogOpen(false);
          setEditingPayment(null);
          setSuccess(editingPayment ? "Payment updated successfully!" : "Payment added successfully!");
          // Refresh financial summary if viewing an order
          if (selectedOrder?._id) {
            fetchFinancialSummary(selectedOrder._id);
          }
        }}
        defaultDONumber={selectedOrder?.order_number || ""}
        distributorId={typeof selectedOrder?.distributor_id === 'object' ? selectedOrder?.distributor_id?._id : selectedOrder?.distributor_id}
        collection={editingPayment}
      />

      {/* Delete Payment Confirmation Dialog */}
      <Dialog
        open={deleteConfirmOpen}
        onClose={() => {
          setDeleteConfirmOpen(false);
          setDeletePaymentId(null);
        }}
        maxWidth="xs"
      >
        <DialogTitle>Confirm Delete</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete this payment? This action cannot be
            undone.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => {
              setDeleteConfirmOpen(false);
              setDeletePaymentId(null);
            }}
          >
            Cancel
          </Button>
          <Button
            onClick={handleDeletePayment}
            color="error"
            variant="contained"
          >
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default ApproveOrdersPage;
