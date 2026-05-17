---
mode: agent
description: Create the Set Monthly Targets web page (ordermanagement/monthlytargets) and CsvUploadDialog component. Two-phase CSV validation with inline-editable table. Depends on P7.
---

# P8 — Monthly Targets: Web Page + CSV Upload Dialog

## Context

- Read [COMMON-SESSION-HANDOVER.md](../../COMMON-SESSION-HANDOVER.md) section 4 first.
- Read [MONTHLY_TARGETS_SESSION_START.md](../../MONTHLY_TARGETS_SESSION_START.md) for the two-phase upload flow, business rules, and CSV format.
- **P7 must be completed first** — this prompt depends on `POST /monthly-targets/validate`, `POST /monthly-targets/upload`, and `GET /monthly-targets` being live.
- Reference page pattern: `frontend/src/app/ordermanagement/secondaryorders/page.tsx`.
- Dialog reference: `frontend/src/components/common/ImageViewer.tsx` (MUI Dialog pattern).
- API client: `import api from "@/lib/api"` — never use raw axios.

---

## Step 1 — Create `frontend/src/app/ordermanagement/monthlytargets/page.tsx`

`"use client"` page. Key sections:

### Interfaces

```typescript
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
```

### State

```typescript
const [selectedMonth, setSelectedMonth] = useState<string>('');  // "YYYY-MM"
const [uploadOpen, setUploadOpen]       = useState(false);
const [records, setRecords]             = useState<TargetRecord[]>([]);
const [loading, setLoading]             = useState(false);
const [page, setPage]                   = useState(0);
const [total, setTotal]                 = useState(0);
const rowsPerPage = 50;
```

### fetchRecords

```typescript
const fetchRecords = useCallback(async () => {
  if (!selectedMonth) return;
  setLoading(true);
  try {
    const res = await api.get('/monthly-targets', {
      params: { month: selectedMonth, page: page + 1, limit: rowsPerPage },
    });
    setRecords(res.data.data.records);
    setTotal(res.data.data.total);
  } finally {
    setLoading(false);
  }
}, [selectedMonth, page]);
```

Call `fetchRecords` inside `useEffect` on `selectedMonth` and `page` changes.

### downloadTemplate

```typescript
const downloadTemplate = () => {
  const csv = [
    'month,distributor_id,so_id,product_id,target_qty_pcs',
    `${selectedMonth || '2026-05'},1001,SO-001,2045,1200`,
    `${selectedMonth || '2026-05'},1002,,3010,800`,
  ].join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = 'monthly_targets_template.csv';
  a.click();
  URL.revokeObjectURL(url);
};
```

### Layout

```tsx
<Container maxWidth="xl" sx={{ py: 3 }}>
  <Typography variant="h5" fontWeight={600} gutterBottom>
    Set Monthly Targets
  </Typography>

  <Stack direction="row" spacing={2} alignItems="center" sx={{ mb: 3 }}>
    <TextField
      label="Month"
      type="month"
      value={selectedMonth}
      onChange={(e) => { setSelectedMonth(e.target.value); setPage(0); }}
      InputLabelProps={{ shrink: true }}
      sx={{ width: 200 }}
    />
    <Button variant="contained" startIcon={<CloudUpload />}
      onClick={() => setUploadOpen(true)}>
      Upload CSV
    </Button>
    <Button variant="outlined" startIcon={<Download />}
      onClick={downloadTemplate}>
      Download Template
    </Button>
    {loading && <CircularProgress size={24} />}
  </Stack>

  <TableContainer component={Paper}>
    <Table size="small">
      <TableHead>
        <TableRow sx={{ backgroundColor: 'primary.main' }}>
          <TableCell sx={{ color: 'white' }}>Month</TableCell>
          <TableCell sx={{ color: 'white' }}>Distributor</TableCell>
          <TableCell sx={{ color: 'white' }}>SO</TableCell>
          <TableCell sx={{ color: 'white' }}>SKU</TableCell>
          <TableCell sx={{ color: 'white' }}>Product</TableCell>
          <TableCell align="right" sx={{ color: 'white' }}>Target (PCS)</TableCell>
          <TableCell align="right" sx={{ color: 'white' }}>Target (CTN)</TableCell>
          <TableCell sx={{ color: 'white' }}>Prev Qty</TableCell>
          <TableCell sx={{ color: 'white' }}>Last Updated</TableCell>
        </TableRow>
      </TableHead>
      <TableBody>
        {records.map(row => (
          <TableRow key={row._id} hover>
            <TableCell>{row.month}</TableCell>
            <TableCell>
              {row.distributor_id?.name}
              <Typography variant="caption" color="text.secondary" display="block">
                ERP: {row.distributor_id?.erp_id}
              </Typography>
            </TableCell>
            <TableCell>
              {row.so_id
                ? `${row.so_id.name} (${row.so_id.employee_id})`
                : <Typography color="text.secondary" variant="body2">—</Typography>}
            </TableCell>
            <TableCell><code>{row.product_id?.sku}</code></TableCell>
            <TableCell>{row.product_id?.bangla_name}</TableCell>
            <TableCell align="right">{row.target_qty_pcs.toLocaleString()}</TableCell>
            <TableCell align="right">
              {row.product_id?.ctn_pcs
                ? (row.target_qty_pcs / row.product_id.ctn_pcs).toFixed(2)
                : '—'}
            </TableCell>
            <TableCell>
              {row.prev_qty_b4_last_upd != null
                ? row.prev_qty_b4_last_upd.toLocaleString()
                : '—'}
            </TableCell>
            <TableCell>
              {row.last_update_date
                ? new Date(row.last_update_date).toLocaleDateString()
                : '—'}
            </TableCell>
          </TableRow>
        ))}
        {!loading && records.length === 0 && (
          <TableRow>
            <TableCell colSpan={9} align="center" sx={{ py: 4, color: 'text.secondary' }}>
              {selectedMonth ? 'No targets found for this month' : 'Select a month to view targets'}
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
    onSuccess={() => { setUploadOpen(false); fetchRecords(); }}
  />
</Container>
```

