const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");
const models = require("../../models");
const Scheduling = require("../../models/Scheduling");
const { authenticate, requireApiPermission } = require("../../middleware/auth");
const {
  startTransactionSession,
  addSessionToQuery,
  getSaveOptions,
  getUpdateOptions,
  commitTransaction,
  abortTransaction,
  endSession,
} = require("../../utils/transactionHelper");

// Helper function to format invoice particulars for ledger
const formatInvoiceParticulars = (items, doNumber, doDate, invoiceNumber, discount = 0) => {
  const lines = [`DO: ${doNumber} (${new Date(doDate).toLocaleDateString("en-GB")})\n`];

  items.forEach((item) => {
    const qty = parseFloat(item.qty);
    const unitPrice = parseFloat(item.unit_price);
    const lineTotal = parseFloat(item.line_total);

    lines.push(
      `${item.sku} @ ${item.uom || "PCS"}/${item.unit}, del: ${qty} (Price: ${lineTotal.toFixed(2)} @CtnPrice: ${unitPrice.toFixed(2)})`
    );
  });

  if (discount > 0) {
    lines.push(`\n(Discount: ${discount.toFixed(2)})`);
  }

  lines.push(`\nINV: ${invoiceNumber}`);

  return lines.join("\n");
};

// Helper function to format chalan particulars for ledger
const formatChalanParticulars = (items, chalanNumber) => {
  const lines = [];

  items.forEach((item) => {
    const qty = parseFloat(item.qty_ctn || 0);
    lines.push(
      `${item.sku} @ ${item.uom || "CTN"}, del: ${qty}`
    );
  });

  lines.push(`\nCHALAN: ${chalanNumber}`);

  return lines.join("\n");
};

