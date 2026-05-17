"use client";

import React, { useState } from "react";
import Papa from "papaparse";
import {
    Button,
    CircularProgress,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    IconButton,
    Stack,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    TextField,
    Typography,
    Alert,
    Paper,
} from "@mui/material";
import { Delete } from "@mui/icons-material";
import api from "@/lib/api";

// ─── Types ────────────────────────────────────────────────────────────────────

type RowStatus = "pending" | "ok" | "warning" | "error";

interface EditableRow {
    id: string;
    month: string;
    erp_distributor_id: string;
    erp_so_id: string;
    erp_product_id: string;
    target_qty_pcs: string;
    // After client validation:
    clientError?: string;
    // After POST /validate:
    distributor_id?: string;
    so_id?: string | null;
    product_id?: string;
    distributor_name?: string;
    so_name?: string;
    product_sku?: string;
    existing_qty?: number;
    dbError?: string;
    dbWarnings?: string[];
    status: RowStatus;
    errorMessage?: string;
}

type Phase =
    | "idle"
    | "preview"
    | "validating"
    | "validated"
    | "uploading"
    | "done";

interface UploadSummary {
    saved: number;
    failed: number;
}

interface CsvUploadDialogProps {
    open: boolean;
    defaultMonth: string;
    onClose: () => void;
    onSuccess: () => void;
}

// ─── Client validation ────────────────────────────────────────────────────────

