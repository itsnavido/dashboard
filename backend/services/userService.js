// User management service
const sheets = require('./sheets');
const cache = require('./cache');
const config = require('../config/config');
const bcrypt = require('bcrypt');
const { google } = require('googleapis');

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
 * Always fetches from sheet to get latest nickname (bypasses cache)
 */
async function getUserNickname(discordId) {
  if (!discordId) {
    return 'Unknown';
  }
  
  try {
    // Use raw API to read Users sheet to get latest nickname (bypass cache)
    const client = await sheets.initSheetsClient();
    const spreadsheetId = process.env.GOOGLE_SHEETS_SPREADSHEET_ID;
    const sheetName = config.sheetNames.users;
    
    // Read all rows from Users sheet (row 1 is header, data starts at row 2)
    const response = await client.spreadsheets.values.get({
      spreadsheetId,
      range: `${sheetName}!A2:G`, // Read from row 2 onwards (skip header)
    });
    
    const rows = response.data.values || [];
    
    // Find row with matching Discord ID (column A, index 0)
    const row = rows.find(r => {
      const rowDiscordId = (r[0] || '').toString().trim();
      return rowDiscordId === discordId.toString();
    });
    
    if (row) {
      // Users sheet: discordId (0), role (1), createdAt (2), updatedAt (3), nickname (4), username (5), password (6)
      const nickname = (row[4] || '').toString().trim();
      if (nickname) {
        return nickname;
      }
    }
    
    // Fallback to Discord ID if nickname not found
    return discordId || 'Unknown';
  } catch (error) {
    console.error('[UserService] Error getting user nickname:', error);
    // Fallback to Discord ID on error
    return discordId || 'Unknown';
  }
}

/**
 * Get user by username
 */
async function getUserByUsername(username) {
  try {
    console.log('[UserService] Looking for username:', username);
    
    // Use raw API to read Users sheet to avoid caching issues
    const client = await sheets.initSheetsClient();
    const spreadsheetId = process.env.GOOGLE_SHEETS_SPREADSHEET_ID;
    const sheetName = config.sheetNames.users;
    
    // Read all rows from Users sheet (row 1 is header, data starts at row 2)
    const response = await client.spreadsheets.values.get({
      spreadsheetId,
      range: `${sheetName}!A2:G`, // Read from row 2 onwards (skip header)
    });
    
    const rows = response.data.values || [];
    console.log('[UserService] Total rows found via raw API:', rows.length);
    
    // Find row with matching username (column F, index 5)
    const rowIndex = rows.findIndex(row => {
      const rowUsername = (row[5] || '').toString().trim();
      return rowUsername && rowUsername.toLowerCase() === username.toLowerCase();
    });
    
    if (rowIndex !== -1) {
      const row = rows[rowIndex];
      // Users sheet: discordId (0), role (1), createdAt (2), updatedAt (3), nickname (4), username (5), password (6)
      const user = {
        discordId: (row[0] || '').toString(),
        role: (row[1] || '').toString(),
        createdAt: (row[2] || '').toString(),
        updatedAt: (row[3] || '').toString(),
        nickname: (row[4] || '').toString(),
        username: (row[5] || '').toString(),
        password: (row[6] || '').toString() // Hashed password
      };
      
      console.log('[UserService] User data retrieved via raw API:', {
        discordId: user.discordId,
        username: user.username,
        hasPassword: !!user.password,
        passwordLength: user.password ? user.password.length : 0
      });
      
      return user;
    }
    
    // Debug: Log all usernames found
    console.log('[UserService] All usernames found:');
    rows.forEach((r, idx) => {
      const testUsername = (r[5] || '').toString().trim();
      console.log(`[UserService] Row ${idx} username: "${testUsername}"`);
    });
    
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
    
    const rowIndex = row._rowIndex;
    if (rowIndex === undefined || rowIndex === null) {
      console.error('[UserService] Row index not found');
      throw new Error('Row index not available');
    }
    
    console.log('[UserService] Row found at index:', rowIndex);
    
    // Prepare update data for raw API
    const updatedAtValue = new Date().toISOString();
    const updateData = {
      updatedAt: updatedAtValue
    };
    
    if (username !== undefined && username !== null) {
      updateData.username = username;
    }
    
    if (password !== undefined && password !== null && password !== '') {
      const hashedPassword = await hashPassword(password);
      updateData.password = hashedPassword;
    }
    
    console.log('[UserService] Update data:', Object.keys(updateData));
    
    // Use raw Google Sheets API to update (more reliable than google-spreadsheet save)
    await sheets.updateUserRowRaw(rowIndex, updateData);
    
    console.log('[UserService] Row updated successfully via raw API');
    
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

