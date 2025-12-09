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
 * GET /ordermanagement/demandorders/approved-rejected
 * Get approved or rejected orders for Finance role
 * Query params: status (approved/rejected), from_date, to_date, page, limit
 */
router.get(
  "/approved-rejected",
  authenticate,
  requireApiPermission("demandorder:read"),
  async (req, res) => {
    try {
      const { status, from_date, to_date, page = 1, limit = 20 } = req.query;

      // Build base query for approved or rejected orders
      const query = {
        status: { $in: ["approved", "rejected"] },
      };

      // Filter by specific status if provided
      if (status && ["approved", "rejected"].includes(status.toLowerCase())) {
        query.status = status.toLowerCase();
      }

      // Date range filter on approval_history
      if (from_date || to_date) {
        query["approval_history"] = {
          $elemMatch: {
            action: { $in: ["approve", "reject"] },
          },
        };

        if (from_date) {
          query["approval_history.$elemMatch"].timestamp = {
            $gte: new Date(from_date),
          };
        }

        if (to_date) {
          const endDate = new Date(to_date);
          endDate.setHours(23, 59, 59, 999);
          query["approval_history.$elemMatch"].timestamp = {
            ...query["approval_history.$elemMatch"].timestamp,
            $lte: endDate,
          };
        }
      }

      // Pagination
      const skip = (parseInt(page) - 1) * parseInt(limit);
      const limitNum = parseInt(limit);

      // Fetch orders
      const orders = await DemandOrder.find(query)
        .populate("distributor_id", "name code territory_id")
        .populate({
          path: "distributor_id",
          populate: {
            path: "territory_id",
            select: "name",
          },
        })
        .sort({ order_date: -1 })
        .skip(skip)
        .limit(limitNum)
        .lean();

      // Count total for pagination
      const total = await DemandOrder.countDocuments(query);

      // Extract approval/rejection info from approval_history
      const ordersWithApprovalInfo = orders.map((order) => {
        // Find the most recent approve or reject action
        const approvalEntry = [...order.approval_history]
          .reverse()
          .find((entry) => entry.action === "approve" || entry.action === "reject");

        return {
          order_number: order.order_number,
          order_date: order.order_date,
          status: order.status,
          distributor_name: order.distributor_id?.name || "N/A",
          distributor_code: order.distributor_id?.code || "N/A",
          territory_name: order.distributor_id?.territory_id?.name || "N/A",
          total_amount: order.total_amount,
          item_count: order.item_count,
          approval_info: approvalEntry
            ? {
                action: approvalEntry.action,
                timestamp: approvalEntry.timestamp,
                performed_by_role: approvalEntry.performed_by_role,
                comments: approvalEntry.comments,
              }
            : null,
          items: order.items.map((item) => ({
            sku: item.sku,
            product_name: item.product_name,
            source_type: item.source_type,
            unit_price: item.unit_price,
            quantity: item.quantity,
            subtotal: item.subtotal,
            discount_applied: item.discount_applied,
            final_amount: item.final_amount,
          })),
        };
      });

      res.json({
        success: true,
        data: ordersWithApprovalInfo,
        pagination: {
          total,
          page: parseInt(page),
          limit: limitNum,
          totalPages: Math.ceil(total / limitNum),
        },
      });
    } catch (error) {
      console.error("Error fetching approved/rejected orders:", error);
      res.status(500).json({
        success: false,
        message: "Failed to fetch approved/rejected orders",
        error: error.message,
      });
    }
  }
);

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
      const User = require("../../models/User");
      const Role = require("../../models/Role");
      const Employee = require("../../models/Employee");

      console.log("🔍 Pending Approval Query Debug:");
      console.log("  User ID:", userId);

      // Get user's role and employee info
      const user = await User.findById(userId).populate("role_id").populate("employee_id").lean();
      
      if (!user || !user.role_id) {
        return res.status(403).json({
          success: false,
          message: "User role not found",
        });
      }

      const roleName = user.role_id.role || user.role_id.name;
      console.log("  Role:", roleName);

      let query = {};

      // Territory-based filtering for territorial roles (ASM, RSM, ZSM)
      const Distributor = require("../../models/Distributor");
      const Territory = require("../../models/Territory");

      if (roleName === "ASM" || roleName === "RSM" || roleName === "ZSM") {
        // Check if user has territory assignments
        if (!user.employee_id?.territory_assignments?.all_territory_ids || 
            user.employee_id.territory_assignments.all_territory_ids.length === 0) {
          console.log(`  ${roleName} has no territory assignments - returning empty`);
          return res.json({
            success: true,
            data: [],
            count: 0,
            message: "No territories assigned to this user"
          });
        }
        
        const userTerritories = user.employee_id.territory_assignments.all_territory_ids;
        console.log(`  ${roleName} Territories:`, userTerritories.length);

        // Get the territory level to filter by
        let territoryLevel;
        let approverRole;
        
        if (roleName === "ASM") {
          territoryLevel = "Area";
          approverRole = "ASM";
        } else if (roleName === "RSM") {
          territoryLevel = "Region";
          approverRole = "RSM";
        } else if (roleName === "ZSM") {
          territoryLevel = "Zone";
          approverRole = "ZSM";
        }

        // Find territories of the appropriate level
        const territories = await Territory.find({
          _id: { $in: userTerritories },
          territory_level: territoryLevel
        }).select("_id").lean();

        const territoryIds = territories.map(t => t._id);
        console.log(`  Filtered ${territoryLevel} IDs:`, territoryIds.length);

        if (territoryIds.length === 0) {
          // No territories found, return empty
          query = { _id: null };
        } else {
          // Find DB Points under these territories (DB Points have ancestors: [area, region, zone])
          const dbPoints = await Territory.find({
            territory_level: "DB Point",
            "ancestors": { $in: territoryIds }
          }).select("_id").lean();

          const dbPointIds = dbPoints.map(d => d._id);
          console.log("  DB Point IDs:", dbPointIds.length);

          if (dbPointIds.length === 0) {
            query = { _id: null };
          } else {
            // Find distributors with these DB Points
            const distributors = await Distributor.find({
              db_point_id: { $in: dbPointIds }
            }).select("_id").lean();

            const distributorIds = distributors.map(d => d._id);
            console.log(`  Distributor IDs in ${roleName} territory:`, distributorIds.length);

            if (distributorIds.length === 0) {
              query = { _id: null };
            } else {
              query = {
                distributor_id: { $in: distributorIds },
                current_approver_role: approverRole,
                status: "submitted"
              };
            }
          }
        }
      } else {
        // For non-territorial roles (Sales Admin, Order Management, Finance, Distribution)
        // Show orders where current_approver_role matches their role
        const roleMapping = {
          "Sales Admin": "Sales Admin",
          "Order Management": "Order Management",
          "Finance": "Finance",
          "Distribution": "Distribution"
        };
        
        query = {
          current_approver_role: roleMapping[roleName] || roleName,
          status: { $nin: ["draft", "approved", "cancelled", "rejected"] }
        };
      }

      console.log("  Query:", JSON.stringify(query));

      const orders = await DemandOrder.find(query)
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

      console.log("  Orders found:", orders.length);

      // Fix missing performed_by_name in approval history for all orders
      const User = require("../../models/User");
      const Distributor = require("../../models/Distributor");
      for (let order of orders) {
        if (order.approval_history) {
          for (let entry of order.approval_history) {
            if (!entry.performed_by_name && entry.performed_by) {
              const historyUser = await User.findById(entry.performed_by).select("username").lean();
              if (historyUser) {
                entry.performed_by_name = historyUser.username;
              } else if (entry.performed_by_role === "Distributor") {
                const dist = await Distributor.findById(order.distributor_id._id)
                  .select("name")
                  .lean();
                entry.performed_by_name = dist?.name || "Distributor";
              } else {
                entry.performed_by_name = entry.performed_by_role || "Unknown";
              }
            }
          }
        }
      }

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

      console.log("📊 Financial Summary Debug:");
      console.log("  Distributor ID:", order.distributor_id._id);
      console.log("  Ledger Entries Found:", ledgerEntries.length);
      console.log("  Ledger Entries:", JSON.stringify(ledgerEntries, null, 2));

      const totalDebit = ledgerEntries.reduce((sum, entry) => sum + (entry.debit || 0), 0);
      const totalCredit = ledgerEntries.reduce((sum, entry) => sum + (entry.credit || 0), 0);
      const availableBalance = totalDebit - totalCredit;

      console.log("  Total Debit:", totalDebit);
      console.log("  Total Credit:", totalCredit);
      console.log("  Available Balance:", availableBalance);

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
      // Remaining Amount = Total + Available Balance (balance is negative for credit, so this reduces the amount)
      // Due Amount = Remaining Amount - Unapproved Payments
      const orderTotal = order.total_amount || 0;
      const remainingAmount = orderTotal + availableBalance;
      const dueAmount = remainingAmount - unapprovedPayments;

      res.json({
        success: true,
        data: {
          orderTotal: parseFloat(orderTotal.toFixed(2)),
          availableBalance: parseFloat(availableBalance.toFixed(2)),
          remainingAmount: parseFloat(remainingAmount.toFixed(2)),
          unapprovedPayments: parseFloat(unapprovedPayments.toFixed(2)),
          dueAmount: parseFloat(dueAmount.toFixed(2)),
          payments: payments.map((p) => ({
            _id: p._id,
            transaction_id: p.transaction_id,
            deposit_date: p.deposit_date,
            payment_method: p.payment_method,
            deposit_amount:
              p.deposit_amount instanceof Object
                ? parseFloat(p.deposit_amount.toString())
                : p.deposit_amount,
            status: p.approval_status,
            approval_status: p.approval_status,
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

    // Build query - HQ users (without distributor_id) can view any order
    const query = { _id: req.params.id };
    if (distributorId) {
      query.distributor_id = distributorId;
    }

    const order = await DemandOrder.findOne(query)
      .populate("distributor_id", "name erp_id db_point_id")
      .populate({
        path: "distributor_id",
        populate: {
          path: "db_point_id",
          select: "name territory_level",
        },
      })
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

    // Manually populate product details for items
    if (order.items && order.items.length > 0) {
      const Product = require("../../models/Product");
      const Offer = require("../../models/Offer");

      for (let item of order.items) {
        if (item.source === "product" && item.source_id) {
          const product = await Product.findById(item.source_id)
            .select("name sku erp_id unit")
            .lean();
          if (product) {
            item.product_id = product;
          }
        } else if (item.source === "offer" && item.source_id) {
          const offer = await Offer.findById(item.source_id).select("name code").lean();
          if (offer) {
            item.offer_id = offer;
          }
        }
      }
    }

    // Fix missing performed_by_name in approval history
    if (order.approval_history) {
      const User = require("../../models/User");
      const Distributor = require("../../models/Distributor");
      for (let entry of order.approval_history) {
        if (!entry.performed_by_name && entry.performed_by) {
          const historyUser = await User.findById(entry.performed_by).select("username").lean();
          if (historyUser) {
            entry.performed_by_name = historyUser.username;
          } else if (entry.performed_by_role === "Distributor") {
            const dist = await Distributor.findById(order.distributor_id._id).select("name").lean();
            entry.performed_by_name = dist?.name || "Distributor";
          } else {
            entry.performed_by_name = entry.performed_by_role || "Unknown";
          }
        }
      }
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
      console.log("🔍 Submit - User Info:", {
        userId: user._id,
        username: user.username,
        distributorName: distributor.name,
        finalName: user.username || distributor.name || "Distributor",
      });

      order.approval_history.push({
        action: "submit",
        performed_by: user._id,
        performed_by_name: user.username || distributor.name || "Distributor",
        performed_by_role: "Distributor",
        from_status: "draft",
        to_status: "submitted",
        comments: "Submitted for approval",
        timestamp: new Date(),
      });

      console.log(
        "🔍 Approval history entry added:",
        order.approval_history[order.approval_history.length - 1]
      );

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
      const userName = req.user.username || "Unknown User";

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
      // Status remains 'submitted' during approval chain

      // Add to approval history
      order.approval_history.push({
        action: "forward",
        performed_by: userId,
        performed_by_name: userName || req.user.username || req.user.name || "ASM",
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
 * POST /ordermanagement/demandorders/:id/forward-to-sales-admin
 * Forward a demand order from RSM to Sales Admin for approval
 * Also sends a view-only notification to ZSM
 */
router.post(
  "/:id/forward-to-sales-admin",
  authenticate,
  requireApiPermission("demandorder:update"),
  async (req, res) => {
    try {
      const orderId = req.params.id;
      const userId = req.user.id;
      const userName = req.user.username || "Unknown User";

      // Find the demand order
      const order = await DemandOrder.findById(orderId).populate("distributor_id").lean();

      if (!order) {
        return res.status(404).json({
          success: false,
          message: "Demand order not found",
        });
      }

      // Get distributor details to find region
      const Distributor = require("../../models/Distributor");
      const distributor = await Distributor.findById(order.distributor_id._id)
        .populate("db_point_id")
        .lean();

      // Find Region from ancestors (optional for ZSM notification)
      let region = null;
      if (distributor?.db_point_id?.ancestors) {
        region = distributor.db_point_id.ancestors.find((anc) => anc.type === "Region");
      }

      // Find Sales Admin role
      const Role = require("../../models/Role");
      const User = require("../../models/User");

      const salesAdminRole = await Role.findOne({ role: "Sales Admin" });

      if (!salesAdminRole) {
        return res.status(500).json({
          success: false,
          message: "Sales Admin role not found in system",
        });
      }

      // Sales Admin is an HQ role - don't assign to specific user
      // Just set the role and let any Sales Admin see it
      // Update order: forward to Sales Admin (role-based, not user-specific)
      const updatedOrder = await DemandOrder.findByIdAndUpdate(
        orderId,
        {
          $unset: { current_approver_id: "" }, // Remove specific user assignment for HQ roles
          current_approver_role: "Sales Admin",
          // Status remains 'submitted' during approval chain
          $push: {
            approval_history: {
              action: "forward",
              performed_by: userId,
              performed_by_name: userName,
              performed_by_role: "RSM",
              from_status: order.status,
              to_status: "submitted",
              comments: "Forwarded to Sales Admin for approval",
              timestamp: new Date(),
            },
          },
        },
        { new: true }
      );

      // Silent notification to ZSM (add to approval history as notification)
      // Only attempt if region exists (ZSM is a territorial user)
      if (region) {
        const zsmRole = await Role.findOne({ role: "ZSM" });
        if (zsmRole) {
          const zsmUsers = await User.find({ role_id: zsmRole._id }).populate("employee_id").lean();
          const matchingZSM = zsmUsers.find((user) => {
            const territories = user.employee_id?.territory_assignments;
            if (!Array.isArray(territories)) return false;
            return territories.some((t) => t.region_id?.toString() === region._id.toString());
          });

          if (matchingZSM) {
            await DemandOrder.findByIdAndUpdate(orderId, {
              $push: {
                approval_history: {
                  action: "forward",
                  performed_by: userId,
                  performed_by_name: userName,
                  performed_by_role: "RSM",
                  from_status: order.status,
                  to_status: "notified_zsm",
                  comments: "View-only notification sent to ZSM",
                  timestamp: new Date(),
                },
              },
            });
          }
        }
      }

      res.json({
        success: true,
        message: `Order ${order.order_number} forwarded to Sales Admin successfully (ZSM notified)`,
        data: updatedOrder,
      });
    } catch (error) {
      console.error("Error forwarding order to Sales Admin:", error);
      res.status(500).json({
        success: false,
        message: "Failed to forward order to Sales Admin",
        error: error.message,
      });
    }
  }
);

/**
 * POST /ordermanagement/demandorders/:id/forward-to-order-management
 * Forward order from Sales Admin to Order Management
 * Requires: demandorder:update permission
 */
router.post(
  "/:id/forward-to-order-management",
  authenticate,
  requireApiPermission("demandorder:update"),
  async (req, res) => {
    try {
      const orderId = req.params.id;
      const userId = req.user.id;
      const userName = req.user.username || "Unknown User";

      const order = await DemandOrder.findById(orderId).lean();
      if (!order) {
        return res.status(404).json({
          success: false,
          message: "Demand order not found",
        });
      }

      const Role = require("../../models/Role");
      const User = require("../../models/User");

      const omRole = await Role.findOne({ role: "Order Management" });
      if (!omRole) {
        return res.status(500).json({
          success: false,
          message: "Order Management role not found in system",
        });
      }

      // Order Management is an HQ role - don't assign to specific user
      // Just set the role and let any Order Management user see it
      const updatedOrder = await DemandOrder.findByIdAndUpdate(
        orderId,
        {
          $unset: { current_approver_id: "" },
          current_approver_role: "Order Management",
          // Status remains 'submitted' during approval chain
          $push: {
            approval_history: {
              action: "forward",
              performed_by: userId,
              performed_by_name: userName,
              performed_by_role: "Sales Admin",
              from_status: order.status,
              to_status: "submitted",
              comments: "Forwarded to Order Management for approval",
              timestamp: new Date(),
            },
          },
        },
        { new: true }
      );

      res.json({
        success: true,
        message: `Order ${order.order_number} forwarded to Order Management successfully`,
        data: updatedOrder,
      });
    } catch (error) {
      console.error("Error forwarding order to Order Management:", error);
      res.status(500).json({
        success: false,
        message: "Failed to forward order to Order Management",
        error: error.message,
      });
    }
  }
);

/**
 * POST /ordermanagement/demandorders/:id/forward-to-finance
 * Forward order from Order Management to Finance
 * Requires: demandorder:update permission
 */
router.post(
  "/:id/forward-to-finance",
  authenticate,
  requireApiPermission("demandorder:update"),
  async (req, res) => {
    try {
      const orderId = req.params.id;
      const userId = req.user.id;
      const userName = req.user.username || "Unknown User";

      const order = await DemandOrder.findById(orderId).lean();
      if (!order) {
        return res.status(404).json({
          success: false,
          message: "Demand order not found",
        });
      }

      const Role = require("../../models/Role");
      const User = require("../../models/User");

      const financeRole = await Role.findOne({ role: "Finance" });
      if (!financeRole) {
        return res.status(500).json({
          success: false,
          message: "Finance role not found in system",
        });
      }

      // Finance is an HQ role - don't assign to specific user
      // Just set the role and let any Finance user see it
      const updatedOrder = await DemandOrder.findByIdAndUpdate(
        orderId,
        {
          $unset: { current_approver_id: "" },
          current_approver_role: "Finance",
          // Status remains 'submitted' during approval chain
          $push: {
            approval_history: {
              action: "forward",
              performed_by: userId,
              performed_by_name: userName,
              performed_by_role: "Order Management",
              from_status: order.status,
              to_status: "submitted",
              comments: "Forwarded to Finance for approval",
              timestamp: new Date(),
            },
          },
        },
        { new: true }
      );

      res.json({
        success: true,
        message: `Order ${order.order_number} forwarded to Finance successfully`,
        data: updatedOrder,
      });
    } catch (error) {
      console.error("Error forwarding order to Finance:", error);
      res.status(500).json({
        success: false,
        message: "Failed to forward order to Finance",
        error: error.message,
      });
    }
  }
);

/**
 * POST /ordermanagement/demandorders/:id/forward-to-distribution
 * Forward order from Finance to Distribution
 * Requires: demandorder:update permission
 */
router.post(
  "/:id/forward-to-distribution",
  authenticate,
  requireApiPermission("demandorder:update"),
  async (req, res) => {
    try {
      const orderId = req.params.id;
      const userId = req.user.id;
      const userName = req.user.username || "Unknown User";

      const order = await DemandOrder.findById(orderId).lean();
      if (!order) {
        return res.status(404).json({
          success: false,
          message: "Demand order not found",
        });
      }

      const Role = require("../../models/Role");
      const User = require("../../models/User");

      const distributionRole = await Role.findOne({ role: "Distribution" });
      if (!distributionRole) {
        return res.status(500).json({
          success: false,
          message: "Distribution role not found in system",
        });
      }

      // Distribution is an HQ role - don't assign to specific user
      // Just set the role and let any Distribution user see it
      const updatedOrder = await DemandOrder.findByIdAndUpdate(
        orderId,
        {
          $unset: { current_approver_id: "" },
          current_approver_role: "Distribution",
          status: "forwarded_to_distribution",
          $push: {
            approval_history: {
              action: "forward",
              performed_by: userId,
              performed_by_name: userName,
              performed_by_role: "Finance",
              from_status: order.status,
              to_status: "forwarded_to_distribution",
              comments: "Forwarded to Distribution for approval",
              timestamp: new Date(),
            },
          },
        },
        { new: true }
      );

      res.json({
        success: true,
        message: `Order ${order.order_number} forwarded to Distribution successfully`,
        data: updatedOrder,
      });
    } catch (error) {
      console.error("Error forwarding order to Distribution:", error);
      res.status(500).json({
        success: false,
        message: "Failed to forward order to Distribution",
        error: error.message,
      });
    }
  }
);

/**
 * POST /ordermanagement/demandorders/:id/return-to-sales-admin
 * Return order from Order Management, Finance, or Distribution back to Sales Admin
 * Requires: demandorder:update permission
 */
router.post(
  "/:id/return-to-sales-admin",
  authenticate,
  requireApiPermission("demandorder:update"),
  async (req, res) => {
    try {
      const orderId = req.params.id;
      const userId = req.user.id;
      const userName = req.user.username || "Unknown User";

      const order = await DemandOrder.findById(orderId).lean();
      if (!order) {
        return res.status(404).json({
          success: false,
          message: "Demand order not found",
        });
      }

      // Get the current user's role to track who returned it
      const currentUserRole = req.user.role_id?.role || req.user.role_id?.name || "Unknown";

      const Role = require("../../models/Role");
      const User = require("../../models/User");

      const salesAdminRole = await Role.findOne({ role: "Sales Admin" });
      if (!salesAdminRole) {
        return res.status(500).json({
          success: false,
          message: "Sales Admin role not found in system",
        });
      }

      const salesAdminUser = await User.findOne({ role_id: salesAdminRole._id }).lean();
      if (!salesAdminUser) {
        return res.status(404).json({
          success: false,
          message: "Sales Admin user account not found",
        });
      }

      const updatedOrder = await DemandOrder.findByIdAndUpdate(
        orderId,
        {
          current_approver_id: salesAdminUser._id,
          current_approver_role: "Sales Admin",
          status: "forwarded_to_sales_admin",
          $push: {
            approval_history: {
              action: "return",
              performed_by: userId,
              performed_by_name: userName,
              performed_by_role: currentUserRole,
              from_status: order.status,
              to_status: "forwarded_to_sales_admin",
              comments: `Returned to Sales Admin from ${currentUserRole} for review`,
              timestamp: new Date(),
            },
          },
        },
        { new: true }
      );

      res.json({
        success: true,
        message: `Order ${order.order_number} returned to Sales Admin successfully`,
        data: updatedOrder,
      });
    } catch (error) {
      console.error("Error returning order to Sales Admin:", error);
      res.status(500).json({
        success: false,
        message: "Failed to return order to Sales Admin",
        error: error.message,
      });
    }
  }
);

/**
 * POST /ordermanagement/demandorders/:id/approve
 * Approve a demand order (Finance only)
 * Checks for unapproved payments and auto-forwards to Distribution
 * Requires: demandorder:approve permission
 */
router.post(
  "/:id/approve",
  authenticate,
  requireApiPermission("demandorder:approve"),
  async (req, res) => {
    try {
      const orderId = req.params.id;
      const userId = req.user.id;
      const userName = req.user.username || "Unknown User";
      const { comments, force_approve } = req.body;

      // Only Finance can approve
      const Role = require("../../models/Role");
      let userRole = null;
      if (req.user.role_id) {
        if (typeof req.user.role_id === "object" && req.user.role_id.role) {
          userRole = req.user.role_id;
        } else {
          userRole = await Role.findById(req.user.role_id).lean();
        }
      }

      if (!userRole || userRole.role !== "Finance") {
        return res.status(403).json({
          success: false,
          message: "Only Finance role can approve demand orders",
        });
      }

      // Find the demand order
      const order = await DemandOrder.findById(orderId)
        .populate("distributor_id")
        .populate("distributor_id.delivery_depot_id", "name");

      if (!order) {
        return res.status(404).json({
          success: false,
          message: "Demand order not found",
        });
      }

      // Check if distributor has a delivery depot assigned
      if (!order.distributor_id.delivery_depot_id) {
        return res.status(400).json({
          success: false,
          message: `Cannot approve order: Distributor ${order.distributor_id.name} does not have a delivery depot assigned. Please assign a depot to the distributor first.`,
        });
      }

      // Verify order is with Finance
      if (order.current_approver_role !== "Finance" || order.status !== "submitted") {
        return res.status(400).json({
          success: false,
          message: "Order must be with Finance and in submitted status",
        });
      }

      // Check if already approved
      if (order.status === "approved") {
        return res.status(400).json({
          success: false,
          message: "Order is already approved",
        });
      }

      // Check for attached payments
      const Collection = require("../../models/Collection");
      const attachedPayments = await Collection.find({
        do_no: order.order_number,
      })
        .select("transaction_id deposit_amount approval_status")
        .lean();

      // Check for unapproved payments
      const unapprovedPayments = attachedPayments.filter(
        (p) => p.approval_status !== "approved" && p.approval_status !== "cancelled"
      );

      // If there are unapproved payments and not force approved, return warning
      if (unapprovedPayments.length > 0 && !force_approve) {
        return res.status(400).json({
          success: false,
          message: "Unapproved payments detected",
          require_confirmation: true,
          unapproved_payments: unapprovedPayments.map((p) => ({
            transaction_id: p.transaction_id,
            amount: parseFloat(p.deposit_amount.toString()),
            status: p.approval_status,
          })),
        });
      }

      // Find Distribution role and user
      const User = require("../../models/User");
      const distributionRole = await Role.findOne({ role: "Distribution" });
      if (!distributionRole) {
        return res.status(500).json({
          success: false,
          message: "Distribution role not found in system",
        });
      }

      const distributionUser = await User.findOne({ role_id: distributionRole._id }).lean();
      if (!distributionUser) {
        return res.status(404).json({
          success: false,
          message: "Distribution user account not found",
        });
      }

      // Step 1: Create credit entry for discounts and free products
      const CustomerLedger = require("../../models/CustomerLedger");

      // Calculate discounts grouped by offer
      const discountsByOffer = {};
      let totalDiscounts = 0;
      const freeProducts = [];
      let totalFreeProductsValue = 0;

      for (const item of order.items) {
        if (item.offer_details) {
          // Track discounts by offer
          if (item.offer_details.discount_amount > 0) {
            const offerName = item.offer_details.offer_name || "Unnamed Offer";
            if (!discountsByOffer[offerName]) {
              discountsByOffer[offerName] = 0;
            }
            discountsByOffer[offerName] += item.offer_details.discount_amount;
            totalDiscounts += item.offer_details.discount_amount;
          }

          // Track free products
          if (item.offer_details.is_free_product && item.offer_details.free_products) {
            for (const freeProduct of item.offer_details.free_products) {
              const dbPrice = freeProduct.db_price || 0;
              const freeValue = freeProduct.quantity * dbPrice;
              freeProducts.push({
                sku: freeProduct.sku,
                quantity: freeProduct.quantity,
                db_price: dbPrice,
                value: freeValue,
              });
              totalFreeProductsValue += freeValue;
            }
          }
        }
      }

      // Build particulars text
      let particulars = "Advanced Discounts & Free goods\n";

      // Add discount breakdown
      if (Object.keys(discountsByOffer).length > 0) {
        particulars += "Discounts: ";
        const discountLines = Object.entries(discountsByOffer).map(
          ([offer, amount]) => `${offer}: ${amount.toFixed(2)}`
        );
        particulars += discountLines.join(", ") + "\n";
      }

      // Add free products
      if (freeProducts.length > 0) {
        for (const fp of freeProducts) {
          particulars += `Free Product: ${fp.sku} qty: ${fp.quantity} @ ${fp.db_price.toFixed(2)}\n`;
        }
      }

      // Create credit entry
      const totalCredit = totalDiscounts + totalFreeProductsValue;
      if (totalCredit > 0) {
        const creditEntry = new CustomerLedger({
          distributor_id: order.distributor_id._id,
          particulars: particulars.trim(),
          transaction_date: new Date(),
          voucher_type: "Discounts & Free items",
          voucher_no: order.order_number,
          debit: 0,
          credit: totalCredit,
          note: "",
        });
        await creditEntry.save();
      }

      // Step 2: Initialize scheduling record
      const Scheduling = require("../../models/Scheduling");

      // Get distributor's default depot
      const defaultDepotId = order.distributor_id.delivery_depot_id;

      // Prepare items for scheduling
      const schedulingItems = order.items.map((item) => ({
        item_id: item._id,
        sku: item.sku,
        product_name: item.product_name,
        dp_price: item.unit_price,
        order_qty: item.quantity,
        scheduled_qty: 0,
        unscheduled_qty: item.quantity,
      }));

      const scheduling = new Scheduling({
        order_id: order._id,
        order_number: order.order_number,
        distributor_id: order.distributor_id._id,
        depot_id: defaultDepotId,
        items: schedulingItems,
        scheduling_details: [],
        scheduling_status: [],
        current_status: "Pending-scheduling",
        created_by: userId,
      });
      await scheduling.save();

      // Step 3: Approve order and forward to Distribution
      const previousStatus = order.status;
      order.status = "forwarded_to_distribution";
      order.approved_by = userId;
      order.approved_at = new Date();
      order.current_approver_id = distributionUser._id;
      order.current_approver_role = "Distribution";

      // Add to approval history
      order.approval_history.push({
        action: "approve",
        performed_by: userId,
        performed_by_name: userName,
        performed_by_role: "Finance",
        from_status: previousStatus,
        to_status: "forwarded_to_distribution",
        comments:
          comments ||
          `DO approved by Finance and forwarded to Distribution for scheduling${
            unapprovedPayments.length > 0
              ? ` (${unapprovedPayments.length} payment(s) not yet approved)`
              : ""
          }`,
        timestamp: new Date(),
      });

      await order.save();

      res.json({
        success: true,
        message: `Order ${order.order_number} approved and forwarded to Distribution successfully`,
        data: order,
        unapproved_payment_count: unapprovedPayments.length,
      });
    } catch (error) {
      console.error("Error approving demand order:", error);
      res.status(500).json({
        success: false,
        message: "Failed to approve demand order",
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
      const userName = req.user.username || "Unknown User";
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
