// Analytics API routes
const express = require('express');
const sheets = require('../services/sheets');
const config = require('../config/config');
const { requireAuth } = require('../middleware/auth');
const { requireAdmin } = require('../middleware/roleCheck');

const router = express.Router();

// Helper function to get all payments (similar to payments.js)
async function getAllPaymentsData() {
  const rows = await sheets.getRows(config.sheetNames.payment);
  return rows.map((row, index) => {
    const cols = config.paymentSheetColumns;
    const getValue = (colIndex) => {
      const rawData = row._rawData || [];
      return rawData[colIndex] || '';
    };
    
    return {
      id: index + 4,
      time: getValue(cols.time),
      userid: getValue(cols.userid),
      realm: getValue(cols.realm),
      amount: getValue(cols.amount),
      price: getValue(cols.price),
      note: getValue(cols.note),
      gheymat: getValue(cols.gheymat),
      card: getValue(cols.card),
      sheba: getValue(cols.sheba),
      name: getValue(cols.name),
      phone: getValue(cols.phone),
      wallet: getValue(cols.wallet),
      uniqueID: getValue(cols.uniqueID),
      admin: getValue(cols.admin),
      processed: getValue(cols.processed) === true || getValue(cols.processed) === 'TRUE' || getValue(cols.processed) === 'true',
      columnQ: (() => {
        const value = getValue(cols.columnQ);
        if (value === true || value === 1) {
          return true;
        }
        if (typeof value === 'string') {
          const normalizedValue = value.trim().toUpperCase();
          if (normalizedValue === 'TRUE' || normalizedValue === '1' || normalizedValue === 'YES' || normalizedValue === 'Y') {
            return true;
          }
        }
        return false;
      })(),
      timeLeftToPay: getValue(cols.timeLeftToPay) || '',
      createdAt: getValue(cols.time) // Use time as createdAt for filtering
    };
  });
}

// All analytics routes require authentication
router.use(requireAuth);

