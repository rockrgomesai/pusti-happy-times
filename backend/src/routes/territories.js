/**
 * Territory Routes
 * Pusti Happy Times - Hierarchical Territory Management Endpoints
 */

const express = require("express");
const { body, param, query, validationResult } = require("express-validator");
const mongoose = require("mongoose");
const Territory = require("../models/Territory");
const { authenticate, requireApiPermission } = require("../middleware/auth");

const router = express.Router();

const TERRITORY_TYPES = Territory.TERRITORY_TYPES || ["zone", "region", "area", "db_point"];

const LEVEL_MAP = Territory.LEVEL_MAP || {
  zone: 0,
  region: 1,
  area: 2,
  db_point: 3,
};

const LEVEL_METADATA = {
  zone: {
    type: "zone",
    label: "Zone",
    level: LEVEL_MAP.zone,
    parentType: null,
    parentLevel: null,
  },
  region: {
    type: "region",
    label: "Region",
    level: LEVEL_MAP.region,
    parentType: "zone",
    parentLevel: LEVEL_MAP.zone,
  },
  area: {
    type: "area",
    label: "Area",
    level: LEVEL_MAP.area,
    parentType: "region",
    parentLevel: LEVEL_MAP.region,
  },
  db_point: {
    type: "db_point",
    label: "DB Point",
    level: LEVEL_MAP.db_point,
    parentType: "area",
    parentLevel: LEVEL_MAP.area,
  },
};

const SORTABLE_FIELDS = ["name", "type", "level", "active", "created_at", "updated_at"];

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

const parseBoolean = (value, defaultValue = false) => {
  if (value === undefined || value === null || value === "") {
    return defaultValue;
  }

  if (typeof value === "boolean") {
    return value;
  }

  if (typeof value === "number") {
    return value !== 0;
  }

  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (["true", "1", "yes", "on"].includes(normalized)) {
      return true;
    }
    if (["false", "0", "no", "off"].includes(normalized)) {
      return false;
    }
  }

  return defaultValue;
};

const getCurrentUserId = (req) => {
  if (!req || !req.user) {
    return undefined;
  }

  if (req.user.id) {
    return req.user.id;
  }

  return req.user._id;
};

const getTypeMeta = (type) => LEVEL_METADATA[type] || null;

const buildHierarchy = (territories) => {
  const nodes = territories.map((territory) => ({
    _id: territory._id,
    name: territory.name,
    type: territory.type,
    level: territory.level,
    active: territory.active,
    parent_id: territory.parent_id,
    children: [],
  }));

  const nodeMap = new Map();
  nodes.forEach((node) => {
    if (!node._id) {
      return;
    }

    const nodeId = typeof node._id === "string" ? node._id : node._id.toString();
    nodeMap.set(nodeId, node);
  });

  const roots = [];

  nodes.forEach((node) => {
    const parentId = node.parent_id
      ? typeof node.parent_id === "string"
        ? node.parent_id
        : node.parent_id.toString()
      : undefined;

    if (parentId && nodeMap.has(parentId)) {
      const parentNode = nodeMap.get(parentId);
      if (parentNode) {
        parentNode.children.push(node);
      } else {
        roots.push(node);
      }
    } else {
      roots.push(node);
    }
  });

  const sortChildren = (items) => {
    items.sort((a, b) => a.level - b.level || a.name.localeCompare(b.name));
    items.forEach((child) => {
      if (Array.isArray(child.children) && child.children.length) {
        sortChildren(child.children);
      }
    });
  };

  sortChildren(roots);
  return roots;
};

const refreshDescendantHierarchy = async (territoryDoc) => {
  const baseAncestors = [...(territoryDoc.ancestors || []), territoryDoc._id];
  const childLevel = territoryDoc.level + 1;

  const children = await Territory.find({ parent_id: territoryDoc._id });
  for (const child of children) {
    child.ancestors = baseAncestors;
    child.level = childLevel;
    await child.save();
    await refreshDescendantHierarchy(child);
  }
};

const idValidation = [param("id").isMongoId().withMessage("Invalid territory ID format")];

