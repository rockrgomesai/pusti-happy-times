/**
 * Requisition Load Sheets Routes
 * Manages load sheets for requisition deliveries (depot-to-depot transfers)
 * Similar to load-sheets.js but adapted for inter-depot requisitions
 */

const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");
const models = require("../../models");
const { authenticate, requireApiPermission: checkPermission } = require("../../middleware/auth");

/**
 * POST /api/v1/inventory/req-load-sheets
 * Create load sheet from approved requisition schedules
 * Groups items by requesting depot for delivery
 */
router.post("/", authenticate, checkPermission("req-load-sheet:create"), async (req, res) => {
  try {
    const userId = req.user.id;
    const { requesting_depot_id, items, delivery_date, vehicle_info, transport_id, notes } =
      req.body;

    // Validate required fields (following DO delivery pattern)
    if (!delivery_date) {
      return res.status(400).json({
        success: false,
        message: "Delivery date is required",
      });
    }

    if (!vehicle_info || !vehicle_info.vehicle_no || !vehicle_info.driver_name || !vehicle_info.driver_phone) {
      return res.status(400).json({
        success: false,
        message: "Vehicle information is required (vehicle_no, driver_name, driver_phone)",
      });
    }

    // Get user's facility from employee assignment
    const user = await models.User.findById(userId)
      .populate({
        path: "employee_id",
        select: "facility_id",
        populate: {
          path: "facility_id",
          select: "_id name type",
        },
      })
      .lean();

    if (!user?.employee_id?.facility_id?._id) {
      throw new Error("User is not assigned to any facility");
    }

    const source_depot_id = user.employee_id.facility_id._id;

    if (!requesting_depot_id) {
      throw new Error("Requesting depot ID is required");
    }

    if (!items || items.length === 0) {
      throw new Error("No items provided");
    }

    console.log(`\n=== CREATING REQUISITION LOAD SHEET ===`);
    console.log(`Source Depot: ${source_depot_id}`);
    console.log(`Requesting Depot: ${requesting_depot_id}`);
    console.log(`Items: ${items.length}`);

    // Validate items structure
    const requisitionDetailIds = items.map((item) => {
      if (!item.requisition_detail_id || !item.delivery_qty) {
        throw new Error("Each item must have requisition_detail_id and delivery_qty");
      }
      return item.requisition_detail_id;
    });

    // Get requisition scheduling details
    const schedulings = await models.RequisitionScheduling.find({
      "scheduling_details.requisition_detail_id": { $in: requisitionDetailIds },
    })
      .populate("requisition_id", "requisition_no requisition_date")
      .lean();

    if (!schedulings || schedulings.length === 0) {
      throw new Error("Requisition scheduling details not found");
    }

    console.log(`Found ${schedulings.length} requisition schedulings`);

    // Build req_items array
    const reqItems = [];
    const skuToQtyMap = {};

    for (const scheduling of schedulings) {
      for (const item of items) {
        const detail = scheduling.scheduling_details?.find(
          (d) => d.requisition_detail_id.toString() === item.requisition_detail_id.toString()
        );

        if (detail) {
          // Validate source and target match
          if (detail.source_depot_id.toString() !== source_depot_id.toString()) {
            throw new Error(`Source depot mismatch for ${detail.sku}`);
          }

          if (detail.target_depot_id.toString() !== requesting_depot_id.toString()) {
            throw new Error(`Target depot mismatch for ${detail.sku}`);
          }

          // Get product info
          const product = await models.Product.findOne({ sku: detail.sku }).lean();

          reqItems.push({
            requisition_id: scheduling.requisition_id._id,
            requisition_no: scheduling.requisition_id.requisition_no,
            requisition_date: scheduling.requisition_id.requisition_date,
            requisition_scheduling_id: scheduling._id,
            requisition_detail_id: detail.requisition_detail_id,
            sku: detail.sku,
            product_name: product?.name || detail.sku,
            order_qty: parseFloat(detail.order_qty.toString()),
            previously_delivered_qty: 0, // TODO: Track from chalans
            undelivered_qty: parseFloat(detail.delivery_qty.toString()),
            delivery_qty: item.delivery_qty,
            unit: "CTN",
          });

          // Track SKU quantities for stock validation
          if (!skuToQtyMap[detail.sku]) {
            skuToQtyMap[detail.sku] = {
              qty: 0,
              product_id: detail.product_id,
            };
          }
          skuToQtyMap[detail.sku].qty += item.delivery_qty;
        }
      }
    }

    if (reqItems.length === 0) {
      throw new Error("No valid items to add to load sheet");
    }

    console.log(`Prepared ${reqItems.length} items for load sheet`);

    // Validate stock availability
    const skus = Object.keys(skuToQtyMap);
    const productIds = skus.map((sku) => skuToQtyMap[sku].product_id);

    const stocks = await models.DepotStock.find({
      depot_id: source_depot_id,
      product_id: { $in: productIds },
    }).lean();

    const stockMap = {};
    stocks.forEach((stock) => {
      const product = Object.values(skuToQtyMap).find(
        (p) => p.product_id.toString() === stock.product_id.toString()
      );
      if (product) {
        const sku = Object.keys(skuToQtyMap).find(
          (s) => skuToQtyMap[s].product_id.toString() === stock.product_id.toString()
        );
        const totalQty = stock.qty_ctn ? parseFloat(stock.qty_ctn.toString()) : 0;
        const blockedQty = stock.blocked_qty ? parseFloat(stock.blocked_qty.toString()) : 0;
        stockMap[sku] = {
          available: totalQty - blockedQty,
          allocated: 0,
          remaining: totalQty - blockedQty,
        };
      }
    });

    // Validate each SKU has sufficient stock
    for (const sku of skus) {
      const required = skuToQtyMap[sku].qty;
      const available = stockMap[sku]?.available || 0;

      if (required > available) {
        throw new Error(
          `Insufficient stock for ${sku}. Required: ${required}, Available: ${available}`
        );
      }
    }

    // Generate load sheet number
    const loadSheetNumber = await models.RequisitionLoadSheet.generateLoadSheetNumber();

    // Get requesting depot info
    const requestingDepot = await models.Facility.findById(requesting_depot_id)
      .select("name code")
      .lean();

    // Build stock validation cache
    const stockValidationCache = Object.keys(stockMap).map((sku) => ({
      sku,
      available: stockMap[sku].available,
      allocated: skuToQtyMap[sku].qty,
      remaining: stockMap[sku].available - skuToQtyMap[sku].qty,
    }));

    // Calculate totals
    const totalItemsCount = reqItems.length;
    const totalDeliveryQty = reqItems.reduce((sum, item) => sum + item.delivery_qty, 0);

    // Create load sheet
    const loadSheet = new models.RequisitionLoadSheet({
      load_sheet_number: loadSheetNumber,
      status: "Draft",
      source_depot_id,
      created_by: userId,
      delivery_date: delivery_date || new Date(),
      vehicle_info: vehicle_info || {},
      transport_id: transport_id || null,
      requesting_depots: [
        {
          requesting_depot_id,
          requesting_depot_name: requestingDepot.name,
          requesting_depot_code: requestingDepot.code,
          req_items: reqItems,
        },
      ],
      stock_validation_cache: stockValidationCache,
      total_items_count: totalItemsCount,
      total_delivery_qty: totalDeliveryQty,
      notes: notes || "",
    });

    await loadSheet.save();

    // Block stock for this load sheet
    for (const sku of skus) {
      const product = await models.Product.findOne({ sku }).lean();
      if (!product) continue;

      await models.DepotStock.findOneAndUpdate(
        {
          depot_id: source_depot_id,
          product_id: product._id,
        },
        {
          $inc: { blocked_qty: skuToQtyMap[sku].qty },
        }
      );
    }

    console.log(`✅ Load sheet created: ${loadSheetNumber}`);

    res.json({
      success: true,
      message: "Requisition load sheet created successfully",
      data: {
        _id: loadSheet._id,
        load_sheet_number: loadSheet.load_sheet_number,
        status: loadSheet.status,
        total_items_count: loadSheet.total_items_count,
        total_delivery_qty: loadSheet.total_delivery_qty,
      },
    });
  } catch (error) {
    console.error("❌ Error creating requisition load sheet:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to create requisition load sheet",
    });
  }
});

