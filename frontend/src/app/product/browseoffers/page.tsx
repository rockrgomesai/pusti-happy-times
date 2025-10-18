"use client";

import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  IconButton,
  Chip,
  Button,
  TextField,
  InputAdornment,
  Stack,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  CircularProgress,
  Alert,
  Switch,
  FormControlLabel
} from '@mui/material';
import {
  Edit as EditIcon,
  Delete as DeleteIcon,
  ContentCopy as DuplicateIcon,
  Search as SearchIcon,
  Add as AddIcon,
  Visibility as ViewIcon,
  FilterList as FilterIcon
} from '@mui/icons-material';
import { useRouter } from 'next/navigation';
import { offersApi } from '@/lib/api/offers';
import { format } from 'date-fns';

const OFFER_TYPES = [
  "FLAT_DISCOUNT_PCT",
  "FLAT_DISCOUNT_AMT",
  "DISCOUNT_SLAB_PCT",
  "DISCOUNT_SLAB_AMT",
  "FREE_PRODUCT",
  "BUNDLE_OFFER",
  "BOGO",
  "CASHBACK",
  "VOLUME_DISCOUNT",
  "CROSS_CATEGORY",
  "FIRST_ORDER",
  "LOYALTY_POINTS",
  "FLASH_SALE"
];

const OFFER_STATUS = ["draft", "active", "paused", "expired", "completed"];

interface Offer {
  _id: string;
  name: string;
  offer_type: string;
  product_segments: string[];
  start_date: string;
  end_date: string;
  status: string;
  active: boolean;
  created_by?: {
    name: string;
    email: string;
  };
  createdAt: string;
  updatedAt: string;
}

const getStatusColor = (status: string): "default" | "primary" | "secondary" | "error" | "warning" | "info" | "success" => {
  switch (status) {
    case 'active':
      return 'success';
    case 'draft':
      return 'default';
    case 'paused':
      return 'warning';
    case 'expired':
      return 'error';
    case 'completed':
      return 'info';
    default:
      return 'default';
  }
};

const formatOfferType = (type: string) => {
  return type.split('_').map(word => 
    word.charAt(0) + word.slice(1).toLowerCase()
  ).join(' ');
};

