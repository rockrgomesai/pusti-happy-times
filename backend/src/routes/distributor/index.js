const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");
const models = require("../../models");
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

// GET /api/distributor/chalans/receive-list - Get Chalans ready to receive
// NOTE: This route must be BEFORE the chalans sub-router mount
router.get(
  "/chalans/receive-list",
  authenticate,
  requireApiPermission("distributor-chalan:read"),
  async (req, res) => {
    try {
      const { user_id } = req.userContext;
      const { page = 1, limit = 10, search, date_from, date_to } = req.query;

      // Find user's distributor
      const user = await models.User.findById(user_id).populate("distributor_id");

      if (!user || !user.distributor_id) {
        return res.status(403).json({
          success: false,
          message: "User is not associated with any distributor",
        });
      }

      const distributorId = user.distributor_id._id;

      // Build query - show chalans that are Generated or Delivered and NOT yet received
      const query = {
        distributor_id: distributorId,
        status: { $in: ["Generated", "Delivered"], $ne: "Received" },
      };

      if (search) {
        query.$or = [
          { chalan_no: { $regex: search, $options: "i" } },
        ];
      }

      if (date_from || date_to) {
        query.chalan_date = {};
        if (date_from) query.chalan_date.$gte = new Date(date_from);
        if (date_to) query.chalan_date.$lte = new Date(date_to);
      }

      // Get total count
      const total = await models.DeliveryChalan.countDocuments(query);

      // Get paginated chalans
      let chalans = await models.DeliveryChalan.find(query)
        .populate({ path: "created_by", select: "name" })
        .populate({ path: "depot_id", select: "facility_name" })
        .populate({ path: "load_sheet_id", select: "load_sheet_number" })
        .sort({ chalan_date: -1, created_at: -1 })
        .skip((page - 1) * limit)
        .limit(parseInt(limit))
        .lean();

      // Convert Decimal128 fields for each chalan
      chalans = chalans.map(chalan => ({
        ...chalan,
        total_qty_ctn: chalan.total_qty_ctn ? parseFloat(chalan.total_qty_ctn.toString()) : 0,
        total_qty_pcs: chalan.total_qty_pcs ? parseFloat(chalan.total_qty_pcs.toString()) : 0,
      }));

      res.json({
        success: true,
        data: {
          chalans,
          pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total,
            pages: Math.ceil(total / limit),
          },
        },
      });
    } catch (error) {
      console.error("Error fetching receive list:", error);
      res.status(500).json({
        success: false,
        message: "Failed to fetch receive list",
        error: error.message,
      });
    }
  }
);

// GET /api/distributor/chalans/:id/receive-details - Get Chalan details for receiving
router.get(
  "/chalans/:id/receive-details",
  authenticate,
  requireApiPermission("distributor-chalan:read"),
  async (req, res) => {
    try {
      const { user_id } = req.userContext;
      const { id } = req.params;

      // Find user's distributor
      const user = await models.User.findById(user_id).populate("distributor_id");

      if (!user || !user.distributor_id) {
        return res.status(403).json({
          success: false,
          message: "User is not associated with any distributor",
        });
      }

      const distributorId = user.distributor_id._id;

      // Get chalan - allow Generated or Delivered status
      const chalan = await models.DeliveryChalan.findOne({
        _id: id,
        distributor_id: distributorId,
        status: { $in: ["Generated", "Delivered"] },
      })
        .populate({ path: "depot_id", select: "facility_name" })
        .populate({ path: "created_by", select: "name" })
        .populate({ path: "load_sheet_id", select: "load_sheet_number" })
        .lean();

      if (!chalan) {
        return res.status(404).json({
          success: false,
          message: "Chalan not found or not eligible for receiving",
        });
      }

      // Convert Decimal128 fields to numbers since .lean() skips getters
      if (chalan.items && Array.isArray(chalan.items)) {
        chalan.items = chalan.items.map(item => ({
          ...item,
          qty_ctn: item.qty_ctn ? parseFloat(item.qty_ctn.toString()) : 0,
          qty_pcs: item.qty_pcs ? parseFloat(item.qty_pcs.toString()) : 0,
          received_qty_ctn: item.received_qty_ctn ? parseFloat(item.received_qty_ctn.toString()) : 0,
          received_qty_pcs: item.received_qty_pcs ? parseFloat(item.received_qty_pcs.toString()) : 0,
          damage_qty_ctn: item.damage_qty_ctn ? parseFloat(item.damage_qty_ctn.toString()) : 0,
          damage_qty_pcs: item.damage_qty_pcs ? parseFloat(item.damage_qty_pcs.toString()) : 0,
        }));
      }

      res.json({
        success: true,
        data: chalan,
      });
    } catch (error) {
      console.error("Error fetching chalan details:", error);
      res.status(500).json({
        success: false,
        message: "Failed to fetch chalan details",
        error: error.message,
      });
    }
  }
);