/**
 * GET /api/v1/inventory/req-load-sheets/approved-req-items
 * Get approved requisition items grouped by requesting depot for load sheet creation
 * Similar to /approved-dos endpoint in DO delivery system
 */
router.get(
  "/approved-req-items",
  authenticate,
  checkPermission("req-load-sheet:create"),
  async (req, res) => {
    try {
      const userId = req.user.id;

      // Get user's facility from employee assignment
      const user = await models.User.findById(userId)
        .populate({
          path: "employee_id",
          select: "facility_id",
          populate: {
            path: "facility_id",
            select: "_id name type",
          },
        })
        .lean();

      if (!user?.employee_id?.facility_id?._id) {
        return res.status(400).json({
          success: false,
          message: "User is not assigned to any facility",
        });
      }

      const source_depot_id = user.employee_id.facility_id._id;

      // Get approved requisition schedulings where this depot is the source
      const schedulings = await models.RequisitionScheduling.find({
        from_depot: source_depot_id,
        status: "approved",
      })
        .populate("requisition_id", "requisition_no requisition_date")
        .populate("requesting_depot", "name code address phone")
        .populate("from_depot", "name code")
        .populate({
          path: "scheduling_details.requisition_detail_id",
          populate: {
            path: "product_id",
            select: "sku name dp_price pack_size unit",
          },
        })
        .lean();

      // Get stock availability for all SKUs
      const allSKUs = new Set();
      schedulings.forEach((sched) => {
        sched.scheduling_details.forEach((detail) => {
          if (detail.requisition_detail_id?.product_id?.sku) {
            allSKUs.add(detail.requisition_detail_id.product_id.sku);
          }
        });
      });

      const products = await models.Product.find({
        sku: { $in: Array.from(allSKUs) },
      }).select("_id sku");

      const productMap = {};
      products.forEach((p) => {
        productMap[p.sku] = p._id;
      });

      const stocks = await models.DepotStock.find({
        depot_id: source_depot_id,
        product_id: { $in: products.map((p) => p._id) },
      }).lean();

      const stockMap = {};
      stocks.forEach((stock) => {
        const sku = Object.keys(productMap).find(
          (k) => productMap[k].toString() === stock.product_id.toString()
        );
        if (sku) {
          stockMap[sku] = {
            total: parseFloat(stock.qty_ctn?.toString() || "0"),
            blocked: parseFloat(stock.blocked_qty?.toString() || "0"),
            available: parseFloat(stock.qty_ctn?.toString() || "0") - parseFloat(stock.blocked_qty?.toString() || "0"),
          };
        }
      });

      // Group by requesting depot
      const depotMap = {};

      schedulings.forEach((scheduling) => {
        const requestingDepot = scheduling.requesting_depot;
        if (!requestingDepot) return;

        const depotKey = requestingDepot._id.toString();

        if (!depotMap[depotKey]) {
          depotMap[depotKey] = {
            requesting_depot_id: requestingDepot._id,
            requesting_depot_name: requestingDepot.name,
            requesting_depot_code: requestingDepot.code,
            requesting_depot_address: requestingDepot.address,
            requesting_depot_phone: requestingDepot.phone,
            items: [],
          };
        }

        scheduling.scheduling_details.forEach((detail) => {
          const reqDetail = detail.requisition_detail_id;
          if (!reqDetail?.product_id) return;

          const product = reqDetail.product_id;
          const sku = product.sku;
          const scheduledQty = parseFloat(detail.scheduled_qty?.toString() || "0");
          const deliveredQty = parseFloat(detail.delivered_qty?.toString() || "0");
          const remainingQty = scheduledQty - deliveredQty;

          if (remainingQty <= 0) return;

          const stock = stockMap[sku] || { total: 0, blocked: 0, available: 0 };

          depotMap[depotKey].items.push({
            requisition_scheduling_id: scheduling._id,
            requisition_detail_id: detail.requisition_detail_id._id,
            requisition_id: scheduling.requisition_id._id,
            requisition_no: scheduling.requisition_id.requisition_no,
            requisition_date: scheduling.requisition_id.requisition_date,
            sku: sku,
            product_name: product.name,
            dp_price: product.dp_price,
            pack_size: product.pack_size,
            unit: product.unit || "CTN",
            order_qty: parseFloat(reqDetail.order_qty?.toString() || "0"),
            scheduled_qty: scheduledQty,
            delivered_qty: deliveredQty,
            remaining_qty: remainingQty,
            stock_available: stock.available,
            stock_total: stock.total,
            stock_blocked: stock.blocked,
          });
        });
      });

      // Convert map to array and filter out empty
      const result = Object.values(depotMap).filter((depot) => depot.items.length > 0);

      res.json({
        success: true,
        data: result,
        total_depots: result.length,
        total_items: result.reduce((sum, depot) => sum + depot.items.length, 0),
      });
    } catch (error) {
      console.error("Error fetching approved req items:", error);
      res.status(500).json({
        success: false,
        message: error.message || "Failed to fetch approved requisition items",
      });
    }
  }
);

