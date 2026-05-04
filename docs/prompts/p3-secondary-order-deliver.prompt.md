---
name: "P3 — POST /:id/deliver (FIFO deduction + price re-evaluation)"
description: "Extend the existing deliver endpoint to deduct DistributorStock via FIFO, re-evaluate price for volatile products, and notify the SO. Use when implementing secondary order delivery."
agent: "agent"
---

Extend `POST /:id/deliver` in [backend/src/routes/secondary-orders.js](../../backend/src/routes/secondary-orders.js).

## Context

- Read [COMMON-SESSION-HANDOVER.md](../../COMMON-SESSION-HANDOVER.md) sections 2 and 5 first.
- **P1 schema prompt must be completed first.**
- `DistributorStock.reduceStockFIFO(qty)` already exists — use it as-is. Never mutate `batches[]` directly (see COMMON-SESSION-HANDOVER gotcha #8).
- The handler already exists and flips `order_status` to `"Delivered"` — **keep that logic, extend around it**.

## New body fields to accept

Add these alongside the existing `delivery_chalan_no` field:

```js
body('items').optional().isArray(),
body('items.*.sku').optional().isString().toUpperCase(),
body('items.*.delivery_qty').optional().isInt({ min: 1 }),
```

`items` is optional — if omitted, treat as full delivery of all ordered quantities.

## Complete replacement for the handler body

Replace everything **inside** the existing `router.post('/:id/deliver', ...)` async handler with the following. Keep the outer `router.post(...)` call and validators:

```js
// Guard
if (!canDeliver(req)) {
  return res.status(403).json({ success: false, message: 'Only Distributor / Admins can mark delivered' });
}
const errors = validationResult(req);
if (!errors.isEmpty()) {
  return res.status(400).json({ success: false, message: 'Validation failed', errors: errors.array() });
}

const scope = accessFilter(req);
if (scope === null) return res.status(403).json({ success: false, message: 'Not allowed' });

const order = await SecondaryOrder.findOne({ _id: req.params.id, ...scope });
if (!order) return res.status(404).json({ success: false, message: 'Order not found' });
if (order.order_status !== 'Approved') {
  return res.status(409).json({
    success: false,
    message: `Cannot deliver an order in status '${order.order_status}'. Must be Approved first.`,
  });
}

const { DistributorStock, Product, Notification } = require('../models');

// Build delivery quantities from body, or default to full order quantities
const deliveryMap = new Map(); // sku → delivery_qty
if (Array.isArray(req.body.items) && req.body.items.length > 0) {
  req.body.items.forEach(it => deliveryMap.set(it.sku.toUpperCase(), it.delivery_qty));
} else {
  order.items.forEach(it => deliveryMap.set(it.sku, it.quantity));
}

// ── Step 1: validate stock availability for ALL items before touching anything ──
const stockDocs = new Map(); // sku → DistributorStock document
const insufficientItems = [];

for (const [sku, deliveryQty] of deliveryMap.entries()) {
  const stock = await DistributorStock.findOne({ distributor_id: order.distributor_id, sku });
  if (!stock || parseFloat(stock.qty) < deliveryQty) {
    insufficientItems.push({
      sku,
      requested: deliveryQty,
      available: stock ? parseFloat(stock.qty) : 0,
    });
  } else {
    stockDocs.set(sku, stock);
  }
}

if (insufficientItems.length > 0) {
  return res.status(409).json({
    success: false,
    code: 'INSUFFICIENT_STOCK',
    message: 'Insufficient stock for one or more SKUs',
    details: insufficientItems,
  });
}

// ── Step 2: deduct stock and compute delivery prices ──
for (const orderItem of order.items) {
  const deliveryQty = deliveryMap.get(orderItem.sku);
  if (!deliveryQty) continue; // item not in this delivery

  // Price re-evaluation
  let deliveryUnitPrice = orderItem.unit_price; // fallback
  if (!order.price_locked) {
    const product = await Product.findOne({ sku: orderItem.sku }).select('trade_price').lean();
    if (product?.trade_price != null) deliveryUnitPrice = product.trade_price;
  }

  // FIFO deduction
  const stock = stockDocs.get(orderItem.sku);
  const result = stock.reduceStockFIFO(deliveryQty);
  // result.success is guaranteed true (we pre-checked above)
  await stock.save();

  // Write delivery fields back onto the order item
  orderItem.delivery_qty          = deliveryQty;
  orderItem.delivery_unit_price   = deliveryUnitPrice;
  orderItem.delivery_subtotal     = deliveryQty * deliveryUnitPrice;
  orderItem.fifo_cogs             = result.costOfGoodsSold;
  orderItem.fifo_batches_used     = result.batchesUsed.map(b => ({
    batch_id:  b.batch_id,
    qty:       b.qty_used,
    unit_cost: b.unit_price,
  }));
}

// ── Step 3: update order header ──
order.delivery_total_amount = order.items.reduce(
  (sum, it) => sum + (it.delivery_subtotal ?? 0), 0
);
order.order_status  = 'Delivered';
order.delivered_by  = req.user._id;
order.delivered_at  = new Date();
order.delivery_date = new Date();
if (req.body.delivery_chalan_no) order.delivery_chalan_no = req.body.delivery_chalan_no;

await order.save();

// ── Step 4: socket event + SO notification ──
if (global.io) {
  global.io.emit('secondary_order:delivered', {
    orderId:         order._id,
    distributor_id:  order.distributor_id,
    so_id:           order.dsr_id,
  });
}

try {
  await Notification.create({
    user_id:    order.dsr_id,
    type:       'order_status',
    title:      'Order Delivered',
    message:    `Order ${order.order_number} has been delivered — Invoice BDT ${order.delivery_total_amount}`,
    priority:   'normal',
    action_url: `/orders/${order._id}`,
    expires_at: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
  });
} catch (notifyErr) {
  console.error('Notify error on deliver:', notifyErr);
}

return res.status(200).json({
  success: true,
  message: 'Order marked delivered',
  data: {
    _id:                   order._id,
    order_status:          order.order_status,
    delivery_total_amount: order.delivery_total_amount,
  },
});
```

## Critical ordering rule

All stock availability checks (Step 1) must complete **before** any `stock.save()` call (Step 2).
If any item has insufficient stock, return 409 immediately — zero stock documents are mutated.

## Verification

1. Approve an order. Change `Product.trade_price` for an oil SKU. Call deliver →  
   `delivery_unit_price` reflects the **new** price; `delivery_total_amount ≠ total_amount`.
2. `DistributorStock.qty` decreases by delivered quantities; `batches[]` empty ones removed.
3. SO's `user_id` has a new notification document.
4. Call deliver with `delivery_qty` exceeding available stock → `409 INSUFFICIENT_STOCK`, `DistributorStock.qty` unchanged.
5. Call deliver on a `"Submitted"` order → `409` (must be Approved first).
