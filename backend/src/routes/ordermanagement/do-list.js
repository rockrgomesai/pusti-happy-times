/**
 * DO List Routes
 * Handles demand order list viewing with territory scoping and search
 */

const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");
const models = require("../../models");
const { authenticate, requireApiPermission } = require("../../middleware/auth");

/**
 * GET /api/v1/demandorders/do-list
 * Get demand orders with territory scoping and search filters
 *
 * Query params:
 * - search: DO number search
 * - distributor_id: Filter by distributor
 * - zone_id: Filter by zone
 * - region_id: Filter by region
 * - area_id: Filter by area
 * - status: Filter by status
 * - from_date: Start date (ISO format)
 * - to_date: End date (ISO format)
 * - page: Page number (default: 1)
 * - limit: Items per page (default: 25)
 * - sort: Sort field (default: -created_at)
 */
router.get("/do-list", authenticate, requireApiPermission("do-list:read"), async (req, res) => {
  try {
    const {
      search,
      distributor_id,
      zone_id,
      region_id,
      area_id,
      status,
      from_date,
      to_date,
      page = 1,
      limit = 25,
      sort = "-created_at",
    } = req.query;

    const { user_type, employee_type, territory_id, facility_id } = req.userContext;
    const userId = req.user._id;

    // Build query filter - include orders where user is involved OR in their territory
    const filter = {
      $or: [
        { created_by: userId },
        { current_approver_id: userId },
        { approved_by: userId },
        { "approval_history.performed_by": userId },
      ],
    };

    // Territory scoping based on user role
    const isFieldRole = ["ASM", "RSM", "TSO", "Territory Manager"].includes(req.user.role_id?.role);
    const isHQRole = ["Finance Manager", "Finance Admin", "Admin", "SuperAdmin"].includes(
      req.user.role_id?.role
    );

    if (isFieldRole && territory_id) {
      // Field users: scope by their assigned territory OR where they're in approval history
      // Get all distributors in this territory and its descendants
      const territory = await models.Territory.findById(territory_id);

      if (territory) {
        const territoryIds = [territory_id];

        // Get descendant territories
        const descendants = await models.Territory.find({
          $or: [{ ancestors: territory_id }, { _id: territory_id }],
        }).select("_id");

        const allTerritoryIds = descendants.map((t) => t._id);

        // Find distributors in these territories
        const distributors = await models.Distributor.find({
          db_point_id: { $in: allTerritoryIds },
        }).select("_id");

        if (distributors.length > 0) {
          // Add territory-based filter as another OR condition
          filter.$or.push({ distributor_id: { $in: distributors.map((d) => d._id) } });
        }
        // Don't return empty - user might have approved orders outside their current territory
      }
    }
    // HQ users see all DOs (no territory filter)

    // Apply search filters
    if (search) {
      filter.order_number = { $regex: search, $options: "i" };
    }

    if (distributor_id) {
      // If distributor filter is specified, apply it in addition to existing filters
      const distributorObjectId = mongoose.Types.ObjectId(distributor_id);
      if (filter.$or) {
        // Combine with existing $or conditions
        filter.$and = [
          { $or: filter.$or },
          { distributor_id: distributorObjectId }
        ];
        delete filter.$or;
      } else {
        filter.distributor_id = distributorObjectId;
      }
    }

    if (status) {
      filter.status = status;
    }

    // Date range filter
    if (from_date || to_date) {
      filter.created_at = {};
      if (from_date) {
        filter.created_at.$gte = new Date(from_date);
      }
      if (to_date) {
        filter.created_at.$lte = new Date(to_date);
      }
    }

    // Territory filters (zone, region, area)
    if (zone_id || region_id || area_id) {
      const territoryFilter = {};

      if (area_id) {
        territoryFilter._id = mongoose.Types.ObjectId(area_id);
      } else if (region_id) {
        territoryFilter.$or = [
          { _id: mongoose.Types.ObjectId(region_id) },
          { ancestors: mongoose.Types.ObjectId(region_id) },
        ];
      } else if (zone_id) {
        territoryFilter.$or = [
          { _id: mongoose.Types.ObjectId(zone_id) },
          { ancestors: mongoose.Types.ObjectId(zone_id) },
        ];
      }

      const territories = await models.Territory.find(territoryFilter).select("_id");
      const territoryIds = territories.map((t) => t._id);

      const distributorsInTerritory = await models.Distributor.find({
        db_point_id: { $in: territoryIds },
      }).select("_id");

      if (distributorsInTerritory.length > 0) {
        // When filtering by territory, combine with existing $or filter
        const territoryDistributorFilter = { distributor_id: { $in: distributorsInTerritory.map((d) => d._id) } };
        
        if (filter.$or) {
          // Wrap existing $or conditions with territory filter
          filter.$and = [
            { $or: filter.$or },
            territoryDistributorFilter
          ];
          delete filter.$or;
        } else {
          filter.distributor_id = territoryDistributorFilter.distributor_id;
        }
      }
    }

    // Pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const sortObj = {};

    if (sort.startsWith("-")) {
      sortObj[sort.substring(1)] = -1;
    } else {
      sortObj[sort] = 1;
    }

    // Execute query
    const [orders, total] = await Promise.all([
      models.DemandOrder.find(filter)
        .populate("distributor_id", "name erp_id")
        .populate("created_by", "username full_name")
        .populate("current_approver_id", "username full_name")
        .populate("approved_by", "username full_name")
        .sort(sortObj)
        .skip(skip)
        .limit(parseInt(limit))
        .lean(),
      models.DemandOrder.countDocuments(filter),
    ]);

    // Enhance with territory info
    for (const order of orders) {
      if (order.distributor_id) {
        const distributor = await models.Distributor.findById(order.distributor_id._id)
          .populate("db_point_id", "name territory_level ancestors")
          .lean();

        if (distributor && distributor.db_point_id) {
          const dbPoint = distributor.db_point_id;

          // Get zone, region, area from ancestors
          const ancestorTerritories = await models.Territory.find({
            _id: { $in: dbPoint.ancestors || [] },
          }).lean();

          order.territory_info = {
            db_point: {
              id: dbPoint._id,
              name: dbPoint.name,
            },
            zone: ancestorTerritories.find((t) => t.territory_level === "Zone"),
            region: ancestorTerritories.find((t) => t.territory_level === "Region"),
            area: ancestorTerritories.find((t) => t.territory_level === "Area"),
          };
        }
      }
    }

    res.json({
      success: true,
      data: {
        orders,
        pagination: {
          total,
          page: parseInt(page),
          limit: parseInt(limit),
          pages: Math.ceil(total / parseInt(limit)),
        },
        user_scope: {
          is_field_role: isFieldRole,
          is_hq_role: isHQRole,
          territory_id: territory_id || null,
        },
      },
    });
  } catch (error) {
    console.error("DO List error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch DO list",
      error: error.message,
    });
  }
});

