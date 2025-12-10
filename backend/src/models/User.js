/**
 * User Model
 * Pusti Happy Times - User Management Schema
 *
 * This model defines the structure for user accounts with comprehensive
 * validation, security features, and audit trail functionality.
 *
 * Database Schema: username, password, role_id, email, active + audit fields
 */

const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

/**
 * User Schema Definition
 * Matches the actual database schema
 */
const userSchema = new mongoose.Schema(
  {
    // Username - unique identifier for login (matches database schema)
    username: {
      type: String,
      required: [true, "Username is required"],
      unique: true,
      trim: true,
      // Keep case-sensitive for security
    },

    // Password - hashed and validated (matches database schema)
    password: {
      type: String,
      required: [true, "Password is required"],
      select: false, // Exclude password from queries by default
    },

    // Role reference (matches database schema)
    role_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Role",
      required: [true, "User role is required"],
    },

    // Email address - unique and required (matches database schema)
    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      trim: true,
      lowercase: true,
      validate: {
        validator: function (value) {
          // Email validation regex
          return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
        },
        message: "Please provide a valid email address",
      },
    },

    // Account status (matches database schema)
    active: {
      type: Boolean,
      required: [true, "Active status is required"],
      default: true,
    },

    // User type classification (employee or distributor)
    user_type: {
      type: String,
      enum: ["employee", "distributor"],
      required: [true, "User type is required"],
      index: true,
    },

    // Employee reference (required if user_type === 'employee')
    employee_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Employee",
      default: null,
      index: true,
    },

    // Distributor reference (required if user_type === 'distributor')
    distributor_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Distributor",
      default: null,
      index: true,
    },

    // Token version for logout all devices feature
    tokenVersion: {
      type: Number,
      default: 0,
    },

    // Audit fields (matches database schema)
    created_at: {
      type: Date,
      required: [true, "Created at is required"],
      default: Date.now,
    },

    created_by: {
      type: mongoose.Schema.Types.ObjectId,
      required: [true, "Created by is required"],
      ref: "User",
    },

    updated_at: {
      type: Date,
      required: [true, "Updated at is required"],
      default: Date.now,
    },

    updated_by: {
      type: mongoose.Schema.Types.ObjectId,
      required: [true, "Updated by is required"],
      ref: "User",
    },
  },
  {
    // Schema options
    timestamps: false, // Using manual audit fields
    versionKey: false, // Disable __v field
    collection: "users", // Explicit collection name
  }
);

/**
 * Indexes for Performance Optimization
 */
// Unique indexes (automatically created due to unique: true)
// username, email

/**
 * Validation middleware - ensure user_type matches employee_id/distributor_id
 */
userSchema.pre("validate", function (next) {
  // Validate employee users
  if (this.user_type === "employee") {
    if (!this.employee_id) {
      return next(new Error("employee_id is required for employee users"));
    }
    if (this.distributor_id) {
      return next(new Error("Employee users cannot have distributor_id"));
    }
  }

  // Validate distributor users
  if (this.user_type === "distributor") {
    if (!this.distributor_id) {
      return next(new Error("distributor_id is required for distributor users"));
    }
    if (this.employee_id) {
      return next(new Error("Distributor users cannot have employee_id"));
    }
  }

  // Ensure user cannot be both employee and distributor
  if (this.employee_id && this.distributor_id) {
    return next(new Error("User cannot be both employee and distributor"));
  }

  next();
});

/**
 * Password hashing middleware
 */
userSchema.pre("save", async function (next) {
  // Only hash password if it's been modified (or is new)
  if (!this.isModified("password")) {
    return next();
  }

  try {
    // Hash password with bcrypt
    const saltRounds = 10;
    this.password = await bcrypt.hash(this.password, saltRounds);

    // Update audit fields
    if (!this.isNew) {
      this.updated_at = new Date();
    }

    next();
  } catch (error) {
    next(error);
  }
});

/**
 * Instance Methods
 */

/**
 * Compare password for authentication
 * @param {String} candidatePassword - The password to compare
 * @returns {Boolean} True if password matches, false otherwise
 */
userSchema.methods.comparePassword = async function (candidatePassword) {
  try {
    return await bcrypt.compare(candidatePassword, this.password);
  } catch (error) {
    throw new Error("Password comparison failed");
  }
};

/**
 * Get user information without sensitive data
 * @returns {Object} User information for API responses
 */
userSchema.methods.toJSON = function () {
  const user = this.toObject();
  delete user.password;
  return user;
};

/**
 * Return a safe subset of user profile fields for API responses.
 * Mirrors legacy getSafeProfile usage in auth routes.
 * @returns {Object} Safe profile data
 */
