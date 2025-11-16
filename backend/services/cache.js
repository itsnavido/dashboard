// Caching layer using node-cache
const NodeCache = require('node-cache');
const config = require('../config/config');

// Create cache instances with different TTLs
const sellerInfoCache = new NodeCache({ 
  stdTTL: config.cacheTTL.sellerInfo,
  checkperiod: 60 
});

const userRoleCache = new NodeCache({ 
  stdTTL: config.cacheTTL.userRole,
  checkperiod: 60 
});

const paymentListCache = new NodeCache({ 
  stdTTL: config.cacheTTL.paymentList,
  checkperiod: 60 
});

/**
 * Get seller info from cache
 */
function getSellerInfo(discordId) {
  return sellerInfoCache.get(`seller:${discordId}`);
}

/**
 * Set seller info in cache
 */
function setSellerInfo(discordId, data) {
  sellerInfoCache.set(`seller:${discordId}`, data);
}

/**
 * Invalidate seller info cache
 */
function invalidateSellerInfo(discordId) {
  if (discordId) {
    sellerInfoCache.del(`seller:${discordId}`);
  } else {
    sellerInfoCache.flushAll();
  }
}

/**
 * Get user role from cache
 */
function getUserRole(discordId) {
  return userRoleCache.get(`user:${discordId}`);
}

/**
 * Set user role in cache
 */
function setUserRole(discordId, role) {
  userRoleCache.set(`user:${discordId}`, role);
}

/**
 * Invalidate user role cache
 */
function invalidateUserRole(discordId) {
  if (discordId) {
    userRoleCache.del(`user:${discordId}`);
  } else {
    userRoleCache.flushAll();
  }
}

/**
 * Get payment list from cache
 */
function getPaymentList(key) {
  return paymentListCache.get(`payments:${key}`);
}

/**
 * Set payment list in cache
 */
function setPaymentList(key, data) {
  paymentListCache.set(`payments:${key}`, data);
}

/**
 * Invalidate payment list cache
 */
function invalidatePaymentList() {
  paymentListCache.flushAll();
}

/**
 * Flush all caches
 */
function flushAll() {
  sellerInfoCache.flushAll();
  userRoleCache.flushAll();
  paymentListCache.flushAll();
}

module.exports = {
  getSellerInfo,
  setSellerInfo,
  invalidateSellerInfo,
  getUserRole,
  setUserRole,
  invalidateUserRole,
  getPaymentList,
  setPaymentList,
  invalidatePaymentList,
  flushAll
};

