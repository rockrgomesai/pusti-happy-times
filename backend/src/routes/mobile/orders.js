/**
 * Mobile Orders Routes
 * Handles secondary order creation and management for mobile app
 */

const express = require("express");
const router = express.Router();
const { body, query, validationResult } = require("express-validator");
const mongoose = require("mongoose");
const SecondaryOrder = require("../../models/SecondaryOrder");
const DistributorStock = require("../../models/DistributorStock");
const OutletVisit = require("../../models/OutletVisit");
const Product = require("../../models/Product");
const Outlet = require("../../models/Outlet");

// ====================
// POST /api/mobile/orders
// Create new secondary order with stock deduction
// ====================
router.post(
  "/",
  [
    body("outlet_id").notEmpty().withMessage("Outlet ID is required").isMongoId().withMessage("Invalid outlet ID"),
    body("distributor_id")
      .notEmpty()
      .withMessage("Distributor ID is required")
      .isMongoId()
      .withMessage("Invalid distributor ID"),
    body("dsr_id").notEmpty().withMessage("Sales Officer ID is required").isMongoId().withMessage("Invalid SO ID"),
    body("items").isArray({ min: 1 }).withMessage("At least one item is required"),
    body("items.*.product_id").notEmpty().isMongoId().withMessage("Each item must have a valid product ID"),
    body("items.*.sku").notEmpty().withMessage("Each item must have a SKU"),
    body("items.*.quantity").notEmpty().isInt({ min: 1 }).withMessage("Quantity must be at least 1"),
    body("items.*.unit_price").notEmpty().isFloat({ min: 0 }).withMessage("Unit price must be non-negative"),
    body("gps_location.coordinates")
      .optional()
      .isArray({ min: 2, max: 2 })
      .withMessage("GPS coordinates must be [longitude, latitude]"),
    body("entry_mode").optional().isIn(["online", "offline", "manual"]),
    body("client_order_uid").optional().isString().isLength({ max: 120 }),
    body("order_date").optional().isISO8601(),
  ],
  async (req, res) => {
    // Detect whether the Mongo deployment supports multi-document transactions.
    // A standalone mongod (common in local docker-compose dev) returns
    // `{ ok:0, code:20, codeName:"IllegalOperation" }` from startTransaction.
    const supportsTx = (() => {
      const admin = mongoose.connection?.db?.admin?.();
      const topology = mongoose.connection?.client?.topology;
      const desc = topology?.description;
      if (!desc) return false;
      // ReplicaSetWithPrimary | LoadBalanced | Sharded → transactions supported
      return ["ReplicaSetWithPrimary", "Sharded", "LoadBalanced"].includes(desc.type);
    })();

    const session = supportsTx ? await mongoose.startSession() : null;
    if (session) session.startTransaction();
    const sessOpt = session ? { session } : {};

    try {
      // Validate request
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        if (session) { await session.abortTransaction(); session.endSession(); }
        return res.status(400).json({
          success: false,
          message: "Validation failed",
          errors: errors.array(),
        });
      }

      const { outlet_id, distributor_id, dsr_id, route_id, items, gps_location, gps_accuracy, so_notes, entry_mode, client_order_uid, order_date } = req.body;

      // Idempotency: if the mobile client resubmits a queued offline order,
      // return the existing record instead of creating a duplicate.
      if (client_order_uid) {
        const existing = await SecondaryOrder.findOne({ client_order_uid });
        if (existing) {
          if (session) { await session.abortTransaction(); session.endSession(); }
          return res.status(200).json({
            success: true,
            duplicate: true,
            message: "Order already submitted",
            data: existing,
          });
        }
      }

      // Step 1: Validate stock availability (with row locking)
      const stockValidationErrors = [];
      for (const item of items) {
        const stockQuery = DistributorStock.findOne({
          distributor_id,
          sku: item.sku,
        });
        const stock = session ? await stockQuery.session(session) : await stockQuery;

        const available = stock ? parseFloat(stock.qty) : 0;

        if (item.quantity > available) {
          stockValidationErrors.push({
            sku: item.sku,
            requested: item.quantity,
            available: available,
            message: `Only ${available} PCS available for ${item.sku}`,
          });
        }
      }

      if (stockValidationErrors.length > 0) {
        if (session) { await session.abortTransaction(); session.endSession(); }
        return res.status(400).json({
          success: false,
          code: "INSUFFICIENT_STOCK",
          message: "Some items have insufficient stock",
          conflicts: stockValidationErrors,
        });
      }

      // Step 2: Calculate subtotals for each item
      const itemsWithSubtotals = items.map((item) => ({
        ...item,
        subtotal: item.quantity * item.unit_price,
      }));

      // Order-level totals (model's pre-save hook fires after validation, so we
      // compute them here to satisfy the required-field checks).
      const orderSubtotal = itemsWithSubtotals.reduce((s, i) => s + i.subtotal, 0);

      // Step 3: Generate order number
      const order_number = await SecondaryOrder.generateOrderNumber();

      // Step 4: Create order (offers will be auto-applied later if needed)
      const orderData = {
        order_number,
        outlet_id,
        distributor_id,
        dsr_id,
        route_id,
        items: itemsWithSubtotals,
        subtotal: orderSubtotal,
        discount_amount: 0,
        total_amount: orderSubtotal,
        order_status: "Submitted",
        gps_location,
        gps_accuracy,
        so_notes,
        entry_mode: entry_mode || "online",
        ...(client_order_uid ? { client_order_uid } : {}),
        ...(order_date ? { order_date: new Date(order_date) } : {}),
      };

      const order = await SecondaryOrder.create([orderData], sessOpt);

      // Step 5: Reduce stock (FIFO) for each item
      for (const item of items) {
        const stockQuery = DistributorStock.findOne({
          distributor_id,
          sku: item.sku,
        });
        const stock = session ? await stockQuery.session(session) : await stockQuery;

        if (stock) {
          const result = stock.reduceStockFIFO(item.quantity);

          if (!result.success) {
            throw new Error(`Failed to reduce stock for ${item.sku}: ${result.message}`);
          }

          await stock.save(sessOpt);
        }
      }

      // Step 6: Create visit record
      const visitId = await OutletVisit.generateVisitId();
      const visit = await OutletVisit.create(
        [
          {
            visit_id: visitId,
            outlet_id,
            dsr_id: dsr_id,
            so_id: dsr_id, // Same as dsr_id for mobile orders
            distributor_id,
            route_id,
            visit_type: "sales",
            order_id: order[0]._id,
            check_in_time: new Date(),
            gps_location,
            so_notes,
          },
        ],
        sessOpt
      );

      // Step 7: Update outlet last_visit_date
      await Outlet.findByIdAndUpdate(
        outlet_id,
        { last_visit_date: new Date() },
        sessOpt
      );

      // Commit transaction
      if (session) {
        await session.commitTransaction();
        session.endSession();
      }

      // Populate and return order
      const populatedOrder = await SecondaryOrder.findById(order[0]._id)
        .populate("outlet_id", "name code address")
        .populate("dsr_id", "name employee_id")
        .populate("items.product_id", "sku english_name bangla_name")
        .lean();

      return res.status(201).json({
        success: true,
        message: "Order placed successfully",
        data: {
          order_number: populatedOrder.order_number,
          order_status: populatedOrder.order_status,
          total_amount: populatedOrder.total_amount,
          items_count: populatedOrder.items.length,
          discount_amount: populatedOrder.discount_amount,
        },
      });
    } catch (error) {
      if (session) {
        try { await session.abortTransaction(); } catch (_) {}
        session.endSession();
      }
      console.error("Error creating order:", error);
      return res.status(500).json({
        success: false,
        message: "Failed to create order",
        error: error.message,
      });
    }
  }
);

