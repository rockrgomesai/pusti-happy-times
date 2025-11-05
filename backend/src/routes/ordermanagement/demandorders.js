const express = require("express");
const DemandOrder = require("../../models/DemandOrder");
const Product = require("../../models/Product");
const Offer = require("../../models/Offer");
const Distributor = require("../../models/Distributor");
const { requireApiPermission, authenticate } = require("../../middleware/auth");

const router = express.Router();

/**
 * Efficient cart validation function
 * Validates product quantities against available stock
 */
async function validateCartQuantities(distributorId, cartItems) {
  try {
    // Get distributor details
    const distributor = await Distributor.findById(distributorId)
      .select("delivery_depot_id product_segment skus_exclude")
      .lean();

    if (!distributor) {
      return { valid: false, error: "Distributor not found" };
    }

    // Extract unique product IDs from cart
    const productIds = [...new Set(cartItems.map(item => item.product_id.toString()))];

    // Fetch all products in one query
    const products = await Product.find({
      _id: { $in: productIds },
      active: true,
    })
      .select("_id sku depot_ids stock_by_depot")
      .lean();

    if (products.length !== productIds.length) {
      return { valid: false, error: "Some products are inactive or not found" };
    }

    // Create product map for quick lookup
    const productMap = new Map(products.map(p => [p._id.toString(), p]));

    // Get pending DO quantities in one aggregation query
    const pendingDOs = await DemandOrder.aggregate([
      {
        $match: {
          distributor_id: distributor._id,
          status: "submitted",
        },
      },
      { $unwind: "$items" },
      {
        $group: {
          _id: "$items.source_id",
          totalPendingQty: { $sum: "$items.quantity" },
        },
      },
    ]);

    const pendingMap = new Map(
      pendingDOs.map(p => [p._id.toString(), p.totalPendingQty])
    );

    // Validate each cart item
    const validationResults = [];

    for (const item of cartItems) {
      const product = productMap.get(item.product_id.toString());
      if (!product) {
        validationResults.push({
          product_id: item.product_id,
          sku: item.sku,
          valid: false,
          error: "Product not found or inactive",
        });
        continue;
      }

      // Calculate available quantity
      let distributorDepotQty = 0;
      let productDepotsQty = 0;

      // Get quantity from distributor's delivery depot
      if (distributor.delivery_depot_id && product.stock_by_depot) {
        const depotStock = product.stock_by_depot.find(
          s => s.depot_id && s.depot_id.toString() === distributor.delivery_depot_id.toString()
        );
        if (depotStock) {
          distributorDepotQty = depotStock.quantity || 0;
        }
      }

      // Get quantity from product's assigned depots
      if (product.depot_ids && product.depot_ids.length > 0 && product.stock_by_depot) {
        productDepotsQty = product.stock_by_depot
          .filter(s => s.depot_id && product.depot_ids.some(d => d.toString() === s.depot_id.toString()))
          .reduce((sum, s) => sum + (s.quantity || 0), 0);
      }

      // Get pending quantity
      const pendingQty = pendingMap.get(product._id.toString()) || 0;

      // Calculate available
      const totalAvailable = distributorDepotQty + productDepotsQty;
      const availableAfterPending = totalAvailable - pendingQty;

      validationResults.push({
        product_id: item.product_id,
        sku: product.sku,
        requested_qty: item.quantity,
        distributor_depot_qty: distributorDepotQty,
        product_depots_qty: productDepotsQty,
        total_available: totalAvailable,
        pending_qty: pendingQty,
        available_after_pending: availableAfterPending,
        valid: item.quantity <= availableAfterPending,
        error: item.quantity > availableAfterPending
          ? `Insufficient stock. Available: ${availableAfterPending}, Requested: ${item.quantity}`
          : null,
      });
    }

    const allValid = validationResults.every(r => r.valid);

    return {
      valid: allValid,
      results: validationResults,
      error: allValid ? null : "Some items have insufficient stock",
    };
  } catch (error) {
    console.error("Cart validation error:", error);
    return { valid: false, error: "Validation failed: " + error.message };
  }
}

/**
 * GET /ordermanagement/demandorders/catalog/products
 * Get available products for distributor (filtered by segments, blacklist, active status)
 */
