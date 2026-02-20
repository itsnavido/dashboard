// Utility functions
const crypto = require('crypto');

/**
 * Generate unique ID (12 hex characters)
 */
function generateUniqueId() {
  // Create a hash from timestamp + random data
  const timestamp = Date.now().toString();
  const randomData = crypto.randomBytes(16).toString('hex'); // 32 hex characters
  const combined = timestamp + randomData;
  
  // Generate SHA-256 hash and take first 12 characters
  const hash = crypto.createHash('sha256').update(combined).digest('hex');
  
  return hash.substring(0, 12); // Returns 12 hex characters
}

/**
 * Format date in GMT+3:30 timezone
 */
function formatDate(date = new Date()) {
  const config = require('../config/config');
  const tz = config.timezone;
  
  // Simple timezone offset handling
  const offset = 3.5 * 60 * 60 * 1000; // GMT+3:30 in milliseconds
  const localDate = new Date(date.getTime() + offset);
  
  const day = String(localDate.getUTCDate()).padStart(2, '0');
  const month = String(localDate.getUTCMonth() + 1).padStart(2, '0');
  const year = localDate.getUTCFullYear();
  const hours = String(localDate.getUTCHours()).padStart(2, '0');
  const minutes = String(localDate.getUTCMinutes()).padStart(2, '0');
  const seconds = String(localDate.getUTCSeconds()).padStart(2, '0');
  
  return `${day}/${month}/${year} ${hours}:${minutes}:${seconds}`;
}

/**
 * Calculate gheymat based on payment duration, amount, and price
 */
function calculateGheymat(paymentDuration, amount, price) {
  if (paymentDuration === "usdt days") {
    return amount * price;
  }
  return amount * price * 10;
}

/**
 * Format number with commas
 */
function formatNumber(value) {
  return new Intl.NumberFormat('en-US', { 
    minimumFractionDigits: 0, 
    maximumFractionDigits: 0 
  }).format(value);
}

module.exports = {
  generateUniqueId,
  formatDate,
  calculateGheymat,
  formatNumber
};