// POST /api/v1/inventory/load-sheets - Create Load Sheet from Depot Deliveries
// Simplified endpoint for Inventory Depot workflow using scheduling_details
router.post("/", authenticate, requireApiPermission("load-sheet:create"), async (req, res) => {
  try {
    const { facility_id: depot_id, user_id } = req.userContext;
    const { items } = req.body; // Array of { scheduling_detail_id, delivery_qty }

    if (!depot_id || !user_id) {
      return res.status(400).json({
        success: false,
        message: "User context not found",
      });
    }

    if (!items || items.length === 0) {
      return res.status(400).json({
        success: false,
        message: "No items provided",
      });
    }

    console.log(`Creating load sheet for ${items.length} items from depot ${depot_id}`);

    // Get scheduling details to build load sheet data
    const schedulingDetailIds = items.map((item) => item.scheduling_detail_id);

    const schedulings = await Scheduling.find({
      "scheduling_details._id": { $in: schedulingDetailIds },
    })
      .populate("distributor_id", "name erp_id")
      .populate("order_id", "order_number created_at");

    if (!schedulings || schedulings.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Scheduling details not found",
      });
    }

    // Group items by distributor
    const distributorMap = {};

    for (const scheduling of schedulings) {
      const distributorId = scheduling.distributor_id._id.toString();

      if (!distributorMap[distributorId]) {
        distributorMap[distributorId] = {
          distributor_id: scheduling.distributor_id._id,
          distributor_name: scheduling.distributor_id.name,
          distributor_code: scheduling.distributor_id.erp_id,
          do_items: [],
        };
      }

      // Find matching scheduling details from the items array
      for (const item of items) {
        const detail = scheduling.scheduling_details.find(
          (d) => d._id.toString() === item.scheduling_detail_id
        );

        if (detail) {
          // Map scheduling detail to LoadSheet DO item structure
          distributorMap[distributorId].do_items.push({
            do_id: scheduling.order_id._id,
            order_number: scheduling.order_number,
            order_date: scheduling.order_id.created_at,
            sku: detail.sku,
            product_id: detail.item_id, // Use item_id from scheduling detail (actual product_id in stock)
            order_qty: detail.delivery_qty, // Original scheduled quantity
            previously_delivered_qty: 0, // TODO: Track actual deliveries
            undelivered_qty: detail.delivery_qty,
            delivery_qty: item.delivery_qty, // Quantity selected for this load sheet
            unit: "CTN",
          });
        }
      }
    }

    const distributorsArray = Object.values(distributorMap);

    // Validate and block stock - use item_id from scheduling details
    const skuMap = {};
    const skuToProductId = {}; // Map SKU to actual product_id from scheduling details
    distributorsArray.forEach((dist) => {
      dist.do_items.forEach((item) => {
        if (!skuMap[item.sku]) skuMap[item.sku] = 0;
        skuMap[item.sku] += parseFloat(item.delivery_qty);
        skuToProductId[item.sku] = item.product_id; // Use product_id from scheduling detail
      });
    });

    const skus = Object.keys(skuMap);
    const productIds = Object.values(skuToProductId);

    // Get current stock with blocked quantities using product_ids from scheduling details
    const stocks = await models.DepotStock.find({
      depot_id,
      product_id: { $in: productIds },
    });

    console.log("🔍 Stock validation debug:");
    console.log("  Depot ID:", depot_id);
    console.log("  SKUs requested:", skus);
    console.log("  Product IDs:", productIds);
    console.log("  Stock records found:", stocks.length);
    console.log("  Sample stock:", stocks[0]);

    // Build stock map by product_id for quick lookup
    const stockByProductId = {};
    stocks.forEach((s) => {
      stockByProductId[s.product_id.toString()] = s;
    });

    const stockErrors = [];
    const stockUpdates = [];

    skus.forEach((sku) => {
      const requested = skuMap[sku];
      const productId = skuToProductId[sku]; // Use product_id from scheduling detail
      const stock = productId ? stockByProductId[productId.toString()] : null;
      const totalQty = stock ? parseFloat(stock.qty_ctn.toString()) : 0;
      const blockedQty = stock && stock.blocked_qty ? parseFloat(stock.blocked_qty.toString()) : 0;
      const availableQty = totalQty - blockedQty;

      console.log(
        `  ${sku}: productId=${productId}, stock=${!!stock}, total=${totalQty}, blocked=${blockedQty}, available=${availableQty}, requested=${requested}`
      );

      if (availableQty < requested) {
        stockErrors.push(
          `${sku}: Available ${availableQty} CTN (Total: ${totalQty}, Blocked: ${blockedQty}), Requested: ${requested} CTN`
        );
      } else {
        stockUpdates.push({
          product_id: productId, // Use product_id from scheduling detail
          sku,
          requested,
        });
      }
    });

    if (stockErrors.length > 0) {
      return res.status(400).json({
        success: false,
        message: "Insufficient available stock",
        errors: stockErrors,
      });
    }

    // Generate load sheet number
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    const prefix = `LS-${year}${month}${day}`;

    // Find the last load sheet for today
    const lastLoadSheet = await models.LoadSheet.findOne({
      load_sheet_number: new RegExp(`^${prefix}`),
    })
      .sort({ load_sheet_number: -1 })
      .select("load_sheet_number");

    let sequence = 1;
    if (lastLoadSheet) {
      const lastSequence = parseInt(lastLoadSheet.load_sheet_number.split("-").pop());
      sequence = lastSequence + 1;
    }

    const loadSheetNumber = `${prefix}-${String(sequence).padStart(3, "0")}`;

    // Create load sheet with minimal required fields
    const loadSheet = new models.LoadSheet({
      load_sheet_number: loadSheetNumber,
      depot_id,
      delivery_date: new Date(), // Default to today
      vehicle_info: {
        vehicle_no: "TBD",
        driver_name: "TBD",
        driver_phone: "TBD",
      },
      distributors: distributorsArray,
      status: "Draft",
      notes: "Created from Depot Deliveries",
      created_by: user_id,
    });

    console.log(`📝 About to save load sheet: ${loadSheetNumber}`);
    console.log(
      `📝 Load sheet data:`,
      JSON.stringify(
        {
          load_sheet_number: loadSheet.load_sheet_number,
          depot_id: loadSheet.depot_id,
          distributors_count: loadSheet.distributors.length,
          status: loadSheet.status,
        },
        null,
        2
      )
    );

    const savedLoadSheet = await loadSheet.save();

    console.log(
      `✅ Successfully saved load sheet: ${savedLoadSheet.load_sheet_number} with ID: ${savedLoadSheet._id}`
    );

    // Block stock for this load sheet
    for (const update of stockUpdates) {
      await models.DepotStock.findOneAndUpdate(
        { depot_id, product_id: update.product_id },
        { $inc: { blocked_qty: update.requested } },
        { new: true }
      );
      console.log(`🔒 Blocked ${update.requested} CTN of ${update.sku}`);
    }

    // Verify it was actually saved
    const verification = await models.LoadSheet.findById(savedLoadSheet._id);
    console.log(`🔍 Verification check - Found in DB: ${verification ? "YES" : "NO"}`);
    if (verification) {
      console.log(`🔍 Verified load sheet number: ${verification.load_sheet_number}`);
    }

    res.json({
      success: true,
      message: `Load sheet ${savedLoadSheet.load_sheet_number} created successfully`,
      data: {
        _id: savedLoadSheet._id,
        load_sheet_number: savedLoadSheet.load_sheet_number,
        status: savedLoadSheet.status,
        total_items: savedLoadSheet.total_items,
      },
    });
  } catch (error) {
    console.error("❌ Error creating load sheet:", error);
    console.error("❌ Error stack:", error.stack);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to create load sheet",
    });
  }
});

