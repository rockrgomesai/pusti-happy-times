/**
 * Sidebar Menu Item Model
 * Pusti Happy Times - Navigation Menu Schema
 *
 * This model defines the structure for sidebar navigation menu items
 * with hierarchical support and permission integration.
 *
 * Database Schema: label, href, m_order, icon, parent_id, is_submenu
 */

const mongoose = require("mongoose");

/**
 * Sidebar Menu Item Schema Definition
 * Matches the actual database schema
 */
const sidebarMenuItemSchema = new mongoose.Schema(
  {
    // Menu item label/title (matches database schema)
    label: {
      type: String,
      required: [true, "Menu label is required"],
      trim: true,
    },

    // URL path for navigation (matches database schema)
    href: {
      type: String,
      required: [true, "Menu href is required"],
      trim: true,
    },

    // Menu order for display (matches database schema)
    m_order: {
      type: Number,
      required: [true, "Menu order is required"],
    },

    // Icon identifier (matches database schema)
    icon: {
      type: String,
      required: [true, "Menu icon is required"],
      trim: true,
    },

    // Parent menu item reference (matches database schema)
    parent_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "SidebarMenuItem",
      default: null,
    },

    // Submenu flag (matches database schema)
    is_submenu: {
      type: Boolean,
      required: [true, "Submenu flag is required"],
      default: false,
    },
  },
  {
    // Schema options
    timestamps: false, // Database schema doesn't include timestamps
    versionKey: false, // Disable __v field
    collection: "sidebar_menu_items", // Explicit collection name
  }
);

/**
 * Indexes for Performance Optimization
 */
// Index for menu ordering
sidebarMenuItemSchema.index({ m_order: 1 });
// Index for parent-child relationships
sidebarMenuItemSchema.index({ parent_id: 1 });

/**
 * Static Methods
 */

/**
 * Get all menu items ordered by m_order
 * @returns {Array} Array of menu items sorted by order
 */
sidebarMenuItemSchema.statics.getAllOrdered = async function () {
  try {
    return await this.find({}).sort({ m_order: 1 });
  } catch (error) {
    throw new Error(`Error fetching menu items: ${error.message}`);
  }
};

/**
 * Get top-level menu items (parent_id is null)
 * @returns {Array} Array of parent menu items
 */
sidebarMenuItemSchema.statics.getParentItems = async function () {
  try {
    return await this.find({ parent_id: null }).sort({ m_order: 1 });
  } catch (error) {
    throw new Error(`Error fetching parent menu items: ${error.message}`);
  }
};

/**
 * Get child menu items for a specific parent
 * @param {String} parentId - Parent menu item ID
 * @returns {Array} Array of child menu items
 */
sidebarMenuItemSchema.statics.getChildItems = async function (parentId) {
  try {
    return await this.find({ parent_id: parentId }).sort({ m_order: 1 });
  } catch (error) {
    throw new Error(`Error fetching child menu items: ${error.message}`);
  }
};

/**
 * Get hierarchical menu structure
 * @returns {Array} Array of menu items with nested children
 */
sidebarMenuItemSchema.statics.getHierarchicalMenu = async function () {
  try {
    const allItems = await this.find({}).sort({ m_order: 1 });
    const parentItems = allItems.filter((item) => !item.parent_id);

    return parentItems.map((parent) => {
      const children = allItems.filter(
        (item) =>
          item.parent_id && item.parent_id.toString() === parent._id.toString()
      );
      return {
        ...parent.toObject(),
        children: children,
      };
    });
  } catch (error) {
    throw new Error(`Error building hierarchical menu: ${error.message}`);
  }
};

/**
 * Find menu item by href
 * @param {String} href - The href to search for
 * @returns {Object|null} Menu item document or null
 */
sidebarMenuItemSchema.statics.findByHref = async function (href) {
  try {
    return await this.findOne({ href: href });
  } catch (error) {
    throw new Error(`Error finding menu item: ${error.message}`);
  }
};

// Export the model
module.exports = mongoose.model("SidebarMenuItem", sidebarMenuItemSchema);