// Get overview statistics
router.get('/overview', requireAdmin, async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    
    const payments = await getAllPaymentsData();
    
    let filteredPayments = payments;
    
    // Filter by date range if provided
    if (startDate || endDate) {
      filteredPayments = payments.filter(payment => {
        if (!payment.time) return false;
        try {
          const [datePart] = payment.time.trim().split(' ');
          const [day, month, year] = datePart.split('/');
          const paymentDate = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
          
          if (startDate && paymentDate < new Date(startDate)) return false;
          if (endDate && paymentDate > new Date(endDate)) return false;
          return true;
        } catch (e) {
          return false;
        }
      });
    }
    
    // Helper function to check if payment is paid based on columnQ
    const isPaymentPaid = (columnQValue) => {
      if (columnQValue === true || columnQValue === 1) {
        return true;
      }
      if (typeof columnQValue === 'string') {
        const normalizedValue = columnQValue.trim().toUpperCase();
        return normalizedValue === 'TRUE' || normalizedValue === '1' || normalizedValue === 'YES' || normalizedValue === 'Y';
      }
      return false;
    };
    
    const totalPayments = filteredPayments.length;
    const paidPayments = filteredPayments.filter(p => isPaymentPaid(p.columnQ)).length;
    const unpaidPayments = totalPayments - paidPayments;
    
    // Calculate total revenue
    const totalRevenue = filteredPayments
      .filter(p => isPaymentPaid(p.columnQ))
      .reduce((sum, p) => {
        const amount = parseFloat(String(p.gheymat || '').replace(/,/g, '')) || 0;
        return sum + (isNaN(amount) ? 0 : amount);
      }, 0);
    
    res.json({
      totalPayments,
      paidPayments,
      unpaidPayments,
      totalRevenue,
    });
  } catch (error) {
    console.error('Error fetching overview:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get per-user payment totals
router.get('/users', requireAdmin, async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    
    const payments = await getAllPaymentsData();
    
    let filteredPayments = payments;
    
    if (startDate || endDate) {
      filteredPayments = payments.filter(payment => {
        if (!payment.time) return false;
        try {
          const [datePart] = payment.time.trim().split(' ');
          const [day, month, year] = datePart.split('/');
          const paymentDate = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
          
          if (startDate && paymentDate < new Date(startDate)) return false;
          if (endDate && paymentDate > new Date(endDate)) return false;
          return true;
        } catch (e) {
          return false;
        }
      });
    }
    
    // Group by user
    const userTotals = {};
    
    filteredPayments.forEach(payment => {
      const userId = payment.userid;
      if (!userId) return;
      
      if (!userTotals[userId]) {
        userTotals[userId] = {
          userId,
          totalPayments: 0,
          paidPayments: 0,
          unpaidPayments: 0,
          totalAmount: 0,
          paidAmount: 0,
        };
      }
      
      userTotals[userId].totalPayments++;
      const amount = parseFloat(String(payment.gheymat || '').replace(/,/g, '')) || 0;
      
      if (payment.processed === true) {
        userTotals[userId].paidPayments++;
        userTotals[userId].paidAmount += isNaN(amount) ? 0 : amount;
      } else {
        userTotals[userId].unpaidPayments++;
      }
      
      userTotals[userId].totalAmount += isNaN(amount) ? 0 : amount;
    });
    
    // Convert to array and sort by total amount
    const result = Object.values(userTotals).sort((a, b) => b.totalAmount - a.totalAmount);
    
    res.json(result);
  } catch (error) {
    console.error('Error fetching user analytics:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get breakdown by realm
router.get('/realm', requireAdmin, async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    
    const payments = await getAllPaymentsData();
    
    let filteredPayments = payments;
    
    if (startDate || endDate) {
      filteredPayments = payments.filter(payment => {
        if (!payment.time) return false;
        try {
          const [datePart] = payment.time.trim().split(' ');
          const [day, month, year] = datePart.split('/');
          const paymentDate = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
          
          if (startDate && paymentDate < new Date(startDate)) return false;
          if (endDate && paymentDate > new Date(endDate)) return false;
          return true;
        } catch (e) {
          return false;
        }
      });
    }
    
    const realmStats = {};
    
    filteredPayments.forEach(payment => {
      const realm = payment.realm || 'Unknown';
      if (!realmStats[realm]) {
        realmStats[realm] = {
          realm,
          totalPayments: 0,
          paidPayments: 0,
          unpaidPayments: 0,
          totalAmount: 0,
          paidAmount: 0,
        };
      }
      
      realmStats[realm].totalPayments++;
      const amount = parseFloat(String(payment.gheymat || '').replace(/,/g, '')) || 0;
      
      // Helper function to check if payment is paid
      const isPaid = (() => {
        const val = payment.columnQ;
        if (val === true || val === 1) return true;
        if (typeof val === 'string') {
          const normalized = val.trim().toUpperCase();
          return normalized === 'TRUE' || normalized === '1' || normalized === 'YES' || normalized === 'Y';
        }
        return false;
      })();
      
      if (isPaid) {
        realmStats[realm].paidPayments++;
        realmStats[realm].paidAmount += isNaN(amount) ? 0 : amount;
      } else {
        realmStats[realm].unpaidPayments++;
      }
      
      realmStats[realm].totalAmount += isNaN(amount) ? 0 : amount;
    });
    
    const result = Object.values(realmStats);
    
    res.json(result);
  } catch (error) {
    console.error('Error fetching realm analytics:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get timeline data (payments over time)
router.get('/timeline', requireAdmin, async (req, res) => {
  try {
    const { startDate, endDate, groupBy = 'day' } = req.query;
    
    const payments = await getAllPaymentsData();
    
    let filteredPayments = payments;
    
    if (startDate || endDate) {
      filteredPayments = payments.filter(payment => {
        if (!payment.time) return false;
        try {
          const [datePart] = payment.time.trim().split(' ');
          const [day, month, year] = datePart.split('/');
          const paymentDate = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
          
          if (startDate && paymentDate < new Date(startDate)) return false;
          if (endDate && paymentDate > new Date(endDate)) return false;
          return true;
        } catch (e) {
          return false;
        }
      });
    }
    
    const timeline = {};
    
    filteredPayments.forEach(payment => {
      if (!payment.time) return;
      
      try {
        const [datePart] = payment.time.trim().split(' ');
        const [day, month, year] = datePart.split('/');
        const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
        
        let key;
        
        if (groupBy === 'day') {
          key = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        } else if (groupBy === 'week') {
          const weekStart = new Date(date);
          weekStart.setDate(date.getDate() - date.getDay());
          const wsYear = weekStart.getFullYear();
          const wsMonth = String(weekStart.getMonth() + 1).padStart(2, '0');
          const wsDay = String(weekStart.getDate()).padStart(2, '0');
          key = `${wsYear}-${wsMonth}-${wsDay}`;
        } else if (groupBy === 'month') {
          key = `${year}-${String(month).padStart(2, '0')}`;
        } else {
          key = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        }
        
        if (!timeline[key]) {
          timeline[key] = {
            date: key,
            count: 0,
            amount: 0,
          };
        }
        
        timeline[key].count++;
        const amount = parseFloat(String(payment.gheymat || '').replace(/,/g, '')) || 0;
        timeline[key].amount += isNaN(amount) ? 0 : amount;
      } catch (e) {
        // Skip invalid dates
      }
    });
    
    const result = Object.values(timeline).sort((a, b) => a.date.localeCompare(b.date));
    
    res.json(result);
  } catch (error) {
    console.error('Error fetching timeline:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get status summary
router.get('/status', requireAdmin, async (req, res) => {
  try {
    const payments = await getAllPaymentsData();
    
    const statusCounts = {
      paid: 0,
      unpaid: 0,
    };
    
    // Helper function to check if payment is paid
    const isPaymentPaid = (columnQValue) => {
      if (columnQValue === true || columnQValue === 1) {
        return true;
      }
      if (typeof columnQValue === 'string') {
        const normalizedValue = columnQValue.trim().toUpperCase();
        return normalizedValue === 'TRUE' || normalizedValue === '1' || normalizedValue === 'YES' || normalizedValue === 'Y';
      }
      return false;
    };
    
    payments.forEach(payment => {
      if (isPaymentPaid(payment.columnQ)) {
        statusCounts.paid++;
      } else {
        statusCounts.unpaid++;
      }
    });
    
    res.json(statusCounts);
  } catch (error) {
    console.error('Error fetching status summary:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
