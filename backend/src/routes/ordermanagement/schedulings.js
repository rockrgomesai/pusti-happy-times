const express = require("express");
const mongoose = require("mongoose");
const router = express.Router();
const Scheduling = require("../../models/Scheduling");
const DemandOrder = require("../../models/DemandOrder");
const Facility = require("../../models/Facility");
const { authenticate, requireApiPermission } = require("../../middleware/auth");

/**
 * GET /ordermanagement/schedulings
 * Get all schedulings grouped by depot and distributor
 * Requires: scheduling:read permission
 */
router.get("/", authenticate, requireApiPermission("scheduling:read"), async (req, res) => {
  try {
    const { status } = req.query;

    // Get user role - handle both populated and unpopulated cases
    let userRole = null;
    if (req.user.role_id) {
      if (typeof req.user.role_id === "object" && req.user.role_id.role) {
        userRole = req.user.role_id.role;
      } else {
        const Role = require("../../models/Role");
        const roleDoc = await Role.findById(req.user.role_id).lean();
        userRole = roleDoc?.role;
      }
    }

    console.log("📦 Schedulings GET - User Role:", userRole);
    console.log("📦 User object:", JSON.stringify(req.user, null, 2));

    // Build query based on user role
    const query = {};

    if (userRole === "Distribution") {
      // Distribution sees all schedulings except rejected ones
      // They need to see partially approved schedulings with remaining unscheduled items
      query.current_status = { $ne: "Rejected" };
      console.log("📦 Distribution query:", JSON.stringify(query));
    } else if (userRole === "Finance") {
      // Finance sees schedulings ready for approval
      query.current_status = "Finance-to-approve";
      console.log("💰 Finance query:", JSON.stringify(query));
    } else {
      console.log("⚠️ Unknown role or no role detected");
    }

    if (status) {
      query.current_status = status;
    }

    // Fetch schedulings with populated data
    const schedulings = await Scheduling.find(query)
      .populate("distributor_id", "name erp_id delivery_depot_id")
      .populate("depot_id", "name")
      .populate("order_id", "order_number created_at")
      .populate("scheduling_details.depot_id", "name code")
      .sort({ "order_id.created_at": -1, order_number: 1 })
      .lean();

    console.log(`📊 Found ${schedulings.length} schedulings matching query`);
    schedulings.forEach((s) => {
      console.log(
        `  - ${s.order_number}: status=${s.current_status}, items=${s.items.length}, details=${s.scheduling_details?.length || 0}`
      );
    });

    // Group by depot, then by distributor
    const groupedData = {};

    for (const scheduling of schedulings) {
      // For Distribution role, filter out orders with no unscheduled items
      if (userRole === "Distribution") {
        const hasUnscheduledItems = scheduling.items.some((item) => item.unscheduled_qty > 0);
        if (!hasUnscheduledItems) {
          continue; // Skip this order as it's fully scheduled
        }
      }

      const depotId = scheduling.depot_id._id.toString();
      const depotName = scheduling.depot_id.name;
      const distributorId = scheduling.distributor_id._id.toString();
      const distributorName = scheduling.distributor_id.name;
      const distributorErpId = scheduling.distributor_id.erp_id;

      if (!groupedData[depotId]) {
        groupedData[depotId] = {
          depot_id: depotId,
          depot_name: depotName,
          distributors: {},
        };
      }

      if (!groupedData[depotId].distributors[distributorId]) {
        groupedData[depotId].distributors[distributorId] = {
          distributor_id: distributorId,
          distributor_name: distributorName,
          distributor_erp_id: distributorErpId,
          orders: [],
        };
      }

      // Filter items based on user role
      let itemsToShow = scheduling.items;
      if (userRole === "Distribution") {
        // Distribution only sees items with unscheduled quantity
        itemsToShow = scheduling.items.filter((item) => item.unscheduled_qty > 0);

        // Skip if no items to show after filtering
        if (itemsToShow.length === 0) {
          continue;
        }
      } else if (userRole === "Finance") {
        // Finance needs to see orders with pending scheduling details to approve
        const hasPendingSchedulingDetails =
          scheduling.scheduling_details &&
          scheduling.scheduling_details.some(
            (detail) => !detail.approval_status || detail.approval_status === "Pending"
          );

        // Skip if no pending scheduling details
        if (!hasPendingSchedulingDetails) {
          console.log(`  ⏭️ Skipping ${scheduling.order_number} - no pending scheduling details`);
          continue;
        }

        // Finance sees all items (for context)
        itemsToShow = scheduling.items;
      }

      // Expand items for the order
      const orderData = {
        scheduling_id: scheduling._id,
        order_id: scheduling.order_id._id,
        order_number: scheduling.order_number,
        order_date: scheduling.order_id.created_at,
        items: itemsToShow,
        current_status: scheduling.current_status,
        scheduling_details: scheduling.scheduling_details || [],
      };

      groupedData[depotId].distributors[distributorId].orders.push(orderData);
    }

    // Convert to array format
    const result = Object.values(groupedData).map((depot) => ({
      ...depot,
      distributors: Object.values(depot.distributors),
    }));

    res.json({
      success: true,
      data: result,
      count: schedulings.length,
    });
  } catch (error) {
    console.error("Error fetching schedulings:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch schedulings",
      error: error.message,
    });
  }
});

