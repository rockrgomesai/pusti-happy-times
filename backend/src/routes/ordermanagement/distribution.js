const express = require("express");
const router = express.Router();
const DemandOrder = require("../../models/DemandOrder");
const Facility = require("../../models/Facility");
const Offer = require("../../models/Offer");
const Product = require("../../models/Product");
const Distributor = require("../../models/Distributor");
const { authenticate, requireApiPermission } = require("../../middleware/auth");

/**
 * ============================================================================
 * COMPREHENSIVE DISTRIBUTION SCHEDULING SYSTEM
 * ============================================================================
 *
 * Features:
 * - Progressive bundle-based scheduling for BOGO, BUNDLE_OFFER
 * - Progressive quantity-based scheduling for simple discounts
 * - Multi-iteration scheduling (partial deliveries)
 * - Offer integrity validation (bundle completeness)
 * - Threshold-based offer support (free gifts)
 * - Pricing snapshots per schedule
 * - Mobile-first API responses
 *
 * Supported Offer Types:
 * 1. BOGO (Buy One Get One) - Bundle-based
 * 2. BUNDLE_OFFER (Multi-product bundles) - Bundle-based
 * 3. FLAT_DISCOUNT_PCT/AMT - Quantity-based
 * 4. DISCOUNT_SLAB_PCT/AMT - Quantity-based with locked pricing
 * 5. FREE_PRODUCT (Threshold-based) - Auto-include free items
 * 6. VOLUME_DISCOUNT - Quantity-based with locked pricing
 * ============================================================================
 */

/**
 * GET /ordermanagement/distribution/pending
 * Fetch orders assigned to Distribution role for scheduling
 */
router.get(
  "/pending",
  authenticate,
  requireApiPermission("demandorder:schedule"),
  async (req, res) => {
    try {
      const userId = req.user.id;
      console.log("📦 Distribution: Fetching pending orders for user:", userId);

      const orders = await DemandOrder.find({
        current_approver_id: userId,
        status: { $in: ["forwarded_to_distribution", "scheduling_in_progress"] },
      })
        .populate({
          path: "distributor_id",
          select: "name code erp_id contact_person contact_mobile delivery_depot_id",
          populate: {
            path: "delivery_depot_id",
            select: "name location contact_person contact_mobile",
          },
        })
        .sort({ submitted_at: 1 })
        .lean();

      console.log("📦 Found orders:", orders.length);

      // Enrich items with offer type information
      const enrichedOrders = await Promise.all(
        orders.map(async (order) => {
          const enrichedItems = await Promise.all(
            order.items.map(async (item) => {
              let offerTypeInfo = null;

              // If item is from offer, fetch offer details
              if (item.source === "offer" && item.source_id) {
                const offer = await Offer.findById(item.source_id)
                  .select("offer_type name config")
                  .lean();

                if (offer) {
                  offerTypeInfo = {
                    offer_type: offer.offer_type,
                    offer_name: offer.name,
                    is_bundle_type: ["BOGO", "BUNDLE_OFFER", "BOGO_DIFFERENT_SKU"].includes(
                      offer.offer_type
                    ),
                    config: offer.config,
                  };
                }
              }

              return {
                ...item,
                offerTypeInfo,
              };
            })
          );

          return {
            ...order,
            items: enrichedItems,
          };
        })
      );

      res.json({
        success: true,
        data: enrichedOrders,
      });
    } catch (error) {
      console.error("❌ Distribution pending orders error:", error);
      res.status(500).json({
        success: false,
        message: "Failed to fetch pending orders",
        error: error.message,
      });
    }
  }
);

/**
 * GET /ordermanagement/distribution/:id
 * Get detailed order information for scheduling
 */
