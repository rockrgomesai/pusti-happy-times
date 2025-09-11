/**
 * Category Routes
 * Pusti Happy Times - Category Management Endpoints
 *
 * Mirrors the brands.js style with CRUD, RBAC, API permissions, and audit fields.
 */

const express = require('express');
const { body, validationResult, param } = require('express-validator');
const { Category } = require('../models');
const { authenticate, requireApiPermission } = require('../middleware/auth');

const router = express.Router();

/**
 * Validation Rules
 */
const categoryValidation = [
  body('category')
    .trim()
    .notEmpty()
    .withMessage('Category name is required')
    .isLength({ min: 1, max: 120 })
    .withMessage('Category must be between 1 and 120 characters'),
  body('slug')
    .optional()
    .trim()
    .matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
    .withMessage('Slug must be lowercase letters/numbers and dashes'),
  body('parent')
    .optional({ nullable: true })
    .isMongoId()
    .withMessage('Invalid parent ID format'),
];

const idValidation = [param('id').isMongoId().withMessage('Invalid category ID format')];

/**
 * Helpers
 */
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, message: 'Validation error', errors: errors.array() });
  }
  next();
};

const getCurrentUserId = (req) => req.user?.id || req.user?._id;

/**
 * Routes
 */

// GET /api/categories - list categories
router.get(
  '/',
  authenticate,
  requireApiPermission('read:category'),
  async (req, res) => {
    try {
      const { page = 1, limit = 10, sort = 'category' } = req.query;

      const options = {
        page: parseInt(page),
        limit: parseInt(limit),
        sort: { [sort]: 1 },
      };

      const skip = (options.page - 1) * options.limit;

      const categories = await Category.find({})
        .sort(options.sort)
        .skip(skip)
        .limit(options.limit)
        .populate('createdBy', 'username')
        .populate('updatedBy', 'username')
        .lean();

      const totalCount = await Category.countDocuments();
      const totalPages = Math.ceil(totalCount / options.limit);

      res.json({
        success: true,
        data: categories,
        pagination: {
          page: options.page,
          limit: options.limit,
          totalCount,
          totalPages,
          hasNextPage: options.page < totalPages,
          hasPrevPage: options.page > 1,
        },
      });
    } catch (error) {
      console.error('Error fetching categories:', error);
      res.status(500).json({
        success: false,
        message: 'Error fetching categories',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined,
      });
    }
  }
);

// GET /api/categories/:id - get one
router.get(
  '/:id',
  authenticate,
  requireApiPermission('read:category'),
  idValidation,
  handleValidationErrors,
  async (req, res) => {
    try {
      const doc = await Category.findById(req.params.id)
        .populate('createdBy', 'username')
        .populate('updatedBy', 'username');

      if (!doc) {
        return res.status(404).json({ success: false, message: 'Category not found' });
      }

      res.json({ success: true, data: doc });
    } catch (error) {
      console.error('Error fetching category:', error);
      res.status(500).json({
        success: false,
        message: 'Error fetching category',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined,
      });
    }
  }
);

