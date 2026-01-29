const express = require("express");
const { body, param, query, validationResult } = require("express-validator");
const mongoose = require("mongoose");

const path = require("path");
const fs = require("fs");
const crypto = require("crypto");
const multer = require("multer");

const { Product, Brand, Category, Facility } = require("../../models");
const { requireApiPermission, checkApiPermission } = require("../../middleware/auth");

const router = express.Router();

const MANUFACTURED = "MANUFACTURED";
const PROCURED = "PROCURED";

const IMAGE_UPLOAD_DIR = path.join(__dirname, "../../../public/images");

const ensureImageDirectory = () => {
  if (!fs.existsSync(IMAGE_UPLOAD_DIR)) {
    fs.mkdirSync(IMAGE_UPLOAD_DIR, { recursive: true });
  }
};

ensureImageDirectory();

const imageStorage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    ensureImageDirectory();
    cb(null, IMAGE_UPLOAD_DIR);
  },
  filename: (_req, file, cb) => {
    const extension = path.extname(file.originalname) || "";
    const randomToken = crypto.randomBytes(8).toString("hex");
    const filename = `${Date.now()}-${randomToken}${extension}`;
    cb(null, filename);
  },
});

const imageUpload = multer({
  storage: imageStorage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (!file.mimetype.startsWith("image/")) {
      const error = new Error("Only image files are allowed");
      error.statusCode = 400;
      return cb(error);
    }
    cb(null, true);
  },
});

const ensureProductImagePermission = async (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    const [canCreate, canUpdate] = await Promise.all([
      checkApiPermission(req.user, "products:create"),
      checkApiPermission(req.user, "products:update"),
    ]);

    if (!canCreate && !canUpdate) {
      return res.status(403).json({
        success: false,
        message: "API access denied",
        permission: "products:create|products:update",
      });
    }

    next();
  } catch (error) {
    console.error("Product image permission error", error);
    res.status(500).json({
      success: false,
      message: "Failed to validate image upload permissions",
    });
  }
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

  const buildRuleError = (message) => {
    const error = new Error(message);
    error.statusCode = 400;
    return error;
  };

  if (effectiveType === MANUFACTURED) {
    const depotSource = valueOrExisting("depot_ids");
    const normalizedDepots = Array.isArray(depotSource)
      ? depotSource.filter(Boolean)
      : depotSource
        ? [depotSource].filter(Boolean)
        : [];
    const unit = (valueOrExisting("unit") || "").toUpperCase();
    const dbPrice = valueOrExisting("db_price");
    const mrp = valueOrExisting("mrp");
    const ctnPcs = valueOrExisting("ctn_pcs");

    if (!normalizedDepots.length) {
      throw buildRuleError("At least one depot is required for MANUFACTURED products");
    }
    if (!Product.MANUFACTURED_UNITS.includes(unit)) {
      throw buildRuleError("MANUFACTURED products must use BAG/BOX/CASE/CTN/JAR/POUCH units");
    }
    if (dbPrice == null || mrp == null || ctnPcs == null) {
      throw buildRuleError("db_price, mrp and ctn_pcs are required for MANUFACTURED products");
    }
    if (payload.unit === undefined) {
      payload.unit = unit;
    }
    payload.depot_ids = normalizedDepots;
  }

  if (effectiveType === PROCURED) {
    const unit = (valueOrExisting("unit") || "PCS").toUpperCase();
    if (unit !== "PCS") {
      throw buildRuleError("PROCURED products must use PCS unit");
    }

    payload.unit = "PCS";
    payload.depot_ids = [];
    payload.db_price = null;
    payload.mrp = null;
    payload.ctn_pcs = null;
    payload.launch_date = null;
    payload.decommission_date = null;
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
      { sku: { $regex: value, $options: "i" } },
      { bangla_name: { $regex: value, $options: "i" } },
    ];
  }

  if (req.query.unit) {
    filters.unit = String(req.query.unit).toUpperCase();
  }

  if (req.query.depot_id && mongoose.isValidObjectId(req.query.depot_id)) {
    filters.depot_ids = req.query.depot_id;
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
  if (body.depot_ids !== undefined) {
    const ids = Array.isArray(body.depot_ids) ? body.depot_ids : [body.depot_ids];
    payload.depot_ids = ids.filter(Boolean);
  } else if (body.depot_id !== undefined) {
    payload.depot_ids = body.depot_id ? [body.depot_id] : [];
  }
  if (body.sku !== undefined) {
    payload.sku = String(body.sku).trim().toUpperCase();
  }
  if (body.unit !== undefined) {
    payload.unit = String(body.unit).trim().toUpperCase();
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

  return payload;
};

router.post("/upload-image", ensureProductImagePermission, (req, res) => {
  const singleUpload = imageUpload.single("image");

  singleUpload(req, res, (err) => {
    if (err) {
      const status = err.statusCode || (err instanceof multer.MulterError ? 400 : 500);
      return res.status(status).json({
        success: false,
        message: err.message || "Failed to upload image",
      });
    }

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "No image provided for upload",
      });
    }

    const relativePath = `/images/${req.file.filename}`;

    res.status(201).json({
      success: true,
      message: "Image uploaded successfully",
      data: {
        path: relativePath,
        filename: req.file.filename,
        size: req.file.size,
      },
    });
  });
});