router.get("/:id", authenticate, requireApiPermission("demandorder:schedule"), async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    console.log("📦 Distribution: Fetching order details:", id);

    const order = await DemandOrder.findOne({
      _id: id,
      current_approver_id: userId,
      status: { $in: ["forwarded_to_distribution", "scheduling_in_progress"] },
    })
      .populate({
        path: "distributor_id",
        select: "name code erp_id contact_person contact_mobile delivery_depot_id",
        populate: {
          path: "delivery_depot_id",
          select: "name location contact_person contact_mobile",
        },
      })
      .lean();

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found or not assigned to you",
      });
    }

    // Fetch available facilities (Depots)
    const facilities = await Facility.find({ type: "Depot", active: true })
      .select("name location contact_person contact_mobile")
      .lean();

    // Enrich items with detailed offer information
    const enrichedItems = await Promise.all(
      order.items.map(async (item) => {
        let enrichedItem = { ...item };

        if (item.source === "offer" && item.source_id) {
          const offer = await Offer.findById(item.source_id)
            .select("offer_type name config")
            .lean();

          if (offer) {
            enrichedItem.offer_type = offer.offer_type;
            enrichedItem.offer_name = offer.name;
            enrichedItem.is_bundle_offer = ["BOGO", "BUNDLE_OFFER", "BOGO_DIFFERENT_SKU"].includes(
              offer.offer_type
            );

            // Calculate unscheduled quantities
            if (enrichedItem.is_bundle_offer) {
              enrichedItem.unscheduled_bundles = item.order_bundles - (item.scheduled_bundles || 0);
            } else {
              enrichedItem.unscheduled_qty = item.quantity - (item.scheduled_qty || 0);
            }

            // Determine scheduling mode
            enrichedItem.scheduling_mode = enrichedItem.is_bundle_offer ? "bundle" : "quantity";
          }
        } else {
          // Regular product - quantity-based scheduling
          enrichedItem.is_bundle_offer = false;
          enrichedItem.unscheduled_qty = item.quantity - (item.scheduled_qty || 0);
          enrichedItem.scheduling_mode = "quantity";
        }

        return enrichedItem;
      })
    );

    res.json({
      success: true,
      data: {
        order: {
          ...order,
          items: enrichedItems,
        },
        available_facilities: facilities,
      },
    });
  } catch (error) {
    console.error("❌ Distribution order details error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch order details",
      error: error.message,
    });
  }
});

/**
 * POST /ordermanagement/distribution/:id/schedule-item
 * Schedule delivery for a specific item (supports progressive scheduling)
 *
 * Body:
 * {
 *   item_id: "item._id",
 *   deliver_qty: 50,              // For quantity-based (simple discounts)
 *   deliver_bundles: 25,           // For bundle-based (BOGO, BUNDLE_OFFER)
 *   facility_id: "facility_id",
 *   notes: "Optional scheduling notes"
 * }
 */