/**
 * GET /ordermanagement/schedulings/my-schedulings
 * Get schedulings created by the logged-in user
 * Supports filtering: Full/Partial, date range, pagination
 * Requires: scheduling:read permission
 */
router.get(
  "/my-schedulings",
  authenticate,
  requireApiPermission("scheduling:read"),
  async (req, res) => {
    try {
      const userId = req.user.id;
      const userRole = req.user.role?.role_name;
      const {
        filter, // 'full' or 'partial'
        from_date,
        to_date,
        page = 1,
        limit = 20,
      } = req.query;

      // Build query based on role
      let query = {};

      // For Inventory Depot role, show schedulings for their depot
      if (userRole === "Inventory Depot") {
        // Get user's employee record to find their depot
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

        if (user?.employee_id?.facility_id?._id) {
          query.depot_id = user.employee_id.facility_id._id;
          console.log(
            `📦 Inventory Depot user - filtering by depot: ${user.employee_id.facility_id.name}`
          );
        } else {
          console.log(`⚠️ Inventory Depot user has no facility assigned`);
          return res.status(200).json({
            success: true,
            data: [],
            pagination: { page: 1, limit: 20, total: 0, totalPages: 0 },
          });
        }
      } else {
        // For other roles, show schedulings they created
        query = {
          "scheduling_details.scheduled_by": userId,
        };
      }

      // Date range filter
      if (from_date || to_date) {
        query["scheduling_details.scheduled_at"] = {};
        if (from_date) {
          query["scheduling_details.scheduled_at"].$gte = new Date(from_date);
        }
        if (to_date) {
          const toDate = new Date(to_date);
          toDate.setHours(23, 59, 59, 999); // End of day
          query["scheduling_details.scheduled_at"].$lte = toDate;
        }
      }

      // Fetch schedulings
      const schedulings = await Scheduling.find(query)
        .populate("distributor_id", "name erp_id delivery_depot_id")
        .populate({
          path: "depot_id",
          select: "name type depot_id",
        })
        .populate("order_id", "order_number created_at")
        .lean();

      console.log(`📦 Found ${schedulings.length} schedulings for user ${userId}`);

      // Process each scheduling to extract scheduling_details
      const processedSchedulings = [];

      for (const scheduling of schedulings) {
        // For Inventory Depot, show all scheduling details for their depot
        // For other roles, filter by scheduled_by user
        let userSchedulingDetails = scheduling.scheduling_details;

        if (userRole !== "Inventory Depot") {
          userSchedulingDetails = scheduling.scheduling_details.filter(
            (detail) => detail.scheduled_by.toString() === userId
          );
        }

        // Apply date filter to scheduling_details if needed
        let filteredDetails = userSchedulingDetails;
        if (from_date || to_date) {
          filteredDetails = userSchedulingDetails.filter((detail) => {
            const scheduledAt = new Date(detail.scheduled_at);
            let matchesDate = true;
            if (from_date) {
              matchesDate = matchesDate && scheduledAt >= new Date(from_date);
            }
            if (to_date) {
              const toDate = new Date(to_date);
              toDate.setHours(23, 59, 59, 999);
              matchesDate = matchesDate && scheduledAt <= toDate;
            }
            return matchesDate;
          });
        }

        if (filteredDetails.length === 0) continue;

        // Check if order is fully scheduled (all items have unscheduled_qty = 0)
        const isFullyScheduled = scheduling.items.every((item) => item.unscheduled_qty === 0);

        // Apply Full/Partial filter
        if (filter === "full" && !isFullyScheduled) continue;
        if (filter === "partial" && isFullyScheduled) continue;

        // For each scheduling_detail by this user, create a row
        for (const detail of filteredDetails) {
          // Find the corresponding item in scheduling.items
          const item = scheduling.items.find(
            (i) => i.item_id.toString() === detail.item_id.toString()
          );

          if (!item) continue;

          processedSchedulings.push({
            scheduling_id: scheduling._id,
            order_id: scheduling.order_id._id,
            order_number: scheduling.order_number,
            order_date: scheduling.order_id.created_at,
            depot_id: scheduling.depot_id._id,
            depot_name: scheduling.depot_id.name,
            distributor_id: scheduling.distributor_id._id,
            distributor_name: scheduling.distributor_id.name,
            distributor_erp_id: scheduling.distributor_id.erp_id,
            current_status: scheduling.current_status,
            is_fully_scheduled: isFullyScheduled,
            // Item details
            item_id: item.item_id,
            sku: item.sku,
            product_name: item.product_name,
            dp_price: item.dp_price,
            order_qty: item.order_qty,
            scheduled_qty: item.scheduled_qty,
            unscheduled_qty: item.unscheduled_qty,
            // Scheduling detail specific to this entry
            delivery_qty: detail.delivery_qty,
            delivery_depot_id: detail.depot_id,
            scheduled_at: detail.scheduled_at,
            scheduling_detail_id: detail._id,
          });
        }
      }

      // Sort by scheduled_at DESC (most recent first)
      processedSchedulings.sort((a, b) => new Date(b.scheduled_at) - new Date(a.scheduled_at));

      // Pagination
      const totalCount = processedSchedulings.length;
      const pageNum = parseInt(page);
      const limitNum = parseInt(limit);
      const startIndex = (pageNum - 1) * limitNum;
      const endIndex = startIndex + limitNum;
      const paginatedData = processedSchedulings.slice(startIndex, endIndex);

      // Group by depot and distributor for UI
      const groupedData = {};

      for (const item of paginatedData) {
        const depotId = item.depot_id.toString();
        const distributorId = item.distributor_id.toString();

        if (!groupedData[depotId]) {
          groupedData[depotId] = {
            depot_id: depotId,
            depot_name: item.depot_name,
            distributors: {},
          };
        }

        if (!groupedData[depotId].distributors[distributorId]) {
          groupedData[depotId].distributors[distributorId] = {
            distributor_id: distributorId,
            distributor_name: item.distributor_name,
            distributor_erp_id: item.distributor_erp_id,
            items: [],
          };
        }

        groupedData[depotId].distributors[distributorId].items.push(item);
      }

      // Convert to array format
      const result = Object.values(groupedData).map((depot) => ({
        ...depot,
        distributors: Object.values(depot.distributors),
      }));

      res.json({
        success: true,
        data: result,
        pagination: {
          total: totalCount,
          page: pageNum,
          limit: limitNum,
          totalPages: Math.ceil(totalCount / limitNum),
        },
      });
    } catch (error) {
      console.error("Error fetching my schedulings:", error);
      res.status(500).json({
        success: false,
        message: "Failed to fetch my schedulings",
        error: error.message,
      });
    }
  }
);