/**
 * GET /api/v1/demandorders/my-do-list
 * Get personalized DO list for HQ users
 * Shows DOs where user is involved in approval history
 */
router.get(
  "/my-do-list",
  authenticate,
  requireApiPermission("my-do-list:read"),
  async (req, res) => {
    try {
      const {
        search,
        status,
        from_date,
        to_date,
        page = 1,
        limit = 25,
        sort = "-created_at",
      } = req.query;

      const userId = req.user._id;

      // Build query filter for "my" DOs
      const filter = {
        $or: [
          { created_by: userId },
          { current_approver_id: userId },
          { approved_by: userId },
          { "approval_history.performed_by": userId },
        ],
      };

      // Apply additional filters
      if (search) {
        filter.order_number = { $regex: search, $options: "i" };
      }

      if (status) {
        filter.status = status;
      }

      if (from_date || to_date) {
        filter.created_at = {};
        if (from_date) {
          filter.created_at.$gte = new Date(from_date);
        }
        if (to_date) {
          filter.created_at.$lte = new Date(to_date);
        }
      }

      // Pagination
      const skip = (parseInt(page) - 1) * parseInt(limit);
      const sortObj = {};

      if (sort.startsWith("-")) {
        sortObj[sort.substring(1)] = -1;
      } else {
        sortObj[sort] = 1;
      }

      // Execute query
      const [orders, total] = await Promise.all([
        models.DemandOrder.find(filter)
          .populate("distributor_id", "name erp_id")
          .populate("created_by", "username full_name")
          .populate("current_approver_id", "username full_name")
          .populate("approved_by", "username full_name")
          .sort(sortObj)
          .skip(skip)
          .limit(parseInt(limit))
          .lean(),
        models.DemandOrder.countDocuments(filter),
      ]);

      // Add user involvement info
      for (const order of orders) {
        order.my_involvement = {
          is_creator: order.created_by?._id?.toString() === userId.toString(),
          is_current_approver: order.current_approver_id?._id?.toString() === userId.toString(),
          is_approver: order.approved_by?._id?.toString() === userId.toString(),
          approval_actions:
            order.approval_history?.filter(
              (h) => h.performed_by?.toString() === userId.toString()
            ) || [],
        };
      }

      res.json({
        success: true,
        data: {
          orders,
          pagination: {
            total,
            page: parseInt(page),
            limit: parseInt(limit),
            pages: Math.ceil(total / parseInt(limit)),
          },
        },
      });
    } catch (error) {
      console.error("My DO List error:", error);
      res.status(500).json({
        success: false,
        message: "Failed to fetch my DO list",
        error: error.message,
      });
    }
  }
);