const baseTerritoryValidation = [
  body("name")
    .trim()
    .notEmpty()
    .withMessage("Territory name is required")
    .isLength({ min: 2, max: 160 })
    .withMessage("Territory name must be between 2 and 160 characters"),
  body("type").trim().isIn(TERRITORY_TYPES).withMessage("Invalid territory type"),
  body("parent_id")
    .optional({ nullable: true })
    .custom((value, { req }) => {
      const meta = getTypeMeta(req.body.type);

      if (!meta) {
        throw new Error("Invalid territory type");
      }

      if (meta.level === 0) {
        if (value) {
          throw new Error("Zone territories cannot define a parent");
        }
        return true;
      }

      if (meta.level > 0 && (value === undefined || value === null || value === "")) {
        throw new Error(`${meta.type} territories require a parent`);
      }

      if (value === undefined || value === null || value === "") {
        return true;
      }

      if (!mongoose.Types.ObjectId.isValid(value)) {
        throw new Error("Parent territory ID must be a valid ObjectId");
      }

      return true;
    }),
  body("active").optional().isBoolean().withMessage("Active must be a boolean").toBoolean(),
];

const listValidation = [
  query("level")
    .optional()
    .isInt({ min: 0, max: 3 })
    .withMessage("Level must be between 0 and 3")
    .toInt(),
  query("type").optional().isIn(TERRITORY_TYPES).withMessage("Invalid territory type"),
  query("parentId")
    .optional()
    .custom((value) => {
      if (!mongoose.Types.ObjectId.isValid(value)) {
        throw new Error("Parent ID must be a valid ObjectId");
      }
      return true;
    }),
  query("includeInactive")
    .optional()
    .isBoolean()
    .withMessage("includeInactive must be boolean")
    .toBoolean(),
  query("page").optional().isInt({ min: 1 }).withMessage("Page must be a positive integer").toInt(),
  query("limit")
    .optional()
    .isInt({ min: 1, max: 200 })
    .withMessage("Limit must be between 1 and 200")
    .toInt(),
  query("sortBy").optional().isIn(SORTABLE_FIELDS).withMessage("Invalid sort field"),
  query("sortOrder").optional().isIn(["asc", "desc"]).withMessage("Invalid sort order"),
  query("search").optional().trim().isLength({ max: 160 }).withMessage("Search term is too long"),
];

router.get(
  "/",
  authenticate,
  requireApiPermission("territories:read"),
  listValidation,
  handleValidationErrors,
  async (req, res) => {
    try {
      const {
        level,
        type,
        parentId,
        includeInactive = false,
        page = 1,
        limit = 25,
        sortBy = "name",
        sortOrder = "asc",
        search,
      } = req.query;

      const filter = {};
      if (level !== undefined) filter.level = level;
      if (type) filter.type = type;
      if (parentId) filter.parent_id = parentId;
      if (!parseBoolean(includeInactive)) filter.active = true;
      if (search) {
        filter.name = { $regex: search, $options: "i" };
      }

      const skip = (page - 1) * limit;
      const sort = { [sortBy]: sortOrder === "desc" ? -1 : 1 };

      const [territories, totalCount] = await Promise.all([
        Territory.find(filter)
          .sort(sort)
          .skip(skip)
          .limit(limit)
          .populate("parent_id", "name type level")
          .populate("created_by", "username")
          .populate("updated_by", "username"),
        Territory.countDocuments(filter),
      ]);

      const totalPages = Math.ceil(totalCount / limit) || 1;

      return res.json({
        success: true,
        data: territories,
        pagination: {
          page,
          limit,
          totalCount,
          totalPages,
          hasNextPage: page < totalPages,
          hasPrevPage: page > 1,
        },
      });
    } catch (error) {
      console.error("Error fetching territories:", error);
      return res.status(500).json({
        success: false,
        message: "Failed to fetch territories",
        error: process.env.NODE_ENV === "development" ? error.message : undefined,
      });
    }
  }
);

router.get(
  "/tree",
  authenticate,
  requireApiPermission("territories:read"),
  [
    query("includeInactive")
      .optional()
      .isBoolean()
      .withMessage("includeInactive must be boolean")
      .toBoolean(),
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      const includeInactive = parseBoolean(req.query.includeInactive, false);
      const filter = includeInactive ? {} : { active: true };

      const territories = await Territory.find(filter)
        .sort({ level: 1, name: 1 })
        .populate("parent_id", "name type level")
        .lean();

      const tree = buildHierarchy(territories);

      return res.json({ success: true, data: tree });
    } catch (error) {
      console.error("Error fetching territory tree:", error);
      return res.status(500).json({
        success: false,
        message: "Failed to build territory tree",
        error: process.env.NODE_ENV === "development" ? error.message : undefined,
      });
    }
  }
);

