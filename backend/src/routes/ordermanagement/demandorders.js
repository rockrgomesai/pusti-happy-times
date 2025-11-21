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
 * Helper function to extract distributor ID from user object
 * Handles both populated (object) and unpopulated (ObjectId) cases
 */
function getDistributorId(user) {
  return user.distributor_id?._id || user.distributor_id;
}

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
      const { distributor_id } = req.query;

      // Use distributor_id from query (for approvers editing orders) or from user (for distributors)
      const targetDistributorId = distributor_id || user.distributor_id;

      if (!targetDistributorId) {
        return res.status(400).json({
          success: false,
          message: "Distributor ID is required",
        });
      }

      // Get distributor
      const distributor = await Distributor.findOne({ _id: targetDistributorId })
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
        .select(
          "_id sku mrp db_price category_id brand_id ctn_pcs depot_ids wt_pcs unit product_type"
        )
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
      const { distributor_id } = req.query;

      // Use distributor_id from query (for approvers editing orders) or from user (for distributors)
      const targetDistributorId = distributor_id || user.distributor_id;

      console.log(
        "🎁 Fetching offers for user:",
        user.username,
        "distributor_id:",
        targetDistributorId
      );

      if (!targetDistributorId) {
        return res.status(400).json({
          success: false,
          message: "Distributor ID is required",
        });
      }

      // Use the Offer model's static method to find eligible offers
      const offers = await Offer.findEligibleForDistributor(targetDistributorId);

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

    const distributorId = getDistributorId(user);

    if (!distributorId) {
      return res.status(400).json({
        success: false,
        message: "Distributor ID not found for user",
      });
    }

    const query = { distributor_id: distributorId };
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
 * GET /ordermanagement/demandorders/pending-approval
 * Get all demand orders pending approval for the logged-in ASM user
 * NOTE: This route MUST come before /:id to avoid route matching conflicts
 * Requires: demandorder:read permission
 */
router.get(
  "/pending-approval",
  authenticate,
  requireApiPermission("demandorder:read"),
  async (req, res) => {
    try {
      const userId = req.user.id;

      // Find all orders where current_approver_id = logged-in user and status = submitted
      const orders = await DemandOrder.find({
        current_approver_id: userId,
        status: "submitted",
      })
        .populate({
          path: "distributor_id",
          select: "name erp_id phone contact_person db_point_id",
          populate: {
            path: "db_point_id",
            select: "name ancestors",
          },
        })
        .populate("created_by", "name email")
        .sort({ submitted_at: -1, created_at: -1 })
        .lean();

      res.json({
        success: true,
        data: orders,
        count: orders.length,
      });
    } catch (error) {
      console.error("Error fetching pending approval orders:", error);
      res.status(500).json({
        success: false,
        message: "Failed to fetch pending approval orders",
        error: error.message,
      });
    }
  }
);

/**
 * GET /ordermanagement/demandorders/:id/financial-summary
 * Get financial summary for a demand order
 * NOTE: Must come BEFORE /:id route to avoid matching "financial-summary" as an ID
 */
