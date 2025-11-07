/**
 * Local Stock Routes
 * Handles viewing current stock levels at depot from depot_stocks collection
 */

const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");
const DepotStock = require("../../models/DepotStock");
const DepotTransactionIn = require("../../models/DepotTransactionIn");
const DepotTransactionOut = require("../../models/DepotTransactionOut");
const { authenticate, requireApiPermission } = require("../../middleware/auth");
const { requireInventoryRole, requireInventoryFactoryRole } = require("../../middleware/roleCheck");

/**
 * @route   GET /api/v1/inventory/local-stock
 * @desc    Get current stock levels with batch details
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
      const {
        page = 1,
        limit = 50,
        search = "",
        status = "",
        location = "",
        sort_by = "product",
        sort_order = "asc",
        show_batches = "false",
      } = req.query;

      if (!facility_store_id) {
        return res.status(400).json({
          success: false,
          message: "Factory store ID (depot ID) not found in user context",
        });
      }

      const skip = (parseInt(page) - 1) * parseInt(limit);

      // Build query
      const query = {
        depot_id: new mongoose.Types.ObjectId(facility_store_id),
      };

      // Note: status and location filters are no longer applicable to aggregated stock
      // They would need to be applied to transaction queries instead

      // If search, find matching products first
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

        if (products.length === 0) {
          return res.status(200).json({
            success: true,
            data: {
              stocks: [],
              pagination: {
                total: 0,
                page: parseInt(page),
                limit: parseInt(limit),
                pages: 0,
              },
            },
          });
        }

        query.product_id = { $in: products.map((p) => p._id) };
      }

      // NEW APPROACH: Always show aggregated stock
      // For batch details, user should query the product detail endpoint

      const sortField = sort_by === "quantity" ? "qty_ctn" : "product_id";
      const sortDir = sort_order === "desc" ? -1 : 1;
      const sortStage = {};
      sortStage[sortField] = sortDir;

      const [stocks, total] = await Promise.all([
        DepotStock.find(query)
          .populate("product_id", "sku erp_id bangla_name english_name ctn_pcs wt_pcs")
          .populate("depot_id", "name type")
          .sort(sortStage)
          .skip(skip)
          .limit(parseInt(limit))
          .lean(),
        DepotStock.countDocuments(query),
      ]);

      res.status(200).json({
        success: true,
        data: {
          stocks,
          pagination: {
            total,
            page: parseInt(page),
            limit: parseInt(limit),
            pages: Math.ceil(total / parseInt(limit)),
          },
        },
      });
    } catch (error) {
      console.error("❌ Error fetching local stock:", error);
      res.status(500).json({
        success: false,
        message: "Failed to fetch local stock",
        error: error.message,
      });
    }
  }
);

/**
 * @route   GET /api/v1/inventory/local-stock/:productId
 * @desc    Get stock and batch details for a specific product
 * @access  Private - Inventory Role
 */
router.get(
  "/:productId",
  authenticate,
  requireInventoryRole,
  requireApiPermission("inventory:view:read"),
  async (req, res) => {
    try {
      const { facility_store_id } = req.userContext;
      const { productId } = req.params;

      if (!facility_store_id) {
        return res.status(400).json({
          success: false,
          message: "Factory store ID (depot ID) not found in user context",
        });
      }

      // Get aggregated stock record
      const stock = await DepotStock.findOne({
        depot_id: facility_store_id,
        product_id: productId,
      })
        .populate("product_id", "sku erp_id bangla_name english_name ctn_pcs wt_pcs")
        .populate("depot_id", "name type");

      if (!stock) {
        return res.status(404).json({
          success: false,
          message: "No stock found for this product at this depot",
        });
      }

      // Get batch details from transactions (incoming only, grouped by batch)
      const batches = await DepotTransactionIn.aggregate([
        {
          $match: {
            depot_id: new mongoose.Types.ObjectId(facility_store_id),
            product_id: new mongoose.Types.ObjectId(productId),
          },
        },
        {
          $group: {
            _id: "$batch_no",
            batch_no: { $first: "$batch_no" },
            production_date: { $first: "$production_date" },
            expiry_date: { $first: "$expiry_date" },
            total_received: { $sum: { $toDouble: "$qty_ctn" } },
            first_received_date: { $min: "$received_date" },
            last_received_date: { $max: "$received_date" },
            transaction_count: { $sum: 1 },
          },
        },
        { $sort: { expiry_date: 1 } }, // FIFO - earliest expiry first
      ]);

      res.status(200).json({
        success: true,
        data: {
          current_stock: stock,
          batches: batches,
          summary: {
            total_qty_ctn: parseFloat(stock.qty_ctn),
            batch_count: batches.length,
            product_info: stock.product_id,
          },
        },
      });
    } catch (error) {
      console.error("❌ Error fetching product stock:", error);
      res.status(500).json({
        success: false,
        message: "Failed to fetch product stock",
        error: error.message,
      });
    }
  }
);

