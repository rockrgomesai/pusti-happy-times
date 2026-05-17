/**
 * Secondary Orders — cross-role (web + mobile) endpoints
 *
 * Access matrix:
 *  SuperAdmin / Sales Admin / Admin  → all orders
 *  ASM / RSM / ZSM (Area Managers)   → all orders (approve / reject)
 *  Distributor / DSR                 → their distributor's orders (mark delivered)
 *  SO                                → only their own orders
 *
 * Everything under this router is already auth-protected via
 * `router.use(authenticate)` in routes/index.js.
 */

const express = require("express");
const router = express.Router();
const { body, query, param, validationResult } = require("express-validator");
const SecondaryOrder = require("../models/SecondaryOrder");
const Notification = require("../models/Notification");
const { Outlet, Product, User, DistributorStock } = require("../models");

const ADMIN_ROLES = ["SuperAdmin", "Sales Admin", "Office Admin"];
const AREA_MANAGER_ROLES = ["ASM", "RSM", "ZSM", "HOS"];
const DISTRIBUTOR_ROLES = ["Distributor", "DSR"];
const SO_ROLES = ["SO"];

function roleOf(req) {
    return req.user?.role_id?.role || null;
}

/**
 * Build a MongoDB filter enforcing row-level access for the caller.
 * Returns `null` if the caller has no access at all.
 */
function accessFilter(req) {
    const role = roleOf(req);
    const ctx = req.userContext || {};
    if (!role) return null;
    if (ADMIN_ROLES.includes(role)) return {};
    if (AREA_MANAGER_ROLES.includes(role)) return {};
    if (DISTRIBUTOR_ROLES.includes(role)) {
        if (!ctx.distributor_id) return null;
        return { distributor_id: ctx.distributor_id };
    }
    if (SO_ROLES.includes(role)) {
        return { dsr_id: req.user._id };
    }
    return null; // unknown / unauthorized role
}

function canApprove(req) {
    const role = roleOf(req);
    return ADMIN_ROLES.includes(role) || AREA_MANAGER_ROLES.includes(role);
}
function canDeliver(req) {
    // Any authenticated role that has access to the order can arrange delivery
    const role = roleOf(req);
    return !!role;
}

// ====================
// POST /secondary-orders  (SO creates a new order)
// ====================
router.post(
    "/",
    [
        body("outlet_id").isMongoId(),
        body("distributor_id").isMongoId(),
        body("route_id").optional().isMongoId(),
        body("items").isArray({ min: 1 }),
        body("items.*.product_id").isMongoId(),
        body("items.*.sku").isString().notEmpty().toUpperCase(),
        body("items.*.quantity").isInt({ min: 1 }),
        body("so_notes").optional().isString().isLength({ max: 1000 }),
        body("entry_mode").optional().isIn(["online", "offline", "manual"]),
        body("client_order_uid").optional().isString(),
        body("price_locked").optional().isBoolean(),
    ],
    async (req, res) => {
        try {
            // 1. Role guard
            const role = roleOf(req);
            if (!SO_ROLES.includes(role)) {
                return res.status(403).json({ success: false, message: "Only SOs can create orders" });
            }

            // 2. Validation errors
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return res.status(400).json({ success: false, message: "Validation failed", errors: errors.array() });
            }

            const {
                outlet_id,
                distributor_id,
                route_id,
                items,
                so_notes,
                entry_mode = "online",
                client_order_uid,
                price_locked = false,
            } = req.body;

            // 3. Idempotency check (offline sync dedup)
            if (client_order_uid) {
                const existing = await SecondaryOrder.findOne({ client_order_uid }).lean();
                if (existing) return res.status(200).json({ success: true, data: existing });
            }

            // 4. Verify outlet is active
            const outlet = await Outlet.findOne({ _id: outlet_id, active: true }).select("name code").lean();
            if (!outlet) return res.status(404).json({ success: false, message: "Outlet not found or inactive" });

            // 5. Snapshot prices from Product catalog
            const builtItems = [];
            for (const it of items) {
                const product = await Product.findOne({ _id: it.product_id, active: true }).select("trade_price sku").lean();
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
                order_status: "Approved",
                approved_by: req.user._id,
                approved_at: new Date(),
                entry_mode,
                client_order_uid: client_order_uid || undefined,
                price_locked,
                so_notes: so_notes || undefined,
            });
            await order.save(); // pre-save hook computes subtotal + total_amount

            // 7. Notify Distributor users (non-critical)
            try {
                const recipients = await User.find({
                    user_type: "distributor",
                    distributor_id,
                    active: true,
                }).select("_id").lean();

                if (recipients.length > 0) {
                    await Notification.bulkCreate(
                        recipients.map((u) => ({
                            user_id: u._id,
                            type: "order_status",
                            title: "New Sales Order",
                            message: `Order ${order.order_number} from ${outlet.name} — BDT ${order.total_amount}`,
                            priority: "normal",
                            action_url: `/distributor/orders/${order._id}`,
                            action_label: "View Order",
                            expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
                        }))
                    );
                }

                if (global.io) {
                    global.io.emit("secondary_order:new", {
                        orderId: order._id,
                        distributor_id,
                        order_number: order.order_number,
                    });
                }
            } catch (notifyErr) {
                // Notifications are non-critical — log but don't fail the request
                console.error("Notify error on order create:", notifyErr);
            }

            return res.status(201).json({ success: true, data: order });
        } catch (err) {
            console.error("Create secondary order error:", err);
            return res.status(500).json({ success: false, message: "Failed to create order", error: err.message });
        }
    }
);

