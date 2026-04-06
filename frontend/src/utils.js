// Utility functions

/**
 * @param {number|string} value
 * @param {boolean} allowDecimals
 * @param {number} maxFractionDigits - default 2 for amounts/totals; use 6 for PPU
 */
export function formatNumber(value, allowDecimals = true, maxFractionDigits = 2) {
  if (value === '' || value === null || value === undefined) return '';
  const numValue = typeof value === 'string' ? parseFloat(value.replace(/,/g, '')) : value;
  if (isNaN(numValue)) return '';
  
  if (allowDecimals) {
    const hasDecimals = numValue % 1 !== 0;
    // Legacy: at least 2 fraction digits when max is 2 (amounts/totals). PPU (max 6) uses min 0 so precision is not padded away.
    const minFrac = hasDecimals && maxFractionDigits === 2 ? 2 : 0;
    return new Intl.NumberFormat('en-US', {
      minimumFractionDigits: minFrac,
      maximumFractionDigits: maxFractionDigits
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

