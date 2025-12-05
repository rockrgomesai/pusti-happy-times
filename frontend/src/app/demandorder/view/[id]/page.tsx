'use client';

import { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  Chip,
  CircularProgress,
  Button,
  Divider,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Alert,
  List,
  ListItem,
  ListItemText
} from '@mui/material';
import {
  Timeline,
  TimelineItem,
  TimelineSeparator,
  TimelineConnector,
  TimelineContent,
  TimelineDot,
  TimelineOppositeContent
} from '@mui/lab';
import {
  ArrowBack as BackIcon
} from '@mui/icons-material';
import { useRouter, useParams } from 'next/navigation';
import { formatDateForDisplay } from '@/lib/dateUtils';
import api from '@/lib/api';

// Grid2 component
const Grid2 = ({ size, children, ...props }: any) => (
  <Grid item xs={size?.xs || 12} sm={size?.sm} md={size?.md} {...props}>
    {children}
  </Grid>
);

interface CartItem {
  source: string;
  source_id: string;
  sku: string;
  quantity: number;
  unit_price: number;
  subtotal: number;
  name: string;
  available_quantity: number;
  offer_id?: string;
  offer_name?: string;
  offer_type?: string;
  discount_percentage?: number;
  discount_amount?: number;
  original_subtotal?: number;
  offer_details?: any;
}

