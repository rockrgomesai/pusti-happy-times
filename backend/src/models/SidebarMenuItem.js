/**
 * Sidebar Menu Item Model
 * Pusti Happy Times - Navigation Menu Schema
 * 
 * This model defines the structure for sidebar navigation menu items
 * with hierarchical support, permission integration, and dynamic routing.
 * 
 * Features:
 * - Hierarchical menu structure (parent-child relationships)
 * - Permission-based access control
 * - Dynamic route generation
 * - Icon and styling support
 * - Mobile-responsive configuration
 */

const mongoose = require('mongoose');

/**
 * Sidebar Menu Item Schema Definition
 * Defines the structure and validation rules for navigation menu items
 */
const sidebarMenuItemSchema = new mongoose.Schema({
  // Menu item title/label
  title: {
    type: String,
    required: [true, 'Menu title is required'],
    trim: true,
    minlength: [1, 'Menu title must be at least 1 character long'],
    maxlength: [100, 'Menu title cannot exceed 100 characters']
  },

  // Menu item description/tooltip
  description: {
    type: String,
    trim: true,
    maxlength: [200, 'Menu description cannot exceed 200 characters']
  },

  // URL path for navigation
  path: {
    type: String,
    trim: true,
    maxlength: [200, 'Menu path cannot exceed 200 characters'],
    validate: {
      validator: function(value) {
        if (!value) return true; // Allow null for parent menu items
        // Path should start with / and contain valid URL characters
        return /^\/[\w\-\/]*(\?[\w\-=&]*)?$/.test(value);
      },
      message: 'Menu path must be a valid URL path starting with /'
    }
  },

  // Icon configuration
  icon: {
    // Icon type (material, fontawesome, custom, etc.)
    type: {
      type: String,
      enum: ['material', 'fontawesome', 'custom', 'none'],
      default: 'material'
    },
    
    // Icon name/identifier
    name: {
      type: String,
      trim: true,
      maxlength: [50, 'Icon name cannot exceed 50 characters']
    },
    
    // Custom icon URL (for custom type)
    url: {
      type: String,
      trim: true,
      validate: {
        validator: function(value) {
          if (!value || this.icon?.type !== 'custom') return true;
          // Basic URL validation for custom icons
          return /^https?:\/\/.+/.test(value);
        },
        message: 'Custom icon URL must be a valid HTTP/HTTPS URL'
      }
    },
    
    // Icon color (hex code)
    color: {
      type: String,
      trim: true,
      validate: {
        validator: function(value) {
          if (!value) return true; // Allow null/undefined
          // Hex color code validation
          return /^#[0-9A-Fa-f]{6}$/.test(value);
        },
        message: 'Icon color must be a valid hex color code'
      }
    }
  },

  // Parent menu item for hierarchical structure
  parentMenuItem: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'SidebarMenuItem',
    default: null,
    validate: {
      validator: async function(value) {
        if (!value) return true; // Allow null for root menu items
        
        // Prevent self-reference
        if (value.toString() === this._id?.toString()) {
          return false;
        }

        // Verify parent menu exists and is active
        const SidebarMenuItem = mongoose.model('SidebarMenuItem');
        const parent = await SidebarMenuItem.findById(value);
        return parent && parent.active;
      },
      message: 'Invalid parent menu item specified'
    }
  },

  // Menu hierarchy level (0 for root items)
  level: {
    type: Number,
    default: 0,
    min: [0, 'Menu level cannot be negative'],
    max: [4, 'Menu hierarchy cannot exceed 4 levels']
  },

  // Menu item sorting order
  sortOrder: {
    type: Number,
    default: 0,
    min: [0, 'Sort order cannot be negative']
  },

  // Menu item status
  active: {
    type: Boolean,
    default: true,
    required: true
  },

  // Visibility settings
  visibility: {
    // Show in sidebar navigation
    showInSidebar: {
      type: Boolean,
      default: true
    },
    
    // Show in breadcrumbs
    showInBreadcrumb: {
      type: Boolean,
      default: true
    },
    
    // Show in mobile menu
    showInMobile: {
      type: Boolean,
      default: true
    },
    
    // Show for specific user roles (empty = show for all)
    restrictToRoles: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Role'
    }]
  },

  // Menu item behavior
  behavior: {
    // Open in new tab/window
    openInNewTab: {
      type: Boolean,
      default: false
    },
    
    // Expand by default (for parent items)
    expandByDefault: {
      type: Boolean,
      default: false
    },
    
    // Require exact path match for active state
    exactMatch: {
      type: Boolean,
      default: false
    },
    
    // External link (opens outside app)
    isExternal: {
      type: Boolean,
      default: false
    }
  },

  // Permission requirements
  permissions: {
    // Menu-level permission required to view this item
    menuPermission: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'MenuPermission',
      default: null
    },
    
    // Page-level permission required to access the route
    pagePermission: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'PagePermission',
      default: null
    },
    
    // Additional permission checks
    requireAllPermissions: {
      type: Boolean,
      default: false // If true, user must have both menu and page permissions
    }
  },

  // Styling and appearance
  styling: {
    // Custom CSS classes
    cssClasses: [{
      type: String,
      trim: true,
      maxlength: [50, 'CSS class name cannot exceed 50 characters']
    }],
    
    // Background color
    backgroundColor: {
      type: String,
      trim: true,
      validate: {
        validator: function(value) {
          if (!value) return true; // Allow null/undefined
          // Hex color code validation
          return /^#[0-9A-Fa-f]{6}$/.test(value);
        },
        message: 'Background color must be a valid hex color code'
      }
    },
    
    // Text color
    textColor: {
      type: String,
      trim: true,
      validate: {
        validator: function(value) {
          if (!value) return true; // Allow null/undefined
          // Hex color code validation
          return /^#[0-9A-Fa-f]{6}$/.test(value);
        },
        message: 'Text color must be a valid hex color code'
      }
    },
    
    // Badge/notification configuration
    badge: {
      show: {
        type: Boolean,
        default: false
      },
      text: {
        type: String,
        trim: true,
        maxlength: [10, 'Badge text cannot exceed 10 characters']
      },
      color: {
        type: String,
        enum: ['primary', 'secondary', 'success', 'warning', 'error', 'info'],
        default: 'primary'
      }
    }
  },

  // Responsive behavior
  responsive: {
    // Hide on small screens
    hideOnMobile: {
      type: Boolean,
      default: false
    },
    
    // Hide on medium screens
    hideOnTablet: {
      type: Boolean,
      default: false
    },
    
    // Mobile-specific title (shorter)
    mobileTitle: {
      type: String,
      trim: true,
      maxlength: [20, 'Mobile title cannot exceed 20 characters']
    }
  },

  // Usage statistics
  stats: {
    // Number of times this menu item was clicked
    clickCount: {
      type: Number,
      default: 0,
      min: 0
    },
    
    // Last time this menu item was accessed
    lastAccessed: {
      type: Date,
      default: null
    }
  },

  // Audit fields for tracking changes
  createdAt: {
    type: Date,
    default: Date.now,
    immutable: true
  },

  updatedAt: {
    type: Date,
    default: Date.now
  },

  createdBy: {
    type: String,
    required: [true, 'Created by field is required'],
    trim: true,
    maxlength: [100, 'Created by cannot exceed 100 characters']
  },

  updatedBy: {
    type: String,
    required: [true, 'Updated by field is required'],
    trim: true,
    maxlength: [100, 'Updated by cannot exceed 100 characters']
  }
}, {
  timestamps: false, // We handle timestamps manually
  versionKey: false,
  collection: 'sidebar_menu_items'
});

