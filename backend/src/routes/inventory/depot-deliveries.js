/**
 * Depot Deliveries Routes
 * Inventory Depot module for managing deliveries from finance-approved schedulings
 */

const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");
const { authenticate, requireApiPermission } = require("../../middleware/auth");

// Models
const Scheduling = require("../../models/Scheduling");
const User = require("../../models/User");
const DepotStock = require("../../models/DepotStock");

/**
 * GET /inventory/depot-deliveries
 * Get finance-approved schedulings for the depot user
 * Groups by distributor, shows new and partial deliveries
 */
router.get("/", authenticate, requireApiPermission("depot-deliveries:read"), async (req, res) => {
  try {
    const userId = req.user.id;
    const { filter, page = 1, limit = 50 } = req.query;

    // Get user's depot
    const user = await User.findById(userId)
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
        message: "User is not assigned to any depot",
      });
    }

    const depotId = user.employee_id.facility_id._id;
    console.log(`📦 Fetching deliveries for depot: ${user.employee_id.facility_id.name}`);

    // Build query for finance-approved schedulings
    const query = {
      depot_id: depotId,
      current_status: "Approved", // Finance approved
    };

    console.log(`🔍 Query:`, JSON.stringify(query));

    // Fetch schedulings
    const schedulings = await Scheduling.find(query)
      .populate("distributor_id", "name erp_id")
      .populate("order_id", "order_number created_at")
      .lean();

    console.log(`📋 Found ${schedulings.length} approved schedulings`);

    schedulings.forEach((s, idx) => {
      console.log(
        `  [${idx}] ${s.distributor_id?.name}: ${s.scheduling_details?.length || 0} details`
      );
    });

    // Get all unique product IDs (item_id is the product_id)
    const allItemIds = [
      ...new Set(
        schedulings.flatMap((s) =>
          (s.scheduling_details || []).map((detail) => detail.item_id.toString())
        )
      ),
    ];

    // Get depot stock for these products - simple indexed query
    const stockRecords = await DepotStock.find({
      depot_id: depotId,
      product_id: { $in: allItemIds },
    }).lean();

    console.log(`📦 Found ${stockRecords.length} stock records for ${allItemIds.length} products`);

    // Map stock by product_id (simple!)
    const stockMap = {};
    stockRecords.forEach((stock) => {
      const productId = stock.product_id.toString();
      const totalQty = stock.qty_ctn ? parseFloat(stock.qty_ctn.toString()) : 0;
      const blockedQty = stock.blocked_qty ? parseFloat(stock.blocked_qty.toString()) : 0;
      const availableQty = totalQty - blockedQty;

      stockMap[productId] = {
        total_qty: totalQty,
        blocked_qty: blockedQty,
        available_qty: availableQty,
      };
      console.log(`  Product ${productId}: ${totalQty} CTN (available: ${availableQty})`);
    });

    // Process schedulings and group by distributor
    // For depot deliveries, we show approved scheduling_details
    const distributorMap = {};

    for (const scheduling of schedulings) {
      const distributorId = scheduling.distributor_id._id.toString();

      if (!distributorMap[distributorId]) {
        distributorMap[distributorId] = {
          distributor_id: distributorId,
          distributor_name: scheduling.distributor_id.name,
          distributor_erp_id: scheduling.distributor_id.erp_id,
          items: [],
        };
      }

      console.log(`\nProcessing ${scheduling.distributor_id.name} - scheduling ${scheduling._id}`);
      console.log(`  Has ${scheduling.scheduling_details?.length || 0} scheduling_details`);

      // Process each scheduling_detail (these are the actual scheduled deliveries)
      // If the scheduling is Finance-approved, all details are ready for depot delivery
      if (scheduling.scheduling_details && scheduling.scheduling_details.length > 0) {
        for (const detail of scheduling.scheduling_details) {
          console.log(`  Detail: ${detail.sku}, item_id: ${detail.item_id}`);

          // Look up stock by product_id (item_id)
          const productIdKey = detail.item_id.toString();
          const stockInfo = stockMap[productIdKey] || {
            total_qty: 0,
            blocked_qty: 0,
            available_qty: 0,
          };

          // For now, assume all approved details need to be delivered
          // TODO: Track actual deliveries via load sheets/chalans
          const deliveredQty = 0; // This would come from load sheet records
          const remainingQty = detail.delivery_qty - deliveredQty;

          if (remainingQty <= 0) {
            console.log(`  ⊘ Skipped detail - fully delivered`);
            continue;
          }

          const isPartial = deliveredQty > 0;

          // Apply filter
          if (filter === "new" && isPartial) continue;
          if (filter === "partial" && !isPartial) continue;

          console.log(`  ✓ Adding item: ${detail.sku}`);

          distributorMap[distributorId].items.push({
            scheduling_id: scheduling._id,
            scheduling_detail_id: detail._id,
            order_id: scheduling.order_id._id,
            order_number: scheduling.order_number,
            order_date: scheduling.order_id.created_at,
            item_id: detail.item_id,
            sku: detail.sku,
            product_name: detail.product_name,
            dp_price: detail.dp_price,
            scheduled_qty: detail.delivery_qty,
            delivered_qty: deliveredQty,
            remaining_qty: remainingQty,
            stock_qty: stockInfo.available_qty,
            total_stock_qty: stockInfo.total_qty,
            blocked_qty: stockInfo.blocked_qty,
            current_status: scheduling.current_status,
            is_partial: isPartial,
          });
        }
      }
    }

    // Convert to array and sort by distributor name
    const distributors = Object.values(distributorMap).sort((a, b) =>
      a.distributor_name.localeCompare(b.distributor_name)
    );

    const totalItems = distributors.reduce((sum, d) => sum + d.items.length, 0);

    console.log(`✅ Returning ${distributors.length} distributors with ${totalItems} total items`);
    distributors.forEach((d) => {
      console.log(`  - ${d.distributor_name}: ${d.items.length} items`);
    });

    res.json({
      success: true,
      data: distributors,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: totalItems,
        totalPages: Math.ceil(totalItems / limit),
      },
    });
  } catch (error) {
    console.error("❌ Error fetching depot deliveries:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch depot deliveries",
      error: error.message,
    });
  }
});

module.exports = router;
