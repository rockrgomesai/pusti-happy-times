/**
 * Notification Service
 * Handles creating notifications and computing eligible distributors for offers
 */

const Notification = require("../models/Notification");
const { Distributor, Territory, User } = require("../models");
const Offer = require("../models/Offer");

class NotificationService {
  /**
   * Compute eligible distributors for an offer based on territories and segments
   * Uses dynamic querying - does NOT store distributor IDs in offer
   */
  async getEligibleDistributors(offer) {
    try {
      const query = { active: true };

      // Filter by product segments
      if (offer.product_segments && offer.product_segments.length > 0) {
        query.product_segment = { $in: offer.product_segments };
      }

      // Build territory filter if not all zones
      const { territories } = offer;

      if (territories) {
        const territoryIds = [];

        // Collect all selected territory IDs
        if (territories.zones?.ids && territories.zones.ids.length > 0) {
          territoryIds.push(...territories.zones.ids);
        }
        if (territories.regions?.ids && territories.regions.ids.length > 0) {
          territoryIds.push(...territories.regions.ids);
        }
        if (territories.areas?.ids && territories.areas.ids.length > 0) {
          territoryIds.push(...territories.areas.ids);
        }
        if (territories.db_points?.ids && territories.db_points.ids.length > 0) {
          territoryIds.push(...territories.db_points.ids);
        }

        // If specific territories are selected, find all DB points within them
        if (territoryIds.length > 0) {
          // Find all DB points that are children of selected territories
          const dbPoints = await Territory.find({
            $or: [
              // Direct match (if DB point is selected)
              { _id: { $in: territoryIds }, type: "db_point" },
              // Parent match (DB point's parent is selected)
              { parent_id: { $in: territoryIds }, type: "db_point" },
              // Ancestor match (any ancestor is selected)
              { ancestors: { $in: territoryIds }, type: "db_point" },
            ],
            active: true,
          }).select("_id");

          const dbPointIds = dbPoints.map((d) => d._id);

          // Check territory selection mode
          if (
            territories.zones?.mode === "exclude" ||
            territories.regions?.mode === "exclude" ||
            territories.areas?.mode === "exclude" ||
            territories.db_points?.mode === "exclude"
          ) {
            // Exclude mode: find distributors NOT in these DB points
            query.db_point_id = { $nin: dbPointIds };
          } else {
            // Include mode (default): find distributors in these DB points
            query.db_point_id = { $in: dbPointIds };
          }
        }
      }

      // Handle distributor-specific inclusion/exclusion
      if (offer.distributors?.ids && offer.distributors.ids.length > 0) {
        if (offer.distributors.mode === "exclude") {
          query._id = { $nin: offer.distributors.ids };
        } else {
          // Include mode - override territory filter
          query._id = { $in: offer.distributors.ids };
        }
      }

      // Fetch distributors with user_id populated
      const distributors = await Distributor.find(query)
        .select("_id name db_point_id product_segment user_id")
        .populate("user_id", "_id")
        .lean();

      return distributors;
    } catch (error) {
      console.error("Error computing eligible distributors:", error);
      throw error;
    }
  }