/**
 * POST /api/v1/inventory/req-load-sheets/validate-stock
 * Validate stock availability for selected items before creating load sheet
 */
router.post(
  "/validate-stock",
  authenticate,
  checkPermission("req-load-sheet:create"),
  async (req, res) => {
    try {
      const userId = req.user.id;
      const { items } = req.body; // Array of { sku, delivery_qty }

      // Get user's facility
      const user = await models.User.findById(userId)
        .populate({
          path: "employee_id",
          select: "facility_id",
          populate: {
            path: "facility_id",
            select: "_id name type",
          },
        })
        .lean();

      if (!user?.employee_id?.facility_id?._id) {
        return res.status(400).json({
          success: false,
          message: "User is not assigned to any facility",
        });
      }

      const source_depot_id = user.employee_id.facility_id._id;

      // Aggregate delivery quantities by SKU
      const skuQtyMap = {};
      items.forEach((item) => {
        if (!skuQtyMap[item.sku]) {
          skuQtyMap[item.sku] = 0;
        }
        skuQtyMap[item.sku] += parseFloat(item.delivery_qty || 0);
      });

      const skus = Object.keys(skuQtyMap);

      // Get products
      const products = await models.Product.find({
        sku: { $in: skus },
      }).select("_id sku name");

      const productMap = {};
      products.forEach((p) => {
        productMap[p.sku] = p;
      });

      // Get stock availability
      const stocks = await models.DepotStock.find({
        depot_id: source_depot_id,
        product_id: { $in: products.map((p) => p._id) },
      }).lean();

      const stockValidation = [];

      skus.forEach((sku) => {
        const product = productMap[sku];
        if (!product) {
          stockValidation.push({
            sku,
            product_name: sku,
            required: skuQtyMap[sku],
            available: 0,
            blocked: 0,
            remaining: -skuQtyMap[sku],
            has_stock: false,
            message: "Product not found",
          });
          return;
        }

        const stock = stocks.find(
          (s) => s.product_id.toString() === product._id.toString()
        );

        const totalQty = stock ? parseFloat(stock.qty_ctn?.toString() || "0") : 0;
        const blockedQty = stock ? parseFloat(stock.blocked_qty?.toString() || "0") : 0;
        const availableQty = totalQty - blockedQty;
        const requiredQty = skuQtyMap[sku];
        const remainingQty = availableQty - requiredQty;

        stockValidation.push({
          sku,
          product_name: product.name,
          required: requiredQty,
          available: availableQty,
          blocked: blockedQty,
          remaining: remainingQty,
          has_stock: remainingQty >= 0,
          message: remainingQty >= 0 ? "Stock available" : `Short by ${Math.abs(remainingQty)}`,
        });
      });

      const hasIssues = stockValidation.some((v) => !v.has_stock);

      res.json({
        success: true,
        validation: stockValidation,
        has_issues: hasIssues,
        can_proceed: !hasIssues,
      });
    } catch (error) {
      console.error("Error validating stock:", error);
      res.status(500).json({
        success: false,
        message: error.message || "Failed to validate stock",
      });
    }
  }
);

