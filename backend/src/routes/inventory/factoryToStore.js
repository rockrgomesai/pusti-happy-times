/**
 * Factory Store Inventory Routes
 * Handles inventory management for Factory Store (Depot)
 */

const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");
const DepotStock = require("../../models/DepotStock");
const DepotTransactionIn = require("../../models/DepotTransactionIn");
const DepotTransactionOut = require("../../models/DepotTransactionOut");
const ProductionSendToStore = require("../../models/ProductionSendToStore");
const Notification = require("../../models/Notification");
const { authenticate, requireApiPermission } = require("../../middleware/auth");
const { requireInventoryRole, requireInventoryFactoryRole } = require("../../middleware/roleCheck");

/**
 * @route   GET /api/v1/inventory/factory-to-store/pending-receipts
 * @desc    Get pending shipments from production (not yet received)
 * @access  Private - Inventory Role (Factory or Depot)
 */
router.get(
  "/pending-receipts",
  authenticate,
  requireInventoryRole,
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
 * @desc    Receive goods from production shipment (with ACID transactions)
 * @access  Private - Inventory Role (Factory or Depot)
 */
router.post(
  "/receive-from-production",
  authenticate,
  requireInventoryRole,
  requireApiPermission("inventory:receive:create"),
  async (req, res) => {
    // Try to use transactions if replica set is available
    let session = null;
    let useTransaction = false;

    try {
      // Check if we can use transactions (replica set)
      const adminDb = mongoose.connection.db.admin();
      const serverStatus = await adminDb.serverStatus();
      useTransaction = serverStatus.repl && serverStatus.repl.setName;

      if (useTransaction) {
        session = await mongoose.startSession();
        console.log("✅ Using MongoDB transactions");
      } else {
        console.log("⚠️  Standalone MongoDB - running without transactions");
      }
    } catch (error) {
      console.log("⚠️  Transaction check failed - running without transactions");
      useTransaction = false;
    }

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

      // Start transaction if available
      if (useTransaction && session) {
        await session.startTransaction();
      }

      const stockRecords = [];
      const transactionRecords = [];

      try {
        // Process each product in the shipment
        for (const detail of detailsToProcess) {
          // Extract product_id - could be nested or direct ObjectId
          const productId = detail.product_id?._id || detail.product_id;

          // Parse received quantity - handle various formats
          let receivedQty = 0;

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
            throw new Error(
              `Invalid quantity for batch ${detail.batch_no}. Please check the data.`
            );
          }

          if (receivedQty <= 0) {
            throw new Error(`Quantity must be greater than 0 for batch ${detail.batch_no}.`);
          }

          // Find or create AGGREGATED depot stock record (depot + product only)
          const findQuery = DepotStock.findOne({
            depot_id: facility_store_id,
            product_id: productId,
          });

          let stockRecord =
            useTransaction && session ? await findQuery.session(session) : await findQuery;

          let currentQty = 0;
          let newQty = receivedQty;

          if (stockRecord) {
            // Update existing aggregated stock record
            currentQty = parseFloat(
              stockRecord.qty_ctn.$numberDecimal || stockRecord.qty_ctn.toString()
            );
            newQty = currentQty + receivedQty;

            await stockRecord.addStock(receivedQty, useTransaction && session ? session : null);
          } else {
            // Create new aggregated stock record (no batch-level fields)
            stockRecord = new DepotStock({
              depot_id: facility_store_id,
              product_id: productId,
              qty_ctn: receivedQty,
            });

            if (useTransaction && session) {
              await stockRecord.save({ session });
            } else {
              await stockRecord.save();
            }
          }

          stockRecords.push(stockRecord);

          // Create incoming transaction record
          const transactionIn = new DepotTransactionIn({
            depot_id: facility_store_id,
            product_id: productId,
            batch_no: detail.batch_no,
            production_date: detail.production_date,
            expiry_date: detail.expiry_date,
            transaction_type: "from_production",
            qty_ctn: receivedQty,
            balance_after_qty_ctn: newQty,
            reference_type: "ProductionSendToStore",
            reference_id: shipment._id,
            reference_no: shipment.ref,
            source_facility_id: shipment.facility_id,
            location: location || "",
            transaction_date: new Date(),
            received_date: new Date(),
            status: "approved",
            notes: notes || "",
            created_by: user_id,
            approved_by: user_id,
            approved_at: new Date(),
          });

          if (useTransaction && session) {
            await transactionIn.save({ session });
          } else {
            await transactionIn.save();
          }
          transactionRecords.push(transactionIn);
        }

        // Update shipment status
        shipment.status = "received";
        shipment.received_by = user_id;
        shipment.received_at = new Date();

        if (useTransaction && session) {
          await shipment.save({ session });
          // Commit the transaction
          await session.commitTransaction();
          console.log("✅ ACID transaction committed successfully");
        } else {
          await shipment.save();
          console.log("✅ Data saved successfully (without transaction)");
        }
      } catch (error) {
        // Rollback on any error
        if (useTransaction && session) {
          await session.abortTransaction();
          console.error("❌ ACID transaction aborted:", error);
        } else {
          console.error("❌ Error during save:", error);
        }
        throw error;
      }

      // Mark related notifications as read (outside transaction)
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

      // Create confirmation notification for production user (outside transaction)
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
          stock_records: stockRecords,
          transaction_records: transactionRecords,
        },
      });
    } catch (error) {
      console.error("❌ Error receiving goods:", error);
      res.status(500).json({
        success: false,
        message: "Failed to receive goods",
        error: error.message,
      });
    } finally {
      // End the session if it was created
      if (session) {
        session.endSession();
      }
    }
  }
);