/**
 * Indexes for Performance Optimization
 */

// Compound indexes
sidebarMenuItemSchema.index({ active: 1, parentMenuItem: 1, sortOrder: 1 });
sidebarMenuItemSchema.index({ level: 1, sortOrder: 1 });
sidebarMenuItemSchema.index({ path: 1, active: 1 });
sidebarMenuItemSchema.index({ 'visibility.showInSidebar': 1, active: 1 });
sidebarMenuItemSchema.index({ 'visibility.showInMobile': 1, active: 1 });

// Permission indexes
sidebarMenuItemSchema.index({ 'permissions.menuPermission': 1 });
sidebarMenuItemSchema.index({ 'permissions.pagePermission': 1 });
sidebarMenuItemSchema.index({ 'visibility.restrictToRoles': 1 });

// Text search index
sidebarMenuItemSchema.index({ 
  title: 'text', 
  description: 'text',
  path: 'text' 
});

// Audit indexes
sidebarMenuItemSchema.index({ createdAt: -1 });
sidebarMenuItemSchema.index({ 'stats.lastAccessed': -1 });

/**
 * Middleware Hooks
 */

// Pre-save middleware for hierarchy management and audit trail
sidebarMenuItemSchema.pre('save', async function(next) {
  try {
    // Update timestamp if document is modified
    if (this.isModified() && !this.isNew) {
      this.updatedAt = new Date();
    }

    // Calculate hierarchy level based on parent
    if (this.isModified('parentMenuItem')) {
      if (this.parentMenuItem) {
        const SidebarMenuItem = mongoose.model('SidebarMenuItem');
        const parent = await SidebarMenuItem.findById(this.parentMenuItem);
        if (parent) {
          this.level = parent.level + 1;
        }
      } else {
        this.level = 0;
      }
    }

    // Set mobile title if not provided
    if (!this.responsive?.mobileTitle && this.title) {
      this.responsive = this.responsive || {};
      this.responsive.mobileTitle = this.title.length > 15 
        ? this.title.substring(0, 12) + '...' 
        : this.title;
    }

    next();
  } catch (error) {
    next(error);
  }
});

