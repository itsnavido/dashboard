// User management service
const sheets = require('./sheets');
const cache = require('./cache');
const config = require('../config/config');

/**
 * Get user by Discord ID
 */
async function getUserByDiscordId(discordId) {
  // Check cache first
  const cachedRole = cache.getUserRole(discordId);
  if (cachedRole) {
    return { discordId, role: cachedRole };
  }

  try {
    const row = await sheets.findRowByValue(config.sheetNames.users, 0, discordId);
    
    if (row) {
      // Users sheet: discordId (0), role (1), createdAt (2), updatedAt (3), nickname (4)
      const rawData = row._rawData || [];
      const user = {
        discordId: rawData[0] || row.get('discordId') || '',
        role: rawData[1] || row.get('role') || '',
        createdAt: rawData[2] || row.get('createdAt') || '',
        updatedAt: rawData[3] || row.get('updatedAt') || '',
        nickname: rawData[4] || row.get('nickname') || ''
      };
      
      // Cache the role
      cache.setUserRole(discordId, user.role);
      
      return user;
    }
    
    return null;
  } catch (error) {
    console.error('Error getting user:', error);
    return null;
  }
}

/**
 * Create a new user
 */
async function createUser(discordId, role = 'User') {
  try {
    const now = new Date().toISOString();
    const userData = {
      discordId,
      role,
      createdAt: now,
      updatedAt: now
    };
    
    await sheets.addRow(config.sheetNames.users, userData);
    
    // Cache the role
    cache.setUserRole(discordId, role);
    
    return userData;
  } catch (error) {
    console.error('Error creating user:', error);
    throw error;
  }
}

/**
 * Update user role
 */
async function updateUserRole(discordId, newRole) {
  try {
    const row = await sheets.findRowByValue(config.sheetNames.users, 0, discordId);
    
    if (!row) {
      throw new Error('User not found');
    }
    
    // Users sheet: discordId (0), role (1), createdAt (2), updatedAt (3)
    await sheets.updateRow(row, {
      1: newRole,
      3: new Date().toISOString()
    });
    
    // Invalidate and update cache
    cache.invalidateUserRole(discordId);
    cache.setUserRole(discordId, newRole);
    
    return { discordId, role: newRole };
  } catch (error) {
    console.error('Error updating user role:', error);
    throw error;
  }
}

/**
 * Delete user
 */
async function deleteUser(discordId) {
  try {
    const row = await sheets.findRowByValue(config.sheetNames.users, 0, discordId);
    
    if (!row) {
      throw new Error('User not found');
    }
    
    await sheets.deleteRow(row);
    
    // Invalidate cache
    cache.invalidateUserRole(discordId);
    
    return true;
  } catch (error) {
    console.error('Error deleting user:', error);
    throw error;
  }
}

/**
 * Get all users
 */
async function getAllUsers() {
  try {
    const rows = await sheets.getRows(config.sheetNames.users);
    return rows.map(row => {
      // Users sheet: discordId (0), role (1), createdAt (2), updatedAt (3), nickname (4)
      const rawData = row._rawData || [];
      return {
        discordId: rawData[0] || row.get('discordId') || '',
        role: rawData[1] || row.get('role') || '',
        createdAt: rawData[2] || row.get('createdAt') || '',
        updatedAt: rawData[3] || row.get('updatedAt') || '',
        nickname: rawData[4] || row.get('nickname') || ''
      };
    });
  } catch (error) {
    console.error('Error getting all users:', error);
    return [];
  }
}

/**
 * Check if user has admin role
 */
async function isAdmin(discordId) {
  const user = await getUserByDiscordId(discordId);
  return user && user.role === 'Admin';
}

/**
 * Get user nickname by Discord ID
 * Returns nickname from column E if available, otherwise returns Discord ID
 */
async function getUserNickname(discordId) {
  const user = await getUserByDiscordId(discordId);
  if (user && user.nickname) {
    return user.nickname;
  }
  // Fallback to Discord ID if nickname not found
  return discordId || 'Unknown';
}

module.exports = {
  getUserByDiscordId,
  createUser,
  updateUserRole,
  deleteUser,
  getAllUsers,
  isAdmin,
  getUserNickname
};

