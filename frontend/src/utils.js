// Utility functions

const MAX_DECIMALS = 20; // ECMAScript max for Intl; avoids rounding amount/PPU/total to 2 places

/**
 * @param {number|string} value
 * @param {boolean} allowDecimals
 * @param {number} maxFractionDigits - cap fraction digits (default full precision, no rounding to 2 decimals)
 */
export function formatNumber(value, allowDecimals = true, maxFractionDigits = MAX_DECIMALS) {
  if (value === '' || value === null || value === undefined) return '';
  const numValue = typeof value === 'string' ? parseFloat(value.replace(/,/g, '')) : value;
  if (isNaN(numValue)) return '';
  
  if (allowDecimals) {
    const cap = Math.min(MAX_DECIMALS, Math.max(0, maxFractionDigits));
    return new Intl.NumberFormat('en-US', {
      minimumFractionDigits: 0,
      maximumFractionDigits: cap
    }).format(numValue);
  } else {
    return new Intl.NumberFormat('en-US', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(numValue);
  }
}

export function formatDate(date) {
  return new Date(date).toLocaleString('en-US', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });
}

// Check if payment is paid based on columnQ value
export function isPaymentPaid(columnQValue) {
  return columnQValue === true || 
         columnQValue === 'TRUE' || 
         columnQValue === 'true' ||
         columnQValue === 'True' ||
         columnQValue === 1 ||
         columnQValue === '1' ||
         (typeof columnQValue === 'string' && columnQValue.trim().toUpperCase() === 'TRUE');
}