// GET /api/v1/inventory/load-sheets/approved-dos - Get approved DOs for Load Sheet creation
router.get(
  "/approved-dos",
  authenticate,
  requireApiPermission("load-sheet:create"),
  async (req, res) => {
    try {
      const { facility_id: depot_id } = req.userContext;

      if (!depot_id) {
        return res.status(400).json({
          success: false,
          message: "User facility not found",
        });
      }

      // Get approved DOs for this depot
      const approvedDOs = await models.DemandOrder.find({
        facility_id: depot_id,
        status: { $in: ["Approved", "Partially Delivered"] },
      })
        .populate("distributor_id", "distributor_name distributor_code address phone_number")
        .populate("items.product_id", "sku dp_price pack_size unit")
        .sort({ order_date: -1 });

      // Get delivered quantities from existing chalans
      const deliveredData = await models.DeliveryChalan.aggregate([
        {
          $match: {
            depot_id: new mongoose.Types.ObjectId(depot_id),
            status: { $ne: "Cancelled" },
          },
        },
        { $unwind: "$items" },
        {
          $group: {
            _id: {
              do_id: "$items.do_id",
              sku: "$items.sku",
            },
            total_delivered: { $sum: "$items.qty_delivered" },
          },
        },
      ]);

      // Create a map of delivered quantities
      const deliveredMap = {};
      deliveredData.forEach((item) => {
        const key = `${item._id.do_id}_${item._id.sku}`;
        deliveredMap[key] = parseFloat(item.total_delivered.toString());
      });

      // Group DOs by distributor and calculate undelivered quantities
      const distributorMap = {};

      approvedDOs.forEach((doDoc) => {
        const distributor = doDoc.distributor_id;
        if (!distributor) return;

        const distKey = distributor._id.toString();

        if (!distributorMap[distKey]) {
          distributorMap[distKey] = {
            distributor_id: distributor._id,
            distributor_name: distributor.distributor_name,
            distributor_code: distributor.distributor_code,
            distributor_address: distributor.address,
            distributor_phone: distributor.phone_number,
            dos: [],
          };
        }

        const doItems = [];
        doDoc.items.forEach((item) => {
          if (!item.product_id) return;

          const orderQty = parseFloat(item.quantity.toString());
          const deliveredKey = `${doDoc._id}_${item.product_id.sku}`;
          const previouslyDelivered = deliveredMap[deliveredKey] || 0;
          const undeliveredQty = orderQty - previouslyDelivered;

          if (undeliveredQty > 0) {
            doItems.push({
              do_id: doDoc._id,
              order_number: doDoc.order_number,
              order_date: doDoc.order_date,
              sku: item.product_id.sku,
              order_qty: orderQty,
              previously_delivered_qty: previouslyDelivered,
              undelivered_qty: undeliveredQty,
              delivery_qty: undeliveredQty, // Pre-fill with undelivered qty
              unit: "CTN",
              uom: item.product_id.unit || "PCS",
              unit_price: item.product_id.dp_price || 0,
              pack_size: item.product_id.pack_size || 1,
            });
          }
        });

        if (doItems.length > 0) {
          distributorMap[distKey].dos.push({
            do_id: doDoc._id,
            order_number: doDoc.order_number,
            order_date: doDoc.order_date,
            items: doItems,
          });
        }
      });

      // Convert map to array
      const distributors = Object.values(distributorMap).filter((dist) => dist.dos.length > 0);

      res.json({
        success: true,
        data: distributors,
      });
    } catch (error) {
      console.error("Error fetching approved DOs:", error);
      res.status(500).json({
        success: false,
        message: "Failed to fetch approved DOs",
        error: error.message,
      });
    }
  }
);

// POST /api/v1/inventory/load-sheets/validate-stock - Validate stock for selected items
router.post(
  "/validate-stock",
  authenticate,
  requireApiPermission("load-sheet:create"),
  async (req, res) => {
    try {
      const { facility_id: depot_id } = req.userContext;
      const { items } = req.body; // Array of { sku, delivery_qty }

      if (!depot_id) {
        return res.status(400).json({
          success: false,
          message: "User facility not found",
        });
      }

      if (!items || !Array.isArray(items)) {
        return res.status(400).json({
          success: false,
          message: "Items array is required",
        });
      }

      // Group items by SKU and sum delivery quantities
      const skuMap = {};
      items.forEach((item) => {
        if (!skuMap[item.sku]) {
          skuMap[item.sku] = 0;
        }
        skuMap[item.sku] += parseFloat(item.delivery_qty || 0);
      });

      const skus = Object.keys(skuMap);

      // Get products for these SKUs
      const products = await models.Product.find({ sku: { $in: skus } }).select("_id sku");
      const productMap = {};
      products.forEach((p) => {
        productMap[p.sku] = p._id;
      });

      // Get depot stock
      const stocks = await models.DepotStock.find({
        depot_id,
        product_id: { $in: products.map((p) => p._id) },
      }).populate("product_id", "sku");

      // Create missing stock records (auto-initialize with 0 qty)
      const missingProducts = products.filter(
        (p) => !stocks.find((s) => s.product_id._id.toString() === p._id.toString())
      );

      if (missingProducts.length > 0) {
        console.log(
          `Creating ${missingProducts.length} missing stock records for depot ${depot_id}`
        );
        for (const product of missingProducts) {
          const newStock = await models.DepotStock.create({
            depot_id,
            product_id: product._id,
            qty_ctn: 0,
            blocked_qty: 0,
          });
          // Add to stocks array with populated product_id
          newStock.product_id = product;
          stocks.push(newStock);
          console.log(`  Created stock record for SKU: ${product.sku}`);
        }
      }

      const stockValidation = [];
      const errors = [];

      skus.forEach((sku) => {
        const allocated = skuMap[sku];
        const stock = stocks.find((s) => s.product_id.sku === sku);
        const totalQty = stock ? parseFloat(stock.qty_ctn.toString()) : 0;
        const blockedQty = stock ? parseFloat(stock.blocked_qty.toString()) : 0;
        const available = totalQty - blockedQty;
        const remaining = available - allocated;

        stockValidation.push({
          sku,
          total_qty: totalQty,
          blocked_qty: blockedQty,
          available,
          allocated,
          remaining,
          has_stock: remaining >= 0,
        });

        if (remaining < 0) {
          errors.push({
            sku,
            message: `Insufficient stock. Available: ${available} CTN (Total: ${totalQty}, Blocked: ${blockedQty}), Requested: ${allocated} CTN`,
          });
        }
      });

      res.json({
        success: errors.length === 0,
        data: {
          validation: stockValidation,
          has_errors: errors.length > 0,
          errors,
        },
      });
    } catch (error) {
      console.error("Error validating stock:", error);
      res.status(500).json({
        success: false,
        message: "Failed to validate stock",
        error: error.message,
      });
    }
  }
);

