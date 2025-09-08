/**
 * Global Error Handler Middleware
 * Pusti Happy Times - Centralized Error Handling
 * 
 * This middleware provides comprehensive error handling for the entire application,
 * including proper error logging, sanitization, and standardized error responses.
 * 
 * Features:
 * - Mongoose validation error handling
 * - JWT authentication error handling
 * - Validation error formatting
 * - Production-safe error responses
 * - Comprehensive error logging
 * - Status code standardization
 */

/**
 * Global Error Handler Middleware
 * Handles all types of errors and provides standardized error responses
 * 
 * @param {Error} err - Error object
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object  
 * @param {Function} next - Express next function
 */
const errorHandler = (err, req, res, next) => {
  let error = { ...err };
  error.message = err.message;

  // Log error details for debugging
  console.error('🚨 Error Handler:', {
    message: err.message,
    stack: err.stack,
    url: req.originalUrl,
    method: req.method,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    timestamp: new Date().toISOString()
  });

  // Mongoose bad ObjectId error
  if (err.name === 'CastError') {
    const message = 'Resource not found';
    error = {
      message,
      statusCode: 404,
      error: 'Not Found'
    };
  }

  // Mongoose duplicate key error
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue)[0];
    const value = err.keyValue[field];
    const message = `${field.charAt(0).toUpperCase() + field.slice(1)} '${value}' already exists`;
    error = {
      message,
      statusCode: 409,
      error: 'Conflict'
    };
  }

  // Mongoose validation error
  if (err.name === 'ValidationError') {
    const errors = Object.values(err.errors).map(val => ({
      field: val.path,
      message: val.message,
      value: val.value
    }));
    
    error = {
      message: 'Validation failed',
      statusCode: 400,
      error: 'Bad Request',
      details: errors
    };
  }

  // JWT authentication errors
  if (err.name === 'JsonWebTokenError') {
    error = {
      message: 'Invalid authentication token',
      statusCode: 401,
      error: 'Unauthorized'
    };
  }

  if (err.name === 'TokenExpiredError') {
    error = {
      message: 'Authentication token has expired',
      statusCode: 401,
      error: 'Unauthorized'
    };
  }

  // Express validator errors
  if (err.type === 'validation') {
    error = {
      message: 'Validation failed',
      statusCode: 400,
      error: 'Bad Request',
      details: err.errors
    };
  }

  // Rate limiting errors
  if (err.statusCode === 429) {
    error = {
      message: 'Too many requests, please try again later',
      statusCode: 429,
      error: 'Too Many Requests'
    };
  }

  // Permission denied errors
  if (err.statusCode === 403) {
    error = {
      message: 'Insufficient permissions to access this resource',
      statusCode: 403,
      error: 'Forbidden'
    };
  }

  // CORS errors
  if (err.message && err.message.includes('CORS')) {
    error = {
      message: 'Cross-origin request not allowed',
      statusCode: 403,
      error: 'Forbidden'
    };
  }

  // File upload errors
  if (err.code === 'ENOENT') {
    error = {
      message: 'File not found',
      statusCode: 404,
      error: 'Not Found'
    };
  }

  // Database connection errors
  if (err.name === 'MongoNetworkError' || err.name === 'MongooseServerSelectionError') {
    error = {
      message: 'Database connection error. Please try again later.',
      statusCode: 503,
      error: 'Service Unavailable'
    };
  }

  // Default error structure
  const statusCode = error.statusCode || 500;
  const errorResponse = {
    success: false,
    error: error.error || 'Internal Server Error',
    message: error.message || 'An unexpected error occurred',
    statusCode: statusCode,
    timestamp: new Date().toISOString(),
    path: req.originalUrl,
    method: req.method
  };

  // Add error details in development mode
  if (process.env.NODE_ENV === 'development') {
    errorResponse.stack = err.stack;
    if (error.details) {
      errorResponse.details = error.details;
    }
  }

  // Add request ID if available (useful for tracing)
  if (req.requestId) {
    errorResponse.requestId = req.requestId;
  }

  // Log critical errors for monitoring
  if (statusCode >= 500) {
    console.error('🔥 Critical Error:', {
      error: errorResponse,
      user: req.user?.username || 'anonymous',
      originalError: err
    });
  }

  // Send error response
  res.status(statusCode).json(errorResponse);
};

/**
 * Async Error Handler Wrapper
 * Wraps async route handlers to catch rejected promises
 * 
 * @param {Function} fn - Async function to wrap
 * @returns {Function} Wrapped function with error handling
 */
const asyncHandler = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

/**
 * Create Custom Error
 * Helper function to create standardized error objects
 * 
 * @param {string} message - Error message
 * @param {number} statusCode - HTTP status code
 * @param {string} error - Error type
 * @returns {Error} Custom error object
 */
const createError = (message, statusCode = 500, error = 'Internal Server Error') => {
  const err = new Error(message);
  err.statusCode = statusCode;
  err.error = error;
  return err;
};

/**
 * Not Found Error Creator
 * Creates a standardized 404 error
 * 
 * @param {string} resource - Resource that was not found
 * @returns {Error} Not found error
 */
const notFoundError = (resource = 'Resource') => {
  return createError(`${resource} not found`, 404, 'Not Found');
};

/**
 * Unauthorized Error Creator
 * Creates a standardized 401 error
 * 
 * @param {string} message - Custom unauthorized message
 * @returns {Error} Unauthorized error
 */
const unauthorizedError = (message = 'Authentication required') => {
  return createError(message, 401, 'Unauthorized');
};

/**
 * Forbidden Error Creator
 * Creates a standardized 403 error
 * 
 * @param {string} message - Custom forbidden message
 * @returns {Error} Forbidden error
 */
const forbiddenError = (message = 'Insufficient permissions') => {
  return createError(message, 403, 'Forbidden');
};

/**
 * Validation Error Creator
 * Creates a standardized 400 validation error
 * 
 * @param {string} message - Validation error message
 * @param {Array} details - Validation error details
 * @returns {Error} Validation error
 */
const validationError = (message = 'Validation failed', details = []) => {
  const err = createError(message, 400, 'Bad Request');
  err.details = details;
  return err;
};

module.exports = {
  errorHandler,
  asyncHandler,
  createError,
  notFoundError,
  unauthorizedError,
  forbiddenError,
  validationError
};
