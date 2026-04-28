/**
 * Sidebar Menu Item Routes
 * Pusti Happy Times - Sidebar Menu Management Endpoints
 *
 * This file contains all sidebar menu item-related routes including
 * CRUD operations with proper authentication and authorization.
 *
 * Features:
 * - Full CRUD operations for sidebar menu items
 * - Hierarchical menu structure support
 * - Role-based access control
 * - API permission validation
 * - Menu ordering and organization
 */

const express = require("express");
const { body, validationResult, param } = require("express-validator");
const { SidebarMenuItem, RoleSidebarMenuItem } = require("../models");
const { authenticate, requireApiPermission } = require("../middleware/auth");

const router = express.Router();

/**
 * Validation Rules
 */

// Menu item validation rules
const menuItemValidation = [
  body("label")
    .trim()
    .notEmpty()
    .withMessage("Label is required")
    .isLength({ min: 1, max: 100 })
    .withMessage("Label must be between 1 and 100 characters"),

  body("href")
    .trim()
    .notEmpty()
    .withMessage("Href is required")
    .isLength({ min: 1, max: 200 })
    .withMessage("Href must be between 1 and 200 characters"),

  body("m_order").isInt({ min: 0 }).withMessage("Order must be a non-negative integer"),

  body("icon")
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage("Icon must be at most 100 characters"),

  body("parent_id")
    .optional()
    .custom((value) => {
      if (value && !value.match(/^[0-9a-fA-F]{24}$/)) {
        throw new Error("Parent ID must be a valid MongoDB ObjectId");
      }
      return true;
    }),

  body("is_submenu").isBoolean().withMessage("is_submenu must be a boolean"),
];

// ID parameter validation
const idValidation = [param("id").isMongoId().withMessage("Invalid menu item ID format")];

/**
 * Helper Functions
 */

/**
 * Handle validation errors
 */
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: "Validation error",
      errors: errors.array(),
    });
  }
  next();
};

/**
 * Build hierarchical menu structure
 */
const buildMenuHierarchy = (menuItems) => {
  const menuMap = new Map();
  const rootItems = [];

  // Create a map of all items
  menuItems.forEach((item) => {
    const base = typeof item.toObject === "function" ? item.toObject() : item; // support lean objects
    if (!base || !base._id) {
      console.warn("[user-menu] Skipping item without _id during map build:", base);
      return;
    }
    menuMap.set(base._id.toString(), { ...base, children: [] });
  });

  // Build hierarchy
  menuItems.forEach((item) => {
    if (!item || !item._id) {
      console.warn("[user-menu] Skipping hierarchy item without _id:", item);
      return;
    }
    const key = item._id.toString();
    const menuItem = menuMap.get(key);
    if (!menuItem) {
      console.warn("[user-menu] Item missing in map (possibly skipped earlier):", key);
      return;
    }

    if (item.parent_id) {
      // Handle both populated and non-populated parent_id
      const parentId = item.parent_id._id
        ? item.parent_id._id.toString()
        : item.parent_id.toString();
      const parent = menuMap.get(parentId);
      if (parent) {
        parent.children.push(menuItem);
      } else {
        // Parent not found, treat as root item
        rootItems.push(menuItem);
      }
    } else {
      rootItems.push(menuItem);
    }
  });

  // Sort items by order
  const sortByOrder = (items) => {
    items.sort((a, b) => a.m_order - b.m_order);
    items.forEach((item) => {
      if (item.children.length > 0) {
        sortByOrder(item.children);
      }
    });
  };

  sortByOrder(rootItems);
  return rootItems;
};

/**
 * Routes
 */

/**
 * @route   GET /api/menu-items
 * @desc    Get all sidebar menu items
 * @access  Private - requires read:menu permission
 */
