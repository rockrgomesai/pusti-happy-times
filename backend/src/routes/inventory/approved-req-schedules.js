/**
 * Approved Requisition Schedules Routes
 * For Inventory Depot and Inventory Factory roles to view scheduled requisitions
 * and create load sheets for delivery
 */

const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");
const models = require("../../models");
const { authenticate } = require("../../middleware/auth");
const { checkPermission } = require("../../middleware/checkPermission");

/**
 * GET /api/v1/inventory/approved-req-schedules
 * Fetch all approved/scheduled requisitions for the user's facility (source depot)
 * Groups by requesting depot (target depot that needs goods)
 * Similar to depot-deliveries but for inter-depot requisitions
 */
router.get("/", authenticate, checkPermission("approved-req-schedules:read"), async (req, res) => {
  try {
    const { facility_id } = req.user;
    const { filter = "all", page = 1, limit = 100 } = req.query;

    if (!facility_id) {
      return res.status(400).json({
        success: false,
        message: "User facility not found",
      });
    }

    console.log("\n=== APPROVED REQUISITION SCHEDULES ===");
    console.log("User Facility ID:", facility_id);
    console.log("Filter:", filter);

    // Find all requisition schedulings where this facility is the source
    // Query scheduling_details array for source_depot_id matching user's facility
    const schedulings = await models.RequisitionScheduling.find({
      "scheduling_details.source_depot_id": facility_id,
      status: { $in: ["pending", "in-progress"] }, // Not completed
    })
      .populate({
        path: "requisition_id",
        select: "requisition_no requisition_date from_depot_id",
        populate: {
          path: "from_depot_id",
          select: "name code type",
        },
      })
      .lean();

    console.log(`Found ${schedulings.length} requisition schedulings`);

    if (schedulings.length === 0) {
      return res.json({
        success: true,
        data: [],
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: 0,
          totalPages: 0,
        },
      });
    }

    // Get all unique SKUs to fetch stock from source depot
    const allSkus = [];
    schedulings.forEach((sched) => {
      sched.scheduling_details?.forEach((detail) => {
        if (detail.sku && !allSkus.includes(detail.sku)) {
          allSkus.push(detail.sku);
        }
      });
    });

    console.log(`Unique SKUs: ${allSkus.length}`);

    // Get products to map SKU to product_id
    const products = await models.Product.find({
      sku: { $in: allSkus },
    })
      .select("_id sku erp_id name dp_price")
      .lean();

    const skuToProduct = {};
    products.forEach((product) => {
      skuToProduct[product.sku] = product;
    });

    // Get stock from source depot (user's facility)
    const productIds = products.map((p) => p._id);
    const stockRecords = await models.FactoryStoreInventory.find({
      facility_id: facility_id,
      product_id: { $in: productIds },
    })
      .select("product_id qty_ctn blocked_qty")
      .lean();

    console.log(`Stock records found: ${stockRecords.length}`);

    // Map stock by product_id
    const stockByProductId = {};
    stockRecords.forEach((stock) => {
      const productId = stock.product_id.toString();
      const totalQty = stock.qty_ctn ? parseFloat(stock.qty_ctn.toString()) : 0;
      const blockedQty = stock.blocked_qty ? parseFloat(stock.blocked_qty.toString()) : 0;
      const availableQty = totalQty - blockedQty;
      stockByProductId[productId] = {
        total_qty: totalQty,
        blocked_qty: blockedQty,
        available_qty: availableQty,
      };
    });

    // Map stock by SKU
    const stockMap = {};
    Object.keys(skuToProduct).forEach((sku) => {
      const product = skuToProduct[sku];
      if (stockByProductId[product._id.toString()]) {
        stockMap[sku] = stockByProductId[product._id.toString()];
      } else {
        stockMap[sku] = {
          total_qty: 0,
          blocked_qty: 0,
          available_qty: 0,
        };
      }
    });

    // Group by requesting depot (target_depot_id)
    const requestingDepotMap = {};

    for (const scheduling of schedulings) {
      console.log(`\nProcessing requisition: ${scheduling.requisition_no}`);
      console.log(`  Scheduling details: ${scheduling.scheduling_details?.length || 0}`);

      if (scheduling.scheduling_details && scheduling.scheduling_details.length > 0) {
        for (const detail of scheduling.scheduling_details) {
          // Only include items where source matches user's facility
          if (detail.source_depot_id.toString() !== facility_id.toString()) {
            console.log(`  ⊘ Skipped: source depot mismatch`);
            continue;
          }

          const targetDepotId = detail.target_depot_id.toString();

          // Initialize depot group
          if (!requestingDepotMap[targetDepotId]) {
            // Fetch requesting depot info
            const requestingDepot = await models.Facility.findById(targetDepotId)
              .select("name code type")
              .lean();

            if (!requestingDepot) continue;

            requestingDepotMap[targetDepotId] = {
              requesting_depot_id: targetDepotId,
              requesting_depot_name: requestingDepot.name,
              requesting_depot_code: requestingDepot.code,
              items: [],
            };
          }

          const product = skuToProduct[detail.sku];
          const stockInfo = stockMap[detail.sku] || {
            total_qty: 0,
            blocked_qty: 0,
            available_qty: 0,
          };

          // Calculate delivered qty (from load sheets/chalans - TODO)
          const deliveredQty = 0;
          const scheduledQty = detail.delivery_qty ? parseFloat(detail.delivery_qty.toString()) : 0;
          const remainingQty = scheduledQty - deliveredQty;

          if (remainingQty <= 0) {
            console.log(`  ⊘ Skipped: fully delivered`);
            continue;
          }

          const isPartial = deliveredQty > 0;

          // Apply filter
          if (filter === "new" && isPartial) continue;
          if (filter === "partial" && !isPartial) continue;

          console.log(
            `  ✓ Adding: ${detail.sku} to ${requestingDepotMap[targetDepotId].requesting_depot_name}`
          );

          requestingDepotMap[targetDepotId].items.push({
            requisition_scheduling_id: scheduling._id,
            requisition_detail_id: detail.requisition_detail_id,
            requisition_id: scheduling.requisition_id._id,
            requisition_no: scheduling.requisition_no,
            requisition_date: scheduling.requisition_id.requisition_date,
            sku: detail.sku,
            erp_id: product?.erp_id || null,
            product_name: product?.name || detail.sku,
            dp_price: product?.dp_price ? parseFloat(product.dp_price.toString()) : 0,
            order_qty: detail.order_qty ? parseFloat(detail.order_qty.toString()) : 0,
            scheduled_qty: scheduledQty,
            delivered_qty: deliveredQty,
            remaining_qty: remainingQty,
            stock_qty: stockInfo.available_qty,
            total_stock_qty: stockInfo.total_qty,
            blocked_qty: stockInfo.blocked_qty,
            is_partial: isPartial,
          });
        }
      }
    }

    // Convert to array and sort by requesting depot name
    const requestingDepots = Object.values(requestingDepotMap).sort((a, b) =>
      a.requesting_depot_name.localeCompare(b.requesting_depot_name)
    );

    const totalItems = requestingDepots.reduce((sum, d) => sum + d.items.length, 0);

    console.log(
      `✅ Returning ${requestingDepots.length} requesting depots with ${totalItems} total items`
    );
    requestingDepots.forEach((d) => {
      console.log(`  - ${d.requesting_depot_name}: ${d.items.length} items`);
    });

    res.json({
      success: true,
      data: requestingDepots,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: totalItems,
        totalPages: Math.ceil(totalItems / limit),
      },
    });
  } catch (error) {
    console.error("❌ Error fetching approved requisition schedules:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch approved requisition schedules",
      error: error.message,
    });
  }
});

module.exports = router;