userSchema.methods.getSafeProfile = function () {
  return {
    id: this._id,
    username: this.username,
    email: this.email,
    user_type: this.user_type,
    active: this.active,
    created_at: this.created_at,
    created_by: this.created_by,
    updated_at: this.updated_at,
    updated_by: this.updated_by,
  };
};

/**
 * Check if account is locked due to failed login attempts
 * @returns {boolean} True if account is locked
 */
userSchema.methods.isAccountLocked = function () {
  // For now, return false since we don't have lockUntil field
  // This can be expanded when implementing account lockout features
  return !!(this.lockUntil && this.lockUntil > Date.now());
};

/**
 * Static Methods
 */

/**
 * Find user by username (case-sensitive)
 * @param {String} username - Username to search for
 * @returns {Object|null} User document or null
 */
userSchema.statics.findByUsername = async function (username) {
  try {
    return await this.findOne({ username: username }); // Case-sensitive
  } catch (error) {
    throw new Error(`Error finding user: ${error.message}`);
  }
};

/**
 * Find user by email
 * @param {String} email - Email to search for
 * @returns {Object|null} User document or null
 */
userSchema.statics.findByEmail = async function (email) {
  try {
    return await this.findOne({ email: email.toLowerCase() });
  } catch (error) {
    throw new Error(`Error finding user: ${error.message}`);
  }
};

/**
 * Find user with password (for authentication - case-sensitive)
 * @param {String} username - Username to search for
 * @returns {Object|null} User document with password or null
 */
userSchema.statics.findByUsernameWithPassword = async function (username) {
  try {
    return await this.findOne({ username: username }).select("+password"); // Case-sensitive
  } catch (error) {
    throw new Error(`Error finding user: ${error.message}`);
  }
};

/**
 * Get all active users
 * @returns {Array} Array of active user documents
 */
userSchema.statics.findActiveUsers = async function () {
  try {
    return await this.find({ active: true }).populate("role_id", "role");
  } catch (error) {
    throw new Error(`Error fetching users: ${error.message}`);
  }
};

/**
 * Validate role-based context requirements
 * Ensures that users with specific roles have the required context data
 *
 * @param {Object} role - Role object with role.role property
 * @param {Object} employee - Employee object with context fields
 * @param {Object} facility - Optional facility object for validation
 * @returns {Object} { valid: boolean, error: string|null }
 */
userSchema.statics.validateRoleContext = async function (role, employee, facility = null) {
  if (!role || !role.role) {
    return { valid: false, error: "Role is required for validation" };
  }

  if (!employee) {
    return { valid: false, error: "Employee data is required for validation" };
  }

  const roleName = role.role;

  // Role-based validation rules
  switch (roleName) {
    case "Inventory":
      // Must have facility_id of type 'Depot'
      if (!employee.facility_id) {
        return { valid: false, error: "Inventory role requires a facility assignment" };
      }
      // Verify facility type if facility object is provided
      if (facility && facility.type !== "Depot") {
        return { valid: false, error: "Inventory role must be assigned to a Depot facility" };
      }
      break;

    case "Production":
      // Must have facility_id of type 'Factory'
      if (!employee.facility_id) {
        return { valid: false, error: "Production role requires a facility assignment" };
      }
      // Verify facility type if facility object is provided
      if (facility && facility.type !== "Factory") {
        return { valid: false, error: "Production role must be assigned to a Factory facility" };
      }
      break;

    case "ZSM":
      // Must have Zone ID
      if (
        !employee.territory_assignments ||
        !employee.territory_assignments.zone_ids ||
        employee.territory_assignments.zone_ids.length === 0
      ) {
        return { valid: false, error: "ZSM role requires at least one Zone assignment" };
      }
      break;

    case "RSM":
      // Must have Region ID
      if (
        !employee.territory_assignments ||
        !employee.territory_assignments.region_ids ||
        employee.territory_assignments.region_ids.length === 0
      ) {
        return { valid: false, error: "RSM role requires at least one Region assignment" };
      }
      break;

    case "ASM":
    case "SO":
      // Must have Area ID
      if (
        !employee.territory_assignments ||
        !employee.territory_assignments.area_ids ||
        employee.territory_assignments.area_ids.length === 0
      ) {
        return { valid: false, error: `${roleName} role requires at least one Area assignment` };
      }
      break;

    default:
      // HQ-based roles and other roles don't have specific context requirements
      // They can be validated separately if needed
      break;
  }

  return { valid: true, error: null };
};

// Export the model
module.exports = mongoose.model("User", userSchema);
