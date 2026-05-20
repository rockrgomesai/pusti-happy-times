/**
 * Mobile DSR Delivery Routes
 * Used by DSR mobile app for daily delivery management
 * Mounted at: /api/v1/mobile/dsr
 */
const express = require("express");
const router = express.Router();
const { param, body, validationResult } = require("express-validator");
const { authenticate } = require("../../middleware/auth");
const SecondaryOrder = require("../../models/SecondaryOrder");
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

        // All date math in Bangladesh Standard Time (UTC+6) so orders placed
        // after midnight BDT are visible on the correct calendar day even when
        // the server is running in UTC.
        const BDT_OFFSET_MS = 6 * 60 * 60 * 1000;
        const bdtDateStr = req.query.date
            ? req.query.date  // caller-supplied YYYY-MM-DD is already BDT
            : new Date(Date.now() + BDT_OFFSET_MS).toISOString().slice(0, 10);
        const dayStart = new Date(`${bdtDateStr}T00:00:00+06:00`);
        const dayEnd   = new Date(`${bdtDateStr}T23:59:59.999+06:00`);

        // Approved orders for this distributor placed today (or on the requested date)
        const orders = await SecondaryOrder.find({
            distributor_id: did,
            order_status: { $in: ["Approved", "Hold"] },
            order_date: { $gte: dayStart, $lte: dayEnd },
        })
            .sort({ order_date: 1 })
            .select("order_number outlet_id order_date total_amount order_status items credit_balance_after")
            .populate("outlet_id", "outlet_name code address phone")
            .populate("items.product_id", "sku bangla_name english_name image_url ctn_pcs")
            .lean();

        // Attach quick counts
        const total = orders.length;
        const pending = orders.filter(o => o.order_status === "Approved").length;
        const on_hold = orders.filter(o => o.order_status === "Hold").length;

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
                outlet_id: req.params.outlet_id,
                distributor_id: did,
                order_status: "Delivered",
            })
                .sort({ delivered_at: -1 })
                .select("credit_balance_after delivered_at")
                .lean();

            res.json({
                success: true,
                data: {
                    credit_balance: lastDelivered?.credit_balance_after ?? 0,
                    as_of: lastDelivered?.delivered_at ?? null,
                },
            });
        } catch (err) {
            res.status(500).json({ success: false, message: "Failed to fetch outlet credit", error: err.message });
        }
    }
);

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/v1/mobile/dsr/delivered-today
// Returns today's Delivered and Bounced orders for the DSR's distributor.
// Query: date? (YYYY-MM-DD, defaults to today)
// ─────────────────────────────────────────────────────────────────────────────
router.get("/delivered-today", authenticate, guardDsr, async (req, res) => {
    try {
        const did = distId(req);
        if (!did) return res.status(400).json({ success: false, message: "distributor_id missing from user context" });

        const BDT_OFFSET_MS = 6 * 60 * 60 * 1000;
        const bdtDateStr = req.query.date
            ? req.query.date
            : new Date(Date.now() + BDT_OFFSET_MS).toISOString().slice(0, 10);
        const dayStart = new Date(`${bdtDateStr}T00:00:00+06:00`);
        const dayEnd   = new Date(`${bdtDateStr}T23:59:59.999+06:00`);

        const orders = await SecondaryOrder.find({
            distributor_id: did,
            order_status: { $in: ["Delivered", "Bounced"] },
            delivered_at: { $gte: dayStart, $lte: dayEnd },
        })
            .sort({ delivered_at: -1 })
            .select("order_number outlet_id order_date delivered_at order_status payable_amount cash_collected credit_balance_after credit_balance_before bounced_reason delivery_items total_amount")
            .populate("outlet_id", "outlet_name code address")
            .lean();

        const delivered = orders.filter(o => o.order_status === "Delivered");
        const summary = {
            total: orders.length,
            delivered: delivered.length,
            bounced: orders.filter(o => o.order_status === "Bounced").length,
            total_cash: delivered.reduce((s, o) => s + (o.cash_collected || 0), 0),
            total_credit: delivered.reduce((s, o) => s + Math.max(0, o.credit_balance_after || 0), 0),
        };

        res.json({ success: true, data: { orders, summary } });
    } catch (err) {
        res.status(500).json({ success: false, message: "Failed to fetch delivered orders", error: err.message });
    }
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/v1/mobile/dsr/catalog-search
// Lightweight product search for the "Add Extra SKU" modal.
// Query: q (sku or name fragment), distributor_id (to check stock)
// ─────────────────────────────────────────────────────────────────────────────
router.get("/catalog-search", authenticate, guardDsr, async (req, res) => {
    try {
        const did = distId(req);
        const q = (req.query.q || "").toString().trim();
        if (!q) return res.json({ success: true, data: [] });

        const products = await Product.find({
            active: true,
            $or: [
                { sku: { $regex: q, $options: "i" } },
                { bangla_name: { $regex: q, $options: "i" } },
                { english_name: { $regex: q, $options: "i" } },
            ],
        })
            .select("_id sku bangla_name english_name image_url trade_price ctn_pcs")
            .limit(20)
            .lean();

        // Attach available stock for each product
        const skus = products.map(p => p.sku);
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

            // ── Stock was already deducted at SO creation (orders.js). ─────────────
            // Delivery confirmation only records actual quantities — no second deduction.

            // ── Compute financials ────────────────────────────────────────────────
            const deliveredItems = delivery_items.map(item => ({
                product_id: item.product_id,
                sku: item.sku.toUpperCase(),
                ordered_qty: item.ordered_qty ?? 0,
                delivered_qty: item.delivered_qty ?? 0,
                damage_qty: item.damage_qty ?? 0,
                unit_price: item.unit_price,
                extra_item_discount: item.extra_item_discount ?? 0,
                line_total: item.delivered_qty * item.unit_price - (item.extra_item_discount ?? 0),
                is_extra_item: !!item.is_extra_item,
            }));

            const gross_delivered = deliveredItems.reduce((s, i) => s + i.line_total, 0);
            const payable_amount = gross_delivered - Number(extra_delivery_discount);
            const total_payable = payable_amount + Number(credit_balance_before);
            const credit_balance_after = total_payable - Number(cash_collected);

            // ── Persist ──────────────────────────────────────────────────────────
            order.order_status = "Delivered";
            order.delivery_items = deliveredItems;
            order.extra_delivery_discount = Number(extra_delivery_discount);
            order.cash_collected = Number(cash_collected);
            order.payable_amount = payable_amount;
            order.credit_balance_before = Number(credit_balance_before);
            order.credit_balance_after = credit_balance_after;
            order.delivered_by = req.user._id;
            order.delivered_at = new Date();
            order.delivery_date = new Date();
            await order.save();

            res.json({
                success: true,
                message: "Delivery confirmed",
                data: {
                    _id: order._id,
                    order_status: order.order_status,
                    payable_amount,
                    cash_collected: Number(cash_collected),
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

            order.order_status = "Bounced";
            order.bounced_reason = req.body.reason;
            order.delivered_by = req.user._id;
            order.delivered_at = new Date();
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
            order.hold_reason = req.body.reason;
            await order.save();

            res.json({ success: true, message: "Order put on hold", data: { _id: order._id, order_status: order.order_status } });
        } catch (err) {
            res.status(500).json({ success: false, message: "Hold failed", error: err.message });
        }
    }
);

module.exports = router;
