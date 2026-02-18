/**
 * Mobile Catalog Routes
 * Provides product catalog, categories, and offers for mobile app
 */

const express = require("express");
const router = express.Router();
const { query, validationResult } = require("express-validator");
const Category = require("../../models/Category");
const Product = require("../../models/Product");
const DistributorStock = require("../../models/DistributorStock");
const SecondaryOffer = require("../../models/SecondaryOffer");
const Outlet = require("../../models/Outlet");

// ====================
// GET /api/mobile/catalog/categories
// Get category list with product counts
// ====================
router.get(
  "/categories",
  [
    query("distributor_id")
      .notEmpty()
      .withMessage("Distributor ID is required")
      .isMongoId()
      .withMessage("Invalid distributor ID"),
    query("segment").optional().isIn(["BIS", "BEV"]).withMessage("Invalid product segment"),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: "Validation failed",
          errors: errors.array(),
        });
      }

      const { distributor_id, segment } = req.query;

      // Build category filter
      const categoryFilter = { active: true };
      if (segment) {
        categoryFilter.product_segment = segment;
      }

      // Get all active categories
      const categories = await Category.find(categoryFilter)
        .select("name product_segment image_url")
        .sort({ name: 1 })
        .lean();

      // Get distributor stock SKUs
      const stockList = await DistributorStock.find({ distributor_id }).select("sku qty").lean();

      // Build SKU set with available stock
      const availableSkus = new Set();
      stockList.forEach((stock) => {
        if (parseFloat(stock.qty) > 0) {
          availableSkus.add(stock.sku);
        }
      });

      // Get products for available SKUs
      const products = await Product.find({
        sku: { $in: Array.from(availableSkus) },
        active: true,
      })
        .select("sku category_id")
        .lean();

      // Build category product counts
      const categoryProductCounts = {};
      products.forEach((product) => {
        const categoryId = product.category_id.toString();
        categoryProductCounts[categoryId] = (categoryProductCounts[categoryId] || 0) + 1;
      });

      // Attach product counts to categories
      const categoriesWithCounts = categories.map((cat) => ({
        _id: cat._id,
        name: cat.name,
        product_segment: cat.product_segment,
        image_url: cat.image_url,
        product_count: categoryProductCounts[cat._id.toString()] || 0,
      }));

      // Filter out categories with 0 products
      const categoriesWithStock = categoriesWithCounts.filter((cat) => cat.product_count > 0);

      return res.status(200).json({
        success: true,
        data: categoriesWithStock,
      });
    } catch (error) {
      console.error("Error fetching categories:", error);
      return res.status(500).json({
        success: false,
        message: "Failed to fetch categories",
        error: error.message,
      });
    }
  }
);

// ====================
// GET /api/mobile/catalog/products
// Get products by category with stock availability
// ====================
router.get(
  "/products",
  [
    query("category_id").notEmpty().withMessage("Category ID is required").isMongoId().withMessage("Invalid category ID"),
    query("distributor_id")
      .notEmpty()
      .withMessage("Distributor ID is required")
      .isMongoId()
      .withMessage("Invalid distributor ID"),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: "Validation failed",
          errors: errors.array(),
        });
      }

      const { category_id, distributor_id } = req.query;

      // Get products in category
      const products = await Product.find({
        category_id,
        active: true,
      })
        .select("sku english_name bangla_name trade_price unit_per_case image_url")
        .sort({ english_name: 1 })
        .lean();

      // Get stock for these products
      const skus = products.map((p) => p.sku);
      const stocks = await DistributorStock.find({
        distributor_id,
        sku: { $in: skus },
      })
        .select("sku qty")
        .lean();

      // Create stock map
      const stockMap = {};
      stocks.forEach((stock) => {
        stockMap[stock.sku] = parseFloat(stock.qty) || 0;
      });

      // Attach stock to products
      const productsWithStock = products
        .map((product) => ({
          _id: product._id,
          sku: product.sku,
          english_name: product.english_name,
          bangla_name: product.bangla_name,
          trade_price: product.trade_price,
          unit_per_case: product.unit_per_case,
          image_url: product.image_url,
          available_qty: stockMap[product.sku] || 0,
        }))
        .filter((p) => p.available_qty > 0); // Only show products with stock

      return res.status(200).json({
        success: true,
        data: productsWithStock,
      });
    } catch (error) {
      console.error("Error fetching products:", error);
      return res.status(500).json({
        success: false,
        message: "Failed to fetch products",
        error: error.message,
      });
    }
  }
);

// ====================
// GET /api/mobile/catalog/offers
// Get eligible offers for outlet
// ====================
router.get(
  "/offers",
  [
    query("outlet_id").notEmpty().withMessage("Outlet ID is required").isMongoId().withMessage("Invalid outlet ID"),
    query("distributor_id")
      .notEmpty()
      .withMessage("Distributor ID is required")
      .isMongoId()
      .withMessage("Invalid distributor ID"),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: "Validation failed",
          errors: errors.array(),
        });
      }

      const { outlet_id, distributor_id } = req.query;

      // Get outlet to determine product segment
      const outlet = await Outlet.findById(outlet_id).select("distributor_id").lean();
      if (!outlet) {
        return res.status(404).json({
          success: false,
          message: "Outlet not found",
        });
      }

      // Get eligible offers (try both BIS and BEV)
      const bisOffers =
        (await SecondaryOffer.findEligibleForOutlet(outlet_id, "BIS", distributor_id).catch(() => [])) || [];
      const bevOffers =
        (await SecondaryOffer.findEligibleForOutlet(outlet_id, "BEV", distributor_id).catch(() => [])) || [];

      const allOffers = [...bisOffers, ...bevOffers];

      // Remove duplicates and format response
      const uniqueOffers = Array.from(new Map(allOffers.map((offer) => [offer._id.toString(), offer])).values());

      const formattedOffers = uniqueOffers.map((offer) => ({
        _id: offer._id,
        name: offer.name,
        offer_type: offer.offer_type,
        description: offer.description || "",
        start_date: offer.start_date,
        end_date: offer.end_date,
        config: {
          minOrderValue: offer.config?.minOrderValue || 0,
          discountPercentage: offer.config?.discountPercentage || 0,
          discountAmount: offer.config?.discountAmount || 0,
        },
      }));

      return res.status(200).json({
        success: true,
        data: formattedOffers,
      });
    } catch (error) {
      console.error("Error fetching offers:", error);
      return res.status(500).json({
        success: false,
        message: "Failed to fetch offers",
        error: error.message,
      });
    }
  }
);

module.exports = router;
