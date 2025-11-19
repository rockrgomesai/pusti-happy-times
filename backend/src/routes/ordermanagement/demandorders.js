const express = require("express");
const DemandOrder = require("../../models/DemandOrder");
const Product = require("../../models/Product");
const Offer = require("../../models/Offer");
const Distributor = require("../../models/Distributor");
const Category = require("../../models/Category");
const DepotStock = require("../../models/DepotStock");
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
    const productIds = [...new Set(cartItems.map((item) => item.product_id.toString()))];

    // Fetch all products in one query - only MANUFACTURED products
    const products = await Product.find({
      _id: { $in: productIds },
      active: true,
      product_type: "MANUFACTURED",
    })
      .select("_id sku depot_ids product_type")
      .lean();

    if (products.length !== productIds.length) {
      return { valid: false, error: "Some products are inactive, not manufactured, or not found" };
    }

    // Create product map for quick lookup
    const productMap = new Map(products.map((p) => [p._id.toString(), p]));

    // Get stock from DepotStock collection for all relevant depots and products
    const relevantDepotIds = [];
    if (distributor.delivery_depot_id) {
      relevantDepotIds.push(distributor.delivery_depot_id);
    }
    products.forEach((p) => {
      if (p.depot_ids && p.depot_ids.length > 0) {
        relevantDepotIds.push(...p.depot_ids);
      }
    });

    const depotStocks = await DepotStock.find({
      depot_id: { $in: relevantDepotIds },
      product_id: { $in: productIds },
    })
      .select("depot_id product_id qty_ctn")
      .lean();

    // Create stock lookup map: "depot_id:product_id" => qty_ctn
    const stockMap = new Map();
    depotStocks.forEach((stock) => {
      const key = `${stock.depot_id.toString()}:${stock.product_id.toString()}`;
      const qty = stock.qty_ctn.$numberDecimal
        ? parseFloat(stock.qty_ctn.$numberDecimal)
        : parseFloat(stock.qty_ctn);
      stockMap.set(key, qty);
    });

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

    const pendingMap = new Map(pendingDOs.map((p) => [p._id.toString(), p.totalPendingQty]));

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

      // Calculate available quantity from DepotStock collection
      let distributorDepotQty = 0;
      let productDepotsQty = 0;

      // Get quantity from distributor's delivery depot
      if (distributor.delivery_depot_id) {
        const key = `${distributor.delivery_depot_id.toString()}:${product._id.toString()}`;
        distributorDepotQty = stockMap.get(key) || 0;
      }

      // Get quantity from product's assigned depots
      if (product.depot_ids && product.depot_ids.length > 0) {
        productDepotsQty = product.depot_ids.reduce((sum, depotId) => {
          const key = `${depotId.toString()}:${product._id.toString()}`;
          return sum + (stockMap.get(key) || 0);
        }, 0);
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
        error:
          item.quantity > availableAfterPending
            ? `Insufficient stock. Available: ${availableAfterPending}, Requested: ${item.quantity}`
            : null,
      });
    }

    const allValid = validationResults.every((r) => r.valid);

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
 * GET /ordermanagement/demandorders/catalog/category-hierarchy
 * Get category hierarchy filtered by distributor segments
 */
router.get(
  "/catalog/category-hierarchy",
  authenticate,
  requireApiPermission("demandorder:read"),
  async (req, res) => {
    try {
      const { user } = req;

      // Get distributor for current user
      const distributor = await Distributor.findOne({ _id: user.distributor_id })
        .select("product_segment")
        .lean();

      if (!distributor) {
        return res.status(404).json({
          success: false,
          message: "Distributor not found",
        });
      }

      // Get all categories for distributor segments
      const categories = await Category.find({
        active: true,
        product_segment: { $in: distributor.product_segment },
      })
        .select("_id name parent_id product_segment")
        .sort({ name: 1 })
        .lean();

      // Build hierarchy tree
      const categoryMap = new Map();
      const rootCategories = [];

      // First pass: Create map of all categories
      categories.forEach((cat) => {
        categoryMap.set(cat._id.toString(), { ...cat, children: [] });
      });

      // Second pass: Build tree structure
      categories.forEach((cat) => {
        if (!cat.parent_id) {
          rootCategories.push(categoryMap.get(cat._id.toString()));
        } else {
          const parent = categoryMap.get(cat.parent_id.toString());
          if (parent) {
            parent.children.push(categoryMap.get(cat._id.toString()));
          }
        }
      });

      res.json({
        success: true,
        data: rootCategories,
      });
    } catch (error) {
      console.error("Error fetching category hierarchy:", error);
      res.status(500).json({
        success: false,
        message: "Failed to fetch category hierarchy",
        error: error.message,
      });
    }
  }
);