/**
 * GET /api/v1/inventory/req-load-sheets/list
 * List all requisition load sheets with filters
 */
router.get("/list", authenticate, checkPermission("req-load-sheet:read"), async (req, res) => {
  try {
    const userId = req.user.id;
    const { status, page = 1, limit = 20, search } = req.query;

    // Get user's facility from employee assignment
    const user = await models.User.findById(userId)
      .populate({
        path: "employee_id",
        select: "facility_id",
        populate: {
          path: "facility_id",
          select: "_id name type",
        },
      })
      .lean();

    if (!user?.employee_id?.facility_id?._id) {
      return res.status(400).json({
        success: false,
        message: "User is not assigned to any facility",
      });
    }

    const source_depot_id = user.employee_id.facility_id._id;
    const query = { source_depot_id };

    if (status) {
      query.status = status;
    }

    if (search) {
      query.load_sheet_number = { $regex: search, $options: "i" };
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [loadSheets, total] = await Promise.all([
      models.RequisitionLoadSheet.find(query)
        .populate("source_depot_id", "name code")
        .populate("created_by", "name email")
        .sort({ created_at: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .lean(),
      models.RequisitionLoadSheet.countDocuments(query),
    ]);

    res.json({
      success: true,
      data: loadSheets,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages: Math.ceil(total / parseInt(limit)),
      },
    });
  } catch (error) {
    console.error("Error fetching requisition load sheets:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch requisition load sheets",
    });
  }
});

/**
 * GET /api/v1/inventory/req-load-sheets/:id
 * Get single requisition load sheet details
 */
router.get("/:id", authenticate, checkPermission("req-load-sheet:read"), async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    // Get user's facility from employee assignment
    const user = await models.User.findById(userId)
      .populate({
        path: "employee_id",
        select: "facility_id",
        populate: {
          path: "facility_id",
          select: "_id name type",
        },
      })
      .lean();

    if (!user?.employee_id?.facility_id?._id) {
      return res.status(400).json({
        success: false,
        message: "User is not assigned to any facility",
      });
    }

    const source_depot_id = user.employee_id.facility_id._id;

    const loadSheet = await models.RequisitionLoadSheet.findOne({
      _id: id,
      source_depot_id,
    })
      .populate("source_depot_id", "name code type")
      .populate("created_by", "name email")
      .populate("locked_by", "name email")
      .populate("generated_by", "name email")
      .populate("transport_id", "name vehicle_no driver_name driver_phone")
      .lean();

    if (!loadSheet) {
      return res.status(404).json({
        success: false,
        message: "Requisition load sheet not found",
      });
    }

    res.json({
      success: true,
      data: loadSheet,
    });
  } catch (error) {
    console.error("Error fetching requisition load sheet:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch requisition load sheet",
    });
  }
});

