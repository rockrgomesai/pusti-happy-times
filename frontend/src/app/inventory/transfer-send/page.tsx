"use client";

import React, { useState, useEffect } from "react";
import {
  Container,
  Box,
  Typography,
  Paper,
  Grid as Grid2,
  TextField,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  CircularProgress,
  Alert,
  Card,
  CardContent,
  Tabs,
  Tab,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  MenuItem,
} from "@mui/material";
import {
  Send as SendIcon,
  Inventory as InventoryIcon,
  ExpandMore as ExpandMoreIcon,
} from "@mui/icons-material";
import api from "@/lib/api";
import toast from "react-hot-toast";
import { useAuth } from "@/contexts/AuthContext";

interface Depot {
  _id: string;
  name: string;
  code: string;
  type: string;
}

interface Product {
  _id: string;
  sku: string;
  short_description: string;
  product_type: "MANUFACTURED" | "PROCURED";
  dp_price: number;
  category_id?: {
    _id: string;
    name: string;
  };
}

interface StockItem {
  sku: string;
  product_name: string;
  current_qty: number;
  unit: "CTN" | "PCS";
  category: string;
}

interface TransferQuantity {
  sku: string;
  qty: number;
  unit: "CTN" | "PCS";
}

export default function TransferSendPage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [depots, setDepots] = useState<Depot[]>([]);
  const [selectedDepot, setSelectedDepot] = useState<string>("");
  const [transferDate, setTransferDate] = useState<string>(
    new Date().toISOString().split("T")[0]
  );
  const [notes, setNotes] = useState<string>("");
  const [activeTab, setActiveTab] = useState<number>(0);
  
  // Stock data grouped by category
  const [manufacturedStock, setManufacturedStock] = useState<Record<string, StockItem[]>>({});
  const [procuredStock, setProcuredStock] = useState<Record<string, StockItem[]>>({});
  
  // Transfer quantities
  const [transferQuantities, setTransferQuantities] = useState<Record<string, TransferQuantity>>({});

  useEffect(() => {
    loadInitialData();
  }, []);

  const loadInitialData = async () => {
    try {
      setLoading(true);
      
      // Load depots
      try {
        const depotsRes = await api.get("/facilities/depots");
        setDepots(depotsRes.data.data || []);
      } catch (error: any) {
        console.error("Depot load error:", error);
        toast.error("Failed to load depots: " + (error.response?.data?.message || error.message));
      }
      
      // Load stock
      try {
        const stockRes = await api.get("/inventory/local-stock");
        const stockData = stockRes.data.data?.stocks || [];
        const manufactured: Record<string, StockItem[]> = {};
        const procured: Record<string, StockItem[]> = {};
        
        for (const item of stockData) {
          // Only include items with qty > 0
          // Handle Decimal128 format
          const qtyCtn = typeof item.qty_ctn === 'object' && item.qty_ctn.$numberDecimal 
            ? parseFloat(item.qty_ctn.$numberDecimal)
            : parseFloat(item.qty_ctn) || 0;
          
          if (qtyCtn <= 0) continue;
          
          const product = item.product_id;
          if (!product) continue;
          
          const stockItem: StockItem = {
            sku: product.sku,
            product_name: product.bangla_name || product.english_name || product.sku,
            current_qty: qtyCtn,
            unit: "CTN",
            category: "General", // DepotStock doesn't have category, will need to get from product if needed
          };
          
          const productType = product.product_type || "MANUFACTURED";
          const category = stockItem.category;
          
          if (productType === "MANUFACTURED") {
            if (!manufactured[category]) manufactured[category] = [];
            manufactured[category].push(stockItem);
          } else if (productType === "PROCURED") {
            if (!procured[category]) procured[category] = [];
            procured[category].push(stockItem);
          }
        }
        
        setManufacturedStock(manufactured);
        setProcuredStock(procured);
      } catch (error: any) {
        console.error("Stock load error:", error);
        toast.error("Failed to load stock: " + (error.response?.data?.message || error.message));
      }
    } finally {
      setLoading(false);
    }
  };

  const handleQuantityChange = (sku: string, qty: number, unit: "CTN" | "PCS") => {
    if (qty > 0) {
      setTransferQuantities((prev) => ({
        ...prev,
        [sku]: { sku, qty, unit },
      }));
    } else {
      // Remove if quantity is 0 or negative
      setTransferQuantities((prev) => {
        const updated = { ...prev };
        delete updated[sku];
        return updated;
      });
    }
  };

  const getTransferQty = (sku: string): number => {
    return transferQuantities[sku]?.qty || 0;
  };

  const handleSubmit = async (productType: "MANUFACTURED" | "PROCURED") => {
    try {
      // Validation
      if (!selectedDepot) {
        toast.error("Please select destination depot");
        return;
      }

      // Filter items for the selected product type
      const stockData = productType === "MANUFACTURED" ? manufacturedStock : procuredStock;
      const itemsToTransfer: any[] = [];
      
      // Collect all items with transfer quantities
      Object.values(stockData).forEach((categoryItems) => {
        categoryItems.forEach((item) => {
          const transferQty = transferQuantities[item.sku];
          if (transferQty && transferQty.qty > 0) {
            // Validate transfer qty doesn't exceed available
            if (transferQty.qty > item.current_qty) {
              throw new Error(
                `Transfer quantity for ${item.sku} (${transferQty.qty}) exceeds available stock (${item.current_qty})`
              );
            }
            
            itemsToTransfer.push({
              sku: item.sku,
              unit: item.unit,
              qty_sent: transferQty.qty,
              notes: "",
            });
          }
        });
      });

      if (itemsToTransfer.length === 0) {
        toast.error("Please enter transfer quantities for at least one item");
        return;
      }

      setLoading(true);

      const payload = {
        to_depot_id: selectedDepot,
        transfer_date: transferDate,
        notes: `${productType} - ${notes}`.trim(),
        items: itemsToTransfer,
      };

      const response = await api.post("/inventory/depot-transfers/create", payload);
      
      toast.success(`Transfer ${response.data.data.transfer_number} created successfully!`);
      
      // Clear transfer quantities for submitted items
      setTransferQuantities((prev) => {
        const updated = { ...prev };
        itemsToTransfer.forEach((item) => delete updated[item.sku]);
        return updated;
      });
      
      // Reload stock data
      loadInitialData();
    } catch (error: any) {
      toast.error(error.response?.data?.message || error.message || "Failed to create transfer");
    } finally {
      setLoading(false);
    }
  };

  const renderStockAccordions = (stockData: Record<string, StockItem[]>) => {
    return Object.entries(stockData).map(([category, items]) => (
      <Accordion key={category} defaultExpanded>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Typography variant="subtitle1" fontWeight="bold">
            {category} ({items.length} items)
          </Typography>
        </AccordionSummary>
        <AccordionDetails>
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell><strong>SKU</strong></TableCell>
                  <TableCell align="right"><strong>Available Qty</strong></TableCell>
                  <TableCell align="center"><strong>Unit</strong></TableCell>
                  <TableCell align="right" width="150"><strong>Transfer Qty</strong></TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {items.map((item) => {
                  const transferQty = getTransferQty(item.sku);
                  const isInvalid = transferQty > item.current_qty;
                  
                  return (
                    <TableRow key={item.sku}>
                      <TableCell>{item.sku}</TableCell>
                      <TableCell align="right">
                        <Typography
                          variant="body2"
                          color={item.current_qty > 0 ? "success.main" : "text.secondary"}
                          fontWeight="bold"
                        >
                          {item.current_qty}
                        </Typography>
                      </TableCell>
                      <TableCell align="center">
                        <Typography variant="body2">{item.unit}</Typography>
                      </TableCell>
                      <TableCell align="right">
                        <TextField
                          size="small"
                          type="number"
                          value={transferQty || ""}
                          onChange={(e) => {
                            const qty = parseInt(e.target.value) || 0;
                            handleQuantityChange(item.sku, qty, item.unit);
                          }}
                          inputProps={{
                            min: 0,
                            max: item.current_qty,
                            style: { textAlign: "right" },
                          }}
                          error={isInvalid}
                          helperText={isInvalid ? "Exceeds available" : ""}
                          placeholder="0"
                          fullWidth
                        />
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>
        </AccordionDetails>
      </Accordion>
    ));
  };

  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" component="h1" fontWeight="bold" gutterBottom>
          <InventoryIcon sx={{ mr: 1, verticalAlign: "middle" }} />
          Depot Transfer - Send
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Send products from your depot to another depot
        </Typography>
      </Box>

      {/* Transfer Details Card */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Transfer Details
          </Typography>
          <Grid2 container spacing={2}>
            <Grid2 size={{ xs: 12, md: 4 }}>
              <TextField
                select
                fullWidth
                label="Destination Depot"
                value={selectedDepot}
                onChange={(e) => setSelectedDepot(e.target.value)}
                required
              >
                <MenuItem value="">
                  <em>Select Depot</em>
                </MenuItem>
                {depots
                  .filter((depot) => depot._id !== user?.context?.facility_id)
                  .map((depot) => (
                    <MenuItem key={depot._id} value={depot._id}>
                      {depot.name}
                    </MenuItem>
                  ))}
              </TextField>
            </Grid2>
            <Grid2 size={{ xs: 12, md: 4 }}>
              <TextField
                fullWidth
                type="date"
                label="Transfer Date"
                value={transferDate}
                onChange={(e) => setTransferDate(e.target.value)}
                InputLabelProps={{ shrink: true }}
                required
              />
            </Grid2>
            <Grid2 size={{ xs: 12, md: 4 }}>
              <TextField
                fullWidth
                label="Notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Additional notes..."
              />
            </Grid2>
          </Grid2>
        </CardContent>
      </Card>

      {/* Tabs for Product Types */}
      <Paper sx={{ mb: 2 }}>
        <Tabs value={activeTab} onChange={(e, newValue) => setActiveTab(newValue)}>
          <Tab label="MANUFACTURED" />
          <Tab label="PROCURED" />
        </Tabs>
      </Paper>

      {loading ? (
        <Box display="flex" justifyContent="center" p={4}>
          <CircularProgress />
        </Box>
      ) : (
        <>
          {/* MANUFACTURED Tab */}
          {activeTab === 0 && (
            <Paper sx={{ p: 2 }}>
              {Object.keys(manufacturedStock).length === 0 ? (
                <Alert severity="info">No manufactured products with stock available</Alert>
              ) : (
                <>
                  {renderStockAccordions(manufacturedStock)}
                  <Box sx={{ mt: 3, display: "flex", justifyContent: "flex-end" }}>
                    <Button
                      variant="contained"
                      startIcon={loading ? <CircularProgress size={20} /> : <SendIcon />}
                      onClick={() => handleSubmit("MANUFACTURED")}
                      disabled={loading || Object.keys(transferQuantities).length === 0}
                      size="large"
                    >
                      {loading ? "Sending..." : "Transfer MANUFACTURED Items"}
                    </Button>
                  </Box>
                </>
              )}
            </Paper>
          )}

          {/* PROCURED Tab */}
          {activeTab === 1 && (
            <Paper sx={{ p: 2 }}>
              {Object.keys(procuredStock).length === 0 ? (
                <Alert severity="info">No procured products with stock available</Alert>
              ) : (
                <>
                  {renderStockAccordions(procuredStock)}
                  <Box sx={{ mt: 3, display: "flex", justifyContent: "flex-end" }}>
                    <Button
                      variant="contained"
                      startIcon={loading ? <CircularProgress size={20} /> : <SendIcon />}
                      onClick={() => handleSubmit("PROCURED")}
                      disabled={loading || Object.keys(transferQuantities).length === 0}
                      size="large"
                    >
                      {loading ? "Sending..." : "Transfer PROCURED Items"}
                    </Button>
                  </Box>
                </>
              )}
            </Paper>
          )}
        </>
      )}
    </Container>
  );
}
