/**
 * Requisition Scheduling Routes
 * Distribution role schedules requisitions for delivery
 */

const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");
const { authenticate, requireApiPermission } = require("../../middleware/auth");
const InventoryRequisition = require("../../models/InventoryRequisition");
const RequisitionScheduling = require("../../models/RequisitionScheduling");
const Product = require("../../models/Product");
const Facility = require("../../models/Facility");
const DepotStock = require("../../models/DepotStock");

// Defensive coercion helpers (prevents leaking Mongoose/Mongo types to the frontend)
const toText = (value, fallback = "") => {
  if (value === null || value === undefined) return fallback;
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean" || typeof value === "bigint") {
    return String(value);
  }

  if (typeof value === "object") {
    // Support EJSON Decimal128 from some serializers
    if (value.$numberDecimal !== undefined && value.$numberDecimal !== null) {
      return String(value.$numberDecimal);
    }
    if (value._bsontype === "Decimal128" && typeof value.toString === "function") {
      return value.toString();
    }
    if (value._id && (typeof value._id === "string" || typeof value._id?.toString === "function")) {
      return value._id.toString();
    }
    if (typeof value.toString === "function" && value.toString !== Object.prototype.toString) {
      return value.toString();
    }
    try {
      return JSON.stringify(value);
    } catch {
      return fallback;
    }
  }

  return fallback;
};

const toId = (value, fallback = "") => {
  const v = toText(value, fallback);
  return v === "[object Object]" ? fallback : v;
};

const toNumber = (value, fallback = 0) => {
  if (value === "") return fallback;
  const n = Number(toText(value, ""));
  return Number.isFinite(n) ? n : fallback;
};

/**
 * GET /api/inventory/requisition-schedulings
 * Get all requisitions that need scheduling (new & partially scheduled)
 * Groups by source depot (products.depot_ids[0])
 */
router.get(
  "/",
  authenticate,
  requireApiPermission("requisition-scheduling:read"),
  async (req, res) => {
    try {
      // Find requisitions that are submitted and not fully scheduled
      const requisitions = await InventoryRequisition.find({
        status: "submitted",
        scheduling_status: { $in: ["not-scheduled", "partially-scheduled"] },
      })
        .populate("from_depot_id", "name code")
        .populate({
          path: "details.product_id",
          select: "sku erp_id depot_ids facility_ids",
        })
        .populate("created_by", "username full_name")
        .sort({ requisition_date: -1 })
        .lean();

      console.log(
        `\n[${new Date().toISOString()}] 📋 Found ${requisitions.length} requisitions to schedule`
      );

      // Group requisitions by source depot (first depot in product's depot_ids)
      const depotGroups = {};

      for (const req of requisitions) {
        console.log(
          `  Processing requisition: ${req.requisition_no}, details: ${req.details?.length}`
        );

        for (const detail of req.details || []) {
          // Skip if fully scheduled
          const unscheduledQty = toNumber(detail?.unscheduled_qty, toNumber(detail?.qty, 0));
          console.log(`    Detail unscheduled_qty: ${unscheduledQty}`);
          if (unscheduledQty <= 0) {
            console.log(`    ⏭️  Skipping - fully scheduled`);
            continue;
          }

          const product = detail.product_id;
          if (!product) {
            console.log(`    ❌ No product populated`);
            continue;
          }

          console.log(
            `    Product: ${product.sku}, facility_ids: ${product.facility_ids?.length}, depot_ids: ${product.depot_ids?.length}`
          );

          // Get source depot (first depot_ids or facility_ids)
          const sourceDepots =
            product.facility_ids?.length > 0 ? product.facility_ids : product.depot_ids || [];

          if (sourceDepots.length === 0) {
            console.log(`    ❌ Product has no depot/facility assignments`);
            continue;
          }

          const sourceDepotId = toId(sourceDepots[0], "");
          if (!sourceDepotId) {
            console.log(`    ❌ Invalid source depot id`);
            continue;
          }

          if (!depotGroups[sourceDepotId]) {
            // Load depot info
            const depot = await Facility.findById(sourceDepotId).select("name code type").lean();
            depotGroups[sourceDepotId] = {
              depot_id: sourceDepotId,
              depot_name: depot?.name || "Unknown Depot",
              depot_code: depot?.code,
              requisitions: [],
            };
          }

          // Get stock quantities for all source depots using SKU-based lookup
          const stockQuantities = [];
          
          // Query product by SKU to get correct product_id
          const productBySku = await Product.findOne({ sku: product.sku }).select('_id').lean();
          
          if (productBySku) {
            for (const depotId of sourceDepots) {
              // Get depot stock using correct product_id
              const depotStock = await DepotStock.findOne({
                depot_id: depotId,
                product_id: productBySku._id,
              }).lean();

              const totalQty = depotStock ? toNumber(depotStock?.qty_ctn, 0) : 0;

              const depot = await Facility.findById(depotId).select("name code").lean();
              stockQuantities.push({
                depot_id: toId(depotId, ""),
                depot_name: toText(depot?.name, "Unknown"),
                depot_code: toText(depot?.code, ""),
                qty: totalQty,
              });
            }
          }

          // Add to group
          const existingReq = depotGroups[sourceDepotId].requisitions.find(
            (r) => r.requisition_id === req._id.toString()
          );

          const orderQty = toNumber(detail?.qty, 0);
          const scheduledQty = toNumber(detail?.scheduled_qty, 0);

          const reqItem = {
            requisition_detail_id: toId(detail?._id, ""),
            sku: toText(product?.sku, ""),
            erp_id: toText(product?.erp_id, ""),
            product_id: toId(product?._id, ""),
            order_qty: orderQty,
            scheduled_qty: scheduledQty,
            unscheduled_qty: unscheduledQty,
            stock_quantities: stockQuantities,
            requisition_date: req.requisition_date,
          };

          if (existingReq) {
            existingReq.items.push(reqItem);
          } else {
            const fromDepotId = req?.from_depot_id;
            const fromDepotObj =
              fromDepotId && typeof fromDepotId === "object" ? fromDepotId : null;

            depotGroups[sourceDepotId].requisitions.push({
              requisition_id: toId(req?._id, ""),
              requisition_no: toText(req?.requisition_no, ""),
              requisition_date: req.requisition_date,
              from_depot: {
                id: toId(fromDepotObj?._id, ""),
                name: toText(fromDepotObj?.name, ""),
                code: toText(fromDepotObj?.code, ""),
              },
              items: [reqItem],
            });
          }
        }
      }

      // Convert to array
      const result = Object.values(depotGroups);

      console.log(`\n[${new Date().toISOString()}] 📤 Returning ${result.length} depot groups:`);
      result.forEach((group) => {
        console.log(`  - ${group.depot_name}: ${group.requisitions.length} requisitions`);
        group.requisitions.forEach((req) => {
          console.log(`    • ${req.requisition_no}: ${req.items.length} items`);
        });
      });
      console.log(
        `[${new Date().toISOString()}] 📤 About to send JSON response with ${result.length} groups\n`
      );

      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      console.error("Error fetching requisition schedulings:", error);
      res.status(500).json({
        success: false,
        message: "Failed to fetch requisition schedulings",
        error: error.message,
      });
    }
  }
);