/**
 * GET /ordermanagement/schedulings/approved-rejected
 * Get approved or rejected schedulings for Finance
 * Requires: scheduling:read permission
 */
router.get(
  "/approved-rejected",
  authenticate,
  requireApiPermission("scheduling:read"),
  async (req, res) => {
    try {
      const { status, from_date, to_date, page = 1, limit = 20 } = req.query;

      // Build query
      const query = {
        current_status: { $in: ["Approved", "Rejected"] },
      };

      // Filter by status if provided
      if (status === "Approved" || status === "Rejected") {
        query.current_status = status;
      }

      // Date range filter on scheduling_status date (when Finance approved/rejected)
      if (from_date || to_date) {
        query["scheduling_status"] = {
          $elemMatch: {
            status: { $in: ["Approved", "Rejected"] },
          },
        };

        if (from_date && to_date) {
          query["scheduling_status"].$elemMatch.date = {
            $gte: new Date(from_date),
            $lte: new Date(new Date(to_date).setHours(23, 59, 59, 999)),
          };
        } else if (from_date) {
          query["scheduling_status"].$elemMatch.date = { $gte: new Date(from_date) };
        } else if (to_date) {
          query["scheduling_status"].$elemMatch.date = {
            $lte: new Date(new Date(to_date).setHours(23, 59, 59, 999)),
          };
        }
      }

      // Get total count
      const total = await Scheduling.countDocuments(query);

      // Fetch schedulings with pagination
      const schedulings = await Scheduling.find(query)
        .populate("distributor_id", "name erp_id")
        .populate("order_id", "order_number created_at")
        .sort({ "scheduling_status.date": -1 }) // Most recent first
        .skip((parseInt(page) - 1) * parseInt(limit))
        .limit(parseInt(limit))
        .lean();

      // Group by order_number (DO)
      const groupedByOrder = {};

      for (const scheduling of schedulings) {
        const orderNumber = scheduling.order_id?.order_number || "Unknown";

        if (!groupedByOrder[orderNumber]) {
          groupedByOrder[orderNumber] = {
            order_id: scheduling.order_id?._id,
            order_number: orderNumber,
            order_date: scheduling.order_id?.created_at,
            distributor_name: scheduling.distributor_id?.name,
            distributor_erp_id: scheduling.distributor_id?.erp_id,
            schedulings: [],
          };
        }

        // Get the approval/rejection status entry
        const statusEntry = scheduling.scheduling_status
          .filter((s) => s.status === "Approved" || s.status === "Rejected")
          .sort((a, b) => new Date(b.date) - new Date(a.date))[0];

        groupedByOrder[orderNumber].schedulings.push({
          scheduling_id: scheduling._id,
          current_status: scheduling.current_status,
          status_date: statusEntry?.date,
          status_comments: statusEntry?.comments,
          items: (scheduling.items || []).map((item) => ({
            item_id: item.item_id,
            sku: item.sku,
            dp_price: item.dp_price,
            order_qty: item.order_qty,
            scheduled_qty: item.scheduled_qty,
            unscheduled_qty: item.unscheduled_qty,
            scheduling_details: (item.scheduling_details || []).map((detail) => ({
              scheduled_by: detail.scheduled_by,
              scheduled_at: detail.scheduled_at,
              delivery_qty: detail.delivery_qty,
              delivery_depot_id: detail.delivery_depot_id,
              delivery_depot_name: detail.delivery_depot_name,
            })),
          })),
        });
      }

      // Convert to array and sort by most recent status_date
      const orders = Object.values(groupedByOrder).sort((a, b) => {
        const dateA = Math.max(...a.schedulings.map((s) => new Date(s.status_date).getTime()));
        const dateB = Math.max(...b.schedulings.map((s) => new Date(s.status_date).getTime()));
        return dateB - dateA;
      });

      res.json({
        success: true,
        data: orders,
        pagination: {
          total,
          page: parseInt(page),
          limit: parseInt(limit),
          totalPages: Math.ceil(total / parseInt(limit)),
        },
      });
    } catch (error) {
      console.error("Error fetching approved/rejected schedulings:", error);
      res.status(500).json({
        success: false,
        message: "Failed to fetch schedulings",
        error: error.message,
      });
    }
  }
);

