const express = require("express");
const { body, param, query, validationResult } = require("express-validator");
const mongoose = require("mongoose");

const { Product, Brand, Category, Factory } = require("../../models");
const { requireApiPermission } = require("../../middleware/auth");

const router = express.Router();

const MANUFACTURED = "MANUFACTURED";
const PROCURED = "PROCURED";

const sanitizeTags = (tags = []) => {
  if (!Array.isArray(tags)) return [];
  return [...new Set(tags.map((tag) => String(tag).trim()).filter(Boolean))];
};

const ensureValidation = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: "Validation error",
      errors: errors.array(),
    });
  }
  return next();
};

const parseBoolean = (value) => {
  if (typeof value === "boolean") return value;
  if (typeof value === "string") {
    if (value.toLowerCase() === "true") return true;
    if (value.toLowerCase() === "false") return false;
  }
  return undefined;
};

const toNumber = (value) => {
  if (value === undefined || value === null || value === "") return undefined;
  const parsed = Number(value);
  return Number.isNaN(parsed) ? undefined : parsed;
};

const checkReference = async (Model, id, label) => {
  if (!id) return;
  const exists = await Model.exists({ _id: id });
  if (!exists) {
    const err = new Error(`${label} not found`);
    err.statusCode = 400;
    throw err;
  }
};

const applyBusinessRules = (payload, existing) => {
  const effectiveType = (payload.product_type || existing?.product_type || "").toUpperCase();

  const valueOrExisting = (field) =>
    payload[field] !== undefined ? payload[field] : existing?.[field];

  if (effectiveType === MANUFACTURED) {
    const factoryId = valueOrExisting("factory_id");
    const unit = (valueOrExisting("unit") || "").toUpperCase();
    const dbPrice = valueOrExisting("db_price");
    const mrp = valueOrExisting("mrp");
    const ctnPcs = valueOrExisting("ctn_pcs");

    if (!factoryId) {
      throw new Error("factory_id is required for MANUFACTURED products");
    }
    if (!Product.MANUFACTURED_UNITS.includes(unit)) {
      throw new Error("MANUFACTURED products must use BAG/BOX/CASE/CTN/JAR/POUCH units");
    }
    if (dbPrice == null || mrp == null || ctnPcs == null) {
      throw new Error("db_price, mrp and ctn_pcs are required for MANUFACTURED products");
    }
    if (payload.unit === undefined) {
      payload.unit = unit;
    }
  }

  if (effectiveType === PROCURED) {
    const unit = (valueOrExisting("unit") || "PCS").toUpperCase();
    if (unit !== "PCS") {
      throw new Error("PROCURED products must use PCS unit");
    }

    payload.unit = "PCS";
    payload.factory_id = null;
    payload.db_price = null;
    payload.mrp = null;
    payload.ctn_pcs = null;
    payload.launch_date = null;
    payload.decommission_date = null;
    payload.image_url = null;
    payload.bangla_name = null;
    payload.erp_id = null;
  }
};

const buildFilters = (req) => {
  const filters = {};

  if (req.query.product_type) {
    filters.product_type = String(req.query.product_type).toUpperCase();
  }

  if (req.query.brand_id && mongoose.isValidObjectId(req.query.brand_id)) {
    filters.brand_id = req.query.brand_id;
  }

  if (req.query.category_id && mongoose.isValidObjectId(req.query.category_id)) {
    filters.category_id = req.query.category_id;
  }

  const active = parseBoolean(req.query.active);
  if (active !== undefined) {
    filters.active = active;
  }

  if (req.query.search) {
    const value = req.query.search.trim();
    filters.$or = [
      { name: { $regex: value, $options: "i" } },
      { sku: { $regex: value, $options: "i" } },
      { description: { $regex: value, $options: "i" } },
      { tags: { $regex: value, $options: "i" } },
    ];
  }

  if (req.query.unit) {
    filters.unit = String(req.query.unit).toUpperCase();
  }

  return filters;
};

