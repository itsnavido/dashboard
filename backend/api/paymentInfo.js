// Payment Info API routes
const express = require('express');
const sheets = require('../services/sheets');

const router = express.Router();

// Get Payment Info options (Payment Source, Payment Method, Due Date info)
router.get('/', async (req, res) => {
  try {
    const options = await sheets.getPaymentInfoOptions();
    res.json(options);
  } catch (error) {
    console.error('Error fetching Payment Info options:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