// Pre-update middleware
sidebarMenuItemSchema.pre(['updateOne', 'findOneAndUpdate', 'updateMany'], function() {
  this.set({ updatedAt: new Date() });
});

/**
 * Virtual Fields
 */

// Full hierarchy path virtual
sidebarMenuItemSchema.virtual('hierarchyPath').get(function() {
  return this._hierarchyPath || [this.title];
});

// Display title based on screen size
sidebarMenuItemSchema.virtual('displayTitle').get(function() {
  return this.responsive?.mobileTitle || this.title;
});

/**
 * Instance Methods
 */

/**
 * Get all child menu items
 * @returns {Promise<Array>} Array of child menu item documents
 */
sidebarMenuItemSchema.methods.getChildren = function() {
  return this.constructor.find({ 
    parentMenuItem: this._id, 
    active: true 
  }).sort({ sortOrder: 1, title: 1 });
};

/**
 * Get all descendant menu items (recursive)
 * @returns {Promise<Array>} Array of all descendant menu items
 */
sidebarMenuItemSchema.methods.getDescendants = async function() {
  const descendants = [];
  const children = await this.getChildren();
  
  for (const child of children) {
    descendants.push(child);
    const grandchildren = await child.getDescendants();
    descendants.push(...grandchildren);
  }
  
  return descendants;
};

/**
 * Check if user has permission to view this menu item
 * @param {Object} user - User document with role populated
 * @returns {Promise<boolean>} True if user can view this menu item
 */
sidebarMenuItemSchema.methods.canUserView = async function(user) {
  // Check if menu item is active
  if (!this.active) return false;

  // Check role restrictions
  if (this.visibility?.restrictToRoles?.length > 0) {
    const userRoleId = user.role_id?.toString();
    const allowedRoles = this.visibility.restrictToRoles.map(r => r.toString());
    if (!allowedRoles.includes(userRoleId)) return false;
  }

  // Check menu permission if required
  if (this.permissions?.menuPermission) {
    // Implementation would check user's menu permissions
    // This would integrate with the permission checking system
    return true; // Placeholder
  }

  return true;
};

/**
 * Update click statistics
 * @returns {Promise} Updated menu item document
 */
sidebarMenuItemSchema.methods.recordAccess = async function() {
  return this.updateOne({
    $inc: { 'stats.clickCount': 1 },
    $set: {
      'stats.lastAccessed': new Date(),
      updatedAt: new Date()
    }
  });
};

