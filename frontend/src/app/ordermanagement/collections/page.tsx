"use client";

import React, { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { useSocket } from "@/contexts/SocketContext";
import {
  Box,
  Typography,
  Button,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  Chip,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem,
  Stack,
  Alert,
  CircularProgress,
  Tooltip,
  InputAdornment,
  ToggleButtonGroup,
  ToggleButton,
  Card,
  CardContent,
  CardActions,
  Grid,
  Tabs,
  Tab,
  Badge,
} from "@mui/material";
import {
  Add as AddIcon,
  Visibility as VisibilityIcon,
  Delete as DeleteIcon,
  FilterList as FilterIcon,
  PictureAsPdf as PdfIcon,
  Image as ImageIcon,
  Payment as PaymentIcon,
  Search as SearchIcon,
  ViewList as ViewListIcon,
  ViewModule as ViewModuleIcon,
  Edit as EditIcon,
  CheckCircle as CheckCircleIcon,
} from "@mui/icons-material";

import { format } from "date-fns";
import { formatDateForDisplay } from "@/lib/dateUtils";
import collectionsApi, { Collection } from "@/services/collectionsApi";
import api from "@/lib/api";
import CollectionForm from "./components/CollectionForm";
import CollectionFiltersDialog, {
  CollectionFilters,
} from "./components/CollectionFiltersDialog";
import CollectionDetails from "./components/CollectionDetails";
import ImageViewer from "@/components/common/ImageViewer";
import ColumnVisibilityMenu from "@/components/common/ColumnVisibilityMenu";
import { useAuth } from "@/contexts/AuthContext";
import toast from "react-hot-toast";

interface CollectionColumnDefinition {
  id: string;
  label: string;
  align?: "inherit" | "left" | "center" | "right" | "justify";
  alwaysVisible?: boolean;
  renderCell: (collection: Collection) => React.ReactNode;
}

const COLLECTION_COLUMN_STORAGE_KEY = "ordermanagement:collections:visibleColumns";

export default function PaymentsPage() {
  const { user } = useAuth();
  const [collections, setCollections] = useState<Collection[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(25);
  const [total, setTotal] = useState(0);
  const [searchTerm, setSearchTerm] = useState("");
  const [viewMode, setViewMode] = useState<"cards" | "list">("list");
  const [activeTab, setActiveTab] = useState<"myQueue" | "all">("myQueue");
  const [currentUserRole, setCurrentUserRole] = useState<string | null>(null);
  const { socket, isConnected } = useSocket();

  // Dialogs
  const [formOpen, setFormOpen] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [filterOpen, setFilterOpen] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [selectedCollection, setSelectedCollection] = useState<Collection | null>(null);
  const [collectionToDelete, setCollectionToDelete] = useState<string | null>(null);

  // Column visibility
  const [visibleColumnIds, setVisibleColumnIds] = useState<string[]>([]);
  const [persistedColumnIds, setPersistedColumnIds] = useState<string[]>([]);
  const columnStateHydratedRef = useRef(false);

  // Filters
  const [filters, setFilters] = useState({
    approval_status: "",
    payment_method: "",
    date_from: null as Date | null,
    date_to: null as Date | null,
    amount_min: "",
    amount_max: "",
    transaction_id: "",
    do_no: "",
  });

  // Image Viewer
  const [imageViewerOpen, setImageViewerOpen] = useState(false);
  const [selectedImage, setSelectedImage] = useState<{
    url: string;
    name: string;
    type: string;
  } | null>(null);

  const loadCollections = useCallback(async () => {
    try {
      setLoading(true);
      const params: any = {
        page: page + 1,
        limit: rowsPerPage,
        sort: '-created_at', // Sort by latest first
      };

      // Role-based filtering for "My Queue" tab
      if (activeTab === "myQueue" && user?.role?.role) {
        params.current_handler_role = user.role.role;
      }

      if (filters.approval_status) params.approval_status = filters.approval_status;
      if (filters.payment_method) params.payment_method = filters.payment_method;
      if (filters.date_from) params.date_from = format(filters.date_from, "yyyy-MM-dd");
      if (filters.date_to) params.date_to = format(filters.date_to, "yyyy-MM-dd");
      if (filters.amount_min) params.amount_min = filters.amount_min;
      if (filters.amount_max) params.amount_max = filters.amount_max;
      if (filters.transaction_id) params.transaction_id = filters.transaction_id;
      if (filters.do_no) params.do_no = filters.do_no;

      const response = await collectionsApi.getCollections(params);
      setCollections(response.data.collections);
      setTotal(response.data.pagination.total);
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to load payments");
    } finally {
      setLoading(false);
    }
  }, [page, rowsPerPage, filters, activeTab, user]);

  // Fetch current user role
  useEffect(() => {
    const fetchCurrentUserRole = async () => {
      try {
        const response = await api.get("/auth/me");
        const roleName = response.data.data.user?.role?.role || null;
        setCurrentUserRole(roleName);
      } catch (error) {
        console.error("Failed to fetch user role:", error);
      }
    };
    fetchCurrentUserRole();
  }, []);

  useEffect(() => {
    loadCollections();
  }, [loadCollections]);

  // WebSocket real-time updates
  useEffect(() => {
    if (!socket) return;

    const handleCollectionCreated = () => {
      console.log("🔔 Collection created - refreshing list");
      loadCollections();
    };

    const handleCollectionUpdated = async (data: any) => {
      console.log("🔔 Collection updated - refreshing list", data);
      loadCollections();
      
      // If the details dialog is open for this collection, refresh it
      if (selectedCollection && data?._id === selectedCollection._id) {
        try {
          const response = await collectionsApi.getCollection(selectedCollection._id);
          setSelectedCollection(response.data);
        } catch (error) {
          console.error("Failed to refresh selected collection:", error);
        }
      }
    };

    const handleCollectionDeleted = () => {
      console.log("🔔 Collection deleted - refreshing list");
      loadCollections();
    };

    socket.on("collection:created", handleCollectionCreated);
    socket.on("collection:updated", handleCollectionUpdated);
    socket.on("collection:deleted", handleCollectionDeleted);

    return () => {
      socket.off("collection:created", handleCollectionCreated);
      socket.off("collection:updated", handleCollectionUpdated);
      socket.off("collection:deleted", handleCollectionDeleted);
    };
  }, [socket, loadCollections, selectedCollection]);

  const getStatusLabel = (status: string | undefined): string => {
    if (!status) return "Pending";
    const statusMap: Record<string, string> = {
      pending_distributor: "Pending Distributor",
      pending_asm: "Pending ASM",
      pending_rsm: "Pending RSM",
      pending_sales_admin: "Pending Sales Admin",
      pending_order_management: "Pending Order Management",
      pending_finance: "Pending Finance",
      returned_to_sales_admin: "Returned to Sales Admin",
      approved: "Approved",
      cancelled: "Cancelled",
    };
    return statusMap[status] || status;
  };

  const getStatusColor = (
    status: string | undefined
  ): "default" | "primary" | "secondary" | "error" | "warning" | "info" | "success" => {
    if (!status) return "default";
    const colorMap: Record<string, "default" | "primary" | "secondary" | "error" | "warning" | "info" | "success"> = {
      pending_distributor: "info",
      pending_asm: "info",
      pending_rsm: "info",
      pending_sales_admin: "info",
      pending_order_management: "warning",
      pending_finance: "warning",
      returned_to_sales_admin: "error",
      approved: "success",
      cancelled: "default",
    };
    return colorMap[status] || "default";
  };

  const handleViewDetails = async (collection: Collection) => {
    setSelectedCollection(collection);
    setDetailsOpen(true);
  };

  const handleDelete = async () => {
    if (!collectionToDelete) return;

    try {
      await collectionsApi.deleteCollection(collectionToDelete);
      toast.success("Payment deleted successfully");
      setDeleteConfirmOpen(false);
      setCollectionToDelete(null);
      loadCollections();
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to delete payment");
    }
  };

  const handleFormSuccess = () => {
    setFormOpen(false);
    loadCollections();
    toast.success("Payment submitted successfully");
  };

  const handleViewImage = (image: Collection["image"]) => {
    if (!image) return;

    // Static files are served from root /uploads, not /api/v1/uploads
    const baseUrl = process.env.NEXT_PUBLIC_API_URL?.replace('/api/v1', '') || '';
    setSelectedImage({
      url: `${baseUrl}${image.file_path}`,
      name: image.file_name,
      type: image.mime_type,
    });
    setImageViewerOpen(true);
  };

  const handleApplyFilters = (newFilters: CollectionFilters) => {
    setFilters({
      approval_status: newFilters.approval_status || "",
      payment_method: newFilters.payment_method || "",
      date_from: newFilters.date_from || null,
      date_to: newFilters.date_to || null,
      amount_min: newFilters.amount_min || "",
      amount_max: newFilters.amount_max || "",
      transaction_id: newFilters.transaction_id || "",
      do_no: newFilters.do_no || "",
    });
    setPage(0);
    setFilterOpen(false);
  };

  const handleClearFilters = () => {
    setFilters({
      approval_status: "",
      payment_method: "",
      date_from: null,
      date_to: null,
      amount_min: "",
      amount_max: "",
      transaction_id: "",
      do_no: "",
    });
    setPage(0);
  };

  const handleTabChange = (_event: React.SyntheticEvent, newValue: "myQueue" | "all") => {
    setActiveTab(newValue);
    setPage(0);
  };

  const handleActionComplete = () => {
    loadCollections();
    setDetailsOpen(false);
  };

  const formatAmount = (amount: string) => {
    return parseFloat(amount).toLocaleString("en-BD", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  const formatDate = useCallback((dateString: string) => {
    if (!dateString) return "-";
    return formatDateForDisplay(dateString);
  }, []);

  // Column definitions
  const collectionColumns = useMemo<CollectionColumnDefinition[]>(
    () => [
      {
        id: "transaction_id",
        label: "Transaction ID",
        renderCell: (collection) => (
          <Typography variant="body2" fontWeight={500}>
            {collection.transaction_id}
          </Typography>
        ),
      },
      {
        id: "date",
        label: "Date",
        renderCell: (collection) => formatDate(collection.deposit_date),
      },
      {
        id: "method",
        label: "Method",
        renderCell: (collection) => (
          <Chip
            label={collection.payment_method}
            color={collection.payment_method === "Bank" ? "primary" : "success"}
            size="small"
          />
        ),
      },
      {
        id: "status",
        label: "Status",
        renderCell: (collection) => (
          <Chip
            label={getStatusLabel(collection.approval_status)}
            color={getStatusColor(collection.approval_status)}
            size="small"
          />
        ),
      },
      {
        id: "amount",
        label: "Amount (BDT)",
        align: "right",
        renderCell: (collection) => (
          <Typography variant="body2" fontWeight={500}>
            {formatAmount(collection.deposit_amount)}
          </Typography>
        ),
      },
      {
        id: "do_no",
        label: "DO Number",
        renderCell: (collection) =>
          collection.do_no || (
            <Typography variant="body2" color="text.secondary">
              -
            </Typography>
          ),
      },
      {
        id: "mobile",
        label: "Mobile",
        renderCell: (collection) => collection.depositor_mobile,
      },
      {
        id: "note",
        label: "Note",
        renderCell: (collection) =>
          collection.note ? (
            <Tooltip title={collection.note}>
              <Typography variant="body2" noWrap sx={{ maxWidth: 200 }}>
                {collection.note}
              </Typography>
            </Tooltip>
          ) : (
            <Typography variant="body2" color="text.secondary">
              -
            </Typography>
          ),
      },
      {
        id: "receipt",
        label: "Receipt",
        renderCell: (collection) =>
          collection.image ? (
            <Tooltip title="View receipt">
              <IconButton size="small" onClick={() => handleViewImage(collection.image)}>
                {collection.image.mime_type === "application/pdf" ? (
                  <PdfIcon color="error" fontSize="small" />
                ) : (
                  <ImageIcon color="primary" fontSize="small" />
                )}
              </IconButton>
            </Tooltip>
          ) : (
            <Typography variant="body2" color="text.secondary">
              -
            </Typography>
          ),
      },
      {
        id: "created_at",
        label: "Created Date",
        renderCell: (collection) => formatDate(collection.created_at),
      },
      {
        id: "actions",
        label: "Actions",
        align: "center",
        alwaysVisible: true,
        renderCell: (collection) => {
          return (
            <Box sx={{ display: "flex", justifyContent: "center", gap: 1 }}>
              <Tooltip title="View Details">
                <IconButton
                  size="small"
                  color="primary"
                  onClick={() => handleViewDetails(collection)}
                >
                  <VisibilityIcon fontSize="small" />
                </IconButton>
              </Tooltip>
              
              {currentUserRole === "Finance" && collection.status === "forwarded_to_finance" && (
                <Tooltip title="Approve Payment (Final)">
                  <IconButton
                    size="small"
                    color="success"
                    onClick={async () => {
                      if (!confirm(`Approve payment of ৳${collection.deposit_amount?.toLocaleString()} from ${collection.bank || 'Bank'}?\n\nTransaction ID: ${collection.transaction_id}\nDeposit Date: ${formatDateForDisplay(collection.deposit_date)}\n\nThis will create a credit entry in the distributor's ledger.\n\nNote: Finance is the final approver for all payments.`)) {
                        return;
                      }
                      
                      try {
                        await collectionsApi.approve(collection._id, "Approved by Finance");
                        toast.success("Payment approved successfully! Credit entry created in distributor ledger.");
                        loadCollections();
                      } catch (error: any) {
                        toast.error(error.response?.data?.message || "Failed to approve payment");
                      }
                    }}
                  >
                    <CheckCircleIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
              )}
              
              {user?.role?.role && 
                ["ASM", "RSM", "ZSM", "Sales Admin", "Order Management", "Finance"].includes(user.role.role) &&
                collection.approval_status !== "approved" && 
                collection.approval_status !== "cancelled" && (
                <Tooltip title="Edit">
                  <IconButton
                    size="small"
                    color="info"
                    onClick={async () => {
                      try {
                        // Fetch full collection details to ensure we have all data including image
                        const response = await collectionsApi.getCollection(collection._id);
                        setSelectedCollection(response.data);
                        setFormOpen(true);
                      } catch (error) {
                        toast.error("Failed to load collection details");
                      }
                    }}
                  >
                    <EditIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
              )}
              <Tooltip title="Delete">
                <IconButton
                  size="small"
                  color="error"
                  onClick={() => {
                    setCollectionToDelete(collection._id);
                    setDeleteConfirmOpen(true);
                  }}
                >
                  <DeleteIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            </Box>
          );
        },
      },
    ],
    [formatDate, handleViewImage, handleViewDetails, loadCollections, user?.role?.role, currentUserRole]
  );

  const selectableColumnIds = useMemo(
    () => collectionColumns.filter((col) => !col.alwaysVisible).map((col) => col.id),
    [collectionColumns]
  );

  const handleVisibleColumnsChange = useCallback(
    (nextSelected: string[]) => {
      const sanitized = selectableColumnIds.filter((id) => nextSelected.includes(id));
      setVisibleColumnIds(sanitized.length ? sanitized : selectableColumnIds);
    },
    [selectableColumnIds]
  );

  const columnVisibilityOptions = useMemo(
    () => collectionColumns.map(({ id, label, alwaysVisible }) => ({ id, label, alwaysVisible })),
    [collectionColumns]
  );

  const sanitizeSelection = useCallback(
    (ids: string[]) => selectableColumnIds.filter((id) => ids.includes(id)),
    [selectableColumnIds]
  );

  useEffect(() => {
    if (!selectableColumnIds.length) {
      setVisibleColumnIds([]);
      setPersistedColumnIds([]);
      return;
    }

    if (!columnStateHydratedRef.current) {
      columnStateHydratedRef.current = true;

      let initialSelection = selectableColumnIds;

      try {
        const stored = window.localStorage.getItem(COLLECTION_COLUMN_STORAGE_KEY);
        if (stored) {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed)) {
            const sanitized = sanitizeSelection(parsed);
            if (sanitized.length) {
              initialSelection = sanitized;
            }
          }
        }
      } catch (error) {
        console.warn("Failed to read collection column preferences", error);
      }

      setVisibleColumnIds(initialSelection);
      setPersistedColumnIds(initialSelection);
      return;
    }

    // Only update if the sanitized selection is different from current
    setVisibleColumnIds((previous) => {
      const sanitized = sanitizeSelection(previous);
      if (sanitized.length === previous.length && 
          sanitized.every((id, idx) => id === previous[idx])) {
        return previous; // No change, prevent re-render
      }
      return sanitized.length ? sanitized : selectableColumnIds;
    });

    setPersistedColumnIds((previous) => {
      const sanitized = sanitizeSelection(previous);
      if (sanitized.length === previous.length && 
          sanitized.every((id, idx) => id === previous[idx])) {
        return previous; // No change, prevent re-render
      }
      return sanitized.length ? sanitized : selectableColumnIds;
    });
  }, [sanitizeSelection, selectableColumnIds]);

  const hasUnsavedChanges = useMemo(() => {
    if (visibleColumnIds.length !== persistedColumnIds.length) return true;
    const persistedSet = new Set(persistedColumnIds);
    return visibleColumnIds.some((id) => !persistedSet.has(id));
  }, [persistedColumnIds, visibleColumnIds]);

  const handleSaveColumnSelection = useCallback(() => {
    const sanitized = sanitizeSelection(visibleColumnIds);
    setVisibleColumnIds(sanitized);
    setPersistedColumnIds(sanitized);
    try {
      window.localStorage.setItem(COLLECTION_COLUMN_STORAGE_KEY, JSON.stringify(sanitized));
      toast.success("Column selection saved");
    } catch (error) {
      console.warn("Failed to persist collection column preferences", error);
      toast.error("Failed to save column selection");
    }
  }, [sanitizeSelection, visibleColumnIds]);

  const visibleColumns = useMemo(
    () =>
      collectionColumns.filter(
        (column) => column.alwaysVisible || visibleColumnIds.includes(column.id)
      ),
    [collectionColumns, visibleColumnIds]
  );

  // Count collections in my queue
  const myQueueCount = useMemo(() => {
    if (!user?.role?.role) return 0;
    // This would ideally come from API, but for now we show total
    return activeTab === "myQueue" ? total : 0;
  }, [user, total, activeTab]);

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 3 }}>
        <Box sx={{ display: "flex", alignItems: "center" }}>
          <PaymentIcon sx={{ mr: 2, color: "primary.main" }} />
          <Typography variant="h4" component="h1" gutterBottom>
            Collections Management
          </Typography>
        </Box>
        {user?.role?.role === "Distributor" && (
          <Button variant="contained" startIcon={<AddIcon />} onClick={() => setFormOpen(true)}>
            Add Collection
          </Button>
        )}
      </Box>

      {/* Tabs */}
      <Box sx={{ borderBottom: 1, borderColor: "divider", mb: 3 }}>
        <Tabs value={activeTab} onChange={handleTabChange} aria-label="collections tabs">
          <Tab
            label={
              <Badge badgeContent={myQueueCount} color="primary" max={999}>
                <Box sx={{ pr: myQueueCount > 0 ? 2 : 0 }}>My Queue</Box>
              </Badge>
            }
            value="myQueue"
          />
          <Tab label="All Collections" value="all" />
        </Tabs>
      </Box>

      {/* Search and Filters */}
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          mb: 3,
          flexWrap: "wrap",
          gap: 2,
        }}
      >
        <TextField
          size="small"
          placeholder="Search collections..."
          value={searchTerm}
          onChange={(event) => setSearchTerm(event.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon />
              </InputAdornment>
            ),
          }}
          sx={{ minWidth: 250 }}
        />
        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
          <Button
            variant="outlined"
            startIcon={<FilterIcon />}
            onClick={() => setFilterOpen(true)}
          >
            Filters
          </Button>

          <ColumnVisibilityMenu
            options={columnVisibilityOptions}
            selected={visibleColumnIds}
            onChange={handleVisibleColumnsChange}
            onSaveSelection={handleSaveColumnSelection}
            saveDisabled={!hasUnsavedChanges}
            minSelectable={1}
          />

          <ToggleButtonGroup
            value={viewMode}
            exclusive
            onChange={(_event, newViewMode) => {
              if (newViewMode !== null) {
                setViewMode(newViewMode);
              }
            }}
            aria-label="view mode"
            size="small"
          >
            <ToggleButton value="cards" aria-label="card view">
              <Tooltip title="Card View">
                <ViewModuleIcon />
              </Tooltip>
            </ToggleButton>
            <ToggleButton value="list" aria-label="list view">
              <Tooltip title="List View">
                <ViewListIcon />
              </Tooltip>
            </ToggleButton>
          </ToggleButtonGroup>
        </Box>
      </Box>

      {/* Active Filters */}
      {(filters.approval_status ||
        filters.payment_method ||
        filters.date_from ||
        filters.date_to ||
        filters.amount_min ||
        filters.amount_max ||
        filters.transaction_id ||
        filters.do_no) && (
        <Box sx={{ mb: 2 }}>
          <Stack direction="row" spacing={1} flexWrap="wrap" alignItems="center">
            <Typography variant="body2" color="text.secondary">
              Active Filters:
            </Typography>
            {filters.approval_status && (
              <Chip
                label={`Status: ${getStatusLabel(filters.approval_status)}`}
                onDelete={handleClearFilters}
                size="small"
              />
            )}
            {filters.payment_method && (
              <Chip
                label={`Method: ${filters.payment_method}`}
                onDelete={handleClearFilters}
                size="small"
              />
            )}
            {filters.date_from && (
              <Chip
                label={`From: ${format(filters.date_from, "dd/MM/yyyy")}`}
                onDelete={handleClearFilters}
                size="small"
              />
            )}
            {filters.date_to && (
              <Chip
                label={`To: ${format(filters.date_to, "dd/MM/yyyy")}`}
                onDelete={handleClearFilters}
                size="small"
              />
            )}
            {filters.amount_min && (
              <Chip
                label={`Min: ${filters.amount_min} BDT`}
                onDelete={handleClearFilters}
                size="small"
              />
            )}
            {filters.amount_max && (
              <Chip
                label={`Max: ${filters.amount_max} BDT`}
                onDelete={handleClearFilters}
                size="small"
              />
            )}
            {filters.transaction_id && (
              <Chip
                label={`Trans ID: ${filters.transaction_id}`}
                onDelete={handleClearFilters}
                size="small"
              />
            )}
            {filters.do_no && (
              <Chip label={`DO: ${filters.do_no}`} onDelete={handleClearFilters} size="small" />
            )}
            <Button size="small" onClick={handleClearFilters}>
              Clear All
            </Button>
          </Stack>
        </Box>
      )}

      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Showing {collections.length} of {total} collections
      </Typography>

      {loading ? (
        <Grid container spacing={2}>
          {Array.from({ length: 6 }).map((_, index) => (
            <Grid size={{ xs: 12, sm: 6, md: 4 }} key={index}>
              <Card>
                <CardContent>
                  <CircularProgress size={24} />
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      ) : collections.length === 0 ? (
        <Alert severity="info">
          {searchTerm
            ? `No payments found matching "${searchTerm}". Try a different search term.`
            : 'No payments found. Click "Add Payment" to create your first entry.'}
        </Alert>
      ) : viewMode === "cards" ? (
        <>
          <Grid container spacing={2}>
            {collections.map((collection) => (
              <Grid size={{ xs: 12, sm: 6, md: 4 }} key={collection._id}>
                <Card>
                  <CardContent>
                    <Box
                      sx={{
                        display: "flex",
                        alignItems: "flex-start",
                        justifyContent: "space-between",
                        mb: 1,
                      }}
                    >
                      <Box>
                        <Typography variant="h6" component="h2" noWrap>
                          {collection.transaction_id}
                        </Typography>
                        <Box sx={{ display: "flex", gap: 0.5, mt: 0.5 }}>
                          <Chip
                            label={collection.payment_method}
                            color={collection.payment_method === "Bank" ? "primary" : "success"}
                            size="small"
                          />
                        </Box>
                      </Box>
                      <Chip
                        label={getStatusLabel(collection.approval_status)}
                        color={getStatusColor(collection.approval_status)}
                        size="small"
                      />
                    </Box>
                    <Typography variant="body2" color="text.secondary">
                      Date: {formatDate(collection.deposit_date)}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Amount: BDT {formatAmount(collection.deposit_amount)}
                    </Typography>
                    {collection.do_no && (
                      <Typography variant="body2" color="text.secondary">
                        DO: {collection.do_no}
                      </Typography>
                    )}
                    {collection.current_handler_role && (
                      <Typography variant="body2" color="text.secondary">
                        Handler: {collection.current_handler_role}
                      </Typography>
                    )}
                    {collection.image && (
                      <Box sx={{ mt: 1 }}>
                        <Chip
                          icon={
                            collection.image.mime_type === "application/pdf" ? (
                              <PdfIcon />
                            ) : (
                              <ImageIcon />
                            )
                          }
                          label="Receipt"
                          size="small"
                          onClick={() => handleViewImage(collection.image)}
                        />
                      </Box>
                    )}
                  </CardContent>
                  <CardActions sx={{ justifyContent: "flex-end", pt: 0 }}>
                    <Tooltip title="View Details">
                      <IconButton
                        size="small"
                        onClick={() => handleViewDetails(collection)}
                        color="primary"
                      >
                        <VisibilityIcon />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Delete">
                      <IconButton
                        size="small"
                        onClick={() => {
                          setCollectionToDelete(collection._id);
                          setDeleteConfirmOpen(true);
                        }}
                        color="error"
                      >
                        <DeleteIcon />
                      </IconButton>
                    </Tooltip>
                  </CardActions>
                </Card>
              </Grid>
            ))}
          </Grid>
          <Box sx={{ display: "flex", justifyContent: "center", mt: 3 }}>
            <TablePagination
              rowsPerPageOptions={[10, 25, 50, 100]}
              component="div"
              count={total}
              rowsPerPage={rowsPerPage}
              page={page}
              onPageChange={(_, newPage) => setPage(newPage)}
              onRowsPerPageChange={(e) => {
                setRowsPerPage(parseInt(e.target.value, 10));
                setPage(0);
              }}
              sx={{
                "& .MuiTablePagination-toolbar": {
                  paddingLeft: 2,
                  paddingRight: 2,
                },
                "& .MuiTablePagination-selectLabel, & .MuiTablePagination-displayedRows": {
                  fontSize: "0.875rem",
                  fontWeight: 500,
                },
              }}
            />
          </Box>
        </>
      ) : (
        <TableContainer component={Paper} sx={{ overflowX: "auto" }}>
          <Table>
            <TableHead>
              <TableRow>
                {visibleColumns.map((column) => {
                  const isActions = column.id === "actions";
                  return (
                    <TableCell
                      key={column.id}
                      align={column.align}
                      sx={{
                        fontWeight: "bold",
                        whiteSpace: "nowrap",
                        backgroundColor: "background.paper",
                        ...(isActions
                          ? {
                              position: "sticky",
                              right: 0,
                              zIndex: 4,
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
              {collections.map((collection) => (
                <TableRow key={collection._id} hover>
                  {visibleColumns.map((column) => {
                    const isActions = column.id === "actions";
                    return (
                      <TableCell
                        key={column.id}
                        align={column.align}
                        sx={{
                          backgroundColor: "background.paper",
                          ...(isActions
                            ? {
                                position: "sticky",
                                right: 0,
                                zIndex: 3,
                                boxShadow: (theme) => `-4px 0 8px -4px ${theme.palette.grey[200]}`,
                              }
                            : {}),
                        }}
                      >
                        {column.renderCell(collection)}
                      </TableCell>
                    );
                  })}
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <TablePagination
            rowsPerPageOptions={[10, 25, 50, 100]}
            component="div"
            count={total}
            rowsPerPage={rowsPerPage}
            page={page}
            onPageChange={(_, newPage) => setPage(newPage)}
            onRowsPerPageChange={(e) => {
              setRowsPerPage(parseInt(e.target.value, 10));
              setPage(0);
            }}
            sx={{
              "& .MuiTablePagination-toolbar": {
                paddingLeft: 2,
                paddingRight: 2,
              },
              "& .MuiTablePagination-selectLabel, & .MuiTablePagination-displayedRows": {
                fontSize: "0.875rem",
                fontWeight: 500,
              },
            }}
          />
        </TableContainer>
      )}

      {/* Filter Dialog */}
      <CollectionFiltersDialog
        open={filterOpen}
        filters={filters}
        onClose={() => setFilterOpen(false)}
        onApplyFilters={handleApplyFilters}
      />

      {/* Collection Form Dialog */}
      <CollectionForm
        open={formOpen}
        onClose={() => {
          setFormOpen(false);
          setSelectedCollection(null);
        }}
        onSuccess={handleFormSuccess}
        collection={selectedCollection}
      />

      {/* Collection Details Dialog */}
      {selectedCollection && (
        <CollectionDetails
          open={detailsOpen}
          onClose={() => {
            setDetailsOpen(false);
            setSelectedCollection(null);
          }}
          collection={selectedCollection}
          onViewImage={handleViewImage}
          onActionComplete={handleActionComplete}
        />
      )}

      {/* Image Viewer */}
      {selectedImage && (
        <ImageViewer
          open={imageViewerOpen}
          onClose={() => {
            setImageViewerOpen(false);
            setSelectedImage(null);
          }}
          imageUrl={selectedImage.url}
          imageName={selectedImage.name}
          imageType={selectedImage.type}
        />
      )}

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteConfirmOpen} onClose={() => setDeleteConfirmOpen(false)}>
        <DialogTitle>Confirm Delete</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete this payment? This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteConfirmOpen(false)}>Cancel</Button>
          <Button onClick={handleDelete} color="error" variant="contained">
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