// ====================
// GET /secondary-orders
// List orders with role-scoped visibility + optional filters.
// ====================
router.get(
    "/",
    [
        query("status").optional().isIn(["Submitted", "Approved", "Cancelled", "Delivered", "Hold", "Bounced"]),
        query("outlet_id").optional().isMongoId(),
        query("distributor_id").optional().isMongoId(),
        query("dsr_id").optional().isMongoId(),
        query("date_from").optional().isISO8601(),
        query("date_to").optional().isISO8601(),
        query("limit").optional().isInt({ min: 1, max: 200 }),
        query("page").optional().isInt({ min: 1 }),
        query("q").optional().isString(),
    ],
    async (req, res) => {
        try {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return res.status(400).json({ success: false, message: "Validation failed", errors: errors.array() });
            }

            const scope = accessFilter(req);
            if (scope === null) {
                return res.status(403).json({ success: false, message: "Not allowed to view orders" });
            }

            const { status, outlet_id, distributor_id, dsr_id, date_from, date_to, q, limit = 20, page = 1 } = req.query;
            const filter = { ...scope };
            if (status) filter.order_status = status;
            if (outlet_id) filter.outlet_id = outlet_id;
            if (distributor_id) filter.distributor_id = distributor_id;
            if (dsr_id) filter.dsr_id = dsr_id;
            if (date_from || date_to) {
                filter.order_date = {};
                if (date_from) filter.order_date.$gte = new Date(date_from);
                if (date_to) filter.order_date.$lte = new Date(date_to);
            }
            if (q) filter.order_number = { $regex: q, $options: "i" };

            const skip = (parseInt(page) - 1) * parseInt(limit);
            const [orders, total] = await Promise.all([
                SecondaryOrder.find(filter)
                    .sort({ order_date: -1 })
                    .skip(skip)
                    .limit(parseInt(limit))
                    .select("order_number outlet_id distributor_id dsr_id order_date total_amount subtotal discount_amount order_status delivery_chalan_no entry_mode")
                    .populate("outlet_id", "name code")
                    .populate("distributor_id", "name code")
                    .populate("dsr_id", "name employee_id")
                    .lean(),
                SecondaryOrder.countDocuments(filter),
            ]);

            return res.status(200).json({
                success: true,
                data: orders,
                pagination: {
                    total,
                    page: parseInt(page),
                    pages: Math.ceil(total / parseInt(limit)),
                    limit: parseInt(limit),
                },
                role: roleOf(req),
            });
        } catch (err) {
            console.error("List secondary orders error:", err);
            return res.status(500).json({ success: false, message: "Failed to fetch orders", error: err.message });
        }
    }
);