// ====================
// GET /api/mobile/orders
// Get order list with filters
// ====================
router.get(
  "/",
  [
    query("dsr_id").notEmpty().withMessage("Sales Officer ID is required").isMongoId().withMessage("Invalid SO ID"),
    query("outlet_id").optional().isMongoId().withMessage("Invalid outlet ID"),
    query("status")
      .optional()
      .isIn(["Submitted", "Approved", "Cancelled", "Delivered"])
      .withMessage("Invalid order status"),
    query("date_from").optional().isISO8601().withMessage("Invalid date format for date_from"),
    query("date_to").optional().isISO8601().withMessage("Invalid date format for date_to"),
    query("limit").optional().isInt({ min: 1, max: 100 }).withMessage("Limit must be between 1 and 100"),
    query("page").optional().isInt({ min: 1 }).withMessage("Page must be at least 1"),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: "Validation failed",
          errors: errors.array(),
        });
      }

      const { dsr_id, outlet_id, status, date_from, date_to, limit = 20, page = 1 } = req.query;

      // Build filter
      const filter = { dsr_id };
      if (outlet_id) filter.outlet_id = outlet_id;
      if (status) filter.order_status = status;
      if (date_from || date_to) {
        filter.order_date = {};
        if (date_from) filter.order_date.$gte = new Date(date_from);
        if (date_to) filter.order_date.$lte = new Date(date_to);
      }

      // Calculate pagination
      const skip = (parseInt(page) - 1) * parseInt(limit);

      // Get orders
      const [orders, total] = await Promise.all([
        SecondaryOrder.find(filter)
          .sort({ order_date: -1 })
          .skip(skip)
          .limit(parseInt(limit))
          .select("order_number outlet_id order_date total_amount order_status delivery_chalan_no")
          .populate("outlet_id", "name code address")
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
      });
    } catch (error) {
      console.error("Error fetching orders:", error);
      return res.status(500).json({
        success: false,
        message: "Failed to fetch orders",
        error: error.message,
      });
    }
  }
);

