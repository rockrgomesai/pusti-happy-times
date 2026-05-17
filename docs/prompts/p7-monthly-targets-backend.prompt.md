---
mode: agent
description: Create the MonthlyTarget Mongoose model and /api/v1/monthly-targets routes (validate, upload, list) for the Set Monthly Targets web module. No dependency on other P-prompts.
---

# P7 — Monthly Targets: Model + API Routes

## Context

- Read [COMMON-SESSION-HANDOVER.md](../../COMMON-SESSION-HANDOVER.md) sections 2, 5, 6 first.
- Read [MONTHLY_TARGETS_SESSION_START.md](../../MONTHLY_TARGETS_SESSION_START.md) for business rules, FK resolution table, and the two-phase upload flow.
- This prompt has **no dependency** on other P-prompts. Complete it before P8.

---

## Step 1 — Create `backend/src/models/MonthlyTarget.js`

```js
const mongoose = require("mongoose");
const { Schema } = mongoose;

const MonthlyTargetSchema = new Schema(
  {
    month: {
      type: String,
      required: true,
      match: [/^\d{4}-\d{2}$/, "month must be YYYY-MM"],
    },
    distributor_id: {
      type: Schema.Types.ObjectId,
      ref: "Distributor",
      required: true,
    },
    // null = distributor-only target; ObjectId = SO target
    so_id: {
      type: Schema.Types.ObjectId,
      ref: "Employee",
      default: null,
    },
    product_id: {
      type: Schema.Types.ObjectId,
      ref: "Product",
      required: true,
    },
    target_qty_pcs: {
      type: Number,
      required: true,
      min: 0,
    },
    upload_date:          { type: Date },
    upload_user:          { type: Schema.Types.ObjectId, ref: "User" },
    last_update_date:     { type: Date },
    // Stores the qty value overwritten on the most recent upsert. null on first insert.
    prev_qty_b4_last_upd: { type: Number, default: null },
    active:      { type: Boolean, default: true },
    created_by:  { type: Schema.Types.ObjectId, ref: "User" },
    updated_by:  { type: Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: { createdAt: "created_at", updatedAt: "updated_at" } }
);

// Compound unique index.
// so_id: null is treated as a concrete value by MongoDB —
// two distributor-only rows with the same month+distributor+product are rejected.
MonthlyTargetSchema.index(
  { month: 1, distributor_id: 1, so_id: 1, product_id: 1 },
  { unique: true, name: "monthly_target_unique" }
);

module.exports = mongoose.model("MonthlyTarget", MonthlyTargetSchema);
```

---

## Step 2 — Create `backend/src/routes/monthlyTargets.js`

Follow the auth + role-check pattern from `backend/src/routes/secondary-orders.js`.