/**
 * GET /ordermanagement/demandorders/catalog/products
 * Get available products for distributor (filtered by segments, blacklist, active status)
 * Grouped by category
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

      // Get categories for distributor segments
      const categoryIds = await Category.find({
        active: true,
        product_segment: { $in: distributor.product_segment },
      })
        .select("_id")
        .lean();

      const categoryIdList = categoryIds.map((c) => c._id);

      // Build query - filter by category segments and MANUFACTURED products only
      const query = {
        active: true,
        product_type: "MANUFACTURED", // Only show manufactured products
        category_id: { $in: categoryIdList },
      };

      // Exclude blacklisted SKUs
      if (distributor.skus_exclude && distributor.skus_exclude.length > 0) {
        query._id = { $nin: distributor.skus_exclude };
      }

      const products = await Product.find(query)
        .select("_id sku mrp category_id brand_id ctn_pcs depot_ids wt_pcs unit product_type")
        .populate({
          path: "category_id",
          select: "name parent_id product_segment",
        })
        .populate("brand_id", "name")
        .sort({ sku: 1 })
        .lean();

      // Get stock from DepotStock collection for all relevant depots and products
      const productIds = products.map((p) => p._id);
      const relevantDepotIds = [];
      if (distributor.delivery_depot_id) {
        relevantDepotIds.push(distributor.delivery_depot_id);
      }
      products.forEach((p) => {
        if (p.depot_ids && p.depot_ids.length > 0) {
          relevantDepotIds.push(...p.depot_ids);
        }
      });

      const depotStocks = await DepotStock.find({
        depot_id: { $in: relevantDepotIds },
        product_id: { $in: productIds },
      })
        .select("depot_id product_id qty_ctn")
        .lean();

      // Create stock lookup map: "depot_id:product_id" => qty_ctn
      const stockMap = new Map();
      depotStocks.forEach((stock) => {
        const key = `${stock.depot_id.toString()}:${stock.product_id.toString()}`;
        const qty = stock.qty_ctn.$numberDecimal
          ? parseFloat(stock.qty_ctn.$numberDecimal)
          : parseFloat(stock.qty_ctn);
        stockMap.set(key, qty);
      });

      // Get pending DO quantities for all products in one aggregation query
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

      const pendingMap = new Map(pendingDOs.map((p) => [p._id.toString(), p.totalPendingQty]));

      // Transform to match frontend expectations and group by category
      const transformedProducts = products.map((p) => {
        // Generate description from category and brand
        const categoryName = p.category_id?.name || "Product";
        const brandName = p.brand_id?.name || "";
        const description = `${categoryName}${brandName ? " - " + brandName : ""} (${p.wt_pcs?.toFixed(0) || 0}g)`;

        // Calculate available quantity from DepotStock collection
        let distributorDepotQty = 0;
        let productDepotsQty = 0;

        // Get quantity from distributor's delivery depot
        if (distributor.delivery_depot_id) {
          const key = `${distributor.delivery_depot_id.toString()}:${p._id.toString()}`;
          distributorDepotQty = stockMap.get(key) || 0;
        }

        // Get quantity from product's assigned depots
        if (p.depot_ids && p.depot_ids.length > 0) {
          productDepotsQty = p.depot_ids.reduce((sum, depotId) => {
            const key = `${depotId.toString()}:${p._id.toString()}`;
            return sum + (stockMap.get(key) || 0);
          }, 0);
        }

        // Get pending quantity
        const pendingQty = pendingMap.get(p._id.toString()) || 0;

        // Calculate available
        const totalAvailable = distributorDepotQty + productDepotsQty;
        const availableAfterPending = totalAvailable - pendingQty;

        return {
          ...p,
          short_description: description,
          unit_per_case: p.ctn_pcs || 0,
          category: p.category_id,
          brand: p.brand_id,
          available_quantity: availableAfterPending,
          distributor_depot_qty: distributorDepotQty,
          product_depots_qty: productDepotsQty,
          pending_qty: pendingQty,
        };
      });

      // Group products by category
      const productsByCategory = {};
      transformedProducts.forEach((product) => {
        const categoryId = product.category?._id?.toString() || "uncategorized";
        if (!productsByCategory[categoryId]) {
          productsByCategory[categoryId] = {
            category: product.category,
            products: [],
          };
        }
        productsByCategory[categoryId].products.push(product);
      });

      res.json({
        success: true,
        data: {
          products: transformedProducts,
          productsByCategory,
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
 * Updated: 2025-11-07
 */
router.get(
  "/catalog/offers",
  authenticate,
  requireApiPermission("demandorder:read"),
  async (req, res) => {
    try {
      const { user } = req;

      console.log(
        "🎁 Fetching offers for user:",
        user.username,
        "distributor_id:",
        user.distributor_id
      );

      if (!user.distributor_id) {
        return res.status(400).json({
          success: false,
          message: "User is not associated with a distributor",
        });
      }

      // Use the Offer model's static method to find eligible offers
      const offers = await Offer.findEligibleForDistributor(user.distributor_id);

      console.log("🎁 Found offers:", offers.length);

      res.json({
        success: true,
        data: offers,
      });
    } catch (error) {
      console.error("❌ Error fetching offers catalog:", error);
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
router.get("/", authenticate, requireApiPermission("demandorder:read"), async (req, res) => {
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
});

/**
 * GET /ordermanagement/demandorders/:id
 * Get single demand order
 */
router.get("/:id", authenticate, requireApiPermission("demandorder:read"), async (req, res) => {
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
});

/**
 * POST /ordermanagement/demandorders
 * Create new demand order (draft)
 */
router.post("/", authenticate, requireApiPermission("demandorder:create"), async (req, res) => {
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
});

/**
 * PUT /ordermanagement/demandorders/:id
 * Update demand order (draft only)
 */
router.put("/:id", authenticate, requireApiPermission("demandorder:update"), async (req, res) => {
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
});

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
      const cartItems = order.items.map((item) => ({
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
