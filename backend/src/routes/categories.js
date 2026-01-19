/**
 * Category Routes (v2)
 * Provides CRUD operations with hierarchy-aware validation and segment inheritance.
 */

const express = require("express");
const { body, param, validationResult } = require("express-validator");
const mongoose = require("mongoose");

const { Category } = require("../models");
const { authenticate, requireApiPermission } = require("../middleware/auth");

const router = express.Router();

const PRODUCT_SEGMENTS = Category.PRODUCT_SEGMENTS || ["BEV", "BIS"];

const normalizeSegment = (value) => {
  if (!value) return value;
  const upper = String(value).trim().toUpperCase();
  if (upper.startsWith("BIS")) return "BIS";
  if (upper.startsWith("BEV")) return "BEV";
  return upper;
};

const sanitizeBoolean = (value) => {
  if (value === true || value === false) return value;
  if (value === "true") return true;
  if (value === "false") return false;
  return value;
};

const sanitizeParentId = (value) => {
  if (value === "" || value === null || typeof value === "undefined") {
    return null;
  }
  return value;
};

const getActor = (req) => req.user?.username || req.user?.email || "system";

const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    console.warn("Category validation failed", {
      path: req.path,
      method: req.method,
      errors: errors.array(),
    });
    return res.status(400).json({
      success: false,
      message: "Validation error",
      errors: errors.array(),
    });
  }
  return next();
};

const createCategoryValidation = [
  body("name")
    .trim()
    .notEmpty()
    .withMessage("Name is required")
    .isLength({ min: 1, max: 120 })
    .withMessage("Name must be between 1 and 120 characters"),
  body("parent_id")
    .optional({ values: "falsy" })
    .customSanitizer(sanitizeParentId)
    .custom((value) => {
      if (value === null) return true;
      if (mongoose.Types.ObjectId.isValid(value)) return true;
      throw new Error("Invalid parent category id");
    }),
  body("product_segment")
    .optional({ values: "falsy" })
    .customSanitizer((value) => normalizeSegment(value))
    .custom((value, { req }) => {
      if (req.body.parent_id) {
        if (value && !PRODUCT_SEGMENTS.includes(value)) {
          throw new Error("Product segment must be BEV or BIS");
        }
        return true;
      }
      if (!value) {
        throw new Error("Product segment is required for root categories");
      }
      if (!PRODUCT_SEGMENTS.includes(value)) {
        throw new Error("Product segment must be BEV or BIS");
      }
      return true;
    }),
  body("active")
    .optional({ values: "falsy" })
    .customSanitizer(sanitizeBoolean)
    .custom((value) => {
      if (typeof value === "undefined") return true;
      if (typeof value === "boolean") return true;
      throw new Error("Active must be a boolean value");
    }),
  body("image_url")
    .optional({ values: "falsy" })
    .trim()
    .isLength({ max: 500 })
    .withMessage("Image URL must not exceed 500 characters"),
];

const updateCategoryValidation = [
  body("name")
    .optional()
    .trim()
    .isLength({ min: 1, max: 120 })
    .withMessage("Name must be between 1 and 120 characters"),
  body("parent_id")
    .optional({ values: "falsy" })
    .customSanitizer(sanitizeParentId)
    .custom((value) => {
      if (value === null) return true;
      if (mongoose.Types.ObjectId.isValid(value)) return true;
      throw new Error("Invalid parent category id");
    }),
  body("product_segment")
    .optional({ values: "falsy" })
    .customSanitizer((value) => normalizeSegment(value))
    .custom((value) => {
      if (!value) return true;
      if (!PRODUCT_SEGMENTS.includes(value)) {
        throw new Error("Product segment must be BEV or BIS");
      }
      return true;
    }),
  body("active")
    .optional({ values: "falsy" })
    .customSanitizer(sanitizeBoolean)
    .custom((value) => {
      if (typeof value === "undefined") return true;
      if (typeof value === "boolean") return true;
      throw new Error("Active must be a boolean value");
    }),
  body("image_url")
    .optional({ values: "falsy" })
    .trim()
    .isLength({ max: 500 })
    .withMessage("Image URL must not exceed 500 characters"),
];

const idValidation = [param("id").isMongoId().withMessage("Invalid category id")];

const createsCycle = async (categoryId, proposedParentId) => {
  if (!proposedParentId) return false;
  if (categoryId.toString() === proposedParentId.toString()) return true;

  const queue = [proposedParentId.toString()];
  const visited = new Set(queue);

  while (queue.length) {
    const current = queue.shift();
    if (current === categoryId.toString()) {
      return true;
    }

    const children = await Category.find({ parent_id: current }).select("_id");
    for (const child of children) {
      const id = child._id.toString();
      if (!visited.has(id)) {
        visited.add(id);
        queue.push(id);
      }
    }
  }

  return false;
};

