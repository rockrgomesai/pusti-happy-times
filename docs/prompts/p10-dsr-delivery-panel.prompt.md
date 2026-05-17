---
mode: agent
description: Build the DSR Delivery Panel — a mobile screen for DSRs (distributors' delivery staff) to manage daily outlet deliveries. Includes editing delivered qty/damage, cash collection, credit balance tracking, and Confirm/Hold/Bounce actions. No dependency on other P-prompts, but reads SecondaryOrder + DistributorStock models.
---

# P10 — DSR Delivery Panel (DsrDeliveryScreen)

## Context

- Read [COMMON-SESSION-HANDOVER.md](../../COMMON-SESSION-HANDOVER.md) sections 2, 3, and 5 first.
- The **DSR** (Distributor Sales Representative) is a distributor's delivery staff. Their User record has `user_type: "distributor"` and `distributor_id` in context.
- This prompt is independent of P3 (which extends the web-portal deliver endpoint). P10 creates **new mobile-only routes** under `/mobile/dsr/`.
- `DistributorStock.reduceStockFIFO(qty)` already exists — use it for stock deduction on confirm.
- Financial formula from the screen:  
  - `payable = total_amount - extra_delivery_discount`  
  - `total_payable = payable + credit_balance_before`  
  - `credit_balance_after = total_payable - cash_collected`

---

## Step 1 — Extend `SecondaryOrder` model

File: `backend/src/models/SecondaryOrder.js`

### 1a — Add `'Hold'` and `'Bounced'` to the `order_status` enum

Find the `order_status` field and change its `values` array:
```js
// BEFORE:
values: ["Submitted", "Approved", "Cancelled", "Delivered"],

// AFTER:
values: ["Submitted", "Approved", "Cancelled", "Delivered", "Hold", "Bounced"],
```

### 1b — Add delivery detail fields after the `delivered_at` field

```js
// Actual delivery items — may differ from ordered `items[]`.
// Empty array means full delivery was made without qty changes.
delivery_items: [
  {
    product_id: { type: mongoose.Schema.Types.ObjectId, ref: "Product" },
    sku:             { type: String, uppercase: true, trim: true },
    ordered_qty:     { type: Number, default: 0 },
    delivered_qty:   { type: Number, default: 0 },
    damage_qty:      { type: Number, default: 0 },
    unit_price:      { type: Number, default: 0 },
    extra_item_discount: { type: Number, default: 0 },
    line_total:      { type: Number, default: 0 },
    is_extra_item:   { type: Boolean, default: false },  // true = added by DSR at delivery
  },
],

// Order-level delivery financials
cash_collected:          { type: Number, default: 0 },
extra_delivery_discount: { type: Number, default: 0 },
payable_amount:          { type: Number, default: 0 },
credit_balance_before:   { type: Number, default: 0 },
credit_balance_after:    { type: Number, default: 0 },

// Status reasons
hold_reason:    { type: String, trim: true },
bounced_reason: { type: String, trim: true },
```

---

## Step 2 — Create `backend/src/routes/mobile/dsr-delivery.js`

```js
/**
 * Mobile DSR Delivery Routes
 * Used by DSR mobile app for daily delivery management
 * Mounted at: /api/v1/mobile/dsr
 */
const express = require("express");
const router  = express.Router();
const { param, body, validationResult } = require("express-validator");
const mongoose = require("mongoose");
const { authenticate } = require("../../middleware/auth");
const SecondaryOrder  = require("../../models/SecondaryOrder");
const DistributorStock = require("../../models/DistributorStock");
const Product = require("../../models/Product");

// Only DSR / Distributor users may call these endpoints.
function guardDsr(req, res, next) {
  const type = req.user?.user_type;
  if (type !== "distributor" && type !== "dsr") {
    return res.status(403).json({ success: false, message: "DSR access only" });
  }
  next();
}

function distId(req) {
  return req.user?.distributor_id || req.userContext?.distributor_id || null;
}

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/v1/mobile/dsr/schedule
// Returns today's (and optionally a given date's) Approved orders for the
// DSR's distributor, grouped for the delivery run.
// Query: date? (YYYY-MM-DD, defaults to today)
// ─────────────────────────────────────────────────────────────────────────────
router.get("/schedule", authenticate, guardDsr, async (req, res) => {
  try {
    const did = distId(req);
    if (!did) return res.status(400).json({ success: false, message: "distributor_id missing from user context" });

    const date = req.query.date ? new Date(req.query.date) : new Date();
    const dayStart = new Date(date); dayStart.setHours(0, 0, 0, 0);
    const dayEnd   = new Date(date); dayEnd.setHours(23, 59, 59, 999);

    // Approved orders for this distributor placed today (or on the requested date)
    const orders = await SecondaryOrder.find({
      distributor_id: did,
      order_status:   { $in: ["Approved", "Hold"] },
      order_date:     { $gte: dayStart, $lte: dayEnd },
    })
      .sort({ order_date: 1 })
      .select("order_number outlet_id order_date total_amount order_status items credit_balance_after")
      .populate("outlet_id", "name code address phone")
      .populate("items.product_id", "sku bangla_name english_name image_url ctn_pcs")
      .lean();

    // Attach quick counts
    const total     = orders.length;
    const pending   = orders.filter(o => o.order_status === "Approved").length;
    const on_hold   = orders.filter(o => o.order_status === "Hold").length;

    res.json({
      success: true,
      data: {
        orders,
        summary: { total, pending, on_hold, confirmed: 0, bounced: 0 },
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: "Failed to load schedule", error: err.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/v1/mobile/dsr/outlet-credit/:outlet_id
// Returns the latest credit_balance_after for this outlet+distributor so the
// DSR app can prefill "Prev. Credit" without the DSR manually typing it.
// ─────────────────────────────────────────────────────────────────────────────
router.get(
  "/outlet-credit/:outlet_id",
  authenticate,
  guardDsr,
  [param("outlet_id").isMongoId()],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) return res.status(400).json({ success: false, errors: errors.array() });

      const did = distId(req);
      const lastDelivered = await SecondaryOrder.findOne({
        outlet_id:      req.params.outlet_id,
        distributor_id: did,
        order_status:   "Delivered",
      })
        .sort({ delivered_at: -1 })
        .select("credit_balance_after delivered_at")
        .lean();

      res.json({
        success: true,
        data: {
          credit_balance: lastDelivered?.credit_balance_after ?? 0,
          as_of:          lastDelivered?.delivered_at ?? null,
        },
      });
    } catch (err) {
      res.status(500).json({ success: false, message: "Failed to fetch outlet credit", error: err.message });
    }
  }
);

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/v1/mobile/dsr/catalog-search
// Lightweight product search for the "Add Extra SKU" modal.
// Query: q (sku or name fragment), distributor_id (to check stock)
// ─────────────────────────────────────────────────────────────────────────────
router.get("/catalog-search", authenticate, guardDsr, async (req, res) => {
  try {
    const did = distId(req);
    const q   = (req.query.q || "").toString().trim();
    if (!q) return res.json({ success: true, data: [] });

    const products = await Product.find({
      active: true,
      $or: [
        { sku:          { $regex: q, $options: "i" } },
        { bangla_name:  { $regex: q, $options: "i" } },
        { english_name: { $regex: q, $options: "i" } },
      ],
    })
      .select("_id sku bangla_name english_name image_url trade_price ctn_pcs")
      .limit(20)
      .lean();

    // Attach available stock for each product
    const skus   = products.map(p => p.sku);
    const stocks = await DistributorStock.find({ distributor_id: did, sku: { $in: skus }, active: true })
      .select("sku qty")
      .lean();
    const stockMap = new Map(stocks.map(s => [s.sku, parseFloat(s.qty?.toString() || "0")]));

    const result = products.map(p => ({
      ...p,
      available_qty: stockMap.get(p.sku) ?? 0,
    }));

    res.json({ success: true, data: result });
  } catch (err) {
    res.status(500).json({ success: false, message: "Search failed", error: err.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/v1/mobile/dsr/orders/:id/confirm
// DSR confirms delivery. Captures actual qtys, damage, extra discount,
// cash collected, and credit balance. Deducts stock via FIFO.
//
// Body:
// {
//   delivery_items: [{ product_id, sku, ordered_qty, delivered_qty, damage_qty,
//                       unit_price, extra_item_discount, is_extra_item }],
//   extra_delivery_discount: 0,
//   cash_collected: 800,
//   credit_balance_before: 500,
// }
// ─────────────────────────────────────────────────────────────────────────────
router.post(
  "/orders/:id/confirm",
  authenticate,
  guardDsr,
  [
    param("id").isMongoId(),
    body("delivery_items").isArray({ min: 1 }),
    body("delivery_items.*.sku").notEmpty().isString().toUpperCase(),
    body("delivery_items.*.delivered_qty").isInt({ min: 0 }),
    body("delivery_items.*.damage_qty").optional().isInt({ min: 0 }),
    body("delivery_items.*.unit_price").isFloat({ min: 0 }),
    body("delivery_items.*.extra_item_discount").optional().isFloat({ min: 0 }),
    body("delivery_items.*.is_extra_item").optional().isBoolean(),
    body("extra_delivery_discount").optional().isFloat({ min: 0 }),
    body("cash_collected").isFloat({ min: 0 }),
    body("credit_balance_before").isFloat({ min: 0 }),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) return res.status(400).json({ success: false, errors: errors.array() });

      const did = distId(req);
      const order = await SecondaryOrder.findOne({ _id: req.params.id, distributor_id: did });
      if (!order) return res.status(404).json({ success: false, message: "Order not found" });
      if (!["Approved", "Hold"].includes(order.order_status)) {
        return res.status(409).json({
          success: false,
          message: `Cannot confirm an order in status '${order.order_status}'`,
        });
      }

      const {
        delivery_items,
        extra_delivery_discount = 0,
        cash_collected,
        credit_balance_before,
      } = req.body;

      // ── Stock deduction — validate ALL items first, then deduct ─────────────
      const insufficient = [];
      for (const item of delivery_items) {
        if (item.delivered_qty <= 0) continue;
        const stock = await DistributorStock.findOne({ distributor_id: did, sku: item.sku });
        const available = stock ? parseFloat(stock.qty?.toString() || "0") : 0;
        if (available < item.delivered_qty) {
          insufficient.push({ sku: item.sku, requested: item.delivered_qty, available });
        }
      }
      if (insufficient.length > 0) {
        return res.status(409).json({
          success: false,
          message: "Insufficient stock for one or more items",
          insufficient,
        });
      }

      for (const item of delivery_items) {
        if (item.delivered_qty <= 0) continue;
        const stock = await DistributorStock.findOne({ distributor_id: did, sku: item.sku });
        if (stock) await stock.reduceStockFIFO(item.delivered_qty);
      }

      // ── Compute financials ────────────────────────────────────────────────
      const deliveredItems = delivery_items.map(item => ({
        product_id:          item.product_id,
        sku:                 item.sku.toUpperCase(),
        ordered_qty:         item.ordered_qty   ?? 0,
        delivered_qty:       item.delivered_qty ?? 0,
        damage_qty:          item.damage_qty    ?? 0,
        unit_price:          item.unit_price,
        extra_item_discount: item.extra_item_discount ?? 0,
        line_total:          item.delivered_qty * item.unit_price - (item.extra_item_discount ?? 0),
        is_extra_item:       !!item.is_extra_item,
      }));

      const gross_delivered    = deliveredItems.reduce((s, i) => s + i.line_total, 0);
      const payable_amount     = gross_delivered - extra_delivery_discount;
      const total_payable      = payable_amount + Number(credit_balance_before);
      const credit_balance_after = total_payable - Number(cash_collected);

      // ── Persist ──────────────────────────────────────────────────────────
      order.order_status           = "Delivered";
      order.delivery_items         = deliveredItems;
      order.extra_delivery_discount = Number(extra_delivery_discount);
      order.cash_collected         = Number(cash_collected);
      order.payable_amount         = payable_amount;
      order.credit_balance_before  = Number(credit_balance_before);
      order.credit_balance_after   = credit_balance_after;
      order.delivered_by           = req.user._id;
      order.delivered_at           = new Date();
      order.delivery_date          = new Date();
      await order.save();

      res.json({
        success: true,
        message: "Delivery confirmed",
        data: {
          _id:                  order._id,
          order_status:         order.order_status,
          payable_amount,
          cash_collected:       Number(cash_collected),
          credit_balance_after,
        },
      });
    } catch (err) {
      res.status(500).json({ success: false, message: "Confirm failed", error: err.message });
    }
  }
);

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/v1/mobile/dsr/orders/:id/bounce
// Body: { reason: string }
// ─────────────────────────────────────────────────────────────────────────────
router.post(
  "/orders/:id/bounce",
  authenticate,
  guardDsr,
  [param("id").isMongoId(), body("reason").notEmpty().isString().isLength({ max: 500 })],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) return res.status(400).json({ success: false, errors: errors.array() });

      const order = await SecondaryOrder.findOne({ _id: req.params.id, distributor_id: distId(req) });
      if (!order) return res.status(404).json({ success: false, message: "Order not found" });
      if (!["Approved", "Hold"].includes(order.order_status)) {
        return res.status(409).json({ success: false, message: `Cannot bounce order in status '${order.order_status}'` });
      }

      order.order_status   = "Bounced";
      order.bounced_reason = req.body.reason;
      order.delivered_by   = req.user._id;
      order.delivered_at   = new Date();
      await order.save();

      res.json({ success: true, message: "Order bounced", data: { _id: order._id, order_status: order.order_status } });
    } catch (err) {
      res.status(500).json({ success: false, message: "Bounce failed", error: err.message });
    }
  }
);

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/v1/mobile/dsr/orders/:id/hold
// Body: { reason: string }
// ─────────────────────────────────────────────────────────────────────────────
router.post(
  "/orders/:id/hold",
  authenticate,
  guardDsr,
  [param("id").isMongoId(), body("reason").notEmpty().isString().isLength({ max: 500 })],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) return res.status(400).json({ success: false, errors: errors.array() });

      const order = await SecondaryOrder.findOne({ _id: req.params.id, distributor_id: distId(req) });
      if (!order) return res.status(404).json({ success: false, message: "Order not found" });
      if (order.order_status !== "Approved") {
        return res.status(409).json({ success: false, message: `Cannot hold order in status '${order.order_status}'` });
      }

      order.order_status = "Hold";
      order.hold_reason  = req.body.reason;
      await order.save();

      res.json({ success: true, message: "Order put on hold", data: { _id: order._id, order_status: order.order_status } });
    } catch (err) {
      res.status(500).json({ success: false, message: "Hold failed", error: err.message });
    }
  }
);

module.exports = router;
```

---

## Step 3 — Mount in `backend/src/routes/index.js`

In the import block (near the other mobile route imports):
```js
const mobileDsrDeliveryRoutes = require("./mobile/dsr-delivery");
```

In the mount block (after `router.use("/mobile/orders", mobileOrdersRoutes)`):
```js
router.use("/mobile/dsr", mobileDsrDeliveryRoutes);
```

---

## Step 4 — Create `mobile/src/services/dsrDeliveryAPI.ts`

```typescript
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_BASE_URL } from '../config/api';

export interface DeliveryOrderItem {
  product_id: string;
  sku: string;
  bangla_name: string;
  english_name: string;
  image_url?: string;
  ordered_qty: number;
  unit_price: number;
  ctn_pcs?: number;
}

export interface ScheduleOrder {
  _id: string;
  order_number: string;
  order_status: 'Approved' | 'Hold' | 'Delivered' | 'Bounced';
  order_date: string;
  total_amount: number;
  credit_balance_after: number;
  outlet_id: {
    _id: string;
    name: string;
    code: string;
    address?: string;
    phone?: string;
  };
  items: (DeliveryOrderItem & { product_id: any })[];
}

export interface DeliveryItemInput {
  product_id: string;
  sku: string;
  ordered_qty: number;
  delivered_qty: number;
  damage_qty: number;
  unit_price: number;
  extra_item_discount: number;
  is_extra_item: boolean;
}

export interface ConfirmDeliveryPayload {
  delivery_items:          DeliveryItemInput[];
  extra_delivery_discount: number;
  cash_collected:          number;
  credit_balance_before:   number;
}

export interface CatalogProduct {
  _id: string;
  sku: string;
  bangla_name: string;
  english_name: string;
  image_url?: string;
  trade_price: number;
  ctn_pcs?: number;
  available_qty: number;
}

async function authHeaders() {
  const token = await AsyncStorage.getItem('@auth_token');
  return { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
}

export async function fetchSchedule(date?: string): Promise<ScheduleOrder[]> {
  const headers = await authHeaders();
  const query   = date ? `?date=${date}` : '';
  const res     = await fetch(`${API_BASE_URL}/api/v1/mobile/dsr/schedule${query}`, { headers });
  const json    = await res.json();
  if (!json.success) throw new Error(json.message);
  return json.data.orders;
}

export async function fetchOutletCredit(outletId: string): Promise<number> {
  const headers = await authHeaders();
  const res     = await fetch(`${API_BASE_URL}/api/v1/mobile/dsr/outlet-credit/${outletId}`, { headers });
  const json    = await res.json();
  if (!json.success) throw new Error(json.message);
  return json.data.credit_balance ?? 0;
}

export async function searchCatalog(q: string): Promise<CatalogProduct[]> {
  const headers = await authHeaders();
  const res     = await fetch(`${API_BASE_URL}/api/v1/mobile/dsr/catalog-search?q=${encodeURIComponent(q)}`, { headers });
  const json    = await res.json();
  if (!json.success) throw new Error(json.message);
  return json.data;
}

export async function confirmDelivery(orderId: string, payload: ConfirmDeliveryPayload) {
  const headers = await authHeaders();
  const res = await fetch(`${API_BASE_URL}/api/v1/mobile/dsr/orders/${orderId}/confirm`, {
    method:  'POST',
    headers,
    body:    JSON.stringify(payload),
  });
  const json = await res.json();
  if (!json.success) throw new Error(json.message);
  return json.data;
}

export async function bounceOrder(orderId: string, reason: string) {
  const headers = await authHeaders();
  const res = await fetch(`${API_BASE_URL}/api/v1/mobile/dsr/orders/${orderId}/bounce`, {
    method:  'POST',
    headers,
    body:    JSON.stringify({ reason }),
  });
  const json = await res.json();
  if (!json.success) throw new Error(json.message);
  return json.data;
}

export async function holdOrder(orderId: string, reason: string) {
  const headers = await authHeaders();
  const res = await fetch(`${API_BASE_URL}/api/v1/mobile/dsr/orders/${orderId}/hold`, {
    method:  'POST',
    headers,
    body:    JSON.stringify({ reason }),
  });
  const json = await res.json();
  if (!json.success) throw new Error(json.message);
  return json.data;
}
```

---

## Step 5 — Create `mobile/src/screens/DsrDeliveryScreen.tsx`

### Layout overview

```
SafeAreaView
 ├── Header (gradient blue: #1a237e → #1976d2)
 │    ├── Back button
 │    ├── "DSR Delivery" title
 │    └── Date chip (today's date, e.g. "20 Jul 2025 — Sunday")
 ├── Summary bar (horizontal, 4 stat chips)
 │    Total | Pending | Confirmed | Bounced
 └── FlatList of outlet cards
      └── Each card → tap → opens DeliveryModal (full-screen Modal)
```

### Types

```typescript
type OrderStatus = 'Approved' | 'Hold' | 'Delivered' | 'Bounced';

interface DeliveryRow {
  product_id:          string;
  sku:                 string;
  bangla_name:         string;
  english_name:        string;
  image_url?:          string;
  ordered_qty:         number;
  delivered_qty:       number;    // editable
  damage_qty:          number;    // editable
  unit_price:          number;
  extra_item_discount: number;    // editable
  is_extra_item:       boolean;
}
```

### State

```typescript
const [orders,       setOrders]       = useState<ScheduleOrder[]>([]);
const [loading,      setLoading]      = useState(true);
const [refreshing,   setRefreshing]   = useState(false);
const [selectedOrder,setSelectedOrder]= useState<ScheduleOrder | null>(null);
const [modalVisible, setModalVisible] = useState(false);

// Modal state
const [deliveryRows,         setDeliveryRows]         = useState<DeliveryRow[]>([]);
const [cashCollected,        setCashCollected]         = useState('0');
const [creditBalanceBefore,  setCreditBalanceBefore]   = useState(0);
const [extraDeliveryDiscount,setExtraDeliveryDiscount] = useState('0');
const [submitting,           setSubmitting]            = useState(false);
const [reasonModalVisible,   setReasonModalVisible]    = useState(false);
const [pendingAction,        setPendingAction]         = useState<'bounce' | 'hold' | null>(null);
const [reason,               setReason]                = useState('');
const [addSkuVisible,        setAddSkuVisible]         = useState(false);
const [searchQuery,          setSearchQuery]           = useState('');
const [searchResults,        setSearchResults]         = useState<CatalogProduct[]>([]);
```

### Derived financials (compute on every render — no useMemo needed for a list this size)

```typescript
const totalOrderValue = deliveryRows.reduce(
  (sum, r) => sum + r.delivered_qty * r.unit_price - r.extra_item_discount, 0
);
const payable          = totalOrderValue - Number(extraDeliveryDiscount || 0);
const totalPayable     = payable + creditBalanceBefore;
const creditBalanceAfter = totalPayable - Number(cashCollected || 0);
```

### Outlet card render

```tsx
const statusColor: Record<OrderStatus, string> = {
  Approved:  '#1565c0',
  Hold:      '#f57c00',
  Delivered: '#2e7d32',
  Bounced:   '#c62828',
};

const renderOutletCard = ({ item }: { item: ScheduleOrder }) => (
  <TouchableOpacity
    style={[styles.outletCard, { borderLeftColor: statusColor[item.order_status] }]}
    onPress={() => openModal(item)}
    activeOpacity={0.8}>
    <View style={{ flex: 1 }}>
      <Text style={styles.outletName}>{item.outlet_id.name}</Text>
      <Text style={styles.outletAddress}>{item.outlet_id.address}</Text>
      <Text style={styles.outletOrderNum}>#{item.order_number}</Text>
    </View>
    <View style={{ alignItems: 'flex-end' }}>
      <View style={[styles.statusChip, { backgroundColor: statusColor[item.order_status] + '22' }]}>
        <Text style={[styles.statusChipText, { color: statusColor[item.order_status] }]}>
          {item.order_status}
        </Text>
      </View>
      <Text style={styles.orderAmount}>৳{item.total_amount.toLocaleString()}</Text>
      <Text style={styles.orderPcs}>
        {item.items.reduce((s, i) => s + (i.ordered_qty || 0), 0)} pcs
      </Text>
    </View>
  </TouchableOpacity>
);
```

### openModal (loads outlet credit + prefills rows)

```typescript
const openModal = async (order: ScheduleOrder) => {
  setSelectedOrder(order);
  // Prefill delivery rows from ordered items
  const rows: DeliveryRow[] = order.items.map(item => ({
    product_id:          item.product_id._id ?? item.product_id,
    sku:                 item.sku,
    bangla_name:         item.product_id.bangla_name ?? item.bangla_name ?? '',
    english_name:        item.product_id.english_name ?? item.english_name ?? '',
    image_url:           item.product_id.image_url,
    ordered_qty:         item.ordered_qty ?? item.quantity ?? 0,
    delivered_qty:       item.ordered_qty ?? item.quantity ?? 0,  // default = full delivery
    damage_qty:          0,
    unit_price:          item.unit_price,
    extra_item_discount: 0,
    is_extra_item:       false,
  }));
  setDeliveryRows(rows);
  setCashCollected('0');
  setExtraDeliveryDiscount('0');
  setReason('');

  // Fetch outlet credit balance
  try {
    const credit = await fetchOutletCredit(order.outlet_id._id);
    setCreditBalanceBefore(credit);
  } catch {
    setCreditBalanceBefore(0);
  }

  setModalVisible(true);
};
```

### Product row inside modal

Each product is rendered in a horizontal scrollable row:

```tsx
const renderProductRow = (row: DeliveryRow, index: number) => (
  <View key={row.sku + index} style={styles.productRow}>
    {/* Product image */}
    <Image
      source={row.image_url ? { uri: row.image_url } : require('../assets/images/default-product.png')}
      style={styles.productThumb}
    />

    {/* Product info */}
    <View style={styles.productInfo}>
      <Text style={styles.productName} numberOfLines={2}>{row.bangla_name}</Text>
      <Text style={styles.productSku}>{row.sku}  ৳{row.unit_price}</Text>
      {row.is_extra_item && (
        <Text style={styles.extraBadge}>Extra</Text>
      )}
    </View>

    {/* Ordered qty (read-only) */}
    <View style={styles.qtyBlock}>
      <Text style={styles.qtyLabel}>Ordered</Text>
      <Text style={styles.qtyValue}>{row.ordered_qty}</Text>
    </View>

    {/* Delivered qty (editable) */}
    <View style={styles.qtyBlock}>
      <Text style={styles.qtyLabel}>Delivered</Text>
      <TextInput
        style={styles.qtyInput}
        keyboardType="numeric"
        value={String(row.delivered_qty)}
        onChangeText={v => updateRow(index, 'delivered_qty', Number(v) || 0)}
      />
    </View>

    {/* Damage qty (editable) */}
    <View style={styles.qtyBlock}>
      <Text style={styles.qtyLabel}>Damage</Text>
      <TextInput
        style={[styles.qtyInput, row.damage_qty > 0 && styles.qtyInputWarning]}
        keyboardType="numeric"
        value={String(row.damage_qty)}
        onChangeText={v => updateRow(index, 'damage_qty', Number(v) || 0)}
      />
    </View>

    {/* Extra discount (editable) */}
    <View style={styles.qtyBlock}>
      <Text style={styles.qtyLabel}>ExDisc</Text>
      <TextInput
        style={styles.qtyInput}
        keyboardType="numeric"
        value={String(row.extra_item_discount)}
        onChangeText={v => updateRow(index, 'extra_item_discount', Number(v) || 0)}
      />
    </View>

    {/* Line total */}
    <View style={[styles.qtyBlock, { minWidth: 60 }]}>
      <Text style={styles.qtyLabel}>Total</Text>
      <Text style={styles.qtyTotal}>
        ৳{(row.delivered_qty * row.unit_price - row.extra_item_discount).toFixed(0)}
      </Text>
    </View>

    {/* Remove extra-item row */}
    {row.is_extra_item && (
      <TouchableOpacity onPress={() => removeRow(index)} style={{ padding: 4 }}>
        <Text style={{ color: '#c62828', fontSize: 18 }}>✕</Text>
      </TouchableOpacity>
    )}
  </View>
);
```

### Financial summary card

```tsx
<View style={styles.financialCard}>
  <View style={styles.financialRow}>
    <Text style={styles.finLabel}>Total Delivered</Text>
    <Text style={styles.finValue}>৳{totalOrderValue.toFixed(2)}</Text>
  </View>
  <View style={styles.financialRow}>
    <Text style={styles.finLabel}>Extra Discount</Text>
    <TextInput
      style={styles.finInput}
      keyboardType="numeric"
      value={extraDeliveryDiscount}
      onChangeText={setExtraDeliveryDiscount}
      placeholder="0"
    />
  </View>
  <View style={[styles.financialRow, styles.financialDivider]}>
    <Text style={[styles.finLabel, { fontWeight: '700' }]}>Payable</Text>
    <Text style={[styles.finValue, { color: '#1565c0', fontWeight: '700' }]}>
      ৳{payable.toFixed(2)}
    </Text>
  </View>
  <View style={styles.financialRow}>
    <Text style={styles.finLabel}>Prev. Credit</Text>
    <Text style={styles.finValue}>৳{creditBalanceBefore.toFixed(2)}</Text>
  </View>
  <View style={styles.financialRow}>
    <Text style={[styles.finLabel, { fontWeight: '700' }]}>Total Payable</Text>
    <Text style={[styles.finValue, { fontWeight: '700' }]}>৳{totalPayable.toFixed(2)}</Text>
  </View>
  <View style={[styles.financialRow, styles.financialHighlight]}>
    <Text style={styles.finLabel}>Cash Collected</Text>
    <TextInput
      style={[styles.finInput, styles.finInputCash]}
      keyboardType="numeric"
      value={cashCollected}
      onChangeText={setCashCollected}
      placeholder="0"
    />
  </View>
  <View style={styles.financialRow}>
    <Text style={styles.finLabel}>Credit Balance</Text>
    <Text style={[
      styles.finValue,
      { color: creditBalanceAfter > 0 ? '#c62828' : '#2e7d32', fontWeight: '700' },
    ]}>
      ৳{creditBalanceAfter.toFixed(2)}
    </Text>
  </View>
</View>
```

### Action buttons

```tsx
<View style={styles.actionRow}>
  <TouchableOpacity
    style={[styles.actionBtn, styles.btnBounced]}
    onPress={() => { setPendingAction('bounce'); setReasonModalVisible(true); }}>
    <Text style={styles.actionBtnText}>Bounced</Text>
  </TouchableOpacity>

  <TouchableOpacity
    style={[styles.actionBtn, styles.btnHold]}
    onPress={() => { setPendingAction('hold'); setReasonModalVisible(true); }}>
    <Text style={styles.actionBtnText}>Hold</Text>
  </TouchableOpacity>

  <TouchableOpacity
    style={[styles.actionBtn, styles.btnConfirm]}
    onPress={handleConfirm}
    disabled={submitting}>
    {submitting
      ? <ActivityIndicator color="#fff" />
      : <Text style={[styles.actionBtnText, { fontSize: 16 }]}>✓ Confirm</Text>}
  </TouchableOpacity>
</View>
```

### handleConfirm

```typescript
const handleConfirm = async () => {
  if (!selectedOrder) return;
  if (deliveryRows.every(r => r.delivered_qty === 0)) {
    Alert.alert('No Items', 'All delivered quantities are 0. Use Bounce instead.');
    return;
  }
  setSubmitting(true);
  try {
    await confirmDelivery(selectedOrder._id, {
      delivery_items:           deliveryRows.map(r => ({ ...r })),
      extra_delivery_discount:  Number(extraDeliveryDiscount || 0),
      cash_collected:           Number(cashCollected || 0),
      credit_balance_before:    creditBalanceBefore,
    });
    setModalVisible(false);
    Alert.alert('Delivered ✓', `${selectedOrder.outlet_id.name} — delivery confirmed.`);
    await loadSchedule();
  } catch (err: any) {
    Alert.alert('Error', err.message || 'Confirm failed');
  } finally {
    setSubmitting(false);
  }
};
```

### Reason modal (shared by Bounce + Hold)

```tsx
<Modal visible={reasonModalVisible} transparent animationType="fade">
  <View style={styles.reasonOverlay}>
    <View style={styles.reasonCard}>
      <Text style={styles.reasonTitle}>
        {pendingAction === 'bounce' ? 'Reason for Bounce' : 'Reason for Hold'}
      </Text>
      <TextInput
        style={styles.reasonInput}
        multiline
        numberOfLines={3}
        placeholder="Enter reason..."
        value={reason}
        onChangeText={setReason}
      />
      <View style={styles.reasonButtons}>
        <TouchableOpacity
          style={styles.reasonCancel}
          onPress={() => setReasonModalVisible(false)}>
          <Text>Cancel</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.reasonConfirm,
            pendingAction === 'bounce' ? styles.btnBounced : styles.btnHold,
          ]}
          onPress={handleReasonSubmit}
          disabled={!reason.trim()}>
          <Text style={{ color: '#fff' }}>Confirm</Text>
        </TouchableOpacity>
      </View>
    </View>
  </View>
</Modal>
```

### Add Extra SKU modal

```tsx
<Modal visible={addSkuVisible} transparent animationType="slide">
  <View style={styles.addSkuSheet}>
    <TextInput
      style={styles.searchInput}
      placeholder="Search SKU or product name..."
      value={searchQuery}
      onChangeText={async q => {
        setSearchQuery(q);
        if (q.length >= 2) {
          const results = await searchCatalog(q);
          setSearchResults(results);
        } else {
          setSearchResults([]);
        }
      }}
      autoFocus
    />
    <FlatList
      data={searchResults}
      keyExtractor={p => p._id}
      renderItem={({ item }) => (
        <TouchableOpacity
          style={styles.searchResultRow}
          onPress={() => addExtraProduct(item)}>
          <Text style={styles.searchResultName}>{item.bangla_name}</Text>
          <Text style={styles.searchResultSku}>{item.sku}  —  ৳{item.trade_price}</Text>
          <Text style={styles.searchResultStock}>Stock: {item.available_qty} pcs</Text>
        </TouchableOpacity>
      )}
    />
    <TouchableOpacity style={styles.closeBtn} onPress={() => setAddSkuVisible(false)}>
      <Text style={{ color: '#1565c0', fontWeight: '700' }}>Close</Text>
    </TouchableOpacity>
  </View>
</Modal>
```

`addExtraProduct(product)` pushes a new `DeliveryRow` with `is_extra_item: true`, `ordered_qty: 0`, `delivered_qty: 1`.

### Key StyleSheet entries

```typescript
const styles = StyleSheet.create({
  // Header
  header:          { backgroundColor: '#1a237e', paddingHorizontal: 16, paddingVertical: 14, flexDirection: 'row', alignItems: 'center' },
  headerTitle:     { color: '#fff', fontSize: 18, fontWeight: '700', flex: 1, marginLeft: 12 },
  headerDate:      { backgroundColor: 'rgba(255,255,255,0.18)', borderRadius: 12, paddingHorizontal: 10, paddingVertical: 4 },
  headerDateText:  { color: '#fff', fontSize: 12 },

  // Summary bar
  summaryBar:      { flexDirection: 'row', backgroundColor: '#283593', paddingHorizontal: 12, paddingVertical: 8, justifyContent: 'space-around' },
  statChip:        { alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.12)', borderRadius: 8, paddingHorizontal: 14, paddingVertical: 6 },
  statValue:       { color: '#fff', fontSize: 18, fontWeight: '700' },
  statLabel:       { color: '#b3c5ff', fontSize: 10, marginTop: 2 },

  // Outlet card
  outletCard:      { backgroundColor: '#fff', marginHorizontal: 12, marginTop: 8, borderRadius: 10, padding: 14, flexDirection: 'row', borderLeftWidth: 4, elevation: 2, shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 4 },
  outletName:      { fontSize: 15, fontWeight: '700', color: '#1a1a2e' },
  outletAddress:   { fontSize: 12, color: '#666', marginTop: 2 },
  outletOrderNum:  { fontSize: 11, color: '#999', marginTop: 4 },
  statusChip:      { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3, marginBottom: 4 },
  statusChipText:  { fontSize: 11, fontWeight: '700' },
  orderAmount:     { fontSize: 16, fontWeight: '700', color: '#1a237e' },
  orderPcs:        { fontSize: 12, color: '#777', marginTop: 2 },

  // Product row (horizontal scroll inside modal)
  productRow:      { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, paddingHorizontal: 8, borderBottomWidth: 1, borderColor: '#f0f0f0', backgroundColor: '#fff' },
  productThumb:    { width: 42, height: 42, borderRadius: 6, marginRight: 10, backgroundColor: '#eee' },
  productInfo:     { width: 120, marginRight: 8 },
  productName:     { fontSize: 12, fontWeight: '600', color: '#222' },
  productSku:      { fontSize: 10, color: '#777', marginTop: 2 },
  extraBadge:      { fontSize: 9, color: '#fff', backgroundColor: '#1565c0', borderRadius: 4, paddingHorizontal: 4, paddingVertical: 1, alignSelf: 'flex-start', marginTop: 2 },
  qtyBlock:        { alignItems: 'center', minWidth: 52, marginHorizontal: 4 },
  qtyLabel:        { fontSize: 9, color: '#999', marginBottom: 4 },
  qtyValue:        { fontSize: 14, color: '#444' },
  qtyInput:        { borderWidth: 1, borderColor: '#ccc', borderRadius: 6, textAlign: 'center', width: 48, height: 34, fontSize: 14, backgroundColor: '#fafafa', color: '#111' },
  qtyInputWarning: { borderColor: '#f57c00', backgroundColor: '#fff3e0' },
  qtyTotal:        { fontSize: 13, fontWeight: '700', color: '#1a237e' },

  // Financial card
  financialCard:      { margin: 12, backgroundColor: '#fff', borderRadius: 12, elevation: 2, padding: 16 },
  financialRow:       { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 6 },
  financialDivider:   { borderTopWidth: 1, borderColor: '#e0e0e0', marginTop: 4, paddingTop: 10 },
  financialHighlight: { backgroundColor: '#e8f5e9', borderRadius: 8, paddingHorizontal: 8, marginHorizontal: -8 },
  finLabel:           { fontSize: 14, color: '#555' },
  finValue:           { fontSize: 14, color: '#222' },
  finInput:           { borderWidth: 1, borderColor: '#bbb', borderRadius: 6, paddingHorizontal: 10, paddingVertical: 4, minWidth: 80, textAlign: 'right', fontSize: 14, color: '#111' },
  finInputCash:       { borderColor: '#43a047', borderWidth: 2 },

  // Action buttons
  actionRow:    { flexDirection: 'row', padding: 12, gap: 8, backgroundColor: '#fff', borderTopWidth: 1, borderColor: '#eee' },
  actionBtn:    { flex: 1, borderRadius: 10, paddingVertical: 14, alignItems: 'center', justifyContent: 'center' },
  actionBtnText:{ color: '#fff', fontWeight: '700', fontSize: 14 },
  btnBounced:   { backgroundColor: '#c62828' },
  btnHold:      { backgroundColor: '#f57c00' },
  btnConfirm:   { backgroundColor: '#2e7d32', flex: 1.4 },

  // Reason modal
  reasonOverlay:  { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 24 },
  reasonCard:     { backgroundColor: '#fff', borderRadius: 16, padding: 20 },
  reasonTitle:    { fontSize: 16, fontWeight: '700', marginBottom: 12, color: '#1a1a2e' },
  reasonInput:    { borderWidth: 1, borderColor: '#ccc', borderRadius: 8, padding: 10, minHeight: 80, textAlignVertical: 'top' },
  reasonButtons:  { flexDirection: 'row', justifyContent: 'flex-end', gap: 10, marginTop: 16 },
  reasonCancel:   { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 8, borderWidth: 1, borderColor: '#ccc' },
  reasonConfirm:  { paddingHorizontal: 20, paddingVertical: 10, borderRadius: 8 },

  // Add SKU sheet
  addSkuSheet:      { position: 'absolute', bottom: 0, left: 0, right: 0, height: '70%', backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 16, elevation: 10 },
  searchInput:      { borderWidth: 1, borderColor: '#ccc', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10, fontSize: 15, marginBottom: 12 },
  searchResultRow:  { paddingVertical: 12, borderBottomWidth: 1, borderColor: '#f0f0f0' },
  searchResultName: { fontSize: 14, fontWeight: '600', color: '#1a1a2e' },
  searchResultSku:  { fontSize: 12, color: '#666', marginTop: 2 },
  searchResultStock:{ fontSize: 12, color: '#2e7d32', marginTop: 2 },
  closeBtn:         { alignItems: 'center', padding: 14, marginTop: 8 },
});
```

### Register the screen in the navigator

In the file that defines your stack navigator (e.g., `App.tsx` or the navigation file), add:
```tsx
import DsrDeliveryScreen from './screens/DsrDeliveryScreen';
// ...
<Stack.Screen name="DsrDelivery" component={DsrDeliveryScreen} />
```

In `HomeScreen.tsx`, the DSR user sees a "Delivery" button. Add navigation:
```tsx
// In the DSR section of HomeScreen (near Cart icon):
<TouchableOpacity onPress={() => navigation.navigate('DsrDelivery')}>
  {/* delivery truck icon */}
</TouchableOpacity>
```

---

## Rules

- `guardDsr` checks `user_type === "distributor" || "dsr"` — do NOT open these routes to SO or admin roles.
- `distId(req)` extracts distributor context from `req.user.distributor_id` first, then `req.userContext` — handle both.
- `delivery_items` defaults to full ordered quantities when the DSR doesn't change anything.
- `credit_balance_after` may be negative (meaning the retailer has a credit/advance). Display as-is.
- The product row in the modal wraps in a horizontal `ScrollView` — a `FlatList` inside a `ScrollView` is intentional here (the outer scroll is vertical for the financial card + actions; the inner is only for the row columns).
- Never call `reduceStockFIFO` for items with `delivered_qty === 0`.
- Out of scope (future prompts): DSR Panel web pages (Retailer Credit Report, Delivery Report — items 7-9 from the screenshot); Retailer App (items 10-13).

## Verification

1. `GET /api/v1/mobile/dsr/schedule` returns only `Approved` and `Hold` orders for the DSR's distributor.
2. Open an outlet — `GET /outlet-credit/:id` prefills Prev. Credit from the last delivered order.
3. Change a delivered qty → line total recalculates in real-time; financial card updates instantly.
4. Add extra SKU via search → row appears with blue "Extra" badge → line total included in payable.
5. Confirm → stock deducted via FIFO → order status = `Delivered` → outlet card turns green.
6. Confirm with insufficient stock → 409 with `insufficient[]` details; no stock is deducted.
7. Bounce → prompt for reason → order status = `Bounced` → outlet card turns red.
8. Hold → prompt for reason → order status = `Hold` → outlet card turns amber, reappears in next schedule fetch.
