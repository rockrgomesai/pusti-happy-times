"use client";

/**
 * Secondary Orders — unified web page
 *
 * Shows all orders the current user is authorized to see (scoping is
 * enforced on the backend). Supports:
 *   • Filters: status, date range, free-text order number search
 *   • Area Managers / Admins: Approve / Reject actions on Submitted orders
 *   • Distributor users / Admins: Mark Delivered on Approved orders
 *   • Drill-in detail dialog with items, totals, approval trail
 */

import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
    Box,
    Button,
    Chip,
    CircularProgress,
    Container,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    Divider,
    FormControl,
    Grid as Grid2,
    IconButton,
    InputLabel,
    MenuItem,
    Paper,
    Select,
    Stack,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TablePagination,
    TableRow,
    TextField,
    Tooltip,
    Typography,
    Alert,
} from "@mui/material";
import {
    Visibility,
    CheckCircle,
    Cancel,
    LocalShipping,
    Refresh,
    Search,
} from "@mui/icons-material";
import api from "@/lib/api";
import { formatDateForDisplay } from "@/lib/dateUtils";
import { useAuth } from "@/contexts/AuthContext";

type OrderStatus = "Submitted" | "Approved" | "Cancelled" | "Delivered";

interface OrderRow {
    _id: string;
    order_number: string;
    order_date: string;
    order_status: OrderStatus;
    subtotal?: number;
    total_amount: number;
    discount_amount?: number;
    delivery_chalan_no?: string;
    entry_mode?: "online" | "offline" | "manual";
    outlet_id?: { _id: string; name: string; code?: string } | string;
    distributor_id?: { _id: string; name: string; code?: string } | string;
    dsr_id?: { _id: string; name: string; employee_id?: string } | string;
}

interface OrderDetail extends OrderRow {
    items: Array<{
        product_id: { _id: string; sku: string; english_name: string; bangla_name?: string; image_url?: string } | string;
        sku: string;
        quantity: number;
        unit_price: number;
        subtotal: number;
    }>;
    route_id?: { name: string; code?: string } | string;
    so_notes?: string;
    approval_notes?: string;
    cancellation_reason?: string;
    approved_by?: { name: string } | string;
    approved_at?: string;
    cancelled_by?: { name: string } | string;
    cancelled_at?: string;
    delivered_by?: { name: string } | string;
    delivered_at?: string;
}

const STATUSES: (OrderStatus | "")[] = ["", "Submitted", "Approved", "Delivered", "Cancelled"];

const ADMIN_ROLES = ["SuperAdmin", "Sales Admin", "Office Admin"];
const AREA_MGR_ROLES = ["ASM", "RSM", "ZSM", "HOS"];
const DISTRIBUTOR_ROLES = ["Distributor", "DSR"];

function statusColor(s: OrderStatus): "default" | "warning" | "info" | "success" | "error" {
    switch (s) {
        case "Submitted": return "warning";
        case "Approved": return "info";
        case "Delivered": return "success";
        case "Cancelled": return "error";
        default: return "default";
    }
}

function nameOf(v: any): string {
    if (!v) return "-";
    if (typeof v === "string") return v;
    return v.name || v.order_number || v.code || "-";
}