/**
 * POST /api/inventory/requisition-schedulings/schedule
 * Schedule requisitions with delivery quantities
 */
router.post(
  "/schedule",
  authenticate,
  requireApiPermission("requisition-scheduling:write"),
  async (req, res) => {
    try {
      const { deliveries } = req.body;
      const userId = req.user._id;
      const userName = req.user.username || req.user.full_name || "Unknown User";

      if (!deliveries || !Array.isArray(deliveries) || deliveries.length === 0) {
        throw new Error("Deliveries array is required");
      }

      // Validate all deliveries first
      for (const delivery of deliveries) {
        const {
          requisition_id,
          requisition_detail_id,
          delivery_qty,
          source_depot_id,
          target_depot_id,
        } = delivery;

        if (
          !requisition_id ||
          !requisition_detail_id ||
          !delivery_qty ||
          !source_depot_id ||
          !target_depot_id
        ) {
          throw new Error("Missing required fields in delivery");
        }

        // Get requisition and detail
        const requisition = await InventoryRequisition.findById(requisition_id);
        if (!requisition) {
          throw new Error(`Requisition ${requisition_id} not found`);
        }

        const detail = requisition.details.id(requisition_detail_id);
        if (!detail) {
          throw new Error(`Requisition detail ${requisition_detail_id} not found`);
        }

        const unscheduledQty = parseFloat(
          detail.unscheduled_qty?.toString() || detail.qty.toString()
        );
        if (delivery_qty > unscheduledQty) {
          throw new Error(`Delivery qty ${delivery_qty} exceeds unscheduled qty ${unscheduledQty}`);
        }

        // Check stock availability using DepotStock with SKU-based lookup
        const product = await Product.findById(detail.product_id).select("sku");
        const productBySku = await Product.findOne({ sku: product.sku }).select('_id').lean();
        
        let stockQty = 0;
        if (productBySku) {
          const depotStock = await DepotStock.findOne({
            depot_id: source_depot_id,
            product_id: productBySku._id,
          }).lean();
          stockQty = depotStock ? parseFloat(depotStock.qty_ctn?.toString() || "0") : 0;
        }
        
        if (delivery_qty > stockQty) {
          const depot = await Facility.findById(source_depot_id).select("name");
          throw new Error(
            `Insufficient stock for ${product.sku} at ${depot.name}. Available: ${stockQty}, Requested: ${delivery_qty}`
          );
        }
      }

      // Group deliveries by requisition
      const requisitionMap = {};
      for (const delivery of deliveries) {
        if (!requisitionMap[delivery.requisition_id]) {
          requisitionMap[delivery.requisition_id] = [];
        }
        requisitionMap[delivery.requisition_id].push(delivery);
      }

      // Process each requisition
      const schedulingRecords = [];

      for (const [requisitionId, reqDeliveries] of Object.entries(requisitionMap)) {
        const requisition = await InventoryRequisition.findById(requisitionId);
        const product = await Product.findById(requisition.details[0].product_id)
          .select("sku erp_id")
          ;

        // Create or update scheduling record
        let scheduling = await RequisitionScheduling.findOne({
          requisition_id: requisitionId,
        });

        if (!scheduling) {
          scheduling = new RequisitionScheduling({
            requisition_id: requisitionId,
            requisition_no: requisition.requisition_no,
            status: "in-progress",
            created_by: userId,
            scheduling_details: [],
          });
        }

        // Update requisition details and add to scheduling
        for (const delivery of reqDeliveries) {
          const detail = requisition.details.id(delivery.requisition_detail_id);

          // Update scheduled/unscheduled quantities
          const currentScheduled = parseFloat(detail.scheduled_qty?.toString() || "0");
          detail.scheduled_qty = mongoose.Types.Decimal128.fromString(
            (currentScheduled + delivery.delivery_qty).toString()
          );
          detail.unscheduled_qty = mongoose.Types.Decimal128.fromString(
            (
              parseFloat(detail.qty.toString()) -
              (currentScheduled + delivery.delivery_qty)
            ).toString()
          );

          // Add to scheduling details
          scheduling.scheduling_details.push({
            requisition_detail_id: delivery.requisition_detail_id,
            sku: product.sku,
            erp_id: product.erp_id,
            product_id: detail.product_id,
            order_qty: detail.qty,
            delivery_qty: mongoose.Types.Decimal128.fromString(delivery.delivery_qty.toString()),
            source_depot_id: delivery.source_depot_id,
            target_depot_id: delivery.target_depot_id,
            scheduled_at: new Date(),
            scheduled_by: userId,
            scheduled_by_name: userName,
          });
        }

        // Update requisition scheduling status
        const allFullyScheduled = requisition.details.every(
          (d) => parseFloat(d.unscheduled_qty?.toString() || "0") === 0
        );
        requisition.scheduling_status = allFullyScheduled
          ? "fully-scheduled"
          : "partially-scheduled";
        requisition.scheduled_by = userId;
        requisition.scheduled_at = new Date();
        requisition.updated_by = userId;

        scheduling.status = allFullyScheduled ? "completed" : "in-progress";
        scheduling.updated_by = userId;

        await requisition.save();
        await scheduling.save();

        schedulingRecords.push(scheduling);
      }

      res.json({
        success: true,
        message: `Successfully scheduled ${deliveries.length} item(s)`,
        data: schedulingRecords,
      });
    } catch (error) {
      console.error("Error scheduling requisitions:", error);
      res.status(400).json({
        success: false,
        message: error.message || "Failed to schedule requisitions",
      });
    }
  }
);