```js
const express = require("express");
const { body, query, validationResult } = require("express-validator");
const mongoose = require("mongoose");
const { authenticate } = require("../middleware/auth");
const MonthlyTarget = require("../models/MonthlyTarget");

const router = express.Router();

const ALLOWED_ROLES = ["SuperAdmin", "SalesAdmin", "HOS", "MIS"];

function roleOf(req) {
  return req.user?.role?.role || req.user?.roleName || "";
}

function canWrite(req) {
  return ALLOWED_ROLES.includes(roleOf(req));
}

// ─────────────────────────────────────────────────────────────
// POST /api/v1/monthly-targets/validate
// Phase 1: resolve ERP IDs to ObjectIds, detect duplicate/overwrite.
// Body: { rows: [{ month, erp_distributor_id, erp_so_id?, erp_product_id, target_qty_pcs }] }
// ─────────────────────────────────────────────────────────────
router.post("/validate", authenticate, async (req, res) => {
  if (!canWrite(req)) {
    return res.status(403).json({ success: false, message: "Access denied" });
  }

  const { rows } = req.body;
  if (!Array.isArray(rows) || rows.length === 0) {
    return res.status(400).json({ success: false, message: "rows array is required" });
  }

  const { Distributor, Employee, Product } = require("../models");

  // Collect unique ERP ids for batch lookups
  const distErpIds = [...new Set(rows.map(r => r.erp_distributor_id).filter(Boolean))].map(Number);
  const soErpIds   = [...new Set(rows.map(r => r.erp_so_id).filter(Boolean))].map(String);
  const prodErpIds = [...new Set(rows.map(r => r.erp_product_id).filter(Boolean))].map(Number);

  const [distributors, employees, products] = await Promise.all([
    Distributor.find({ erp_id: { $in: distErpIds }, active: true }).select("_id erp_id name").lean(),
    soErpIds.length
      ? Employee.find({ employee_id: { $in: soErpIds }, active: true }).select("_id employee_id name").lean()
      : Promise.resolve([]),
    Product.find({ erp_id: { $in: prodErpIds }, active: true }).select("_id erp_id sku bangla_name").lean(),
  ]);

  const distMap = new Map(distributors.map(d => [String(d.erp_id), d]));
  const soMap   = new Map(employees.map(e => [String(e.employee_id), e]));
  const prodMap = new Map(products.map(p => [String(p.erp_id), p]));

  const results = [];

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const result = { row_index: i, ok: true, warnings: [] };

    // Resolve distributor
    const dist = distMap.get(String(row.erp_distributor_id));
    if (!dist) {
      results.push({ ...result, ok: false, error: `Distributor erp_id ${row.erp_distributor_id} not found or inactive` });
      continue;
    }
    result.distributor_id   = dist._id;
    result.distributor_name = dist.name;

    // Resolve product
    const prod = prodMap.get(String(row.erp_product_id));
    if (!prod) {
      results.push({ ...result, ok: false, error: `Product erp_id ${row.erp_product_id} not found or inactive` });
      continue;
    }
    result.product_id  = prod._id;
    result.product_sku = prod.sku;

    // Resolve SO (optional)
    let soObjectId = null;
    if (row.erp_so_id) {
      const so = soMap.get(String(row.erp_so_id));
      if (!so) {
        results.push({ ...result, ok: false, error: `Employee employee_id ${row.erp_so_id} not found or inactive` });
        continue;
      }
      soObjectId     = so._id;
      result.so_id   = so._id;
      result.so_name = so.name;
    }

    // Check for existing record — overwrite warning
    const existing = await MonthlyTarget.findOne({
      month:          row.month,
      distributor_id: dist._id,
      so_id:          soObjectId,
      product_id:     prod._id,
    }).lean();

    if (existing) {
      result.existing_qty = existing.target_qty_pcs;
      result.warnings.push(`Will overwrite existing record (current qty: ${existing.target_qty_pcs} pcs)`);
    }

    results.push(result);
  }

  res.json({ success: true, data: { results } });
});

// ─────────────────────────────────────────────────────────────
// POST /api/v1/monthly-targets/upload
// Phase 2: bulk upsert rows with resolved ObjectIds.
// Body: { rows: [{ month, distributor_id, so_id, product_id, target_qty_pcs }] }
// distributor_id / so_id / product_id are MongoDB ObjectId strings here.
// ─────────────────────────────────────────────────────────────
router.post("/upload", authenticate, async (req, res) => {
  if (!canWrite(req)) {
    return res.status(403).json({ success: false, message: "Access denied" });
  }

  const { rows } = req.body;
  if (!Array.isArray(rows) || rows.length === 0) {
    return res.status(400).json({ success: false, message: "rows array is required" });
  }

  const results = [];
  const now = new Date();

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    try {
      const filter = {
        month:          row.month,
        distributor_id: new mongoose.Types.ObjectId(row.distributor_id),
        so_id:          row.so_id ? new mongoose.Types.ObjectId(row.so_id) : null,
        product_id:     new mongoose.Types.ObjectId(row.product_id),
      };

      // Fetch existing before upsert to capture prev_qty
      const existing = await MonthlyTarget.findOne(filter).select("target_qty_pcs").lean();

      await MonthlyTarget.findOneAndUpdate(
        filter,
        {
          $set: {
            target_qty_pcs:       Number(row.target_qty_pcs),
            last_update_date:     now,
            prev_qty_b4_last_upd: existing ? existing.target_qty_pcs : null,
            updated_by:           req.user._id,
          },
          $setOnInsert: {
            upload_date:  now,
            upload_user:  req.user._id,
            created_by:   req.user._id,
            active:       true,
          },
        },
        { upsert: true, new: true }
      );

      results.push({
        row_index:   i,
        ok:          true,
        overwritten: !!existing,
        prev_qty:    existing?.target_qty_pcs ?? null,
      });
    } catch (err) {
      results.push({
        row_index: i,
        ok:        false,
        error: err.code === 11000
          ? "Duplicate record — concurrent upload race condition"
          : err.message,
      });
    }
  }

  const saved  = results.filter(r => r.ok).length;
  const failed = results.filter(r => !r.ok).length;

  res.json({ success: true, data: { results, saved, failed } });
});

// ─────────────────────────────────────────────────────────────
// GET /api/v1/monthly-targets
// Query: month (YYYY-MM, required), distributor_id?, so_id?, page?, limit?
// ─────────────────────────────────────────────────────────────
router.get(
  "/",
  authenticate,
  [
    query("month").notEmpty().matches(/^\d{4}-\d{2}$/),
    query("distributor_id").optional().isMongoId(),
    query("so_id").optional().isMongoId(),
    query("page").optional().isInt({ min: 1 }).toInt(),
    query("limit").optional().isInt({ min: 1, max: 200 }).toInt(),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const { month, distributor_id, so_id, page = 1, limit = 50 } = req.query;
    const filter = { month, active: true };
    if (distributor_id) filter.distributor_id = distributor_id;
    if (so_id)          filter.so_id          = so_id;

    const [total, records] = await Promise.all([
      MonthlyTarget.countDocuments(filter),
      MonthlyTarget.find(filter)
        .sort({ distributor_id: 1, so_id: 1, product_id: 1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .populate("distributor_id", "name erp_id")
        .populate("so_id", "name employee_id")
        .populate("product_id", "sku bangla_name ctn_pcs")
        .lean(),
    ]);

    res.json({ success: true, data: { records, total, page, limit } });
  }
);

module.exports = router;
```

