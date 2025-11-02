/**
 * Factory Store Inventory Routes
 * Handles inventory management for Factory Store (Depot)
 */

const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");
const FactoryStoreInventory = require("../../models/FactoryStoreInventory");
const FactoryStoreInventoryTransaction = require("../../models/FactoryStoreInventoryTransaction");
const ProductionSendToStore = require("../../models/ProductionSendToStore");
const Notification = require("../../models/Notification");
const { authenticate, requireApiPermission } = require("../../middleware/auth");
const { requireInventoryRole, requireInventoryFactoryRole } = require("../../middleware/roleCheck");

/**
 * @route   GET /api/v1/inventory/factory-to-store/pending-receipts
 * @desc    Get pending shipments from production (not yet received)
 * @access  Private - Inventory Factory Role ONLY
 */
router.get(
  "/pending-receipts",
  authenticate,
  requireInventoryFactoryRole,
  requireApiPermission("inventory:pending-receipts:read"),
  async (req, res) => {
    try {
      const { facility_store_id } = req.userContext;
      const { page = 1, limit = 20, search = "" } = req.query;

      if (!facility_store_id) {
        return res.status(400).json({
          success: false,
          message: "Factory store ID not found in user context",
        });
      }

      const skip = (parseInt(page) - 1) * parseInt(limit);

      // Build query for pending shipments (sent but not received)
      const query = {
        facility_store_id: new mongoose.Types.ObjectId(facility_store_id),
        status: "sent", // Not yet received
      };

      if (search) {
        query.$or = [
          { ref: { $regex: search, $options: "i" } },
          { "details.batch_no": { $regex: search, $options: "i" } },
        ];
      }

      const [shipments, total] = await Promise.all([
        ProductionSendToStore.find(query)
          .populate("facility_id", "name")
          .populate("facility_store_id", "name")
          .populate("user_id", "username")
          .populate({
            path: "details.product_id",
            select: "sku name erp_id ctn_pcs wt_pcs category_id",
          })
          .sort({ created_at: -1 })
          .skip(skip)
          .limit(parseInt(limit)),
        ProductionSendToStore.countDocuments(query),
      ]);

      res.status(200).json({
        success: true,
        data: {
          shipments,
          pagination: {
            total,
            page: parseInt(page),
            limit: parseInt(limit),
            pages: Math.ceil(total / parseInt(limit)),
          },
        },
      });
    } catch (error) {
      console.error("❌ Error fetching pending receipts:", error);
      res.status(500).json({
        success: false,
        message: "Failed to fetch pending receipts",
        error: error.message,
      });
    }
  }
);

/**
 * @route   POST /api/v1/inventory/factory-to-store/receive-from-production
 * @desc    Receive goods from production shipment (reverse of send-to-store)
 * @access  Private - Inventory Factory Role ONLY
 */
