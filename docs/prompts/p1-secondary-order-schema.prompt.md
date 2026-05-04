---
name: "P1 — Secondary Order Schema Extensions"
description: "Extend SecondaryOrder model with price_locked, per-item delivery price, FIFO audit fields. Use when implementing secondary sales order delivery flow."
agent: "agent"
---

Extend the `SecondaryOrder` model at [backend/src/models/SecondaryOrder.js](../../backend/src/models/SecondaryOrder.js).

## Background

Read [COMMON-SESSION-HANDOVER.md](../../COMMON-SESSION-HANDOVER.md) sections 2 and 5 first.

`items[].unit_price` is snapshotted from `Product.trade_price` at order creation time.
Delivery can happen hours later. Govt-controlled products (edible oils, BEV) change price by the hour.
We need to record what price was actually billed at delivery, the FIFO cost of goods consumed, and whether the price was locked.

## Changes — `items[]` sub-schema (add after the existing `subtotal` field inside the items array)

```js
delivery_qty: {
  type: Number,
  default: null,
  min: 0,
},
delivery_unit_price: {
  type: Number,
  default: null,
  min: 0,
},
delivery_subtotal: {
  type: Number,
  default: null,
  min: 0,
},
fifo_cogs: {
  type: Number,
  default: null,
  min: 0,
},
fifo_batches_used: {
  type: [
    {
      batch_id:  { type: String },
      qty:       { type: Number },
      unit_cost: { type: Number },
      _id: false,
    },
  ],
  default: [],
},
```

## Changes — Root document (add after `client_order_uid`, before the `created_at` timestamp)

```js
price_locked: {
  type: Boolean,
  default: false,
  // false = re-read Product.trade_price at delivery time (correct for oils)
  // true  = bill at the unit_price captured when the order was created
},
delivery_total_amount: {
  type: Number,
  default: null,
  min: 0,
  // Computed at delivery: Σ delivery_subtotal across all delivered items
},
```

## Rules

- Do NOT remove or rename any existing field.
- All new fields are optional — do NOT add `required: true`.
- Use plain `Number` (not `Decimal128`) for all new fields.
- Do not add extra timestamps — the schema already has `created_at` / `updated_at`.

## Verification

```bash
cd backend && npm test
```

Expect zero Mongoose validation errors on SecondaryOrder.
