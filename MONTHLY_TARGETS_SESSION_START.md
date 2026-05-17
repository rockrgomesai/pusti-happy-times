# Monthly Targets — Session Start Context

> Feature: **Set Monthly Targets** (CSV bulk upload)
> Menu group: Secondary Sales → Set Monthly Targets
> Frontend path: `/ordermanagement/monthlytargets`
> Status: **Designed — not yet implemented.** See P7 (backend) and P8 (frontend).
> Last planned: 2026-05-11

---

## Business Rules

1. **Two target types** distinguished by presence of `so_id`:
   - **Distributor-only target** (`so_id` absent/null): overall monthly target for the distributor on a given product.
   - **SO target** (`so_id` present): target for one field SO working under that distributor. The aggregate of all SO targets for a given `[month, distributor_id, product_id]` is implicitly the distributor's SO-driven target — no separate aggregation record is stored.
2. **Uniqueness constraint:** `[month, distributor_id, so_id, product_id]`. MongoDB treats `so_id: null` as a concrete value, so distributor-only rows are correctly deduplicated from SO rows.
3. **Upsert semantics:** Re-uploading an existing row overwrites `target_qty_pcs`. The previous quantity is preserved in `prev_qty_b4_last_upd` before overwrite.
4. **Quantity unit:** PCS only. CTN display is computed from `Product.ctn_pcs` at the UI layer — never stored.
5. **Allowed roles to write:** `SuperAdmin`, `SalesAdmin`, `HOS`, `MIS`.

---

## FK Resolution (ERP IDs in CSV → MongoDB ObjectIds)

| CSV column       | Type   | Model         | Lookup field  | Notes                                |
|-----------------|--------|---------------|---------------|--------------------------------------|
| `distributor_id` | Number | `Distributor` | `erp_id`      | Must be active                       |
| `so_id`          | String | `Employee`    | `employee_id` | Optional; must be active             |
| `product_id`     | Number | `Product`     | `erp_id`      | MANUFACTURED products only; must be active |

All three lookups are **batched** (single `$in` per collection) inside `POST /monthly-targets/validate`.

---

## API Endpoints

Base: `/api/v1/monthly-targets`

| Method | Path        | Purpose                                                       |
|--------|-------------|---------------------------------------------------------------|
| `POST` | `/validate` | Resolve ERP IDs → ObjectIds, detect existing records (overwrite warnings) |
| `POST` | `/upload`   | Bulk upsert with `prev_qty_b4_last_upd` tracking             |
| `GET`  | `/`         | List targets filtered by `month`; supports `distributor_id`, `so_id`, pagination |

---

## Two-Phase Upload Flow

```
User selects CSV file
  → PapaParse parses → raw rows[]
  → Client-side validation (required fields, YYYY-MM format, in-file duplicates)
  → Editable table rendered; red rows block [Validate]
  → User corrects inline or removes rows
  → [Validate] → POST /validate
      Per-row response: { ok, distributor_id, so_id, product_id, distributor_name,
                          so_name, product_sku, existing_qty?, warnings[], error? }
  → ok=false  → row painted red + error column populated
  → existing_qty present → row painted yellow ("Will overwrite — prev qty: X pcs")
  → User fixes remaining red rows, then clicks [Upload]
  → [Upload] → POST /upload (sends only rows where ok=true or warning)
      Per-row response: { ok, overwritten, prev_qty?, error? }
  → Any save failures → row goes red again with error message
  → Success summary + page data table auto-refreshes
```

---

## CSV Format

```csv
month,distributor_id,so_id,product_id,target_qty_pcs
2026-05,1001,SO-001,2045,1200
2026-05,1002,,3010,800
```

- `so_id` blank = distributor-only target.
- `month` must match `YYYY-MM`. Mismatch with month picker → yellow warning; user may correct.

---

## Files to Create/Modify

| File | Action | Prompt |
|------|--------|--------|
| `backend/src/models/MonthlyTarget.js` | Create | P7 — Step 1 |
| `backend/src/routes/monthlyTargets.js` | Create | P7 — Step 2 |
| `backend/src/routes/index.js` | Modify (2 lines) | P7 — Step 3 |
| `frontend/src/app/ordermanagement/monthlytargets/page.tsx` | Create | P8 — Step 1 |
| `frontend/src/components/monthlyTargets/CsvUploadDialog.tsx` | Create | P8 — Step 2 |
| Sidebar menu item (DB seed) | Create | P8 — Step 3 |