/**
 * GET /ordermanagement/schedulings/depots
 * Get list of all depots
 * Requires: scheduling:read permission
 */
router.get("/depots", authenticate, requireApiPermission("scheduling:read"), async (req, res) => {
  try {
    const depots = await Facility.find({ type: "Depot", active: true })
      .select("name depot_id")
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
});

/**
 * GET /ordermanagement/schedulings/:id
 * Get a specific scheduling
 * Requires: scheduling:read permission
 */
router.get("/:id", authenticate, requireApiPermission("scheduling:read"), async (req, res) => {
  try {
    const scheduling = await Scheduling.findById(req.params.id)
      .populate("distributor_id", "name erp_id")
      .populate("depot_id", "name")
      .populate("order_id", "order_number created_at")
      .populate("scheduling_details.depot_id", "name")
      .populate("scheduling_status.performed_by", "username")
      .lean();

    if (!scheduling) {
      return res.status(404).json({
        success: false,
        message: "Scheduling not found",
      });
    }

    res.json({
      success: true,
      data: scheduling,
    });
  } catch (error) {
    console.error("Error fetching scheduling:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch scheduling",
      error: error.message,
    });
  }
});

/**
 * POST /ordermanagement/schedulings/:id/schedule
 * Add delivery quantities to scheduling
 * Requires: scheduling:create permission
 */