/**
 * PUT /api/v1/inventory/req-load-sheets/:id
 * Update requisition load sheet (only in Draft status)
 */
router.put("/:id", authenticate, checkPermission("req-load-sheet:update"), async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const { delivery_date, vehicle_info, transport_id, notes } = req.body;

    // Get user's facility from employee assignment
    const user = await models.User.findById(userId)
      .populate({
        path: "employee_id",
        select: "facility_id",
        populate: {
          path: "facility_id",
          select: "_id name type",
        },
      })
      .lean();

    if (!user?.employee_id?.facility_id?._id) {
      return res.status(400).json({
        success: false,
        message: "User is not assigned to any facility",
      });
    }

    const source_depot_id = user.employee_id.facility_id._id;

    const loadSheet = await models.RequisitionLoadSheet.findOne({
      _id: id,
      source_depot_id,
    });

    if (!loadSheet) {
      return res.status(404).json({
        success: false,
        message: "Requisition load sheet not found",
      });
    }

    if (loadSheet.status !== "Draft") {
      return res.status(400).json({
        success: false,
        message: "Can only update load sheets in Draft status",
      });
    }

    // Update fields
    if (delivery_date) loadSheet.delivery_date = delivery_date;
    if (vehicle_info) loadSheet.vehicle_info = vehicle_info;
    if (transport_id !== undefined) loadSheet.transport_id = transport_id;
    if (notes !== undefined) loadSheet.notes = notes;

    await loadSheet.save();

    res.json({
      success: true,
      message: "Requisition load sheet updated successfully",
      data: loadSheet,
    });
  } catch (error) {
    console.error("Error updating requisition load sheet:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update requisition load sheet",
    });
  }
});