function applyClientValidation(
    rows: EditableRow[],
    defaultMonth: string
): EditableRow[] {
    const seen = new Set<string>();
    return rows.map((row) => {
        if (!row.erp_distributor_id.trim()) {
            return { ...row, status: "error", clientError: "Distributor ID required" };
        }
        if (!row.erp_product_id.trim()) {
            return { ...row, status: "error", clientError: "Product ID required" };
        }
        const qty = Number(row.target_qty_pcs);
        if (!row.target_qty_pcs || isNaN(qty) || qty <= 0) {
            return {
                ...row,
                status: "error",
                clientError: "Valid quantity required (> 0)",
            };
        }
        if (!/^\d{4}-\d{2}$/.test(row.month)) {
            return { ...row, status: "error", clientError: "Month must be YYYY-MM" };
        }
        const dedupKey = `${row.month}|${row.erp_distributor_id}|${row.erp_so_id}|${row.erp_product_id}`;
        if (seen.has(dedupKey)) {
            return { ...row, status: "error", clientError: "Duplicate row in file" };
        }
        seen.add(dedupKey);
        if (defaultMonth && row.month !== defaultMonth) {
            return {
                ...row,
                status: "warning",
                clientError: `Month ${row.month} differs from selected ${defaultMonth}`,
            };
        }
        return { ...row, status: "ok", clientError: undefined, errorMessage: undefined };
    });
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function CsvUploadDialog({
    open,
    defaultMonth,
    onClose,
    onSuccess,
}: CsvUploadDialogProps) {
    const [rows, setRows] = useState<EditableRow[]>([]);
    const [phase, setPhase] = useState<Phase>("idle");
    const [uploadSummary, setUploadSummary] = useState<UploadSummary | null>(null);

    // ── File parsing ──────────────────────────────────────────────────────────

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        Papa.parse<Record<string, string>>(file, {
            header: true,
            skipEmptyLines: true,
            complete: (results) => {
                const parsed: EditableRow[] = results.data.map((r) => ({
                    id: crypto.randomUUID(),
                    month: r.month?.trim() || defaultMonth,
                    erp_distributor_id: r.distributor_id?.trim() || "",
                    erp_so_id: r.so_id?.trim() || "",
                    erp_product_id: r.product_id?.trim() || "",
                    target_qty_pcs: r.target_qty_pcs?.trim() || "",
                    status: "pending" as RowStatus,
                }));
                setRows(applyClientValidation(parsed, defaultMonth));
                setPhase("preview");
            },
        });
        // Reset input so the same file can be re-selected
        e.target.value = "";
    };

    // ── Inline cell edit ──────────────────────────────────────────────────────

    const updateCell = (
        id: string,
        field: keyof EditableRow,
        value: string
    ) => {
        setRows((prev) => {
            const updated = prev.map((r) =>
                r.id === id ? { ...r, [field]: value } : r
            );
            const revalidated = applyClientValidation(updated, defaultMonth);
            // Reset resolved fields if editing after validation
            if (phase === "validated") {
                setPhase("preview");
            }
            return revalidated;
        });
    };

    // ── Validate ──────────────────────────────────────────────────────────────

    const handleValidate = async () => {
        setPhase("validating");
        const sendable = rows.filter((r) => r.status !== "error");
        try {
            const payload = sendable.map((r) => ({
                month: r.month,
                erp_distributor_id: r.erp_distributor_id,
                erp_so_id: r.erp_so_id || undefined,
                erp_product_id: r.erp_product_id,
                target_qty_pcs: Number(r.target_qty_pcs),
            }));

            const res = await api.post("/monthly-targets/validate", { rows: payload });
            const results: any[] = res.data.data.results;

            const updatedRows = [...rows];
            results.forEach((result, i) => {
                const origIdx = rows.indexOf(sendable[i]);
                const row = { ...updatedRows[origIdx] };
                if (!result.ok) {
                    row.status = "error";
                    row.errorMessage = result.error;
                    row.dbError = result.error;
                } else {
                    row.distributor_id = result.distributor_id;
                    row.so_id = result.so_id ?? null;
                    row.product_id = result.product_id;
                    row.distributor_name = result.distributor_name;
                    row.so_name = result.so_name;
                    row.product_sku = result.product_sku;
                    row.dbWarnings = result.warnings;
                    row.existing_qty = result.existing_qty;
                    row.status = result.warnings?.length ? "warning" : "ok";
                    row.errorMessage = result.warnings?.join("; ");
                }
                updatedRows[origIdx] = row;
            });
            setRows(updatedRows);
            setPhase("validated");
        } catch {
            setPhase("preview");
        }
    };

    // ── Upload ────────────────────────────────────────────────────────────────

    const handleUpload = async () => {
        setPhase("uploading");
        const uploadable = rows.filter(
            (r) => r.status === "ok" || r.status === "warning"
        );
        try {
            const payload = uploadable.map((r) => ({
                month: r.month,
                distributor_id: r.distributor_id!,
                so_id: r.so_id || null,
                product_id: r.product_id!,
                target_qty_pcs: Number(r.target_qty_pcs),
            }));

            const res = await api.post("/monthly-targets/upload", { rows: payload });
            const { results, saved, failed } = res.data.data;

            if (failed > 0) {
                const updatedRows = [...rows];
                results.forEach((result: any, i: number) => {
                    if (!result.ok) {
                        const idx = rows.indexOf(uploadable[i]);
                        updatedRows[idx] = {
                            ...updatedRows[idx],
                            status: "error",
                            errorMessage: result.error,
                        };
                    }
                });
                setRows(updatedRows);
            }
            setUploadSummary({ saved, failed });
            setPhase("done");
            if (failed === 0) setTimeout(onSuccess, 1500);
        } catch {
            setPhase("validated");
        }
    };

    // ── Reset on close ────────────────────────────────────────────────────────

    const handleClose = () => {
        setRows([]);
        setPhase("idle");
        setUploadSummary(null);
        onClose();
    };

    // ── Helpers ───────────────────────────────────────────────────────────────

    const hasClientErrors = rows.some((r) => r.status === "error");
    const allErrors = rows.length > 0 && rows.every((r) => r.status === "error");

    // ── Render ────────────────────────────────────────────────────────────────

    return (
        <Dialog open={open} onClose={handleClose} maxWidth="xl" fullWidth>
            <DialogTitle>
                Upload Monthly Targets CSV
                <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                    Columns: month, distributor_id, so_id (optional), product_id, target_qty_pcs
                </Typography>
            </DialogTitle>

            <DialogContent dividers>
                {/* File picker */}
                {phase === "idle" && (
                    <Stack spacing={2} alignItems="center" sx={{ py: 4 }}>
                        <Button variant="contained" component="label">
                            Choose CSV File
                            <input
                                type="file"
                                accept=".csv"
                                hidden
                                onChange={handleFileChange}
                            />
                        </Button>
                        <Typography variant="body2" color="text.secondary">
                            Select a CSV file with headers: month, distributor_id, so_id, product_id, target_qty_pcs
                        </Typography>
                    </Stack>
                )}

                {/* Replace file button when rows loaded */}
                {phase !== "idle" && phase !== "done" && (
                    <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 2 }}>
                        <Button variant="outlined" size="small" component="label">
                            Replace File
                            <input
                                type="file"
                                accept=".csv"
                                hidden
                                onChange={handleFileChange}
                            />
                        </Button>
                        <Typography variant="body2" color="text.secondary">
                            {rows.length} row{rows.length !== 1 ? "s" : ""} loaded
                            {hasClientErrors && (
                                <Typography component="span" color="error.main" variant="body2">
                                    {" "}· {rows.filter((r) => r.status === "error").length} error(s)
                                </Typography>
                            )}
                        </Typography>
                    </Stack>
                )}

                {/* Done summary */}
                {phase === "done" && uploadSummary && (
                    <Alert
                        severity={uploadSummary.failed > 0 ? "warning" : "success"}
                        sx={{ mb: 2 }}
                    >
                        Saved: {uploadSummary.saved} &nbsp;·&nbsp; Failed: {uploadSummary.failed}
                    </Alert>
                )}

                {/* Table */}
                {rows.length > 0 && (
                    <TableContainer component={Paper} variant="outlined">
                        <Table size="small" stickyHeader>
                            <TableHead>
                                <TableRow>
                                    <TableCell>#</TableCell>
                                    <TableCell>Month</TableCell>
                                    <TableCell>Distributor ID</TableCell>
                                    <TableCell>SO ID</TableCell>
                                    <TableCell>Product ID</TableCell>
                                    <TableCell>Qty (PCS)</TableCell>
                                    <TableCell>Resolved Name</TableCell>
                                    <TableCell>Resolved SKU</TableCell>
                                    <TableCell>Prev Qty</TableCell>
                                    <TableCell>Error / Warning</TableCell>
                                    <TableCell />
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {rows.map((row, idx) => (
                                    <TableRow
                                        key={row.id}
                                        sx={{
                                            backgroundColor:
                                                row.status === "error"
                                                    ? "rgba(211,47,47,0.10)"
                                                    : row.status === "warning"
                                                        ? "rgba(237,108,2,0.10)"
                                                        : "inherit",
                                        }}
                                    >
                                        <TableCell>{idx + 1}</TableCell>

                                        {/* Editable: month */}
                                        <TableCell sx={{ minWidth: 120 }}>
                                            <TextField
                                                variant="standard"
                                                value={row.month}
                                                onChange={(e) => updateCell(row.id, "month", e.target.value)}
                                                inputProps={{ style: { fontSize: 13 } }}
                                                disabled={phase === "uploading" || phase === "done"}
                                            />
                                        </TableCell>

                                        {/* Editable: erp_distributor_id */}
                                        <TableCell sx={{ minWidth: 110 }}>
                                            <TextField
                                                variant="standard"
                                                value={row.erp_distributor_id}
                                                onChange={(e) =>
                                                    updateCell(row.id, "erp_distributor_id", e.target.value)
                                                }
                                                inputProps={{ style: { fontSize: 13 } }}
                                                disabled={phase === "uploading" || phase === "done"}
                                            />
                                        </TableCell>

                                        {/* Editable: erp_so_id */}
                                        <TableCell sx={{ minWidth: 100 }}>
                                            <TextField
                                                variant="standard"
                                                value={row.erp_so_id}
                                                onChange={(e) =>
                                                    updateCell(row.id, "erp_so_id", e.target.value)
                                                }
                                                inputProps={{ style: { fontSize: 13 } }}
                                                disabled={phase === "uploading" || phase === "done"}
                                                placeholder="optional"
                                            />
                                        </TableCell>

                                        {/* Editable: erp_product_id */}
                                        <TableCell sx={{ minWidth: 100 }}>
                                            <TextField
                                                variant="standard"
                                                value={row.erp_product_id}
                                                onChange={(e) =>
                                                    updateCell(row.id, "erp_product_id", e.target.value)
                                                }
                                                inputProps={{ style: { fontSize: 13 } }}
                                                disabled={phase === "uploading" || phase === "done"}
                                            />
                                        </TableCell>

                                        {/* Editable: target_qty_pcs */}
                                        <TableCell sx={{ minWidth: 90 }}>
                                            <TextField
                                                variant="standard"
                                                value={row.target_qty_pcs}
                                                onChange={(e) =>
                                                    updateCell(row.id, "target_qty_pcs", e.target.value)
                                                }
                                                inputProps={{ style: { fontSize: 13 }, inputMode: "numeric" }}
                                                disabled={phase === "uploading" || phase === "done"}
                                            />
                                        </TableCell>

                                        {/* Resolved name */}
                                        <TableCell>
                                            {row.distributor_name ? (
                                                <Typography variant="caption">
                                                    {row.distributor_name}
                                                    {row.so_name ? ` / ${row.so_name}` : ""}
                                                </Typography>
                                            ) : null}
                                        </TableCell>

                                        {/* Resolved SKU */}
                                        <TableCell>
                                            {row.product_sku ? (
                                                <code style={{ fontSize: 12 }}>{row.product_sku}</code>
                                            ) : null}
                                        </TableCell>

                                        {/* Prev qty */}
                                        <TableCell>
                                            {row.existing_qty != null ? (
                                                <Typography variant="caption" color="warning.main">
                                                    {row.existing_qty.toLocaleString()}
                                                </Typography>
                                            ) : null}
                                        </TableCell>

                                        {/* Error / warning */}
                                        <TableCell sx={{ maxWidth: 220 }}>
                                            {(row.clientError || row.errorMessage) && (
                                                <Typography
                                                    variant="caption"
                                                    color={
                                                        row.status === "error" ? "error.main" : "warning.main"
                                                    }
                                                >
                                                    {row.clientError || row.errorMessage}
                                                </Typography>
                                            )}
                                        </TableCell>

                                        {/* Delete */}
                                        <TableCell>
                                            {phase !== "uploading" && phase !== "done" && (
                                                <IconButton
                                                    size="small"
                                                    onClick={() =>
                                                        setRows(rows.filter((r) => r.id !== row.id))
                                                    }
                                                >
                                                    <Delete fontSize="small" />
                                                </IconButton>
                                            )}
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </TableContainer>
                )}
            </DialogContent>

            <DialogActions sx={{ px: 3, py: 2 }}>
                {/* Phase: preview */}
                {phase === "preview" && (
                    <>
                        <Button onClick={handleClose}>Cancel</Button>
                        <Button
                            variant="contained"
                            onClick={handleValidate}
                            disabled={hasClientErrors || rows.length === 0}
                        >
                            Validate
                        </Button>
                    </>
                )}

                {/* Phase: validating */}
                {phase === "validating" && (
                    <Button variant="contained" disabled startIcon={<CircularProgress size={18} />}>
                        Validating…
                    </Button>
                )}

                {/* Phase: validated */}
                {phase === "validated" && (
                    <>
                        <Button onClick={handleClose}>Cancel</Button>
                        <Button
                            onClick={() => {
                                setPhase("preview");
                                setRows(applyClientValidation(rows, defaultMonth));
                            }}
                        >
                            Re-validate
                        </Button>
                        <Button
                            variant="contained"
                            color="success"
                            onClick={handleUpload}
                            disabled={allErrors}
                        >
                            Upload
                        </Button>
                    </>
                )}

                {/* Phase: uploading */}
                {phase === "uploading" && (
                    <Button variant="contained" disabled startIcon={<CircularProgress size={18} />}>
                        Uploading…
                    </Button>
                )}

                {/* Phase: done */}
                {phase === "done" && (
                    <Button variant="contained" onClick={handleClose}>
                        Close
                    </Button>
                )}

                {/* Phase: idle */}
                {phase === "idle" && (
                    <Button onClick={handleClose}>Cancel</Button>
                )}
            </DialogActions>
        </Dialog>
    );
}