router.post(
  "/:id/schedule",
  authenticate,
  requireApiPermission("scheduling:create"),
  async (req, res) => {
    try {
      const schedulingId = req.params.id;
      const { deliveries } = req.body; // Array of { item_id, delivery_qty, depot_id }
      const userId = req.user.id;

      if (!deliveries || !Array.isArray(deliveries) || deliveries.length === 0) {
        return res.status(400).json({
          success: false,
          message: "Deliveries array is required",
        });
      }

      const scheduling = await Scheduling.findById(schedulingId);
      if (!scheduling) {
        return res.status(404).json({
          success: false,
          message: "Scheduling not found",
        });
      }

      // Validate and process each delivery
      const newSchedulingDetails = [];
      for (const delivery of deliveries) {
        const { item_id, delivery_qty, depot_id } = delivery;

        if (!item_id || !delivery_qty || !depot_id) {
          return res.status(400).json({
            success: false,
            message: "Each delivery must have item_id, delivery_qty, and depot_id",
          });
        }

        // Find the item in scheduling
        const item = scheduling.items.find((i) => i.item_id.toString() === item_id.toString());
        if (!item) {
          return res.status(400).json({
            success: false,
            message: `Item ${item_id} not found in scheduling`,
          });
        }

        console.log(
          `📦 Validating item ${item.sku}: delivery_qty=${delivery_qty}, unscheduled_qty=${item.unscheduled_qty}, scheduled_qty=${item.scheduled_qty}`
        );

        // Validate delivery_qty does not exceed unscheduled_qty
        if (delivery_qty > item.unscheduled_qty) {
          return res.status(400).json({
            success: false,
            message: `Delivery quantity ${delivery_qty} exceeds unscheduled quantity ${item.unscheduled_qty} for item ${item.sku}. Already scheduled: ${item.scheduled_qty}, Order qty: ${item.order_qty}`,
          });
        }

        // Create scheduling detail
        newSchedulingDetails.push({
          item_id: item.item_id,
          sku: item.sku,
          product_name: item.product_name,
          dp_price: item.dp_price,
          order_qty: item.order_qty,
          scheduled_qty: item.scheduled_qty,
          delivery_qty: delivery_qty,
          depot_id: depot_id,
          scheduled_at: new Date(),
          scheduled_by: userId,
        });

        // Update item quantities
        item.scheduled_qty += delivery_qty;
        item.unscheduled_qty -= delivery_qty;
      }

      // Add scheduling details
      scheduling.scheduling_details.push(...newSchedulingDetails);

      // Update status to Finance-to-approve if not already
      if (scheduling.current_status !== "Finance-to-approve") {
        scheduling.current_status = "Finance-to-approve";
      }

      await scheduling.save();

      // Update DO status if all items are scheduled
      const allScheduled = scheduling.items.every((item) => item.unscheduled_qty === 0);
      const order = await DemandOrder.findById(scheduling.order_id);

      if (!order) {
        return res.status(404).json({
          success: false,
          message: "Demand order not found",
        });
      }

      if (allScheduled) {
        const validStatuses = ["forwarded_to_distribution", "scheduling_in_progress"];
        if (validStatuses.includes(order.status)) {
          const previousStatus = order.status;
          order.status = "scheduling_completed";
          order.approval_history.push({
            action: "scheduling_completed",
            performed_by: userId,
            performed_by_name: req.user.username || "Unknown User",
            performed_by_role: "Distribution",
            from_status: previousStatus,
            to_status: "scheduling_completed",
            comments: "All items scheduled for delivery",
            timestamp: new Date(),
          });
          await order.save();
        }
      } else {
        // Partial scheduling - add to history
        if (order.status === "forwarded_to_distribution") {
          order.status = "scheduling_in_progress";
          const scheduledCount = deliveries.length;
          const totalCount = scheduling.items.length;
          order.approval_history.push({
            action: "partial_scheduling",
            performed_by: userId,
            performed_by_name: req.user.username || "Unknown User",
            performed_by_role: "Distribution",
            from_status: "forwarded_to_distribution",
            to_status: "scheduling_in_progress",
            comments: `Partial delivery scheduled: ${scheduledCount} items out of ${totalCount} total items`,
            timestamp: new Date(),
          });
          await order.save();
        }
      }

      res.json({
        success: true,
        message: "Scheduling saved successfully",
        data: scheduling,
      });
    } catch (error) {
      console.error("Error saving scheduling:", error);
      res.status(500).json({
        success: false,
        message: "Failed to save scheduling",
        error: error.message,
      });
    }
  }
);