router.get("/", authenticate, requireApiPermission("read:menu"), async (req, res) => {
  try {
    const { hierarchical = "false", sort = "m_order" } = req.query;

    // Get all menu items
    const menuItems = await SidebarMenuItem.find({})
      .populate("parent_id", "label")
      .sort({ [sort]: 1 });

    let responseData;

    if (hierarchical === "true") {
      // Return hierarchical structure
      responseData = buildMenuHierarchy(menuItems);
    } else {
      // Return flat list
      responseData = menuItems;
    }

    res.json({
      success: true,
      data: responseData,
      total: menuItems.length,
    });
  } catch (error) {
    console.error("Error fetching menu items:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching menu items",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
});

/**
 * @route   GET /api/menu-items/user-menu
 * @desc    Get menu items for current user based on role permissions
 * @access  Private
 */
router.get("/user-menu", authenticate, async (req, res) => {
  try {
    // Extract role ID - handle both populated and non-populated cases
    const userRoleId = req.user.role_id?._id || req.user.role_id;

    if (!userRoleId) {
      return res.status(403).json({
        success: false,
        message: "User role not found",
        code: "ROLE_NOT_FOUND",
      });
    }

    // Get menu items accessible to user's role
    const roleMenuItems = await RoleSidebarMenuItem.find({
      role_id: userRoleId,
    })
      .populate({
        path: "sidebar_menu_item_id",
        populate: {
          path: "parent_id",
          select: "label",
        },
      })
      .lean();

    // Extract populated menu item documents, filter out any null (dangling assignments).
    // Apply per-role m_order override (set by SuperAdmin via drag-and-drop on the
    // permissions page) so the sidebar respects the role-specific ordering.
    const menuItems = roleMenuItems
      .map((link) => {
        const item = link.sidebar_menu_item_id;
        if (!item) return null;
        if (link.m_order != null) {
          item.m_order = link.m_order;
        }
        return item;
      })
      .filter(Boolean);

    console.log(
      "[user-menu] role:",
      userRoleId.toString(),
      "assignments:",
      roleMenuItems.length,
      "resolved items:",
      menuItems.length
    );
    if (menuItems.length) {
      console.log("[user-menu] sample item keys:", Object.keys(menuItems[0]));
    }

    if (menuItems.length === 0) {
      return res.json({ success: true, data: [] });
    }

    // Build hierarchical menu structure with defensive guard
    let safeHierarchy = [];
    try {
      safeHierarchy = buildMenuHierarchy(menuItems);
    } catch (hierErr) {
      console.error("[user-menu] Hierarchy build failed:", hierErr);
      return res.status(500).json({
        success: false,
        message: "Failed to build menu hierarchy",
        code: "HIERARCHY_ERROR",
      });
    }

    res.json({
      success: true,
      data: safeHierarchy,
    });
  } catch (error) {
    console.error("Error fetching user menu:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching user menu",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
});

/**
 * @route   GET /api/menu-items/:id
 * @desc    Get menu item by ID
 * @access  Private - requires read:menu permission
 */
router.get(
  "/:id",
  authenticate,
  requireApiPermission("read:menu"),
  idValidation,
  handleValidationErrors,
  async (req, res) => {
    try {
      const menuItem = await SidebarMenuItem.findById(req.params.id).populate("parent_id", "label");

      if (!menuItem) {
        return res.status(404).json({
          success: false,
          message: "Menu item not found",
        });
      }

      // Get children if any
      const children = await SidebarMenuItem.find({
        parent_id: req.params.id,
      }).sort({ m_order: 1 });

      res.json({
        success: true,
        data: {
          ...menuItem.toObject(),
          children,
        },
      });
    } catch (error) {
      console.error("Error fetching menu item:", error);
      res.status(500).json({
        success: false,
        message: "Error fetching menu item",
        error: process.env.NODE_ENV === "development" ? error.message : undefined,
      });
    }
  }
);

/**
 * @route   POST /api/menu-items
 * @desc    Create new menu item
 * @access  Private - requires create:menu permission
 */
router.post(
  "/",
  authenticate,
  requireApiPermission("create:menu"),
  menuItemValidation,
  handleValidationErrors,
  async (req, res) => {
    try {
      const { label, href, m_order, icon, parent_id, is_submenu } = req.body;

      // If parent_id is provided, verify it exists
      if (parent_id) {
        const parentItem = await SidebarMenuItem.findById(parent_id);
        if (!parentItem) {
          return res.status(400).json({
            success: false,
            message: "Parent menu item not found",
          });
        }
      }

      // Check if href already exists
      const existingItem = await SidebarMenuItem.findOne({ href });
      if (existingItem) {
        return res.status(400).json({
          success: false,
          message: "Menu item with this href already exists",
        });
      }

      // Create new menu item
      const newMenuItem = new SidebarMenuItem({
        label,
        href,
        m_order,
        icon: icon || null,
        parent_id: parent_id || null,
        is_submenu,
      });

      await newMenuItem.save();

      // Populate parent reference for response
      await newMenuItem.populate("parent_id", "label");

      res.status(201).json({
        success: true,
        message: "Menu item created successfully",
        data: newMenuItem,
      });
    } catch (error) {
      console.error("Error creating menu item:", error);

      // Handle duplicate key errors
      if (error.code === 11000) {
        const field = Object.keys(error.keyPattern)[0];
        return res.status(400).json({
          success: false,
          message: `${field} already exists`,
        });
      }

      res.status(500).json({
        success: false,
        message: "Error creating menu item",
        error: process.env.NODE_ENV === "development" ? error.message : undefined,
      });
    }
  }
);

/**
 * @route   PUT /api/menu-items/:id
 * @desc    Update menu item
 * @access  Private - requires update:menu permission
 */
router.put(
  "/:id",
  authenticate,
  requireApiPermission("update:menu"),
  idValidation,
  menuItemValidation,
  handleValidationErrors,
  async (req, res) => {
    try {
      const { label, href, m_order, icon, parent_id, is_submenu } = req.body;

      // Check if menu item exists
      const existingMenuItem = await SidebarMenuItem.findById(req.params.id);
      if (!existingMenuItem) {
        return res.status(404).json({
          success: false,
          message: "Menu item not found",
        });
      }

      // If parent_id is provided, verify it exists and prevent circular reference
      if (parent_id) {
        if (parent_id === req.params.id) {
          return res.status(400).json({
            success: false,
            message: "Menu item cannot be its own parent",
          });
        }

        const parentItem = await SidebarMenuItem.findById(parent_id);
        if (!parentItem) {
          return res.status(400).json({
            success: false,
            message: "Parent menu item not found",
          });
        }

        // Check for circular reference (prevent setting a child as parent)
        let checkParent = parentItem;
        while (checkParent.parent_id) {
          if (checkParent.parent_id.toString() === req.params.id) {
            return res.status(400).json({
              success: false,
              message: "Cannot create circular reference in menu hierarchy",
            });
          }
          checkParent = await SidebarMenuItem.findById(checkParent.parent_id);
          if (!checkParent) break;
        }
      }

      // Check if href already exists (excluding current item)
      const duplicateItem = await SidebarMenuItem.findOne({
        href,
        _id: { $ne: req.params.id },
      });
      if (duplicateItem) {
        return res.status(400).json({
          success: false,
          message: "Menu item with this href already exists",
        });
      }

      // Update menu item
      const updatedMenuItem = await SidebarMenuItem.findByIdAndUpdate(
        req.params.id,
        {
          label,
          href,
          m_order,
          icon: icon || null,
          parent_id: parent_id || null,
          is_submenu,
        },
        {
          new: true,
          runValidators: true,
        }
      ).populate("parent_id", "label");

      res.json({
        success: true,
        message: "Menu item updated successfully",
        data: updatedMenuItem,
      });
    } catch (error) {
      console.error("Error updating menu item:", error);

      // Handle duplicate key errors
      if (error.code === 11000) {
        const field = Object.keys(error.keyPattern)[0];
        return res.status(400).json({
          success: false,
          message: `${field} already exists`,
        });
      }

      res.status(500).json({
        success: false,
        message: "Error updating menu item",
        error: process.env.NODE_ENV === "development" ? error.message : undefined,
      });
    }
  }
);

/**
 * @route   DELETE /api/menu-items/:id
 * @desc    Delete menu item
 * @access  Private - requires delete:menu permission
 */
router.delete(
  "/:id",
  authenticate,
  requireApiPermission("delete:menu"),
  idValidation,
  handleValidationErrors,
  async (req, res) => {
    try {
      // Check if menu item exists
      const menuItem = await SidebarMenuItem.findById(req.params.id);
      if (!menuItem) {
        return res.status(404).json({
          success: false,
          message: "Menu item not found",
        });
      }

      // Check if menu item has children
      const childCount = await SidebarMenuItem.countDocuments({
        parent_id: req.params.id,
      });
      if (childCount > 0) {
        return res.status(400).json({
          success: false,
          message: `Cannot delete menu item. It has ${childCount} child item(s). Please delete or reassign child items first.`,
        });
      }

      // Delete role permissions for this menu item
      await RoleSidebarMenuItem.deleteMany({
        sidebar_menu_item_id: req.params.id,
      });

      // Delete menu item
      await SidebarMenuItem.findByIdAndDelete(req.params.id);

      res.json({
        success: true,
        message: "Menu item deleted successfully",
      });
    } catch (error) {
      console.error("Error deleting menu item:", error);
      res.status(500).json({
        success: false,
        message: "Error deleting menu item",
        error: process.env.NODE_ENV === "development" ? error.message : undefined,
      });
    }
  }
);

/**
 * @route   POST /api/menu-items/reorder
 * @desc    Reorder menu items
 * @access  Private - requires update:menu permission
 */
router.post(
  "/reorder",
  authenticate,
  requireApiPermission("update:menu"),
  body("items")
    .isArray()
    .withMessage("Items must be an array")
    .custom((value) => {
      if (
        !value.every(
          (item) => typeof item === "object" && item.id && typeof item.order === "number"
        )
      ) {
        throw new Error("Each item must have id and order properties");
      }
      return true;
    }),
  handleValidationErrors,
  async (req, res) => {
    try {
      const { items } = req.body;

      // Update order for each item
      const updatePromises = items.map((item) =>
        SidebarMenuItem.findByIdAndUpdate(item.id, { m_order: item.order }, { new: true })
      );

      await Promise.all(updatePromises);

      res.json({
        success: true,
        message: "Menu items reordered successfully",
      });
    } catch (error) {
      console.error("Error reordering menu items:", error);
      res.status(500).json({
        success: false,
        message: "Error reordering menu items",
        error: process.env.NODE_ENV === "development" ? error.message : undefined,
      });
    }
  }
);

module.exports = router;
