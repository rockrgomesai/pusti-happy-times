/**
 * Not Found Middleware
 * Pusti Happy Times - 404 Route Handler
 * 
 * This middleware handles all requests that don't match any defined routes,
 * providing a standardized 404 response with helpful information.
 */

/**
 * Not Found Middleware
 * Handles 404 errors for undefined routes
 * 
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
const notFound = (req, res, next) => {
  // Create detailed 404 error response
  const error = {
    success: false,
    error: 'Not Found',
    message: `The requested endpoint '${req.method} ${req.originalUrl}' was not found on this server`,
    statusCode: 404,
    timestamp: new Date().toISOString(),
    path: req.originalUrl,
    method: req.method,
    suggestion: 'Please check the URL and try again, or refer to the API documentation'
  };

  // Send 404 response
  res.status(404).json(error);
};

module.exports = notFound;
