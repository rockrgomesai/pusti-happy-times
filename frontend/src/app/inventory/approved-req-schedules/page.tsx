"use client";

import React, { useState, useEffect } from "react";
import {
  Box,
  Container,
  Typography,
  CircularProgress,
  Alert,
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
  Paper,
  Checkbox,
  Chip,
  Stack,
  IconButton,
  Tooltip,
} from "@mui/material";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import WarningIcon from "@mui/icons-material/Warning";
import { apiClient } from "@/lib/api";
import toast from "react-hot-toast";
import { useRouter } from "next/navigation";

interface Item {
  requisition_scheduling_id: string;
  requisition_detail_id: string;
  requisition_id: string;
  requisition_no: string;
  requisition_date: string;
  sku: string;
  erp_id: string;
  product_name: string;
  dp_price: number;
  order_qty: number;
  scheduled_qty: number;
  delivered_qty: number;
  remaining_qty: number;
  stock_qty: number;
  total_stock_qty: number;
  blocked_qty: number;
  is_partial: boolean;
}

interface DepotGroup {
  requesting_depot_id: string;
  requesting_depot_name: string;
  requesting_depot_code: string;
  items: Item[];
}

interface SelectedItems {
  [depotId: string]: {
    [itemKey: string]: boolean;
  };
}

interface DeliveryQtys {
  [itemKey: string]: number;
}

export default function ApprovedReqSchedulesPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [depotGroups, setDepotGroups] = useState<DepotGroup[]>([]);
  const [error, setError] = useState("");
  const [expandedGroup, setExpandedGroup] = useState<string | false>(false);
  const [selectedItems, setSelectedItems] = useState<SelectedItems>({});
  const [deliveryQtys, setDeliveryQtys] = useState<DeliveryQtys>({});
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      setError("");
      
      // Add cache-busting timestamp to force fresh data
      const response = await apiClient.get(`/inventory/approved-req-schedules?_t=${Date.now()}`);
      
      // apiClient already returns response.data, so response.data is the actual data array
      const response = await apiClient.get(`/inventory/approved-req-schedules?_t=${Date.now()}`);
      const groups = response.data || [];
      setDepotGroups(groups);
      
      // Auto-expand first group if only one
      if (groups.length === 1) {
        setExpandedGroup(groups[0].requesting_depot_id);
      }
      
    } catch (err: any) {
      console.error("Error loading data:", err);
      const errorMsg = err.response?.data?.message || err.message || "Failed to load approved schedules";
      
      // Handle specific error cases
      if (errorMsg.includes("not assigned to any facility")) {
        setError("YoItem = (depotId: string, itemKey: string, item: Item, checked: boolean) => {
    setSelectedItems(prev => {
      const depotSelections = { ...prev[depotId] };
      
      if (checked) {
        depotSelections[itemKey] = true;
        // Auto-fill with remaining quantity
        setDeliveryQtys(prevQtys => ({
          ...prevQtys,
          [itemKey]: Math.min(item.remaining_qty, item.stock_qty)
        }));
      } else {
        delete depotSelections[itemKey];
        // Remove quantity
        setDeliveryQtys(prevQtys => {
          const newQtys = { ...prevQtys };
          delete newQtys[itemKey(group: DepotGroup) => {
    const depotId = group.requesting_depot_id;
    const selectedItemKeys = Object.keys(selectedItems[depotId] || {}).filter(
      key => selectedItems[depotId][key]
    );
    
    if (selectedItemKeys.length === 0) {
      toast.error("Please select at least one item");
      return;
    }

    // Validate all selected items have quantities
    const validationErrors: string[] = [];
    group.items.forEach((item, index) => {
      const itemKey = `${depotId}_${item.requisition_scheduling_id}_${item.requisition_detail_id}_${index}`;
      if (selectedItems[depotId]?.[itemKey]) {
        const deliveryQty = deliveryQtys[itemKey] || 0;
        
        if (deliveryQty <= 0) {
          validationErrors.push(`${item.sku}: Quantity must be greater than 0`);
        } else if (deliveryQty > item.remaining_qty) {
          validationErrors.push(`${item.sku}: Cannot exceed remaining quantity (${item.remaining_qty})`);
        } else if (deliveryQty > item.stock_qty) {
          validationErrors.push(`${item.sku}: Insufficient stock (Available: ${item.stock_qty})`);
        }
      }
    });

    if (validationErrors.length > 0) {
      toast.error(validationErrors[0]);
      return;
    }

    // Navigate to create load sheet page with pre-selected items
    const selectedData = group.items
      .map((item, index) => {
        const itemKey = `${depotId}_${item.requisition_scheduling_id}_${item.requisition_detail_id}_${index}`;
        if (selectedItems[depotId]?.[itemKey]) {
          return {
            requisition_detail_id: item.requisition_detail_id,
            delivery_qty: deliveryQtys[itemKey],
            sku: item.sku,
            product_name: item.product_name,
            remaining_qty: item.remaining_qty,
            stock_qty: item.stock_qty
          };
        }
        return null;
      })
      .filter(Boolean);

    // Store in sessionStorage for the create page
    sessionStorage.setItem('preselected_req_items', JSON.stringify({
      requesting_depot_id: group.requesting_depot_id,
      requesting_depot_name: group.requesting_depot_name,
      items: selectedData
    }));

    router.push('/inventory/req-load-sheets/create');
  const handleCreateLoadSheet = async (group: DepotGroup) => {
    try {
      setSubmitting(true);
      
      const depotId = group.requesting_depot_id;
      const selectedItemKeys = Object.keys(selectedItems[depotId] || {}).filter(
        key => selectedItems[depotId][key]
      );
      
      if (selectedItemKeys.length === 0) {
        toast.error("Please select at least one item");
        return;
      }
      
      // Build items array for load sheet
      const items = group.items
        .filter((item, index) => {
          const itemKey = `${depotId}_${i{ xs: 2, sm: 4 }, px: { xs: 2, sm: 3 } }}>
        <Stack spacing={2}>
          <Alert severity="error" sx={{ fontSize: { xs: '0.875rem', sm: '1rem' } }}>
            {error}
          </Alert>
          <Button
            variant="outlined"
            onClick={() => window.location.reload()}
            sx={{ alignSelf: 'flex-start' }}
          >
            Retry
          </Button>
        </StackKey];
        })
        .map((item, index) => {
          const itemKey = `${depotId}_${item.requisition_scheduling_id}_${item.requisition_detail_id}_${index}`;
          const deliveryQty = deliveryQtys[itemKey] || 0;
          
          if (deliveryQty <= 0) {
            throw new Error(`Delivery qua{ xs: 2, sm: 4 }, px: { xs: 2, sm: 3 } }}>
        <Stack spacing={2}>
          <Typography variant="h5" sx={{ fontSize: { xs: '1.25rem', sm: '1.5rem' } }}>
            Approved Requisition Schedules
          </Typography>
          <Alert severity="info">
            No approved requisition schedules pending delivery. All requisitions have been fulfilled or no items have been scheduled yet.
          </Alert>
          <Button
            variant="outlined"
            onClick={() => router.push("/inventory/req-load-sheets")}
            sx={{ alignSelf: 'flex-start' }}
          >
            View Load Sheets
          </Button>
        </Stack
          return {{ xs: 2, sm: 4 }, mb: 4, px: { xs: 2, sm: 3 } }}>
      <Stack spacing={3}>
        <Box>
          <Typography variant="h5" gutterBottom sx={{ fontSize: { xs: '1.25rem', sm: '1.5rem' } }}>
            Approved Requisition Schedules
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ fontSize: { xs: '0.875rem', sm: '1rem' } }}>
            Select items to create load sheets for depot-to-depot transfers.
          </Typography>
        </Box>

        {depotGroups.map((group) => {
          const depotId = group.requesting_depot_id;
          const selectedCount = Object.values(selectedItems[depotId] || {}).filter(Boolean).length;
          const totalItems = group.items.length;
          const allSelected = totalItems > 0 && selectedCount === totalItems;

          return (
            <Accordion
              key={depotId}
              expanded={expandedGroup === depotId}
              onChange={() => setExpandedGroup(expandedGroup === depotId ? false : depotId)}
              sx={{ 
                border: '1px solid',
                borderColor: 'divider',
                '&:before': { display: 'none' },
                boxShadow: 1
              }}
            >
              <AccordionSummary 
                expandIcon={<ExpandMoreIcon />}
                sx={{ 
                  bgcolor: selectedCount > 0 ? 'action.hover' : 'background.paper',
                  '&:hover': { bgcolor: 'action.hover' }
                }}
              >
                <Stack 
                  direction={{ xs: 'column', sm: 'row' }} 
                  spacing={1} 
                  sx={{ width: '100%', alignItems: { sm: 'center' } }}
                >
                  <Typography variant="h6" sx={{ fontSize: { xs: '1rem', sm: '1.25rem' } }}>
                    {group.requesting_depot_name}
                  </Typography>
                  <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap' }}>
                    <Chip 
                      label={`${totalItems} item${totalItems !== 1 ? 's' : ''}`} 
                      size="small" 
                      color="primary" 
                      variant="outlined"
                    />
                    {selectedCount > 0 && (
                      <Chip 
                        label={`${selectedCount} selected`} 
                        size="small" 
                        color="secondary"
                      />
                    )}
                  </Stack>
                </Stack>
              </AccordionSummary>
              
              <AccordionDetails sx={{ p: { xs: 1, sm: 2 } }}>
                <Stack spacing={2}>
                  <Stack 
                    direction={{ xs: 'column', sm: 'row' }} 
                    spacing={1} 
                    sx={{ justifyContent: 'space-between' }}
                  >
                    <Button
                      size="small"
                      variant="outlined"
                      onClick={() => handleSelectAll(depotId, group.items)}
                      sx={{ alignSelf: { xs: 'stretch', sm: 'flex-start' } }}
                    >
                      {allSelected ? 'Deselect All' : 'Select All'}
                    </Button>
                    
                    {selectedCount > 0 && (
                      <Button
                        variant="contained"
                        color="primary"
                        disabled={submitting}
                        onClick={() => handleCreateLoadSheet(group)}
                        sx={{ alignSelf: { xs: 'stretch', sm: 'flex-end' } }}
                      >
                        Create Load Sheet ({selectedCount} item{selectedCount !== 1 ? 's' : ''})
                      </Button>
                    )}
                  </Stack>

                  <TableContainer 
                    component={Paper} 
                    sx={{ 
                      maxHeight: { xs: 400, sm: 600 },
                      overflowX: 'auto'
                    }}
                  >
                    <Table size="small" stickyHeader>
                      <TableHead>
                        <TableRow>
                          <TableCell padding="checkbox">
                            <Checkbox
                              checked={allSelected}
                              indeterminate={selectedCount > 0 && selectedCount < totalItems}
                              onChange={() => handleSelectAll(depotId, group.items)}
                            />
                          </TableCell>
                          <TableCell sx={{ minWidth: { xs: 80, sm: 100 } }}>Req No</TableCell>
                          <TableCell sx={{ minWidth: { xs: 80, sm: 100 } }}>SKU</TableCell>
                          <TableCell sx={{ minWidth: { xs: 150, sm: 200 }, display: { xs: 'none', sm: 'table-cell' } }}>Product Name</TableCell>
                          <TableCell align="right" sx={{ minWidth: 70 }}>Remaining</TableCell>
                          <TableCell align="right" sx={{ minWidth: 70 }}>Stock</TableCell>
                          <TableCell align="right" sx={{ minWidth: { xs: 100, sm: 120 } }}>Delivery Qty</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {group.items.map((item, index) => {
                          const itemKey = `${depotId}_${item.requisition_scheduling_id}_${item.requisition_detail_id}_${index}`;
                          const isSelected = selectedItems[depotId]?.[itemKey] || false;
                          const hasStock = item.stock_qty >= item.remaining_qty;
                          const deliveryQty = deliveryQtys[itemKey] || 0;

                          return (
                            <TableRow 
                              key={itemKey} 
                              hover
                              selected={isSelected}
                              sx={{ 
                                bgcolor: isSelected ? 'action.selected' : 'inherit',
                                '&:hover': { bgcolor: isSelected ? 'action.hover' : 'action.hover' }
                              }}
                            >
                              <TableCell padding="checkbox">
                                <Checkbox
                                  checked={isSelected}
                                  onChange={(e) => handleSelectItem(depotId, itemKey, item, e.target.checked)}
                                />
                              </TableCell>
                              <TableCell>
                                <Typography variant="body2" sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' } }}>
                                  {item.requisition_no}
                                </Typography>
                              </TableCell>
                              <TableCell>
                                <Typography variant="body2" fontWeight="500" sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' } }}>
                                  {item.sku}
                                </Typography>
                              </TableCell>
                              <TableCell sx={{ display: { xs: 'none', sm: 'table-cell' } }}>
                                <Typography variant="body2" sx={{ fontSize: '0.875rem' }}>
                                  {item.product_name}
                                </Typography>
                              </TableCell>
                              <TableCell align="right">
                                <Typography variant="body2" fontWeight="600" sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' } }}>
                                  {item.remaining_qty}
                                </Typography>
                              </TableCell>
                              <TableCell align="right">
                                <Tooltip title={`Total: ${item.total_stock_qty}, Blocked: ${item.blocked_qty}`}>
                                  <Chip
                                    icon={hasStock ? <CheckCircleIcon /> : <WarningIcon />}
                                    label={item.stock_qty}
                                    size="small"
                                    color={hasStock ? 'success' : 'warning'}
                                    sx={{ fontSize: { xs: '0.7rem', sm: '0.75rem' } }}
                                  />
                                </Tooltip>
                              </TableCell>
                              <TableCell align="right">
                                {isSelected ? (
                                  <TextField
                                    type="number"
                                    size="small"
                                    value={deliveryQty}
                                    onChange={(e) => handleQuantityChange(itemKey, e.target.value, item)}
                                    inputProps={{
                                      min: 1,
                                      max: Math.min(item.remaining_qty, item.stock_qty),
                                      style: { 
                                        textAlign: 'right',
                                        fontSize: '0.875rem',
                                        padding: '4px 8px'
                                      }
                                    }}
                                    error={deliveryQty > Math.min(item.remaining_qty, item.stock_qty) || deliveryQty <= 0}
                                    sx={{ width: { xs: 80, sm: 100 } }}
                                  />
                                ) : (
                                  <Typography variant="body2" color="text.secondary" sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' } }}>
                                    -
                                  </Typography>
                                )}
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </TableContainer>

                  {selectedCount > 0 && (
                    <Paper sx={{ p: 2, bgcolor: 'primary.50', border: '1px solid', borderColor: 'primary.main' }}>
                      <Stack spacing={1}>
                        <Typography variant="subtitle2" color="primary.main" sx={{ fontSize: { xs: '0.875rem', sm: '1rem' } }}>
                          Selection Summary for {group.requesting_depot_name}
                        </Typography>
                        <Typography variant="body2" sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' } }}>
                          Items selected: <strong>{selectedCount}</strong>
                        </Typography>
                        <Typography variant="body2" sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' } }}>
                          Total delivery quantity: <strong>
                            {Object.entries(deliveryQtys)
                              .filter(([key]) => selectedItems[depotId]?.[key])
                              .reduce((sum, [, qty]) => sum + qty, 0)} CTN
                          </strong>
                        </Typography>
                      </Stack>
                    </Paper>
                  )}
                </Stack>
              </AccordionDetails>
            </Accordion>
          );
        })}
      </Stack>         <Chip 
                    label={`${selectedCount} selected`} 
                    size="small" 
                    color="secondary"
                  />
                )}
              </Box>
            </AccordionSummary>
            
            <AccordionDetails>
              <Alert severity="info" sx={{ mb: 2 }}>
                To create a load sheet for these items, use the <strong>Create Load Sheet</strong> button above.
              </Alert>

              <TableContainer component={Paper} sx={{ maxHeight: 600 }}>
                <Table size="small" stickyHeader>
                  <TableHead>
                    <TableRow>
                      <TableCell>Req No</TableCell>
                      <TableCell>SKU</TableCell>
                      <TableCell>ERP ID</TableCell>
                      <TableCell>Product Name</TableCell>
                      <TableCell align="right">Scheduled Qty</TableCell>
                      <TableCell align="right">Delivered</TableCell>
                      <TableCell align="right">Remaining</TableCell>
                      <TableCell align="right">Stock Available</TableCell>
                      <TableCell>Status</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {group.items.map((item, index) => {
                      const itemKey = `${depotId}_${item.requisition_scheduling_id}_${item.requisition_detail_id}_${index}`;
                      const hasStock = item.stock_qty >= item.remaining_qty;

                      return (
                        <TableRow key={itemKey} hover>
                          <TableCell>{item.requisition_no}</TableCell>
                          <TableCell>{item.sku}</TableCell>
                          <TableCell>{item.erp_id || '-'}</TableCell>
                          <TableCell>{item.product_name}</TableCell>
                          <TableCell align="right">{item.scheduled_qty}</TableCell>
                          <TableCell align="right">{item.delivered_qty}</TableCell>
                          <TableCell align="right">
                            <Typography variant="body2" fontWeight="600">
                              {item.remaining_qty}
                            </Typography>
                          </TableCell>
                          <TableCell align="right">
                            <Chip
                              label={item.stock_qty}
                              size="small"
                              color={hasStock ? 'success' : 'warning'}
                            />
                          </TableCell>
                          <TableCell>
                            {item.is_partial && (
                              <Chip label="Partial" size="small" color="warning" />
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
      })}
    </Container>
  );
}
