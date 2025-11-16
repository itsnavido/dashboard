// Authentication middleware

/**
 * Require authentication
 */
function requireAuth(req, res, next) {
  if (req.isAuthenticated && req.isAuthenticated()) {
    return next();
  }
  
  res.status(401).json({ error: 'Unauthorized' });
}

/**
 * Get current user from session
 */
function getCurrentUser(req) {
  return req.user || null;
}

module.exports = {
  requireAuth,
  getCurrentUser
};

