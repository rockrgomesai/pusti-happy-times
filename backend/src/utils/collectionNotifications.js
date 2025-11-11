/**
 * Collection Notification Helpers
 * Creates and sends notifications for collection approval workflow
 */

const Notification = require("../models/Notification");
const User = require("../models/User");

/**
 * Format currency for display
 */
const formatCurrency = (amount) => {
  return new Intl.NumberFormat("en-BD", {
    style: "currency",
    currency: "BDT",
    minimumFractionDigits: 2,
  }).format(amount);
};

/**
 * Notify distributor about collection status change
 * @param {Object} collection - Collection document
 * @param {String} action - Action taken (forwarded, cancelled, approved)
 * @param {String} actionBy - Name/role of person who took action
 * @param {String} comments - Optional comments
 */
async function notifyDistributor(collection, action, actionBy, comments = "") {
  try {
    await collection.populate("distributor_id");

    if (!collection.distributor_id || !collection.distributor_id.user_id) {
      console.log("⚠️  No distributor user found for collection:", collection._id);
      return null;
    }

    let title, message, priority;

    switch (action) {
      case "forwarded":
        title = `Payment ${collection.transaction_id} Forwarded`;
        message = `Your payment of ${formatCurrency(collection.deposit_amount)} has been forwarded for approval. Current status: ${getStatusLabel(collection.approval_status)}`;
        priority = "normal";
        break;

      case "returned":
        title = `Payment ${collection.transaction_id} Returned for Rework`;
        message = `Your payment of ${formatCurrency(collection.deposit_amount)} has been returned to Sales Admin for rework by ${actionBy}. Reason: ${comments || "No reason provided"}`;
        priority = "high";
        break;

      case "cancelled":
        title = `Payment ${collection.transaction_id} Cancelled`;
        message = `Your payment of ${formatCurrency(collection.deposit_amount)} has been cancelled by ${actionBy}. Reason: ${comments || "No reason provided"}`;
        priority = "high";
        break;

      case "approved":
        title = `Payment ${collection.transaction_id} Approved`;
        message = `Your payment of ${formatCurrency(collection.deposit_amount)} has been approved and credited to your account. Thank you!`;
        priority = "high";
        break;

      default:
        console.log("⚠️  Unknown action:", action);
        return null;
    }

    const notification = await Notification.create({
      user_id: collection.distributor_id.user_id,
      type: "collection",
      title,
      message,
      priority,
      collection_id: collection._id,
      action_url: `/ordermanagement/collections/${collection._id}`,
      action_label: "View Payment",
      metadata: {
        transaction_id: collection.transaction_id,
        deposit_amount: collection.deposit_amount,
        approval_status: collection.approval_status,
        action,
        action_by: actionBy,
        comments,
      },
    });

    console.log(
      `✅ Notification sent to distributor for collection ${collection.transaction_id}: ${action}`
    );
    return notification;
  } catch (error) {
    console.error("❌ Error notifying distributor:", error);
    return null;
  }
}

/**
 * Notify next handler when collection is forwarded to them
 * Territory-based filtering:
 * - ASM: Filter by area_ids matching distributor's area
 * - RSM: Filter by region_ids matching distributor's region
 * - ZSM: Filter by zone_ids matching distributor's zone
 * - Sales Admin/Order Management/Finance: ALL users with role (not territory-filtered)
 *
 * @param {Object} collection - Collection document
 * @param {String} nextRole - Role of next handler
 * @param {String} forwardedBy - Name/role of person who forwarded
 * @param {String} comments - Optional comments
 */