router.post(
  "/receive-from-production",
  authenticate,
  requireInventoryFactoryRole,
  requireApiPermission("inventory:receive:create"),
  async (req, res) => {
    // Skip transactions for non-replica-set MongoDB
    // Transactions will be added when replica set is configured
    const USE_TRANSACTIONS = false; // Set to true when using replica set

    try {
      const { shipment_id, location, notes, details: editedDetails } = req.body;
      const { user_id, facility_store_id } = req.userContext;

      if (!facility_store_id) {
        return res.status(400).json({
          success: false,
          message: "Factory store ID not found in user context",
        });
      }

      if (!shipment_id) {
        return res.status(400).json({
          success: false,
          message: "Shipment ID is required",
        });
      }

      // Validate shipment exists and is pending
      const shipment = await ProductionSendToStore.findById(shipment_id)
        .populate("details.product_id")
        .populate("facility_id", "name")
        .populate("user_id", "username");

      if (!shipment) {
        return res.status(404).json({
          success: false,
          message: "Shipment not found",
        });
      }

      if (shipment.status !== "sent") {
        return res.status(400).json({
          success: false,
          message: `Cannot receive shipment with status: ${shipment.status}. Only 'sent' shipments can be received.`,
        });
      }

      if (shipment.facility_store_id.toString() !== facility_store_id.toString()) {
        return res.status(403).json({
          success: false,
          message: "This shipment is not designated for your facility store",
        });
      }

      // Use edited details if provided, otherwise use original shipment details
      const detailsToProcess =
        editedDetails && editedDetails.length > 0 ? editedDetails : shipment.details;

      // Process each product in the shipment
      const inventoryRecords = [];
      const transactions = [];

      for (const detail of detailsToProcess) {
        // Extract product_id - could be nested or direct ObjectId
        const productId = detail.product_id?._id || detail.product_id;

        // Find if this batch already exists in inventory
        let inventoryRecord = await FactoryStoreInventory.findOne({
          facility_store_id,
          product_id: productId,
          batch_no: detail.batch_no,
        });

        // Parse received quantity - handle various formats
        let receivedQty = 0;

        console.log(`🔍 DEBUG detail.qty:`, detail.qty);
        console.log(`🔍 DEBUG typeof detail.qty:`, typeof detail.qty);
        console.log(`🔍 DEBUG detail:`, JSON.stringify(detail));

        if (typeof detail.qty === "number") {
          receivedQty = detail.qty;
        } else if (detail.qty && detail.qty.$numberDecimal) {
          receivedQty = parseFloat(detail.qty.$numberDecimal);
        } else if (detail.qty && typeof detail.qty === "object" && detail.qty.toString) {
          receivedQty = parseFloat(detail.qty.toString());
        } else if (typeof detail.qty === "string") {
          receivedQty = parseFloat(detail.qty);
        } else {
          console.error(`❌ Unable to parse qty from detail:`, detail);
        }

        console.log(
          `📦 Processing product ${productId}, batch ${detail.batch_no}, receivedQty: ${receivedQty}`
        );

        if (isNaN(receivedQty)) {
          console.error(`❌ Invalid receivedQty (NaN) for batch ${detail.batch_no}`);
          return res.status(400).json({
            success: false,
            message: `Invalid quantity for batch ${detail.batch_no}. Please check the data.`,
          });
        }

        if (receivedQty <= 0) {
          console.error(`❌ Invalid receivedQty (${receivedQty}) for batch ${detail.batch_no}`);
          return res.status(400).json({
            success: false,
            message: `Quantity must be greater than 0 for batch ${detail.batch_no}.`,
          });
        }

        if (inventoryRecord) {
          // Update existing record
          const currentQty = parseFloat(
            inventoryRecord.qty_ctn.$numberDecimal || inventoryRecord.qty_ctn.toString()
          );
          inventoryRecord.qty_ctn = currentQty + receivedQty;
          inventoryRecord.status = "active";
          inventoryRecord.last_updated_by = user_id;
          inventoryRecord.last_updated_at = new Date();
          if (location) inventoryRecord.location = location;
          if (notes) inventoryRecord.notes = notes;

          await inventoryRecord.save();
        } else {
          // Create new inventory record
          inventoryRecord = new FactoryStoreInventory({
            facility_store_id,
            product_id: productId,
            batch_no: detail.batch_no,
            production_date: detail.production_date,
            expiry_date: detail.expiry_date,
            qty_ctn: receivedQty,
            initial_qty_ctn: receivedQty,
            location: location || "",
            source_shipment_ref: shipment.ref,
            source_shipment_id: shipment._id,
            status: "active",
            notes: notes || "",
            received_by: user_id,
            received_at: new Date(),
          });

          await inventoryRecord.save();
        }

        inventoryRecords.push(inventoryRecord);

        // Create transaction record
        const transaction = new FactoryStoreInventoryTransaction({
          facility_store_id,
          product_id: productId,
          batch_no: detail.batch_no,
          transaction_type: "receipt",
          qty_ctn: receivedQty,
          balance_after: parseFloat(
            inventoryRecord.qty_ctn.$numberDecimal || inventoryRecord.qty_ctn.toString()
          ),
          reference_type: "production_shipment",
          reference_id: shipment._id,
          reference_type_model: "ProductionSendToStore",
          reference_no: shipment.ref,
          production_date: detail.production_date,
          expiry_date: detail.expiry_date,
          location: location || "",
          notes: notes || "",
          created_by: user_id,
          status: "approved",
        });

        await transaction.save();
        transactions.push(transaction);
      }

      // Update shipment status
      shipment.status = "received";
      shipment.received_by = user_id;
      shipment.received_at = new Date();
      await shipment.save();

      // Mark related notifications as read
      await Notification.updateMany(
        {
          shipment_id: shipment._id,
          type: "shipment_pending",
          read: false,
        },
        {
          read: true,
          read_at: new Date(),
        }
      );

      // Create confirmation notification for production user
      try {
        await Notification.create({
          user_id: shipment.user_id,
          type: "shipment_received",
          title: "Shipment Received",
          message: `Your shipment ${shipment.ref} has been received at the destination store.`,
          shipment_id: shipment._id,
          priority: "normal",
          action_url: `/production/sendtostorelist`,
          action_label: "View Shipment",
          expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        });
      } catch (notifError) {
        console.error("⚠️  Failed to create confirmation notification:", notifError);
      }

      res.status(201).json({
        success: true,
        message: `Shipment ${shipment.ref} received successfully`,
        data: {
          shipment,
          inventory_records: inventoryRecords,
          transactions,
        },
      });
    } catch (error) {
      console.error("❌ Error receiving goods:", error);
      res.status(500).json({
        success: false,
        message: "Failed to receive goods",
        error: error.message,
      });
    }
  }
);

