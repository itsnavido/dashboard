// Utility functions

export function formatNumber(value, allowDecimals = true) {
  if (value === '' || value === null || value === undefined) return '';
  const numValue = typeof value === 'string' ? parseFloat(value.replace(/,/g, '')) : value;
  if (isNaN(numValue)) return '';
  
  if (allowDecimals) {
    // Check if the number has decimal places
    const hasDecimals = numValue % 1 !== 0;
    return new Intl.NumberFormat('en-US', {
      minimumFractionDigits: hasDecimals ? 2 : 0,
      maximumFractionDigits: 2
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

