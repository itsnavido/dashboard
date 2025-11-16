// Authentication middleware
const { verifyToken } = require('../utils/jwt');

/**
 * Middleware to verify JWT token and attach user to request
 * This should be applied before requireAuth
 */
function verifyJWT(req, res, next) {
  // Extract token from cookie or Authorization header
  const token = req.cookies?.token || req.headers.authorization?.replace('Bearer ', '');
  
  if (!token) {
    return next(); // No token, but let requireAuth handle the error
  }
  
  const decoded = verifyToken(token);
  if (decoded) {
    req.user = {
      id: decoded.id,
      username: decoded.username,
      role: decoded.role
    };
  }
  
  next();
}

/**
 * Require authentication
 */
function requireAuth(req, res, next) {
  if (req.user) {
    return next();
  }
  
  res.status(401).json({ error: 'Unauthorized' });
}

/**
 * Get current user from JWT
 */
function getCurrentUser(req) {
  return req.user || null;
}

module.exports = {
  verifyJWT,
  requireAuth,
  getCurrentUser
};