router.get(
  "/catalog/products",
  authenticate,
  requireApiPermission("demandorder:read"),
  async (req, res) => {
    try {
      const { user } = req;

      // Get distributor for current user
      const distributor = await Distributor.findOne({ _id: user.distributor_id })
        .select("product_segment skus_exclude delivery_depot_id")
        .lean();

      if (!distributor) {
        return res.status(404).json({
          success: false,
          message: "Distributor not found",
        });
      }

      // Build query
      const query = {
        active: true,
        product_segment: { $in: distributor.product_segment },
      };

      // Exclude blacklisted SKUs
      if (distributor.skus_exclude && distributor.skus_exclude.length > 0) {
        query._id = { $nin: distributor.skus_exclude };
      }

      const products = await Product.find(query)
        .select("_id sku short_description mrp category brand unit_per_case depot_ids stock_by_depot")
        .populate("category", "name")
        .populate("brand", "name")
        .sort({ sku: 1 })
        .lean();

      res.json({
        success: true,
        data: {
          products,
          distributor_depot_id: distributor.delivery_depot_id,
        },
      });
    } catch (error) {
      console.error("Error fetching products catalog:", error);
      res.status(500).json({
        success: false,
        message: "Failed to fetch products catalog",
        error: error.message,
      });
    }
  }
);

/**
 * GET /ordermanagement/demandorders/catalog/offers
 * Get available offers for distributor
 */
router.get(
  "/catalog/offers",
  authenticate,
  requireApiPermission("demandorder:read"),
  async (req, res) => {
    try {
      const { user } = req;

      const now = new Date();

      // Find active offers that are currently valid
      const offers = await Offer.find({
        active: true,
        start_date: { $lte: now },
        end_date: { $gte: now },
      })
        .populate("product_id", "sku short_description mrp unit_per_case")
        .populate("applicable_distributors", "name")
        .sort({ created_at: -1 })
        .lean();

      // Filter offers applicable to this distributor
      const applicableOffers = offers.filter(offer => {
        if (!offer.applicable_distributors || offer.applicable_distributors.length === 0) {
          return true; // Offer applies to all
        }
        return offer.applicable_distributors.some(
          d => d._id.toString() === user.distributor_id.toString()
        );
      });

      res.json({
        success: true,
        data: applicableOffers,
      });
    } catch (error) {
      console.error("Error fetching offers catalog:", error);
      res.status(500).json({
        success: false,
        message: "Failed to fetch offers catalog",
        error: error.message,
      });
    }
  }
);

/**
 * POST /ordermanagement/demandorders/validate-cart
 * Validate cart quantities before submission
 */
router.post(
  "/validate-cart",
  authenticate,
  requireApiPermission("demandorder:read"),
  async (req, res) => {
    try {
      const { user } = req;
      const { items } = req.body;

      if (!items || !Array.isArray(items) || items.length === 0) {
        return res.status(400).json({
          success: false,
          message: "Cart items are required",
        });
      }

      const validation = await validateCartQuantities(user.distributor_id, items);

      res.json({
        success: validation.valid,
        data: validation,
      });
    } catch (error) {
      console.error("Error validating cart:", error);
      res.status(500).json({
        success: false,
        message: "Failed to validate cart",
        error: error.message,
      });
    }
  }
);

/**
 * GET /ordermanagement/demandorders
 * Get demand orders for current distributor
 */
router.get(
  "/",
  authenticate,
  requireApiPermission("demandorder:read"),
  async (req, res) => {
    try {
      const { user } = req;
      const { status, page = 1, limit = 50 } = req.query;

      const query = { distributor_id: user.distributor_id };
      if (status) {
        query.status = status;
      }

      const skip = (parseInt(page) - 1) * parseInt(limit);

      const [orders, total] = await Promise.all([
        DemandOrder.find(query)
          .sort({ created_at: -1 })
          .skip(skip)
          .limit(parseInt(limit))
          .populate("distributor_id", "name")
          .populate("created_by", "username")
          .populate("approved_by", "username")
          .lean(),
        DemandOrder.countDocuments(query),
      ]);

      res.json({
        success: true,
        data: {
          orders,
          pagination: {
            total,
            page: parseInt(page),
            limit: parseInt(limit),
            pages: Math.ceil(total / parseInt(limit)),
          },
        },
      });
    } catch (error) {
      console.error("Error fetching demand orders:", error);
      res.status(500).json({
        success: false,
        message: "Failed to fetch demand orders",
        error: error.message,
      });
    }
  }
);

/**
 * GET /ordermanagement/demandorders/:id
 * Get single demand order
 */
router.get(
  "/:id",
  authenticate,
  requireApiPermission("demandorder:read"),
  async (req, res) => {
    try {
      const { user } = req;

      const order = await DemandOrder.findOne({
        _id: req.params.id,
        distributor_id: user.distributor_id,
      })
        .populate("distributor_id", "name")
        .populate("created_by", "username")
        .populate("approved_by", "username")
        .populate("rejected_by", "username")
        .lean();

      if (!order) {
        return res.status(404).json({
          success: false,
          message: "Demand order not found",
        });
      }

      res.json({
        success: true,
        data: order,
      });
    } catch (error) {
      console.error("Error fetching demand order:", error);
      res.status(500).json({
        success: false,
        message: "Failed to fetch demand order",
        error: error.message,
      });
    }
  }
);

