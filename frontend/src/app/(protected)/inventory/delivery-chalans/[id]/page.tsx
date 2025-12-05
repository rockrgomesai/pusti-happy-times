"use client";

import React, { useState, useEffect, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  CircularProgress,
  Alert,
  IconButton,
  Tabs,
  Tab,
  Divider,
  Grid,
  Chip,
} from "@mui/material";
import { ArrowBack, Print, Download } from "@mui/icons-material";
import { apiClient } from "@/lib/api";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

interface Chalan {
  _id: string;
  chalan_no: string;
  load_sheet_id: {
    load_sheet_number: string;
    delivery_date: string;
  };
  depot_id: {
    name: string;
    address: string;
  };
  distributor_id: {
    name: string;
    address: string;
    phone: string;
  };
  transport_id: {
    name: string;
  };
  vehicle_no: string;
  driver_name: string;
  driver_phone: string;
  items: Array<{
    do_number: string;
    sku: string;
    sku_name: string;
    uom: string;
    qty_ctn: number;
    qty_pcs: number;
  }>;
  total_qty_ctn: number;
  total_qty_pcs: number;
  chalan_date: string;
  status: string;
  remarks?: string;
}

const COPY_TYPES = ["CUSTOMER COPY", "OFFICE COPY", "TRANSPORT COPY", "GATE PASS"];

