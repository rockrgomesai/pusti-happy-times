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

      // Build query
      const query = {
        distributor_id: distributorId,
        status: "Delivered",
        receipt_status: "Pending",
      };

      if (search) {
        query.$or = [
          { chalan_number: { $regex: search, $options: "i" } },
          { load_sheet_number: { $regex: search, $options: "i" } },
        ];
      }

      if (date_from || date_to) {
        query.delivery_date = {};
        if (date_from) query.delivery_date.$gte = new Date(date_from);
        if (date_to) query.delivery_date.$lte = new Date(date_to);
      }

      // Get total count
      const total = await models.DeliveryChalan.countDocuments(query);

      // Get paginated chalans
      const chalans = await models.DeliveryChalan.find(query)
        .populate("created_by", "name")
        .populate("depot_id", "facility_name")
        .sort({ delivery_date: -1, created_at: -1 })
        .skip((page - 1) * limit)
        .limit(parseInt(limit));

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

      // Get chalan
      const chalan = await models.DeliveryChalan.findOne({
        _id: id,
        distributor_id: distributorId,
        status: "Delivered",
      })
        .populate("depot_id", "facility_name")
        .populate("created_by", "name")
        .populate("load_sheet_id", "load_sheet_number");

      if (!chalan) {
        return res.status(404).json({
          success: false,
          message: "Chalan not found or not eligible for receiving",
        });
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

      // Get chalan
      const chalanQuery = models.DeliveryChalan.findOne({
        _id: id,
        distributor_id: distributorId,
        status: "Delivered",
        receipt_status: "Pending",
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

        const deliveredQty = parseFloat(chalanItem.qty_delivered);
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
      chalan.receipt_status = "Received";
      chalan.received_at = new Date();
      chalan.received_by = user_id;
      chalan.received_items = processedItems;
      if (notes) {
        chalan.notes = chalan.notes
          ? `${chalan.notes}\n\nReceipt Notes: ${notes}`
          : `Receipt Notes: ${notes}`;
      }
      await chalan.save(getSaveOptions(session, useTransaction));

      await commitTransaction(session, useTransaction);

      res.json({
        success: true,
        message: "Chalan received successfully",
        data: {
          chalan_number: chalan.chalan_number,
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
        receipt_status: "Received",
      };

      if (date_from || date_to) {
        query.received_at = {};
        if (date_from) query.received_at.$gte = new Date(date_from);
        if (date_to) query.received_at.$lte = new Date(date_to);
      }

      // Get total count
      const total = await models.DeliveryChalan.countDocuments(query);

      // Get paginated history
      const chalans = await models.DeliveryChalan.find(query)
        .populate("received_by", "name")
        .populate("depot_id", "facility_name")
        .sort({ received_at: -1 })
        .skip((page - 1) * limit)
        .limit(parseInt(limit));

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

module.exports = router;