// ====================
// GET /api/mobile/orders/:id
// Get single order details
// ====================
router.get("/:id", async (req, res) => {
  try {
    const order = await SecondaryOrder.findById(req.params.id)
      .populate("outlet_id", "name code address phone")
      .populate("distributor_id", "name code")
      .populate("dsr_id", "name employee_id")
      .populate("route_id", "name code")
      .populate("items.product_id", "sku english_name bangla_name unit_per_case image_url")
      .populate("applied_offers.offer_id", "name offer_type")
      .populate("delivered_by", "name employee_id")
      .lean();

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found",
      });
    }

    // Role-based access control: SO can only see their own; Distributor/DSR
    // only orders for their distributor; Admins/Area Managers see all.
    const role = req.user?.role_id?.role;
    const ctx = req.userContext || {};
    const isAdmin = ["SuperAdmin", "Sales Admin", "Office Admin"].includes(role);
    const isAreaMgr = ["ASM", "RSM", "ZSM", "HOS"].includes(role);
    const isDistributor = ["Distributor", "DSR"].includes(role);
    const isSO = role === "SO";

    let allowed = isAdmin || isAreaMgr;
    if (!allowed && isDistributor && ctx.distributor_id) {
      allowed = String(order.distributor_id?._id || order.distributor_id) === String(ctx.distributor_id);
    }
    if (!allowed && isSO) {
      allowed = String(order.dsr_id?._id || order.dsr_id) === String(req.user._id);
    }
    if (!allowed) {
      return res.status(403).json({ success: false, message: "Not allowed to view this order" });
    }

    return res.status(200).json({
      success: true,
      data: order,
    });
  } catch (error) {
    console.error("Error fetching order:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch order details",
      error: error.message,
    });
  }
});

module.exports = router;