/**
 * POST /ordermanagement/demandorders
 * Create new demand order (draft)
 */
router.post(
  "/",
  authenticate,
  requireApiPermission("demandorder:create"),
  async (req, res) => {
    try {
      const { user } = req;
      const { items, notes } = req.body;

      if (!items || !Array.isArray(items) || items.length === 0) {
        return res.status(400).json({
          success: false,
          message: "Order must have at least one item",
        });
      }

      // Create order
      const order = new DemandOrder({
        distributor_id: user.distributor_id,
        items,
        notes,
        status: "draft",
        created_by: user._id,
      });

      await order.save();

      const populatedOrder = await DemandOrder.findById(order._id)
        .populate("distributor_id", "name")
        .populate("created_by", "username")
        .lean();

      res.status(201).json({
        success: true,
        message: "Demand order created successfully",
        data: populatedOrder,
      });
    } catch (error) {
      console.error("Error creating demand order:", error);
      res.status(500).json({
        success: false,
        message: "Failed to create demand order",
        error: error.message,
      });
    }
  }
);

/**
 * PUT /ordermanagement/demandorders/:id
 * Update demand order (draft only)
 */
router.put(
  "/:id",
  authenticate,
  requireApiPermission("demandorder:update"),
  async (req, res) => {
    try {
      const { user } = req;
      const { items, notes } = req.body;

      const order = await DemandOrder.findOne({
        _id: req.params.id,
        distributor_id: user.distributor_id,
        status: "draft",
      });

      if (!order) {
        return res.status(404).json({
          success: false,
          message: "Draft order not found or cannot be modified",
        });
      }

      if (items) order.items = items;
      if (notes !== undefined) order.notes = notes;
      order.updated_by = user._id;

      await order.save();

      const populatedOrder = await DemandOrder.findById(order._id)
        .populate("distributor_id", "name")
        .populate("created_by", "username")
        .lean();

      res.json({
        success: true,
        message: "Demand order updated successfully",
        data: populatedOrder,
      });
    } catch (error) {
      console.error("Error updating demand order:", error);
      res.status(500).json({
        success: false,
        message: "Failed to update demand order",
        error: error.message,
      });
    }
  }
);

/**
 * POST /ordermanagement/demandorders/:id/submit
 * Submit demand order for approval
 */
router.post(
  "/:id/submit",
  authenticate,
  requireApiPermission("demandorder:update"),
  async (req, res) => {
    try {
      const { user } = req;

      const order = await DemandOrder.findOne({
        _id: req.params.id,
        distributor_id: user.distributor_id,
        status: "draft",
      });

      if (!order) {
        return res.status(404).json({
          success: false,
          message: "Draft order not found",
        });
      }

      // Validate cart quantities before submission
      const cartItems = order.items.map(item => ({
        product_id: item.source_id,
        sku: item.sku,
        quantity: item.quantity,
      }));

      const validation = await validateCartQuantities(user.distributor_id, cartItems);

      if (!validation.valid) {
        return res.status(400).json({
          success: false,
          message: "Cart validation failed",
          data: validation,
        });
      }

      // Submit order
      order.status = "submitted";
      order.submitted_at = new Date();
      order.updated_by = user._id;

      await order.save();

      const populatedOrder = await DemandOrder.findById(order._id)
        .populate("distributor_id", "name")
        .populate("created_by", "username")
        .lean();

      res.json({
        success: true,
        message: "Demand order submitted successfully",
        data: populatedOrder,
      });
    } catch (error) {
      console.error("Error submitting demand order:", error);
      res.status(500).json({
        success: false,
        message: "Failed to submit demand order",
        error: error.message,
      });
    }
  }
);

/**
 * DELETE /ordermanagement/demandorders/:id
 * Delete demand order (draft only)
 */
router.delete(
  "/:id",
  authenticate,
  requireApiPermission("demandorder:delete"),
  async (req, res) => {
    try {
      const { user } = req;

      const order = await DemandOrder.findOneAndDelete({
        _id: req.params.id,
        distributor_id: user.distributor_id,
        status: "draft",
      });

      if (!order) {
        return res.status(404).json({
          success: false,
          message: "Draft order not found or cannot be deleted",
        });
      }

      res.json({
        success: true,
        message: "Demand order deleted successfully",
      });
    } catch (error) {
      console.error("Error deleting demand order:", error);
      res.status(500).json({
        success: false,
        message: "Failed to delete demand order",
        error: error.message,
      });
    }
  }
);

module.exports = router;