router.post(
  "/:id/schedule-item",
  authenticate,
  requireApiPermission("demandorder:schedule"),
  async (req, res) => {
    try {
      const { id } = req.params;
      const { item_id, deliver_qty, deliver_bundles, facility_id, notes } = req.body;
      const userId = req.user.id;
      const userName =
        req.user.employee_id?.name ||
        req.user.distributor_id?.name ||
        req.user.username ||
        "Unknown User";

      console.log("📦 Scheduling item:", { item_id, deliver_qty, deliver_bundles, facility_id });

      // Validate facility
      const facility = await Facility.findById(facility_id);
      if (!facility || facility.type !== "Depot") {
        return res.status(404).json({
          success: false,
          message: "Depot not found or inactive",
        });
      }

      // Fetch order
      const order = await DemandOrder.findOne({
        _id: id,
        current_approver_id: userId,
        status: { $in: ["forwarded_to_distribution", "scheduling_in_progress"] },
      }).populate({
        path: "distributor_id",
        select: "name",
      });

      if (!order) {
        return res.status(404).json({
          success: false,
          message: "Order not found or not assigned to you",
        });
      }

      // Find the item
      const item = order.items.id(item_id);
      if (!item) {
        return res.status(404).json({
          success: false,
          message: "Item not found in order",
        });
      }

      // Determine scheduling mode based on offer type
      let isBundleOffer = false;
      let offerType = null;

      if (item.source === "offer" && item.source_id) {
        const offer = await Offer.findById(item.source_id).select("offer_type").lean();
        if (offer) {
          offerType = offer.offer_type;
          isBundleOffer = ["BOGO", "BUNDLE_OFFER", "BOGO_DIFFERENT_SKU"].includes(offer.offer_type);
        }
      }

      // Initialize scheduling fields if not present
      if (!item.scheduled_qty) item.scheduled_qty = 0;
      if (!item.scheduled_bundles) item.scheduled_bundles = 0;
      if (!item.schedules) item.schedules = [];

      // Validate and calculate delivery quantities
      let actualDeliverQty = 0;
      let actualDeliverBundles = 0;
      let deliverQtyBreakdown = {};

      if (isBundleOffer) {
        // ========== BUNDLE-BASED SCHEDULING ==========
        if (!deliver_bundles || deliver_bundles <= 0) {
          return res.status(400).json({
            success: false,
            message: "deliver_bundles is required for bundle offers and must be positive",
          });
        }

        const unscheduledBundles = (item.order_bundles || 0) - item.scheduled_bundles;

        if (deliver_bundles > unscheduledBundles) {
          return res.status(400).json({
            success: false,
            message: `Cannot schedule ${deliver_bundles} bundles. Only ${unscheduledBundles} bundles remaining.`,
          });
        }

        actualDeliverBundles = deliver_bundles;

        // Calculate actual quantities per SKU from bundle definition
        if (item.bundle_definition && item.bundle_definition.items) {
          item.bundle_definition.items.forEach((bundleItem) => {
            const qty = bundleItem.qty_per_bundle * deliver_bundles;
            deliverQtyBreakdown[bundleItem.sku] = qty;
          });

          // Total deliver_qty is sum of all SKUs
          actualDeliverQty = Object.values(deliverQtyBreakdown).reduce((sum, qty) => sum + qty, 0);
        } else {
          // Fallback: if no bundle_definition, calculate from order quantities
          actualDeliverQty = Math.ceil((item.quantity / item.order_bundles) * deliver_bundles);
        }

        // Update bundle tracking
        item.scheduled_bundles += actualDeliverBundles;
        item.unscheduled_bundles = item.order_bundles - item.scheduled_bundles;
      } else {
        // ========== QUANTITY-BASED SCHEDULING ==========
        if (!deliver_qty || deliver_qty <= 0) {
          return res.status(400).json({
            success: false,
            message: "deliver_qty is required for quantity-based offers and must be positive",
          });
        }

        const unscheduledQty = item.quantity - item.scheduled_qty;

        if (deliver_qty > unscheduledQty) {
          return res.status(400).json({
            success: false,
            message: `Cannot schedule ${deliver_qty} units. Only ${unscheduledQty} units remaining.`,
          });
        }

        actualDeliverQty = deliver_qty;

        // Update quantity tracking
        item.scheduled_qty += actualDeliverQty;
        item.unscheduled_qty = item.quantity - item.scheduled_qty;
      }

      // Calculate pricing for this schedule
      const unitPriceForSchedule = item.unit_price;
      const subtotalForSchedule = unitPriceForSchedule * actualDeliverQty;
      const discountApplied = item.discount_applied_percent || 0;
      const finalAmount = subtotalForSchedule * (1 - discountApplied / 100);

      // Create schedule record
      const newSchedule = {
        schedule_id: new Date().getTime().toString(),
        deliver_bundles: isBundleOffer ? actualDeliverBundles : undefined,
        deliver_qty: actualDeliverQty,
        deliver_qty_breakdown:
          Object.keys(deliverQtyBreakdown).length > 0 ? deliverQtyBreakdown : undefined,
        facility_id: facility._id,
        facility_name: facility.name,
        facility_type: facility.type,
        subtotal: subtotalForSchedule,
        discount_applied: discountApplied,
        final_amount: finalAmount,
        scheduled_at: new Date(),
        scheduled_by: userId,
        scheduled_by_name: userName,
        notes: notes || "",
      };

      item.schedules.push(newSchedule);

      // Update order status to "scheduling_in_progress" if not already
      if (order.status === "forwarded_to_distribution") {
        order.status = "scheduling_in_progress";
      }

      // Add to approval history
      order.approval_history.push({
        action: "schedule",
        performed_by: userId,
        performed_by_name: userName,
        performed_by_role: req.user.role_name,
        from_status: order.status,
        to_status: "scheduling_in_progress",
        comments: `Scheduled ${isBundleOffer ? `${actualDeliverBundles} bundles` : `${actualDeliverQty} units`} of ${item.sku} from ${facility.name}`,
        timestamp: new Date(),
      });

      await order.save();

      console.log("✅ Schedule created successfully");

      res.json({
        success: true,
        message: `Successfully scheduled ${isBundleOffer ? `${actualDeliverBundles} bundles (${actualDeliverQty} units)` : `${actualDeliverQty} units`}`,
        data: {
          item_id: item._id,
          scheduled_qty: item.scheduled_qty,
          unscheduled_qty: item.unscheduled_qty,
          scheduled_bundles: item.scheduled_bundles,
          unscheduled_bundles: item.unscheduled_bundles,
          latest_schedule: newSchedule,
        },
      });
    } catch (error) {
      console.error("❌ Schedule item error:", error);
      res.status(500).json({
        success: false,
        message: "Failed to schedule item",
        error: error.message,
      });
    }
  }
);