router.use(authenticate);

/**
 * GET /api/categories
 * Fetch categories with optional active/segment/parent filters.
 */
router.get(
  "/",
  requireApiPermission("categories:read"),
  async (req, res) => {
    try {
      const filter = {};

      if (typeof req.query.active !== "undefined") {
        if (req.query.active === "true" || req.query.active === true) {
          filter.active = true;
        } else if (req.query.active === "false" || req.query.active === false) {
          filter.active = false;
        }
      }

      if (req.query.segment) {
        const segment = normalizeSegment(req.query.segment);
        if (!PRODUCT_SEGMENTS.includes(segment)) {
          return res.status(400).json({
            success: false,
            message: "segment must be BEV or BIS",
          });
        }
        filter.product_segment = segment;
      }

      if (req.query.parent_id) {
        if (!mongoose.Types.ObjectId.isValid(req.query.parent_id)) {
          return res.status(400).json({
            success: false,
            message: "Invalid parent category id",
          });
        }
        filter.parent_id = req.query.parent_id;
      }

      const categories = await Category.find(filter).sort({ name: 1 }).lean();
      return res.json({ success: true, data: categories });
    } catch (error) {
      console.error("Error fetching categories", error);
      return res.status(500).json({
        success: false,
        message: "Error fetching categories",
      });
    }
  }
);

/**
 * GET /api/categories/:id
 */
router.get(
  "/:id",
  requireApiPermission("categories:read"),
  idValidation,
  handleValidationErrors,
  async (req, res) => {
    try {
      const category = await Category.findById(req.params.id).lean();
      if (!category) {
        return res.status(404).json({
          success: false,
          message: "Category not found",
        });
      }

      return res.json({ success: true, data: category });
    } catch (error) {
      console.error("Error fetching category", error);
      return res.status(500).json({
        success: false,
        message: "Error fetching category",
      });
    }
  }
);

/**
 * POST /api/categories
 */
router.post(
  "/",
  requireApiPermission("categories:create"),
  createCategoryValidation,
  handleValidationErrors,
  async (req, res) => {
    try {
      const actor = getActor(req);
      const name = req.body.name.trim();
      const active = typeof req.body.active === "boolean" ? req.body.active : true;
      const parentId = req.body.parent_id ? req.body.parent_id : null;

      const existing = await Category.findOne({ name });
      if (existing) {
        return res.status(409).json({
          success: false,
          message: "Category name already exists",
        });
      }

      let productSegment = normalizeSegment(req.body.product_segment);
      let parentDoc = null;

      if (parentId) {
        parentDoc = await Category.findById(parentId);
        if (!parentDoc) {
          return res.status(400).json({
            success: false,
            message: "Parent category not found",
          });
        }
        productSegment = parentDoc.product_segment;
      } else if (!productSegment) {
        return res.status(400).json({
          success: false,
          message: "Root categories must specify a product segment",
        });
      }

      const now = new Date();
      const category = await Category.create({
        name,
        parent_id: parentDoc ? parentDoc._id : null,
        product_segment: productSegment,
        active,
        created_at: now,
        updated_at: now,
        created_by: actor,
        updated_by: actor,
      });

      return res.status(201).json({
        success: true,
        message: "Category created successfully",
        data: category,
      });
    } catch (error) {
      console.error("Error creating category", error);
      return res.status(500).json({
        success: false,
        message: "Error creating category",
      });
    }
  }
);

/**
 * PUT /api/categories/:id
 */