// POST /api/v1/inventory/load-sheets/create - Create new Load Sheet
router.post(
  "/create",
  authenticate,
  requireApiPermission("load-sheet:create"),
  async (req, res) => {
    try {
      const { facility_id: depot_id, user_id } = req.userContext;
      const { delivery_date, vehicle_info, distributors, notes, status = "Draft" } = req.body;

      if (!depot_id || !user_id) {
        return res.status(400).json({
          success: false,
          message: "User context not found",
        });
      }

      // Validate required fields
      if (!delivery_date || !vehicle_info || !distributors || distributors.length === 0) {
        return res.status(400).json({
          success: false,
          message: "Missing required fields",
        });
      }

      // Validate stock if creating (not draft)
      if (status !== "Draft") {
        const allItems = [];
        distributors.forEach((dist) => {
          dist.do_items.forEach((item) => {
            allItems.push({ sku: item.sku, delivery_qty: item.delivery_qty });
          });
        });

        // Call validate stock logic
        const skuMap = {};
        allItems.forEach((item) => {
          if (!skuMap[item.sku]) skuMap[item.sku] = 0;
          skuMap[item.sku] += parseFloat(item.delivery_qty || 0);
        });

        const skus = Object.keys(skuMap);
        const products = await models.Product.find({ sku: { $in: skus } }).select("_id sku");
        const productMap = {};
        products.forEach((p) => {
          productMap[p.sku] = p._id;
        });

        const stocks = await models.DepotStock.find({
          depot_id,
          product_id: { $in: products.map((p) => p._id) },
        }).populate("product_id", "sku");

        const errors = [];
        skus.forEach((sku) => {
          const allocated = skuMap[sku];
          const stock = stocks.find((s) => s.product_id.sku === sku);
          const available = stock ? parseFloat(stock.qty_ctn.toString()) : 0;
          if (available < allocated) {
            errors.push(`${sku}: Available ${available}, Requested ${allocated}`);
          }
        });

        if (errors.length > 0) {
          return res.status(400).json({
            success: false,
            message: "Insufficient stock",
            errors,
          });
        }
      }

      // Create Load Sheet
      const loadSheet = new models.LoadSheet({
        depot_id,
        created_by: user_id,
        delivery_date,
        vehicle_info,
        distributors,
        notes,
        status,
      });

      await loadSheet.save();

      res.status(201).json({
        success: true,
        message: "Load Sheet created successfully",
        data: loadSheet,
      });
    } catch (error) {
      console.error("Error creating Load Sheet:", error);
      res.status(500).json({
        success: false,
        message: "Failed to create Load Sheet",
        error: error.message,
      });
    }
  }
);

// GET /api/v1/inventory/load-sheets/list - Get Load Sheets list with filters
router.get("/list", authenticate, requireApiPermission("load-sheet:read"), async (req, res) => {
  try {
    const { facility_id: depot_id } = req.userContext;
    const {
      status,
      distributor_id,
      date_from,
      date_to,
      search,
      page = 1,
      limit = 20,
      sort = "-created_at",
    } = req.query;

    if (!depot_id) {
      return res.status(400).json({
        success: false,
        message: "User facility not found",
      });
    }

    const query = { depot_id };

    if (status) {
      query.status = status;
    }

    if (distributor_id) {
      query["distributors.distributor_id"] = distributor_id;
    }

    if (date_from || date_to) {
      query.delivery_date = {};
      if (date_from) query.delivery_date.$gte = new Date(date_from);
      if (date_to) query.delivery_date.$lte = new Date(date_to);
    }

    if (search) {
      query.load_sheet_number = new RegExp(search, "i");
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [loadSheets, total] = await Promise.all([
      models.LoadSheet.find(query)
        .populate("created_by", "username")
        .populate("distributors.distributor_id", "distributor_name distributor_code")
        .sort(sort)
        .skip(skip)
        .limit(parseInt(limit))
        .lean(),
      models.LoadSheet.countDocuments(query),
    ]);

    res.json({
      success: true,
      data: {
        load_sheets: loadSheets,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / parseInt(limit)),
        },
      },
    });
  } catch (error) {
    console.error("Error fetching Load Sheets:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch Load Sheets",
      error: error.message,
    });
  }
});