/**
 * DELETE /ordermanagement/distribution/:id/schedule/:schedule_id
 * Delete a specific schedule (undo scheduling)
 */
router.delete(
  "/:id/schedule/:item_id/:schedule_id",
  authenticate,
  requireApiPermission("demandorder:schedule"),
  async (req, res) => {
    try {
      const { id, item_id, schedule_id } = req.params;
      const userId = req.user.id;

      const order = await DemandOrder.findOne({
        _id: id,
        current_approver_id: userId,
        status: { $in: ["forwarded_to_distribution", "scheduling_in_progress"] },
      });

      if (!order) {
        return res.status(404).json({
          success: false,
          message: "Order not found or not assigned to you",
        });
      }

      const item = order.items.id(item_id);
      if (!item) {
        return res.status(404).json({
          success: false,
          message: "Item not found",
        });
      }

      const scheduleIndex = item.schedules.findIndex((s) => s.schedule_id === schedule_id);
      if (scheduleIndex === -1) {
        return res.status(404).json({
          success: false,
          message: "Schedule not found",
        });
      }

      const schedule = item.schedules[scheduleIndex];

      // Revert quantities
      if (schedule.deliver_bundles) {
        item.scheduled_bundles -= schedule.deliver_bundles;
        item.unscheduled_bundles = item.order_bundles - item.scheduled_bundles;
      }

      item.scheduled_qty -= schedule.deliver_qty;
      item.unscheduled_qty = item.quantity - item.scheduled_qty;

      // Remove schedule
      item.schedules.splice(scheduleIndex, 1);

      // Add to approval history
      const userName =
        req.user.employee_id?.name ||
        req.user.distributor_id?.name ||
        req.user.username ||
        "Unknown User";
      order.approval_history.push({
        action: "modify",
        performed_by: userId,
        performed_by_name: userName,
        performed_by_role: req.user.role_name,
        from_status: order.status,
        to_status: order.status,
        comments: `Deleted schedule: ${schedule.deliver_qty} units from ${schedule.facility_name}`,
        timestamp: new Date(),
      });

      await order.save();

      res.json({
        success: true,
        message: "Schedule deleted successfully",
        data: {
          item_id: item._id,
          scheduled_qty: item.scheduled_qty,
          unscheduled_qty: item.unscheduled_qty,
          scheduled_bundles: item.scheduled_bundles,
          unscheduled_bundles: item.unscheduled_bundles,
        },
      });
    } catch (error) {
      console.error("❌ Delete schedule error:", error);
      res.status(500).json({
        success: false,
        message: "Failed to delete schedule",
        error: error.message,
      });
    }
  }
);

/**
 * POST /ordermanagement/distribution/:id/submit
 * Submit completed scheduling to Finance
 * Validates that all items are fully scheduled
 */