router.get(
  "/:id/financial-summary",
  authenticate,
  requireApiPermission("demandorder:read"),
  async (req, res) => {
    try {
      const { user } = req;
      const CustomerLedger = require("../../models/CustomerLedger");
      const Collection = require("../../models/Collection");

      // Get the order - don't filter by distributor_id for ASM/RSM users
      const order = await DemandOrder.findById(req.params.id)
        .populate("distributor_id", "name erp_id")
        .lean();

      if (!order) {
        return res.status(404).json({
          success: false,
          message: "Demand order not found",
        });
      }

      // For distributors, verify they own this order
      const distributorId = getDistributorId(user);
      if (distributorId && order.distributor_id._id.toString() !== distributorId.toString()) {
        return res.status(403).json({
          success: false,
          message: "You do not have access to this order",
        });
      }

      // Calculate Available Balance from Customer Ledger for the order's distributor
      const ledgerEntries = await CustomerLedger.find({
        distributor_id: order.distributor_id._id,
      }).lean();

      const totalDebit = ledgerEntries.reduce((sum, entry) => sum + (entry.debit || 0), 0);
      const totalCredit = ledgerEntries.reduce((sum, entry) => sum + (entry.credit || 0), 0);
      const availableBalance = totalDebit - totalCredit;

      // Get all payments (collections) linked to this DO
      const payments = await Collection.find({
        do_no: order.order_number,
      })
        .populate("created_by", "username")
        .populate("depositor_bank", "name")
        .populate("company_bank", "name")
        .lean();

      // Calculate unapproved payments total (not approved/cancelled)
      const unapprovedPayments = payments
        .filter((p) => p.approval_status !== "approved" && p.approval_status !== "cancelled")
        .reduce((sum, payment) => {
          const amount =
            payment.deposit_amount instanceof Object
              ? parseFloat(payment.deposit_amount.toString())
              : payment.deposit_amount;
          return sum + (amount || 0);
        }, 0);

      // Calculate totals
      // Remaining Amount = Total - Available Balance
      // Due Amount = Remaining Amount - Unapproved Payments
      const orderTotal = order.total_amount || 0;
      const remainingAmount = orderTotal - availableBalance;
      const dueAmount = remainingAmount - unapprovedPayments;

      res.json({
        success: true,
        data: {
          order_total: parseFloat(orderTotal.toFixed(2)),
          available_balance: parseFloat(availableBalance.toFixed(2)),
          remaining_amount: parseFloat(remainingAmount.toFixed(2)),
          unapproved_payments: parseFloat(unapprovedPayments.toFixed(2)),
          due_amount: parseFloat(dueAmount.toFixed(2)),
          payments: payments.map((p) => ({
            _id: p._id,
            transaction_id: p.transaction_id,
            payment_date: p.deposit_date,
            payment_method: p.payment_method,
            amount:
              p.deposit_amount instanceof Object
                ? parseFloat(p.deposit_amount.toString())
                : p.deposit_amount,
            status: p.approval_status,
            depositor_bank: p.depositor_bank,
            company_bank: p.company_bank,
            created_by: p.created_by,
            // Additional fields needed for editing
            cash_method: p.cash_method,
            depositor_mobile: p.depositor_mobile,
            depositor_branch: p.depositor_branch,
            company_bank_account_no: p.company_bank_account_no,
            do_no: p.do_no,
            note: p.note,
            check_number: p.check_number,
            image: p.image,
          })),
        },
      });
    } catch (error) {
      console.error("Error fetching financial summary:", error);
      res.status(500).json({
        success: false,
        message: "Failed to fetch financial summary",
        error: error.message,
      });
    }
  }
);

/**
 * GET /ordermanagement/demandorders/:id
 * Get single demand order
 */