router.get(
  "/",
  requireApiPermission("products:read"),
  [
    query("page").optional().isInt({ min: 1 }).toInt(),
    query("limit").optional().isInt().toInt(),
    query("product_type").optional().isIn(Product.PRODUCT_TYPES),
    query("brand_id")
      .optional()
      .custom((value) => mongoose.isValidObjectId(value)),
    query("category_id")
      .optional()
      .custom((value) => mongoose.isValidObjectId(value)),
    query("depot_id")
      .optional()
      .custom((value) => mongoose.isValidObjectId(value)),
  ],
  ensureValidation,
  async (req, res) => {
    try {
      const page = req.query.page || 1;
      const limit = req.query.limit || 25;
      const skip = (page - 1) * limit;
      const filters = buildFilters(req);

      const sort = buildSort(req);

      const [data, total] = await Promise.all([
        Product.find(filters)
          .lean({ getters: true })
          .sort(sort)
          .skip(skip)
          .limit(limit)
          .populate("brand_id", "brand")
          .populate("category_id", "name product_segment")
          .populate("depot_ids", "name"),
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
        .populate("depot_ids", "name")
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
  body("product_type")
    .exists()
    .withMessage("product_type is required")
    .bail()
    .isIn(Product.PRODUCT_TYPES),
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
  body("depot_ids")
    .optional({ values: "falsy" })
    .custom((value) => {
      if (value == null || value === "") return true;
      const ids = Array.isArray(value) ? value : [value];
      return ids.every((id) => mongoose.isValidObjectId(id));
    }),
  body("sku").exists().withMessage("sku is required").bail().isLength({ min: 1 }).trim(),
  body("erp_id")
    .optional({ values: "falsy" })
    .custom((value) => value == null || (Number.isInteger(Number(value)) && Number(value) >= 1))
    .withMessage("erp_id must be an integer >= 1"),
  body("trade_price").exists().withMessage("trade_price is required").bail().isFloat({ min: 0 }),
  body("wt_pcs").exists().withMessage("wt_pcs is required").bail().isFloat({ min: 0 }),
  body("unit").exists().withMessage("unit is required").bail().isIn(Product.PRODUCT_UNITS),
];

const updateValidators = [
  param("id").custom((value) => mongoose.isValidObjectId(value)),
  body("product_type").optional().isIn(Product.PRODUCT_TYPES),
  body("brand_id")
    .optional()
    .custom((value) => mongoose.isValidObjectId(value)),
  body("category_id")
    .optional()
    .custom((value) => mongoose.isValidObjectId(value)),
  body("depot_ids")
    .optional({ values: "falsy" })
    .custom((value) => {
      if (value == null || value === "") return true;
      const ids = Array.isArray(value) ? value : [value];
      return ids.every((id) => mongoose.isValidObjectId(id));
    }),
  body("trade_price").optional().isFloat({ min: 0 }),
  body("wt_pcs").optional().isFloat({ min: 0 }),
  body("db_price")
    .optional({ values: "falsy" })
    .custom((value) => value == null || Number(value) >= 0),
  body("mrp")
    .optional({ values: "falsy" })
    .custom((value) => value == null || Number(value) >= 0),
  body("ctn_pcs")
    .optional({ values: "falsy" })
    .custom((value) => value == null || Number(value) >= 0),
  body("unit").optional().isIn(Product.PRODUCT_UNITS),
  body("sku").optional().isLength({ min: 1 }).trim(),
  body("erp_id")
    .optional({ values: "falsy" })
    .custom((value) => value == null || (Number.isInteger(Number(value)) && Number(value) >= 1))
    .withMessage("erp_id must be an integer >= 1"),
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

      // Check for duplicate SKU, ERP ID, or Bangla name
      if (payload.sku) {
        const skuDuplicate = await Product.findOne({ sku: payload.sku });
        if (skuDuplicate) {
          return res.status(409).json({
            success: false,
            message: `Duplicate SKU detected: ${payload.sku}`,
          });
        }
      }

      if (payload.erp_id != null) {
        const erpIdDuplicate = await Product.findOne({ erp_id: payload.erp_id });
        if (erpIdDuplicate) {
          return res.status(409).json({
            success: false,
            message: `Duplicate ERP ID detected: ${payload.erp_id}`,
          });
        }
      }

      if (payload.bangla_name) {
        const banglaNameDuplicate = await Product.findOne({ bangla_name: payload.bangla_name });
        if (banglaNameDuplicate) {
          return res.status(409).json({
            success: false,
            message: `Duplicate Bangla name detected: ${payload.bangla_name}`,
          });
        }
      }

      await Promise.all([
        checkReference(Brand, payload.brand_id, "Brand"),
        checkReference(Category, payload.category_id, "Category"),
        ...(Array.isArray(payload.depot_ids)
          ? payload.depot_ids.map((id) => checkReference(Facility, id, "Facility"))
          : []),
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

      // Check for duplicate SKU or Bangla name (excluding current product)
      console.log("🔍 Duplicate check - Product ID:", id);
      console.log("🔍 Duplicate check - payload.sku:", payload.sku);
      console.log("🔍 Duplicate check - payload.bangla_name:", payload.bangla_name);
      console.log("🔍 Duplicate check - payload.erp_id:", payload.erp_id);

      if (payload.sku) {
        const skuDuplicate = await Product.findOne({
          _id: { $ne: id },
          sku: payload.sku,
        });
        console.log("🔍 SKU duplicate found:", skuDuplicate ? skuDuplicate._id : "none");
        if (skuDuplicate) {
          return res.status(409).json({
            success: false,
            message: `Duplicate SKU detected: ${payload.sku}`,
          });
        }
      }

      if (payload.erp_id != null) {
        const erpIdDuplicate = await Product.findOne({
          _id: { $ne: id },
          erp_id: payload.erp_id,
        });
        console.log("🔍 ERP ID duplicate found:", erpIdDuplicate ? erpIdDuplicate._id : "none");
        if (erpIdDuplicate) {
          return res.status(409).json({
            success: false,
            message: `Duplicate ERP ID detected: ${payload.erp_id}`,
          });
        }
      }

      if (payload.bangla_name) {
        const banglaNameDuplicate = await Product.findOne({
          _id: { $ne: id },
          bangla_name: payload.bangla_name,
        });
        console.log(
          "🔍 Bangla name duplicate found:",
          banglaNameDuplicate ? banglaNameDuplicate._id : "none"
        );
        if (banglaNameDuplicate) {
          return res.status(409).json({
            success: false,
            message: `Duplicate Bangla name detected: ${payload.bangla_name}`,
          });
        }
      }

      if (payload.brand_id) {
        await checkReference(Brand, payload.brand_id, "Brand");
      }
      if (payload.category_id) {
        await checkReference(Category, payload.category_id, "Category");
      }
      if (payload.depot_ids !== undefined) {
        const depots = Array.isArray(payload.depot_ids) ? payload.depot_ids : [payload.depot_ids];
        await Promise.all(
          depots.filter((id) => id != null).map((id) => checkReference(Facility, id, "Facility"))
        );
      }

      applyBusinessRules(payload, existing);

      const updated = await Product.findByIdAndUpdate(
        id,
        { $set: payload },
        { new: true, runValidators: true }
      )
        .populate("brand_id", "brand")
        .populate("category_id", "name product_segment")
        .populate("depot_ids", "name");

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

router.get("/stats/summary", requireApiPermission("products:read"), async (_req, res) => {
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
});

/**
 * @route   GET /products/manufactured/by-category
 * @desc    Get MANUFACTURED products grouped by category/subcategory
 * @access  Private (Production role)
 */
router.get(
  "/manufactured/by-category",
  requireApiPermission("products:read"),
  async (_req, res) => {
    try {
      const products = await Product.find({
        product_type: MANUFACTURED,
        active: true,
      })
        .populate("category_id", "name")
        .select("_id sku erp_id bangla_name english_name ctn_pcs wt_pcs category_id")
        .sort({ bangla_name: 1 })
        .lean();

      // Group by category
      const grouped = {};

      products.forEach((product) => {
        const categoryName = product.category_id?.name || "Uncategorized";
        const key = categoryName;

        if (!grouped[key]) {
          grouped[key] = {
            category: categoryName,
            subcategory: null,
            products: [],
          };
        }

        grouped[key].products.push({
          _id: product._id,
          sku: product.sku,
          erp_id: product.erp_id,
          bangla_name: product.bangla_name,
          english_name: product.english_name,
          ctn_pcs: product.ctn_pcs,
          wt_pcs: product.wt_pcs,
        });
      });

      // Convert to array format
      const result = Object.keys(grouped)
        .sort()
        .map((key) => grouped[key]);

      res.json({
        success: true,
        data: result,
        totalProducts: products.length,
        totalGroups: result.length,
      });
    } catch (error) {
      console.error("Error fetching manufactured products by category:", error);
      res.status(500).json({
        success: false,
        message: "Error fetching manufactured products",
        error: process.env.NODE_ENV === "development" ? error.message : undefined,
      });
    }
  }
);

module.exports = router;
