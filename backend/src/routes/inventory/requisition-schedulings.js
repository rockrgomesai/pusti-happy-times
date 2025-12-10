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
const InventoryBalance = require("../../models/InventoryBalance");

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

      // Group requisitions by source depot (first depot in product's depot_ids)
      const depotGroups = {};

      for (const req of requisitions) {
        for (const detail of req.details) {
          // Skip if fully scheduled
          const unscheduledQty = parseFloat(detail.unscheduled_qty?.toString() || detail.qty.toString());
          if (unscheduledQty <= 0) continue;

          const product = detail.product_id;
          if (!product) continue;

          // Get source depot (first depot_ids or facility_ids)
          const sourceDepots = product.facility_ids?.length > 0 
            ? product.facility_ids 
            : product.depot_ids || [];
          
          if (sourceDepots.length === 0) continue;

          const sourceDepotId = sourceDepots[0].toString();

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

          // Get stock quantities for all source depots
          const stockQuantities = [];
          for (const depotId of sourceDepots) {
            const balance = await InventoryBalance.findOne({
              facility_id: depotId,
              product_id: product._id,
            }).lean();

            const depot = await Facility.findById(depotId).select("name code").lean();
            stockQuantities.push({
              depot_id: depotId.toString(),
              depot_name: depot?.name || "Unknown",
              depot_code: depot?.code,
              qty: balance ? parseFloat(balance.qty.toString()) : 0,
            });
          }

          // Add to group
          const existingReq = depotGroups[sourceDepotId].requisitions.find(
            (r) => r.requisition_id === req._id.toString()
          );

          const orderQty = parseFloat(detail.qty.toString());
          const scheduledQty = parseFloat(detail.scheduled_qty?.toString() || "0");

          const reqItem = {
            requisition_detail_id: detail._id.toString(),
            sku: product.sku,
            erp_id: product.erp_id,
            product_id: product._id.toString(),
            order_qty: orderQty,
            scheduled_qty: scheduledQty,
            unscheduled_qty: unscheduledQty,
            stock_quantities: stockQuantities,
            requisition_date: req.requisition_date,
          };

          if (existingReq) {
            existingReq.items.push(reqItem);
          } else {
            depotGroups[sourceDepotId].requisitions.push({
              requisition_id: req._id.toString(),
              requisition_no: req.requisition_no,
              requisition_date: req.requisition_date,
              from_depot: {
                id: req.from_depot_id._id.toString(),
                name: req.from_depot_id.name,
                code: req.from_depot_id.code,
              },
              items: [reqItem],
            });
          }
        }
      }

      // Convert to array
      const result = Object.values(depotGroups);

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
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      const { deliveries } = req.body;
      const userId = req.user._id;
      const userName = req.user.username || req.user.full_name || "Unknown User";

      if (!deliveries || !Array.isArray(deliveries) || deliveries.length === 0) {
        throw new Error("Deliveries array is required");
      }

      // Validate all deliveries first
      for (const delivery of deliveries) {
        const { requisition_id, requisition_detail_id, delivery_qty, source_depot_id, target_depot_id } = delivery;

        if (!requisition_id || !requisition_detail_id || !delivery_qty || !source_depot_id || !target_depot_id) {
          throw new Error("Missing required fields in delivery");
        }

        // Get requisition and detail
        const requisition = await InventoryRequisition.findById(requisition_id).session(session);
        if (!requisition) {
          throw new Error(`Requisition ${requisition_id} not found`);
        }

        const detail = requisition.details.id(requisition_detail_id);
        if (!detail) {
          throw new Error(`Requisition detail ${requisition_detail_id} not found`);
        }

        const unscheduledQty = parseFloat(detail.unscheduled_qty?.toString() || detail.qty.toString());
        if (delivery_qty > unscheduledQty) {
          throw new Error(`Delivery qty ${delivery_qty} exceeds unscheduled qty ${unscheduledQty}`);
        }

        // Check stock availability
        const balance = await InventoryBalance.findOne({
          facility_id: source_depot_id,
          product_id: detail.product_id,
        }).session(session);

        const stockQty = balance ? parseFloat(balance.qty.toString()) : 0;
        if (delivery_qty > stockQty) {
          const product = await Product.findById(detail.product_id).select("sku").session(session);
          const depot = await Facility.findById(source_depot_id).select("name").session(session);
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
        const requisition = await InventoryRequisition.findById(requisitionId).session(session);
        const product = await Product.findById(requisition.details[0].product_id).select("sku erp_id").session(session);

        // Create or update scheduling record
        let scheduling = await RequisitionScheduling.findOne({ requisition_id: requisitionId }).session(session);

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
            (parseFloat(detail.qty.toString()) - (currentScheduled + delivery.delivery_qty)).toString()
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
        requisition.scheduling_status = allFullyScheduled ? "fully-scheduled" : "partially-scheduled";
        requisition.scheduled_by = userId;
        requisition.scheduled_at = new Date();
        requisition.updated_by = userId;

        scheduling.status = allFullyScheduled ? "completed" : "in-progress";
        scheduling.updated_by = userId;

        await requisition.save({ session });
        await scheduling.save({ session });

        schedulingRecords.push(scheduling);
      }

      await session.commitTransaction();

      res.json({
        success: true,
        message: `Successfully scheduled ${deliveries.length} item(s)`,
        data: schedulingRecords,
      });
    } catch (error) {
      await session.abortTransaction();
      console.error("Error scheduling requisitions:", error);
      res.status(400).json({
        success: false,
        message: error.message || "Failed to schedule requisitions",
      });
    } finally {
      session.endSession();
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