/**
 * POST /ordermanagement/schedulings/:id/approve-batch
 * Finance approves selected scheduling details (partial approval)
 * Requires: scheduling:approve permission
 */
router.post(
  "/:id/approve-batch",
  authenticate,
  requireApiPermission("scheduling:approve"),
  async (req, res) => {
    try {
      const schedulingId = req.params.id;
      const { approvals, comments } = req.body;
      const userId = req.user.id;
      const userName = req.user.username || "Unknown User";

      // approvals is array of { scheduling_detail_id, approved_qty, original_qty }
      if (!approvals || !Array.isArray(approvals) || approvals.length === 0) {
        return res.status(400).json({
          success: false,
          message: "approvals array is required",
        });
      }

      // Only Finance can approve
      const Role = require("../../models/Role");
      let userRole = null;
      if (req.user.role_id) {
        if (typeof req.user.role_id === "object" && req.user.role_id.role) {
          userRole = req.user.role_id;
        } else {
          userRole = await Role.findById(req.user.role_id).lean();
        }
      }

      if (!userRole || userRole.role !== "Finance") {
        return res.status(403).json({
          success: false,
          message: "Only Finance role can approve schedulings",
        });
      }

      const scheduling = await Scheduling.findById(schedulingId);
      if (!scheduling) {
        return res.status(404).json({
          success: false,
          message: "Scheduling not found",
        });
      }

      // Process approvals with partial quantities
      let approvedCount = 0;
      let totalApprovedQty = 0;
      let totalRejectedQty = 0;

      approvals.forEach((approval) => {
        const detail = scheduling.scheduling_details.find(
          (d) => d._id.toString() === approval.scheduling_detail_id
        );

        if (detail) {
          const approvedQty = approval.approved_qty;
          const rejectedQty = approval.original_qty - approvedQty;

          // Update the detail with approved quantity
          detail.delivery_qty = approvedQty;
          detail.approval_status = "Approved";
          detail.approved_by = userId;
          detail.approved_at = new Date();

          totalApprovedQty += approvedQty;
          totalRejectedQty += rejectedQty;
          approvedCount++;

          // If Finance approved less than scheduled, create a rejected detail for the difference
          if (rejectedQty > 0) {
            const rejectedDetail = {
              ...detail.toObject(),
              _id: new mongoose.Types.ObjectId(),
              delivery_qty: rejectedQty,
              approval_status: "Rejected",
              approved_by: userId,
              approved_at: new Date(),
              scheduled_at: detail.scheduled_at,
            };
            scheduling.scheduling_details.push(rejectedDetail);

            // Update the item's quantities - reduce scheduled_qty and increase unscheduled_qty
            const item = scheduling.items.find(
              (i) => i.item_id.toString() === detail.item_id.toString()
            );
            if (item) {
              item.scheduled_qty -= rejectedQty;
              item.unscheduled_qty += rejectedQty;
            }
          }
        }
      });

      if (approvedCount === 0) {
        return res.status(400).json({
          success: false,
          message: "No matching scheduling details found",
        });
      }

      // Check if all scheduling details are now approved
      const allApproved = scheduling.scheduling_details.every(
        (detail) => detail.approval_status === "Approved"
      );

      if (allApproved) {
        scheduling.current_status = "Approved";
      }

      scheduling.scheduling_status.push({
        status: allApproved ? "Approved" : "Partially Approved",
        date: new Date(),
        performed_by: userId,
        comments: comments || `Batch approval: ${approvedCount} items approved`,
      });

      await scheduling.save();

      // Update DO status if fully approved
      if (allApproved) {
        const order = await DemandOrder.findById(scheduling.order_id);
        if (order) {
          const validStatuses = ["scheduling_completed", "scheduling_in_progress"];
          if (validStatuses.includes(order.status)) {
            order.status = "approved";
            order.approval_history.push({
              action: "approve",
              performed_by: userId,
              performed_by_name: userName,
              performed_by_role: "Finance",
              from_status: order.status,
              to_status: "approved",
              comments: comments || "All scheduling items approved by Finance",
              timestamp: new Date(),
            });
            await order.save();
          }
        }
      }

      res.json({
        success: true,
        message: `${approvedCount} item(s) approved successfully (${totalApprovedQty} total qty approved${totalRejectedQty > 0 ? `, ${totalRejectedQty} qty rejected` : ""})`,
        data: {
          approved_count: approvedCount,
          total_approved_qty: totalApprovedQty,
          total_rejected_qty: totalRejectedQty,
          all_approved: allApproved,
          current_status: scheduling.current_status,
        },
      });
    } catch (error) {
      console.error("Error in batch approval:", error);
      res.status(500).json({
        success: false,
        message: "Failed to approve selected items",
        error: error.message,
      });
    }
  }
);

