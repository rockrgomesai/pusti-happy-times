/**
 * Dashboard Widget Routes
 * Provides summary data for role-specific dashboards
 */

const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");
const { authenticate } = require("../middleware/auth");
const InventoryRequisition = require("../models/InventoryRequisition");
const Notification = require("../models/Notification");

/**
 * GET /api/dashboard/widgets
 * Get dashboard widgets based on user role
 */
router.get("/widgets", authenticate, async (req, res) => {
  try {
    const { role_id } = req.user;
    const widgets = [];

    // Populate role to get role name
    const userWithRole = await mongoose
      .model("User")
      .findById(req.user._id)
      .populate("role_id", "role")
      .lean();

    const roleName = userWithRole?.role_id?.role;

    // Distribution Role Widgets
    if (roleName === "Distribution") {
      // Pending Requisitions Count
      const pendingRequisitions = await InventoryRequisition.countDocuments({
        status: "submitted",
        scheduling_status: { $in: ["not-scheduled", "partially-scheduled"] },
      });

      widgets.push({
        id: "pending_requisitions",
        title: "Pending Requisitions",
        value: pendingRequisitions,
        icon: "PendingActions",
        color: "warning",
        action_url: "/inventory/schedule-requisitions",
        action_label: "Schedule Now",
        description:
          pendingRequisitions === 1 ? "requisition to schedule" : "requisitions to schedule",
      });

      // Unread Notifications Count
      const unreadNotifications = await Notification.countDocuments({
        user_id: req.user._id,
        read: false,
      });

      widgets.push({
        id: "unread_notifications",
        title: "Unread Notifications",
        value: unreadNotifications,
        icon: "Notifications",
        color: "info",
        action_url: "/notifications",
        action_label: "View All",
        description: unreadNotifications === 1 ? "new notification" : "new notifications",
      });
    }

    // Add more role-specific widgets here
    // Example: Inventory Depot, ASM, RSM, etc.

    res.json({
      success: true,
      data: {
        role: roleName,
        widgets,
      },
    });
  } catch (error) {
    console.error("Error fetching dashboard widgets:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch dashboard widgets",
      error: error.message,
    });
  }
});

/**
 * GET /api/dashboard/requisitions/summary
 * Get detailed requisition summary for Distribution
 */
router.get("/requisitions/summary", authenticate, async (req, res) => {
  try {
    const userWithRole = await mongoose
      .model("User")
      .findById(req.user._id)
      .populate("role_id", "role")
      .lean();

    const roleName = userWithRole?.role_id?.role;

    if (roleName !== "Distribution") {
      return res.status(403).json({
        success: false,
        message: "Access denied. Distribution role required.",
      });
    }

    // Get requisition statistics
    const [notScheduled, partiallyScheduled, fullyScheduled, totalToday] = await Promise.all([
      InventoryRequisition.countDocuments({
        status: "submitted",
        scheduling_status: "not-scheduled",
      }),
      InventoryRequisition.countDocuments({
        status: "submitted",
        scheduling_status: "partially-scheduled",
      }),
      InventoryRequisition.countDocuments({
        scheduling_status: "fully-scheduled",
      }),
      InventoryRequisition.countDocuments({
        created_at: {
          $gte: new Date(new Date().setHours(0, 0, 0, 0)),
          $lte: new Date(new Date().setHours(23, 59, 59, 999)),
        },
      }),
    ]);

    // Get recent requisitions (last 5)
    const recentRequisitions = await InventoryRequisition.find({
      status: "submitted",
      scheduling_status: { $in: ["not-scheduled", "partially-scheduled"] },
    })
      .populate("from_depot_id", "name code")
      .sort({ created_at: -1 })
      .limit(5)
      .select("requisition_no requisition_date from_depot_id details scheduling_status created_at")
      .lean();

    const summary = {
      statistics: {
        not_scheduled: notScheduled,
        partially_scheduled: partiallyScheduled,
        fully_scheduled: fullyScheduled,
        total_pending: notScheduled + partiallyScheduled,
        created_today: totalToday,
      },
      recent_requisitions: recentRequisitions.map((req) => ({
        _id: req._id,
        requisition_no: req.requisition_no,
        requisition_date: req.requisition_date,
        depot_name: req.from_depot_id?.name,
        depot_code: req.from_depot_id?.code,
        item_count: req.details?.length || 0,
        scheduling_status: req.scheduling_status,
        created_at: req.created_at,
      })),
    };

    res.json({
      success: true,
      data: summary,
    });
  } catch (error) {
    console.error("Error fetching requisition summary:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch requisition summary",
      error: error.message,
    });
  }
});

module.exports = router;