// GET /api/v1/inventory/load-sheets/:id - Get Load Sheet details
router.get("/:id", authenticate, requireApiPermission("load-sheet:read"), async (req, res) => {
  try {
    const { id } = req.params;
    const { facility_id: depot_id } = req.userContext;

    const loadSheet = await models.LoadSheet.findOne({ _id: id, depot_id })
      .populate("created_by", "username email")
      .populate("converted_by", "username email")
      .populate(
        "distributors.distributor_id",
        "distributor_name distributor_code address phone_number"
      )
      .populate("chalan_ids")
      .populate("invoice_ids");

    if (!loadSheet) {
      return res.status(404).json({
        success: false,
        message: "Load Sheet not found",
      });
    }

    res.json({
      success: true,
      data: loadSheet,
    });
  } catch (error) {
    console.error("Error fetching Load Sheet:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch Load Sheet",
      error: error.message,
    });
  }
});

// PATCH /api/v1/inventory/load-sheets/:id - Update Load Sheet (Draft only)
router.patch("/:id", authenticate, requireApiPermission("load-sheet:edit"), async (req, res) => {
  try {
    const { id } = req.params;
    const { facility_id: depot_id } = req.userContext;
    const updates = req.body;

    const loadSheet = await models.LoadSheet.findOne({ _id: id, depot_id, status: "Draft" });

    if (!loadSheet) {
      return res.status(404).json({
        success: false,
        message: "Load Sheet not found or cannot be edited",
      });
    }

    // Update allowed fields
    if (updates.delivery_date) loadSheet.delivery_date = updates.delivery_date;
    if (updates.vehicle_info) loadSheet.vehicle_info = updates.vehicle_info;
    if (updates.distributors) loadSheet.distributors = updates.distributors;
    if (updates.notes !== undefined) loadSheet.notes = updates.notes;
    if (updates.status && ["Draft", "Validated"].includes(updates.status)) {
      loadSheet.status = updates.status;
    }

    await loadSheet.save();

    res.json({
      success: true,
      message: "Load Sheet updated successfully",
      data: loadSheet,
    });
  } catch (error) {
    console.error("Error updating Load Sheet:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update Load Sheet",
      error: error.message,
    });
  }
});

// PUT /api/v1/inventory/load-sheets/:id/lock - Lock Load Sheet with transport details
router.put("/:id/lock", authenticate, requireApiPermission("load-sheet:lock"), async (req, res) => {
  let session;
  let useTransaction;

  try {
    const { facility_id: depot_id, user_id } = req.userContext;
    const { id } = req.params;
    const { transport_id, vehicle_no, driver_name, driver_phone, adjustments } = req.body;

    // Validate required fields
    if (!transport_id || !vehicle_no || !driver_name || !driver_phone) {
      return res.status(400).json({
        success: false,
        message: "Transport details are required",
      });
    }

    // Get load sheet
    const loadSheet = await models.LoadSheet.findOne({
      _id: id,
      depot_id,
      status: "Draft",
    }).populate("distributors.distributor_id", "name");

    if (!loadSheet) {
      return res.status(404).json({
        success: false,
        message: "Load Sheet not found or already locked",
      });
    }

    // Skip transaction for standalone MongoDB
    session = null;
    useTransaction = false;

    // Apply adjustments if provided
    if (adjustments && Array.isArray(adjustments)) {
      for (const adjustment of adjustments) {
        const { distributor_id, do_id, sku, new_delivery_qty } = adjustment;

        if (new_delivery_qty < 0) {
          throw new Error("Quantity cannot be negative");
        }

        // Find the item in load sheet
        let found = false;
        for (const dist of loadSheet.distributors) {
          if (dist.distributor_id.toString() === distributor_id) {
            const item = dist.do_items.find(
              (di) => di.do_id.toString() === do_id && di.sku === sku
            );
            if (item) {
              const oldQty = parseFloat(item.delivery_qty);
              if (new_delivery_qty > oldQty) {
                throw new Error(
                  `Cannot increase quantity for ${item.sku}. Only reductions are allowed.`
                );
              }
              item.delivery_qty = new_delivery_qty;
              found = true;
              break;
            }
          }
        }

        if (!found) {
          throw new Error(`Item ${sku} for DO ${do_id} not found in load sheet`);
        }
      }
    }

    // Update stock: release blocked qty and deduct actual qty
    const allItems = [];
    loadSheet.distributors.forEach((dist) => {
      dist.do_items.forEach((item) => {
        allItems.push({
          sku: item.sku,
          delivery_qty: parseFloat(item.delivery_qty),
        });
      });
    });

    // Group by SKU
    const stockUpdates = {};
    allItems.forEach((item) => {
      if (!stockUpdates[item.sku]) {
        stockUpdates[item.sku] = {
          sku: item.sku,
          delivery_qty: 0,
        };
      }
      stockUpdates[item.sku].delivery_qty += item.delivery_qty;
    });

    // Update stock for each SKU
    for (const sku of Object.keys(stockUpdates)) {
      const { delivery_qty } = stockUpdates[sku];

      // Get product_id from SKU
      const product = await models.Product.findOne({ sku });
      if (!product) {
        throw new Error(`Product not found for SKU ${sku}`);
      }

      let stock = await models.DepotStock.findOne({
        depot_id,
        product_id: product._id,
      });

      // Auto-create stock record if it doesn't exist
      if (!stock) {
        console.log(`Auto-creating missing stock record for SKU ${sku} in depot ${depot_id}`);
        stock = await models.DepotStock.create({
          depot_id,
          product_id: product._id,
          qty_ctn: 0,
          blocked_qty: 0,
        });
        console.log(
          `  Created stock record with 0 qty - this should not happen if validation ran properly`
        );
      }

      const currentQty = parseFloat(stock.qty_ctn || 0);
      const blockedQty = parseFloat(stock.blocked_qty || 0);

      // Release blocked qty
      const newBlockedQty = Math.max(0, blockedQty - delivery_qty);

      // Deduct from actual stock
      const newQty = currentQty - delivery_qty;

      if (newQty < 0) {
        throw new Error(`Insufficient stock for SKU ${sku}`);
      }

      stock.qty_ctn = newQty;
      stock.blocked_qty = newBlockedQty;

      await stock.save();
    }

    // Update load sheet
    loadSheet.transport_id = transport_id;
    loadSheet.vehicle_info = {
      vehicle_no,
      driver_name,
      driver_phone,
    };
    loadSheet.locked_at = new Date();
    loadSheet.locked_by = user_id;
    loadSheet.status = "Locked";

    await loadSheet.save();

    res.json({
      success: true,
      message: "Load Sheet locked successfully",
      data: loadSheet,
    });
  } catch (error) {
    console.error("Error locking Load Sheet:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to lock Load Sheet",
    });
  }
});