router.get(
  "/options",
  authenticate,
  requireApiPermission("territories:read"),
  [
    query("forType").optional().isIn(TERRITORY_TYPES).withMessage("Invalid territory type"),
    query("level")
      .optional()
      .isInt({ min: 0, max: 3 })
      .withMessage("Level must be between 0 and 3")
      .toInt(),
    query("includeInactive")
      .optional()
      .isBoolean()
      .withMessage("includeInactive must be boolean")
      .toBoolean(),
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      const { forType, level, includeInactive } = req.query;
      let targetLevel = level;

      if (forType) {
        const meta = getTypeMeta(forType);
        if (meta) {
          targetLevel = meta.parentLevel;
        }
      }

      const filter = {};
      if (targetLevel !== undefined && targetLevel !== null && targetLevel >= 0) {
        filter.level = targetLevel;
      }
      if (!parseBoolean(includeInactive)) {
        filter.active = true;
      }

      const territories = await Territory.find(filter)
        .sort({ name: 1 })
        .select("name type level active parent_id");

      const result = territories.map((territory) => ({
        _id: territory._id,
        name: territory.name,
        type: territory.type,
        level: territory.level,
        active: territory.active,
        parent_id: territory.parent_id,
      }));

      return res.json({ success: true, data: result });
    } catch (error) {
      console.error("Error fetching territory options:", error);
      return res.status(500).json({
        success: false,
        message: "Failed to fetch territory options",
        error: process.env.NODE_ENV === "development" ? error.message : undefined,
      });
    }
  }
);

router.get("/types", authenticate, requireApiPermission("territories:read"), async (_req, res) => {
  const data = TERRITORY_TYPES.map((type) => ({
    type,
    level: LEVEL_MAP[type],
    parentType: (getTypeMeta(type) || {}).parentType,
  }));
  return res.json({ success: true, data });
});

router.get(
  "/:id",
  authenticate,
  requireApiPermission("territories:read"),
  idValidation,
  handleValidationErrors,
  async (req, res) => {
    try {
      const territory = await Territory.findById(req.params.id)
        .populate("parent_id", "name type level")
        .populate("created_by", "username")
        .populate("updated_by", "username");

      if (!territory) {
        return res.status(404).json({
          success: false,
          message: "Territory not found",
        });
      }

      return res.json({ success: true, data: territory });
    } catch (error) {
      console.error("Error fetching territory:", error);
      return res.status(500).json({
        success: false,
        message: "Failed to fetch territory",
        error: process.env.NODE_ENV === "development" ? error.message : undefined,
      });
    }
  }
);

router.post(
  "/",
  authenticate,
  requireApiPermission("territories:create"),
  baseTerritoryValidation,
  handleValidationErrors,
  async (req, res) => {
    try {
      const { name, type, parent_id: parentIdInput, active = true } = req.body;
      const userId = getCurrentUserId(req);
      const meta = getTypeMeta(type);

      if (!meta) {
        return res.status(400).json({
          success: false,
          message: "Invalid territory type",
        });
      }

      let parent = null;
      if (meta.level === 0) {
        if (parentIdInput) {
          return res.status(400).json({
            success: false,
            message: "Zone territories cannot define a parent",
          });
        }
      } else {
        if (!parentIdInput) {
          return res.status(400).json({
            success: false,
            message: `${type} territories require a parent`,
          });
        }
        parent = await Territory.findById(parentIdInput);
        if (!parent) {
          return res.status(400).json({
            success: false,
            message: "Parent territory not found",
          });
        }
        if (parent._id && parent._id.toString() === (req.params?.id || req.body?.id)) {
          return res.status(400).json({
            success: false,
            message: "A territory cannot be its own parent",
          });
        }
        if (parent.level !== meta.parentLevel) {
          return res.status(400).json({
            success: false,
            message: `Parent territory must be a ${meta.parentType || "lower-level"} territory`,
          });
        }
      }

      const territory = new Territory({
        name: name.trim(),
        type,
        parent_id: parent ? parent._id : null,
        active: parseBoolean(active, true),
        created_by: userId,
        updated_by: userId,
      });

      await territory.save();

      const populated = await Territory.findById(territory._id)
        .populate("parent_id", "name type level")
        .populate("created_by", "username")
        .populate("updated_by", "username");

      return res.status(201).json({
        success: true,
        message: "Territory created successfully",
        data: populated,
      });
    } catch (error) {
      console.error("Error creating territory:", error);

      if (error.code === 11000) {
        return res.status(409).json({
          success: false,
          message: "Territory name already exists",
        });
      }

      // Surface validation/hierarchy errors clearly for the client
      if (error.name === "ValidationError" || error.message) {
        return res.status(400).json({
          success: false,
          message: error.message || "Failed to create territory",
        });
      }

      return res.status(500).json({
        success: false,
        message: "Failed to create territory",
        error: process.env.NODE_ENV === "development" ? error.message : undefined,
      });
    }
  }
);

