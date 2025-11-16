// JWT utility functions for authentication
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || process.env.SESSION_SECRET || 'your-secret-key-change-in-production';
const JWT_EXPIRES_IN = '24h'; // 24 hours

/**
 * Generate JWT token for user
 * @param {Object} user - User object with id, username, and role
 * @returns {string} JWT token
 */
function generateToken(user) {
  const payload = {
    id: user.id,
    username: user.username,
    role: user.role
  };

  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: JWT_EXPIRES_IN
  });
}

/**
 * Verify and decode JWT token
 * @param {string} token - JWT token to verify
 * @returns {Object|null} Decoded token payload or null if invalid
 */
function verifyToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      console.log('[JWT] Token expired');
    } else if (error.name === 'JsonWebTokenError') {
      console.log('[JWT] Invalid token');
    } else {
      console.error('[JWT] Token verification error:', error.message);
    }
    return null;
  }
}

module.exports = {
  generateToken,
  verifyToken
};