/**
 * POST /api/v1/inventory/req-load-sheets/:id/lock
 * Lock requisition load sheet for delivery
 */
router.post(
  "/:id/lock",
  authenticate,
  checkPermission("req-load-sheet:lock"),
  async (req, res) => {
    try {
      const { id } = req.params;
      const userId = req.user.id;

      // Get user's facility from employee assignment
      const user = await models.User.findById(userId)
        .populate({
          path: "employee_id",
          select: "facility_id",
          populate: {
            path: "facility_id",
            select: "_id name type",
          },
        })
        .lean();

      if (!user?.employee_id?.facility_id?._id) {
        return res.status(400).json({
          success: false,
          message: "User is not assigned to any facility",
        });
      }

      const source_depot_id = user.employee_id.facility_id._id;

      const loadSheet = await models.RequisitionLoadSheet.findOne({
        _id: id,
        source_depot_id,
      });

      if (!loadSheet) {
        return res.status(404).json({
          success: false,
          message: "Requisition load sheet not found",
        });
      }

      if (loadSheet.status !== "Draft") {
        return res.status(400).json({
          success: false,
          message: "Can only lock load sheets in Draft status",
        });
      }

      loadSheet.status = "Locked";
      loadSheet.locked_by = userId;
      loadSheet.locked_at = new Date();

      await loadSheet.save();

      res.json({
        success: true,
        message: "Requisition load sheet locked successfully",
        data: loadSheet,
      });
    } catch (error) {
      console.error("Error locking requisition load sheet:", error);
      res.status(500).json({
        success: false,
        message: "Failed to lock requisition load sheet",
      });
    }
  }
);

/**
 * POST /api/v1/inventory/req-load-sheets/:id/generate-chalans
 * Generate chalans and invoices from load sheet (4 copies each)
 */
