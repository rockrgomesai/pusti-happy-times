"use client";

import React, { useCallback, useEffect, useState } from "react";
import {
    Button,
    CircularProgress,
    Container,
    Paper,
    Stack,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TablePagination,
    TableRow,
    TextField,
    Typography,
} from "@mui/material";
import { CloudUpload, Download } from "@mui/icons-material";
import api from "@/lib/api";
import CsvUploadDialog from "@/components/monthlyTargets/CsvUploadDialog";

// ─── Types ────────────────────────────────────────────────────────────────────

interface TargetRecord {
    _id: string;
    month: string;
    distributor_id: { _id: string; name: string; erp_id: number };
    so_id: { _id: string; name: string; employee_id: string } | null;
    product_id: { _id: string; sku: string; bangla_name: string; ctn_pcs: number };
    target_qty_pcs: number;
    upload_date: string;
    last_update_date: string;
    prev_qty_b4_last_upd: number | null;
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function MonthlyTargetsPage() {
    const [selectedMonth, setSelectedMonth] = useState<string>("");
    const [uploadOpen, setUploadOpen] = useState(false);
    const [records, setRecords] = useState<TargetRecord[]>([]);
    const [loading, setLoading] = useState(false);
    const [page, setPage] = useState(0);
    const [total, setTotal] = useState(0);
    const rowsPerPage = 50;

    // ── Data fetch ──────────────────────────────────────────────────────────────

    const fetchRecords = useCallback(async () => {
        if (!selectedMonth) return;
        setLoading(true);
        try {
            const res = await api.get("/monthly-targets", {
                params: { month: selectedMonth, page: page + 1, limit: rowsPerPage },
            });
            setRecords(res.data.data.records);
            setTotal(res.data.data.total);
        } finally {
            setLoading(false);
        }
    }, [selectedMonth, page]);

    useEffect(() => {
        fetchRecords();
    }, [fetchRecords]);

    // ── Template download ───────────────────────────────────────────────────────

    const downloadTemplate = () => {
        const csv = [
            "month,distributor_id,so_id,product_id,target_qty_pcs",
            `${selectedMonth || "2026-05"},1001,SO-001,2045,1200`,
            `${selectedMonth || "2026-05"},1002,,3010,800`,
        ].join("\n");
        const blob = new Blob([csv], { type: "text/csv" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "monthly_targets_template.csv";
        a.click();
        URL.revokeObjectURL(url);
    };

    // ── Render ──────────────────────────────────────────────────────────────────

    return (
        <Container maxWidth="xl" sx={{ py: 3 }}>
            <Typography variant="h5" fontWeight={600} gutterBottom>
                Set Monthly Targets
            </Typography>

            <Stack direction="row" spacing={2} alignItems="center" sx={{ mb: 3 }}>
                <TextField
                    label="Month"
                    type="month"
                    value={selectedMonth}
                    onChange={(e) => {
                        setSelectedMonth(e.target.value);
                        setPage(0);
                    }}
                    InputLabelProps={{ shrink: true }}
                    sx={{ width: 200 }}
                />
                <Button
                    variant="contained"
                    startIcon={<CloudUpload />}
                    onClick={() => setUploadOpen(true)}
                >
                    Upload CSV
                </Button>
                <Button
                    variant="outlined"
                    startIcon={<Download />}
                    onClick={downloadTemplate}
                >
                    Download Template
                </Button>
                {loading && <CircularProgress size={24} />}
            </Stack>

            <TableContainer component={Paper}>
                <Table size="small">
                    <TableHead>
                        <TableRow sx={{ backgroundColor: "primary.main" }}>
                            <TableCell sx={{ color: "white" }}>Month</TableCell>
                            <TableCell sx={{ color: "white" }}>Distributor</TableCell>
                            <TableCell sx={{ color: "white" }}>SO</TableCell>
                            <TableCell sx={{ color: "white" }}>SKU</TableCell>
                            <TableCell sx={{ color: "white" }}>Product</TableCell>
                            <TableCell align="right" sx={{ color: "white" }}>
                                Target (PCS)
                            </TableCell>
                            <TableCell align="right" sx={{ color: "white" }}>
                                Target (CTN)
                            </TableCell>
                            <TableCell sx={{ color: "white" }}>Prev Qty</TableCell>
                            <TableCell sx={{ color: "white" }}>Last Updated</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {records.map((row) => (
                            <TableRow key={row._id} hover>
                                <TableCell>{row.month}</TableCell>
                                <TableCell>
                                    {row.distributor_id?.name}
                                    <Typography
                                        variant="caption"
                                        color="text.secondary"
                                        display="block"
                                    >
                                        ERP: {row.distributor_id?.erp_id}
                                    </Typography>
                                </TableCell>
                                <TableCell>
                                    {row.so_id ? (
                                        `${row.so_id.name} (${row.so_id.employee_id})`
                                    ) : (
                                        <Typography color="text.secondary" variant="body2">
                                            —
                                        </Typography>
                                    )}
                                </TableCell>
                                <TableCell>
                                    <code>{row.product_id?.sku}</code>
                                </TableCell>
                                <TableCell>{row.product_id?.bangla_name}</TableCell>
                                <TableCell align="right">
                                    {row.target_qty_pcs.toLocaleString()}
                                </TableCell>
                                <TableCell align="right">
                                    {row.product_id?.ctn_pcs
                                        ? (row.target_qty_pcs / row.product_id.ctn_pcs).toFixed(2)
                                        : "—"}
                                </TableCell>
                                <TableCell>
                                    {row.prev_qty_b4_last_upd != null
                                        ? row.prev_qty_b4_last_upd.toLocaleString()
                                        : "—"}
                                </TableCell>
                                <TableCell>
                                    {row.last_update_date
                                        ? new Date(row.last_update_date).toLocaleDateString()
                                        : "—"}
                                </TableCell>
                            </TableRow>
                        ))}
                        {!loading && records.length === 0 && (
                            <TableRow>
                                <TableCell
                                    colSpan={9}
                                    align="center"
                                    sx={{ py: 4, color: "text.secondary" }}
                                >
                                    {selectedMonth
                                        ? "No targets found for this month"
                                        : "Select a month to view targets"}
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
                <TablePagination
                    component="div"
                    count={total}
                    page={page}
                    rowsPerPage={rowsPerPage}
                    rowsPerPageOptions={[50]}
                    onPageChange={(_, p) => setPage(p)}
                />
            </TableContainer>

            <CsvUploadDialog
                open={uploadOpen}
                defaultMonth={selectedMonth}
                onClose={() => setUploadOpen(false)}
                onSuccess={() => {
                    setUploadOpen(false);
                    fetchRecords();
                }}
            />
        </Container>
    );
}