/**
 * @route   GET /api/v1/inventory/factory-to-store/received-shipments
 * @desc    Get all received shipments list (received from production)
 * @access  Private - Inventory Factory Role ONLY
 */
router.get(
  "/received-shipments",
  authenticate,
  requireInventoryFactoryRole,
  requireApiPermission("inventory:view:read"),
  async (req, res) => {
    try {
      const { facility_store_id } = req.userContext;
      const { page = 1, limit = 20, search = "" } = req.query;

      if (!facility_store_id) {
        return res.status(400).json({
          success: false,
          message: "Factory store ID not found in user context",
        });
      }

      const skip = (parseInt(page) - 1) * parseInt(limit);

      // Build query for received shipments
      const query = {
        facility_store_id: new mongoose.Types.ObjectId(facility_store_id),
        status: "received", // Already received
      };

      if (search) {
        query.$or = [
          { ref: { $regex: search, $options: "i" } },
          { "details.batch_no": { $regex: search, $options: "i" } },
        ];
      }

      const [shipments, total] = await Promise.all([
        ProductionSendToStore.find(query)
          .populate("facility_id", "name")
          .populate("facility_store_id", "name")
          .populate("user_id", "username")
          .populate("received_by", "username")
          .populate({
            path: "details.product_id",
            select: "sku bangla_name english_name erp_id ctn_pcs wt_pcs category_id",
          })
          .sort({ received_at: -1 }) // Latest received on top
          .skip(skip)
          .limit(parseInt(limit)),
        ProductionSendToStore.countDocuments(query),
      ]);

      res.status(200).json({
        success: true,
        data: {
          shipments,
          pagination: {
            total,
            page: parseInt(page),
            limit: parseInt(limit),
            pages: Math.ceil(total / parseInt(limit)),
          },
        },
      });
    } catch (error) {
      console.error("❌ Error fetching received shipments:", error);
      res.status(500).json({
        success: false,
        message: "Failed to fetch received shipments",
        error: error.message,
      });
    }
  }
);

/**
 * @route   POST /api/v1/inventory/factory-to-store/receive
 * @desc    Receive goods from production shipment
 * @access  Private - Inventory Role
 */
