/**
 * Designations Controller
 * Pusti Happy Times - Designation Management API Controller
 *
 * This controller handles all CRUD operations for job designations,
 * including creation, retrieval, updates, and soft deletion.
 *
 * Features:
 * - Full CRUD operations with validation
 * - Pagination and search functionality
 * - Soft delete/restore capabilities
 * - Audit trail management
 * - Error handling and response formatting
 */

const Designation = require("../models/Designation");
const { validationResult } = require("express-validator");

const NAME_PATTERN = /^[a-zA-Z0-9\s\-\.\,\&']+$/;

/**
 * Utility function to handle validation errors
 * @param {Request} req - Express request object
 * @param {Response} res - Express response object
 * @returns {boolean} True if validation errors exist
 */
const handleValidationErrors = (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: "Validation failed",
      errors: errors.array(),
    });
  }
  return false;
};

/**
 * Get all designations with pagination and filtering
 * GET /api/designations
 */
const getAllDesignations = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      search = "",
      sortBy = "name",
      sortOrder = "asc",
      includeInactive = "false",
    } = req.query;

    // Convert string parameters to appropriate types
    const options = {
      page: parseInt(page),
      limit: parseInt(limit), // No cap - support large datasets
      search: search.trim(),
      sortBy,
      sortOrder,
      includeInactive: includeInactive === "true",
    };

    const result = await Designation.getPaginated(options);

    res.status(200).json({
      success: true,
      message: "Designations retrieved successfully",
      data: result.data,
      pagination: result.pagination,
    });
  } catch (error) {
    console.error("❌ Error getting designations:", error);
    res.status(500).json({
      success: false,
      message: "Failed to retrieve designations",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

/**
 * Get all active designations (simple list)
 * GET /api/designations/active
 */
const getActiveDesignations = async (req, res) => {
  try {
    const designations = await Designation.getActive();

    res.status(200).json({
      success: true,
      message: "Active designations retrieved successfully",
      data: designations.map((designation) => ({
        id: designation._id,
        name: designation.name,
        createdAt: designation.createdAt,
        updatedAt: designation.updatedAt,
      })),
    });
  } catch (error) {
    console.error("❌ Error getting active designations:", error);
    res.status(500).json({
      success: false,
      message: "Failed to retrieve active designations",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

/**
 * Get designation by ID
 * GET /api/designations/:id
 */
const getDesignationById = async (req, res) => {
  try {
    const { id } = req.params;

    const designation = await Designation.findById(id)
      .populate("createdBy", "username")
      .populate("updatedBy", "username");

    if (!designation) {
      return res.status(404).json({
        success: false,
        message: "Designation not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Designation retrieved successfully",
      data: designation,
    });
  } catch (error) {
    console.error("❌ Error getting designation by ID:", error);

    if (error.name === "CastError") {
      return res.status(400).json({
        success: false,
        message: "Invalid designation ID format",
      });
    }

    res.status(500).json({
      success: false,
      message: "Failed to retrieve designation",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

/**
 * Create new designation
 * POST /api/designations
 */
const createDesignation = async (req, res) => {
  try {
    // Check validation errors
    if (handleValidationErrors(req, res)) return;

    const { name } = req.body;
    const userId = req.user.id;

    // Check if designation name already exists
    const nameExists = await Designation.nameExists(name);
    if (nameExists) {
      return res.status(409).json({
        success: false,
        message: "Designation name already exists",
      });
    }

    // Create new designation
    const designation = new Designation({
      name: name.trim(),
      createdBy: userId,
      updatedBy: userId,
    });

    const savedDesignation = await designation.save();

    // Populate user references for response
    await savedDesignation.populate([
      { path: "createdBy", select: "username" },
      { path: "updatedBy", select: "username" },
    ]);

    res.status(201).json({
      success: true,
      message: "Designation created successfully",
      data: savedDesignation,
    });
  } catch (error) {
    console.error("❌ Error creating designation:", error);

    if (error.name === "ValidationError") {
      return res.status(400).json({
        success: false,
        message: "Validation failed",
        errors: Object.values(error.errors).map((err) => ({
          field: err.path,
          message: err.message,
        })),
      });
    }

    res.status(500).json({
      success: false,
      message: "Failed to create designation",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

/**
 * Update designation
 * PUT /api/designations/:id
 */
const updateDesignation = async (req, res) => {
  try {
    // Check validation errors
    if (handleValidationErrors(req, res)) return;

    const { id } = req.params;
    const { name } = req.body;
    const userId = req.user.id;

    // Find existing designation
    const designation = await Designation.findById(id);
    if (!designation) {
      return res.status(404).json({
        success: false,
        message: "Designation not found",
      });
    }

    // Check if new name already exists (excluding current designation)
    if (name && name.trim() !== designation.name) {
      const nameExists = await Designation.nameExists(name, id);
      if (nameExists) {
        return res.status(409).json({
          success: false,
          message: "Designation name already exists",
        });
      }
    }

    // Update designation
    designation.name = name.trim();
    designation.updatedBy = userId;

    const updatedDesignation = await designation.save();

    // Populate user references for response
    await updatedDesignation.populate([
      { path: "createdBy", select: "username" },
      { path: "updatedBy", select: "username" },
    ]);

    res.status(200).json({
      success: true,
      message: "Designation updated successfully",
      data: updatedDesignation,
    });
  } catch (error) {
    console.error("❌ Error updating designation:", error);

    if (error.name === "CastError") {
      return res.status(400).json({
        success: false,
        message: "Invalid designation ID format",
      });
    }

    if (error.name === "ValidationError") {
      return res.status(400).json({
        success: false,
        message: "Validation failed",
        errors: Object.values(error.errors).map((err) => ({
          field: err.path,
          message: err.message,
        })),
      });
    }

    res.status(500).json({
      success: false,
      message: "Failed to update designation",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

/**
 * Soft delete designation
 * DELETE /api/designations/:id
 */
const deleteDesignation = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const designation = await Designation.findById(id);
    if (!designation) {
      return res.status(404).json({
        success: false,
        message: "Designation not found",
      });
    }

    if (!designation.active) {
      return res.status(400).json({
        success: false,
        message: "Designation is already inactive",
      });
    }

    // Soft delete
    await designation.softDelete(userId);

    res.status(200).json({
      success: true,
      message: "Designation deleted successfully",
    });
  } catch (error) {
    console.error("❌ Error deleting designation:", error);

    if (error.name === "CastError") {
      return res.status(400).json({
        success: false,
        message: "Invalid designation ID format",
      });
    }

    res.status(500).json({
      success: false,
      message: "Failed to delete designation",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

/**
 * Restore soft deleted designation
 * PATCH /api/designations/:id/restore
 */
const restoreDesignation = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const designation = await Designation.findById(id);
    if (!designation) {
      return res.status(404).json({
        success: false,
        message: "Designation not found",
      });
    }

    if (designation.active) {
      return res.status(400).json({
        success: false,
        message: "Designation is already active",
      });
    }

    // Restore
    await designation.restore(userId);

    // Populate user references for response
    await designation.populate([
      { path: "createdBy", select: "username" },
      { path: "updatedBy", select: "username" },
    ]);

    res.status(200).json({
      success: true,
      message: "Designation restored successfully",
      data: designation,
    });
  } catch (error) {
    console.error("❌ Error restoring designation:", error);

    if (error.name === "CastError") {
      return res.status(400).json({
        success: false,
        message: "Invalid designation ID format",
      });
    }

    res.status(500).json({
      success: false,
      message: "Failed to restore designation",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

/**
 * Search designations
 * GET /api/designations/search
 */
const searchDesignations = async (req, res) => {
  try {
    const { q: searchTerm = "", includeInactive = "false", limit = 50 } = req.query;

    if (!searchTerm.trim()) {
      return res.status(400).json({
        success: false,
        message: "Search term is required",
      });
    }

    const options = {
      includeInactive: includeInactive === "true",
      limit: parseInt(limit), // No cap - support large datasets
    };

    const designations = await Designation.searchByName(searchTerm, options);

    res.status(200).json({
      success: true,
      message: "Search completed successfully",
      data: designations,
      count: designations.length,
    });
  } catch (error) {
    console.error("❌ Error searching designations:", error);
    res.status(500).json({
      success: false,
      message: "Failed to search designations",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

/**
 * Get designation statistics
 * GET /api/designations/stats
 */
const getDesignationStats = async (req, res) => {
  try {
    const [total, active, inactive] = await Promise.all([
      Designation.countDocuments({}),
      Designation.countDocuments({ active: true }),
      Designation.countDocuments({ active: false }),
    ]);

    res.status(200).json({
      success: true,
      message: "Statistics retrieved successfully",
      data: {
        total,
        active,
        inactive,
        activePercentage: total > 0 ? Math.round((active / total) * 100) : 0,
      },
    });
  } catch (error) {
    console.error("❌ Error getting designation statistics:", error);
    res.status(500).json({
      success: false,
      message: "Failed to retrieve statistics",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

/**
 * Get designation metadata
 * GET /api/designations/meta
 */
const getDesignationMeta = (req, res) => {
  try {
    const namePath = Designation.schema.path("name");
    const activePath = Designation.schema.path("active");

    const resolveRuleValue = (rule) => {
      if (Array.isArray(rule)) {
        return rule[0];
      }
      return rule;
    };

    const minLength = resolveRuleValue(namePath?.options?.minlength) || 1;
    const maxLength = resolveRuleValue(namePath?.options?.maxlength) || 100;
    const defaultActive =
      typeof activePath?.defaultValue === "function"
        ? activePath.defaultValue()
        : activePath?.defaultValue;

    res.status(200).json({
      success: true,
      message: "Designation metadata retrieved successfully",
      data: {
        defaults: {
          active: typeof defaultActive === "undefined" ? true : defaultActive,
        },
        validation: {
          name: {
            minLength,
            maxLength,
            pattern: NAME_PATTERN.source,
            description:
              "Allows letters, numbers, spaces, hyphen (-), period (.), comma (,), ampersand (&), and apostrophe (')",
          },
        },
      },
    });
  } catch (error) {
    console.error("❌ Error generating designation metadata:", error);
    res.status(500).json({
      success: false,
      message: "Failed to generate designation metadata",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

module.exports = {
  getAllDesignations,
  getActiveDesignations,
  getDesignationById,
  createDesignation,
  updateDesignation,
  deleteDesignation,
  restoreDesignation,
  searchDesignations,
  getDesignationStats,
  getDesignationMeta,
};
