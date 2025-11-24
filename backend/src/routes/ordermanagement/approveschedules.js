const express = require("express");
const router = express.Router();
const DemandOrder = require("../../models/DemandOrder");
const Offer = require("../../models/Offer");
const { authenticate, requireApiPermission } = require("../../middleware/auth");

/**
 * ============================================================================
 * APPROVE SCHEDULES MODULE - FINANCE
 * ============================================================================
 *
 * Finance reviews and approves/rejects orders that have been scheduled by
 * Distribution. This is the final approval step before orders are fulfilled.
 *
 * Features:
 * - View all scheduled orders (status: scheduling_completed)
 * - Review scheduling details with facility breakdown
 * - Approve or reject entire order
 * - Add comments/rejection reasons
 * - Audit trail of approval actions
 * ============================================================================
 */

/**
 * GET /ordermanagement/approveschedules/pending
 * Get all orders pending Finance approval after scheduling
 */
router.get(
  "/pending",
  authenticate,
  requireApiPermission("demandorder:approve"),
  async (req, res) => {
    try {
      const userId = req.user.id;
      console.log("💰 Finance: Fetching scheduled orders for approval:", userId);

      const orders = await DemandOrder.find({
        current_approver_id: userId,
        status: "scheduling_completed",
      })
        .populate({
          path: "distributor_id",
          select: "name code erp_id contact_person contact_mobile delivery_depot_id",
          populate: {
            path: "delivery_depot_id",
            select: "name location",
          },
        })
        .populate("approved_by", "name email")
        .sort({ updated_at: -1 })
        .lean();

      console.log("💰 Found scheduled orders:", orders.length);

      // Enrich with scheduling summary
      const enrichedOrders = orders.map((order) => {
        // Calculate scheduling summary
        const totalItems = order.items.length;
        const itemsWithSchedules = order.items.filter(
          (item) => item.schedules && item.schedules.length > 0
        ).length;
        const totalSchedules = order.items.reduce(
          (sum, item) => sum + (item.schedules?.length || 0),
          0
        );

        // Get unique facilities used
        const facilities = new Set();
        order.items.forEach((item) => {
          if (item.schedules) {
            item.schedules.forEach((schedule) => {
              facilities.add(schedule.facility_name);
            });
          }
        });

        return {
          ...order,
          scheduling_summary: {
            total_items: totalItems,
            items_with_schedules: itemsWithSchedules,
            total_schedules: totalSchedules,
            unique_facilities: Array.from(facilities),
          },
        };
      });

      res.json({
        success: true,
        data: enrichedOrders,
      });
    } catch (error) {
      console.error("❌ Error fetching scheduled orders:", error);
      res.status(500).json({
        success: false,
        message: "Failed to fetch scheduled orders",
        error: error.message,
      });
    }
  }
);

/**
 * GET /ordermanagement/approveschedules/:id
 * Get detailed order with all scheduling information
 */
router.get("/:id", authenticate, requireApiPermission("demandorder:approve"), async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    console.log("💰 Finance: Fetching order details for approval:", id);

    const order = await DemandOrder.findOne({
      _id: id,
      current_approver_id: userId,
      status: "scheduling_completed",
    })
      .populate({
        path: "distributor_id",
        select: "name code erp_id contact_person contact_mobile delivery_depot_id product_segment",
        populate: {
          path: "delivery_depot_id",
          select: "name location contact_person contact_mobile",
        },
      })
      .populate("approved_by", "name email")
      .populate("created_by", "name email")
      .lean();

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found or not assigned to you for approval",
      });
    }

    // Enrich items with offer information
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
          }
        }

        // Calculate schedule summary for this item
        if (item.schedules && item.schedules.length > 0) {
          const totalScheduled = item.schedules.reduce(
            (sum, schedule) => sum + schedule.deliver_qty,
            0
          );
          const totalAmount = item.schedules.reduce(
            (sum, schedule) => sum + schedule.final_amount,
            0
          );

          enrichedItem.schedule_summary = {
            total_schedules: item.schedules.length,
            total_scheduled_qty: totalScheduled,
            total_amount: totalAmount,
            facilities: item.schedules.map((s) => s.facility_name),
          };
        }

        return enrichedItem;
      })
    );

    res.json({
      success: true,
      data: {
        ...order,
        items: enrichedItems,
      },
    });
  } catch (error) {
    console.error("❌ Error fetching order details:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch order details",
      error: error.message,
    });
  }
});

/**
 * POST /ordermanagement/approveschedules/:id/approve
 * Approve the scheduled order
 */