router.post(
  "/receive",
  authenticate,
  requireInventoryRole,
  requireApiPermission("inventory:receive:create"),
  async (req, res) => {
    try {
      const { shipment_id, received_details, location, notes } = req.body;
      const { user_id, facility_store_id } = req.userContext;

      if (!facility_store_id) {
        return res.status(400).json({
          success: false,
          message: "Factory store ID not found in user context",
        });
      }

      // Validate shipment exists and is pending
      const shipment =
        await ProductionSendToStore.findById(shipment_id).populate("details.product_id");

      if (!shipment) {
        return res.status(404).json({
          success: false,
          message: "Shipment not found",
        });
      }

      if (shipment.status !== "sent") {
        return res.status(400).json({
          success: false,
          message: `Cannot receive shipment with status: ${shipment.status}`,
        });
      }

      if (shipment.facility_store_id.toString() !== facility_store_id) {
        return res.status(403).json({
          success: false,
          message: "Shipment is not for your facility store",
        });
      }

      // Process each product in the shipment
      const inventoryRecords = [];
      const transactions = [];

      for (const detail of shipment.details) {
        // Find if this batch already exists in inventory
        let inventoryRecord = await FactoryStoreInventory.findOne({
          facility_store_id,
          product_id: detail.product_id._id,
          batch_no: detail.batch_no,
        });

        const receivedQty = parseFloat(detail.qty.$numberDecimal || detail.qty.toString());

        if (inventoryRecord) {
          // Update existing record
          const currentQty = parseFloat(
            inventoryRecord.qty_ctn.$numberDecimal || inventoryRecord.qty_ctn.toString()
          );
          inventoryRecord.qty_ctn = currentQty + receivedQty;
          inventoryRecord.status = "active";
          inventoryRecord.last_updated_by = user_id;
          inventoryRecord.last_updated_at = new Date();
          if (location) inventoryRecord.location = location;
          if (notes) inventoryRecord.notes = notes;

          await inventoryRecord.save();
        } else {
          // Create new inventory record
          inventoryRecord = new FactoryStoreInventory({
            facility_store_id,
            product_id: detail.product_id._id,
            batch_no: detail.batch_no,
            production_date: detail.production_date,
            expiry_date: detail.expiry_date,
            qty_ctn: receivedQty,
            initial_qty_ctn: receivedQty,
            location: location || "",
            source_shipment_ref: shipment.ref,
            source_shipment_id: shipment._id,
            status: "active",
            notes: notes || "",
            received_by: user_id,
            received_at: new Date(),
          });

          await inventoryRecord.save();
        }

        inventoryRecords.push(inventoryRecord);

        // Create transaction record
        const transaction = new FactoryStoreInventoryTransaction({
          facility_store_id,
          product_id: detail.product_id._id,
          batch_no: detail.batch_no,
          transaction_type: "receipt",
          qty_ctn: receivedQty,
          balance_after: parseFloat(
            inventoryRecord.qty_ctn.$numberDecimal || inventoryRecord.qty_ctn.toString()
          ),
          reference_type: "production_shipment",
          reference_id: shipment._id,
          reference_type_model: "ProductionSendToStore",
          reference_no: shipment.ref,
          production_date: detail.production_date,
          expiry_date: detail.expiry_date,
          location: location || "",
          notes: notes || "",
          created_by: user_id,
          status: "approved",
        });

        await transaction.save();
        transactions.push(transaction);
      }

      // Update shipment status
      shipment.status = "received";
      shipment.received_by = user_id;
      shipment.received_at = new Date();
      await shipment.save();

      res.status(201).json({
        success: true,
        message: `Shipment ${shipment.ref} received successfully`,
        data: {
          shipment,
          inventory_records: inventoryRecords,
          transactions,
        },
      });
    } catch (error) {
      console.error("❌ Error receiving goods:", error);
      res.status(500).json({
        success: false,
        message: "Failed to receive goods",
        error: error.message,
      });
    }
  }
);

/**
 * @route   GET /api/v1/inventory/factory-to-store
 * @desc    Get current inventory levels (aggregated by product)
 * @access  Private - Inventory Role
 */
router.get(
  "/",
  authenticate,
  requireInventoryRole,
  requireApiPermission("inventory:view:read"),
  async (req, res) => {
    try {
      const { facility_store_id } = req.userContext;
      const { page = 1, limit = 50, search = "", sort_by = "sku", sort_order = "asc" } = req.query;

      if (!facility_store_id) {
        return res.status(400).json({
          success: false,
          message: "Factory store ID not found in user context",
        });
      }

      const skip = (parseInt(page) - 1) * parseInt(limit);

      // Build match stage for aggregation
      const matchStage = {
        facility_store_id: new mongoose.Types.ObjectId(facility_store_id),
        status: "active", // Only show active inventory
      };

      // If search, find matching products first
      if (search) {
        const products = await mongoose
          .model("Product")
          .find({
            $or: [
              { sku: { $regex: search, $options: "i" } },
              { name: { $regex: search, $options: "i" } },
              { erp_id: { $regex: search, $options: "i" } },
            ],
          })
          .select("_id");

        matchStage.product_id = { $in: products.map((p) => p._id) };
      }

      // Aggregate inventory by product (sum all batches)
      const aggregationPipeline = [
        { $match: matchStage },
        {
          $group: {
            _id: "$product_id",
            total_qty_ctn: { $sum: { $toDouble: "$qty_ctn" } },
            batch_count: { $sum: 1 },
            oldest_production_date: { $min: "$production_date" },
            earliest_expiry_date: { $min: "$expiry_date" },
          },
        },
        {
          $lookup: {
            from: "products",
            localField: "_id",
            foreignField: "_id",
            as: "product",
          },
        },
        { $unwind: "$product" },
        {
          $project: {
            product_id: "$_id",
            sku: "$product.sku",
            erp_id: "$product.erp_id",
            name: "$product.name",
            ctn_pcs: "$product.ctn_pcs",
            wt_pcs: "$product.wt_pcs",
            total_qty_ctn: 1,
            total_qty_pcs: { $multiply: ["$total_qty_ctn", "$product.ctn_pcs"] },
            total_wt_mt: {
              $divide: [
                { $multiply: ["$total_qty_ctn", "$product.ctn_pcs", "$product.wt_pcs"] },
                1000000, // Convert grams to MT
              ],
            },
            batch_count: 1,
            oldest_production_date: 1,
            earliest_expiry_date: 1,
          },
        },
      ];

      // Add sorting
      const sortStage = {};
      if (sort_by === "sku") {
        sortStage.sku = sort_order === "asc" ? 1 : -1;
      } else if (sort_by === "erp_id") {
        sortStage.erp_id = sort_order === "asc" ? 1 : -1;
      } else if (sort_by === "qty") {
        sortStage.total_qty_ctn = sort_order === "asc" ? 1 : -1;
      } else {
        sortStage.sku = 1; // Default to SKU ascending
      }
      aggregationPipeline.push({ $sort: sortStage });

      // Get total count before pagination
      const countPipeline = [...aggregationPipeline, { $count: "total" }];
      const countResult = await FactoryStoreInventory.aggregate(countPipeline);
      const total = countResult.length > 0 ? countResult[0].total : 0;

      // Add pagination
      aggregationPipeline.push({ $skip: skip });
      aggregationPipeline.push({ $limit: parseInt(limit) });

      const inventory = await FactoryStoreInventory.aggregate(aggregationPipeline);

      res.status(200).json({
        success: true,
        data: {
          inventory,
          pagination: {
            total,
            page: parseInt(page),
            limit: parseInt(limit),
            pages: Math.ceil(total / parseInt(limit)),
          },
        },
      });
    } catch (error) {
      console.error("❌ Error fetching inventory:", error);
      res.status(500).json({
        success: false,
        message: "Failed to fetch inventory",
        error: error.message,
      });
    }
  }
);