/**
 * POST /ordermanagement/schedulings/:id/approve
 * Finance approves a scheduling
 * Requires: scheduling:approve permission
 */
router.post(
  "/:id/approve",
  authenticate,
  requireApiPermission("scheduling:approve"),
  async (req, res) => {
    try {
      const schedulingId = req.params.id;
      const { comments } = req.body;
      const userId = req.user.id;
      const userName = req.user.username || "Unknown User";

      // Only Finance can approve
      const Role = require("../../models/Role");
      let userRole = null;
      if (req.user.role_id) {
        if (typeof req.user.role_id === "object" && req.user.role_id.role) {
          userRole = req.user.role_id;
        } else {
          userRole = await Role.findById(req.user.role_id).lean();
        }
      }

      if (!userRole || userRole.role !== "Finance") {
        return res.status(403).json({
          success: false,
          message: "Only Finance role can approve schedulings",
        });
      }

      const scheduling = await Scheduling.findById(schedulingId);
      if (!scheduling) {
        return res.status(404).json({
          success: false,
          message: "Scheduling not found",
        });
      }

      if (scheduling.current_status === "Approved") {
        return res.status(400).json({
          success: false,
          message: "Scheduling is already approved",
        });
      }

      // Update status
      scheduling.current_status = "Approved";
      scheduling.scheduling_status.push({
        status: "Approved",
        date: new Date(),
        performed_by: userId,
        comments: comments || "Approved by Finance",
      });

      await scheduling.save();

      // Update DO status to approved if all items scheduled and approved
      const order = await DemandOrder.findById(scheduling.order_id);
      if (!order) {
        return res.status(404).json({
          success: false,
          message: "Demand order not found",
        });
      }

      const validStatuses = ["scheduling_completed", "scheduling_in_progress"];
      if (validStatuses.includes(order.status)) {
        order.status = "approved";
        order.approval_history.push({
          action: "approve",
          performed_by: userId,
          performed_by_name: userName,
          performed_by_role: "Finance",
          from_status: order.status,
          to_status: "approved",
          comments: comments || "Scheduling approved by Finance",
          timestamp: new Date(),
        });
        await order.save();
      }

      res.json({
        success: true,
        message: "Scheduling approved successfully",
        data: scheduling,
      });
    } catch (error) {
      console.error("Error approving scheduling:", error);
      res.status(500).json({
        success: false,
        message: "Failed to approve scheduling",
        error: error.message,
      });
    }
  }
);