/**
 * @route   GET /api/v1/inventory/local-stock/batch/:batchNo
 * @desc    Get transaction history for a specific batch number
 * @access  Private - Inventory Role
 */
router.get(
  "/batch/:batchNo",
  authenticate,
  requireInventoryRole,
  requireApiPermission("inventory:view:read"),
  async (req, res) => {
    try {
      const { facility_store_id } = req.userContext;
      const { batchNo } = req.params;

      if (!facility_store_id) {
        return res.status(400).json({
          success: false,
          message: "Factory store ID (depot ID) not found in user context",
        });
      }

      // Get all transactions for this batch (both in and out)
      const [transactionsIn, transactionsOut] = await Promise.all([
        DepotTransactionIn.find({
          depot_id: facility_store_id,
          batch_no: batchNo,
        })
          .populate("product_id", "sku erp_id bangla_name english_name ctn_pcs wt_pcs")
          .populate("depot_id", "name type")
          .populate("created_by", "username")
          .sort({ transaction_date: -1 }),

        DepotTransactionOut.find({
          depot_id: facility_store_id,
          batch_no: batchNo,
        })
          .populate("product_id", "sku erp_id bangla_name english_name ctn_pcs wt_pcs")
          .populate("depot_id", "name type")
          .populate("created_by", "username")
          .sort({ transaction_date: -1 }),
      ]);

      res.status(200).json({
        success: true,
        data: {
          batch_no: batchNo,
          transactions_in: transactionsIn,
          transactions_out: transactionsOut,
          summary: {
            total_in: transactionsIn.reduce((sum, tx) => sum + parseFloat(tx.qty_ctn), 0),
            total_out: transactionsOut.reduce((sum, tx) => sum + parseFloat(tx.qty_ctn), 0),
          },
        },
      });
    } catch (error) {
      console.error("❌ Error fetching batch transactions:", error);
      res.status(500).json({
        success: false,
        message: "Failed to fetch batch transactions",
        error: error.message,
      });
    }
  }
);

/**
 * @route   GET /api/v1/inventory/local-stock/dashboard/summary
 * @desc    Get dashboard summary (total stock, low stock, expiring soon, etc.)
 * @access  Private - Inventory Role
 */
router.get(
  "/dashboard/summary",
  authenticate,
  requireInventoryRole,
  requireApiPermission("inventory:view:read"),
  async (req, res) => {
    try {
      const { facility_store_id } = req.userContext;

      if (!facility_store_id) {
        return res.status(400).json({
          success: false,
          message: "Factory store ID (depot ID) not found in user context",
        });
      }

      const [totalStockSummary, lowStock, expiringSoon, statusCounts, recentTransactionsIn] =
        await Promise.all([
          // Total stock summary
          DepotStock.aggregate([
            {
              $match: {
                depot_id: new mongoose.Types.ObjectId(facility_store_id),
                is_deleted: false,
              },
            },
            {
              $group: {
                _id: null,
                total_products: { $addToSet: "$product_id" },
                total_batches: { $sum: 1 },
                total_qty_ctn: { $sum: { $toDouble: "$qty_ctn" } },
              },
            },
            {
              $project: {
                _id: 0,
                total_products: { $size: "$total_products" },
                total_batches: 1,
                total_qty_ctn: 1,
              },
            },
          ]),

          // Low stock items
          DepotStock.getLowStock(facility_store_id, 20),

          // Expiring soon items
          DepotStock.getExpiringSoon(facility_store_id, 30),

          // Status counts
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

          // Recent incoming transactions (last 10)
          DepotTransactionIn.find({
            depot_id: facility_store_id,
            is_deleted: false,
          })
            .populate("product_id", "sku bangla_name english_name")
            .sort({ transaction_date: -1 })
            .limit(10)
            .lean(),
        ]);

      res.status(200).json({
        success: true,
        data: {
          total_stock: totalStockSummary.length > 0 ? totalStockSummary[0] : null,
          low_stock_items: lowStock,
          expiring_soon_items: expiringSoon,
          status_breakdown: statusCounts,
          recent_transactions: recentTransactionsIn,
        },
      });
    } catch (error) {
      console.error("❌ Error fetching dashboard summary:", error);
      res.status(500).json({
        success: false,
        message: "Failed to fetch dashboard summary",
        error: error.message,
      });
    }
  }
);

module.exports = router;