  /**
   * Create notifications for all eligible distributors when an offer is created
   */
  async notifyOfferCreated(offer) {
    try {
      console.log(`\n📢 Creating notifications for offer: ${offer.name}`);

      // Get eligible distributors
      const distributors = await this.getEligibleDistributors(offer);
      console.log(`✅ Found ${distributors.length} eligible distributors`);

      if (distributors.length === 0) {
        console.log("⚠️  No eligible distributors found");
        return { created: 0, failed: 0 };
      }

      // Filter out distributors without user accounts
      const distributorsWithUsers = distributors.filter((d) => d.user_id);
      console.log(`✅ ${distributorsWithUsers.length} distributors have user accounts`);

      if (distributorsWithUsers.length === 0) {
        console.log("⚠️  No distributors with user accounts found");
        return { created: 0, failed: 0 };
      }

      // Calculate expiry (notifications expire 7 days after offer ends)
      const expiresAt = new Date(offer.end_date);
      expiresAt.setDate(expiresAt.getDate() + 7);

      // Prepare notifications
      const notifications = distributorsWithUsers.map((distributor) => ({
        user_id: distributor.user_id._id,
        type: "offer",
        title: "New Offer Available",
        message: `${offer.name} is now available. Valid until ${new Date(offer.end_date).toLocaleDateString()}.`,
        offer_id: offer._id,
        action_url: `/distributor/offers/${offer._id}`,
        action_label: "View Offer",
        metadata: {
          offer_type: offer.offer_type,
          product_segments: offer.product_segments,
          discount_percentage: offer.config?.discountPercentage || null,
        },
        expires_at: expiresAt,
        read: false,
      }));

      // Bulk create notifications (batch processing for efficiency)
      const batchSize = 500;
      let created = 0;
      let failed = 0;

      for (let i = 0; i < notifications.length; i += batchSize) {
        const batch = notifications.slice(i, i + batchSize);
        try {
          const result = await Notification.bulkCreate(batch);
          created += result.length;
          console.log(
            `✅ Created ${result.length} notifications (batch ${Math.floor(i / batchSize) + 1})`
          );
        } catch (error) {
          console.error(
            `❌ Failed to create batch ${Math.floor(i / batchSize) + 1}:`,
            error.message
          );
          failed += batch.length;
        }
      }

      console.log(`\n📊 Notification Summary:`);
      console.log(`   - Total eligible: ${distributorsWithUsers.length}`);
      console.log(`   - Created: ${created}`);
      console.log(`   - Failed: ${failed}`);

      return { created, failed, total: distributorsWithUsers.length };
    } catch (error) {
      console.error("❌ Error in notifyOfferCreated:", error);
      throw error;
    }
  }

  /**
   * Get unread notifications for a user
   */
  async getUnreadNotifications(userId, limit = 50) {
    try {
      return await Notification.find({ user_id: userId, read: false })
        .populate("offer_id", "name offer_type start_date end_date status")
        .sort({ createdAt: -1 })
        .limit(limit)
        .lean();
    } catch (error) {
      console.error("Error fetching unread notifications:", error);
      throw error;
    }
  }

  /**
   * Get all notifications for a user (paginated)
   */
  async getAllNotifications(userId, page = 1, limit = 20) {
    try {
      const skip = (page - 1) * limit;

      const [notifications, total] = await Promise.all([
        Notification.find({ user_id: userId })
          .populate("offer_id", "name offer_type start_date end_date status")
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limit)
          .lean(),
        Notification.countDocuments({ user_id: userId }),
      ]);

      return {
        notifications,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit),
        },
      };
    } catch (error) {
      console.error("Error fetching all notifications:", error);
      throw error;
    }
  }

  /**
   * Mark notification as read
   */
  async markAsRead(notificationId, userId) {
    try {
      const notification = await Notification.findOne({
        _id: notificationId,
        user_id: userId,
      });

      if (!notification) {
        throw new Error("Notification not found");
      }

      return await notification.markAsRead();
    } catch (error) {
      console.error("Error marking notification as read:", error);
      throw error;
    }
  }

  /**
   * Mark all notifications as read for a user
   */
  async markAllAsRead(userId) {
    try {
      return await Notification.markAllAsRead(userId);
    } catch (error) {
      console.error("Error marking all notifications as read:", error);
      throw error;
    }
  }

  /**
   * Get unread count for a user
   */
  async getUnreadCount(userId) {
    try {
      return await Notification.getUnreadCount(userId);
    } catch (error) {
      console.error("Error getting unread count:", error);
      throw error;
    }
  }

  /**
   * Delete old read notifications (cleanup task)
   */
  async deleteOldReadNotifications(daysOld = 30) {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysOld);

      const result = await Notification.deleteMany({
        read: true,
        read_at: { $lt: cutoffDate },
      });

      console.log(`🧹 Deleted ${result.deletedCount} old read notifications`);
      return result.deletedCount;
    } catch (error) {
      console.error("Error deleting old notifications:", error);
      throw error;
    }
  }
}

module.exports = new NotificationService();