/**
 * Get breadcrumb path from root to this menu item
 * @returns {Promise<Array>} Array of menu items from root to current
 */
sidebarMenuItemSchema.methods.getBreadcrumbPath = async function() {
  const path = [];
  let current = this;
  
  while (current) {
    if (current.visibility?.showInBreadcrumb !== false) {
      path.unshift({
        title: current.title,
        path: current.path,
        _id: current._id
      });
    }
    
    if (current.parentMenuItem) {
      current = await this.constructor.findById(current.parentMenuItem);
    } else {
      break;
    }
  }
  
  return path;
};

/**
 * Static Methods
 */

/**
 * Find active menu items only
 * @returns {Query} Mongoose query for active menu items
 */
sidebarMenuItemSchema.statics.findActive = function() {
  return this.find({ active: true });
};

/**
 * Find root menu items (no parent)
 * @returns {Query} Mongoose query for root menu items
 */
sidebarMenuItemSchema.statics.findRoots = function() {
  return this.find({ 
    parentMenuItem: null, 
    active: true,
    'visibility.showInSidebar': true
  }).sort({ sortOrder: 1, title: 1 });
};

/**
 * Get sidebar menu tree structure
 * @param {Object} user - User document for permission checking
 * @returns {Promise<Array>} Tree structure of sidebar menu items
 */
sidebarMenuItemSchema.statics.getSidebarTree = async function(user = null) {
  const menuItems = await this.find({ 
    active: true,
    'visibility.showInSidebar': true
  }).sort({ level: 1, sortOrder: 1, title: 1 });

  const menuMap = new Map();
  const tree = [];

  // Create menu map
  for (const item of menuItems) {
    // Check permissions if user provided
    if (user && !(await item.canUserView(user))) {
      continue;
    }

    menuMap.set(item._id.toString(), {
      ...item.toObject(),
      children: []
    });
  }

  // Build tree structure
  menuItems.forEach(item => {
    const menuNode = menuMap.get(item._id.toString());
    if (!menuNode) return; // Skip if filtered out by permissions

    if (item.parentMenuItem) {
      const parent = menuMap.get(item.parentMenuItem.toString());
      if (parent) {
        parent.children.push(menuNode);
      }
    } else {
      tree.push(menuNode);
    }
  });

  return tree;
};

/**
 * Get mobile menu structure
 * @param {Object} user - User document for permission checking
 * @returns {Promise<Array>} Mobile-optimized menu structure
 */
sidebarMenuItemSchema.statics.getMobileMenu = async function(user = null) {
  const menuItems = await this.find({ 
    active: true,
    'visibility.showInMobile': true,
    'responsive.hideOnMobile': { $ne: true }
  }).sort({ level: 1, sortOrder: 1, title: 1 });

  return menuItems.filter(async item => {
    return !user || await item.canUserView(user);
  });
};

/**
 * Find menu item by path
 * @param {string} path - URL path to find
 * @returns {Promise} Menu item document or null
 */
sidebarMenuItemSchema.statics.findByPath = function(path) {
  return this.findOne({ 
    path: path, 
    active: true 
  });
};

/**
 * Search menu items
 * @param {string} query - Search query
 * @returns {Query} Mongoose query for matching menu items
 */
sidebarMenuItemSchema.statics.search = function(query) {
  return this.find({
    $and: [
      { active: true },
      {
        $or: [
          { title: { $regex: query, $options: 'i' } },
          { description: { $regex: query, $options: 'i' } },
          { path: { $regex: query, $options: 'i' } }
        ]
      }
    ]
  }).sort({ level: 1, sortOrder: 1, title: 1 });
};

/**
 * JSON Transform
 */
sidebarMenuItemSchema.set('toJSON', {
  virtuals: true,
  transform: function(doc, ret) {
    // Remove internal fields from JSON output
    delete ret.__v;
    delete ret.id;
    return ret;
  }
});

/**
 * Export the SidebarMenuItem model
 */
const SidebarMenuItem = mongoose.model('SidebarMenuItem', sidebarMenuItemSchema);

module.exports = SidebarMenuItem;