export default function ChalanViewPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [chalan, setChalan] = useState<Chalan | null>(null);
  const [activeTab, setActiveTab] = useState(0);
  const printRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchChalan();
  }, [id]);

  const fetchChalan = async () => {
    try {
      setLoading(true);
      setError("");
      console.log("🔍 Fetching chalan with id:", id);

      const response: any = await apiClient.get(`/inventory/delivery-chalans/${id}`);
      console.log("📥 Chalan response:", response);

      if (response.success) {
        console.log("✅ Setting chalan:", response.data);
        setChalan(response.data);
      } else {
        setError("Chalan not found");
      }
    } catch (err: any) {
      console.error("Error fetching chalan:", err);
      setError(err.response?.data?.message || "Failed to load chalan");
    } finally {
      setLoading(false);
    }
  };

  const generateSingleCopy = (doc: jsPDF, copyType: string, isFirstPage: boolean) => {
    if (!chalan) return;

    if (!isFirstPage) {
      doc.addPage();
    }

    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 15;

    // Header
    doc.setFontSize(18);
    doc.setFont("helvetica", "bold");
    doc.text("DELIVERY CHALAN", pageWidth / 2, 20, { align: "center" });

    doc.setFontSize(12);
    doc.setFont("helvetica", "normal");
    doc.text(copyType, pageWidth / 2, 28, { align: "center" });

    // Company Info
    doc.setFontSize(10);
    doc.text(chalan.depot_id.name, margin, 40);
    doc.setFontSize(9);
    doc.text(chalan.depot_id.address || "", margin, 45);

    // Chalan Info
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.text(`Chalan No: ${chalan.chalan_no}`, pageWidth - margin, 40, { align: "right" });
    doc.setFont("helvetica", "normal");
    doc.text(
      `Date: ${new Date(chalan.chalan_date).toLocaleDateString()}`,
      pageWidth - margin,
      45,
      { align: "right" }
    );
    doc.text(
      `Load Sheet: ${chalan.load_sheet_id.load_sheet_number}`,
      pageWidth - margin,
      50,
      { align: "right" }
    );

    // To Section
    let yPos = 60;
    doc.setFont("helvetica", "bold");
    doc.text("To:", margin, yPos);
    doc.setFont("helvetica", "normal");
    doc.text(chalan.distributor_id.name, margin, yPos + 5);
    doc.text(chalan.distributor_id.address || "", margin, yPos + 10);
    doc.text(`Phone: ${chalan.distributor_id.phone || ""}`, margin, yPos + 15);

    // Transport Info
    doc.setFont("helvetica", "bold");
    doc.text("Transport Details:", pageWidth - margin - 60, yPos, { align: "left" });
    doc.setFont("helvetica", "normal");
    doc.text(`Vehicle: ${chalan.vehicle_no}`, pageWidth - margin - 60, yPos + 5);
    doc.text(`Driver: ${chalan.driver_name}`, pageWidth - margin - 60, yPos + 10);
    doc.text(`Phone: ${chalan.driver_phone}`, pageWidth - margin - 60, yPos + 15);

    // Items Table
    yPos += 25;
    const tableData = chalan.items.map((item, index) => [
      index + 1,
      item.do_number,
      item.sku_name,
      item.uom,
      item.qty_ctn.toString(),
      item.qty_pcs.toString(),
    ]);

    autoTable(doc, {
      startY: yPos,
      head: [["No", "DO No", "SKU Name", "UOM", "Qty CTN", "Qty PCS"]],
      body: tableData,
      foot: [
        [
          "",
          "",
          "",
          "Total",
          chalan.total_qty_ctn.toString(),
          chalan.total_qty_pcs.toString(),
        ],
      ],
      theme: "grid",
      styles: { fontSize: 9 },
      headStyles: { fillColor: [66, 66, 66], fontStyle: "bold" },
      footStyles: { fillColor: [240, 240, 240], fontStyle: "bold" },
    });

    // Remarks
    yPos = (doc as any).lastAutoTable.finalY + 10;
    if (chalan.remarks) {
      doc.setFont("helvetica", "bold");
      doc.text("Remarks:", margin, yPos);
      doc.setFont("helvetica", "normal");
      doc.text(chalan.remarks, margin, yPos + 5);
      yPos += 15;
    }

    // Signatures
    yPos += 10;
    const sigWidth = (pageWidth - 2 * margin) / 5;
    const signatures = ["Receiver", "Driver", "SIC", "DIC", "HOD"];

    signatures.forEach((sig, idx) => {
      const xPos = margin + idx * sigWidth;
      doc.text("_____________", xPos, yPos);
      doc.text(sig, xPos, yPos + 5);
    });

    // Footer
    doc.setFontSize(8);
    doc.text(
      `Generated on ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()}`,
      pageWidth / 2,
      doc.internal.pageSize.getHeight() - 10,
      { align: "center" }
    );
  };

  const generatePDF = (copyType?: string) => {
    if (!chalan) return;

    const doc = new jsPDF("portrait", "mm", "a4");

    if (copyType) {
      // Generate single copy
      generateSingleCopy(doc, copyType, true);
      doc.save(`Chalan_${chalan.chalan_no}_${copyType.replace(/ /g, "_")}.pdf`);
    } else {
      // Generate all 4 copies in one PDF
      COPY_TYPES.forEach((type, index) => {
        generateSingleCopy(doc, type, index === 0);
      });
      doc.save(`Chalan_${chalan.chalan_no}_All_Copies.pdf`);
    }
  };

  const printChalan = (copyType?: string) => {
    if (!chalan) return;

    const doc = new jsPDF("portrait", "mm", "a4");

    if (copyType) {
      generateSingleCopy(doc, copyType, true);
    } else {
      COPY_TYPES.forEach((type, index) => {
        generateSingleCopy(doc, type, index === 0);
      });
    }

    // Open print dialog
    doc.autoPrint();
    window.open(doc.output("bloburl"), "_blank");
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="50vh">
        <CircularProgress />
      </Box>
    );
  }

  if (error || !chalan) {
    return (
      <Box p={3}>
        <Alert severity="error">{error || "Chalan not found"}</Alert>
        <Button startIcon={<ArrowBack />} onClick={() => router.back()} sx={{ mt: 2 }}>
          Back
        </Button>
      </Box>
    );
  }

  return (
    <Box p={{ xs: 2, md: 3 }}>
      {/* Header */}
      <Box display="flex" alignItems="center" mb={3}>
        <IconButton onClick={() => router.back()} sx={{ mr: 1 }}>
          <ArrowBack />
        </IconButton>
        <Typography variant="h5" fontWeight="bold" flex={1}>
          Delivery Chalan
        </Typography>
        <Chip label={chalan.status} color={chalan.status === "Delivered" ? "success" : "primary"} />
      </Box>

      {/* Chalan Info Card */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <Typography variant="body2" color="text.secondary">
                Chalan Number
              </Typography>
              <Typography variant="h6" fontWeight="bold">
                {chalan.chalan_no}
              </Typography>
            </Grid>
            <Grid item xs={12} md={6}>
              <Typography variant="body2" color="text.secondary">
                Date
              </Typography>
              <Typography variant="body1">
                {new Date(chalan.chalan_date).toLocaleDateString()}
              </Typography>
            </Grid>
            <Grid item xs={12} md={6}>
              <Typography variant="body2" color="text.secondary">
                Load Sheet
              </Typography>
              <Typography variant="body1">
                {chalan.load_sheet_id.load_sheet_number}
              </Typography>
            </Grid>
            <Grid item xs={12} md={6}>
              <Typography variant="body2" color="text.secondary">
                Distributor
              </Typography>
              <Typography variant="body1">{chalan.distributor_id.name}</Typography>
            </Grid>
            <Grid item xs={12} md={4}>
              <Typography variant="body2" color="text.secondary">
                Vehicle
              </Typography>
              <Typography variant="body1">{chalan.vehicle_no}</Typography>
            </Grid>
            <Grid item xs={12} md={4}>
              <Typography variant="body2" color="text.secondary">
                Driver
              </Typography>
              <Typography variant="body1">{chalan.driver_name}</Typography>
            </Grid>
            <Grid item xs={12} md={4}>
              <Typography variant="body2" color="text.secondary">
                Total Qty (CTN)
              </Typography>
              <Typography variant="body1" fontWeight="bold">
                {chalan.total_qty_ctn}
              </Typography>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* PDF Copies */}
      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Download PDF Copies
          </Typography>
          <Box sx={{ borderBottom: 1, borderColor: "divider", mb: 2 }}>
            <Tabs value={activeTab} onChange={(e, v) => setActiveTab(v)}>
              {COPY_TYPES.map((copyType, idx) => (
                <Tab key={idx} label={copyType} />
              ))}
            </Tabs>
          </Box>

          <Box p={2}>
            <Typography variant="h6" gutterBottom>
              Download All Copies (4 in 1 PDF)
            </Typography>
            <Box display="flex" gap={2} mt={2} mb={3}>
              <Button
                variant="contained"
                color="primary"
                size="large"
                startIcon={<Download />}
                onClick={() => generatePDF()}
              >
                Download All 4 Copies
              </Button>
              <Button
                variant="outlined"
                size="large"
                startIcon={<Print />}
                onClick={() => printChalan()}
              >
                Print All Copies
              </Button>
            </Box>
          </Box>

          <Divider sx={{ my: 2 }} />

          <Box p={2}>
            <Typography variant="body1" gutterBottom>
              Or download individual copy: <strong>{COPY_TYPES[activeTab]}</strong>
            </Typography>
            <Box display="flex" gap={2} mt={2} flexWrap="wrap">
              {COPY_TYPES.map((copyType) => (
                <Button
                  key={copyType}
                  size="small"
                  variant="outlined"
                  onClick={() => generatePDF(copyType)}
                >
                  {copyType}
                </Button>
              ))}
            </Box>
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
}