---

## Step 2 — Create `frontend/src/components/monthlyTargets/CsvUploadDialog.tsx`

Install PapaParse if not already present: `cd frontend && npm install papaparse @types/papaparse`.

### Props

```typescript
interface CsvUploadDialogProps {
  open: boolean;
  defaultMonth: string;
  onClose: () => void;
  onSuccess: () => void;
}
```

### Row state type

```typescript
type RowStatus = 'pending' | 'ok' | 'warning' | 'error';

interface EditableRow {
  id: string;                    // crypto.randomUUID()
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

type Phase = 'idle' | 'preview' | 'validating' | 'validated' | 'uploading' | 'done';
```

### Client validation function

```typescript
function applyClientValidation(rows: EditableRow[], defaultMonth: string): EditableRow[] {
  const seen = new Set<string>();
  return rows.map(row => {
    if (!row.erp_distributor_id.trim()) {
      return { ...row, status: 'error', clientError: 'Distributor ID required' };
    }
    if (!row.erp_product_id.trim()) {
      return { ...row, status: 'error', clientError: 'Product ID required' };
    }
    const qty = Number(row.target_qty_pcs);
    if (!row.target_qty_pcs || isNaN(qty) || qty <= 0) {
      return { ...row, status: 'error', clientError: 'Valid quantity required (> 0)' };
    }
    if (!/^\d{4}-\d{2}$/.test(row.month)) {
      return { ...row, status: 'error', clientError: 'Month must be YYYY-MM' };
    }
    const dedupKey = `${row.month}|${row.erp_distributor_id}|${row.erp_so_id}|${row.erp_product_id}`;
    if (seen.has(dedupKey)) {
      return { ...row, status: 'error', clientError: 'Duplicate row in file' };
    }
    seen.add(dedupKey);
    if (defaultMonth && row.month !== defaultMonth) {
      return { ...row, status: 'warning',
        clientError: `Month ${row.month} differs from selected ${defaultMonth}` };
    }
    return { ...row, status: 'ok', clientError: undefined, errorMessage: undefined };
  });
}
```

### File parsing

```typescript
const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
  const file = e.target.files?.[0];
  if (!file) return;
  Papa.parse<Record<string, string>>(file, {
    header: true,
    skipEmptyLines: true,
    complete: (results) => {
      const parsed: EditableRow[] = results.data.map(r => ({
        id:                 crypto.randomUUID(),
        month:              r.month?.trim() || defaultMonth,
        erp_distributor_id: r.distributor_id?.trim() || '',
        erp_so_id:          r.so_id?.trim() || '',
        erp_product_id:     r.product_id?.trim() || '',
        target_qty_pcs:     r.target_qty_pcs?.trim() || '',
        status:             'pending' as RowStatus,
      }));
      setRows(applyClientValidation(parsed, defaultMonth));
      setPhase('preview');
    },
  });
  // Reset input so the same file can be re-selected
  e.target.value = '';
};
```

### POST /validate handler

```typescript
const handleValidate = async () => {
  setPhase('validating');
  const sendable = rows.filter(r => r.status !== 'error');
  try {
    const payload = sendable.map(r => ({
      month:              r.month,
      erp_distributor_id: r.erp_distributor_id,
      erp_so_id:          r.erp_so_id || undefined,
      erp_product_id:     r.erp_product_id,
      target_qty_pcs:     Number(r.target_qty_pcs),
    }));

    const res = await api.post('/monthly-targets/validate', { rows: payload });
    const results: any[] = res.data.data.results;

    const updatedRows = [...rows];
    results.forEach((result, i) => {
      const origIdx = rows.indexOf(sendable[i]);
      const row = { ...updatedRows[origIdx] };
      if (!result.ok) {
        row.status       = 'error';
        row.errorMessage = result.error;
        row.dbError      = result.error;
      } else {
        row.distributor_id   = result.distributor_id;
        row.so_id            = result.so_id ?? null;
        row.product_id       = result.product_id;
        row.distributor_name = result.distributor_name;
        row.so_name          = result.so_name;
        row.product_sku      = result.product_sku;
        row.dbWarnings       = result.warnings;
        row.existing_qty     = result.existing_qty;
        row.status           = result.warnings?.length ? 'warning' : 'ok';
        row.errorMessage     = result.warnings?.join('; ');
      }
      updatedRows[origIdx] = row;
    });
    setRows(updatedRows);
    setPhase('validated');
  } catch {
    setPhase('preview');
  }
};
```