// ====================
// GET /secondary-orders/:id
// ====================
router.get("/:id", [param("id").isMongoId()], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ success: false, message: "Validation failed", errors: errors.array() });
        }

        const scope = accessFilter(req);
        if (scope === null) return res.status(403).json({ success: false, message: "Not allowed" });

        const order = await SecondaryOrder.findOne({ _id: req.params.id, ...scope })
            .populate("outlet_id", "name code address phone")
            .populate("distributor_id", "name code")
            .populate("dsr_id", "name employee_id")
            .populate("route_id", "name code")
            .populate("items.product_id", "sku english_name bangla_name unit_per_case image_url")
            .populate("approved_by", "name employee_id")
            .populate("cancelled_by", "name employee_id")
            .populate("delivered_by", "name employee_id")
            .lean();

        if (!order) return res.status(404).json({ success: false, message: "Order not found" });
        return res.status(200).json({ success: true, data: order });
    } catch (err) {
        console.error("Get secondary order error:", err);
        return res.status(500).json({ success: false, message: "Failed to fetch order", error: err.message });
    }
});

// ====================
// POST /secondary-orders/:id/approve  (Area Manager vet)
// ====================
router.post(
    "/:id/approve",
    [param("id").isMongoId(), body("notes").optional().isString().isLength({ max: 1000 })],
    async (req, res) => {
        try {
            if (!canApprove(req)) return res.status(403).json({ success: false, message: "Only Area Managers / Admins can approve" });
            const errors = validationResult(req);
            if (!errors.isEmpty()) return res.status(400).json({ success: false, message: "Validation failed", errors: errors.array() });

            const order = await SecondaryOrder.findById(req.params.id);
            if (!order) return res.status(404).json({ success: false, message: "Order not found" });
            if (order.order_status !== "Submitted") {
                return res.status(409).json({ success: false, message: `Cannot approve an order in status '${order.order_status}'` });
            }

            order.order_status = "Approved";
            order.approved_by = req.user._id;
            order.approved_at = new Date();
            if (req.body.notes) order.approval_notes = req.body.notes;
            await order.save();

            return res.status(200).json({ success: true, message: "Order approved", data: { _id: order._id, order_status: order.order_status } });
        } catch (err) {
            console.error("Approve order error:", err);
            return res.status(500).json({ success: false, message: "Failed to approve order", error: err.message });
        }
    }
);

// ====================
// POST /secondary-orders/:id/reject  (Area Manager vet → Cancelled)
// ====================
router.post(
    "/:id/reject",
    [param("id").isMongoId(), body("reason").notEmpty().isString().isLength({ max: 1000 }).withMessage("Reason is required")],
    async (req, res) => {
        try {
            if (!canApprove(req)) return res.status(403).json({ success: false, message: "Only Area Managers / Admins can reject" });
            const errors = validationResult(req);
            if (!errors.isEmpty()) return res.status(400).json({ success: false, message: "Validation failed", errors: errors.array() });

            const order = await SecondaryOrder.findById(req.params.id);
            if (!order) return res.status(404).json({ success: false, message: "Order not found" });
            if (!["Submitted", "Approved"].includes(order.order_status)) {
                return res.status(409).json({ success: false, message: `Cannot reject an order in status '${order.order_status}'` });
            }

            order.order_status = "Cancelled";
            order.cancelled_by = req.user._id;
            order.cancelled_at = new Date();
            order.cancellation_reason = req.body.reason;
            await order.save();

            return res.status(200).json({ success: true, message: "Order rejected", data: { _id: order._id, order_status: order.order_status } });
        } catch (err) {
            console.error("Reject order error:", err);
            return res.status(500).json({ success: false, message: "Failed to reject order", error: err.message });
        }
    }
);