/**
 * @route   GET /api/v1/inventory/factory-to-store/received-shipments
 * @desc    Get all received shipments list (received from production)
 * @access  Private - Inventory Role (Factory or Depot)
 */
router.get(
  "/received-shipments",
  authenticate,
  requireInventoryRole,
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
 * @route   GET /api/v1/inventory/factory-to-store
 * @desc    Get current inventory levels (aggregated by product) from depot_stocks
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

      // Use the new DepotStock model's getStockSummary method
      const filters = {};

      if (search) {
        const products = await mongoose
          .model("Product")
          .find({
            $or: [
              { sku: { $regex: search, $options: "i" } },
              { bangla_name: { $regex: search, $options: "i" } },
              { english_name: { $regex: search, $options: "i" } },
              { erp_id: { $regex: search, $options: "i" } },
            ],
          })
          .select("_id");

        if (products.length > 0) {
          filters.product_id = { $in: products.map((p) => p._id) };
        } else {
          // No matching products, return empty result
          return res.status(200).json({
            success: true,
            data: {
              inventory: [],
              pagination: {
                total: 0,
                page: parseInt(page),
                limit: parseInt(limit),
                pages: 0,
              },
            },
          });
        }
      }

      const summary = await DepotStock.getStockSummary(facility_store_id, filters);

      // Apply sorting
      const sortField = sort_by === "sku" ? "sku" : sort_by === "erp_id" ? "erp_id" : "sku";
      const sortDir = sort_order === "desc" ? -1 : 1;

      summary.sort((a, b) => {
        if (a[sortField] < b[sortField]) return -sortDir;
        if (a[sortField] > b[sortField]) return sortDir;
        return 0;
      });

      // Apply pagination
      const total = summary.length;
      const skip = (parseInt(page) - 1) * parseInt(limit);
      const paginatedSummary = summary.slice(skip, skip + parseInt(limit));

      res.status(200).json({
        success: true,
        data: {
          inventory: paginatedSummary,
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
 * @desc    Get inventory transaction history from depot_transactions_in
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
        filters.transaction_date = {};
        if (start_date) filters.transaction_date.$gte = new Date(start_date);
        if (end_date) filters.transaction_date.$lte = new Date(end_date);
      }

      const result = await DepotTransactionIn.getHistory(
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
 * @desc    Get inventory dashboard data (low stock, expiring soon, summary) from depot_stocks
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
        DepotStock.getLowStock(facility_store_id, 10),
        DepotStock.getExpiringSoon(facility_store_id, 30),
        DepotTransactionIn.getDailySummary(facility_store_id, new Date()),
        DepotStock.aggregate([
          {
            $match: {
              depot_id: new mongoose.Types.ObjectId(facility_store_id),
              is_deleted: false,
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