router.post(
  "/:id/generate-chalans",
  authenticate,
  checkPermission("req-load-sheet:generate-chalans"),
  async (req, res) => {
    try {
      const userId = req.user.id;
      const { id } = req.params;

      // Get user's facility from employee assignment
      const user = await models.User.findById(userId)
        .populate({
          path: "employee_id",
          select: "facility_id",
          populate: {
            path: "facility_id",
            select: "_id name type",
          },
        })
        .lean();

      if (!user?.employee_id?.facility_id?._id) {
        return res.status(400).json({
          success: false,
          message: "User is not assigned to any facility",
        });
      }

      const source_depot_id = user.employee_id.facility_id._id;

      console.log("\n=== CONVERTING REQUISITION LOAD SHEET ===");

      const loadSheet = await models.RequisitionLoadSheet.findOne({
        _id: id,
        source_depot_id,
        status: { $in: ["Locked", "Loaded"] },
      }).session(session);

      if (!loadSheet) {
        throw new Error("Load sheet not found or cannot be converted");
      }

      console.log(`Converting load sheet: ${loadSheet.load_sheet_number}`);

      // Re-validate stock availability
      const skuToQtyMap = {};
      loadSheet.requesting_depots.forEach((depot) => {
        depot.req_items.forEach((item) => {
          if (!skuToQtyMap[item.sku]) skuToQtyMap[item.sku] = 0;
          skuToQtyMap[item.sku] += item.delivery_qty;
        });
      });

      const skus = Object.keys(skuToQtyMap);
      const products = await models.Product.find({ sku: { $in: skus } })
        .select("_id sku name dp_price")
        .session(session);

      const productMap = {};
      products.forEach((p) => {
        productMap[p.sku] = p;
      });

      // Validate stock
      const stocks = await models.FactoryStoreInventory.find({
        facility_id: source_depot_id,
        product_id: { $in: products.map((p) => p._id) },
      }).session(session);

      const stockErrors = [];
      for (const sku of skus) {
        const required = skuToQtyMap[sku];
        const product = productMap[sku];
        const stock = stocks.find((s) => s.product_id.toString() === product._id.toString());
        const available = stock ? parseFloat(stock.qty_ctn.toString()) : 0;

        if (available < required) {
          stockErrors.push(`${sku}: Available ${available}, Required ${required}`);
        }
      }

      if (stockErrors.length > 0) {
        throw new Error(`Insufficient stock: ${stockErrors.join(", ")}`);
      }

      const createdChalans = [];
      const createdInvoices = [];

      // Process each requesting depot
      for (const depotData of loadSheet.requesting_depots) {
        const requestingDepot = await models.Facility.findById(depotData.requesting_depot_id)
          .select("name code address phone")
          .session(session);

        if (!requestingDepot) continue;

        console.log(`Processing requesting depot: ${requestingDepot.name}`);

        // Create chalan items (quantities only)
        const chalanItems = depotData.req_items.map((item) => {
          const product = productMap[item.sku];
          return {
            requisition_no: item.requisition_no,
            sku: item.sku,
            sku_name: product?.name || item.sku,
            uom: "CTN",
            qty_ctn: item.delivery_qty,
            qty_pcs: 0, // Not tracking pieces for requisitions
            received_qty_ctn: 0,
            received_qty_pcs: 0,
          };
        });

        const totalQtyCtn = chalanItems.reduce((sum, item) => sum + parseFloat(item.qty_ctn), 0);

        // Create invoice items (with pricing)
        const invoiceItems = depotData.req_items.map((item) => {
          const product = productMap[item.sku];
          const dpPrice = product?.dp_price ? parseFloat(product.dp_price.toString()) : 0;
          const amount = item.delivery_qty * dpPrice;

          return {
            requisition_no: item.requisition_no,
            sku: item.sku,
            sku_name: product?.name || item.sku,
            uom: "CTN",
            qty_ctn: item.delivery_qty,
            qty_pcs: 0,
            dp_price: dpPrice,
            amount: amount,
          };
        });

        const subtotal = invoiceItems.reduce((sum, item) => sum + parseFloat(item.amount), 0);

        // Create 4 copies of chalan
        for (let copyNum = 1; copyNum <= 4; copyNum++) {
          const chalanNumber = await models.RequisitionChalan.generateChalanNumber();

          const chalan = new models.RequisitionChalan({
            chalan_no: chalanNumber,
            load_sheet_id: loadSheet._id,
            requesting_depot_id: requestingDepot._id,
            requesting_depot_name: requestingDepot.name,
            requesting_depot_address: requestingDepot.address,
            requesting_depot_phone: requestingDepot.phone,
            source_depot_id,
            vehicle_no: loadSheet.vehicle_info?.vehicle_no,
            driver_name: loadSheet.vehicle_info?.driver_name,
            driver_phone: loadSheet.vehicle_info?.driver_phone,
            transport_id: loadSheet.transport_id,
            items: chalanItems,
            total_qty_ctn: totalQtyCtn,
            total_qty_pcs: 0,
            chalan_date: new Date(),
            status: "Generated",
            copy_number: copyNum,
            master_chalan_id: copyNum === 1 ? null : createdChalans[0]?._id,
            created_by: user_id,
          });

          await chalan.save({ session });
          createdChalans.push(chalan);
          console.log(`  Created chalan copy ${copyNum}: ${chalanNumber}`);
        }

        // Create 4 copies of invoice
        for (let copyNum = 1; copyNum <= 4; copyNum++) {
          const invoiceNumber = await models.RequisitionInvoice.generateInvoiceNumber();

          const invoice = new models.RequisitionInvoice({
            invoice_no: invoiceNumber,
            load_sheet_id: loadSheet._id,
            chalan_id: createdChalans[0]._id, // Link to master chalan
            requesting_depot_id: requestingDepot._id,
            requesting_depot_name: requestingDepot.name,
            requesting_depot_address: requestingDepot.address,
            requesting_depot_phone: requestingDepot.phone,
            source_depot_id,
            items: invoiceItems,
            subtotal: subtotal,
            tax_amount: 0,
            tax_percentage: 0,
            total_amount: subtotal,
            invoice_date: new Date(),
            status: "Generated",
            payment_status: "Unpaid",
            copy_number: copyNum,
            master_invoice_id: copyNum === 1 ? null : createdInvoices[0]?._id,
            created_by: user_id,
          });

          await invoice.save({ session });
          createdInvoices.push(invoice);
          console.log(`  Created invoice copy ${copyNum}: ${invoiceNumber}`);
        }
      }

      // Update load sheet status and links
      loadSheet.status = "Generated";
      loadSheet.generated_by = userId;
      loadSheet.generated_at = new Date();
      loadSheet.chalan_ids = createdChalans.map((c) => c._id);
      loadSheet.invoice_ids = createdInvoices.map((i) => i._id);
      await loadSheet.save({ session });

      // Deduct stock from source depot
      for (const sku of skus) {
        const product = productMap[sku];
        const qty = skuToQtyMap[sku];

        await models.FactoryStoreInventory.findOneAndUpdate(
          {
            facility_id: source_depot_id,
            product_id: product._id,
          },
          {
            $inc: {
              qty_ctn: -qty, // Deduct from total stock
              blocked_qty: -qty, // Unblock (was blocked during load sheet creation)
            },
          },
          { session }
        );
      }

      // Update requisition scheduling delivered_qty
      // TODO: Track delivered quantities per requisition detail

      await session.commitTransaction();

      console.log(
        `✅ Converted to ${createdChalans.length} chalans and ${createdInvoices.length} invoices`
      );

      res.json({
        success: true,
        message: "Chalans and invoices generated successfully",
        data: {
          load_sheet_id: loadSheet._id,
          load_sheet_number: loadSheet.load_sheet_number,
          chalans_created: createdChalans.length,
          invoices_created: createdInvoices.length,
          chalan_numbers: createdChalans.map((c) => c.chalan_no),
          invoice_numbers: createdInvoices.map((i) => i.invoice_no),
        },
      });
    } catch (error) {
      await session.abortTransaction();
      console.error("❌ Error converting requisition load sheet:", error);
      res.status(500).json({
        success: false,
        message: error.message || "Failed to convert load sheet",
      });
    } finally {
      session.endSession();
    }
  }
);

