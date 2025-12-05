'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Container,
  Paper,
  Typography,
  TextField,
  Button,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Checkbox,
  Chip,
  Alert,
  CircularProgress,
  Card,
  CardContent,
  Grid,
  FormControlLabel,
  Radio,
  RadioGroup,
  Stack,
  IconButton,
  Tooltip
} from '@mui/material';
import {
  ExpandMore as ExpandMoreIcon,
  Save as SaveIcon,
  CheckCircle as CheckCircleIcon,
  Send as SendIcon,
  Warning as WarningIcon,
  Info as InfoIcon,
  LocalShipping as TruckIcon,
  ArrowBack as ArrowBackIcon
} from '@mui/icons-material';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import axios from 'axios';
import { debounce } from 'lodash';

interface DOItem {
  do_id: string;
  order_number: string;
  order_date: string;
  sku: string;
  order_qty: number;
  previously_delivered_qty: number;
  undelivered_qty: number;
  delivery_qty: number;
  unit: string;
  uom: string;
  unit_price: number;
  pack_size: number;
  selected?: boolean;
}

interface Distributor {
  distributor_id: string;
  distributor_name: string;
  distributor_code: string;
  distributor_address: string;
  distributor_phone: string;
  dos: Array<{
    do_id: string;
    order_number: string;
    order_date: string;
    items: DOItem[];
  }>;
}

interface StockValidation {
  sku: string;
  available: number;
  allocated: number;
  remaining: number;
  has_stock: boolean;
}