const buildSort = (req) => {
  const sortParam = req.query.sort;
  if (!sortParam) {
    return { created_at: -1 };
  }

  const sort = {};
  const fields = Array.isArray(sortParam) ? sortParam : [sortParam];
  fields.forEach((field) => {
    const [key, direction] = field.split(":");
    if (!key) return;
    const normalizedKey = key.trim();
    const dir = direction && direction.trim().toLowerCase() === "asc" ? 1 : -1;
    sort[normalizedKey] = dir;
  });

  if (!Object.keys(sort).length) {
    sort.created_at = -1;
  }

  return sort;
};

const sanitizePayload = (body) => {
  const payload = {};

  if (body.product_type !== undefined) {
    payload.product_type = String(body.product_type).trim().toUpperCase();
  }
  if (body.brand_id !== undefined) {
    payload.brand_id = body.brand_id;
  }
  if (body.category_id !== undefined) {
    payload.category_id = body.category_id;
  }
  if (body.factory_id !== undefined) {
    payload.factory_id = body.factory_id || null;
  }
  if (body.sku !== undefined) {
    payload.sku = String(body.sku).trim().toUpperCase();
  }
  if (body.unit !== undefined) {
    payload.unit = String(body.unit).trim().toUpperCase();
  }
  if (body.name !== undefined) {
    payload.name = String(body.name).trim();
  }
  if (body.description !== undefined) {
    payload.description = String(body.description).trim();
  }
  if (body.trade_price !== undefined) {
    payload.trade_price = toNumber(body.trade_price);
  }
  if (body.db_price !== undefined) {
    payload.db_price = body.db_price === null ? null : toNumber(body.db_price);
  }
  if (body.mrp !== undefined) {
    payload.mrp = body.mrp === null ? null : toNumber(body.mrp);
  }
  if (body.wt_pcs !== undefined) {
    payload.wt_pcs = toNumber(body.wt_pcs);
  }
  if (body.ctn_pcs !== undefined) {
    payload.ctn_pcs = body.ctn_pcs === null ? null : toNumber(body.ctn_pcs);
  }
  if (body.launch_date !== undefined) {
    const date = body.launch_date ? new Date(body.launch_date) : null;
    payload.launch_date = date && !Number.isNaN(date.getTime()) ? date : null;
  }
  if (body.decommission_date !== undefined) {
    const date = body.decommission_date ? new Date(body.decommission_date) : null;
    payload.decommission_date = date && !Number.isNaN(date.getTime()) ? date : null;
  }
  if (body.image_url !== undefined) {
    payload.image_url = body.image_url ? String(body.image_url).trim() : null;
  }
  if (body.bangla_name !== undefined) {
    payload.bangla_name = body.bangla_name ? String(body.bangla_name).trim() : null;
  }
  if (body.erp_id !== undefined) {
    if (body.erp_id === null || body.erp_id === "") {
      payload.erp_id = null;
    } else {
      const erpId = Number(body.erp_id);
      payload.erp_id = Number.isNaN(erpId) ? null : erpId;
    }
  }
  if (body.active !== undefined) {
    payload.active = Boolean(body.active);
  }
  if (body.tags !== undefined) {
    payload.tags = sanitizeTags(body.tags);
  }

  return payload;
};

router.get(
  "/",
  requireApiPermission("products:read"),
  [
    query("page").optional().isInt({ min: 1 }).toInt(),
    query("limit").optional().isInt({ min: 1, max: 200 }).toInt(),
    query("product_type").optional().isIn(Product.PRODUCT_TYPES),
    query("brand_id").optional().custom((value) => mongoose.isValidObjectId(value)),
    query("category_id").optional().custom((value) => mongoose.isValidObjectId(value)),
    query("factory_id").optional().custom((value) => mongoose.isValidObjectId(value)),
  ],
  ensureValidation,
  async (req, res) => {
    try {
      const page = req.query.page || 1;
      const limit = req.query.limit || 25;
      const skip = (page - 1) * limit;
      const filters = buildFilters(req);

      if (req.query.factory_id) {
        filters.factory_id = req.query.factory_id;
      }

      const sort = buildSort(req);

      const [data, total] = await Promise.all([
        Product.find(filters)
          .lean({ getters: true })
          .sort(sort)
          .skip(skip)
          .limit(limit)
          .populate("brand_id", "brand")
          .populate("category_id", "name product_segment")
          .populate("factory_id", "name"),
        Product.countDocuments(filters),
      ]);

      res.json({
        success: true,
        data,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit) || 1,
        },
      });
    } catch (error) {
      console.error("Error fetching products", error);
      res.status(500).json({
        success: false,
        message: "Error fetching products",
      });
    }
  }
);

