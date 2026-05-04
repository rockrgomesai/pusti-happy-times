---
name: "P4 — Damage Returns (Confirm No Stock Touch)"
description: "Verify DamageClaim creation and status transitions never modify DistributorStock. Use when auditing the damage return flow or reviewing the damage claim routes."
agent: "agent"
---

Audit the damage return flow to confirm that stock is **never** modified when a damage claim is raised or processed.

## Background

Per client requirement: damaged goods are **destroyed or sold as scrap at the outlet**.
The company never physically takes them back.
Therefore `DistributorStock` (and `DepotStock`) must never be modified by any damage claim lifecycle event.

Financial resolution (credit note, refund, replacement order) is handled separately through the existing
status workflow on `DamageClaim` and, if a replacement is needed, a new `SecondaryOrder` is raised —
which will deduct stock through the normal P3 deliver flow.

## Files to audit

- [backend/src/routes/damageClaims.js](../../backend/src/routes/damageClaims.js)
- [backend/src/models/DamageClaim.js](../../backend/src/models/DamageClaim.js)

## Checks to perform

### 1 — Search for forbidden calls in `damageClaims.js`

Use grep or code search for any of these strings in the route file:
- `reduceStockFIFO`
- `addStockFIFO`
- `DistributorStock`
- `DepotStock`

None should appear. If any do — remove them and explain why.

### 2 — Verify resolution types do not trigger stock writes

The `DamageClaim.resolution_type` enum is:
`['replacement', 'refund', 'credit_note', 'rejected', 'none']`

For `resolution_type: 'replacement'`: confirm the route either:
- Creates a new `SecondaryOrder` document (which will go through the normal
  Submitted → Approved → Delivered flow, deducting stock in P3), **OR**
- Simply records `replacement_order_id` without touching stock itself.

Either approach is acceptable. The claim record itself must remain stock-neutral.

### 3 — Confirm `DamageClaim.updateStatus()` is stock-neutral

Read the `updateStatus`, `markAsVerified`, `approve`, and `reject` instance methods in the model.
Confirm none call any stock model.

## Expected output

Report one of:

> **PASS**: `damageClaims.js` and `DamageClaim.js` contain zero references to
> `DistributorStock`, `DepotStock`, `reduceStockFIFO`, or `addStockFIFO`.
> Damage claim creation and all status transitions are stock-neutral.

or list the exact lines that need to be removed/changed.

## Reference — damage claim example

```json
POST /api/v1/damage-claims
{
  "outlet_id": "664a1...",
  "distributor_id": "664b2...",
  "items": [{
    "product_id": "664d4...",
    "qty_claimed_pcs": 2,
    "damage_reason": "packaging_damage",
    "notes": "Seal burst during transport",
    "estimated_value_bdt": 1280
  }]
}
```

Expected stock state before: `DistributorStock { sku: "RUPC5L", qty: 10 }`
Expected stock state after claim created: `DistributorStock { sku: "RUPC5L", qty: 10 }` — **unchanged**

## DamageClaim status workflow (for reference, no code changes needed)

```
Pending → Under Review → Verified → Approved → Replaced / Closed
                                              → Rejected  → Closed
```

None of these transitions should touch stock.