/**
 * GET /api/v1/demandorders/do-list/:id/history
 * Get detailed approval history for a specific DO
 */
router.get(
  "/do-list/:id/history",
  authenticate,
  requireApiPermission("do-list:view-history"),
  async (req, res) => {
    try {
      const { id } = req.params;

      const order = await models.DemandOrder.findById(id)
        .populate("distributor_id", "name erp_id")
        .populate("created_by", "username full_name role")
        .populate("current_approver_id", "username full_name role")
        .populate("approved_by", "username full_name role")
        .populate("rejected_by", "username full_name role")
        .populate("approval_history.performed_by", "username full_name role")
        .lean();

      if (!order) {
        return res.status(404).json({
          success: false,
          message: "Demand order not found",
        });
      }

      // Build timeline from approval history
      const timeline = order.approval_history.map((entry) => ({
        action: entry.action,
        performed_by: entry.performed_by,
        performed_by_role: entry.performed_by_role,
        from_status: entry.from_status,
        to_status: entry.to_status,
        comments: entry.comments,
        timestamp: entry.timestamp,
        changes: entry.changes,
      }));

      res.json({
        success: true,
        data: {
          order_number: order.order_number,
          current_status: order.status,
          distributor: order.distributor_id,
          created_by: order.created_by,
          created_at: order.created_at,
          timeline,
          metadata: {
            submitted_at: order.submitted_at,
            approved_at: order.approved_at,
            approved_by: order.approved_by,
            rejected_at: order.rejected_at,
            rejected_by: order.rejected_by,
            rejection_reason: order.rejection_reason,
          },
        },
      });
    } catch (error) {
      console.error("DO History error:", error);
      res.status(500).json({
        success: false,
        message: "Failed to fetch DO history",
        error: error.message,
      });
    }
  }
);

/**
 * GET /api/v1/demandorders/do-list/filters/options
 * Get filter options for search (territories, statuses)
 */
