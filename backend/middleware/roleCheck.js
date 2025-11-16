// Role-based authorization middleware
const userService = require('../services/userService');

/**
 * Require admin role
 */
async function requireAdmin(req, res, next) {
  const user = req.user;
  if (!user || !user.id) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const isAdmin = await userService.isAdmin(user.id);
    if (isAdmin) {
      return next();
    }
    
    res.status(403).json({ error: 'Forbidden: Admin access required' });
  } catch (error) {
    console.error('Error checking admin role:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

module.exports = {
  requireAdmin
};

