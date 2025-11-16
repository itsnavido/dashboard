// Payments API routes
const express = require('express');
const sheets = require('../services/sheets');
const cache = require('../services/cache');
const discord = require('../services/discord');
const utils = require('../services/utils');
const config = require('../config/config');
const { requireAuth } = require('../middleware/auth');
const userService = require('../services/userService');

const router = express.Router();

// Get all payments
router.get('/', requireAuth, async (req, res) => {
  try {
    const cacheKey = 'all';
    const cached = cache.getPaymentList(cacheKey);
    if (cached) {
      return res.json(cached);
    }
    
    const rows = await sheets.getRows(config.sheetNames.payment);
    const payments = rows.map((row, index) => {
      const cols = config.paymentSheetColumns;
      // Access by column index from raw data
      const getValue = (colIndex) => {
        const rawData = row._rawData || [];
        return rawData[colIndex] || '';
      };
      
      return {
        id: index + 4, // Row number (1-indexed, +3 for header rows 1-3, +1 for 0-indexed)
        time: getValue(cols.time),
        userid: getValue(cols.userid),
        paymentDuration: getValue(cols.paymentDuration),
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
        columnQ: getValue(cols.columnQ) === true || getValue(cols.columnQ) === 'TRUE' || getValue(cols.columnQ) === 'true',
        timeLeftToPay: getValue(cols.timeLeftToPay) || ''
      };
    });
    
    // Sort payments by time (latest first)
    // Time format: "DD/MM/YYYY HH:MM:SS"
    payments.sort((a, b) => {
      const parseTime = (timeStr) => {
        if (!timeStr || !timeStr.trim()) return 0;
        try {
          // Parse format: "DD/MM/YYYY HH:MM:SS"
          const [datePart, timePart] = timeStr.trim().split(' ');
          if (!datePart || !timePart) return 0;
          
          const [day, month, year] = datePart.split('/');
          const [hours, minutes, seconds] = timePart.split(':');
          
          if (!day || !month || !year || !hours || !minutes || !seconds) return 0;
          
          // Create date in GMT+3:30 timezone (reverse the offset)
          const date = new Date(
            parseInt(year),
            parseInt(month) - 1,
            parseInt(day),
            parseInt(hours),
            parseInt(minutes),
            parseInt(seconds)
          );
          // Adjust for GMT+3:30 offset
          return date.getTime() - (3.5 * 60 * 60 * 1000);
        } catch (e) {
          return 0;
        }
      };
      
      const timeA = parseTime(a.time);
      const timeB = parseTime(b.time);
      
      // Sort descending (newest first)
      return timeB - timeA;
    });
    
    cache.setPaymentList(cacheKey, payments);
    res.json(payments);
  } catch (error) {
    console.error('Error fetching payments:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get payment by ID
router.get('/:id', requireAuth, async (req, res) => {
  try {
    const rowIndex = parseInt(req.params.id) - 4; // Convert to 0-indexed, account for 3 header rows (rows 1-3)
    const rows = await sheets.getRows(config.sheetNames.payment);
    
    if (rowIndex < 0 || rowIndex >= rows.length) {
      return res.status(404).json({ error: 'Payment not found' });
    }
    
    const row = rows[rowIndex];
    const cols = config.paymentSheetColumns;
    
    const getValue = (colIndex) => {
      const rawData = row._rawData || [];
      return rawData[colIndex] || '';
    };
    
    const payment = {
      id: parseInt(req.params.id),
      time: getValue(cols.time),
      userid: getValue(cols.userid),
      paymentDuration: getValue(cols.paymentDuration),
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
      columnQ: getValue(cols.columnQ) === true || getValue(cols.columnQ) === 'TRUE' || getValue(cols.columnQ) === 'true' || getValue(cols.columnQ) === true,
      timeLeftToPay: getValue(cols.timeLeftToPay) || ''
    };
    
    res.json(payment);
  } catch (error) {
    console.error('Error fetching payment:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create new payment
router.post('/', requireAuth, async (req, res) => {
  try {
    const {
      discordId,
      paymentType,
      paymentDuration,
      realm,
      amount,
      price,
      gheymat,
      note,
      admin,
      card,
      sheba,
      name,
      phone,
      wallet
    } = req.body;
    
    // Validate required fields
    if (!discordId || !paymentType || !realm) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    
    // Calculate gheymat if not provided
    let finalGheymat = gheymat;
    if (!finalGheymat && amount && price && paymentDuration) {
      finalGheymat = utils.calculateGheymat(paymentDuration, parseFloat(amount), parseFloat(price));
    }
    
    const time = utils.formatDate();
    const uniqueID = utils.generateUniqueId();
    // Use logged-in user's nickname from Users sheet (column E) instead of username
    const adminName = await userService.getUserNickname(req.user?.id) || req.user?.id || 'Unknown';
    
    // Get payment duration message
    const paymentDurationMessage = config.paymentDurationMessages[paymentDuration] || paymentDuration;
    
    // Prepare payment data for sheet - match original structure
    // Original: [time, userid, paymentDuration, amount, price, "", gheymat, realm, card, sheba, name, phone, wallet, uniqueID, admin]
    // But we need to match the column structure from config
    const cols = config.paymentSheetColumns;
    const paymentData = {};
    
    // Map data to column indices
    paymentData[cols.time] = time;
    paymentData[cols.userid] = discordId;
    paymentData[cols.paymentDuration] = paymentDuration || '';
    paymentData[cols.amount] = amount || '';
    paymentData[cols.price] = price || '';
    paymentData[cols.note] = note || '';
    paymentData[cols.gheymat] = finalGheymat || '';
    paymentData[cols.realm] = realm;
    paymentData[cols.card] = card || '';
    paymentData[cols.sheba] = sheba || '';
    paymentData[cols.name] = name || '';
    paymentData[cols.phone] = phone || '';
    paymentData[cols.wallet] = wallet || '';
    paymentData[cols.uniqueID] = uniqueID;
    paymentData[cols.admin] = adminName;
    // Don't set processed field - leave it empty (managed via sheet itself)
    
    // Add to payment sheet - create array in correct column order
    // Columns: 0-4 (time, userid, paymentDuration, amount, price), 5 (#VALUE! - leave empty), 6-15 (rest)
    const rowData = new Array(16).fill(''); // 16 columns total (0-15)
    Object.keys(paymentData).forEach(colIndex => {
      const idx = parseInt(colIndex);
      if (!isNaN(idx) && idx < 16) {
        rowData[idx] = paymentData[colIndex];
      }
    });
    // Column 5 is #VALUE! - leave it empty (already empty from fill(''))
    
    // Add row using sheets service - it will use raw API for Payment sheet
    await sheets.addRow(config.sheetNames.payment, rowData);
    
    // Send Discord webhook
    try {
      const currency = paymentDuration === 'usdt days' ? '$' : 'Toman';
      await discord.sendDiscordMessage({
        discordId,
        amount: parseFloat(amount) || 0,
        price: parseFloat(price) || 0,
        gheymat: finalGheymat ? finalGheymat / 10 : 0,
        paymentDuration: paymentDurationMessage,
        realm,
        admin: adminName,
        note: note || '',
        time,
        id: uniqueID,
        sheba: sheba || '',
        name: name || '',
        action: 'create',
        currency: currency
      });
    } catch (webhookError) {
      console.error('Discord webhook error:', webhookError);
      // Don't fail the request if webhook fails
    }
    
    // Invalidate cache
    cache.invalidatePaymentList();
    
    res.json({ 
      message: 'Payment created successfully',
      uniqueID,
      gheymat: finalGheymat
    });
  } catch (error) {
    console.error('Error creating payment:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update payment
router.put('/:id', requireAuth, async (req, res) => {
  try {
    const rowIndex = parseInt(req.params.id) - 4; // Convert to 0-indexed, account for 3 header rows (rows 1-3)
    const rows = await sheets.getRows(config.sheetNames.payment);
    
    if (rowIndex < 0 || rowIndex >= rows.length) {
      return res.status(404).json({ error: 'Payment not found' });
    }
    
    const row = rows[rowIndex];
    const cols = config.paymentSheetColumns;
    
    // Get current payment data for webhook (before update)
    const getValue = (colIndex) => {
      const rawData = row._rawData || [];
      return rawData[colIndex] || '';
    };
    
    const currentPayment = {
      id: req.params.id,
      time: getValue(cols.time),
      userid: getValue(cols.userid),
      paymentDuration: getValue(cols.paymentDuration),
      realm: getValue(cols.realm),
      amount: getValue(cols.amount),
      price: getValue(cols.price),
      gheymat: getValue(cols.gheymat),
      note: getValue(cols.note),
      card: getValue(cols.card),
      sheba: getValue(cols.sheba),
      name: getValue(cols.name),
      phone: getValue(cols.phone),
      wallet: getValue(cols.wallet),
      uniqueID: getValue(cols.uniqueID),
      admin: getValue(cols.admin),
      processed: getValue(cols.processed) === true || getValue(cols.processed) === 'TRUE' || getValue(cols.processed) === 'true'
    };
    
    const updateData = {};
    
    // Update only provided fields - use column index as key
    if (req.body.time !== undefined) updateData[cols.time] = req.body.time;
    if (req.body.userid !== undefined) updateData[cols.userid] = req.body.userid;
    if (req.body.paymentDuration !== undefined) updateData[cols.paymentDuration] = req.body.paymentDuration;
    if (req.body.realm !== undefined) updateData[cols.realm] = req.body.realm;
    if (req.body.amount !== undefined) updateData[cols.amount] = req.body.amount;
    if (req.body.price !== undefined) updateData[cols.price] = req.body.price;
    if (req.body.note !== undefined) updateData[cols.note] = req.body.note;
    if (req.body.gheymat !== undefined) updateData[cols.gheymat] = req.body.gheymat;
    if (req.body.card !== undefined) updateData[cols.card] = req.body.card;
    if (req.body.sheba !== undefined) updateData[cols.sheba] = req.body.sheba;
    if (req.body.name !== undefined) updateData[cols.name] = req.body.name;
    if (req.body.phone !== undefined) updateData[cols.phone] = req.body.phone;
    if (req.body.wallet !== undefined) updateData[cols.wallet] = req.body.wallet;
    if (req.body.admin !== undefined) updateData[cols.admin] = req.body.admin;
    if (req.body.processed !== undefined) updateData[cols.processed] = req.body.processed;
    
    // Update using sheets service (will use raw API for Payment sheet)
    await sheets.updateRow(row, updateData, config.sheetNames.payment, rowIndex);
    
    // Get updated payment data for webhook (include old values, especially oldPrice)
    const paymentDurationForCurrency = req.body.paymentDuration || currentPayment.paymentDuration;
    const currency = paymentDurationForCurrency === 'usdt days' ? '$' : 'Toman';
    
    const updatedPayment = {
      ...currentPayment,
      ...req.body,
      id: req.params.id,
      uniqueID: currentPayment.uniqueID,
      action: 'update',
      updatedBy: await userService.getUserNickname(req.user?.id) || req.user?.id || 'Unknown',
      // Include old values for comparison
      oldPrice: currentPayment.price,
      oldAmount: currentPayment.amount,
      oldGheymat: currentPayment.gheymat,
      oldRealm: currentPayment.realm,
      oldPaymentDuration: currentPayment.paymentDuration,
      currency: currency
    };
    
    // Send Discord webhook
    try {
      await discord.sendDiscordMessage(updatedPayment);
    } catch (webhookError) {
      console.error('Discord webhook error:', webhookError);
      // Don't fail the request if webhook fails
    }
    
    // Invalidate cache
    cache.invalidatePaymentList();
    
    res.json({ message: 'Payment updated successfully' });
  } catch (error) {
    console.error('Error updating payment:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete payment
router.delete('/:id', requireAuth, async (req, res) => {
  try {
    const rowIndex = parseInt(req.params.id) - 4; // Convert to 0-indexed, account for 3 header rows (rows 1-3)
    const rows = await sheets.getRows(config.sheetNames.payment);
    
    if (rowIndex < 0 || rowIndex >= rows.length) {
      return res.status(404).json({ error: 'Payment not found' });
    }
    
    const row = rows[rowIndex];
    const cols = config.paymentSheetColumns;
    
    // Get payment data for webhook (before deletion)
    const getValue = (colIndex) => {
      const rawData = row._rawData || [];
      return rawData[colIndex] || '';
    };
    
    const deletedPayment = {
      id: req.params.id,
      time: getValue(cols.time),
      userid: getValue(cols.userid),
      paymentDuration: getValue(cols.paymentDuration),
      realm: getValue(cols.realm),
      amount: getValue(cols.amount),
      price: getValue(cols.price),
      gheymat: getValue(cols.gheymat),
      note: getValue(cols.note),
      card: getValue(cols.card),
      sheba: getValue(cols.sheba),
      name: getValue(cols.name),
      phone: getValue(cols.phone),
      wallet: getValue(cols.wallet),
      uniqueID: getValue(cols.uniqueID),
      admin: getValue(cols.admin),
      processed: getValue(cols.processed) === true || getValue(cols.processed) === 'TRUE' || getValue(cols.processed) === 'true',
      action: 'delete',
      deletedBy: await userService.getUserNickname(req.user?.id) || req.user?.id || 'Unknown',
      currency: getValue(cols.paymentDuration) === 'usdt days' ? '$' : 'Toman'
    };
    
    await sheets.deleteRow(row, config.sheetNames.payment, rowIndex);
    
    // Send Discord webhook
    try {
      await discord.sendDiscordMessage(deletedPayment);
    } catch (webhookError) {
      console.error('Discord webhook error:', webhookError);
      // Don't fail the request if webhook fails
    }
    
    // Invalidate cache
    cache.invalidatePaymentList();
    
    res.json({ message: 'Payment deleted successfully' });
  } catch (error) {
    console.error('Error deleting payment:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;