// ====================
// POST /secondary-orders/:id/deliver  (Distributor marks delivered)
// ====================
router.post(
    "/:id/deliver",
    [
        param("id").isMongoId(),
        body("delivery_chalan_no").optional().isString().isLength({ max: 100 }),
        body("items").optional().isArray(),
        body("items.*.sku").optional().isString().toUpperCase(),
        body("items.*.delivery_qty").optional().isInt({ min: 1 }),
    ],
    async (req, res) => {
        try {
            // Guard
            if (!canDeliver(req)) {
                return res.status(403).json({ success: false, message: "Not authorized" });
            }
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return res.status(400).json({ success: false, message: "Validation failed", errors: errors.array() });
            }

            const scope = accessFilter(req);
            if (scope === null) return res.status(403).json({ success: false, message: "Not allowed" });

            const order = await SecondaryOrder.findOne({ _id: req.params.id, ...scope });
            if (!order) return res.status(404).json({ success: false, message: "Order not found" });
            if (!["Approved", "Submitted"].includes(order.order_status)) {
                return res.status(409).json({
                    success: false,
                    message: `Cannot deliver an order in status '${order.order_status}'.`,
                });
            }

            // Build delivery quantities from body, or default to full order quantities
            const deliveryMap = new Map(); // sku -> delivery_qty
            if (Array.isArray(req.body.items) && req.body.items.length > 0) {
                req.body.items.forEach((it) => deliveryMap.set(it.sku.toUpperCase(), it.delivery_qty));
            } else {
                order.items.forEach((it) => deliveryMap.set(it.sku, it.quantity));
            }

            // Step 1: validate stock availability for ALL items before touching anything
            const stockDocs = new Map(); // sku -> DistributorStock document
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
                    code: "INSUFFICIENT_STOCK",
                    message: "Insufficient stock for one or more SKUs",
                    details: insufficientItems,
                });
            }

            // Step 2: deduct stock and compute delivery prices
            for (const orderItem of order.items) {
                const deliveryQty = deliveryMap.get(orderItem.sku);
                if (!deliveryQty) continue; // item not in this delivery

                // Price re-evaluation
                let deliveryUnitPrice = orderItem.unit_price; // fallback
                if (!order.price_locked) {
                    const product = await Product.findOne({ sku: orderItem.sku }).select("trade_price").lean();
                    if (product?.trade_price != null) deliveryUnitPrice = product.trade_price;
                }

                // FIFO deduction
                const stock = stockDocs.get(orderItem.sku);
                const result = stock.reduceStockFIFO(deliveryQty);
                // result.success is guaranteed true (we pre-checked above)
                await stock.save();

                // Write delivery fields back onto the order item
                orderItem.delivery_qty = deliveryQty;
                orderItem.delivery_unit_price = deliveryUnitPrice;
                orderItem.delivery_subtotal = deliveryQty * deliveryUnitPrice;
                orderItem.fifo_cogs = result.costOfGoodsSold;
                orderItem.fifo_batches_used = result.batchesUsed.map((b) => ({
                    batch_id: b.batch_id,
                    qty: b.qty_used,
                    unit_cost: b.unit_price,
                }));
            }

            // Step 3: update order header
            order.delivery_total_amount = order.items.reduce(
                (sum, it) => sum + (it.delivery_subtotal ?? 0),
                0
            );
            order.order_status = "Delivered";
            order.delivered_by = req.user._id;
            order.delivered_at = new Date();
            order.delivery_date = new Date();
            if (req.body.delivery_chalan_no) order.delivery_chalan_no = req.body.delivery_chalan_no;

            await order.save();

            // Step 4: socket event + SO notification
            if (global.io) {
                global.io.emit("secondary_order:delivered", {
                    orderId: order._id,
                    distributor_id: order.distributor_id,
                    so_id: order.dsr_id,
                });
            }

            try {
                await Notification.create({
                    user_id: order.dsr_id,
                    type: "order_status",
                    title: "Order Delivered",
                    message: `Order ${order.order_number} has been delivered — Invoice BDT ${order.delivery_total_amount}`,
                    priority: "normal",
                    action_url: `/orders/${order._id}`,
                    expires_at: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
                });
            } catch (notifyErr) {
                console.error("Notify error on deliver:", notifyErr);
            }

            return res.status(200).json({
                success: true,
                message: "Order marked delivered",
                data: {
                    _id: order._id,
                    order_status: order.order_status,
                    delivery_total_amount: order.delivery_total_amount,
                },
            });
        } catch (err) {
            console.error("Deliver order error:", err);
            return res.status(500).json({ success: false, message: "Failed to mark delivered", error: err.message });
        }
    }
);

module.exports = router;
