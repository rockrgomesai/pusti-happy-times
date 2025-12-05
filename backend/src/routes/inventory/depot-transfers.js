const express = require("express");
const router = express.Router();
const { authenticate, requireApiPermission } = require("../../middleware/auth");
const DepotTransfer = require("../../models/DepotTransfer");
const DepotStock = require("../../models/DepotStock");
const Facility = require("../../models/Facility");
const Product = require("../../models/Product");
const User = require("../../models/User");

/**
 * POST /inventory/depot-transfers/create
 * Create new depot transfer (send)
 */
router.post(
  "/create",
  authenticate,
  requireApiPermission("depot-transfer:create"),
  async (req, res) => {
    try {
      const { to_depot_id, transfer_date, items, notes } = req.body;

      // Get facility_id and user_id from userContext (set by auth middleware from JWT)
      const { facility_id: from_depot_id, user_id } = req.userContext || {};

      if (!from_depot_id) {
        return res.status(400).json({
          success: false,
          message: "User does not have a facility assigned",
        });
      }

      // Validate from and to depots are different
      if (from_depot_id.toString() === to_depot_id) {
        return res.status(400).json({
          success: false,
          message: "From depot and to depot cannot be the same",
        });
      }

      // Validate to_depot exists
      const toDepot = await Facility.findById(to_depot_id);
      if (!toDepot) {
        return res.status(404).json({
          success: false,
          message: "Destination depot not found",
        });
      }

      // Validate items array
      if (!items || !Array.isArray(items) || items.length === 0) {
        return res.status(400).json({
          success: false,
          message: "Transfer must have at least one item",
        });
      }

      // Validate and check stock availability for each item
      const validatedItems = [];
      for (const item of items) {
        const { sku, unit, qty_sent } = item;

        // Validate product exists
        const product = await Product.findOne({ sku });
        if (!product) {
          return res.status(404).json({
            success: false,
            message: `Product with SKU ${sku} not found`,
          });
        }

        // Check stock availability
        const stock = await DepotStock.findOne({
          depot_id: from_depot_id,
          product_id: product._id,
        });

        const availableQty = stock ? parseFloat(stock.qty_ctn.toString()) : 0;

        if (!stock || availableQty < qty_sent) {
          return res.status(400).json({
            success: false,
            message: `Insufficient stock for ${sku}. Available: ${availableQty}, Required: ${qty_sent}`,
          });
        }

        validatedItems.push({
          sku: product.sku,
          product_name: product.short_description || product.sku,
          product_type: product.product_type,
          unit: unit || "CTN",
          qty_sent: qty_sent,
          qty_received: 0,
          unit_price: product.dp_price || 0,
          notes: item.notes || "",
        });
      }

      // Generate transfer number
      const transfer_number = await DepotTransfer.generateTransferNumber();

      // Create depot transfer
      const depotTransfer = new DepotTransfer({
        transfer_number,
        from_depot_id,
        to_depot_id,
        transfer_date: transfer_date || new Date(),
        status: "Pending",
        items: validatedItems,
        notes,
        sent_by: user_id,
        sent_at: new Date(),
      });

      await depotTransfer.save();

      // Deduct stock from source depot
      for (const item of validatedItems) {
        const product = await Product.findOne({ sku: item.sku });
        if (product) {
          await DepotStock.findOneAndUpdate(
            { depot_id: from_depot_id, product_id: product._id },
            {
              $inc: {
                qty_ctn: -item.qty_sent,
              },
            }
          );
        }
      }

      // Populate references for response
      await depotTransfer.populate([
        { path: "from_depot_id", select: "name code type" },
        { path: "to_depot_id", select: "name code type" },
        { path: "sent_by", select: "name email" },
      ]);

      res.status(201).json({
        success: true,
        message: "Depot transfer created successfully",
        data: depotTransfer,
      });
    } catch (error) {
      console.error("Error creating depot transfer:", error);
      res.status(500).json({
        success: false,
        message: "Failed to create depot transfer",
        error: error.message,
      });
    }
  }
);

/**
 * GET /inventory/depot-transfers/list
 * Get list of depot transfers with filters
 */
router.get("/list", authenticate, requireApiPermission("depot-transfer:read"), async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      status,
      from_depot_id,
      to_depot_id,
      start_date,
      end_date,
      direction = "sent", // 'sent' or 'received'
    } = req.query;

    // Get user's facility from userContext
    const { facility_id: userDepotId } = req.userContext || {};

    if (!userDepotId) {
      return res.status(400).json({
        success: false,
        message: "User does not have a facility assigned",
      });
    }

    // Build query based on direction
    const query = {};

    if (direction === "sent") {
      query.from_depot_id = userDepotId;
      if (to_depot_id) query.to_depot_id = to_depot_id;
    } else if (direction === "received") {
      query.to_depot_id = userDepotId;
      if (from_depot_id) query.from_depot_id = from_depot_id;
    }

    if (status) {
      // Handle comma-separated status values
      if (status.includes(",")) {
        query.status = { $in: status.split(",").map((s) => s.trim()) };
      } else {
        query.status = status;
      }
    }

    console.log("🔍 Depot transfers query:", { direction, userDepotId, status, query });

    // Date range filter
    if (start_date || end_date) {
      query.transfer_date = {};
      if (start_date) query.transfer_date.$gte = new Date(start_date);
      if (end_date) {
        const endDateTime = new Date(end_date);
        endDateTime.setHours(23, 59, 59, 999);
        query.transfer_date.$lte = endDateTime;
      }
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [transfers, total] = await Promise.all([
      DepotTransfer.find(query)
        .populate("from_depot_id", "name code type")
        .populate("to_depot_id", "name code type")
        .populate("sent_by", "name email")
        .populate("received_by", "name email")
        .sort({ transfer_date: -1, createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit)),
      DepotTransfer.countDocuments(query),
    ]);

    res.json({
      success: true,
      data: transfers,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / parseInt(limit)),
      },
    });
  } catch (error) {
    console.error("Error fetching depot transfers:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch depot transfers",
      error: error.message,
    });
  }
});

