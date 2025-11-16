// Utility functions

/**
 * Generate unique ID similar to Google Apps Script function
 */
function generateUniqueId() {
  const timestamp = Date.now(); // Current timestamp in milliseconds
  const randomPart = Math.floor(Math.random() * 1e6).toString(); // Random number up to 999999
  const uniqueId = (timestamp.toString() + randomPart).substring(0, 14); // Concatenate and limit length to 14
  const minLength = 8;
  const maxLength = 14;
  const finalId = uniqueId.substring(0, Math.max(minLength, Math.min(maxLength, uniqueId.length)));
  return finalId;
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