export default function BrowseOffersPage() {
  const router = useRouter();
  const [offers, setOffers] = useState<Offer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Pagination
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(25);
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  
  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [offerTypeFilter, setOfferTypeFilter] = useState<string>('');
  const [activeOnlyFilter, setActiveOnlyFilter] = useState(false);
  
  // Dialogs
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [offerToDelete, setOfferToDelete] = useState<Offer | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  // Load offers
  const loadOffers = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const params: any = {
        page: page + 1, // API uses 1-based pagination
        limit: rowsPerPage,
      };
      
      if (searchTerm) params.search = searchTerm;
      if (statusFilter) params.status = statusFilter;
      if (offerTypeFilter) params.offer_type = offerTypeFilter;
      if (activeOnlyFilter) params.active = true;
      
      const response = await offersApi.getAll(params);
      
      setOffers(response.data || []);
      setTotalCount(response.pagination?.total || 0);
      setTotalPages(response.pagination?.pages || 0);
    } catch (err: any) {
      console.error('Error loading offers:', err);
      setError(err.response?.data?.message || 'Failed to load offers');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOffers();
  }, [page, rowsPerPage, statusFilter, offerTypeFilter, activeOnlyFilter]);

  // Search with debounce
  useEffect(() => {
    const timer = setTimeout(() => {
      if (page === 0) {
        loadOffers();
      } else {
        setPage(0); // Reset to first page on search
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [searchTerm]);

  const handleChangePage = (event: unknown, newPage: number) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const handleView = (id: string) => {
    router.push(`/product/offers/${id}`);
  };

  const handleEdit = (id: string) => {
    router.push(`/product/offers/edit/${id}`);
  };

  const handleDeleteClick = (offer: Offer) => {
    setOfferToDelete(offer);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!offerToDelete) return;

    try {
      setActionLoading(true);
      await offersApi.delete(offerToDelete._id);
      setDeleteDialogOpen(false);
      setOfferToDelete(null);
      loadOffers(); // Reload the list
    } catch (err: any) {
      console.error('Error deleting offer:', err);
      alert(err.response?.data?.message || 'Failed to delete offer');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDuplicate = async (id: string) => {
    try {
      setActionLoading(true);
      const duplicated = await offersApi.duplicate(id);
      loadOffers(); // Reload to show the new offer
      alert('Offer duplicated successfully! You can now edit the copy.');
    } catch (err: any) {
      console.error('Error duplicating offer:', err);
      alert(err.response?.data?.message || 'Failed to duplicate offer');
    } finally {
      setActionLoading(false);
    }
  };

  const handleToggleStatus = async (offer: Offer) => {
    try {
      setActionLoading(true);
      await offersApi.toggleStatus(offer._id, !offer.active);
      loadOffers(); // Reload to show updated status
    } catch (err: any) {
      console.error('Error toggling offer status:', err);
      alert(err.response?.data?.message || 'Failed to toggle offer status');
    } finally {
      setActionLoading(false);
    }
  };

  const handleCreateNew = () => {
    router.push('/product/offers/create');
  };

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h4" component="h1">
          Browse Offers
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={handleCreateNew}
        >
          Create New Offer
        </Button>
      </Box>

      {/* Filters */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} alignItems="center">
          <TextField
            fullWidth
            placeholder="Search offers..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon />
                </InputAdornment>
              ),
            }}
          />
          
          <FormControl sx={{ minWidth: 200 }}>
            <InputLabel>Status</InputLabel>
            <Select
              value={statusFilter}
              label="Status"
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <MenuItem value="">All Statuses</MenuItem>
              {OFFER_STATUS.map(status => (
                <MenuItem key={status} value={status}>
                  {status.charAt(0).toUpperCase() + status.slice(1)}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <FormControl sx={{ minWidth: 200 }}>
            <InputLabel>Offer Type</InputLabel>
            <Select
              value={offerTypeFilter}
              label="Offer Type"
              onChange={(e) => setOfferTypeFilter(e.target.value)}
            >
              <MenuItem value="">All Types</MenuItem>
              {OFFER_TYPES.map(type => (
                <MenuItem key={type} value={type}>
                  {formatOfferType(type)}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <FormControlLabel
            control={
              <Switch
                checked={activeOnlyFilter}
                onChange={(e) => setActiveOnlyFilter(e.target.checked)}
              />
            }
            label="Active Only"
          />
        </Stack>
      </Paper>

      {/* Error Alert */}
      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* Offers Table */}
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow sx={{ backgroundColor: 'grey.100' }}>
              <TableCell>Name</TableCell>
              <TableCell>Type</TableCell>
              <TableCell>Segments</TableCell>
              <TableCell>Start Date</TableCell>
              <TableCell>End Date</TableCell>
              <TableCell>Status</TableCell>
              <TableCell align="center">Active</TableCell>
              <TableCell align="center">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={8} align="center" sx={{ py: 8 }}>
                  <CircularProgress />
                </TableCell>
              </TableRow>
            ) : offers.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} align="center" sx={{ py: 8 }}>
                  <Typography color="text.secondary">
                    No offers found
                  </Typography>
                </TableCell>
              </TableRow>
            ) : (
              offers.map((offer) => (
                <TableRow key={offer._id} hover>
                  <TableCell>
                    <Typography variant="body2" fontWeight={500}>
                      {offer.name}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2">
                      {formatOfferType(offer.offer_type)}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Stack direction="row" spacing={0.5}>
                      {offer.product_segments?.map(seg => (
                        <Chip key={seg} label={seg} size="small" />
                      ))}
                    </Stack>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2">
                      {format(new Date(offer.start_date), 'MMM dd, yyyy')}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2">
                      {format(new Date(offer.end_date), 'MMM dd, yyyy')}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={offer.status.toUpperCase()}
                      color={getStatusColor(offer.status)}
                      size="small"
                    />
                  </TableCell>
                  <TableCell align="center">
                    <Switch
                      checked={offer.active}
                      onChange={() => handleToggleStatus(offer)}
                      disabled={actionLoading}
                      color="success"
                    />
                  </TableCell>
                  <TableCell align="center">
                    <Stack direction="row" spacing={0.5} justifyContent="center">
                      <Tooltip title="View">
                        <IconButton
                          size="small"
                          color="info"
                          onClick={() => handleView(offer._id)}
                        >
                          <ViewIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Edit">
                        <IconButton
                          size="small"
                          color="primary"
                          onClick={() => handleEdit(offer._id)}
                        >
                          <EditIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Duplicate">
                        <IconButton
                          size="small"
                          color="secondary"
                          onClick={() => handleDuplicate(offer._id)}
                          disabled={actionLoading}
                        >
                          <DuplicateIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Delete">
                        <IconButton
                          size="small"
                          color="error"
                          onClick={() => handleDeleteClick(offer)}
                          disabled={actionLoading}
                        >
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </Stack>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
        
        <TablePagination
          component="div"
          count={totalCount}
          page={page}
          onPageChange={handleChangePage}
          rowsPerPage={rowsPerPage}
          onRowsPerPageChange={handleChangeRowsPerPage}
          rowsPerPageOptions={[10, 25, 50, 100]}
        />
      </TableContainer>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
        <DialogTitle>Delete Offer</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to delete the offer "{offerToDelete?.name}"? 
            This will mark it as completed and deactivate it.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)} disabled={actionLoading}>
            Cancel
          </Button>
          <Button
            onClick={handleDeleteConfirm}
            color="error"
            variant="contained"
            disabled={actionLoading}
          >
            {actionLoading ? <CircularProgress size={24} /> : 'Delete'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