// POST /api/distributor/chalans/:id/receive - Receive Chalan
router.post(
  "/chalans/:id/receive",
  authenticate,
  requireApiPermission("distributor-chalan:receive"),
  async (req, res) => {
    let session;
    let useTransaction;

    try {
      // Start transaction (gracefully handles standalone MongoDB)
      ({ session, useTransaction } = await startTransactionSession());

      const { user_id } = req.userContext;
      const { id } = req.params;
      const { received_items, notes } = req.body;

      // Validate received_items
      if (!received_items || !Array.isArray(received_items) || received_items.length === 0) {
        await abortTransaction(session, useTransaction);
        return res.status(400).json({
          success: false,
          message: "Received items are required",
        });
      }

      // Find user's distributor
      const userQuery = models.User.findById(user_id).populate("distributor_id");
      const user = await addSessionToQuery(userQuery, session, useTransaction);

      if (!user || !user.distributor_id) {
        await abortTransaction(session, useTransaction);
        return res.status(403).json({
          success: false,
          message: "User is not associated with any distributor",
        });
      }

      const distributorId = user.distributor_id._id;

      // Get chalan - allow Generated or Delivered status
      const chalanQuery = models.DeliveryChalan.findOne({
        _id: id,
        distributor_id: distributorId,
        status: { $in: ["Generated", "Delivered"] },
      });
      const chalan = await addSessionToQuery(chalanQuery, session, useTransaction);

      if (!chalan) {
        await abortTransaction(session, useTransaction);
        return res.status(404).json({
          success: false,
          message: "Chalan not found or already received",
        });
      }

      // Process each received item
      const processedItems = [];
      for (const receivedItem of received_items) {
        const { sku, received_qty, variance_reason } = receivedItem;

        // Find matching item in chalan
        const chalanItem = chalan.items.find((item) => item.sku === sku);
        if (!chalanItem) {
          await abortTransaction(session, useTransaction);
          return res.status(400).json({
            success: false,
            message: `SKU ${sku} not found in chalan`,
          });
        }

        const deliveredQty = parseFloat(chalanItem.qty_ctn?.toString() || chalanItem.qty_ctn || 0);
        const receivedQty = parseFloat(received_qty);
        const varianceQty = deliveredQty - receivedQty;

        // Validate received quantity
        if (receivedQty < 0 || receivedQty > deliveredQty) {
          await abortTransaction(session, useTransaction);
          return res.status(400).json({
            success: false,
            message: `Invalid received quantity for SKU ${sku}. Must be between 0 and ${deliveredQty}`,
          });
        }

        // Update or create distributor stock
        const existingStockQuery = models.DistributorStock.findOne({
          distributor_id: distributorId,
          sku: sku,
        });
        const existingStock = await addSessionToQuery(existingStockQuery, session, useTransaction);

        if (existingStock) {
          // Update existing stock
          const currentQty = parseFloat(existingStock.qty);
          existingStock.qty = currentQty + receivedQty;
          existingStock.last_received_at = new Date();
          existingStock.last_chalan_id = chalan._id;
          await existingStock.save(getSaveOptions(session, useTransaction));
        } else {
          // Create new stock record
          const newStock = new models.DistributorStock({
            distributor_id: distributorId,
            sku: sku,
            qty: receivedQty,
            last_received_at: new Date(),
            last_chalan_id: chalan._id,
          });
          await newStock.save(getSaveOptions(session, useTransaction));
        }

        processedItems.push({
          sku,
          delivered_qty: deliveredQty,
          received_qty: receivedQty,
          variance_qty: varianceQty,
          variance_reason: varianceQty !== 0 ? variance_reason : null,
        });
      }

      // Update chalan with receipt information
      chalan.status = "Received";
      chalan.received_at = new Date();
      chalan.received_by = user_id;
      if (notes) {
        chalan.remarks = chalan.remarks
          ? `${chalan.remarks}\n\nReceipt Notes: ${notes}`
          : `Receipt Notes: ${notes}`;
      }
      
      // Update each item with received quantities
      for (const processedItem of processedItems) {
        const chalanItem = chalan.items.find(item => item.sku === processedItem.sku);
        if (chalanItem) {
          chalanItem.received_qty_ctn = processedItem.received_qty;
          if (processedItem.variance_qty > 0) {
            chalanItem.damage_qty_ctn = processedItem.variance_qty;
            chalanItem.damage_reason = processedItem.variance_reason;
          }
        }
      }
      
      await chalan.save(getSaveOptions(session, useTransaction));

      await commitTransaction(session, useTransaction);

      res.json({
        success: true,
        message: "Chalan received successfully",
        data: {
          chalan_number: chalan.chalan_no,
          received_items: processedItems,
          total_variance: processedItems.reduce((sum, item) => sum + item.variance_qty, 0),
        },
      });
    } catch (error) {
      await abortTransaction(session, useTransaction);
      console.error("Error receiving chalan:", error);
      res.status(500).json({
        success: false,
        message: "Failed to receive chalan",
        error: error.message,
      });
    } finally {
      endSession(session);
    }
  }
);