router.put(
  "/:id",
  requireApiPermission("categories:update"),
  idValidation,
  updateCategoryValidation,
  handleValidationErrors,
  async (req, res) => {
    try {
      const actor = getActor(req);
      const category = await Category.findById(req.params.id);
      if (!category) {
        return res.status(404).json({
          success: false,
          message: "Category not found",
        });
      }

      const updates = {};
      const now = new Date();
      updates.updated_at = now;
      updates.updated_by = actor;

      if (typeof req.body.name !== "undefined") {
        const trimmedName = req.body.name.trim();
        if (trimmedName !== category.name) {
          const duplicate = await Category.findOne({
            _id: { $ne: category._id },
            name: trimmedName,
          });
          if (duplicate) {
            return res.status(409).json({
              success: false,
              message: "Category name already exists",
            });
          }
        }
        updates.name = trimmedName;
      }

      if (typeof req.body.active !== "undefined") {
        updates.active = req.body.active;
      }

      const parentFieldProvided = Object.prototype.hasOwnProperty.call(
        req.body,
        "parent_id"
      );
      let parentChanged = false;
      let newParentDoc = null;

      if (parentFieldProvided) {
        if (req.body.parent_id === null) {
          parentChanged = Boolean(category.parent_id);
          updates.parent_id = null;
        } else if (!req.body.parent_id) {
          parentChanged = Boolean(category.parent_id);
          updates.parent_id = null;
        } else {
          if (req.body.parent_id === req.params.id) {
            return res.status(400).json({
              success: false,
              message: "Category cannot be its own parent",
            });
          }

          newParentDoc = await Category.findById(req.body.parent_id);
          if (!newParentDoc) {
            return res.status(400).json({
              success: false,
              message: "Parent category not found",
            });
          }

          if (await createsCycle(category._id, newParentDoc._id)) {
            return res.status(400).json({
              success: false,
              message: "Category cannot be assigned to its own descendant",
            });
          }

          const existingParentId = category.parent_id
            ? category.parent_id.toString()
            : null;
          parentChanged = existingParentId !== newParentDoc._id.toString();
          updates.parent_id = newParentDoc._id;
        }
      }

      let segmentToApply = null;

      if (parentChanged) {
        if (newParentDoc) {
          segmentToApply = newParentDoc.product_segment;
        } else if (typeof req.body.product_segment !== "undefined") {
          segmentToApply = normalizeSegment(req.body.product_segment);
          if (!PRODUCT_SEGMENTS.includes(segmentToApply)) {
            return res.status(400).json({
              success: false,
              message: "Product segment must be BEV or BIS",
            });
          }
        } else {
          segmentToApply = category.product_segment;
        }
      } else if (typeof req.body.product_segment !== "undefined") {
        if (category.parent_id) {
          return res.status(400).json({
            success: false,
            message: "Child categories inherit the product segment from their parent",
          });
        }
        segmentToApply = normalizeSegment(req.body.product_segment);
        if (!PRODUCT_SEGMENTS.includes(segmentToApply)) {
          return res.status(400).json({
            success: false,
            message: "Product segment must be BEV or BIS",
          });
        }
        if (segmentToApply === category.product_segment) {
          segmentToApply = null;
        }
      }

      if (segmentToApply) {
        updates.product_segment = segmentToApply;
      }

      if (Object.keys(updates).length === 2 && !segmentToApply) {
        return res.status(400).json({
          success: false,
          message: "No fields provided to update",
        });
      }

      await Category.updateOne({ _id: category._id }, { $set: updates });

      if (segmentToApply) {
        await Category.updateDescendantsSegment(
          category._id,
          updates.product_segment || segmentToApply,
          actor
        );
      }

      const updatedCategory = await Category.findById(category._id).lean();
      return res.json({
        success: true,
        message: "Category updated successfully",
        data: updatedCategory,
      });
    } catch (error) {
      console.error("Error updating category", error);
      return res.status(500).json({
        success: false,
        message: "Error updating category",
      });
    }
  }
);

/**
 * DELETE /api/categories/:id
 */
router.delete(
  "/:id",
  requireApiPermission("categories:delete"),
  idValidation,
  handleValidationErrors,
  async (req, res) => {
    try {
      const actor = getActor(req);
      const category = await Category.findById(req.params.id);
      if (!category) {
        return res.status(404).json({
          success: false,
          message: "Category not found",
        });
      }

      const children = await Category.find({ parent_id: category._id }).select("_id");
      let reassigned = 0;

      if (children.length) {
        let newSegment = null;
        if (category.parent_id) {
          const parentDoc = await Category.findById(category.parent_id).select(
            "product_segment"
          );
          if (parentDoc) {
            newSegment = parentDoc.product_segment;
          }
        }

        const now = new Date();
        const updatePayload = {
          parent_id: category.parent_id,
          updated_at: now,
          updated_by: actor,
        };

        if (newSegment) {
          updatePayload.product_segment = newSegment;
        }

        const childIds = children.map((child) => child._id);
        const result = await Category.updateMany(
          { _id: { $in: childIds } },
          { $set: updatePayload }
        );
        reassigned = result.modifiedCount || 0;

        if (newSegment) {
          for (const child of childIds) {
            await Category.updateDescendantsSegment(child, newSegment, actor);
          }
        }
      }

      await Category.deleteOne({ _id: category._id });

      return res.json({
        success: true,
        message: "Category deleted successfully",
        data: { reassignedChildren: reassigned },
      });
    } catch (error) {
      console.error("Error deleting category", error);
      return res.status(500).json({
        success: false,
        message: "Error deleting category",
      });
    }
  }
);

module.exports = router;