router.get("/:id", authenticate, requireApiPermission("demandorder:read"), async (req, res) => {
  try {
    const { user } = req;
    const distributorId = getDistributorId(user);

    const order = await DemandOrder.findOne({
      _id: req.params.id,
      distributor_id: distributorId,
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
      distributor_id: getDistributorId(user),
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
 * Update demand order
 * - Distributors can only update their own draft orders
 * - ASM/RSM/ZSM/NSM/SA/OM/Finance can update any order (including submitted)
 */
router.put("/:id", authenticate, requireApiPermission("demandorder:update"), async (req, res) => {
  try {
    const { user } = req;
    const { items, notes, edit_reason } = req.body;
    const distributorId = getDistributorId(user);
    const Role = require("../../models/Role");
    const Employee = require("../../models/Employee");

    // Get user's role to determine permissions
    let userRole = null;
    if (user.role_id) {
      // Check if role_id is already populated (object) or just an ID (string)
      if (typeof user.role_id === "object" && user.role_id.name) {
        userRole = user.role_id;
      } else {
        userRole = await Role.findById(user.role_id).lean();
      }
    }

    console.log("PUT /:id - User role check:", {
      hasRoleId: !!user.role_id,
      roleType: typeof user.role_id,
      roleName: userRole?.name,
      distributorId: distributorId,
    });

    // Check if user is an approver role (ASM, RSM, ZSM, NSM, SA, OM, Finance, Distribution)
    const approverRoles = [
      "ASM",
      "RSM",
      "ZSM",
      "NSM",
      "Sales Admin",
      "Order Management",
      "Finance",
      "Distribution",
    ];
    const isApprover = userRole && approverRoles.includes(userRole.name);

    console.log("PUT /:id - Permission check:", {
      isApprover,
      hasDistributorId: !!distributorId,
      willTakeDistributorPath: distributorId && !isApprover,
      willTakeApproverPath: isApprover,
    });

    let order;

    if (distributorId && !isApprover) {
      // Distributor can only edit their own draft orders
      order = await DemandOrder.findOne({
        _id: req.params.id,
        distributor_id: distributorId,
        status: "draft",
      });

      if (!order) {
        return res.status(404).json({
          success: false,
          message: "Draft order not found or cannot be modified",
        });
      }
    } else if (isApprover) {
      // Approvers can edit any order (draft or submitted)
      console.log("Taking approver path - fetching order:", req.params.id);
      order = await DemandOrder.findById(req.params.id);

      if (!order) {
        console.log("Order not found for approver");
        return res.status(404).json({
          success: false,
          message: "Order not found",
        });
      }

      console.log("Order found, status:", order.status);
      // Don't allow editing of approved/cancelled orders
      if (order.status === "approved" || order.status === "cancelled") {
        return res.status(400).json({
          success: false,
          message: `Cannot edit ${order.status} orders`,
        });
      }
    } else {
      console.log("PERMISSION DENIED - Neither distributor nor approver");
      console.log("Debug info:", {
        hasDistributorId: !!distributorId,
        isApprover,
        userRoleName: userRole?.name,
        userId: user._id,
      });
      return res.status(403).json({
        success: false,
        message: "You do not have permission to edit orders",
      });
    }

    // Track if this is an edit by approver on a submitted order
    const isApproverEdit = isApprover && order.status !== "draft";

    // Update fields
    if (items) order.items = items;
    if (notes !== undefined) order.notes = notes;
    order.updated_by = user._id;

    // Add edit history entry for approver edits
    if (isApproverEdit) {
      if (!order.edit_history) {
        order.edit_history = [];
      }
      order.edit_history.push({
        edited_by: user._id,
        edited_by_role: userRole.name,
        edited_at: new Date(),
        edit_reason: edit_reason || "Order modified by " + userRole.name,
        previous_total: order.total_amount,
        new_total: items ? items.reduce((sum, item) => sum + item.subtotal, 0) : order.total_amount,
      });
    }

    await order.save();

    const populatedOrder = await DemandOrder.findById(order._id)
      .populate("distributor_id", "name erp_id phone contact_person")
      .populate("created_by", "username")
      .populate("updated_by", "username")
      .lean();

    res.json({
      success: true,
      message: isApproverEdit
        ? `Order updated by ${userRole.name}`
        : "Demand order updated successfully",
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
  requireApiPermission("demandorder:submit"),
  async (req, res) => {
    try {
      const { user } = req;
      const distributorId = getDistributorId(user);

      const order = await DemandOrder.findOne({
        _id: req.params.id,
        distributor_id: distributorId,
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

      // Find distributor details with territory
      const Distributor = require("../../models/Distributor");
      const distributor = await Distributor.findById(user.distributor_id)
        .populate("db_point_id")
        .lean();

      if (!distributor || !distributor.db_point_id) {
        return res.status(400).json({
          success: false,
          message: "Distributor territory information not found",
        });
      }

      // Get the area ID from distributor's DB Point territory hierarchy
      const dbPoint = distributor.db_point_id;
      const areaId =
        dbPoint.ancestors && dbPoint.ancestors.length >= 1
          ? dbPoint.ancestors[0] // First ancestor is Area
          : null;

      if (!areaId) {
        return res.status(400).json({
          success: false,
          message: "Area information not found for distributor",
        });
      }

      // Find Area Manager (ASM) assigned to this area
      const User = require("../../models/User");
      const Employee = require("../../models/Employee");
      const Role = require("../../models/Role");

      const asmRole = await Role.findOne({ role: "ASM" }).lean();

      if (!asmRole) {
        return res.status(500).json({
          success: false,
          message: "ASM role not found in system",
        });
      }

      // Find all users with ASM role
      const asmUsers = await User.find({
        role_id: asmRole._id,
        active: true,
      })
        .populate("employee_id")
        .lean();

      if (!asmUsers || asmUsers.length === 0) {
        return res.status(400).json({
          success: false,
          message: "No ASM users found in system",
        });
      }

      // Filter ASMs who have this area in their territory assignments
      const assignedASM = asmUsers.find((user) => {
        const employee = user.employee_id;
        return (
          employee &&
          employee.territory_assignments &&
          employee.territory_assignments.all_territory_ids &&
          employee.territory_assignments.all_territory_ids.some(
            (territoryId) => territoryId.toString() === areaId.toString()
          )
        );
      });

      if (!assignedASM) {
        return res.status(400).json({
          success: false,
          message: "No ASM assigned to this distributor's area",
        });
      }

      const asmUser = assignedASM;

      // Submit order and assign to ASM
      order.status = "submitted";
      order.submitted_at = new Date();
      order.current_approver_id = asmUser._id;
      order.current_approver_role = "ASM";
      order.updated_by = user._id;

      // Add to approval history
      order.approval_history.push({
        action: "submit",
        performed_by: user._id,
        performed_by_role: "Distributor",
        from_status: "draft",
        to_status: "submitted",
        comments: "Submitted for approval",
        timestamp: new Date(),
      });

      await order.save();

      const populatedOrder = await DemandOrder.findById(order._id)
        .populate("distributor_id", "name erp_id contact_person mobile")
        .populate("created_by", "username")
        .populate("current_approver_id", "username")
        .lean();

      res.json({
        success: true,
        message: "Demand order submitted successfully to ASM",
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
      const distributorId = user.distributor_id?._id || user.distributor_id;

      const order = await DemandOrder.findOneAndDelete({
        _id: req.params.id,
        distributor_id: distributorId,
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

/**
 * POST /ordermanagement/demandorders/:id/forward-to-rsm
 * Forward a demand order from ASM to RSM for approval
 * Requires: demandorder:submit permission
 */
router.post(
  "/:id/forward-to-rsm",
  authenticate,
  requireApiPermission("demandorder:submit"),
  async (req, res) => {
    try {
      const orderId = req.params.id;
      const userId = req.user.id;
      const userName = req.user.name || "Unknown User";

      // Find the demand order
      const order = await DemandOrder.findById(orderId).populate("distributor_id");

      if (!order) {
        return res.status(404).json({
          success: false,
          message: "Demand order not found",
        });
      }

      // Verify current approver is the logged-in ASM
      if (order.current_approver_id.toString() !== userId) {
        return res.status(403).json({
          success: false,
          message: "You are not authorized to approve this order",
        });
      }

      // Verify order is in submitted status
      if (order.status !== "submitted") {
        return res.status(400).json({
          success: false,
          message: `Cannot forward order with status: ${order.status}`,
        });
      }

      // Get distributor's DB Point territory to find Region
      const distributor = order.distributor_id;
      if (!distributor.db_point_id) {
        return res.status(400).json({
          success: false,
          message: "Distributor has no DB Point assigned",
        });
      }

      const dbPoint = await require("../../models/Territory").findById(distributor.db_point_id);

      if (!dbPoint || !dbPoint.ancestors || dbPoint.ancestors.length === 0) {
        return res.status(400).json({
          success: false,
          message: "DB Point has no parent territories",
        });
      }

      // ancestors[0] is Area, ancestors[1] is Region
      const regionId = dbPoint.ancestors[1]?._id;
      if (!regionId) {
        return res.status(400).json({
          success: false,
          message: "Could not determine Region for this distributor",
        });
      }

      // Find RSM role
      const { Role } = require("../../models");
      const rsmRole = await Role.findOne({ role: "RSM" });

      if (!rsmRole) {
        return res.status(500).json({
          success: false,
          message: "RSM role not found in system",
        });
      }

      // Find all Users with RSM role
      const { User, Employee } = require("../../models");
      const rsmUsers = await User.find({ role_id: rsmRole._id }).populate("employee_id").lean();

      // Filter RSMs whose territory_assignments include the Region
      const matchingRSM = rsmUsers.find((user) => {
        if (!user.employee_id || !user.employee_id.territory_assignments) return false;
        const allTerritories = user.employee_id.territory_assignments.all_territory_ids || [];
        return allTerritories.some((tid) => tid.toString() === regionId.toString());
      });

      if (!matchingRSM) {
        return res.status(404).json({
          success: false,
          message: "RSM user account not found for this distributor's region",
        });
      }

      // Update order: forward to RSM
      order.current_approver_id = matchingRSM._id;
      order.current_approver_role = "RSM";

      // Add to approval history
      order.approval_history.push({
        action: "forward",
        performed_by: userId,
        performed_by_name: userName,
        performed_by_role: "ASM",
        from_status: "submitted",
        to_status: "submitted",
        comments: `Forwarded to RSM for approval`,
        timestamp: new Date(),
      });

      await order.save();

      res.json({
        success: true,
        message: `Order ${order.order_number} forwarded to RSM successfully`,
        data: order,
      });
    } catch (error) {
      console.error("Error forwarding order to RSM:", error);
      res.status(500).json({
        success: false,
        message: "Failed to forward order to RSM",
        error: error.message,
      });
    }
  }
);

/**
 * POST /ordermanagement/demandorders/:id/cancel
 * Cancel a demand order (ASM can cancel orders assigned to them)
 * Requires: demandorder:update permission
 */
router.post(
  "/:id/cancel",
  authenticate,
  requireApiPermission("demandorder:update"),
  async (req, res) => {
    try {
      const orderId = req.params.id;
      const userId = req.user.id;
      const userName = req.user.name || "Unknown User";
      const { reason } = req.body;

      if (!reason || !reason.trim()) {
        return res.status(400).json({
          success: false,
          message: "Cancellation reason is required",
        });
      }

      // Find the demand order
      const order = await DemandOrder.findById(orderId);

      if (!order) {
        return res.status(404).json({
          success: false,
          message: "Demand order not found",
        });
      }

      // Verify current approver is the logged-in user
      if (order.current_approver_id.toString() !== userId) {
        return res.status(403).json({
          success: false,
          message: "You are not authorized to cancel this order",
        });
      }

      // Cannot cancel already approved/rejected/cancelled orders
      if (["approved", "rejected", "cancelled"].includes(order.status)) {
        return res.status(400).json({
          success: false,
          message: `Cannot cancel order with status: ${order.status}`,
        });
      }

      // Update order status to cancelled
      const previousStatus = order.status;
      order.status = "cancelled";
      order.cancellation_reason = reason;
      order.cancelled_at = new Date();

      // Add to approval history
      order.approval_history.push({
        action: "cancel",
        performed_by: userId,
        performed_by_name: userName,
        performed_by_role: order.current_approver_role || "Unknown",
        from_status: previousStatus,
        to_status: "cancelled",
        comments: reason,
        timestamp: new Date(),
      });

      await order.save();

      res.json({
        success: true,
        message: `Order ${order.order_number} cancelled successfully`,
        data: order,
      });
    } catch (error) {
      console.error("Error cancelling order:", error);
      res.status(500).json({
        success: false,
        message: "Failed to cancel order",
        error: error.message,
      });
    }
  }
);

module.exports = router;