/**
 * DELETE /api/v1/inventory/req-load-sheets/:id
 * Delete requisition load sheet (only in Draft status)
 */
router.delete("/:id", authenticate, checkPermission("req-load-sheet:delete"), async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { id } = req.params;
    const { facility_id: source_depot_id } = req.user;

    const loadSheet = await models.RequisitionLoadSheet.findOne({
      _id: id,
      source_depot_id,
    }).session(session);

    if (!loadSheet) {
      throw new Error("Requisition load sheet not found");
    }

    if (loadSheet.status !== "Draft") {
      throw new Error("Can only delete load sheets in Draft status");
    }

    // Unblock stock
    const skuToQtyMap = {};
    loadSheet.requesting_depots.forEach((depot) => {
      depot.req_items.forEach((item) => {
        if (!skuToQtyMap[item.sku]) skuToQtyMap[item.sku] = 0;
        skuToQtyMap[item.sku] += item.delivery_qty;
      });
    });

    for (const sku of Object.keys(skuToQtyMap)) {
      const product = await models.Product.findOne({ sku }).session(session);
      if (!product) continue;

      await models.FactoryStoreInventory.findOneAndUpdate(
        {
          facility_id: source_depot_id,
          product_id: product._id,
        },
        {
          $inc: { blocked_qty: -skuToQtyMap[sku] },
        },
        { session }
      );
    }

    await loadSheet.deleteOne({ session });
    await session.commitTransaction();

    res.json({
      success: true,
      message: "Requisition load sheet deleted successfully",
    });
  } catch (error) {
    await session.abortTransaction();
    console.error("Error deleting requisition load sheet:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to delete requisition load sheet",
    });
  } finally {
    session.endSession();
  }
});

module.exports = router;