/**
 * GET /api/inventory/requisition-schedulings/depots
 * Get all active depots for dropdown
 */
router.get(
  "/depots",
  authenticate,
  requireApiPermission("requisition-scheduling:read"),
  async (req, res) => {
    try {
      const depots = await Facility.find({
        type: "Depot",
        active: true,
      })
        .select("name code")
        .sort({ name: 1 })
        .lean();

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

/**
 * GET /api/inventory/requisition-schedulings/scheduled-list
 * Get all scheduling transactions (history)
 */
router.get(
  "/scheduled-list",
  authenticate,
  requireApiPermission("requisition-scheduling:view-history"),
  async (req, res) => {
    try {
      const { from_date, to_date, source_depot, target_depot, status } = req.query;

      const filter = {};

      if (from_date) {
        filter.created_at = { $gte: new Date(from_date) };
      }
      if (to_date) {
        filter.created_at = { ...filter.created_at, $lte: new Date(to_date) };
      }
      if (status) {
        filter.status = status;
      }

      // Depot filters require checking nested scheduling_details
      if (source_depot || target_depot) {
        const depotFilter = {};
        if (source_depot) {
          depotFilter["scheduling_details.source_depot_id"] = mongoose.Types.ObjectId(source_depot);
        }
        if (target_depot) {
          depotFilter["scheduling_details.target_depot_id"] = mongoose.Types.ObjectId(target_depot);
        }
        Object.assign(filter, depotFilter);
      }

      const schedulings = await RequisitionScheduling.find(filter)
        .populate("requisition_id", "requisition_no requisition_date from_depot_id")
        .populate("scheduling_details.source_depot_id", "name code")
        .populate("scheduling_details.target_depot_id", "name code")
        .populate("created_by", "username full_name")
        .sort({ created_at: -1 })
        .lean();

      res.json({
        success: true,
        data: schedulings,
      });
    } catch (error) {
      console.error("Error fetching scheduled list:", error);
      res.status(500).json({
        success: false,
        message: "Failed to fetch scheduled list",
        error: error.message,
      });
    }
  }
);

module.exports = router;