router.get(
  "/:id",
  requireApiPermission("products:read"),
  [param("id").custom((value) => mongoose.isValidObjectId(value))],
  ensureValidation,
  async (req, res) => {
    try {
      const product = await Product.findById(req.params.id)
        .populate("brand_id", "brand")
        .populate("category_id", "name product_segment")
        .populate("factory_id", "name")
        .lean({ getters: true });

      if (!product) {
        return res.status(404).json({
          success: false,
          message: "Product not found",
        });
      }

      res.json({ success: true, data: product });
    } catch (error) {
      console.error("Error fetching product", error);
      res.status(500).json({ success: false, message: "Error fetching product" });
    }
  }
);

const createValidators = [
  body("product_type").exists().withMessage("product_type is required").bail().isIn(Product.PRODUCT_TYPES),
  body("brand_id")
    .exists()
    .withMessage("brand_id is required")
    .bail()
    .custom((value) => mongoose.isValidObjectId(value)),
  body("category_id")
    .exists()
    .withMessage("category_id is required")
    .bail()
    .custom((value) => mongoose.isValidObjectId(value)),
  body("factory_id")
    .optional({ values: "falsy" })
    .custom((value) => (value == null ? true : mongoose.isValidObjectId(value))),
  body("sku").exists().withMessage("sku is required").bail().isLength({ min: 1 }).trim(),
  body("trade_price").exists().withMessage("trade_price is required").bail().isFloat({ min: 0 }),
  body("wt_pcs").exists().withMessage("wt_pcs is required").bail().isFloat({ min: 0 }),
  body("unit").exists().withMessage("unit is required").bail().isIn(Product.PRODUCT_UNITS),
  body("name").optional().isLength({ min: 1 }).trim(),
  body("tags").optional().isArray(),
];

const updateValidators = [
  param("id").custom((value) => mongoose.isValidObjectId(value)),
  body("product_type").optional().isIn(Product.PRODUCT_TYPES),
  body("brand_id").optional().custom((value) => mongoose.isValidObjectId(value)),
  body("category_id").optional().custom((value) => mongoose.isValidObjectId(value)),
  body("factory_id")
    .optional({ values: "falsy" })
    .custom((value) => (value == null ? true : mongoose.isValidObjectId(value))),
  body("trade_price").optional().isFloat({ min: 0 }),
  body("wt_pcs").optional().isFloat({ min: 0 }),
  body("db_price").optional({ values: "falsy" }).custom((value) => value == null || Number(value) >= 0),
  body("mrp").optional({ values: "falsy" }).custom((value) => value == null || Number(value) >= 0),
  body("ctn_pcs").optional({ values: "falsy" }).custom((value) => value == null || Number(value) >= 0),
  body("unit").optional().isIn(Product.PRODUCT_UNITS),
  body("sku").optional().isLength({ min: 1 }).trim(),
  body("tags").optional().isArray(),
];

router.post(
  "/",
  requireApiPermission("products:create"),
  createValidators,
  ensureValidation,
  async (req, res) => {
    try {
      const actor = req.user?.username || req.user?.email || "system";
      const payload = sanitizePayload(req.body);
      payload.created_by = actor;
      payload.updated_by = actor;
      payload.tags = sanitizeTags(req.body.tags);
      payload.name = payload.name || payload.sku;

      await Promise.all([
        checkReference(Brand, payload.brand_id, "Brand"),
        checkReference(Category, payload.category_id, "Category"),
        payload.factory_id ? checkReference(Factory, payload.factory_id, "Factory") : Promise.resolve(),
      ]);

      applyBusinessRules(payload);

      const product = await Product.create(payload);

      res.status(201).json({
        success: true,
        message: "Product created successfully",
        data: product,
      });
    } catch (error) {
      console.error("Error creating product", error);
      if (error.code === 11000) {
        return res.status(409).json({
          success: false,
          message: "Duplicate SKU or Bangla name detected",
        });
      }
      const status = error.statusCode || 500;
      res.status(status).json({
        success: false,
        message: error.message || "Failed to create product",
      });
    }
  }
);

