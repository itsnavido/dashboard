// Sellers API routes
const express = require('express');
const sheets = require('../services/sheets');
const cache = require('../services/cache');
const config = require('../config/config');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

// Get seller info by Discord ID
router.get('/:discordId', async (req, res) => {
  try {
    const { discordId } = req.params;
    
    // Check cache first
    const cached = cache.getSellerInfo(discordId);
    if (cached) {
      return res.json(cached);
    }
    
    // Try Seller Info sheet first
    // Seller Info structure: userid (col 0), card (col 1), sheba (col 2), name (col 3), phone (col 4), wallet (col 5), paypalWallet (col 6)
    let row = await sheets.findRowByValue(config.sheetNames.sellerInfo, 0, discordId);
    
    if (row) {
      const rawData = row._rawData || [];
      const sellerInfo = {
        card: rawData[1] || '',
        sheba: rawData[2] || '',
        name: rawData[3] || '',
        phone: rawData[4] || '',
        wallet: rawData[5] || '',
        paypalWallet: rawData[6] || ''
      };
      
      cache.setSellerInfo(discordId, sellerInfo);
      return res.json(sellerInfo);
    }
    
    // Try Info sheet as fallback (if it exists)
    try {
      row = await sheets.findRowByValue(config.sheetNames.info, 1, discordId); // Column B (index 1)
      
      if (row) {
        const rawData = row._rawData || [];
        const sellerInfo = {
          card: rawData[2] || '', // Column C (index 2)
          sheba: rawData[3] || '', // Column D (index 3)
          name: rawData[4] || '', // Column E (index 4)
          phone: rawData[5] || '', // Column F (index 5)
          wallet: rawData[6] || '', // Column G (index 6)
          paypalWallet: rawData[7] || '' // Column H (index 7) - fallback sheet may have different structure
        };
        
        cache.setSellerInfo(discordId, sellerInfo);
        return res.json(sellerInfo);
      }
    } catch (infoSheetError) {
      // Info sheet doesn't exist or error accessing it - that's okay, just continue
      console.log('Info sheet not available or error accessing it:', infoSheetError.message);
    }
    
    res.json({ error: 'Not Found' });
  } catch (error) {
    console.error('Error fetching seller info:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create or update seller info
router.post('/', requireAuth, async (req, res) => {
  try {
    const { discordId, card, sheba, name, phone, wallet, paypalWallet } = req.body;
    
    if (!discordId) {
      return res.status(400).json({ error: 'Discord ID is required' });
    }
    
    // Check if seller exists
    let row = await sheets.findRowByValue(config.sheetNames.sellerInfo, 0, discordId);
    
    if (row) {
      // Update existing - Seller Info: userid (0), card (1), sheba (2), name (3), phone (4), wallet (5), paypalWallet (6)
      await sheets.updateRow(row, {
        1: card || '',
        2: sheba || '',
        3: name || '',
        4: phone || '',
        5: wallet || '',
        6: paypalWallet || ''
      });
    } else {
      // Create new - Seller Info structure: userid, card, sheba, name, phone, wallet, paypalWallet
      const rowData = [discordId, card || '', sheba || '', name || '', phone || '', wallet || '', paypalWallet || ''];
      const sheet = await sheets.getSheet(config.sheetNames.sellerInfo);
      await sheet.addRow(rowData);
    }
    
    // Invalidate cache
    cache.invalidateSellerInfo(discordId);
    
    res.json({ message: 'Seller info saved successfully' });
  } catch (error) {
    console.error('Error saving seller info:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