router.post(
  "/:id/submit",
  authenticate,
  requireApiPermission("demandorder:schedule"),
  async (req, res) => {
    try {
      const { id } = req.params;
      const userId = req.user.id;
      const { comments } = req.body;

      const order = await DemandOrder.findOne({
        _id: id,
        current_approver_id: userId,
        status: "scheduling_in_progress",
      });

      if (!order) {
        return res.status(404).json({
          success: false,
          message: "Order not found or not in scheduling status",
        });
      }

      // Validate all items are fully scheduled
      const unscheduledItems = [];

      for (const item of order.items) {
        let isBundleOffer = false;

        if (item.source === "offer" && item.source_id) {
          const offer = await Offer.findById(item.source_id).select("offer_type").lean();
          if (offer) {
            isBundleOffer = ["BOGO", "BUNDLE_OFFER", "BOGO_DIFFERENT_SKU"].includes(
              offer.offer_type
            );
          }
        }

        if (isBundleOffer) {
          const unscheduledBundles = (item.order_bundles || 0) - (item.scheduled_bundles || 0);
          if (unscheduledBundles > 0) {
            unscheduledItems.push({
              sku: item.sku,
              unscheduled: `${unscheduledBundles} bundles`,
            });
          }
        } else {
          const unscheduledQty = item.quantity - (item.scheduled_qty || 0);
          if (unscheduledQty > 0) {
            unscheduledItems.push({
              sku: item.sku,
              unscheduled: `${unscheduledQty} units`,
            });
          }
        }
      }

      if (unscheduledItems.length > 0) {
        return res.status(400).json({
          success: false,
          message: "Cannot submit: Some items are not fully scheduled",
          unscheduled_items: unscheduledItems,
        });
      }

      // Find Finance role user to forward to
      const User = require("../../models/User");
      const financeUser = await User.findOne({ role_name: "Finance" }).select("_id").lean();

      if (!financeUser) {
        return res.status(500).json({
          success: false,
          message: "No Finance user found to forward the order",
        });
      }

      // Update order status
      order.status = "scheduling_completed";
      order.current_approver_id = financeUser._id;
      order.current_approver_role = "Finance";

      // Add to approval history
      const userName =
        req.user.employee_id?.name ||
        req.user.distributor_id?.name ||
        req.user.username ||
        "Unknown User";
      order.approval_history.push({
        action: "forward",
        performed_by: userId,
        performed_by_name: userName,
        performed_by_role: req.user.role_name,
        from_status: "scheduling_in_progress",
        to_status: "scheduling_completed",
        comments: comments || "Scheduling completed, forwarded to Finance",
        timestamp: new Date(),
      });

      await order.save();

      console.log("✅ Order scheduling completed and forwarded to Finance");

      res.json({
        success: true,
        message: "Order scheduling completed and forwarded to Finance",
        data: {
          order_number: order.order_number,
          status: order.status,
        },
      });
    } catch (error) {
      console.error("❌ Submit scheduling error:", error);
      res.status(500).json({
        success: false,
        message: "Failed to submit scheduling",
        error: error.message,
      });
    }
  }
);

/**
 * GET /ordermanagement/distribution/completed
 * Fetch completed/submitted orders for review
 */
router.get(
  "/completed",
  authenticate,
  requireApiPermission("demandorder:schedule"),
  async (req, res) => {
    try {
      const userId = req.user.id;

      const orders = await DemandOrder.find({
        "approval_history.performed_by": userId,
        status: { $in: ["scheduling_completed", "approved", "rejected"] },
      })
        .populate({
          path: "distributor_id",
          select: "name code erp_id",
        })
        .sort({ updated_at: -1 })
        .limit(50)
        .lean();

      res.json({
        success: true,
        data: orders,
      });
    } catch (error) {
      console.error("❌ Completed orders error:", error);
      res.status(500).json({
        success: false,
        message: "Failed to fetch completed orders",
        error: error.message,
      });
    }
  }
);

module.exports = router;