/**
 * GET /inventory/depot-transfers/:id
 * Get depot transfer details
 */
router.get("/:id", authenticate, requireApiPermission("depot-transfer:read"), async (req, res) => {
  try {
    const { id } = req.params;

    const transfer = await DepotTransfer.findById(id)
      .populate("from_depot_id", "name code type")
      .populate("to_depot_id", "name code type")
      .populate("sent_by", "name email")
      .populate("received_by", "name email")
      .populate("cancelled_by", "name email");

    if (!transfer) {
      return res.status(404).json({
        success: false,
        message: "Depot transfer not found",
      });
    }

    res.json({
      success: true,
      data: transfer,
    });
  } catch (error) {
    console.error("Error fetching depot transfer:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch depot transfer",
      error: error.message,
    });
  }
});

/**
 * POST /inventory/depot-transfers/:id/receive
 * Receive depot transfer
 */
router.post(
  "/:id/receive",
  authenticate,
  requireApiPermission("depot-transfer:receive"),
  async (req, res) => {
    try {
      const { id } = req.params;
      const { items } = req.body; // Array of { sku, qty_received }

      // Get user's facility from userContext
      const { facility_id: userDepotId, user_id } = req.userContext || {};

      if (!userDepotId) {
        return res.status(400).json({
          success: false,
          message: "User does not have a facility assigned",
        });
      }

      // Get transfer
      const transfer = await DepotTransfer.findById(id);
      if (!transfer) {
        return res.status(404).json({
          success: false,
          message: "Depot transfer not found",
        });
      }

      // Validate this is the receiving depot
      if (transfer.to_depot_id.toString() !== userDepotId.toString()) {
        return res.status(403).json({
          success: false,
          message: "You can only receive transfers sent to your depot",
        });
      }

      // Validate status
      if (transfer.status === "Received") {
        return res.status(400).json({
          success: false,
          message: "Transfer has already been fully received",
        });
      }

      if (transfer.status === "Cancelled") {
        return res.status(400).json({
          success: false,
          message: "Cannot receive a cancelled transfer",
        });
      }

      // Update received quantities
      let fullyReceived = true;
      for (const receivedItem of items) {
        const transferItem = transfer.items.find((item) => item.sku === receivedItem.sku);
        if (!transferItem) continue;

        const newQtyReceived = (transferItem.qty_received || 0) + receivedItem.qty_received;

        if (newQtyReceived > transferItem.qty_sent) {
          return res.status(400).json({
            success: false,
            message: `Cannot receive more than sent quantity for ${receivedItem.sku}`,
          });
        }

        transferItem.qty_received = newQtyReceived;

        // Get product ID for stock update
        const product = await Product.findOne({ sku: receivedItem.sku });
        if (!product) {
          return res.status(404).json({
            success: false,
            message: `Product with SKU ${receivedItem.sku} not found`,
          });
        }

        // Update stock at destination depot (UPSERT)
        await DepotStock.findOneAndUpdate(
          { depot_id: transfer.to_depot_id, product_id: product._id },
          {
            $inc: { qty_ctn: receivedItem.qty_received },
            $setOnInsert: {
              product_id: product._id,
            },
          },
          { upsert: true, new: true }
        );

        // Note: We no longer track reserved_qty, stock was already deducted on send

        // Check if this item is fully received
        if (transferItem.qty_received < transferItem.qty_sent) {
          fullyReceived = false;
        }
      }

      // Update transfer status
      if (fullyReceived && transfer.items.every((item) => item.qty_received === item.qty_sent)) {
        transfer.status = "Received";
        transfer.received_by = user_id;
        transfer.received_at = new Date();
      } else if (transfer.items.some((item) => item.qty_received > 0)) {
        transfer.status = "Partially-Received";
      }

      await transfer.save();

      // Populate references for response
      await transfer.populate([
        { path: "from_depot_id", select: "name code type" },
        { path: "to_depot_id", select: "name code type" },
        { path: "sent_by", select: "name email" },
        { path: "received_by", select: "name email" },
      ]);

      res.json({
        success: true,
        message: "Transfer received successfully",
        data: transfer,
      });
    } catch (error) {
      console.error("Error receiving depot transfer:", error);
      res.status(500).json({
        success: false,
        message: "Failed to receive depot transfer",
        error: error.message,
      });
    }
  }
);

/**
 * GET /inventory/depot-transfers/depots/list
 * Get list of other depots (excluding user's depot)
 */
router.get(
  "/depots/list",
  authenticate,
  requireApiPermission("depot-transfer:read"),
  async (req, res) => {
    try {
      // Get user's facility from userContext
      const { facility_id: userDepotId } = req.userContext || {};

      if (!userDepotId) {
        return res.status(400).json({
          success: false,
          message: "User does not have a facility assigned",
        });
      }

      // Get all active depots (facilities with type = "Depot") except user's depot
      const depots = await Facility.find({
        _id: { $ne: userDepotId },
        type: "Depot",
        active: true,
      })
        .select("name code type address")
        .sort({ name: 1 });

      res.json({
        success: true,
        data: depots,
      });
    } catch (error) {
      console.error("Error fetching depots:", error);
      res.status(500).json({
        success: false,
        message: "Failed to fetch depots",
        error: error.message,
      });
    }
  }
);

module.exports = router;