export default function CreateLoadSheetPage() {
  const router = useRouter();
  const { user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [distributors, setDistributors] = useState<Distributor[]>([]);
  const [vehicleInfo, setVehicleInfo] = useState({
    vehicle_no: '',
    driver_name: '',
    driver_phone: ''
  });
  const [deliveryDate, setDeliveryDate] = useState(new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState('');
  const [stockValidation, setStockValidation] = useState<StockValidation[]>([]);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [sortOrder, setSortOrder] = useState<{ [key: string]: 'latest' | 'oldest' }>({});

  useEffect(() => {
    loadApprovedDOs();
  }, []);

  const loadApprovedDOs = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const response = await axios.get(
        `${process.env.NEXT_PUBLIC_API_URL}/inventory/load-sheets/approved-dos`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (response.data.success) {
        setDistributors(response.data.data);
      }
    } catch (error: any) {
      console.error('Error loading approved DOs:', error);
      alert(error.response?.data?.message || 'Failed to load approved DOs');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectAll = (distributorId: string, checked: boolean) => {
    setDistributors(prev => prev.map(dist => {
      if (dist.distributor_id === distributorId) {
        const updatedDos = dist.dos.map(doGroup => ({
          ...doGroup,
          items: doGroup.items.map(item => ({
            ...item,
            selected: checked
          }))
        }));
        return { ...dist, dos: updatedDos };
      }
      return dist;
    }));

    // Trigger validation after selection change
    validateStockDebounced();
  };

  const handleItemSelect = (distributorId: string, doId: string, sku: string, checked: boolean) => {
    setDistributors(prev => prev.map(dist => {
      if (dist.distributor_id === distributorId) {
        const updatedDos = dist.dos.map(doGroup => {
          if (doGroup.do_id === doId) {
            return {
              ...doGroup,
              items: doGroup.items.map(item =>
                item.sku === sku ? { ...item, selected: checked } : item
              )
            };
          }
          return doGroup;
        });
        return { ...dist, dos: updatedDos };
      }
      return dist;
    }));

    validateStockDebounced();
  };

  const handleDeliveryQtyChange = (
    distributorId: string,
    doId: string,
    sku: string,
    value: string
  ) => {
    const numValue = parseFloat(value) || 0;

    setDistributors(prev => prev.map(dist => {
      if (dist.distributor_id === distributorId) {
        const updatedDos = dist.dos.map(doGroup => {
          if (doGroup.do_id === doId) {
            return {
              ...doGroup,
              items: doGroup.items.map(item =>
                item.sku === sku
                  ? { ...item, delivery_qty: Math.min(numValue, item.undelivered_qty) }
                  : item
              )
            };
          }
          return doGroup;
        });
        return { ...dist, dos: updatedDos };
      }
      return dist;
    }));

    validateStockDebounced();
  };

  const validateStock = async () => {
    try {
      // Collect all selected items
      const selectedItems: Array<{ sku: string; delivery_qty: number }> = [];
      distributors.forEach(dist => {
        dist.dos.forEach(doGroup => {
          doGroup.items.forEach(item => {
            if (item.selected && item.delivery_qty > 0) {
              selectedItems.push({
                sku: item.sku,
                delivery_qty: item.delivery_qty
              });
            }
          });
        });
      });

      if (selectedItems.length === 0) {
        setStockValidation([]);
        setValidationErrors([]);
        return;
      }

      const token = localStorage.getItem('token');
      const response = await axios.post(
        `${process.env.NEXT_PUBLIC_API_URL}/inventory/load-sheets/validate-stock`,
        { items: selectedItems },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (response.data.success) {
        setStockValidation(response.data.data.validation);
        setValidationErrors(response.data.data.errors.map((e: any) => e.message));
      }
    } catch (error: any) {
      console.error('Error validating stock:', error);
    }
  };

  const validateStockDebounced = useCallback(debounce(validateStock, 500), [distributors]);

  const getStockInfo = (sku: string) => {
    return stockValidation.find(v => v.sku === sku);
  };

  const handleSortChange = (distributorId: string, order: 'latest' | 'oldest') => {
    setSortOrder(prev => ({ ...prev, [distributorId]: order }));

    setDistributors(prev => prev.map(dist => {
      if (dist.distributor_id === distributorId) {
        const sortedDos = [...dist.dos].sort((a, b) => {
          const dateA = new Date(a.order_date).getTime();
          const dateB = new Date(b.order_date).getTime();
          return order === 'latest' ? dateB - dateA : dateA - dateB;
        });
        return { ...dist, dos: sortedDos };
      }
      return dist;
    }));
  };

  const handleSubmit = async (status: 'Draft' | 'Validated') => {
    try {
      // Validation
      if (!vehicleInfo.vehicle_no || !vehicleInfo.driver_name || !vehicleInfo.driver_phone) {
        alert('Please fill in all vehicle information');
        return;
      }

      if (!deliveryDate) {
        alert('Please select delivery date');
        return;
      }

      // Prepare payload
      const payload: any = {
        delivery_date: deliveryDate,
        vehicle_info: vehicleInfo,
        notes,
        status,
        distributors: distributors
          .map(dist => {
            const selectedItems = dist.dos.flatMap(doGroup =>
              doGroup.items
                .filter(item => item.selected && item.delivery_qty > 0)
                .map(item => ({
                  do_id: item.do_id,
                  order_number: doGroup.order_number,
                  order_date: doGroup.order_date,
                  sku: item.sku,
                  order_qty: item.order_qty,
                  previously_delivered_qty: item.previously_delivered_qty,
                  undelivered_qty: item.undelivered_qty,
                  delivery_qty: item.delivery_qty,
                  unit: item.unit,
                  uom: item.uom
                }))
            );

            if (selectedItems.length === 0) return null;

            return {
              distributor_id: dist.distributor_id,
              distributor_name: dist.distributor_name,
              distributor_code: dist.distributor_code,
              do_items: selectedItems
            };
          })
          .filter(Boolean)
      };

      if (payload.distributors.length === 0) {
        alert('Please select at least one item to deliver');
        return;
      }

      if (status === 'Validated' && validationErrors.length > 0) {
        alert('Cannot create Load Sheet with insufficient stock. Please adjust quantities or save as Draft.');
        return;
      }

      setSubmitting(true);
      const token = localStorage.getItem('token');
      const response = await axios.post(
        `${process.env.NEXT_PUBLIC_API_URL}/inventory/load-sheets/create`,
        payload,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (response.data.success) {
        alert('Load Sheet created successfully!');
        router.push('/inventory/load-sheets');
      }
    } catch (error: any) {
      console.error('Error creating Load Sheet:', error);
      alert(error.response?.data?.message || 'Failed to create Load Sheet');
    } finally {
      setSubmitting(false);
    }
  };

  const getTotalStats = () => {
    let totalItems = 0;
    let totalQty = 0;

    distributors.forEach(dist => {
      dist.dos.forEach(doGroup => {
        doGroup.items.forEach(item => {
          if (item.selected && item.delivery_qty > 0) {
            totalItems++;
            totalQty += item.delivery_qty;
          }
        });
      });
    });

    return { totalItems, totalQty };
  };

  const stats = getTotalStats();

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="60vh">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Container maxWidth="xl" sx={{ py: 3 }}>
      {/* Header */}
      <Box mb={3} display="flex" alignItems="center" gap={2}>
        <IconButton onClick={() => router.back()} size="small">
          <ArrowBackIcon />
        </IconButton>
        <Box flex={1}>
          <Typography variant="h4" fontWeight="bold" gutterBottom>
            Create Load Sheet
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Select items from approved DOs and prepare for delivery
          </Typography>
        </Box>
      </Box>

      {/* Stock Validation Summary */}
      {stockValidation.length > 0 && (
        <Card sx={{ mb: 3, bgcolor: validationErrors.length > 0 ? 'error.light' : 'success.light' }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Stock Status
            </Typography>
            <Grid container spacing={2}>
              {stockValidation.map(stock => (
                <Grid item xs={12} sm={6} md={4} key={stock.sku}>
                  <Box>
                    <Typography variant="subtitle2" fontWeight="bold">
                      {stock.sku}
                    </Typography>
                    <Typography variant="body2">
                      Available: <strong>{stock.available}</strong> CTN |
                      Allocated: <strong>{stock.allocated}</strong> CTN |
                      Remaining: <strong style={{ color: stock.remaining < 0 ? 'red' : stock.remaining < 50 ? 'orange' : 'green' }}>
                        {stock.remaining}
                      </strong> CTN
                    </Typography>
                  </Box>
                </Grid>
              ))}
            </Grid>
            {validationErrors.length > 0 && (
              <Alert severity="error" sx={{ mt: 2 }}>
                <strong>Insufficient Stock:</strong>
                <ul style={{ margin: 0, paddingLeft: 20 }}>
                  {validationErrors.map((err, idx) => (
                    <li key={idx}>{err}</li>
                  ))}
                </ul>
              </Alert>
            )}
          </CardContent>
        </Card>
      )}

      {/* Vehicle Info */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom display="flex" alignItems="center" gap={1}>
          <TruckIcon /> Vehicle & Delivery Information
        </Typography>
        <Grid container spacing={2}>
          <Grid item xs={12} sm={6} md={3}>
            <TextField
              fullWidth
              label="Vehicle Number"
              value={vehicleInfo.vehicle_no}
              onChange={(e) => setVehicleInfo({ ...vehicleInfo, vehicle_no: e.target.value })}
              required
              size="small"
            />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <TextField
              fullWidth
              label="Driver Name"
              value={vehicleInfo.driver_name}
              onChange={(e) => setVehicleInfo({ ...vehicleInfo, driver_name: e.target.value })}
              required
              size="small"
            />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <TextField
              fullWidth
              label="Driver Phone"
              value={vehicleInfo.driver_phone}
              onChange={(e) => setVehicleInfo({ ...vehicleInfo, driver_phone: e.target.value })}
              required
              size="small"
            />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <TextField
              fullWidth
              type="date"
              label="Delivery Date"
              value={deliveryDate}
              onChange={(e) => setDeliveryDate(e.target.value)}
              InputLabelProps={{ shrink: true }}
              required
              size="small"
            />
          </Grid>
          <Grid item xs={12}>
            <TextField
              fullWidth
              label="Notes (Optional)"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              multiline
              rows={2}
              size="small"
            />
          </Grid>
        </Grid>
      </Paper>

      {/* Summary Stats */}
      <Box mb={3} display="flex" gap={2} flexWrap="wrap">
        <Chip
          label={`${stats.totalItems} Items Selected`}
          color="primary"
          icon={<InfoIcon />}
        />
        <Chip
          label={`${stats.totalQty} CTN Total`}
          color="secondary"
          icon={<InfoIcon />}
        />
        <Chip
          label={`${distributors.length} Distributors`}
          color="info"
          icon={<InfoIcon />}
        />
      </Box>

      {/* Distributors */}
      {distributors.length === 0 ? (
        <Alert severity="info">
          No approved demand orders found for delivery. Please check if there are any approved DOs in the system.
        </Alert>
      ) : (
        distributors.map(dist => {
          const allItems = dist.dos.flatMap(doGroup => doGroup.items);
          const selectedCount = allItems.filter(item => item.selected).length;
          const allSelected = allItems.length > 0 && selectedCount === allItems.length;

          return (
            <Accordion key={dist.distributor_id} defaultExpanded sx={{ mb: 2 }}>
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Box display="flex" alignItems="center" gap={2} width="100%">
                  <Checkbox
                    checked={allSelected}
                    indeterminate={selectedCount > 0 && !allSelected}
                    onChange={(e) => handleSelectAll(dist.distributor_id, e.target.checked)}
                    onClick={(e) => e.stopPropagation()}
                  />
                  <Box flex={1}>
                    <Typography variant="h6">
                      {dist.distributor_name}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Code: {dist.distributor_code} | {dist.dos.length} DO(s) | {selectedCount}/{allItems.length} items selected
                    </Typography>
                  </Box>
                  <RadioGroup
                    row
                    value={sortOrder[dist.distributor_id] || 'latest'}
                    onChange={(e) => handleSortChange(dist.distributor_id, e.target.value as 'latest' | 'oldest')}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <FormControlLabel value="latest" control={<Radio size="small" />} label="Latest First" />
                    <FormControlLabel value="oldest" control={<Radio size="small" />} label="Oldest First" />
                  </RadioGroup>
                </Box>
              </AccordionSummary>
              <AccordionDetails>
                <TableContainer sx={{ maxHeight: 600 }}>
                  <Table size="small" stickyHeader>
                    <TableHead>
                      <TableRow>
                        <TableCell padding="checkbox"></TableCell>
                        <TableCell>DO No</TableCell>
                        <TableCell>DO Date</TableCell>
                        <TableCell>SKU</TableCell>
                        <TableCell align="right">Order Qty</TableCell>
                        <TableCell align="right">Dlvrd Qty</TableCell>
                        <TableCell align="right">Undlvrd Qty</TableCell>
                        <TableCell align="right">Dlvry Qty</TableCell>
                        <TableCell>Stock Status</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {dist.dos.map(doGroup =>
                        doGroup.items.map(item => {
                          const stockInfo = getStockInfo(item.sku);
                          const stockColor = !stockInfo ? 'inherit' :
                            stockInfo.remaining < 0 ? 'error' :
                            stockInfo.remaining < 50 ? 'warning' : 'success';

                          return (
                            <TableRow key={`${doGroup.do_id}-${item.sku}`}>
                              <TableCell padding="checkbox">
                                <Checkbox
                                  checked={item.selected || false}
                                  onChange={(e) =>
                                    handleItemSelect(
                                      dist.distributor_id,
                                      doGroup.do_id,
                                      item.sku,
                                      e.target.checked
                                    )
                                  }
                                />
                              </TableCell>
                              <TableCell>{doGroup.order_number}</TableCell>
                              <TableCell>{new Date(doGroup.order_date).toLocaleDateString()}</TableCell>
                              <TableCell>
                                <Typography variant="body2" sx={{ fontFamily: 'monospace', fontSize: '0.75rem' }}>
                                  {item.sku}
                                </Typography>
                              </TableCell>
                              <TableCell align="right">{item.order_qty} {item.unit}</TableCell>
                              <TableCell align="right">{item.previously_delivered_qty} {item.unit}</TableCell>
                              <TableCell align="right">
                                <strong>{item.undelivered_qty} {item.unit}</strong>
                              </TableCell>
                              <TableCell align="right">
                                <TextField
                                  type="number"
                                  value={item.delivery_qty}
                                  onChange={(e) =>
                                    handleDeliveryQtyChange(
                                      dist.distributor_id,
                                      doGroup.do_id,
                                      item.sku,
                                      e.target.value
                                    )
                                  }
                                  inputProps={{
                                    min: 0,
                                    max: item.undelivered_qty,
                                    step: 1
                                  }}
                                  size="small"
                                  sx={{ width: 100 }}
                                  disabled={!item.selected}
                                />
                              </TableCell>
                              <TableCell>
                                {stockInfo && (
                                  <Chip
                                    size="small"
                                    label={`${stockInfo.remaining} CTN left`}
                                    color={stockColor}
                                    icon={
                                      stockInfo.remaining < 0 ? <WarningIcon /> :
                                      <CheckCircleIcon />
                                    }
                                  />
                                )}
                              </TableCell>
                            </TableRow>
                          );
                        })
                      )}
                    </TableBody>
                  </Table>
                </TableContainer>
              </AccordionDetails>
            </Accordion>
          );
        })
      )}

      {/* Action Buttons */}
      <Box mt={4} display="flex" gap={2} justifyContent="flex-end">
        <Button
          variant="outlined"
          onClick={() => router.back()}
          disabled={submitting}
        >
          Cancel
        </Button>
        <Button
          variant="outlined"
          startIcon={<SaveIcon />}
          onClick={() => handleSubmit('Draft')}
          disabled={submitting || stats.totalItems === 0}
        >
          Save as Draft
        </Button>
        <Button
          variant="contained"
          startIcon={<SendIcon />}
          onClick={() => handleSubmit('Validated')}
          disabled={submitting || stats.totalItems === 0 || validationErrors.length > 0}
        >
          {submitting ? <CircularProgress size={24} /> : 'Create Load Sheet'}
        </Button>
      </Box>
    </Container>
  );
}