---

## Step 3 — Mount in `backend/src/routes/index.js`

Add near the bottom of the **import block** (after `secondaryOrdersRoutes`):
```js
const monthlyTargetsRoutes = require("./monthlyTargets");
```

Add near the bottom of the **mount block** (after `router.use("/secondary-orders", ...)`):
```js
router.use("/monthly-targets", monthlyTargetsRoutes);
```

---

## Rules

- Do NOT modify any existing model or route file beyond the two-line mount.
- All new fields follow `snake_case` DB convention (§2 of COMMON-SESSION-HANDOVER.md).
- `so_id: null` is intentional — do not add a sparse index or default to `undefined`.
- `Number()` on `target_qty_pcs` at upload time handles string-typed values from CSV parsing.

## Verification

1. `POST /api/v1/monthly-targets/validate` with a valid row → returns `ok: true` + resolved names.
2. Same call with a non-existent `erp_distributor_id` → returns `ok: false` + descriptive error.
3. `POST /api/v1/monthly-targets/upload` with a valid row → creates record; repeat → `overwritten: true`, `prev_qty` populated.
4. Duplicate upload with same `[month, dist, null so, product]` in race → triggers `11000` path → `error: "Duplicate record…"`.
5. `GET /api/v1/monthly-targets?month=2026-05` → paginated list with populated distributor/SO/product names.
6. `cd backend && npm test` passes.
