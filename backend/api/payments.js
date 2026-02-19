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
    const isAdmin = req.user?.role === 'Admin';
    const userId = req.user?.id;
    
    // For non-admin users, filter by their Discord ID
    const cacheKey = isAdmin ? 'all' : `user_${userId}`;
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
        dueDate: getValue(cols.dueDate),
        userid: getValue(cols.userid),
        amount: getValue(cols.amount),
        ppu: getValue(cols.ppu),
        total: getValue(cols.total),
        paymentSource: getValue(cols.paymentSource),
        paymentMethod: getValue(cols.paymentMethod),
        currency: getValue(cols.currency),
        card: getValue(cols.card),
        iban: getValue(cols.iban),
        name: getValue(cols.name),
        wallet: getValue(cols.wallet),
        paypalAddress: getValue(cols.paypalAddress),
        uniqueID: getValue(cols.uniqueID),
        note: getValue(cols.note),
        status: getValue(cols.status), // Status column (R column)
        noteAdmin: getValue(cols.noteAdmin),
        // Legacy fields for backward compatibility
        price: getValue(cols.ppu), // Alias for ppu
        gheymat: getValue(cols.total), // Alias for total
        sheba: '', // No longer in new structure
        phone: '', // No longer in new structure
        admin: '', // No longer in new structure
        processed: false,
        columnQ: false,
        timeLeftToPay: ''
      };
    });
    
    // Filter by user if not admin
    let filteredPayments = payments;
    if (!isAdmin && userId) {
      filteredPayments = payments.filter(p => p.userid === userId);
    }
    
    // Sort payments by time (latest first)
    // Time format: "DD/MM/YYYY HH:MM:SS"
    filteredPayments.sort((a, b) => {
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
    
    cache.setPaymentList(cacheKey, filteredPayments);
    res.json(filteredPayments);
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
      dueDate: getValue(cols.dueDate),
      userid: getValue(cols.userid),
      amount: getValue(cols.amount),
      ppu: getValue(cols.ppu),
      total: getValue(cols.total),
      paymentSource: getValue(cols.paymentSource),
      paymentMethod: getValue(cols.paymentMethod),
      currency: getValue(cols.currency),
      card: getValue(cols.card),
      iban: getValue(cols.iban),
      name: getValue(cols.name),
      wallet: getValue(cols.wallet),
      paypalAddress: getValue(cols.paypalAddress),
      uniqueID: getValue(cols.uniqueID),
      note: getValue(cols.note),
      status: getValue(cols.status), // Status column (R column)
      noteAdmin: getValue(cols.noteAdmin),
      // Legacy fields for backward compatibility
      price: getValue(cols.ppu),
      gheymat: getValue(cols.total),
      realm: '',
      sheba: '',
      phone: '',
      admin: '',
      processed: false,
      columnQ: false,
      timeLeftToPay: ''
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
      amount,
      ppu,
      dueDate,
      paymentSource,
      paymentMethod,
      currency,
      card,
      iban,
      name,
      wallet,
      paypalAddress,
      note,
      noteAdmin
    } = req.body;
    
    // Validate required fields
    if (!discordId || !amount || !ppu) {
      return res.status(400).json({ error: 'Missing required fields: discordId, amount, and ppu are required' });
    }
    
    // Calculate total: always amount * PPU (ignore any total value sent from frontend)
    const amountNum = parseFloat(String(amount).replace(/,/g, '')) || 0;
    const ppuNum = parseFloat(String(ppu).replace(/,/g, '')) || 0;
    const total = amountNum * ppuNum;
    
    // Use provided dueDate or calculate from Payment Info
    let dueDateFormatted = dueDate;
    if (!dueDateFormatted) {
      // Get Payment Info to calculate due date if not provided
      const paymentInfo = await sheets.getPaymentInfoOptions();
      const dueDateHours = paymentInfo.dueDateInfo.hours || 24;
      
      // Calculate due date: current time + hours from Payment Info
      const now = new Date();
      const calculatedDueDate = new Date(now.getTime() + (dueDateHours * 60 * 60 * 1000));
      dueDateFormatted = utils.formatDate(calculatedDueDate);
    }
    
    const time = utils.formatDate();
    const uniqueID = utils.generateUniqueId();
    
    // Prepare payment data for sheet - Payment v2 structure
    const cols = config.paymentSheetColumns;
    const paymentData = {};
    
    // Map data to column indices
    paymentData[cols.time] = time;
    paymentData[cols.dueDate] = dueDateFormatted;
    paymentData[cols.userid] = discordId;
    paymentData[cols.amount] = amount || '';
    paymentData[cols.ppu] = ppu || '';
    paymentData[cols.total] = total.toString();
    paymentData[cols.paymentSource] = paymentSource || '';
    paymentData[cols.paymentMethod] = paymentMethod || '';
    paymentData[cols.currency] = currency || '';
    paymentData[cols.card] = card || '';
    paymentData[cols.iban] = iban || ''; // IBAN comes from sellerInfo.sheba (sent as iban)
    paymentData[cols.name] = name || '';
    paymentData[cols.wallet] = wallet || '';
    paymentData[cols.paypalAddress] = paypalAddress || ''; // Paypal Address comes from sellerInfo.paypalWallet (sent as paypalAddress)
    paymentData[cols.uniqueID] = uniqueID;
    paymentData[cols.note] = note || '';
    paymentData[cols.status] = ''; // Status field is not written to (left empty)
    paymentData[cols.noteAdmin] = noteAdmin || '';
    
    // Add to payment sheet - create array in correct column order (18 columns: 0-17)
    const rowData = new Array(18).fill('');
    Object.keys(paymentData).forEach(colIndex => {
      const idx = parseInt(colIndex);
      if (!isNaN(idx) && idx < 18) {
        rowData[idx] = paymentData[colIndex];
      }
    });
    
    // Add row using sheets service - it will use raw API for Payment v2 sheet
    await sheets.addRow(config.sheetNames.payment, rowData);
    
    // Send Discord webhook (with legacy format for compatibility)
    try {
      const adminName = await userService.getUserNickname(req.user?.id) || req.user?.id || 'Unknown';
      await discord.sendDiscordMessage({
        discordId,
        amount: amountNum,
        price: ppuNum,
        gheymat: total,
        realm: '', // No longer used
        admin: adminName,
        note: note || '',
        time,
        id: uniqueID,
        sheba: '', // No longer used
        name: name || '',
        action: 'create',
        currency: currency || ''
      });
    } catch (webhookError) {
      console.error('Discord webhook error:', webhookError);
      // Don't fail the request if webhook fails
    }
    
    // Log payment creation
    const adminName = await userService.getUserNickname(req.user?.id) || req.user?.id || 'Unknown';
    await sheets.addPaymentLog(uniqueID, 'create', adminName, {
      amount,
      ppu,
      total,
      paymentSource,
      paymentMethod,
      currency,
      discordId
    });
    
    // Invalidate cache
    cache.invalidatePaymentList();
    
    res.json({ 
      message: 'Payment created successfully',
      uniqueID,
      total: total
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
      dueDate: getValue(cols.dueDate),
      userid: getValue(cols.userid),
      amount: getValue(cols.amount),
      ppu: getValue(cols.ppu),
      total: getValue(cols.total),
      paymentSource: getValue(cols.paymentSource),
      paymentMethod: getValue(cols.paymentMethod),
      currency: getValue(cols.currency),
      card: getValue(cols.card),
      iban: getValue(cols.iban),
      name: getValue(cols.name),
      wallet: getValue(cols.wallet),
      paypalAddress: getValue(cols.paypalAddress),
      uniqueID: getValue(cols.uniqueID),
      note: getValue(cols.note),
      noteAdmin: getValue(cols.noteAdmin)
    };
    
    const updateData = {};
    const changes = {}; // Track changes for logging
    
    // Update only provided fields - use column index as key
    // Also recalculate total if amount or ppu changes
    let recalculateTotal = false;
    let newAmount = currentPayment.amount;
    let newPpu = currentPayment.ppu;
    
    if (req.body.time !== undefined) {
      updateData[cols.time] = req.body.time;
      if (req.body.time !== currentPayment.time) {
        changes.time = { old: currentPayment.time, new: req.body.time };
      }
    }
    if (req.body.dueDate !== undefined) {
      updateData[cols.dueDate] = req.body.dueDate;
      if (req.body.dueDate !== currentPayment.dueDate) {
        changes.dueDate = { old: currentPayment.dueDate, new: req.body.dueDate };
      }
    }
    if (req.body.userid !== undefined) {
      updateData[cols.userid] = req.body.userid;
      if (req.body.userid !== currentPayment.userid) {
        changes.userid = { old: currentPayment.userid, new: req.body.userid };
      }
    }
    if (req.body.amount !== undefined) {
      updateData[cols.amount] = req.body.amount;
      newAmount = req.body.amount;
      recalculateTotal = true;
      if (req.body.amount !== currentPayment.amount) {
        changes.amount = { old: currentPayment.amount, new: req.body.amount };
      }
    }
    if (req.body.ppu !== undefined || req.body.price !== undefined) {
      const ppuValue = req.body.ppu !== undefined ? req.body.ppu : req.body.price;
      updateData[cols.ppu] = ppuValue;
      newPpu = ppuValue;
      recalculateTotal = true;
      if (ppuValue !== currentPayment.ppu) {
        changes.ppu = { old: currentPayment.ppu, new: ppuValue };
      }
    }
    if (req.body.total !== undefined) {
      updateData[cols.total] = req.body.total;
      if (req.body.total !== currentPayment.total) {
        changes.total = { old: currentPayment.total, new: req.body.total };
      }
    } else if (recalculateTotal) {
      // Recalculate total if amount or ppu changed
      const total = (parseFloat(newAmount) || 0) * (parseFloat(newPpu) || 0);
      updateData[cols.total] = total.toString();
      changes.total = { old: currentPayment.total, new: total.toString() };
    }
    if (req.body.paymentSource !== undefined) {
      updateData[cols.paymentSource] = req.body.paymentSource;
      if (req.body.paymentSource !== currentPayment.paymentSource) {
        changes.paymentSource = { old: currentPayment.paymentSource, new: req.body.paymentSource };
      }
    }
    if (req.body.paymentMethod !== undefined) {
      updateData[cols.paymentMethod] = req.body.paymentMethod;
      if (req.body.paymentMethod !== currentPayment.paymentMethod) {
        changes.paymentMethod = { old: currentPayment.paymentMethod, new: req.body.paymentMethod };
      }
    }
    if (req.body.currency !== undefined) {
      updateData[cols.currency] = req.body.currency;
      if (req.body.currency !== currentPayment.currency) {
        changes.currency = { old: currentPayment.currency, new: req.body.currency };
      }
    }
    if (req.body.card !== undefined) {
      updateData[cols.card] = req.body.card;
      if (req.body.card !== currentPayment.card) {
        changes.card = { old: currentPayment.card, new: req.body.card };
      }
    }
    if (req.body.iban !== undefined) {
      updateData[cols.iban] = req.body.iban;
      if (req.body.iban !== currentPayment.iban) {
        changes.iban = { old: currentPayment.iban, new: req.body.iban };
      }
    }
    if (req.body.name !== undefined) {
      updateData[cols.name] = req.body.name;
      if (req.body.name !== currentPayment.name) {
        changes.name = { old: currentPayment.name, new: req.body.name };
      }
    }
    if (req.body.wallet !== undefined) {
      updateData[cols.wallet] = req.body.wallet;
      if (req.body.wallet !== currentPayment.wallet) {
        changes.wallet = { old: currentPayment.wallet, new: req.body.wallet };
      }
    }
    if (req.body.paypalAddress !== undefined) {
      updateData[cols.paypalAddress] = req.body.paypalAddress;
      if (req.body.paypalAddress !== currentPayment.paypalAddress) {
        changes.paypalAddress = { old: currentPayment.paypalAddress, new: req.body.paypalAddress };
      }
    }
    if (req.body.note !== undefined) {
      updateData[cols.note] = req.body.note;
      if (req.body.note !== currentPayment.note) {
        changes.note = { old: currentPayment.note, new: req.body.note };
      }
    }
    // Status field is not updated (left empty)
    if (req.body.noteAdmin !== undefined) {
      updateData[cols.noteAdmin] = req.body.noteAdmin;
      if (req.body.noteAdmin !== currentPayment.noteAdmin) {
        changes.noteAdmin = { old: currentPayment.noteAdmin, new: req.body.noteAdmin };
      }
    }
    // Legacy field support
    if (req.body.price !== undefined && req.body.ppu === undefined) {
      updateData[cols.ppu] = req.body.price;
      newPpu = req.body.price;
      recalculateTotal = true;
    }
    if (req.body.gheymat !== undefined && req.body.total === undefined) {
      updateData[cols.total] = req.body.gheymat;
    }
    
    // Update using sheets service (will use raw API for Payment sheet)
    await sheets.updateRow(row, updateData, config.sheetNames.payment, rowIndex);
    
    // Log payment edit if there were changes
    if (Object.keys(changes).length > 0) {
      const updatedBy = await userService.getUserNickname(req.user?.id) || req.user?.id || 'Unknown';
      await sheets.addPaymentLog(currentPayment.uniqueID, 'edit', updatedBy, changes);
    }
    
    // Get updated payment data for webhook
    const updatedPayment = {
      ...currentPayment,
      ...req.body,
      id: req.params.id,
      uniqueID: currentPayment.uniqueID,
      action: 'update',
      updatedBy: await userService.getUserNickname(req.user?.id) || req.user?.id || 'Unknown',
      // Include old values for comparison
      oldPpu: currentPayment.ppu,
      oldAmount: currentPayment.amount,
      oldTotal: currentPayment.total,
      currency: currentPayment.currency || ''
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

// Update payment status (mark as paid/unpaid)
router.patch('/:id/status', requireAuth, async (req, res) => {
  try {
    const rowIndex = parseInt(req.params.id) - 4;
    const { columnQ } = req.body;
    
    if (typeof columnQ !== 'boolean' && columnQ !== undefined) {
      return res.status(400).json({ error: 'columnQ must be a boolean' });
    }
    
    const rows = await sheets.getRows(config.sheetNames.payment);
    
    if (rowIndex < 0 || rowIndex >= rows.length) {
      return res.status(404).json({ error: 'Payment not found' });
    }
    
    const row = rows[rowIndex];
    const cols = config.paymentSheetColumns;
    
    // Get current payment data
    const getValue = (colIndex) => {
      const rawData = row._rawData || [];
      return rawData[colIndex] || '';
    };
    
    // Check if columnQ is currently TRUE
    const isColumnQTrue = (value) => {
      return value === true || 
             value === 'TRUE' || 
             value === 'true' ||
             value === 'True' ||
             value === 1 ||
             value === '1' ||
             (typeof value === 'string' && value.trim().toUpperCase() === 'TRUE');
    };
    
    const currentColumnQ = getValue(cols.columnQ);
    const currentPayment = {
      uniqueID: getValue(cols.uniqueID),
      columnQ: isColumnQTrue(currentColumnQ),
    };
    
    // Update status - use columnQ if provided, otherwise fallback to processed for backward compatibility
    const updateData = {};
    if (columnQ !== undefined) {
      updateData[cols.columnQ] = columnQ ? 'TRUE' : 'FALSE';
    } else if (req.body.processed !== undefined) {
      // Backward compatibility: if processed is provided, update columnQ
      updateData[cols.columnQ] = req.body.processed ? 'TRUE' : 'FALSE';
    } else {
      return res.status(400).json({ error: 'columnQ or processed must be provided' });
    }
    
    await sheets.updateRow(row, updateData, config.sheetNames.payment, rowIndex);
    
    // Log the change
    const newColumnQ = columnQ !== undefined ? columnQ : req.body.processed;
    if (newColumnQ !== currentPayment.columnQ) {
      const updatedBy = await userService.getUserNickname(req.user?.id) || req.user?.id || 'Unknown';
      await sheets.addPaymentLog(currentPayment.uniqueID, 'edit', updatedBy, {
        columnQ: { old: currentPayment.columnQ, new: newColumnQ }
      });
    }
    
    // Invalidate cache
    cache.invalidatePaymentList();
    
    res.json({ message: 'Payment status updated successfully', columnQ: newColumnQ });
  } catch (error) {
    console.error('Error updating payment status:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get payment logs
router.get('/:id/logs', requireAuth, async (req, res) => {
  try {
    const rowIndex = parseInt(req.params.id) - 4;
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
    
    const uniqueID = getValue(cols.uniqueID);
    const logs = await sheets.getPaymentLogs(uniqueID);
    
    res.json(logs);
  } catch (error) {
    console.error('Error fetching payment logs:', error);
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
      dueDate: getValue(cols.dueDate),
      userid: getValue(cols.userid),
      amount: getValue(cols.amount),
      ppu: getValue(cols.ppu),
      total: getValue(cols.total),
      paymentSource: getValue(cols.paymentSource),
      paymentMethod: getValue(cols.paymentMethod),
      currency: getValue(cols.currency),
      card: getValue(cols.card),
      iban: getValue(cols.iban),
      name: getValue(cols.name),
      wallet: getValue(cols.wallet),
      paypalAddress: getValue(cols.paypalAddress),
      uniqueID: getValue(cols.uniqueID),
      note: getValue(cols.note),
      noteAdmin: getValue(cols.noteAdmin),
      action: 'delete',
      deletedBy: await userService.getUserNickname(req.user?.id) || req.user?.id || 'Unknown',
      // Legacy fields for webhook compatibility
      price: getValue(cols.ppu),
      gheymat: getValue(cols.total),
      realm: '',
      sheba: '',
      phone: '',
      admin: '',
      processed: false
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
