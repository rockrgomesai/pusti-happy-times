'use client';

import React, { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Paper,
  Typography,
  Button,
  Grid,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Card,
  CardContent,
  Divider,
  IconButton,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert
} from '@mui/material';
import {
  ArrowBack as ArrowBackIcon,
  LocalShipping as TruckIcon,
  Person as PersonIcon,
  Phone as PhoneIcon,
  CalendarToday as CalendarIcon,
  CheckCircle as CheckIcon,
  SwapHoriz as ConvertIcon,
  Print as PrintIcon
} from '@mui/icons-material';
import { useRouter, useParams } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { apiClient } from '@/lib/api';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface LoadSheetDetail {
  _id: string;
  load_sheet_number: string;
  status: string;
  delivery_date: string;
  vehicle_info: {
    vehicle_no: string;
    driver_name: string;
    driver_phone: string;
  };
  distributors: Array<{
    distributor_id: {
      _id: string;
      distributor_name: string;
      distributor_code: string;
    };
    do_items: Array<{
      do_id: string;
      order_number: string;
      order_date: string;
      sku: string;
      order_qty: number;
      previously_delivered_qty: number;
      undelivered_qty: number;
      delivery_qty: number;
      unit: string;
    }>;
  }>;
  total_items: number;
  total_quantity: number;
  distributors_count: number;
  created_by: {
    name: string;
  };
  converted_by?: {
    name: string;
  };
  created_at: string;
  converted_at?: string;
  notes?: string;
  chalan_ids?: Array<{ _id: string; chalan_number: string }>;
  invoice_ids?: Array<{ _id: string; invoice_number: string }>;
}

