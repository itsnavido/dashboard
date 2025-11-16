// Users API routes (Admin only)
const express = require('express');
const userService = require('../services/userService');
const { requireAdmin } = require('../middleware/roleCheck');

const router = express.Router();

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