// GET /api/distributor/stock - Get distributor stock
router.get(
  "/stock",
  authenticate,
  requireApiPermission("distributor-stock:read"),
  async (req, res) => {
    try {
      const { user_id } = req.userContext;
      const { page = 1, limit = 20, search, low_stock_only } = req.query;

      // Find user's distributor
      const user = await models.User.findById(user_id).populate("distributor_id");

      if (!user || !user.distributor_id) {
        return res.status(403).json({
          success: false,
          message: "User is not associated with any distributor",
        });
      }

      const distributorId = user.distributor_id._id;

      // Build query
      const query = { distributor_id: distributorId };

      if (search) {
        query.sku = { $regex: search, $options: "i" };
      }

      if (low_stock_only === "true") {
        query.qty = { $lt: 50 }; // Less than 50 CTN
      }

      // Get total count
      const total = await models.DistributorStock.countDocuments(query);

      // Get paginated stock
      const stock = await models.DistributorStock.find(query)
        .populate("last_chalan_id", "chalan_number delivery_date")
        .sort({ qty: 1, sku: 1 }) // Low stock first
        .skip((page - 1) * limit)
        .limit(parseInt(limit));

      // Calculate summary
      const summary = await models.DistributorStock.aggregate([
        { $match: { distributor_id: distributorId } },
        {
          $group: {
            _id: null,
            total_skus: { $sum: 1 },
            total_qty: { $sum: { $toDouble: "$qty" } },
            low_stock_count: {
              $sum: {
                $cond: [{ $lt: [{ $toDouble: "$qty" }, 50] }, 1, 0],
              },
            },
          },
        },
      ]);

      res.json({
        success: true,
        data: {
          stock,
          summary: summary[0] || { total_skus: 0, total_qty: 0, low_stock_count: 0 },
          pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total,
            pages: Math.ceil(total / limit),
          },
        },
      });
    } catch (error) {
      console.error("Error fetching distributor stock:", error);
      res.status(500).json({
        success: false,
        message: "Failed to fetch stock",
        error: error.message,
      });
    }
  }
);

// GET /api/distributor/chalans/received-history - Get received chalans history
router.get(
  "/chalans/received-history",
  authenticate,
  requireApiPermission("distributor-chalan:read"),
  async (req, res) => {
    try {
      const { user_id } = req.userContext;
      const { page = 1, limit = 10, date_from, date_to } = req.query;

      // Find user's distributor
      const user = await models.User.findById(user_id).populate("distributor_id");

      if (!user || !user.distributor_id) {
        return res.status(403).json({
          success: false,
          message: "User is not associated with any distributor",
        });
      }

      const distributorId = user.distributor_id._id;

      // Build query
      const query = {
        distributor_id: distributorId,
        status: "Received",
      };

      if (date_from || date_to) {
        query.received_at = {};
        if (date_from) query.received_at.$gte = new Date(date_from);
        if (date_to) query.received_at.$lte = new Date(date_to);
      }

      // Get total count
      const total = await models.DeliveryChalan.countDocuments(query);

      // Get paginated history
      let chalans = await models.DeliveryChalan.find(query)
        .populate({ path: "received_by", select: "name" })
        .populate({ path: "depot_id", select: "facility_name" })
        .populate({ path: "load_sheet_id", select: "load_sheet_number" })
        .sort({ received_at: -1 })
        .skip((page - 1) * limit)
        .limit(parseInt(limit))
        .lean();

      // Convert Decimal128 fields and transform items to received_items format
      chalans = chalans.map(chalan => {
        const received_items = (chalan.items || []).map(item => ({
          sku: item.sku,
          delivered_qty: item.qty_ctn ? parseFloat(item.qty_ctn.toString()) : 0,
          received_qty: item.received_qty_ctn ? parseFloat(item.received_qty_ctn.toString()) : 0,
          variance_qty: item.damage_qty_ctn ? parseFloat(item.damage_qty_ctn.toString()) : 0,
          variance_reason: item.damage_reason || '',
        }));

        return {
          ...chalan,
          total_qty_ctn: chalan.total_qty_ctn ? parseFloat(chalan.total_qty_ctn.toString()) : 0,
          total_qty_pcs: chalan.total_qty_pcs ? parseFloat(chalan.total_qty_pcs.toString()) : 0,
          received_items,
        };
      });

      res.json({
        success: true,
        data: {
          chalans,
          pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total,
            pages: Math.ceil(total / limit),
          },
        },
      });
    } catch (error) {
      console.error("Error fetching received history:", error);
      res.status(500).json({
        success: false,
        message: "Failed to fetch received history",
        error: error.message,
      });
    }
  }
);

// Mount chalans sub-router LAST to avoid conflicts with specific routes above
const chalansRouter = require("./chalans");
router.use("/chalans", chalansRouter);

module.exports = router;
