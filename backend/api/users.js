// Users API routes (Admin only)
const express = require('express');
const userService = require('../services/userService');
const sheets = require('../services/sheets');
const config = require('../config/config');
const { requireAdmin } = require('../middleware/roleCheck');

const router = express.Router();

// Diagnostic endpoint to check sheet structure (Admin only)
router.get('/diagnostic', requireAdmin, async (req, res) => {
  try {
    const rows = await sheets.getRows(config.sheetNames.users);
    const diagnostic = {
      totalRows: rows.length,
      sampleRow: rows.length > 0 ? {
        hasRawData: !!rows[0]._rawData,
        hasSheet: !!rows[0]._sheet,
        headerValues: rows[0]._sheet?.headerValues || [],
        properties: Object.keys(rows[0]).slice(0, 20),
        directAccess: {
          discordId: rows[0].discordId,
          username: rows[0].username,
          password: rows[0].password ? '***' : null
        },
        getMethod: {
          discordId: rows[0].get('discordId'),
          username: rows[0].get('username'),
          password: rows[0].get('password') ? '***' : null
        },
        hasSave: typeof rows[0].save === 'function'
      } : null
    };
    res.json(diagnostic);
  } catch (error) {
    console.error('Error in diagnostic:', error);
    res.status(500).json({ error: 'Internal server error', message: error.message });
  }
});

// Get all users (Admin only)
router.get('/', requireAdmin, async (req, res) => {
  try {
    const users = await userService.getAllUsers();
    res.json(users);
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create new user (Admin only)
router.post('/', requireAdmin, async (req, res) => {
  try {
    const { discordId, role } = req.body;
    
    if (!discordId) {
      return res.status(400).json({ error: 'Discord ID is required' });
    }
    
    // Check if user already exists
    const existingUser = await userService.getUserByDiscordId(discordId);
    if (existingUser) {
      return res.status(400).json({ error: 'User already exists' });
    }
    
    const user = await userService.createUser(discordId, role || 'User');
    res.json(user);
  } catch (error) {
    console.error('Error creating user:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update user role (Admin only)
router.put('/:discordId', requireAdmin, async (req, res) => {
  try {
    const { discordId } = req.params;
    const { role, username, password } = req.body;
    
    // If role is provided, update role
    if (role !== undefined) {
      if (!['Admin', 'User'].includes(role)) {
        return res.status(400).json({ error: 'Invalid role. Must be Admin or User' });
      }
      
      const user = await userService.updateUserRole(discordId, role);
      res.json(user);
      return;
    }
    
    // If username or password is provided, update credentials
    if (username !== undefined || password !== undefined) {
      const result = await userService.updateUserCredentials(discordId, username, password);
      res.json(result);
      return;
    }
    
    return res.status(400).json({ error: 'Either role, username, or password must be provided' });
  } catch (error) {
    console.error('Error updating user:', error);
    if (error.message === 'User not found') {
      return res.status(404).json({ error: 'User not found' });
    }
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete user (Admin only)
router.delete('/:discordId', requireAdmin, async (req, res) => {
  try {
    const { discordId } = req.params;
    
    await userService.deleteUser(discordId);
    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    console.error('Error deleting user:', error);
    if (error.message === 'User not found') {
      return res.status(404).json({ error: 'User not found' });
    }
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
