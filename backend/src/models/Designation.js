/**
 * Designation Model
 * Pusti Happy Times - Job Designation/Title Schema
 * 
 * This model defines the structure for job designations/titles
 * within the organization, supporting hierarchical role structures
 * and audit tracking.
 * 
 * Features:
 * - Unique designation names with indexing
 * - Active/inactive status management
 * - Comprehensive audit trail
 * - Validation and error handling
 */

const mongoose = require('mongoose');

/**
 * Designation Schema Definition
 */
const designationSchema = new mongoose.Schema({
  // Designation name (unique and indexed)
  name: {
    type: String,
    required: [true, 'Designation name is required'],
    unique: true,
    trim: true,
    minlength: [1, 'Designation name must be at least 1 character long'],
    maxlength: [100, 'Designation name cannot exceed 100 characters'],
    validate: {
      validator: function(value) {
        // Allow letters, numbers, spaces, hyphens, and common punctuation
        return /^[a-zA-Z0-9\s\-\.\,\&\']+$/.test(value);
      },
      message: 'Designation name contains invalid characters'
    }
  },

  // Active status (default true)
  active: {
    type: Boolean,
    default: true,
    required: true
  },

  // Audit fields
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Created by field is required']
  },

  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Updated by field is required']
  }
}, {
  // Schema options
  timestamps: true, // Adds createdAt and updatedAt
  versionKey: false, // Disable __v field
  collection: 'designations' // Explicit collection name
});

/**
 * Indexes for Performance Optimization
 */
// Unique index on name (case-insensitive)
designationSchema.index({ 
  name: 1 
}, { 
  unique: true,
  collation: { locale: 'en', strength: 2 } // Case-insensitive uniqueness
});

// Index on active status for filtering
designationSchema.index({ active: 1 });

// Compound index for active designations by name
designationSchema.index({ active: 1, name: 1 });

// Audit indexes
designationSchema.index({ createdBy: 1 });
designationSchema.index({ updatedBy: 1 });
designationSchema.index({ createdAt: -1 });
designationSchema.index({ updatedAt: -1 });

/**
 * Instance Methods
 */

/**
 * Soft delete (set active to false instead of removing)
 * @param {ObjectId} userId - User performing the deletion
 * @returns {Promise<Designation>} Updated designation
 */
designationSchema.methods.softDelete = function(userId) {
  this.active = false;
  this.updatedBy = userId;
  return this.save();
};

/**
 * Restore soft deleted designation
 * @param {ObjectId} userId - User performing the restoration
 * @returns {Promise<Designation>} Updated designation
 */
designationSchema.methods.restore = function(userId) {
  this.active = true;
  this.updatedBy = userId;
  return this.save();
};

/**
 * Get formatted designation info
 * @returns {Object} Formatted designation data
 */
designationSchema.methods.getFormattedInfo = function() {
  return {
    id: this._id,
    name: this.name,
    active: this.active,
    createdAt: this.createdAt,
    updatedAt: this.updatedAt
  };
};

/**
 * Static Methods
 */

/**
 * Get all active designations
 * @returns {Array} Array of active designations
 */
designationSchema.statics.getActive = function() {
  return this.find({ active: true }).sort({ name: 1 });
};

/**
 * Get all designations with pagination
 * @param {Object} options - Pagination options
 * @returns {Object} Paginated designations data
 */
designationSchema.statics.getPaginated = async function(options = {}) {
  const {
    page = 1,
    limit = 0,
    search = '',
    sortBy = 'name',
    sortOrder = 'asc',
    includeInactive = false
  } = options;

  // Build query
  const query = {};
  
  if (!includeInactive) {
    query.active = true;
  }

  if (search) {
    query.name = { $regex: search, $options: 'i' };
  }

  // Calculate pagination
  const skip = (page - 1) * limit;
  const sort = { [sortBy]: sortOrder === 'desc' ? -1 : 1 };

  // Execute queries
  const [data, total] = await Promise.all([
    this.find(query)
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .populate('createdBy', 'username')
      .populate('updatedBy', 'username')
      .lean(),
    this.countDocuments(query)
  ]);

  return {
    data,
    pagination: {
      current: page,
      pages: Math.ceil(total / limit),
      total,
      limit
    }
  };
};

/**
 * Search designations by name
 * @param {string} searchTerm - Search term
 * @param {Object} options - Search options
 * @returns {Array} Array of matching designations
 */
designationSchema.statics.searchByName = function(searchTerm, options = {}) {
  const { includeInactive = false, limit = 0 } = options;
  
  const query = {
    name: { $regex: searchTerm, $options: 'i' }
  };
  
  if (!includeInactive) {
    query.active = true;
  }

  return this.find(query)
    .sort({ name: 1 })
    .limit(limit)
    .lean();
};

/**
 * Check if designation name exists
 * @param {string} name - Designation name to check
 * @param {ObjectId} excludeId - ID to exclude from check (for updates)
 * @returns {boolean} True if name exists
 */
designationSchema.statics.nameExists = async function(name, excludeId = null) {
  const query = {
    name: { $regex: `^${name}$`, $options: 'i' }
  };
  
  if (excludeId) {
    query._id = { $ne: excludeId };
  }
  
  const existing = await this.findOne(query);
  return !!existing;
};

/**
 * Pre-save middleware
 */
designationSchema.pre('save', function(next) {
  // Trim and clean name
  if (this.name) {
    this.name = this.name.trim();
  }
  
  next();
});

/**
 * Post-save middleware for audit logging
 */
designationSchema.post('save', function(doc) {
  console.log(`✅ Designation ${doc.isNew ? 'created' : 'updated'}: ${doc.name}`);
});

/**
 * Error handling middleware
 */
designationSchema.post('save', function(error, doc, next) {
  if (error.name === 'MongoServerError' && error.code === 11000) {
    // Duplicate key error
    next(new Error('Designation name already exists'));
  } else {
    next(error);
  }
});

/**
 * Create and export the model
 */
const Designation = mongoose.model('Designation', designationSchema);

module.exports = Designation;