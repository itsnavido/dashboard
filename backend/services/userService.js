// User management service
const sheets = require('./sheets');
const cache = require('./cache');
const config = require('../config/config');
const bcrypt = require('bcrypt');

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
      // Users sheet: discordId (0), role (1), createdAt (2), updatedAt (3), nickname (4), username (5), password (6)
      const rawData = row._rawData || [];
      const user = {
        discordId: rawData[0] || row.get('discordId') || '',
        role: rawData[1] || row.get('role') || '',
        createdAt: rawData[2] || row.get('createdAt') || '',
        updatedAt: rawData[3] || row.get('updatedAt') || '',
        nickname: rawData[4] || row.get('nickname') || '',
        username: rawData[5] || row.get('username') || '',
        password: rawData[6] || row.get('password') || '' // Hashed password
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
    
    // For Users sheet, use header names (google-spreadsheet)
    row.role = newRole;
    row.updatedAt = new Date().toISOString();
    
    // Save the row
    if (typeof row.save === 'function') {
      await row.save();
    }
    
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
      // Users sheet: discordId (0), role (1), createdAt (2), updatedAt (3), nickname (4), username (5), password (6)
      const rawData = row._rawData || [];
      return {
        discordId: rawData[0] || row.get('discordId') || '',
        role: rawData[1] || row.get('role') || '',
        createdAt: rawData[2] || row.get('createdAt') || '',
        updatedAt: rawData[3] || row.get('updatedAt') || '',
        nickname: rawData[4] || row.get('nickname') || '',
        username: rawData[5] || row.get('username') || '',
        password: '' // Don't return password hash to frontend
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

/**
 * Get user by username
 */
async function getUserByUsername(username) {
  try {
    console.log('[UserService] Looking for username:', username);
    const rows = await sheets.getRows(config.sheetNames.users);
    console.log('[UserService] Total rows found:', rows.length);
    
    const row = rows.find(r => {
      // Users sheet uses header-based access, try multiple methods
      const rowUsername = r.username || r.get('username') || r['username'] || '';
      const usernameStr = rowUsername ? rowUsername.toString().trim() : '';
      const match = usernameStr && usernameStr.toLowerCase() === username.toLowerCase();
      if (match) {
        console.log('[UserService] Found matching row with username:', usernameStr);
      }
      return match;
    });
    
    if (row) {
      // Users sheet uses header-based access via google-spreadsheet
      // Try direct property access first, then get() method
      const user = {
        discordId: row.discordId || row.get('discordId') || row['discordId'] || '',
        role: row.role || row.get('role') || row['role'] || '',
        createdAt: row.createdAt || row.get('createdAt') || row['createdAt'] || '',
        updatedAt: row.updatedAt || row.get('updatedAt') || row['updatedAt'] || '',
        nickname: row.nickname || row.get('nickname') || row['nickname'] || '',
        username: row.username || row.get('username') || row['username'] || '',
        password: row.password || row.get('password') || row['password'] || '' // Hashed password
      };
      
      console.log('[UserService] User data retrieved:', {
        discordId: user.discordId,
        username: user.username,
        hasPassword: !!user.password,
        passwordLength: user.password ? user.password.length : 0
      });
      
      return user;
    }
    
    console.log('[UserService] No user found with username:', username);
    return null;
  } catch (error) {
    console.error('[UserService] Error getting user by username:', error);
    return null;
  }
}

/**
 * Verify password against hash
 */
async function verifyPassword(plainPassword, hashedPassword) {
  if (!hashedPassword) return false;
  try {
    return await bcrypt.compare(plainPassword, hashedPassword);
  } catch (error) {
    console.error('Error verifying password:', error);
    return false;
  }
}

/**
 * Hash password
 */
async function hashPassword(plainPassword) {
  const saltRounds = 10;
  return await bcrypt.hash(plainPassword, saltRounds);
}

/**
 * Update user username and/or password
 */
async function updateUserCredentials(discordId, username, password) {
  try {
    console.log('[UserService] Updating credentials for:', discordId, 'username:', username, 'hasPassword:', !!password);
    
    const row = await sheets.findRowByValue(config.sheetNames.users, 0, discordId);
    
    if (!row) {
      console.error('[UserService] Row not found for discordId:', discordId);
      throw new Error('User not found');
    }
    
    console.log('[UserService] Row found, row type:', typeof row, 'has save:', typeof row.save);
    console.log('[UserService] Row properties:', Object.keys(row).slice(0, 10));
    
    // For Users sheet, use header names since it uses google-spreadsheet
    // Update updatedAt always
    const updatedAtValue = new Date().toISOString();
    row.updatedAt = updatedAtValue;
    console.log('[UserService] Set updatedAt to:', updatedAtValue);
    
    if (username !== undefined && username !== null) {
      row.username = username;
      console.log('[UserService] Set username to:', username, 'Current row.username:', row.username);
    }
    
    if (password !== undefined && password !== null && password !== '') {
      const hashedPassword = await hashPassword(password);
      row.password = hashedPassword;
      console.log('[UserService] Set password hash (length:', hashedPassword.length, ')');
    }
    
    // Verify values are set before saving
    console.log('[UserService] Before save - username:', row.username, 'password set:', !!row.password);
    
    // Save the row
    if (typeof row.save === 'function') {
      await row.save();
      console.log('[UserService] Row saved successfully');
      
      // Verify after save
      console.log('[UserService] After save - username:', row.username, 'password set:', !!row.password);
    } else {
      console.error('[UserService] Row does not have save method! Row type:', typeof row);
      console.error('[UserService] Available methods:', Object.getOwnPropertyNames(row).filter(k => typeof row[k] === 'function'));
      throw new Error('Row save method not available');
    }
    
    // Invalidate cache
    cache.invalidateUserRole(discordId);
    
    return { discordId, username, passwordUpdated: password !== undefined && password !== '' };
  } catch (error) {
    console.error('[UserService] Error updating user credentials:', error);
    console.error('[UserService] Error stack:', error.stack);
    throw error;
  }
}

module.exports = {
  getUserByDiscordId,
  createUser,
  updateUserRole,
  deleteUser,
  getAllUsers,
  isAdmin,
  getUserNickname,
  getUserByUsername,
  verifyPassword,
  hashPassword,
  updateUserCredentials
};

