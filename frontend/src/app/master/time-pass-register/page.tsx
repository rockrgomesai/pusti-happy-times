'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
    Box,
    Typography,
    Button,
    Card,
    CardContent,
    CardActions,
    IconButton,
    Tooltip,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Paper,
    InputAdornment,
    TextField,
    ToggleButton,
    ToggleButtonGroup,
    TableSortLabel,
    TablePagination,
    Chip,
    Grid,
    Skeleton,
    Switch,
    FormControlLabel,
    Divider,
    CircularProgress,
} from '@mui/material';
import {
    Add as AddIcon,
    Edit as EditIcon,
    CalendarMonth as CalendarIcon,
    ViewList as ViewListIcon,
    ViewModule as ViewModuleIcon,
    Search as SearchIcon,
    WorkOff as WorkOffIcon,
    Event as HolidayIcon,
} from '@mui/icons-material';
import { toast } from 'react-hot-toast';
import api from '@/lib/api';

// ─── Types ────────────────────────────────────────────────────────────────────

interface OffDay {
    date: string; // "YYYY-MM-DD"
    type: 'weekly_off' | 'holiday';
    note: string;
}

interface TimePassRecord {
    _id: string;
    year_month: string;
    total_days: number;
    off_days: OffDay[];
    working_days: number;
    holidays_count: number;
    weekly_offs_count: number;
    active: boolean;
    created_at: string;
    updated_at: string;
    created_by?: { username: string } | null;
    updated_by?: { username: string } | null;
}

type SortKey = 'year_month' | 'working_days' | 'created_at';
type SortOrder = 'asc' | 'desc';

// ─── Helpers ─────────────────────────────────────────────────────────────────

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function formatYearMonth(ym: string) {
    const [y, m] = ym.split('-');
    return `${MONTH_NAMES[parseInt(m) - 1]} ${y}`;
}

function daysInMonth(year: number, month: number) {
    return new Date(year, month, 0).getDate();
}

function currentYearMonth() {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function getFridaysInMonth(year: number, month: number): string[] {
    const fridays: string[] = [];
    const total = daysInMonth(year, month);
    for (let d = 1; d <= total; d++) {
        const date = new Date(year, month - 1, d);
        if (date.getDay() === 5) {
            fridays.push(`${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`);
        }
    }
    return fridays;
}

function buildCalendarGrid(year: number, month: number): (number | null)[][] {
    const firstDay = new Date(year, month - 1, 1).getDay(); // 0=Sun
    const total = daysInMonth(year, month);
    const cells: (number | null)[] = Array(firstDay).fill(null);
    for (let d = 1; d <= total; d++) cells.push(d);
    while (cells.length % 7 !== 0) cells.push(null);
    const weeks: (number | null)[][] = [];
    for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));
    return weeks;
}

// ─── Calendar Dialog ──────────────────────────────────────────────────────────

interface CalendarDialogProps {
    open: boolean;
    initialYearMonth: string | null; // null = new month
    existingRecord: TimePassRecord | null;
    onClose: () => void;
    onSaved: () => void;
}

const CYCLE: Record<string, 'weekly_off' | 'holiday' | null> = {
    '': 'weekly_off',
    weekly_off: 'holiday',
    holiday: null, // clear
};