// POST /api/v1/inventory/load-sheets/:id/generate-chalans - Generate Delivery Chalans
router.post(
  "/:id/generate-chalans",
  authenticate,
  requireApiPermission("chalan:create"),
  async (req, res) => {
    let session;
    let useTransaction;

    try {
      const { facility_id: depot_id, user_id } = req.userContext;
      const { id } = req.params;

      // Get load sheet
      const loadSheet = await models.LoadSheet.findOne({
        _id: id,
        depot_id,
        status: "Locked",
      })
        .populate("transport_id", "name")
        .populate("distributors.distributor_id", "name address phone erp_id");

      if (!loadSheet) {
        return res.status(404).json({
          success: false,
          message: "Load Sheet not found or not locked",
        });
      }

      // Skip transaction for standalone MongoDB
      session = null;
      useTransaction = false;

      const chalans = [];

      // Generate chalan for each distributor
      for (const dist of loadSheet.distributors) {
        const distributor = dist.distributor_id;

        // Generate chalan number
        // Format: SHABNAM-INV-202511271|4609-595859
        const today = new Date();
        const dateStr = today.toISOString().slice(0, 10).replace(/-/g, "");
        const randomNum = Math.floor(Math.random() * 1000000);
        const chalan_no = `${distributor.erp_id || distributor.name.toUpperCase()}-CHN-${dateStr}-${randomNum}`;

        // Prepare items - use SKU as name since products don't have product_name field
        const items = dist.do_items.map((item) => ({
          do_number: item.order_number,
          sku: item.sku,
          sku_name: item.sku, // Products only have SKU, no separate name field
          uom: item.unit || "CTN",
          qty_ctn: item.delivery_qty,
          qty_pcs: 0, // Can be calculated if needed: delivery_qty * ctn_pcs
        }));

        // Calculate totals
        const total_qty_ctn = items.reduce((sum, i) => sum + parseFloat(i.qty_ctn), 0);
        const total_qty_pcs = items.reduce((sum, i) => sum + parseFloat(i.qty_pcs || 0), 0);

        // Create chalan
        const chalan = new models.DeliveryChalan({
          chalan_no,
          load_sheet_id: loadSheet._id,
          depot_id,
          distributor_id: distributor._id,
          distributor_name: distributor.name,
          distributor_address: distributor.address,
          distributor_phone: distributor.phone,
          transport_id: loadSheet.transport_id._id,
          vehicle_no: loadSheet.vehicle_info.vehicle_no,
          driver_name: loadSheet.vehicle_info.driver_name,
          driver_phone: loadSheet.vehicle_info.driver_phone,
          items,
          total_qty_ctn,
          total_qty_pcs,
          chalan_date: new Date(),
          status: "Generated",
          created_by: user_id,
        });

        await chalan.save();
        chalans.push(chalan);

        // Create CustomerLedger debit entry for the chalan
        const CustomerLedger = require("../../models/CustomerLedger");
        
        // Calculate total amount (this is a simplified calculation - you may need to add pricing logic)
        const chalanAmount = total_qty_ctn; // Placeholder - replace with actual price calculation if available
        
        // Format particulars using the helper function
        const particulars = formatChalanParticulars(items, chalan_no);
        
        await CustomerLedger.create({
          distributor_id: distributor._id,
          particulars: particulars,
          transaction_date: new Date(),
          voucher_type: "Chal",
          voucher_no: chalan_no,
          debit: chalanAmount,
          credit: 0,
          note: `Load Sheet: ${loadSheet.load_sheet_number}`,
          created_by: user_id,
        });
      }

      // Update load sheet status
      loadSheet.status = "Chalan_Generated";
      await loadSheet.save();

      res.json({
        success: true,
        message: `${chalans.length} chalans generated successfully`,
        data: chalans,
      });
    } catch (error) {
      console.error("Error generating chalans:", error);
      res.status(500).json({
        success: false,
        message: error.message || "Failed to generate chalans",
      });
    }
  }
);