router.put(
  "/:id",
  authenticate,
  requireApiPermission("territories:update"),
  idValidation,
  baseTerritoryValidation,
  handleValidationErrors,
  async (req, res) => {
    try {
      const { id } = req.params;
      const { name, type, parent_id: parentIdInput, active } = req.body;
      const userId = getCurrentUserId(req);

      const territory = await Territory.findById(id);
      if (!territory) {
        return res.status(404).json({
          success: false,
          message: "Territory not found",
        });
      }

      if (type !== territory.type) {
        return res.status(400).json({
          success: false,
          message: "Territory type cannot be changed",
        });
      }

      let parent = null;
      const meta = getTypeMeta(type);
      if (!meta) {
        return res.status(400).json({
          success: false,
          message: "Invalid territory type",
        });
      }

      if (meta.level === 0) {
        if (parentIdInput) {
          return res.status(400).json({
            success: false,
            message: "Zone territories cannot define a parent",
          });
        }
      } else {
        if (!parentIdInput) {
          return res.status(400).json({
            success: false,
            message: `${type} territories require a parent`,
          });
        }
        parent = await Territory.findById(parentIdInput);
        if (!parent) {
          return res.status(400).json({
            success: false,
            message: "Parent territory not found",
          });
        }
        if (parent.level !== meta.parentLevel) {
          return res.status(400).json({
            success: false,
            message: `Parent territory must be a ${meta.parentType || "lower-level"} territory`,
          });
        }
        const parentAncestors = Array.isArray(parent.ancestors)
          ? parent.ancestors
              .map((ancestor) => {
                if (typeof ancestor === "string") {
                  return ancestor;
                }
                if (!ancestor) {
                  return undefined;
                }
                return ancestor.toString();
              })
              .filter(Boolean)
          : [];
        if (parentAncestors.includes(id)) {
          return res.status(400).json({
            success: false,
            message: "Cannot assign a descendant territory as parent",
          });
        }
      }

      territory.name = name.trim();
      territory.parent_id = parent ? parent._id : null;
      territory.active = parseBoolean(active, territory.active);
      territory.updated_by = userId;

      const saved = await territory.save();
      await refreshDescendantHierarchy(saved);

      const populated = await Territory.findById(saved._id)
        .populate("parent_id", "name type level")
        .populate("created_by", "username")
        .populate("updated_by", "username");

      return res.json({
        success: true,
        message: "Territory updated successfully",
        data: populated,
      });
    } catch (error) {
      console.error("Error updating territory:", error);

      if (error.code === 11000) {
        return res.status(409).json({
          success: false,
          message: "Territory name already exists",
        });
      }

      return res.status(500).json({
        success: false,
        message: "Failed to update territory",
        error: process.env.NODE_ENV === "development" ? error.message : undefined,
      });
    }
  }
);

router.delete(
  "/:id",
  authenticate,
  requireApiPermission("territories:delete"),
  idValidation,
  handleValidationErrors,
  async (req, res) => {
    try {
      const { id } = req.params;
      const userId = getCurrentUserId(req);

      const territory = await Territory.findById(id);
      if (!territory) {
        return res.status(404).json({
          success: false,
          message: "Territory not found",
        });
      }

      if (!territory.active) {
        return res.status(400).json({
          success: false,
          message: "Territory is already inactive",
        });
      }

      territory.active = false;
      territory.updated_by = userId;
      await territory.save();

      return res.json({
        success: true,
        message: "Territory deactivated successfully",
      });
    } catch (error) {
      console.error("Error deactivating territory:", error);
      return res.status(500).json({
        success: false,
        message: "Failed to deactivate territory",
        error: process.env.NODE_ENV === "development" ? error.message : undefined,
      });
    }
  }
);

router.patch(
  "/:id/restore",
  authenticate,
  requireApiPermission("territories:update"),
  idValidation,
  handleValidationErrors,
  async (req, res) => {
    try {
      const { id } = req.params;
      const userId = getCurrentUserId(req);

      const territory = await Territory.findById(id);
      if (!territory) {
        return res.status(404).json({
          success: false,
          message: "Territory not found",
        });
      }

      if (territory.active) {
        return res.status(400).json({
          success: false,
          message: "Territory is already active",
        });
      }

      territory.active = true;
      territory.updated_by = userId;
      await territory.save();

      return res.json({
        success: true,
        message: "Territory restored successfully",
      });
    } catch (error) {
      console.error("Error restoring territory:", error);
      return res.status(500).json({
        success: false,
        message: "Failed to restore territory",
        error: process.env.NODE_ENV === "development" ? error.message : undefined,
      });
    }
  }
);

module.exports = router;
