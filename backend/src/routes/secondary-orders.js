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
  const role = roleOf(req);
  return ADMIN_ROLES.includes(role) || DISTRIBUTOR_ROLES.includes(role);
}

// ====================
// GET /secondary-orders
// List orders with role-scoped visibility + optional filters.
// ====================
router.get(
  "/",
  [
    query("status").optional().isIn(["Submitted", "Approved", "Cancelled", "Delivered"]),
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
  [param("id").isMongoId(), body("delivery_chalan_no").optional().isString().isLength({ max: 100 })],
  async (req, res) => {
    try {
      if (!canDeliver(req)) return res.status(403).json({ success: false, message: "Only Distributor / Admins can mark delivered" });
      const errors = validationResult(req);
      if (!errors.isEmpty()) return res.status(400).json({ success: false, message: "Validation failed", errors: errors.array() });

      const scope = accessFilter(req);
      if (scope === null) return res.status(403).json({ success: false, message: "Not allowed" });

      const order = await SecondaryOrder.findOne({ _id: req.params.id, ...scope });
      if (!order) return res.status(404).json({ success: false, message: "Order not found" });
      if (order.order_status !== "Approved") {
        return res.status(409).json({ success: false, message: `Cannot deliver an order in status '${order.order_status}'. Must be Approved first.` });
      }

      order.order_status = "Delivered";
      order.delivered_by = req.user._id;
      order.delivered_at = new Date();
      order.delivery_date = new Date();
      if (req.body.delivery_chalan_no) order.delivery_chalan_no = req.body.delivery_chalan_no;
      await order.save();

      return res.status(200).json({ success: true, message: "Order marked delivered", data: { _id: order._id, order_status: order.order_status } });
    } catch (err) {
      console.error("Deliver order error:", err);
      return res.status(500).json({ success: false, message: "Failed to mark delivered", error: err.message });
    }
  }
);

module.exports = router;