// POST /api/v1/inventory/load-sheets/:id/convert - Convert Load Sheet to Chalans & Invoices
router.post(
  "/:id/convert",
  authenticate,
  requireApiPermission("load-sheet:convert"),
  async (req, res) => {
    let session;
    let useTransaction;

    try {
      // Skip transaction for standalone MongoDB
      session = null;
      useTransaction = false;

      const { id } = req.params;
      const { facility_id: depot_id, user_id } = req.userContext;

      const loadSheetQuery = models.LoadSheet.findOne({
        _id: id,
        depot_id,
        status: { $in: ["Validated", "Loaded"] },
      });
      const loadSheet = await addSessionToQuery(loadSheetQuery, session, useTransaction);

      if (!loadSheet) {
        await abortTransaction(session, useTransaction);
        return res.status(404).json({
          success: false,
          message: "Load Sheet not found or cannot be converted",
        });
      }

      // Re-validate stock
      const skuMap = {};
      loadSheet.distributors.forEach((dist) => {
        dist.do_items.forEach((item) => {
          if (!skuMap[item.sku]) skuMap[item.sku] = 0;
          skuMap[item.sku] += parseFloat(item.delivery_qty);
        });
      });

      const skus = Object.keys(skuMap);
      const productsQuery = models.Product.find({ sku: { $in: skus } }).select("_id sku");
      const products = await addSessionToQuery(productsQuery, session, useTransaction);
      const productMap = {};
      products.forEach((p) => {
        productMap[p.sku] = p._id;
      });

      const stocksQuery = models.DepotStock.find({
        depot_id,
        product_id: { $in: products.map((p) => p._id) },
      }).populate("product_id", "sku");
      const stocks = await addSessionToQuery(stocksQuery, session, useTransaction);

      const stockErrors = [];
      skus.forEach((sku) => {
        const allocated = skuMap[sku];
        const stock = stocks.find((s) => s.product_id.sku === sku);
        const available = stock ? parseFloat(stock.qty_ctn.toString()) : 0;
        if (available < allocated) {
          stockErrors.push(`${sku}: Available ${available}, Requested ${allocated}`);
        }
      });

      if (stockErrors.length > 0) {
        await abortTransaction(session, useTransaction);
        return res.status(400).json({
          success: false,
          message: "Insufficient stock",
          errors: stockErrors,
        });
      }

      const createdChalans = [];
      const createdInvoices = [];
      const createdLedgerEntries = [];

      // Process each distributor
      for (const distData of loadSheet.distributors) {
        const distributorQuery = models.Distributor.findById(distData.distributor_id);
        const distributor = await addSessionToQuery(distributorQuery, session, useTransaction);

        if (!distributor) continue;

        // Group items by DO
        const doGroups = {};
        distData.do_items.forEach((item) => {
          const doId = item.do_id.toString();
          if (!doGroups[doId]) {
            doGroups[doId] = {
              order_number: item.order_number,
              order_date: item.order_date,
              items: [],
            };
          }
          doGroups[doId].items.push(item);
        });

        // Create Chalan items
        const chalanItems = distData.do_items.map((item) => ({
          do_id: item.do_id,
          order_number: item.order_number,
          sku: item.sku,
          qty_delivered: item.delivery_qty,
          unit: item.unit || "CTN",
          uom: item.uom || "PCS",
        }));

        // Create Chalan
        const chalan = new models.DeliveryChalan({
          load_sheet_id: loadSheet._id,
          load_sheet_number: loadSheet.load_sheet_number,
          distributor_id: distributor._id,
          distributor_name: distributor.distributor_name,
          distributor_code: distributor.distributor_code,
          distributor_address: distributor.address,
          distributor_phone: distributor.phone_number,
          items: chalanItems,
          delivery_date: loadSheet.delivery_date,
          vehicle_no: loadSheet.vehicle_info.vehicle_no,
          driver_name: loadSheet.vehicle_info.driver_name,
          driver_phone: loadSheet.vehicle_info.driver_phone,
          depot_id,
          created_by: user_id,
          status: "Pending",
        });

        await chalan.save(getSaveOptions(session, useTransaction));
        createdChalans.push(chalan);

        // Create Invoice items with pricing
        const invoiceItems = [];
        let totalAmount = 0;

        for (const item of distData.do_items) {
          const product = await models.Product.findOne({ sku: item.sku })
            .select("dp_price")
            .session(session);
          const unitPrice = product ? parseFloat(product.dp_price || 0) : 0;
          const qty = parseFloat(item.delivery_qty);
          const lineTotal = qty * unitPrice;

          invoiceItems.push({
            do_id: item.do_id,
            order_number: item.order_number,
            sku: item.sku,
            qty: item.delivery_qty,
            unit: item.unit || "CTN",
            unit_price: unitPrice,
            line_total: lineTotal,
          });

          totalAmount += lineTotal;
        }

        // Create Invoice
        const invoice = new models.DeliveryInvoice({
          chalan_id: chalan._id,
          chalan_number: chalan.chalan_number,
          load_sheet_id: loadSheet._id,
          distributor_id: distributor._id,
          distributor_name: distributor.distributor_name,
          distributor_code: distributor.distributor_code,
          distributor_address: distributor.address,
          distributor_phone: distributor.phone_number,
          distributor_tin: distributor.tin_number,
          items: invoiceItems,
          total_amount: totalAmount,
          payment_terms: distributor.payment_terms || "Net 30",
          due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
          depot_id,
          created_by: user_id,
          status: "Unpaid",
        });

        await invoice.save(getSaveOptions(session, useTransaction));
        createdInvoices.push(invoice);

        // Create ledger entries per DO
        for (const [doId, doGroup] of Object.entries(doGroups)) {
          const doItems = invoiceItems.filter((item) => item.do_id.toString() === doId);
          const doTotal = doItems.reduce((sum, item) => sum + parseFloat(item.line_total), 0);

          const particulars = formatInvoiceParticulars(
            doItems,
            doGroup.order_number,
            doGroup.order_date,
            invoice.invoice_number,
            0 // No discount for now
          );

          const ledgerEntry = new models.Collection({
            distributor_id: distributor._id,
            transaction_type: "Invoice",
            reference_type: "DeliveryInvoice",
            reference_id: invoice._id,
            reference_number: invoice.invoice_number,
            do_number: doGroup.order_number,
            transaction_date: new Date(),
            debit_amount: doTotal,
            credit_amount: 0,
            particulars,
            created_by: user_id,
          });

          await ledgerEntry.save(getSaveOptions(session, useTransaction));
          createdLedgerEntries.push(ledgerEntry);

          // Update DO with delivery info
          await models.DemandOrder.findByIdAndUpdate(
            doId,
            {
              $push: {
                delivered_items: doItems.map((item) => ({
                  chalan_id: chalan._id,
                  chalan_number: chalan.chalan_number,
                  invoice_id: invoice._id,
                  invoice_number: invoice.invoice_number,
                  delivery_date: loadSheet.delivery_date,
                  sku: item.sku,
                  qty_delivered: item.qty,
                })),
              },
            },
            getUpdateOptions(session, useTransaction)
          );
        }

        // Deduct stock and release blocked quantity
        for (const item of distData.do_items) {
          const product = products.find((p) => p.sku === item.sku);
          if (product) {
            const deliveryQty = parseFloat(item.delivery_qty);
            await models.DepotStock.findOneAndUpdate(
              { depot_id, product_id: product._id },
              {
                $inc: {
                  qty_ctn: -deliveryQty,
                  blocked_qty: -deliveryQty, // Release the blocked quantity
                },
              },
              getUpdateOptions(session, useTransaction)
            );
            console.log(
              `📦 Deducted ${deliveryQty} CTN and released blocked stock for ${item.sku}`
            );
          }
        }
      }

      // Update Load Sheet
      loadSheet.status = "Converted";
      loadSheet.converted_at = new Date();
      loadSheet.converted_by = user_id;
      loadSheet.chalan_ids = createdChalans.map((c) => c._id);
      loadSheet.invoice_ids = createdInvoices.map((i) => i._id);
      await loadSheet.save();

      res.json({
        success: true,
        message: "Load Sheet converted successfully",
        data: {
          load_sheet: loadSheet,
          chalans: createdChalans,
          invoices: createdInvoices,
          ledger_entries: createdLedgerEntries,
        },
      });
    } catch (error) {
      console.error("Error converting Load Sheet:", error);
      res.status(500).json({
        success: false,
        message: "Failed to convert Load Sheet",
        error: error.message,
      });
    }
  }
);