### POST /upload handler

```typescript
const handleUpload = async () => {
  setPhase('uploading');
  const uploadable = rows.filter(r => r.status === 'ok' || r.status === 'warning');
  try {
    const payload = uploadable.map(r => ({
      month:          r.month,
      distributor_id: r.distributor_id!,
      so_id:          r.so_id || null,
      product_id:     r.product_id!,
      target_qty_pcs: Number(r.target_qty_pcs),
    }));

    const res = await api.post('/monthly-targets/upload', { rows: payload });
    const { results, saved, failed } = res.data.data;

    if (failed > 0) {
      const updatedRows = [...rows];
      results.forEach((result: any, i: number) => {
        if (!result.ok) {
          const idx = rows.indexOf(uploadable[i]);
          updatedRows[idx] = { ...updatedRows[idx], status: 'error', errorMessage: result.error };
        }
      });
      setRows(updatedRows);
    }
    setUploadSummary({ saved, failed });
    setPhase('done');
    if (failed === 0) setTimeout(onSuccess, 1500);
  } catch {
    setPhase('validated');
  }
};
```

### Inline cell editing

For each editable cell (month, erp_distributor_id, erp_so_id, erp_product_id, target_qty_pcs), use a MUI `TextField variant="standard"` that updates the row and re-runs `applyClientValidation`. Reset phase to `'preview'` if editing occurs after `'validated'`.

### Row removal

```typescript
<IconButton size="small" onClick={() => setRows(rows.filter(r => r.id !== row.id))}>
  <Delete fontSize="small" />
</IconButton>
```

### Row background colour

Apply `sx` to `<TableRow>`:
```typescript
sx={{
  backgroundColor:
    row.status === 'error'   ? 'rgba(211,47,47,0.10)'  :
    row.status === 'warning' ? 'rgba(237,108,2,0.10)'  : 'inherit',
}}
```

### Dialog action buttons by phase

| Phase | Primary button | Secondary |
|-------|---------------|-----------|
| `preview` | **Validate** — disabled if any row is `error` | Cancel |
| `validating` | `<CircularProgress size={20} />` (disabled) | — |
| `validated` | **Upload** — disabled if all rows are `error` | Re-validate / Cancel |
| `uploading` | `<CircularProgress size={20} />` (disabled) | — |
| `done` | **Close** | — (shows "Saved: N  Failed: M" above buttons) |

### Dialog table columns

| # | Month | Distributor ID | SO ID | Product ID | Qty (PCS) | Resolved Name | Resolved SKU | Prev Qty | Error / Warning | ✕ |

Columns "Resolved Name", "Resolved SKU", "Prev Qty" are blank until after validate.

### Reset on close

```typescript
const handleClose = () => {
  setRows([]);
  setPhase('idle');
  setUploadSummary(null);
  onClose();
};
```

---

## Step 3 — Add Sidebar Menu Item (DB seed via mongosh)

```js
// Run in mongosh against the target database
const parent = db.sidebar_menu_items.findOne({ label: /secondary sales/i });
print("Parent id:", parent._id);

db.sidebar_menu_items.insertOne({
  label:      "Set Monthly Targets",
  href:       "/ordermanagement/monthlytargets",
  icon:       "TrackChanges",
  m_order:    99,
  parent_id:  parent._id,
  is_submenu: true,
});
```

If no "Secondary Sales" parent exists, create it first (`is_submenu: false`, `href: null`) then use its `_id`.

---

## Rules

- Install only `papaparse @types/papaparse` — no other new packages.
- Use `crypto.randomUUID()` for row IDs — no uuid library needed.
- MUI components only — no raw HTML tables.
- No Redux — local `useState` throughout.
- Do NOT add `'use server'` — this is a pure `'use client'` page.

## Verification

1. Upload a valid CSV for month `2026-05` → all rows green → Validate → all `ok` → Upload → page table shows records.
2. Upload a CSV with a missing `distributor_id` → row is red; Validate button disabled.
3. Edit the red cell inline → row turns green → Validate proceeds.
4. Remove a row with trash icon → row disappears.
5. Upload same file again → yellow "Will overwrite" warnings with `existing_qty` shown.
6. Non-existent ERP id that passes client check → Validate returns `ok: false` → row goes red.
7. Download Template → `monthly_targets_template.csv` downloads with the correct 5 columns.
