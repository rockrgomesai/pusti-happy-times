/**
 * Designations Routes
 * Pusti Happy Times - Designation Management API Routes
 * 
 * This file defines all the API routes for designation management,
 * including validation middleware and route protection.
 * 
 * Features:
 * - RESTful API design
 * - Input validation with express-validator
 * - JWT authentication middleware
 * - Comprehensive CRUD operations
 * - Search and filtering capabilities
 */

const express = require('express');
const { body, query, param } = require('express-validator');
const { authenticate } = require('../middleware/auth');
const {
  getAllDesignations,
  getActiveDesignations,
  getDesignationById,
  createDesignation,
  updateDesignation,
  deleteDesignation,
  restoreDesignation,
  searchDesignations,
  getDesignationStats
} = require('../controllers/designationController');

const router = express.Router();

/**
 * Validation Middleware
 */

// Designation name validation
const designationNameValidation = [
  body('name')
    .notEmpty()
    .withMessage('Designation name is required')
    .isLength({ min: 1, max: 100 })
    .withMessage('Designation name must be between 1 and 100 characters')
    .trim()
    .matches(/^[a-zA-Z0-9\s\-\.\,\&\']+$/)
    .withMessage('Designation name contains invalid characters')
];

// ID parameter validation
const idValidation = [
  param('id')
    .isMongoId()
    .withMessage('Invalid designation ID format')
];

// Pagination query validation
const paginationValidation = [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer')
    .toInt(),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100')
    .toInt(),
  query('search')
    .optional()
    .isLength({ max: 100 })
    .withMessage('Search term cannot exceed 100 characters')
    .trim(),
  query('sortBy')
    .optional()
    .isIn(['name', 'createdAt', 'updatedAt'])
    .withMessage('Invalid sort field'),
  query('sortOrder')
    .optional()
    .isIn(['asc', 'desc'])
    .withMessage('Sort order must be asc or desc'),
  query('includeInactive')
    .optional()
    .isBoolean()
    .withMessage('includeInactive must be a boolean')
];

// Search query validation
const searchValidation = [
  query('q')
    .notEmpty()
    .withMessage('Search term is required')
    .isLength({ min: 1, max: 100 })
    .withMessage('Search term must be between 1 and 100 characters')
    .trim(),
  query('includeInactive')
    .optional()
    .isBoolean()
    .withMessage('includeInactive must be a boolean'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100')
    .toInt()
];

/**
 * Routes Definition
 */

/**
 * @route   GET /api/designations/stats
 * @desc    Get designation statistics
 * @access  Private
 */
router.get('/stats', authenticate, getDesignationStats);

/**
 * @route   GET /api/designations/search
 * @desc    Search designations by name
 * @access  Private
 */
router.get('/search', authenticate, searchValidation, searchDesignations);

/**
 * @route   GET /api/designations/active
 * @desc    Get all active designations (simple list)
 * @access  Private
 */
router.get('/active', authenticate, getActiveDesignations);

/**
 * @route   GET /api/designations
 * @desc    Get all designations with pagination and filtering
 * @access  Private
 */
router.get('/', authenticate, paginationValidation, getAllDesignations);

/**
 * @route   GET /api/designations/:id
 * @desc    Get designation by ID
 * @access  Private
 */
router.get('/:id', authenticate, idValidation, getDesignationById);

/**
 * @route   POST /api/designations
 * @desc    Create new designation
 * @access  Private
 */
router.post('/', authenticate, designationNameValidation, createDesignation);

/**
 * @route   PUT /api/designations/:id
 * @desc    Update designation
 * @access  Private
 */
router.put('/:id', authenticate, idValidation, designationNameValidation, updateDesignation);

/**
 * @route   PATCH /api/designations/:id/restore
 * @desc    Restore soft deleted designation
 * @access  Private
 */
router.patch('/:id/restore', authenticate, idValidation, restoreDesignation);

/**
 * @route   DELETE /api/designations/:id
 * @desc    Soft delete designation
 * @access  Private
 */
router.delete('/:id', authenticate, idValidation, deleteDesignation);

/**
 * Error handling middleware for routes
 */
router.use((error, req, res, next) => {
  console.error('❌ Designations route error:', error);
  
  if (error.type === 'entity.parse.failed') {
    return res.status(400).json({
      success: false,
      message: 'Invalid JSON format'
    });
  }
  
  res.status(500).json({
    success: false,
    message: 'Internal server error in designations routes',
    error: process.env.NODE_ENV === 'development' ? error.message : undefined
  });
});

module.exports = router;