// DELETE /api/v1/inventory/load-sheets/:id - Delete Load Sheet (Draft only)
router.delete("/:id", authenticate, requireApiPermission("load-sheet:delete"), async (req, res) => {
  try {
    const { id } = req.params;
    const { facility_id: depot_id } = req.userContext;

    // First find the load sheet to get items for stock release
    const loadSheet = await models.LoadSheet.findOne({
      _id: id,
      depot_id,
      status: "Draft",
    });

    if (!loadSheet) {
      return res.status(404).json({
        success: false,
        message: "Load Sheet not found or cannot be deleted",
      });
    }

    // Calculate blocked quantities to release
    const skuMap = {};
    loadSheet.distributors.forEach((dist) => {
      dist.do_items.forEach((item) => {
        if (!skuMap[item.sku]) skuMap[item.sku] = 0;
        skuMap[item.sku] += parseFloat(item.delivery_qty);
      });
    });

    const skus = Object.keys(skuMap);
    const products = await models.Product.find({ sku: { $in: skus } }).select("_id sku");

    // Release blocked stock
    for (const product of products) {
      const blockedQty = skuMap[product.sku];
      await models.DepotStock.findOneAndUpdate(
        { depot_id, product_id: product._id },
        { $inc: { blocked_qty: -blockedQty } },
        { new: true }
      );
      console.log(`🔓 Released ${blockedQty} CTN of ${product.sku} from blocked stock`);
    }

    // Now delete the load sheet
    await models.LoadSheet.findByIdAndDelete(id);

    res.json({
      success: true,
      message: "Load Sheet deleted successfully and stock released",
    });
  } catch (error) {
    console.error("Error deleting Load Sheet:", error);
    res.status(500).json({
      success: false,
      message: "Failed to delete Load Sheet",
      error: error.message,
    });
  }
});

module.exports = router;