export default function ViewDOPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;

  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [error, setError] = useState('');
  const [financialSummary, setFinancialSummary] = useState<any>(null);
  const [loadingFinancial, setLoadingFinancial] = useState(false);

  useEffect(() => {
    if (id) {
      loadOrder();
    }
  }, [id]);

  const loadOrder = async () => {
    setLoading(true);
    setError('');

    try {
      const response = await api.get(`/ordermanagement/demandorders/${id}`);
      if (response.data.success) {
        setSelectedOrder(response.data.data);
        await fetchFinancialSummary(id);
      }
    } catch (error: any) {
      setError(error.response?.data?.message || 'Failed to load demand order');
      console.error('Failed to load demand order:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchFinancialSummary = async (orderId: string) => {
    setLoadingFinancial(true);
    try {
      const response = await api.get(`/ordermanagement/demandorders/${orderId}/financial-summary`);
      if (response.data.success) {
        setFinancialSummary(response.data.data);
      }
    } catch (error: any) {
      console.error('Failed to load financial summary:', error);
    } finally {
      setLoadingFinancial(false);
    }
  };

  const getStatusColor = (status: string) => {
    const colors: { [key: string]: 'default' | 'primary' | 'success' | 'error' | 'warning' | 'info' } = {
      draft: 'default',
      submitted: 'info',
      'pending-asm-approval': 'warning',
      'pending-rsm-approval': 'warning',
      'pending-zsm-approval': 'warning',
      'pending-nsm-approval': 'warning',
      approved: 'success',
      rejected: 'error',
      scheduled: 'primary'
    };
    return colors[status] || 'default';
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return 'N/A';
    return formatDateForDisplay(dateString);
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 400, p: 3 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error || !selectedOrder) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error" sx={{ mb: 2 }}>
          {error || 'Order not found'}
        </Alert>
        <Button
          startIcon={<BackIcon />}
          onClick={() => router.back()}
        >
          Go Back
        </Button>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h5">Order Details</Typography>
        <Button
          startIcon={<BackIcon />}
          onClick={() => router.back()}
          variant="outlined"
        >
          Back
        </Button>
      </Box>

      <Card>
        <CardContent>
          {/* Order Info */}
          <Grid container spacing={2} sx={{ mb: 3 }}>
            <Grid2 size={{ xs: 12, sm: 6 }}>
              <Typography variant="body2" color="text.secondary">
                Order Number
              </Typography>
              <Typography variant="body1" fontWeight="bold">
                {selectedOrder.order_number}
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
          </Grid>

          <Divider sx={{ my: 2 }} />

          {/* Order Items */}
          <Typography variant="h6" sx={{ mb: 2 }}>
            Order Items ({selectedOrder.item_count || selectedOrder.items?.length || 0})
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
                {selectedOrder.items?.map((item: any, index: number) => (
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
                    <TableCell align="right">৳{item.unit_price?.toFixed(2) || '0.00'}</TableCell>
                    <TableCell align="right">৳{item.subtotal?.toFixed(2) || '0.00'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>

          <Divider sx={{ my: 2 }} />

          {/* Financial Summary */}
          <Typography variant="h6" sx={{ mb: 2 }}>
            Financial Summary
          </Typography>
          
          {loadingFinancial ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 3 }}>
              <CircularProgress size={30} />
            </Box>
          ) : financialSummary ? (
            <Box sx={{ display: "flex", justifyContent: "flex-end" }}>
              <Box sx={{ minWidth: 300 }}>
                <Box sx={{ display: "flex", justifyContent: "space-between", mb: 1.5 }}>
                  <Typography variant="body1" fontWeight={600}>Order Total:</Typography>
                  <Typography variant="body1" fontWeight={600}>
                    ৳{(financialSummary?.orderTotal || 0).toFixed(2)}
                  </Typography>
                </Box>
                <Divider sx={{ my: 1.5 }} />
                
                <Box sx={{ display: "flex", justifyContent: "space-between", mb: 1 }}>
                  <Typography variant="body2" color="text.secondary">Available Balance:</Typography>
                  <Typography variant="body2" color={(financialSummary?.availableBalance || 0) >= 0 ? "success.main" : "error.main"}>
                    ৳{(financialSummary?.availableBalance || 0).toFixed(2)}
                  </Typography>
                </Box>
                
                <Box sx={{ display: "flex", justifyContent: "space-between", mb: 1 }}>
                  <Typography variant="body2" color="text.secondary">Remaining Amount:</Typography>
                  <Typography variant="body2">
                    ৳{(financialSummary?.remainingAmount || 0).toFixed(2)}
                  </Typography>
                </Box>
                
                <Box sx={{ display: "flex", justifyContent: "space-between", mb: 1 }}>
                  <Typography variant="body2" color="text.secondary">Unapproved Payments:</Typography>
                  <Typography variant="body2" color="warning.main">
                    ৳{(financialSummary?.unapprovedPayments || 0).toFixed(2)}
                  </Typography>
                </Box>
                
                <Divider sx={{ my: 1.5 }} />
                
                <Box sx={{ display: "flex", justifyContent: "space-between", mt: 1 }}>
                  <Typography variant="h6" color="primary">Due Amount:</Typography>
                  <Typography variant="h6" color="primary">
                    ৳{(financialSummary?.dueAmount || 0).toFixed(2)}
                  </Typography>
                </Box>
              </Box>
            </Box>
          ) : null}

          {/* Payments List */}
          {financialSummary && financialSummary.payments?.length > 0 && (
            <>
              <Divider sx={{ my: 3 }} />
              <Typography variant="h6" sx={{ mb: 2 }}>
                Payments ({financialSummary.payments.length})
              </Typography>
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell><strong>Transaction ID</strong></TableCell>
                      <TableCell><strong>Date</strong></TableCell>
                      <TableCell><strong>Method</strong></TableCell>
                      <TableCell align="right"><strong>Amount</strong></TableCell>
                      <TableCell><strong>Status</strong></TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {financialSummary.payments.map((payment: any) => (
                      <TableRow key={payment._id}>
                        <TableCell>
                          <Typography variant="body2">{payment.transaction_id}</Typography>
                        </TableCell>
                        <TableCell>
                          {formatDateForDisplay(payment.deposit_date)}
                        </TableCell>
                        <TableCell>
                          <Chip 
                            label={payment.payment_method} 
                            size="small"
                            color={payment.payment_method === 'Bank' ? 'primary' : 'default'}
                          />
                        </TableCell>
                        <TableCell align="right">
                          ৳{payment.deposit_amount?.toFixed(2) || '0.00'}
                        </TableCell>
                        <TableCell>
                          <Chip 
                            label={(payment.status || 'pending').replace(/_/g, ' ')} 
                            size="small"
                            color={
                              payment.status === 'approved' ? 'success' :
                              payment.status === 'cancelled' ? 'error' :
                              'warning'
                            }
                          />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </>
          )}

          {/* Offers Summary */}
          {selectedOrder && selectedOrder.items && (() => {
            const cartItems: CartItem[] = selectedOrder.items.map((item: any) => ({
              source: item.source,
              source_id: item.source_id,
              sku: item.sku,
              quantity: item.quantity,
              unit_price: item.unit_price,
              subtotal: item.subtotal,
              name: item.sku,
              available_quantity: 0,
              ...(item.offer_details && (item.offer_details.offer_id || item.offer_details.offer_name) && {
                offer_id: item.offer_details.offer_id,
                offer_name: item.offer_details.offer_name,
                offer_type: item.offer_details.offer_type,
                discount_percentage: item.offer_details.discount_percentage,
                discount_amount: item.offer_details.discount_amount,
                original_subtotal: item.offer_details.original_subtotal,
              }),
              offer_details: item.offer_details
            }));

            const groups: Record<string, { offer: any; items: CartItem[] }> = {};
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

            const discountBreakdown: Array<{ offerName: string; discountAmount: number; items: CartItem[] }> = [];
            Object.values(groups).forEach(({ offer, items }) => {
              let groupOriginal = 0;
              let groupActual = 0;
              items.forEach(item => {
                groupOriginal += (item.original_subtotal || item.unit_price * item.quantity);
                groupActual += item.subtotal;
              });
              const discountAmount = groupOriginal - groupActual;
              if (discountAmount > 0) {
                discountBreakdown.push({
                  offerName: offer?.name || 'Regular Discount',
                  discountAmount: discountAmount,
                  items: items,
                });
              }
            });

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
                  <Grid container spacing={2} sx={{ mb: 2 }}>
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
                  </Grid>

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
                                {offer.items.map((item, itemIdx) => {
                                  const originalSubtotal = (item as any).original_subtotal || item.offer_details?.original_subtotal || item.unit_price * item.quantity;
                                  const actualSubtotal = item.subtotal || 0;
                                  const itemDiscount = originalSubtotal - actualSubtotal;
                                  return (
                                    <Box key={itemIdx} sx={{ display: 'flex', justifyContent: 'space-between', py: 0.25 }}>
                                      <Typography variant="caption" color="text.secondary">
                                        {item.sku} × {item.quantity}
                                      </Typography>
                                      <Typography variant="caption" color="text.secondary">
                                        {actualSubtotal === 0 || item.offer_details?.is_free_in_bundle ? 'Free' : itemDiscount > 0 ? `-৳${itemDiscount.toFixed(2)}` : ''}
                                      </Typography>
                                    </Box>
                                  );
                                })}
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

          {/* Approval History */}
          {selectedOrder && selectedOrder.approval_history && selectedOrder.approval_history.length > 0 && (
            <>
              <Divider sx={{ my: 3 }} />
              <Typography variant="subtitle1" gutterBottom fontWeight="bold">
                Order History
              </Typography>
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
            </>
          )}
        </CardContent>
      </Card>
    </Box>
  );
}