export default function SecondaryOrdersPage() {
    const { user } = useAuth();
    const role = user?.role?.role || "";
    const canApprove = ADMIN_ROLES.includes(role) || AREA_MGR_ROLES.includes(role);
    const canDeliver = ADMIN_ROLES.includes(role) || DISTRIBUTOR_ROLES.includes(role);

    const [rows, setRows] = useState<OrderRow[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [total, setTotal] = useState(0);
    const [page, setPage] = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(20);
    const [status, setStatus] = useState<OrderStatus | "">("");
    const [q, setQ] = useState("");
    const [dateFrom, setDateFrom] = useState("");
    const [dateTo, setDateTo] = useState("");

    // Detail / action dialogs
    const [detail, setDetail] = useState<OrderDetail | null>(null);
    const [detailOpen, setDetailOpen] = useState(false);
    const [actionOpen, setActionOpen] = useState<null | "approve" | "reject" | "deliver">(null);
    const [actionNotes, setActionNotes] = useState("");
    const [actionBusy, setActionBusy] = useState(false);

    const fetchRows = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const params: any = { page: page + 1, limit: rowsPerPage };
            if (status) params.status = status;
            if (q) params.q = q;
            if (dateFrom) params.date_from = dateFrom;
            if (dateTo) params.date_to = dateTo;
            const res = await api.get("/secondary-orders", { params });
            if (res.data?.success) {
                setRows(res.data.data || []);
                setTotal(res.data.pagination?.total || 0);
            } else {
                setError(res.data?.message || "Failed to load orders");
            }
        } catch (e: any) {
            setError(e?.response?.data?.message || e.message || "Failed to load orders");
        } finally {
            setLoading(false);
        }
    }, [page, rowsPerPage, status, q, dateFrom, dateTo]);

    useEffect(() => {
        fetchRows();
    }, [fetchRows]);

    const openDetail = useCallback(async (id: string) => {
        setDetailOpen(true);
        setDetail(null);
        try {
            const res = await api.get(`/secondary-orders/${id}`);
            if (res.data?.success) setDetail(res.data.data);
        } catch (e: any) {
            setError(e?.response?.data?.message || e.message || "Failed to load order");
            setDetailOpen(false);
        }
    }, []);

    const submitAction = useCallback(async () => {
        if (!detail || !actionOpen) return;
        setActionBusy(true);
        try {
            if (actionOpen === "approve") {
                await api.post(`/secondary-orders/${detail._id}/approve`, { notes: actionNotes || undefined });
            } else if (actionOpen === "reject") {
                if (!actionNotes.trim()) {
                    setError("Rejection reason is required");
                    setActionBusy(false);
                    return;
                }
                await api.post(`/secondary-orders/${detail._id}/reject`, { reason: actionNotes });
            } else if (actionOpen === "deliver") {
                await api.post(`/secondary-orders/${detail._id}/deliver`, {
                    delivery_chalan_no: actionNotes || undefined,
                });
            }
            setActionOpen(null);
            setActionNotes("");
            setDetailOpen(false);
            await fetchRows();
        } catch (e: any) {
            setError(e?.response?.data?.message || e.message || "Action failed");
        } finally {
            setActionBusy(false);
        }
    }, [actionOpen, actionNotes, detail, fetchRows]);

    const detailActions = useMemo(() => {
        if (!detail) return null;
        const buttons: React.ReactNode[] = [];
        if (canApprove && detail.order_status === "Submitted") {
            buttons.push(
                <Button key="approve" color="success" variant="contained" startIcon={<CheckCircle />} onClick={() => { setActionOpen("approve"); setActionNotes(""); }}>
                    Approve
                </Button>,
                <Button key="reject" color="error" variant="outlined" startIcon={<Cancel />} onClick={() => { setActionOpen("reject"); setActionNotes(""); }}>
                    Reject
                </Button>
            );
        }
        if (canApprove && detail.order_status === "Approved") {
            buttons.push(
                <Button key="reject2" color="error" variant="outlined" startIcon={<Cancel />} onClick={() => { setActionOpen("reject"); setActionNotes(""); }}>
                    Cancel Order
                </Button>
            );
        }
        if (canDeliver && detail.order_status === "Approved") {
            buttons.push(
                <Button key="deliver" color="primary" variant="contained" startIcon={<LocalShipping />} onClick={() => { setActionOpen("deliver"); setActionNotes(""); }}>
                    Mark Delivered
                </Button>
            );
        }
        return buttons;
    }, [detail, canApprove, canDeliver]);

    return (
        <Container maxWidth="xl" sx={{ py: 3 }}>
            <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
                <Typography variant="h5" fontWeight={700}>Secondary Orders</Typography>
                <Stack direction="row" spacing={1}>
                    <Chip size="small" label={`Role: ${role || "—"}`} />
                    <Tooltip title="Refresh">
                        <IconButton onClick={fetchRows}><Refresh /></IconButton>
                    </Tooltip>
                </Stack>
            </Stack>

            {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>{error}</Alert>}

            {/* Filters */}
            <Paper sx={{ p: 2, mb: 2 }}>
                <Grid2 container spacing={2} alignItems="center">
                    <Grid2 size={{ xs: 12, sm: 3 }}>
                        <TextField
                            size="small" fullWidth label="Search order #"
                            value={q} onChange={(e) => setQ(e.target.value)}
                            InputProps={{ startAdornment: <Search fontSize="small" style={{ marginRight: 6, opacity: 0.6 }} /> }}
                        />
                    </Grid2>
                    <Grid2 size={{ xs: 6, sm: 2 }}>
                        <FormControl size="small" fullWidth>
                            <InputLabel>Status</InputLabel>
                            <Select label="Status" value={status} onChange={(e) => setStatus(e.target.value as OrderStatus | "")}>
                                {STATUSES.map((s) => (
                                    <MenuItem key={s || "all"} value={s}>{s || "All"}</MenuItem>
                                ))}
                            </Select>
                        </FormControl>
                    </Grid2>
                    <Grid2 size={{ xs: 6, sm: 2 }}>
                        <TextField size="small" fullWidth label="From" type="date" InputLabelProps={{ shrink: true }} value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
                    </Grid2>
                    <Grid2 size={{ xs: 6, sm: 2 }}>
                        <TextField size="small" fullWidth label="To" type="date" InputLabelProps={{ shrink: true }} value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
                    </Grid2>
                    <Grid2 size={{ xs: 6, sm: 3 }}>
                        <Stack direction="row" spacing={1}>
                            <Button variant="contained" onClick={() => { setPage(0); fetchRows(); }}>Apply</Button>
                            <Button variant="text" onClick={() => { setQ(""); setStatus(""); setDateFrom(""); setDateTo(""); setPage(0); }}>Clear</Button>
                        </Stack>
                    </Grid2>
                </Grid2>
            </Paper>

            {/* Table */}
            <Paper>
                <TableContainer>
                    <Table size="small">
                        <TableHead>
                            <TableRow>
                                <TableCell>Order #</TableCell>
                                <TableCell>Date</TableCell>
                                <TableCell>Outlet</TableCell>
                                <TableCell>Distributor</TableCell>
                                <TableCell>SO / DSR</TableCell>
                                <TableCell align="right">Total (৳)</TableCell>
                                <TableCell>Status</TableCell>
                                <TableCell>Entry</TableCell>
                                <TableCell align="center">View</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {loading ? (
                                <TableRow><TableCell colSpan={9} align="center"><CircularProgress size={28} /></TableCell></TableRow>
                            ) : rows.length === 0 ? (
                                <TableRow><TableCell colSpan={9} align="center">No orders found.</TableCell></TableRow>
                            ) : rows.map((r) => (
                                <TableRow key={r._id} hover>
                                    <TableCell><b>{r.order_number}</b></TableCell>
                                    <TableCell>{formatDateForDisplay(r.order_date)}</TableCell>
                                    <TableCell>{nameOf(r.outlet_id)}</TableCell>
                                    <TableCell>{nameOf(r.distributor_id)}</TableCell>
                                    <TableCell>{nameOf(r.dsr_id)}</TableCell>
                                    <TableCell align="right">{Number(r.total_amount || 0).toFixed(2)}</TableCell>
                                    <TableCell><Chip size="small" label={r.order_status} color={statusColor(r.order_status)} /></TableCell>
                                    <TableCell>
                                        {r.entry_mode === "offline" || r.entry_mode === "manual"
                                            ? <Chip size="small" color="warning" variant="outlined" label={r.entry_mode} />
                                            : <Chip size="small" variant="outlined" label={r.entry_mode || "online"} />}
                                    </TableCell>
                                    <TableCell align="center">
                                        <IconButton size="small" onClick={() => openDetail(r._id)}><Visibility fontSize="small" /></IconButton>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </TableContainer>
                <TablePagination
                    component="div"
                    count={total}
                    page={page}
                    onPageChange={(_, p) => setPage(p)}
                    rowsPerPage={rowsPerPage}
                    onRowsPerPageChange={(e) => { setRowsPerPage(parseInt(e.target.value, 10)); setPage(0); }}
                    rowsPerPageOptions={[10, 20, 50, 100]}
                />
            </Paper>

            {/* Detail dialog */}
            <Dialog open={detailOpen} onClose={() => setDetailOpen(false)} maxWidth="md" fullWidth>
                <DialogTitle>
                    {detail ? (
                        <Stack direction="row" alignItems="center" spacing={1}>
                            <span>Order {detail.order_number}</span>
                            <Chip size="small" label={detail.order_status} color={statusColor(detail.order_status)} />
                            {detail.entry_mode && detail.entry_mode !== "online" && (
                                <Chip size="small" color="warning" variant="outlined" label={detail.entry_mode} />
                            )}
                        </Stack>
                    ) : "Loading…"}
                </DialogTitle>
                <DialogContent dividers>
                    {!detail ? (
                        <Box sx={{ textAlign: "center", py: 4 }}><CircularProgress /></Box>
                    ) : (
                        <Stack spacing={2}>
                            <Grid2 container spacing={2}>
                                <Grid2 size={{ xs: 12, sm: 6 }}>
                                    <Typography variant="caption" color="text.secondary">Outlet</Typography>
                                    <Typography>{nameOf(detail.outlet_id)}</Typography>
                                </Grid2>
                                <Grid2 size={{ xs: 12, sm: 6 }}>
                                    <Typography variant="caption" color="text.secondary">Distributor</Typography>
                                    <Typography>{nameOf(detail.distributor_id)}</Typography>
                                </Grid2>
                                <Grid2 size={{ xs: 12, sm: 6 }}>
                                    <Typography variant="caption" color="text.secondary">SO / DSR</Typography>
                                    <Typography>{nameOf(detail.dsr_id)}</Typography>
                                </Grid2>
                                <Grid2 size={{ xs: 12, sm: 6 }}>
                                    <Typography variant="caption" color="text.secondary">Order Date</Typography>
                                    <Typography>{formatDateForDisplay(detail.order_date)}</Typography>
                                </Grid2>
                                {detail.so_notes && (
                                    <Grid2 size={{ xs: 12 }}>
                                        <Typography variant="caption" color="text.secondary">SO Notes</Typography>
                                        <Typography>{detail.so_notes}</Typography>
                                    </Grid2>
                                )}
                            </Grid2>

                            <Divider />

                            <TableContainer>
                                <Table size="small">
                                    <TableHead>
                                        <TableRow>
                                            <TableCell>SKU</TableCell>
                                            <TableCell>Product</TableCell>
                                            <TableCell align="right">Qty</TableCell>
                                            <TableCell align="right">Unit Price</TableCell>
                                            <TableCell align="right">Subtotal</TableCell>
                                        </TableRow>
                                    </TableHead>
                                    <TableBody>
                                        {detail.items.map((it, idx) => {
                                            const prod = typeof it.product_id === "object" ? it.product_id : null;
                                            return (
                                                <TableRow key={idx}>
                                                    <TableCell>{it.sku}</TableCell>
                                                    <TableCell>{prod?.english_name || prod?.bangla_name || "-"}</TableCell>
                                                    <TableCell align="right">{it.quantity}</TableCell>
                                                    <TableCell align="right">{Number(it.unit_price).toFixed(2)}</TableCell>
                                                    <TableCell align="right">{Number(it.subtotal).toFixed(2)}</TableCell>
                                                </TableRow>
                                            );
                                        })}
                                        <TableRow>
                                            <TableCell colSpan={4} align="right"><b>Subtotal</b></TableCell>
                                            <TableCell align="right"><b>{Number(detail.subtotal || 0).toFixed(2)}</b></TableCell>
                                        </TableRow>
                                        {(detail.discount_amount || 0) > 0 && (
                                            <TableRow>
                                                <TableCell colSpan={4} align="right">Discount</TableCell>
                                                <TableCell align="right">- {Number(detail.discount_amount).toFixed(2)}</TableCell>
                                            </TableRow>
                                        )}
                                        <TableRow>
                                            <TableCell colSpan={4} align="right"><b>Total</b></TableCell>
                                            <TableCell align="right"><b>৳ {Number(detail.total_amount).toFixed(2)}</b></TableCell>
                                        </TableRow>
                                    </TableBody>
                                </Table>
                            </TableContainer>

                            {(detail.approved_by || detail.cancelled_by || detail.delivered_by) && (
                                <>
                                    <Divider />
                                    <Stack spacing={0.5}>
                                        {detail.approved_by && (
                                            <Typography variant="body2">
                                                ✅ Approved by <b>{nameOf(detail.approved_by)}</b>{detail.approved_at ? ` on ${formatDateForDisplay(detail.approved_at)}` : ""}
                                                {detail.approval_notes ? ` — “${detail.approval_notes}”` : ""}
                                            </Typography>
                                        )}
                                        {detail.cancelled_by && (
                                            <Typography variant="body2" color="error.main">
                                                ❌ Cancelled by <b>{nameOf(detail.cancelled_by)}</b>{detail.cancelled_at ? ` on ${formatDateForDisplay(detail.cancelled_at)}` : ""}
                                                {detail.cancellation_reason ? ` — “${detail.cancellation_reason}”` : ""}
                                            </Typography>
                                        )}
                                        {detail.delivered_by && (
                                            <Typography variant="body2" color="success.main">
                                                🚚 Delivered by <b>{nameOf(detail.delivered_by)}</b>{detail.delivered_at ? ` on ${formatDateForDisplay(detail.delivered_at)}` : ""}
                                                {detail.delivery_chalan_no ? ` — Chalan #${detail.delivery_chalan_no}` : ""}
                                            </Typography>
                                        )}
                                    </Stack>
                                </>
                            )}
                        </Stack>
                    )}
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setDetailOpen(false)}>Close</Button>
                    {detailActions}
                </DialogActions>
            </Dialog>

            {/* Action dialog (approve / reject / deliver) */}
            <Dialog open={!!actionOpen} onClose={() => !actionBusy && setActionOpen(null)} maxWidth="sm" fullWidth>
                <DialogTitle>
                    {actionOpen === "approve" && "Approve Order"}
                    {actionOpen === "reject" && "Reject / Cancel Order"}
                    {actionOpen === "deliver" && "Mark Order Delivered"}
                </DialogTitle>
                <DialogContent>
                    <TextField
                        autoFocus fullWidth multiline={actionOpen !== "deliver"} minRows={actionOpen === "deliver" ? 1 : 3}
                        label={
                            actionOpen === "approve" ? "Approval notes (optional)" :
                                actionOpen === "reject" ? "Reason for rejection (required)" :
                                    "Delivery chalan no. (optional)"
                        }
                        value={actionNotes}
                        onChange={(e) => setActionNotes(e.target.value)}
                        sx={{ mt: 1 }}
                    />
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setActionOpen(null)} disabled={actionBusy}>Cancel</Button>
                    <Button
                        variant="contained"
                        color={actionOpen === "reject" ? "error" : actionOpen === "deliver" ? "primary" : "success"}
                        onClick={submitAction}
                        disabled={actionBusy}
                    >
                        {actionBusy ? <CircularProgress size={20} /> : "Confirm"}
                    </Button>
                </DialogActions>
            </Dialog>
        </Container>
    );
}