router.put(
  "/:id",
  requireApiPermission("products:update"),
  updateValidators,
  ensureValidation,
  async (req, res) => {
    try {
      const actor = req.user?.username || req.user?.email || "system";
      const { id } = req.params;
      const existing = await Product.findById(id);
      if (!existing) {
        return res.status(404).json({ success: false, message: "Product not found" });
      }

      const payload = sanitizePayload(req.body);
      payload.updated_by = actor;
      payload.updated_at = new Date();

      if (payload.tags !== undefined) {
        payload.tags = sanitizeTags(payload.tags);
      }

      if (payload.brand_id) {
        await checkReference(Brand, payload.brand_id, "Brand");
      }
      if (payload.category_id) {
        await checkReference(Category, payload.category_id, "Category");
      }
      if (payload.factory_id !== undefined && payload.factory_id !== null) {
        await checkReference(Factory, payload.factory_id, "Factory");
      }

      applyBusinessRules(payload, existing.product_type);

      const updated = await Product.findByIdAndUpdate(
        id,
        { $set: payload },
        { new: true, runValidators: true }
      )
        .populate("brand_id", "brand")
        .populate("category_id", "name product_segment")
        .populate("factory_id", "name");

      res.json({
        success: true,
        message: "Product updated successfully",
        data: updated,
      });
    } catch (error) {
      console.error("Error updating product", error);
      if (error.code === 11000) {
        return res.status(409).json({
          success: false,
          message: "Duplicate SKU or Bangla name detected",
        });
      }
      const status = error.statusCode || 500;
      res.status(status).json({
        success: false,
        message: error.message || "Failed to update product",
      });
    }
  }
);

router.delete(
  "/:id",
  requireApiPermission("products:delete"),
  [param("id").custom((value) => mongoose.isValidObjectId(value))],
  ensureValidation,
  async (req, res) => {
    try {
      const actor = req.user?.username || req.user?.email || "system";
      const product = await Product.findById(req.params.id);
      if (!product) {
        return res.status(404).json({ success: false, message: "Product not found" });
      }

      product.active = false;
      product.updated_by = actor;
      product.updated_at = new Date();
      await product.save();

      res.json({
        success: true,
        message: "Product deactivated successfully",
        data: { _id: product._id, active: product.active },
      });
    } catch (error) {
      console.error("Error deleting product", error);
      res.status(500).json({ success: false, message: "Failed to delete product" });
    }
  }
);

router.patch(
  "/:id/activate",
  requireApiPermission("products:update"),
  [param("id").custom((value) => mongoose.isValidObjectId(value))],
  ensureValidation,
  async (req, res) => {
    try {
      const actor = req.user?.username || req.user?.email || "system";
      const product = await Product.findById(req.params.id);
      if (!product) {
        return res.status(404).json({ success: false, message: "Product not found" });
      }

      product.active = true;
      product.updated_by = actor;
      product.updated_at = new Date();
      await product.save();

      res.json({
        success: true,
        message: "Product activated successfully",
        data: { _id: product._id, active: product.active },
      });
    } catch (error) {
      console.error("Error activating product", error);
      res.status(500).json({ success: false, message: "Failed to activate product" });
    }
  }
);

router.get(
  "/stats/summary",
  requireApiPermission("products:read"),
  async (_req, res) => {
    try {
      const pipeline = [
        {
          $group: {
            _id: "$product_type",
            total: { $sum: 1 },
            active: {
              $sum: {
                $cond: [{ $eq: ["$active", true] }, 1, 0],
              },
            },
            avgTradePrice: { $avg: "$trade_price" },
          },
        },
        {
          $project: {
            product_type: "$_id",
            total: 1,
            active: 1,
            inactive: { $subtract: ["$total", "$active"] },
            avgTradePrice: { $round: ["$avgTradePrice", 2] },
            _id: 0,
          },
        },
      ];

      const summary = await Product.aggregate(pipeline);

      res.json({ success: true, data: summary });
    } catch (error) {
      console.error("Error building product stats", error);
      res.status(500).json({ success: false, message: "Failed to build product stats" });
    }
  }
);

module.exports = router;