router.get(
  "/do-list/filters/options",
  authenticate,
  requireApiPermission("do-list:search"),
  async (req, res) => {
    try {
      const { user_type, employee_type, territory_id } = req.userContext;
      const isFieldRole = ["ASM", "RSM", "TSO", "Territory Manager"].includes(
        req.user.role_id?.role
      );

      let zones = [],
        regions = [],
        areas = [],
        dbPoints = [];
      const userRole = req.user.role_id?.role;

      if (isFieldRole && territory_id) {
        // Field users: Get their territory and scope based on role
        const userTerritory = await models.Territory.findById(territory_id)
          .select("_id name territory_level ancestors")
          .lean();

        if (userTerritory) {
          const userLevel = userTerritory.territory_level;

          // Get ancestor territories
          const ancestorTerritories = await models.Territory.find({
            _id: { $in: userTerritory.ancestors || [] },
          })
            .select("_id name territory_level")
            .lean();

          // Get descendant territories
          const descendantTerritories = await models.Territory.find({
            ancestors: territory_id,
          })
            .select("_id name territory_level")
            .lean();

          // Combine all territories
          const allTerritories = [userTerritory, ...ancestorTerritories, ...descendantTerritories];

          // Filter based on user's role and territory level:
          // ASM (Area Manager): Only shows Areas (their area + child areas)
          // RSM (Regional Manager): Shows Regions + Areas
          // ZSM/Zonal Manager: Shows Zones + Regions + Areas

          if (userRole === "ASM" && userLevel === "Area") {
            // ASM: Only their area and areas below them
            areas = allTerritories.filter((t) => t.territory_level === "Area");
          } else if (userRole === "RSM" && userLevel === "Region") {
            // RSM: Their region and areas below
            regions = allTerritories.filter((t) => t.territory_level === "Region");
            areas = allTerritories.filter((t) => t.territory_level === "Area");
          } else if ((userRole === "ZSM" || userRole === "Zonal Manager") && userLevel === "Zone") {
            // ZSM: Their zone, regions and areas below
            zones = allTerritories.filter((t) => t.territory_level === "Zone");
            regions = allTerritories.filter((t) => t.territory_level === "Region");
            areas = allTerritories.filter((t) => t.territory_level === "Area");
          } else {
            // Fallback: show all levels in their scope
            zones = allTerritories.filter((t) => t.territory_level === "Zone");
            regions = allTerritories.filter((t) => t.territory_level === "Region");
            areas = allTerritories.filter((t) => t.territory_level === "Area");
          }

          dbPoints = allTerritories.filter((t) => t.territory_level === "DB Point");
        }
      } else {
        // HQ users: get all territories
        const allTerritories = await models.Territory.find({})
          .select("_id name territory_level")
          .lean();

        zones = allTerritories.filter((t) => t.territory_level === "Zone");
        regions = allTerritories.filter((t) => t.territory_level === "Region");
        areas = allTerritories.filter((t) => t.territory_level === "Area");
        dbPoints = allTerritories.filter((t) => t.territory_level === "DB Point");
      }

      // Get distributors based on user scope
      let distributorFilter = {};
      if (isFieldRole && territory_id) {
        const territoryIds = [...dbPoints.map((t) => t._id), territory_id];
        distributorFilter = { db_point_id: { $in: territoryIds } };
      }

      const distributors = await models.Distributor.find(distributorFilter)
        .select("_id name erp_id")
        .sort({ name: 1 })
        .lean();

      // DO statuses
      const statuses = [
        { value: "draft", label: "Draft" },
        { value: "submitted", label: "Submitted" },
        { value: "approved", label: "Approved" },
        { value: "rejected", label: "Rejected" },
        { value: "cancelled", label: "Cancelled" },
        { value: "forwarded_to_distribution", label: "Forwarded to Distribution" },
        { value: "scheduling_in_progress", label: "Scheduling In Progress" },
        { value: "scheduling_completed", label: "Scheduling Completed" },
      ];

      res.json({
        success: true,
        data: {
          zones,
          regions,
          areas,
          dbPoints,
          distributors,
          statuses,
        },
      });
    } catch (error) {
      console.error("Filter options error:", error);
      res.status(500).json({
        success: false,
        message: "Failed to fetch filter options",
        error: error.message,
      });
    }
  }
);

module.exports = router;