/**
 * @route   GET /api/v1/inventory/factory-to-store/transactions
 * @desc    Get inventory transaction history
 * @access  Private - Inventory Role
 */
router.get(
  "/transactions",
  authenticate,
  requireInventoryRole,
  requireApiPermission("inventory:transactions:read"),
  async (req, res) => {
    try {
      const { facility_store_id } = req.userContext;
      const {
        page = 1,
        limit = 50,
        transaction_type,
        product_id,
        batch_no,
        start_date,
        end_date,
      } = req.query;

      if (!facility_store_id) {
        return res.status(400).json({
          success: false,
          message: "Factory store ID not found in user context",
        });
      }

      const filters = {};

      if (transaction_type) filters.transaction_type = transaction_type;
      if (product_id) filters.product_id = product_id;
      if (batch_no) filters.batch_no = batch_no;

      if (start_date || end_date) {
        filters.created_at = {};
        if (start_date) filters.created_at.$gte = new Date(start_date);
        if (end_date) filters.created_at.$lte = new Date(end_date);
      }

      const result = await FactoryStoreInventoryTransaction.getHistory(
        facility_store_id,
        filters,
        parseInt(page),
        parseInt(limit)
      );

      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      console.error("❌ Error fetching transactions:", error);
      res.status(500).json({
        success: false,
        message: "Failed to fetch transactions",
        error: error.message,
      });
    }
  }
);

/**
 * @route   GET /api/v1/inventory/factory-to-store/dashboard
 * @desc    Get inventory dashboard data (low stock, expiring soon, summary)
 * @access  Private - Inventory Role
 */
router.get(
  "/dashboard",
  authenticate,
  requireInventoryRole,
  requireApiPermission("inventory:view:read"),
  async (req, res) => {
    try {
      const { facility_store_id } = req.userContext;

      if (!facility_store_id) {
        return res.status(400).json({
          success: false,
          message: "Factory store ID not found in user context",
        });
      }

      const [lowStock, expiringSoon, todaySummary, statusCounts] = await Promise.all([
        FactoryStoreInventory.getLowStock(facility_store_id, 10),
        FactoryStoreInventory.getExpiringSoon(facility_store_id, 30),
        FactoryStoreInventoryTransaction.getDailySummary(facility_store_id, new Date()),
        FactoryStoreInventory.aggregate([
          {
            $match: {
              facility_store_id: new mongoose.Types.ObjectId(facility_store_id),
            },
          },
          {
            $group: {
              _id: "$status",
              count: { $sum: 1 },
              total_qty: { $sum: { $toDouble: "$qty_ctn" } },
            },
          },
        ]),
      ]);

      res.status(200).json({
        success: true,
        data: {
          low_stock: lowStock,
          expiring_soon: expiringSoon,
          today_summary: todaySummary,
          status_counts: statusCounts,
        },
      });
    } catch (error) {
      console.error("❌ Error fetching dashboard data:", error);
      res.status(500).json({
        success: false,
        message: "Failed to fetch dashboard data",
        error: error.message,
      });
    }
  }
);

module.exports = router;