// POST /api/categories - create
router.post(
  '/',
  authenticate,
  requireApiPermission('create:category'),
  categoryValidation,
  handleValidationErrors,
  async (req, res) => {
    try {
  const { category, parent = null, slug: incomingSlug, sortOrder = 0, isActive = true } = req.body;
      const currentUserId = getCurrentUserId(req);

      // unique per parent+slug is enforced at DB/index level; check duplicate by category at same depth/parent
      const slug = (incomingSlug && incomingSlug.length
        ? String(incomingSlug)
        : String(category))
        .toLowerCase()
        .trim()
        .replace(/['"]/g, '')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');

      // If parent provided, verify it exists
      if (parent) {
        const parentExists = await Category.exists({ _id: parent });
        if (!parentExists) {
          return res.status(400).json({ success: false, message: 'Parent category not found' });
        }
      }

      const existing = await Category.findOne({ slug, parent: parent || null });
      if (existing) {
        return res.status(400).json({ success: false, message: 'Category already exists in this level' });
      }

  const doc = new Category({ category, slug, parent: parent || null, sortOrder, isActive, createdBy: currentUserId, updatedBy: currentUserId });
      await doc.save();

      await doc.populate('createdBy', 'username');
      await doc.populate('updatedBy', 'username');

      res.status(201).json({ success: true, message: 'Category created successfully', data: doc });
    } catch (error) {
      console.error('Error creating category:', error);
      if (error.name === 'ValidationError') {
        return res.status(400).json({ success: false, message: 'Validation error', errors: error.errors });
      }
      if (error.code === 11000) {
        return res.status(400).json({ success: false, message: 'Category already exists' });
      }
      res.status(500).json({
        success: false,
        message: 'Error creating category',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined,
      });
    }
  }
);

// PUT /api/categories/:id - update
router.put(
  '/:id',
  authenticate,
  requireApiPermission('update:category'),
  idValidation,
  categoryValidation,
  handleValidationErrors,
  async (req, res) => {
    try {
  const { category, parent = undefined, slug: incomingSlug, sortOrder, isActive } = req.body;
      const currentUserId = getCurrentUserId(req);

      const existing = await Category.findById(req.params.id);
      if (!existing) {
        return res.status(404).json({ success: false, message: 'Category not found' });
      }

      // Prevent duplicate (slug + parent) collision excluding current
      const slug = (incomingSlug && incomingSlug.length
        ? String(incomingSlug)
        : String(category))
        .toLowerCase()
        .trim()
        .replace(/['"]/g, '')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');

      // If parent provided, verify it exists
      if (parent) {
        const parentExists = await Category.exists({ _id: parent });
        if (!parentExists) {
          return res.status(400).json({ success: false, message: 'Parent category not found' });
        }
      }
      const duplicate = await Category.findOne({ slug, parent: parent === undefined ? existing.parent : parent, _id: { $ne: existing._id } });
      if (duplicate) {
        return res.status(400).json({ success: false, message: 'Another category with the same name exists in this level' });
      }

  existing.category = category;
  existing.slug = slug; // ensure slug updates if category or explicit slug changed
      if (parent !== undefined) existing.parent = parent;
  if (sortOrder !== undefined) existing.sortOrder = sortOrder;
  if (isActive !== undefined) existing.isActive = isActive;
      existing.updatedBy = currentUserId;
      existing.updatedAt = new Date();

      await existing.save();

      const populated = await Category.findById(existing._id)
        .populate('createdBy', 'username')
        .populate('updatedBy', 'username');

      res.json({ success: true, message: 'Category updated successfully', data: populated });
    } catch (error) {
      console.error('Error updating category:', error);
      if (error.name === 'ValidationError') {
        return res.status(400).json({ success: false, message: 'Validation error', errors: error.errors });
      }
      if (error.code === 11000) {
        return res.status(400).json({ success: false, message: 'Category already exists' });
      }
      res.status(500).json({
        success: false,
        message: 'Error updating category',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined,
      });
    }
  }
);

// DELETE /api/categories/:id - delete
router.delete(
  '/:id',
  authenticate,
  requireApiPermission('delete:category'),
  idValidation,
  handleValidationErrors,
  async (req, res) => {
    try {
      const existing = await Category.findById(req.params.id);
      if (!existing) {
        return res.status(404).json({ success: false, message: 'Category not found' });
      }

      // Optional: block delete if has children
      const hasChild = await Category.exists({ parent: existing._id });
      if (hasChild) {
        return res.status(400).json({ success: false, message: 'Cannot delete category that has subcategories' });
      }

      await Category.findByIdAndDelete(existing._id);
      res.json({ success: true, message: 'Category deleted successfully' });
    } catch (error) {
      console.error('Error deleting category:', error);
      res.status(500).json({
        success: false,
        message: 'Error deleting category',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined,
      });
    }
  }
);

module.exports = router;