router.post(
  "/:id/approve",
  authenticate,
  requireApiPermission("demandorder:approve"),
  async (req, res) => {
    try {
      const { id } = req.params;
      const { comments } = req.body;
      const userId = req.user.id;
      const userName =
        req.user.employee_id?.name ||
        req.user.distributor_id?.name ||
        req.user.username ||
        "Unknown User";

      console.log("💰 Finance: Approving scheduled order:", id);

      const order = await DemandOrder.findOne({
        _id: id,
        current_approver_id: userId,
        status: "scheduling_completed",
      });

      if (!order) {
        return res.status(404).json({
          success: false,
          message: "Order not found or not assigned to you for approval",
        });
      }

      // Validate all items are fully scheduled
      const unscheduledItems = [];
      for (const item of order.items) {
        const hasSchedules = item.schedules && item.schedules.length > 0;
        if (!hasSchedules) {
          unscheduledItems.push(item.sku);
          continue;
        }

        // Check if scheduled qty matches order qty
        const totalScheduled = item.schedules.reduce(
          (sum, schedule) => sum + schedule.deliver_qty,
          0
        );

        if (totalScheduled < item.quantity) {
          unscheduledItems.push(`${item.sku} (${totalScheduled}/${item.quantity} scheduled)`);
        }
      }

      if (unscheduledItems.length > 0) {
        return res.status(400).json({
          success: false,
          message: "Cannot approve: Some items are not fully scheduled",
          unscheduled_items: unscheduledItems,
        });
      }

      // Update order status
      order.status = "approved";
      order.approved_at = new Date();
      order.approved_by = userId;
      order.current_approver_id = null; // No further approvals needed
      order.current_approver_role = null;

      // Add to approval history
      order.approval_history.push({
        action: "approve",
        performed_by: userId,
        performed_by_name: userName,
        performed_by_role: req.user.role_name || "Finance",
        from_status: "scheduling_completed",
        to_status: "approved",
        comments: comments || "Scheduled order approved by Finance",
        timestamp: new Date(),
      });

      await order.save();

      console.log("✅ Order approved successfully");

      res.json({
        success: true,
        message: `Order ${order.order_number} approved successfully`,
        data: {
          order_number: order.order_number,
          status: order.status,
          approved_at: order.approved_at,
        },
      });
    } catch (error) {
      console.error("❌ Error approving order:", error);
      res.status(500).json({
        success: false,
        message: "Failed to approve order",
        error: error.message,
      });
    }
  }
);

/**
 * POST /ordermanagement/approveschedules/:id/reject
 * Reject the scheduled order and send back to Distribution
 */
router.post(
  "/:id/reject",
  authenticate,
  requireApiPermission("demandorder:approve"),
  async (req, res) => {
    try {
      const { id } = req.params;
      const { reason } = req.body;
      const userId = req.user.id;
      const userName =
        req.user.employee_id?.name ||
        req.user.distributor_id?.name ||
        req.user.username ||
        "Unknown User";

      if (!reason || reason.trim() === "") {
        return res.status(400).json({
          success: false,
          message: "Rejection reason is required",
        });
      }

      console.log("💰 Finance: Rejecting scheduled order:", id);

      const order = await DemandOrder.findOne({
        _id: id,
        current_approver_id: userId,
        status: "scheduling_completed",
      });

      if (!order) {
        return res.status(404).json({
          success: false,
          message: "Order not found or not assigned to you for approval",
        });
      }

      // Find Distribution user to send back to
      const User = require("../../models/User");
      const distributionUser = await User.findOne({ role_name: "Distribution" })
        .select("_id")
        .lean();

      if (!distributionUser) {
        return res.status(500).json({
          success: false,
          message: "No Distribution user found to send order back",
        });
      }

      // Update order status - send back to Distribution for rescheduling
      order.status = "scheduling_in_progress";
      order.current_approver_id = distributionUser._id;
      order.current_approver_role = "Distribution";
      order.rejection_reason = reason;
      order.rejected_at = new Date();
      order.rejected_by = userId;

      // Add to approval history
      order.approval_history.push({
        action: "reject",
        performed_by: userId,
        performed_by_name: userName,
        performed_by_role: req.user.role_name || "Finance",
        from_status: "scheduling_completed",
        to_status: "scheduling_in_progress",
        comments: `Rejected by Finance: ${reason}`,
        timestamp: new Date(),
      });

      await order.save();

      console.log("✅ Order rejected and sent back to Distribution");

      res.json({
        success: true,
        message: `Order ${order.order_number} rejected and sent back to Distribution`,
        data: {
          order_number: order.order_number,
          status: order.status,
          rejection_reason: reason,
        },
      });
    } catch (error) {
      console.error("❌ Error rejecting order:", error);
      res.status(500).json({
        success: false,
        message: "Failed to reject order",
        error: error.message,
      });
    }
  }
);

/**
 * GET /ordermanagement/approveschedules/history
 * Get approved/rejected orders history
 */
router.get(
  "/history",
  authenticate,
  requireApiPermission("demandorder:approve"),
  async (req, res) => {
    try {
      const { status, limit = 50 } = req.query;

      const query = {
        status: { $in: ["approved", "rejected"] },
      };

      if (status && status !== "all") {
        query.status = status;
      }

      const orders = await DemandOrder.find(query)
        .populate({
          path: "distributor_id",
          select: "name code erp_id",
        })
        .populate("approved_by", "name email")
        .populate("rejected_by", "name email")
        .sort({ updated_at: -1 })
        .limit(parseInt(limit))
        .lean();

      res.json({
        success: true,
        data: orders,
      });
    } catch (error) {
      console.error("❌ Error fetching approval history:", error);
      res.status(500).json({
        success: false,
        message: "Failed to fetch approval history",
        error: error.message,
      });
    }
  }
);

module.exports = router;
