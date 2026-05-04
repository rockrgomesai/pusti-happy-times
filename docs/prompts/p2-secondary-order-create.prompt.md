---
name: "P2 — POST /secondary-orders (Create Endpoint)"
description: "Add the missing create endpoint for secondary sales orders. SO places order, prices snapshotted from Product catalog, Distributor+DSR notified. Use when implementing secondary order creation."
agent: "agent"
---

Add `POST /secondary-orders` to [backend/src/routes/secondary-orders.js](../../backend/src/routes/secondary-orders.js).

## Context

- Read [COMMON-SESSION-HANDOVER.md](../../COMMON-SESSION-HANDOVER.md) sections 2, 5, and 6 first.
- **P1 schema prompt must be completed first** — the new fields must already exist on the model.
- Role: SO only (`SO_ROLES` array is already defined at the top of the file).
- `dsr_id` on `SecondaryOrder` stores the SO's `User._id` (existing naming quirk — do not change).
- Mount point is already registered in `backend/src/routes/index.js` as `/api/v1/secondary-orders`.

## Request body (validate with express-validator `body()`)

| Field | Required | Validation | Notes |
|-------|----------|-----------|-------|
| `outlet_id` | yes | `.isMongoId()` | Must exist and be active |
| `distributor_id` | yes | `.isMongoId()` | |
| `route_id` | no | `.isMongoId()` | |
| `items` | yes | Array, min length 1 | |
| `items[].product_id` | yes | `.isMongoId()` | |
| `items[].sku` | yes | `.isString().notEmpty()` | |
| `items[].quantity` | yes | `.isInt({ min: 1 })` | |
| `so_notes` | no | `.isString().isLength({ max: 1000 })` | |
| `entry_mode` | no | `.isIn(['online','offline','manual'])` | default `'online'` |
| `client_order_uid` | no | `.isString()` | Idempotency key for offline sync |
| `price_locked` | no | `.isBoolean()` | default `false` |

## Handler steps

```js
router.post(
  '/',
  [
    body('outlet_id').isMongoId(),
    body('distributor_id').isMongoId(),
    body('route_id').optional().isMongoId(),
    body('items').isArray({ min: 1 }),
    body('items.*.product_id').isMongoId(),
    body('items.*.sku').isString().notEmpty().toUpperCase(),
    body('items.*.quantity').isInt({ min: 1 }),
    body('so_notes').optional().isString().isLength({ max: 1000 }),
    body('entry_mode').optional().isIn(['online', 'offline', 'manual']),
    body('client_order_uid').optional().isString(),
    body('price_locked').optional().isBoolean(),
  ],
  async (req, res) => {
    // 1. Role guard
    const role = roleOf(req);
    if (!SO_ROLES.includes(role)) {
      return res.status(403).json({ success: false, message: 'Only SOs can create orders' });
    }

    // 2. Validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, message: 'Validation failed', errors: errors.array() });
    }

    const { outlet_id, distributor_id, route_id, items, so_notes, entry_mode = 'online', client_order_uid, price_locked = false } = req.body;

    // 3. Idempotency check (offline sync dedup)
    if (client_order_uid) {
      const existing = await SecondaryOrder.findOne({ client_order_uid }).lean();
      if (existing) return res.status(200).json({ success: true, data: existing });
    }

    // 4. Verify outlet is active
    const { Outlet, Product, Notification, User } = require('../models');
    const outlet = await Outlet.findOne({ _id: outlet_id, active: true }).select('name code').lean();
    if (!outlet) return res.status(404).json({ success: false, message: 'Outlet not found or inactive' });

    // 5. Snapshot prices from Product catalog
    const builtItems = [];
    for (const it of items) {
      const product = await Product.findOne({ _id: it.product_id, active: true }).select('trade_price sku').lean();
      if (!product) {
        return res.status(404).json({ success: false, message: `Product ${it.product_id} not found or inactive` });
      }
      builtItems.push({
        product_id: it.product_id,
        sku: it.sku.toUpperCase(),
        quantity: it.quantity,
        unit_price: product.trade_price,
        subtotal: it.quantity * product.trade_price,
      });
    }

    // 6. Generate order number and create document
    const order_number = await SecondaryOrder.generateOrderNumber();
    const order = new SecondaryOrder({
      order_number,
      outlet_id,
      distributor_id,
      dsr_id: req.user._id,
      route_id: route_id || undefined,
      order_date: new Date(),
      items: builtItems,
      order_status: 'Submitted',
      entry_mode,
      client_order_uid: client_order_uid || undefined,
      price_locked,
      so_notes: so_notes || undefined,
    });
    await order.save(); // pre-save hook computes subtotal + total_amount

    // 7. Notify Distributor + DSR users
    try {
      const recipients = await User.find({
        user_type: 'distributor',
        distributor_id,
        active: true,
      }).select('_id').lean();

      if (recipients.length > 0) {
        await Notification.bulkCreate(recipients.map(u => ({
          user_id: u._id,
          type: 'order_status',
          title: 'New Sales Order',
          message: `Order ${order.order_number} from ${outlet.name} — BDT ${order.total_amount}`,
          priority: 'normal',
          action_url: `/distributor/orders/${order._id}`,
          action_label: 'View Order',
          expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        })));
      }

      if (global.io) {
        global.io.emit('secondary_order:new', {
          orderId: order._id,
          distributor_id,
          order_number: order.order_number,
        });
      }
    } catch (notifyErr) {
      // Notifications are non-critical — log but don't fail the request
      console.error('Notify error on order create:', notifyErr);
    }

    return res.status(201).json({ success: true, data: order });
  }
);
```

## Verification

1. POST as SO → `201`, `order_status: "Submitted"`, each item has `unit_price` from Product catalog.
2. Check `notifications` collection — all User docs with `user_type: 'distributor'` for that distributor have a record.
3. Repeat POST with same `client_order_uid` → `200` with the original document (no duplicate created).
4. POST with inactive outlet → `404`.
5. POST with inactive product → `404`.
