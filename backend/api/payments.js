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
        id: index + 4,
        time: getValue(cols.time),
        dueDate: getValue(cols.dueDate),
        userid: getValue(cols.userid),
        amount: getValue(cols.amount),
        ppu: getValue(cols.ppu),
        total: getValue(cols.total),
        paymentSource: getValue(cols.paymentSource),
        paymentMethod: getValue(cols.paymentMethod),
        card: getValue(cols.card),
        iban: getValue(cols.iban),
        name: getValue(cols.name),
        wallet: getValue(cols.wallet),
        paypalAddress: getValue(cols.paypalAddress),
        uniqueID: getValue(cols.uniqueID),
        note: getValue(cols.note),
        author: getValue(cols.author),
        paymentTime: getValue(cols.paymentTime),
        status: getValue(cols.status),
        price: getValue(cols.ppu),
        gheymat: getValue(cols.total),
        sheba: getValue(cols.iban),
        phone: '',
        admin: '',
        processed: false,
        columnQ: (getValue(cols.status) || '').trim().toLowerCase() === 'paid',
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
      card: getValue(cols.card),
      iban: getValue(cols.iban),
      name: getValue(cols.name),
      wallet: getValue(cols.wallet),
      paypalAddress: getValue(cols.paypalAddress),
      uniqueID: getValue(cols.uniqueID),
      note: getValue(cols.note),
      author: getValue(cols.author),
      paymentTime: getValue(cols.paymentTime),
      status: getValue(cols.status),
      price: getValue(cols.ppu),
      gheymat: getValue(cols.total),
      sheba: getValue(cols.iban),
      phone: '',
      admin: '',
      processed: false,
      columnQ: (getValue(cols.status) || '').trim().toLowerCase() === 'paid',
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
      paymentDuration: paymentDurationOption,
      paymentSource,
      paymentMethod,
      card,
      iban,
      name,
      wallet,
      paypalAddress,
      note
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
    let paymentDurationHours = 0;
    if (!dueDateFormatted) {
      // Get Payment Info to calculate due date if not provided
      const paymentInfo = await sheets.getPaymentInfoOptions();
      const dueDateHours = paymentInfo.dueDateInfo.hours || 24;
      paymentDurationHours = dueDateHours;
      
      // Calculate due date: current time + hours from Payment Info
      const now = new Date();
      const calculatedDueDate = new Date(now.getTime() + (dueDateHours * 60 * 60 * 1000));
      dueDateFormatted = utils.formatDate(calculatedDueDate);
    } else {
      // Calculate payment duration from provided dueDate
      // Format: DD/MM/YYYY HH:MM:SS
      try {
        const [datePart, timePart] = dueDateFormatted.split(' ');
        const [day, month, year] = datePart.split('/');
        const [hours, minutes, seconds] = timePart.split(':');
        const dueDateObj = new Date(
          parseInt(year),
          parseInt(month) - 1,
          parseInt(day),
          parseInt(hours),
          parseInt(minutes),
          parseInt(seconds)
        );
        const now = new Date();
        const diffMs = dueDateObj.getTime() - now.getTime();
        paymentDurationHours = Math.round(diffMs / (1000 * 60 * 60));
      } catch (error) {
        console.error('Error parsing dueDate for paymentDuration:', error);
        paymentDurationHours = 24; // Default fallback
      }
    }
    
    const time = utils.formatDate();
    const uniqueID = utils.generateUniqueId();
    const adminName = await userService.getUserNickname(req.user?.id) || req.user?.id || 'Unknown';
    
    // Prepare payment data for sheet - Payment v2 structure
    const cols = config.paymentSheetColumns;
    const paymentData = {};
    
    // Map data to column indices
    paymentData[cols.time] = time;
    paymentData[cols.dueDate] = dueDateFormatted;
    paymentData[cols.userid] = discordId;
    paymentData[cols.paymentTime] = paymentDurationOption ? String(paymentDurationOption).trim() : ''; // Column D: Due Date option title only (e.g. "Instant")
    paymentData[cols.amount] = amount || '';
    paymentData[cols.ppu] = ppu || '';
    paymentData[cols.total] = utils.formatNumber(total); // Format with thousand separators
    paymentData[cols.paymentSource] = paymentSource || '';
    paymentData[cols.paymentMethod] = paymentMethod || '';
    paymentData[cols.card] = card || '';
    paymentData[cols.iban] = iban || ''; // IBAN comes from sellerInfo.sheba (sent as iban)
    paymentData[cols.name] = name || '';
    paymentData[cols.wallet] = wallet || '';
    paymentData[cols.paypalAddress] = paypalAddress || ''; // Paypal Address comes from sellerInfo.paypalWallet (sent as paypalAddress)
    paymentData[cols.uniqueID] = uniqueID;
    paymentData[cols.note] = note || '';
    paymentData[cols.author] = adminName; // Column Q: Admin who submitted
    
    // Add to payment sheet - create array in correct column order (18 columns: 0-17)
    // Column H (index 7) is empty, so we skip it
    const rowData = new Array(18).fill('');
    Object.keys(paymentData).forEach(colIndex => {
      const idx = parseInt(colIndex);
      if (!isNaN(idx) && idx < 18) {
        rowData[idx] = paymentData[colIndex];
      }
    });
    
    // Append row to Payment sheet (raw append API)
    await sheets.appendPaymentRow(rowData);
    
    // Send Discord webhook (with legacy format for compatibility)
    try {
      await discord.sendDiscordMessage({
        discordId,
        amount: amountNum,
        price: ppuNum,
        gheymat: total,
        paymentDuration: paymentDurationOption || '',
        realm: paymentSource || '', // Payment Source sent as Realm
        paymentMethod: paymentMethod || '',
        admin: adminName,
        note: note || '',
        time,
        id: uniqueID,
        sheba: iban || '', // Sheba (shomareSheba) sent as iban
        name: name || '',
        action: 'create'
      });
    } catch (webhookError) {
      console.error('Discord webhook error:', webhookError);
      // Don't fail the request if webhook fails
    }
    
    // Log payment creation
    await sheets.addPaymentLog(uniqueID, 'create', adminName, {
      amount,
      ppu,
      total,
      paymentSource,
      paymentMethod,
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
      card: getValue(cols.card),
      iban: getValue(cols.iban),
      name: getValue(cols.name),
      wallet: getValue(cols.wallet),
      paypalAddress: getValue(cols.paypalAddress),
      uniqueID: getValue(cols.uniqueID),
      note: getValue(cols.note),
      paymentTime: getValue(cols.paymentTime)
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
      updateData[cols.total] = utils.formatNumber(total); // Format with thousand separators
      changes.total = { old: currentPayment.total, new: utils.formatNumber(total) };
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
      // Legacy fields for webhook compatibility
      realm: (req.body.paymentSource !== undefined ? req.body.paymentSource : currentPayment.paymentSource) || '',
      sheba: (req.body.iban !== undefined ? req.body.iban : currentPayment.iban) || '',
      price: (req.body.ppu !== undefined ? req.body.ppu : currentPayment.ppu) || '',
      gheymat: (req.body.total !== undefined ? req.body.total : currentPayment.total) || '',
      admin: await userService.getUserNickname(req.user?.id) || req.user?.id || 'Unknown'
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

// Update payment status (mark as paid/unpaid/failed) — writes to Status column (Q) only
router.patch('/:id/status', requireAuth, async (req, res) => {
  try {
    const rowIndex = parseInt(req.params.id) - 4;
    const { columnQ, processed, status: statusValue } = req.body;

    let newStatus = '';
    if (statusValue !== undefined && typeof statusValue === 'string') {
      const s = statusValue.trim();
      if (s === 'Paid' || s === 'Unpaid' || s === 'Failed') newStatus = s;
      else if (s.toLowerCase() === 'paid') newStatus = 'Paid';
      else if (s.toLowerCase() === 'failed') newStatus = 'Failed';
      else newStatus = 'Unpaid';
    } else if (columnQ !== undefined) {
      newStatus = columnQ ? 'Paid' : 'Unpaid';
    } else if (processed !== undefined) {
      newStatus = processed ? 'Paid' : 'Unpaid';
    } else {
      return res.status(400).json({ error: 'status, columnQ, or processed must be provided' });
    }

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
    const currentStatus = getValue(cols.status);
    const currentPayment = { uniqueID: getValue(cols.uniqueID) };

    const updateData = { [cols.status]: newStatus };
    await sheets.updateRow(row, updateData, config.sheetNames.payment, rowIndex);

    if (newStatus !== (currentStatus || '').trim()) {
      const updatedBy = await userService.getUserNickname(req.user?.id) || req.user?.id || 'Unknown';
      await sheets.addPaymentLog(currentPayment.uniqueID, 'edit', updatedBy, {
        status: { old: currentStatus || '', new: newStatus }
      });
    }

    cache.invalidatePaymentList();
    res.json({ message: 'Payment status updated successfully', status: newStatus });
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
      card: getValue(cols.card),
      iban: getValue(cols.iban),
      name: getValue(cols.name),
      wallet: getValue(cols.wallet),
      paypalAddress: getValue(cols.paypalAddress),
      uniqueID: getValue(cols.uniqueID),
      note: getValue(cols.note),
      action: 'delete',
      deletedBy: await userService.getUserNickname(req.user?.id) || req.user?.id || 'Unknown',
      // Legacy fields for webhook compatibility
      price: getValue(cols.ppu),
      gheymat: getValue(cols.total),
      realm: getValue(cols.paymentSource) || '', // Payment Source sent as Realm
      sheba: getValue(cols.iban) || '', // Sheba (shomareSheba) sent as iban
      phone: '',
      admin: await userService.getUserNickname(req.user?.id) || req.user?.id || 'Unknown',
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