async function notifyNextHandler(collection, nextRole, forwardedBy, comments = "") {
  try {
    const Role = require("../models/Role");
    const Employee = require("../models/Employee");

    const role = await Role.findOne({ role: nextRole });

    if (!role) {
      console.log("⚠️  Role not found:", nextRole);
      return [];
    }

    let users = [];

    // Territory-based roles: ASM, RSM, ZSM
    if (["ASM", "RSM", "ZSM"].includes(nextRole)) {
      // Populate distributor → db_point → ancestors to get territory hierarchy
      await collection.populate({
        path: "distributor_id",
        populate: {
          path: "db_point_id",
          populate: "ancestors",
        },
      });

      const dbPoint = collection.distributor_id?.db_point_id;

      if (!dbPoint || !dbPoint.ancestors || dbPoint.ancestors.length === 0) {
        console.log("⚠️  No territory hierarchy found for collection:", collection._id);
        return [];
      }

      // Extract area, region, zone from ancestors
      // ancestors array: [zone (level 0), region (level 1), area (level 2)]
      const zone = dbPoint.ancestors.find((t) => t.type === "zone");
      const region = dbPoint.ancestors.find((t) => t.type === "region");
      const area = dbPoint.ancestors.find((t) => t.type === "area");

      // Build territory filter based on role
      let territoryFilter = {};
      let territoryName = "";

      if (nextRole === "ASM" && area) {
        territoryFilter = { "territory_assignments.area_ids": area._id };
        territoryName = area.name;
      } else if (nextRole === "RSM" && region) {
        territoryFilter = { "territory_assignments.region_ids": region._id };
        territoryName = region.name;
      } else if (nextRole === "ZSM" && zone) {
        territoryFilter = { "territory_assignments.zone_ids": zone._id };
        territoryName = zone.name;
      } else {
        console.log(
          `⚠️  No ${nextRole === "ASM" ? "area" : nextRole === "RSM" ? "region" : "zone"} found in territory hierarchy`
        );
        return [];
      }

      // Find employees with matching territory assignments and active status
      const employees = await Employee.find({
        ...territoryFilter,
        status: "Active",
      }).lean();

      if (employees.length === 0) {
        console.log(`⚠️  No active ${nextRole} employees found for territory: ${territoryName}`);
        return [];
      }

      const employeeIds = employees.map((e) => e._id);

      // Find users for those employees with matching role
      users = await User.find({
        employee_id: { $in: employeeIds },
        role_id: role._id,
        status: "active",
      });

      console.log(
        `📍 Territory-based routing: ${nextRole} in ${territoryName} - Found ${users.length} user(s)`
      );
    } else {
      // Non-territory roles: Sales Admin, Order Management, Finance
      // Notify ALL users with the role
      users = await User.find({
        role_id: role._id,
        status: "active",
      });

      console.log(
        `🌐 Global role: ${nextRole} - Found ${users.length} user(s) (all users with role)`
      );
    }

    if (users.length === 0) {
      console.log("⚠️  No active users found with role:", nextRole);
      return [];
    }

    const title = `New Payment for Review: ${collection.transaction_id}`;
    const message = `A payment of ${formatCurrency(collection.deposit_amount)} has been forwarded to you for review by ${forwardedBy}. ${comments ? `Note: ${comments}` : ""}`;

    const notifications = users.map((user) => ({
      user_id: user._id,
      type: "collection",
      title,
      message,
      priority: "normal",
      collection_id: collection._id,
      action_url: `/ordermanagement/collections/${collection._id}`,
      action_label: "Review Payment",
      target_role: nextRole,
      metadata: {
        transaction_id: collection.transaction_id,
        deposit_amount: collection.deposit_amount,
        approval_status: collection.approval_status,
        forwarded_by: forwardedBy,
        comments,
      },
    }));

    const created = await Notification.insertMany(notifications);
    console.log(
      `✅ Notified ${created.length} ${nextRole} user(s) about collection ${collection.transaction_id}`
    );
    return created;
  } catch (error) {
    console.error("❌ Error notifying next handler:", error);
    return [];
  }
}

/**
 * Get human-readable status label
 */
function getStatusLabel(status) {
  const labels = {
    pending: "Pending Review",
    forwarded_to_area_manager: "With Area Sales Manager",
    forwarded_to_regional_manager: "With Regional Sales Manager",
    forwarded_to_zonal_manager_and_sales_admin: "With Zonal Manager & Sales Admin",
    returned_to_sales_admin: "Returned to Sales Admin for Rework",
    forwarded_to_order_management: "With Order Management",
    forwarded_to_finance: "With Finance",
    approved: "Approved",
    cancelled: "Cancelled",
  };
  return labels[status] || status;
}

/**
 * Notify distributor when collection is edited
 * @param {Object} collection - Collection document
 * @param {String} editedBy - Name/role of person who edited
 * @param {String} comments - Edit comments
 */
async function notifyDistributorOfEdit(collection, editedBy, comments = "") {
  try {
    await collection.populate("distributor_id");

    if (!collection.distributor_id || !collection.distributor_id.user_id) {
      console.log("⚠️  No distributor user found for collection:", collection._id);
      return null;
    }

    const notification = await Notification.create({
      user_id: collection.distributor_id.user_id,
      type: "collection",
      title: `Payment ${collection.transaction_id} Updated`,
      message: `Your payment has been updated by ${editedBy}. ${comments ? `Note: ${comments}` : ""}`,
      priority: "normal",
      collection_id: collection._id,
      action_url: `/ordermanagement/collections/${collection._id}`,
      action_label: "View Changes",
      metadata: {
        transaction_id: collection.transaction_id,
        edited_by: editedBy,
        comments,
      },
    });

    console.log(`✅ Notification sent to distributor about edit: ${collection.transaction_id}`);
    return notification;
  } catch (error) {
    console.error("❌ Error notifying distributor of edit:", error);
    return null;
  }
}

module.exports = {
  notifyDistributor,
  notifyNextHandler,
  notifyDistributorOfEdit,
  getStatusLabel,
};