/**
 * POST /ordermanagement/schedulings/:id/reject
 * Finance rejects a scheduling
 * Requires: scheduling:approve permission
 */
router.post(
  "/:id/reject",
  authenticate,
  requireApiPermission("scheduling:approve"),
  async (req, res) => {
    try {
      const schedulingId = req.params.id;
      const { comments } = req.body;
      const userId = req.user.id;

      if (!comments || !comments.trim()) {
        return res.status(400).json({
          success: false,
          message: "Rejection reason is required",
        });
      }

      // Only Finance can reject
      const Role = require("../../models/Role");
      let userRole = null;
      if (req.user.role_id) {
        if (typeof req.user.role_id === "object" && req.user.role_id.role) {
          userRole = req.user.role_id;
        } else {
          userRole = await Role.findById(req.user.role_id).lean();
        }
      }

      if (!userRole || userRole.role !== "Finance") {
        return res.status(403).json({
          success: false,
          message: "Only Finance role can reject schedulings",
        });
      }

      const scheduling = await Scheduling.findById(schedulingId);
      if (!scheduling) {
        return res.status(404).json({
          success: false,
          message: "Scheduling not found",
        });
      }

      // Update status
      scheduling.current_status = "Rejected";
      scheduling.scheduling_status.push({
        status: "Rejected",
        date: new Date(),
        performed_by: userId,
        comments: comments,
      });

      // Reset quantities back to unscheduled
      for (const item of scheduling.items) {
        item.unscheduled_qty = item.order_qty;
        item.scheduled_qty = 0;
      }

      // Clear scheduling details
      scheduling.scheduling_details = [];

      await scheduling.save();

      // Update DO status back to forwarded_to_distribution
      const order = await DemandOrder.findById(scheduling.order_id);
      if (order) {
        order.status = "forwarded_to_distribution";
        order.approval_history.push({
          action: "reject_scheduling",
          performed_by: userId,
          performed_by_name: req.user.username || "Unknown User",
          performed_by_role: "Finance",
          from_status: order.status,
          to_status: "forwarded_to_distribution",
          comments: comments,
          timestamp: new Date(),
        });
        await order.save();
      }

      res.json({
        success: true,
        message: "Scheduling rejected successfully",
        data: scheduling,
      });
    } catch (error) {
      console.error("Error rejecting scheduling:", error);
      res.status(500).json({
        success: false,
        message: "Failed to reject scheduling",
        error: error.message,
      });
    }
  }
);

module.exports = router;