function CalendarDialog({ open, initialYearMonth, existingRecord, onClose, onSaved }: CalendarDialogProps) {
    const todayYM = currentYearMonth();
    const [yearMonth, setYearMonth] = useState(initialYearMonth ?? todayYM);
    const [offDayMap, setOffDayMap] = useState<Map<string, OffDay>>(new Map());
    const [autoFridays, setAutoFridays] = useState(true);
    const [noteDialogDate, setNoteDialogDate] = useState<string | null>(null);
    const [noteText, setNoteText] = useState('');
    const [saving, setSaving] = useState(false);

    const [year, month] = yearMonth.split('-').map(Number);

    // Populate from existing record when dialog opens
    useEffect(() => {
        if (!open) return;
        const ym = initialYearMonth ?? todayYM;
        setYearMonth(ym);
        if (existingRecord) {
            const map = new Map<string, OffDay>();
            existingRecord.off_days.forEach((d) => map.set(d.date, d));
            setOffDayMap(map);
            // Detect if auto-fridays was likely on (all fridays are weekly_off)
            const fridays = getFridaysInMonth(year, month);
            const allFridaysOff = fridays.every((f) => map.get(f)?.type === 'weekly_off');
            setAutoFridays(allFridaysOff);
        } else {
            // New month — auto-mark fridays
            const [y, m2] = ym.split('-').map(Number);
            const map = new Map<string, OffDay>();
            getFridaysInMonth(y, m2).forEach((f) => map.set(f, { date: f, type: 'weekly_off', note: '' }));
            setOffDayMap(map);
            setAutoFridays(true);
        }
    }, [open, initialYearMonth, existingRecord]); // eslint-disable-line react-hooks/exhaustive-deps

    // When autoFridays toggles, add/remove fridays
    const handleAutoFridaysToggle = (checked: boolean) => {
        setAutoFridays(checked);
        setOffDayMap((prev) => {
            const next = new Map(prev);
            const fridays = getFridaysInMonth(year, month);
            if (checked) {
                fridays.forEach((f) => {
                    if (!next.has(f)) next.set(f, { date: f, type: 'weekly_off', note: '' });
                });
            } else {
                fridays.forEach((f) => {
                    if (next.get(f)?.type === 'weekly_off') next.delete(f);
                });
            }
            return next;
        });
    };

    const handleCellClick = (dateStr: string) => {
        setOffDayMap((prev) => {
            const next = new Map(prev);
            const current = next.get(dateStr);
            const currentType = current?.type ?? '';
            const nextType = CYCLE[currentType];
            if (nextType === null) {
                next.delete(dateStr);
            } else {
                next.set(dateStr, { date: dateStr, type: nextType, note: current?.note ?? '' });
            }
            return next;
        });
    };

    const handleNoteOpen = (dateStr: string) => {
        setNoteDialogDate(dateStr);
        setNoteText(offDayMap.get(dateStr)?.note ?? '');
    };

    const handleNoteSave = () => {
        if (!noteDialogDate) return;
        setOffDayMap((prev) => {
            const next = new Map(prev);
            const existing2 = next.get(noteDialogDate);
            if (existing2) next.set(noteDialogDate, { ...existing2, note: noteText });
            return next;
        });
        setNoteDialogDate(null);
    };

    const offDays = Array.from(offDayMap.values());
    const totalDays = daysInMonth(year, month);
    const holidaysCount = offDays.filter((d) => d.type === 'holiday').length;
    const weeklyOffsCount = offDays.filter((d) => d.type === 'weekly_off').length;
    const workingDays = totalDays - offDays.length;

    const handleSave = async () => {
        setSaving(true);
        try {
            await api.put(`/master/time-pass-register/${yearMonth}`, { off_days: offDays });
            toast.success(`${formatYearMonth(yearMonth)} saved`);
            onSaved();
            onClose();
        } catch (err: unknown) {
            const msg =
                err && typeof err === 'object' && 'response' in err
                    ? (err as { response?: { data?: { message?: string } } }).response?.data?.message
                    : undefined;
            toast.error(msg ?? 'Failed to save');
        } finally {
            setSaving(false);
        }
    };

    const weeks = buildCalendarGrid(year, month);

    const cellStyle = (dateNum: number | null) => {
        if (!dateNum) return {};
        const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(dateNum).padStart(2, '0')}`;
        const off = offDayMap.get(dateStr);
        if (!off) return { cursor: 'pointer' };
        if (off.type === 'weekly_off') return { backgroundColor: '#E0E0E0', cursor: 'pointer' };
        return { backgroundColor: '#FFCDD2', cursor: 'pointer' };
    };

    return (
        <>
            <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
                <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <CalendarIcon color="secondary" />
                    {existingRecord ? `Edit — ${formatYearMonth(yearMonth)}` : 'Configure Month'}
                </DialogTitle>
                <DialogContent>
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2, flexWrap: 'wrap', gap: 1 }}>
                        {!existingRecord && (
                            <TextField
                                label="Month"
                                type="month"
                                size="small"
                                value={yearMonth}
                                onChange={(e) => setYearMonth(e.target.value)}
                                sx={{ width: 180 }}
                            />
                        )}
                        {existingRecord && (
                            <Typography variant="subtitle1" fontWeight={600}>
                                {formatYearMonth(yearMonth)}
                            </Typography>
                        )}
                        <FormControlLabel
                            control={<Switch checked={autoFridays} onChange={(e) => handleAutoFridaysToggle(e.target.checked)} size="small" />}
                            label="Auto-mark Fridays"
                        />
                    </Box>

                    {/* Calendar */}
                    <TableContainer component={Paper} variant="outlined" sx={{ mb: 2 }}>
                        <Table size="small">
                            <TableHead>
                                <TableRow sx={{ backgroundColor: 'grey.100' }}>
                                    {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
                                        <TableCell key={d} align="center" sx={{ fontWeight: 600, py: 0.75, color: d === 'Fri' ? 'text.secondary' : 'inherit' }}>
                                            {d}
                                        </TableCell>
                                    ))}
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {weeks.map((week, wi) => (
                                    <TableRow key={wi}>
                                        {week.map((day, di) => {
                                            if (!day) return <TableCell key={di} />;
                                            const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                                            const off = offDayMap.get(dateStr);
                                            const tooltipTitle = off
                                                ? off.note
                                                    ? `${off.type === 'weekly_off' ? 'Weekly Off' : 'Holiday'}: ${off.note}`
                                                    : off.type === 'weekly_off' ? 'Weekly Off' : 'Holiday'
                                                : '';
                                            return (
                                                <Tooltip
                                                    key={di}
                                                    title={tooltipTitle}
                                                    placement="top"
                                                    arrow
                                                    disableHoverListener={!off}
                                                >
                                                    <TableCell
                                                        align="center"
                                                        onClick={() => handleCellClick(dateStr)}
                                                        onContextMenu={(e) => {
                                                            e.preventDefault();
                                                            if (off) handleNoteOpen(dateStr);
                                                        }}
                                                        sx={{
                                                            ...cellStyle(day),
                                                            borderRadius: 1,
                                                            userSelect: 'none',
                                                            position: 'relative',
                                                            py: 1,
                                                            '&:hover': { opacity: 0.8 },
                                                        }}
                                                    >
                                                        <Typography variant="body2" fontWeight={off ? 600 : 400}>
                                                            {day}
                                                        </Typography>
                                                        {off?.type === 'weekly_off' && (
                                                            <WorkOffIcon sx={{ fontSize: 10, color: 'text.secondary', position: 'absolute', bottom: 2, right: 2 }} />
                                                        )}
                                                        {off?.type === 'holiday' && (
                                                            <HolidayIcon sx={{ fontSize: 10, color: 'error.main', position: 'absolute', bottom: 2, right: 2 }} />
                                                        )}
                                                        {off?.note && (
                                                            <Box sx={{ width: 5, height: 5, borderRadius: '50%', backgroundColor: 'primary.main', position: 'absolute', top: 2, right: 2 }} />
                                                        )}
                                                    </TableCell>
                                                </Tooltip>
                                            );
                                        })}
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </TableContainer>

                    {/* Legend */}
                    <Box sx={{ display: 'flex', gap: 2, mb: 2, flexWrap: 'wrap' }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                            <Box sx={{ width: 16, height: 16, borderRadius: 0.5, backgroundColor: '#E0E0E0', border: '1px solid #ccc' }} />
                            <Typography variant="caption">Weekly Off</Typography>
                        </Box>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                            <Box sx={{ width: 16, height: 16, borderRadius: 0.5, backgroundColor: '#FFCDD2', border: '1px solid #f44336' }} />
                            <Typography variant="caption">Public Holiday</Typography>
                        </Box>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                            <Box sx={{ width: 16, height: 16, borderRadius: 0.5, border: '1px solid #ccc' }} />
                            <Typography variant="caption">Working Day</Typography>
                        </Box>
                        <Typography variant="caption" color="text.secondary">
                            (Click: toggle type · Right-click: add note · Hover: view note)
                        </Typography>
                    </Box>

                    <Divider sx={{ mb: 2 }} />

                    {/* Summary */}
                    <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                        {[
                            { label: 'Total Days', value: totalDays },
                            { label: 'Weekly Offs', value: weeklyOffsCount },
                            { label: 'Holidays', value: holidaysCount },
                            { label: 'Working Days', value: workingDays, highlight: true },
                        ].map(({ label, value, highlight }) => (
                            <Box key={label} sx={{ textAlign: 'center', minWidth: 80, p: 1, borderRadius: 1, backgroundColor: highlight ? 'primary.50' : 'grey.50', border: '1px solid', borderColor: highlight ? 'primary.200' : 'grey.200' }}>
                                <Typography variant="h6" color={highlight ? 'primary.main' : 'text.primary'} fontWeight={700}>
                                    {value}
                                </Typography>
                                <Typography variant="caption" color="text.secondary">
                                    {label}
                                </Typography>
                            </Box>
                        ))}
                    </Box>
                </DialogContent>
                <DialogActions>
                    <Button onClick={onClose} disabled={saving}>Cancel</Button>
                    <Button variant="contained" onClick={handleSave} disabled={saving} startIcon={saving ? <CircularProgress size={16} /> : undefined}>
                        Save Config
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Note Dialog */}
            <Dialog open={!!noteDialogDate} onClose={() => setNoteDialogDate(null)} maxWidth="xs" fullWidth>
                <DialogTitle>Note for {noteDialogDate}</DialogTitle>
                <DialogContent>
                    <TextField
                        autoFocus
                        fullWidth
                        label="Note (optional)"
                        value={noteText}
                        onChange={(e) => setNoteText(e.target.value)}
                        inputProps={{ maxLength: 200 }}
                        sx={{ mt: 1 }}
                    />
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setNoteDialogDate(null)}>Cancel</Button>
                    <Button variant="contained" onClick={handleNoteSave}>Save Note</Button>
                </DialogActions>
            </Dialog>
        </>
    );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function TimePassRegisterPage() {
    const [records, setRecords] = useState<TimePassRecord[]>([]);
    const [loading, setLoading] = useState(true);
    const [viewMode, setViewMode] = useState<'cards' | 'list'>('cards');
    const [searchTerm, setSearchTerm] = useState('');
    const [sortBy, setSortBy] = useState<SortKey>('year_month');
    const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
    const [page, setPage] = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(12);

    // Dialog state
    const [dialogOpen, setDialogOpen] = useState(false);
    const [editingRecord, setEditingRecord] = useState<TimePassRecord | null>(null);
    const [dialogInitialYM, setDialogInitialYM] = useState<string | null>(null);

    const load = useCallback(async () => {
        try {
            setLoading(true);
            const res = await api.get('/master/time-pass-register', { params: { limit: 120 } });
            setRecords(res.data?.data?.records ?? []);
        } catch {
            toast.error('Failed to load Time Pass Register');
            setRecords([]);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { load(); }, [load]);

    const filtered = useMemo(() => {
        const q = searchTerm.trim().toLowerCase();
        if (!q) return records;
        return records.filter((r) => r.year_month.includes(q) || formatYearMonth(r.year_month).toLowerCase().includes(q));
    }, [records, searchTerm]);

    const sorted = useMemo(() => {
        return [...filtered].sort((a, b) => {
            let av: string | number = a[sortBy] as string | number;
            let bv: string | number = b[sortBy] as string | number;
            if (sortBy === 'created_at') { av = new Date(av as string).getTime(); bv = new Date(bv as string).getTime(); }
            if (sortOrder === 'asc') return av < bv ? -1 : av > bv ? 1 : 0;
            return av > bv ? -1 : av < bv ? 1 : 0;
        });
    }, [filtered, sortBy, sortOrder]);

    const paginated = useMemo(() => sorted.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage), [sorted, page, rowsPerPage]);

    const handleSort = (key: SortKey) => {
        if (sortBy === key) setSortOrder((o) => (o === 'asc' ? 'desc' : 'asc'));
        else { setSortBy(key); setSortOrder('desc'); }
        setPage(0);
    };

    const openNew = () => {
        setEditingRecord(null);
        setDialogInitialYM(null);
        setDialogOpen(true);
    };

    const openEdit = (r: TimePassRecord) => {
        setEditingRecord(r);
        setDialogInitialYM(r.year_month);
        setDialogOpen(true);
    };

    const currentYM = currentYearMonth();

    const getWorkingDaysColor = (wd: number): 'success' | 'warning' | 'default' => {
        if (wd >= 24) return 'success';
        if (wd >= 20) return 'warning';
        return 'default';
    };

    return (
        <Box sx={{ p: { xs: 2, md: 3 } }}>
            {/* Header */}
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3, flexWrap: 'wrap', gap: 2 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <CalendarIcon color="secondary" fontSize="large" />
                    <Box>
                        <Typography variant="h5" fontWeight={700}>Time Pass Register</Typography>
                        <Typography variant="body2" color="text.secondary">Configure monthly working days for Time Pass % calculations</Typography>
                    </Box>
                </Box>
                <Button variant="contained" startIcon={<AddIcon />} onClick={openNew}>
                    Configure Month
                </Button>
            </Box>

            {/* Controls */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2, flexWrap: 'wrap' }}>
                <TextField
                    size="small"
                    placeholder="Search months..."
                    value={searchTerm}
                    onChange={(e) => { setSearchTerm(e.target.value); setPage(0); }}
                    InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment> }}
                    sx={{ width: 240 }}
                />
                <ToggleButtonGroup value={viewMode} exclusive onChange={(_, v) => v && setViewMode(v)} size="small">
                    <ToggleButton value="cards"><ViewModuleIcon fontSize="small" /></ToggleButton>
                    <ToggleButton value="list"><ViewListIcon fontSize="small" /></ToggleButton>
                </ToggleButtonGroup>
                <Typography variant="body2" color="text.secondary" sx={{ ml: 'auto' }}>
                    {filtered.length} {filtered.length === 1 ? 'month' : 'months'} configured
                </Typography>
            </Box>

            {/* ── CARD VIEW ── */}
            {viewMode === 'cards' && (
                <>
                    {loading ? (
                        <Grid container spacing={2}>
                            {Array.from({ length: 6 }).map((_, i) => (
                                <Grid key={i} size={{ xs: 12, sm: 6, md: 4, lg: 3 }}>
                                    <Skeleton variant="rounded" height={180} />
                                </Grid>
                            ))}
                        </Grid>
                    ) : paginated.length === 0 ? (
                        <Box sx={{ textAlign: 'center', py: 8 }}>
                            <CalendarIcon sx={{ fontSize: 64, color: 'text.disabled', mb: 1 }} />
                            <Typography color="text.secondary">No months configured yet</Typography>
                            <Button sx={{ mt: 2 }} variant="outlined" onClick={openNew}>Configure First Month</Button>
                        </Box>
                    ) : (
                        <Grid container spacing={2}>
                            {paginated.map((r) => (
                                <Grid key={r._id} size={{ xs: 12, sm: 6, md: 4, lg: 3 }}>
                                    <Card
                                        variant="outlined"
                                        sx={{
                                            height: '100%',
                                            borderColor: r.year_month === currentYM ? 'primary.main' : 'divider',
                                            borderWidth: r.year_month === currentYM ? 2 : 1,
                                        }}
                                    >
                                        <CardContent>
                                            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
                                                <Typography variant="h6" fontWeight={700}>{formatYearMonth(r.year_month)}</Typography>
                                                {r.year_month === currentYM && <Chip label="Current" color="primary" size="small" />}
                                            </Box>
                                            <Divider sx={{ mb: 1.5 }} />
                                            <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1 }}>
                                                {[
                                                    { label: 'Total Days', value: r.total_days },
                                                    { label: 'Weekly Offs', value: r.weekly_offs_count },
                                                    { label: 'Holidays', value: r.holidays_count },
                                                ].map(({ label, value }) => (
                                                    <Box key={label}>
                                                        <Typography variant="caption" color="text.secondary">{label}</Typography>
                                                        <Typography variant="body1" fontWeight={600}>{value}</Typography>
                                                    </Box>
                                                ))}
                                                <Box>
                                                    <Typography variant="caption" color="text.secondary">Working Days</Typography>
                                                    <Box>
                                                        <Chip label={r.working_days} color={getWorkingDaysColor(r.working_days)} size="small" sx={{ fontWeight: 700 }} />
                                                    </Box>
                                                </Box>
                                            </Box>
                                            {r.updated_by && (
                                                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1.5 }}>
                                                    Updated by {r.updated_by.username}
                                                </Typography>
                                            )}
                                        </CardContent>
                                        <CardActions sx={{ justifyContent: 'flex-end', pt: 0 }}>
                                            <Tooltip title="Edit">
                                                <IconButton size="small" color="primary" onClick={() => openEdit(r)}>
                                                    <EditIcon fontSize="small" />
                                                </IconButton>
                                            </Tooltip>
                                        </CardActions>
                                    </Card>
                                </Grid>
                            ))}
                        </Grid>
                    )}
                    {!loading && sorted.length > rowsPerPage && (
                        <TablePagination
                            component="div"
                            count={sorted.length}
                            page={page}
                            onPageChange={(_, p) => setPage(p)}
                            rowsPerPage={rowsPerPage}
                            onRowsPerPageChange={(e) => { setRowsPerPage(parseInt(e.target.value)); setPage(0); }}
                            rowsPerPageOptions={[8, 12, 24]}
                            sx={{ mt: 2 }}
                        />
                    )}
                </>
            )}

            {/* ── LIST VIEW ── */}
            {viewMode === 'list' && (
                <Paper variant="outlined">
                    <TableContainer>
                        <Table size="small">
                            <TableHead>
                                <TableRow sx={{ backgroundColor: 'grey.50' }}>
                                    {[
                                        { id: 'year_month' as SortKey, label: 'Month' },
                                        { id: null, label: 'Total Days' },
                                        { id: null, label: 'Weekly Offs' },
                                        { id: null, label: 'Holidays' },
                                        { id: 'working_days' as SortKey, label: 'Working Days' },
                                        { id: null, label: 'Updated By' },
                                        { id: 'created_at' as SortKey, label: 'Created' },
                                        { id: null, label: 'Actions' },
                                    ].map(({ id, label }) => (
                                        <TableCell key={label} align={label === 'Actions' ? 'center' : 'left'}>
                                            {id ? (
                                                <TableSortLabel
                                                    active={sortBy === id}
                                                    direction={sortBy === id ? sortOrder : 'asc'}
                                                    onClick={() => handleSort(id)}
                                                >
                                                    {label}
                                                </TableSortLabel>
                                            ) : label}
                                        </TableCell>
                                    ))}
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {loading
                                    ? Array.from({ length: 8 }).map((_, i) => (
                                        <TableRow key={i}>
                                            {Array.from({ length: 8 }).map((__, j) => (
                                                <TableCell key={j}><Skeleton /></TableCell>
                                            ))}
                                        </TableRow>
                                    ))
                                    : paginated.map((r) => (
                                        <TableRow
                                            key={r._id}
                                            hover
                                            sx={{ backgroundColor: r.year_month === currentYM ? 'primary.50' : undefined }}
                                        >
                                            <TableCell>
                                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                                    <Typography fontWeight={600}>{formatYearMonth(r.year_month)}</Typography>
                                                    {r.year_month === currentYM && <Chip label="Current" color="primary" size="small" />}
                                                </Box>
                                            </TableCell>
                                            <TableCell>{r.total_days}</TableCell>
                                            <TableCell>{r.weekly_offs_count}</TableCell>
                                            <TableCell>{r.holidays_count}</TableCell>
                                            <TableCell>
                                                <Chip label={r.working_days} color={getWorkingDaysColor(r.working_days)} size="small" sx={{ fontWeight: 700 }} />
                                            </TableCell>
                                            <TableCell>{r.updated_by?.username ?? '-'}</TableCell>
                                            <TableCell>{new Date(r.created_at).toLocaleDateString()}</TableCell>
                                            <TableCell align="center">
                                                <Tooltip title="Edit">
                                                    <IconButton size="small" color="primary" onClick={() => openEdit(r)}>
                                                        <EditIcon fontSize="small" />
                                                    </IconButton>
                                                </Tooltip>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                {!loading && paginated.length === 0 && (
                                    <TableRow>
                                        <TableCell colSpan={8} align="center" sx={{ py: 4 }}>
                                            <Typography color="text.secondary">No months configured</Typography>
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </TableContainer>
                    {!loading && sorted.length > rowsPerPage && (
                        <TablePagination
                            component="div"
                            count={sorted.length}
                            page={page}
                            onPageChange={(_, p) => setPage(p)}
                            rowsPerPage={rowsPerPage}
                            onRowsPerPageChange={(e) => { setRowsPerPage(parseInt(e.target.value)); setPage(0); }}
                            rowsPerPageOptions={[10, 25, 50]}
                        />
                    )}
                </Paper>
            )}

            {/* Calendar configure dialog */}
            <CalendarDialog
                open={dialogOpen}
                initialYearMonth={dialogInitialYM}
                existingRecord={editingRecord}
                onClose={() => setDialogOpen(false)}
                onSaved={load}
            />
        </Box>
    );
}