export default function LoadSheetDetailPage() {
  const router = useRouter();
  const params = useParams();
  const id = params?.id as string;
  const { user } = useAuth();

  const [loadSheet, setLoadSheet] = useState<LoadSheetDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [converting, setConverting] = useState(false);
  const [showConvertDialog, setShowConvertDialog] = useState(false);

  const generatePDF = () => {
    if (!loadSheet) return;

    const doc = new jsPDF('landscape');
    const pageWidth = doc.internal.pageSize.getWidth();
    
    // Header
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text('T.K Food Products Ltd.', pageWidth / 2, 15, { align: 'center' });
    
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text('T. K. Bhaban (2nd Floor), 13, Kawranbazar Dhaka-1215, Bangladesh', pageWidth / 2, 22, { align: 'center' });
    
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('Delivery Truck Loading', pageWidth / 2, 32, { align: 'center' });
    
    doc.setFontSize(11);
    doc.setFont('helvetica', 'normal');
    doc.text('Dhaka Central Depot', pageWidth / 2, 39, { align: 'center' });
    
    // Delivery date on the right
    doc.setFontSize(10);
    doc.text(`Delivery Date: ${new Date(loadSheet.delivery_date).toLocaleDateString('en-GB')}`, pageWidth - 15, 39, { align: 'right' });
    
    // Prepare table data
    const tableData: any[] = [];
    let serialNo = 1;
    
    loadSheet.distributors.forEach((dist) => {
      dist.do_items.forEach((item) => {
        const distributorName = dist.distributor_id?.distributor_name || dist.distributor_name || 'N/A';
        tableData.push([
          serialNo++,
          item.order_number,
          distributorName,
          item.sku,
          item.delivery_qty || 0,
          (item.delivery_qty || 0) * 12 // Assuming 1 CTN = 12 PCS
        ]);
      });
    });
    
    // Calculate totals
    const totalCTN = tableData.reduce((sum, row) => sum + row[4], 0);
    const totalPCS = tableData.reduce((sum, row) => sum + row[5], 0);
    
    // Add total row
    tableData.push([
      '', '', '', 'Total', totalCTN, totalPCS
    ]);
    
    // Generate table
    autoTable(doc, {
      startY: 45,
      head: [['No.', 'DO No', 'DB Name', 'Sku Name', 'Qty CTN', 'Qty PCS']],
      body: tableData,
      theme: 'grid',
      styles: {
        fontSize: 8,
        cellPadding: 2,
      },
      headStyles: {
        fillColor: [200, 200, 200],
        textColor: [0, 0, 0],
        fontStyle: 'bold',
        fontSize: 8,
      },
      columnStyles: {
        0: { cellWidth: 12, halign: 'center' },
        1: { cellWidth: 40 },
        2: { cellWidth: 70, cellPadding: 1.5 },
        3: { cellWidth: 100 },
        4: { cellWidth: 25, halign: 'right' },
        5: { cellWidth: 25, halign: 'right' },
      },
      didParseCell: function(data) {
        // Make total row bold
        if (data.row.index === tableData.length - 1) {
          data.cell.styles.fontStyle = 'bold';
          data.cell.styles.fillColor = [240, 240, 240];
        }
      },
    });
    
    // Signature line
    const finalY = (doc as any).lastAutoTable.finalY || 150;
    doc.line(pageWidth - 70, finalY + 40, pageWidth - 15, finalY + 40);
    doc.text('Receiver Signature', pageWidth - 50, finalY + 45);
    
    // Save PDF
    doc.save(`Load-Sheet-${loadSheet.load_sheet_number}.pdf`);
  };

  useEffect(() => {
    if (id) {
      loadLoadSheetDetail();
    }
  }, [id]);

  const loadLoadSheetDetail = async () => {
    try {
      setLoading(true);
      const response: any = await apiClient.get(
        `/inventory/load-sheets/${id}`
      );

      console.log('📦 Load sheet response:', response);
      
      if (response.success) {
        setLoadSheet(response.data);
      } else {
        console.error('Response not successful:', response);
        alert(response.message || 'Failed to load load sheet');
      }
    } catch (error: any) {
      console.error('Error loading load sheet:', error);
      alert(error.response?.data?.message || error.message || 'Failed to load load sheet');
      router.back();
    } finally {
      setLoading(false);
    }
  };

  const handleConvert = async () => {
    try {
      setConverting(true);
      const response: any = await apiClient.post(
        `/inventory/load-sheets/${id}/convert`,
        {}
      );

      if (response.data.success) {
        alert('Load Sheet converted successfully! Chalans and Invoices have been created.');
        setShowConvertDialog(false);
        loadLoadSheetDetail();
      }
    } catch (error: any) {
      console.error('Error converting load sheet:', error);
      alert(error.response?.data?.message || 'Failed to convert load sheet');
    } finally {
      setConverting(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Draft':
        return 'default';
      case 'Validated':
        return 'info';
      case 'Loading':
        return 'warning';
      case 'Loaded':
        return 'primary';
      case 'Converted':
        return 'success';
      default:
        return 'default';
    }
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="60vh">
        <CircularProgress />
      </Box>
    );
  }

  if (!loadSheet) {
    return null;
  }

  const canConvert = loadSheet.status === 'Validated' || loadSheet.status === 'Loaded';
  const canLock = loadSheet.status === 'Draft';
  const canGenerateChalans = loadSheet.status === 'Locked';
  const canGenerateInvoices = loadSheet.status === 'Chalan_Generated';

  const handleLock = () => {
    router.push(`/inventory/load-sheets/${id}/lock`);
  };

  const handleGenerateChalans = async () => {
    if (!confirm('Generate Delivery Chalans for this Load Sheet?')) return;
    
    try {
      setConverting(true);
      const response: any = await apiClient.post(
        `/inventory/load-sheets/${id}/generate-chalans`,
        {}
      );

      if (response.data.success) {
        alert(`${response.data.data.length} Chalans generated successfully!`);
        loadLoadSheetDetail();
      }
    } catch (error: any) {
      console.error('Error generating chalans:', error);
      alert(error.response?.data?.message || 'Failed to generate chalans');
    } finally {
      setConverting(false);
    }
  };

  const handleGenerateInvoices = async () => {
    if (!confirm('Generate Delivery Invoices for this Load Sheet?')) return;
    
    try {
      setConverting(true);
      const response: any = await apiClient.post(
        `/inventory/load-sheets/${id}/generate-invoices`,
        {}
      );

      if (response.data.success) {
        alert(`${response.data.data.length} Invoices generated successfully!`);
        loadLoadSheetDetail();
      }
    } catch (error: any) {
      console.error('Error generating invoices:', error);
      alert(error.response?.data?.message || 'Failed to generate invoices');
    } finally {
      setConverting(false);
    }
  };

  return (
    <Container maxWidth="xl" sx={{ py: 3 }}>
      {/* Header */}
      <Box mb={3} display="flex" alignItems="center" gap={2} flexWrap="wrap">
        <IconButton onClick={() => router.back()} size="small">
          <ArrowBackIcon />
        </IconButton>
        <Box flex={1}>
          <Typography variant="h4" fontWeight="bold">
            {loadSheet.load_sheet_number}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Load Sheet Details
          </Typography>
        </Box>
        <Chip
          label={loadSheet.status}
          color={getStatusColor(loadSheet.status)}
          icon={loadSheet.status === 'Converted' ? <CheckIcon /> : undefined}
        />
      </Box>

      {/* Action Buttons */}
      <Box mb={3} display="flex" gap={2} flexWrap="wrap">
        {canLock && (
          <Button
            variant="contained"
            color="warning"
            onClick={handleLock}
          >
            Lock & Finalize
          </Button>
        )}
        {canGenerateChalans && (
          <Button
            variant="contained"
            color="primary"
            onClick={handleGenerateChalans}
            disabled={converting}
          >
            Generate Chalans
          </Button>
        )}
        {canGenerateInvoices && (
          <Button
            variant="contained"
            color="secondary"
            onClick={handleGenerateInvoices}
            disabled={converting}
          >
            Generate Invoices
          </Button>
        )}
        {canConvert && (
          <Button
            variant="contained"
            color="primary"
            startIcon={<ConvertIcon />}
            onClick={() => setShowConvertDialog(true)}
          >
            Convert to Chalan & Invoice
          </Button>
        )}
        <Button
          variant="outlined"
          startIcon={<PrintIcon />}
          onClick={generatePDF}
        >
          Download PDF
        </Button>
      </Box>

      {/* Basic Info */}
      <Grid container spacing={3} mb={3} className="no-print">
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom display="flex" alignItems="center" gap={1}>
                <TruckIcon /> Vehicle Information
              </Typography>
              <Divider sx={{ mb: 2 }} />
              <Grid container spacing={2}>
                <Grid item xs={12}>
                  <Typography variant="body2" color="text.secondary">
                    Vehicle Number
                  </Typography>
                  <Typography variant="body1" fontWeight="bold">
                    {loadSheet.vehicle_info.vehicle_no}
                  </Typography>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Typography variant="body2" color="text.secondary">
                    Driver Name
                  </Typography>
                  <Typography variant="body1">
                    {loadSheet.vehicle_info.driver_name}
                  </Typography>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Typography variant="body2" color="text.secondary">
                    Driver Phone
                  </Typography>
                  <Typography variant="body1">
                    {loadSheet.vehicle_info.driver_phone}
                  </Typography>
                </Grid>
                <Grid item xs={12}>
                  <Typography variant="body2" color="text.secondary">
                    Delivery Date
                  </Typography>
                  <Typography variant="body1" fontWeight="bold">
                    {new Date(loadSheet.delivery_date).toLocaleDateString('en-GB')}
                  </Typography>
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Summary
              </Typography>
              <Divider sx={{ mb: 2 }} />
              <Grid container spacing={2}>
                <Grid item xs={6}>
                  <Typography variant="body2" color="text.secondary">
                    Total Distributors
                  </Typography>
                  <Typography variant="h5" fontWeight="bold" color="primary">
                    {loadSheet.distributors_count}
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="body2" color="text.secondary">
                    Total Items
                  </Typography>
                  <Typography variant="h5" fontWeight="bold" color="secondary">
                    {loadSheet.total_items}
                  </Typography>
                </Grid>
                <Grid item xs={12}>
                  <Typography variant="body2" color="text.secondary">
                    Total Quantity
                  </Typography>
                  <Typography variant="h4" fontWeight="bold">
                    {loadSheet.total_quantity} CTN
                  </Typography>
                </Grid>
                <Grid item xs={12}>
                  <Typography variant="body2" color="text.secondary">
                    Created By
                  </Typography>
                  <Typography variant="body1">
                    {loadSheet.created_by.name} on {new Date(loadSheet.created_at).toLocaleString()}
                  </Typography>
                </Grid>
                {loadSheet.converted_at && (
                  <Grid item xs={12}>
                    <Typography variant="body2" color="text.secondary">
                      Converted
                    </Typography>
                    <Typography variant="body1">
                      {loadSheet.converted_by?.name} on {new Date(loadSheet.converted_at).toLocaleString()}
                    </Typography>
                  </Grid>
                )}
              </Grid>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Notes */}
      {loadSheet.notes && (
        <Alert severity="info" sx={{ mb: 3 }}>
          <strong>Notes:</strong> {loadSheet.notes}
        </Alert>
      )}

      {/* Converted Documents */}
      {loadSheet.status === 'Converted' && (loadSheet.chalan_ids?.length || loadSheet.invoice_ids?.length) && (
        <Card sx={{ mb: 3, bgcolor: 'success.light' }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Generated Documents
            </Typography>
            <Grid container spacing={2}>
              {loadSheet.chalan_ids && loadSheet.chalan_ids.length > 0 && (
                <Grid item xs={12} sm={6}>
                  <Typography variant="subtitle2" gutterBottom>
                    Delivery Chalans:
                  </Typography>
                  {loadSheet.chalan_ids.map((chalan) => (
                    <Chip
                      key={chalan._id}
                      label={chalan.chalan_number}
                      size="small"
                      sx={{ mr: 1, mb: 1 }}
                      onClick={() => router.push(`/distribution/chalans/${chalan._id}`)}
                      clickable
                    />
                  ))}
                </Grid>
              )}
              {loadSheet.invoice_ids && loadSheet.invoice_ids.length > 0 && (
                <Grid item xs={12} sm={6}>
                  <Typography variant="subtitle2" gutterBottom>
                    Invoices:
                  </Typography>
                  {loadSheet.invoice_ids.map((invoice) => (
                    <Chip
                      key={invoice._id}
                      label={invoice.invoice_number}
                      size="small"
                      color="primary"
                      sx={{ mr: 1, mb: 1 }}
                      onClick={() => router.push(`/distribution/invoices/${invoice._id}`)}
                      clickable
                    />
                  ))}
                </Grid>
              )}
            </Grid>
          </CardContent>
        </Card>
      )}

      {/* Items by Distributor */}
      <Typography variant="h5" fontWeight="bold" mb={2}>
        Items by Distributor
      </Typography>
      {loadSheet.distributors.map((dist, idx) => (
        <Paper key={idx} sx={{ mb: 3, p: 2 }}>
          <Typography variant="h6" gutterBottom>
            {dist.distributor_id?.distributor_name || dist.distributor_name || 'Unknown Distributor'} ({dist.distributor_id?.distributor_code || dist.distributor_code || 'N/A'})
          </Typography>
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>DO Number</TableCell>
                  <TableCell>DO Date</TableCell>
                  <TableCell>SKU</TableCell>
                  <TableCell align="right">Delivery Qty CTN</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {dist.do_items.map((item, itemIdx) => (
                  <TableRow key={itemIdx}>
                    <TableCell>{item.order_number}</TableCell>
                    <TableCell>{new Date(item.order_date).toLocaleDateString()}</TableCell>
                    <TableCell>
                      <Typography variant="body2" sx={{ fontFamily: 'monospace', fontSize: '0.75rem' }}>
                        {item.sku}
                      </Typography>
                    </TableCell>
                    <TableCell align="right">
                      <strong>{item.delivery_qty} {item.unit}</strong>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>
      ))}

      {/* Convert Confirmation Dialog */}
      <Dialog open={showConvertDialog} onClose={() => setShowConvertDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Convert Load Sheet?</DialogTitle>
        <DialogContent>
          <Alert severity="warning" sx={{ mb: 2 }}>
            This action cannot be undone. The system will:
          </Alert>
          <Box component="ul" sx={{ pl: 2 }}>
            <li>Create Delivery Chalans for each distributor</li>
            <li>Create Invoices with pricing from product DP price</li>
            <li>Create Customer Ledger debit entries per DO</li>
            <li>Update Demand Orders with delivered items tracking</li>
            <li>Deduct inventory from Depot Stock</li>
          </Box>
          <Alert severity="info" sx={{ mt: 2 }}>
            Total: {loadSheet.distributors_count} Chalan(s) and {loadSheet.distributors_count} Invoice(s) will be created
          </Alert>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowConvertDialog(false)} disabled={converting}>
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={handleConvert}
            disabled={converting}
            startIcon={converting ? <CircularProgress size={20} /> : <ConvertIcon />}
          >
            {converting ? 'Converting...' : 'Confirm Convert'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Print Styles */}
      <style jsx global>{`
        @media print {
          /* Hide non-printable elements */
          .no-print,
          button,
          .MuiIconButton-root,
          .MuiChip-root {
            display: none !important;
          }

          /* Reset page margins */
          @page {
            margin: 1cm;
          }

          /* Ensure proper printing */
          body {
            print-color-adjust: exact;
            -webkit-print-color-adjust: exact;
          }

          /* Make container full width */
          .MuiContainer-root {
            max-width: 100% !important;
            padding: 0 !important;
          }

          /* Avoid page breaks inside cards */
          .MuiCard-root,
          .MuiPaper-root,
          .MuiTableRow-root {
            page-break-inside: avoid;
          }

          /* Add page break before distributor sections if needed */
          .distributor-section {
            page-break-before: auto;
            page-break-inside: avoid;
          }

          /* Table styling for print */
          .MuiTable-root {
            border-collapse: collapse;
          }

          .MuiTableCell-root {
            border: 1px solid #000 !important;
            padding: 8px !important;
            font-size: 12px !important;
          }

          .MuiTableHead-root .MuiTableCell-root {
            background-color: #f5f5f5 !important;
            font-weight: bold !important;
          }
        }
      `}</style>
    </Container>
  );
}
