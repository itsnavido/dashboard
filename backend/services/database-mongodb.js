// MongoDB database service layer using Mongoose
// Replaces Google Sheets integration

const mongoose = require('mongoose');
const User = require('../models/User');
const Seller = require('../models/Seller');
const Payment = require('../models/Payment');
const PaymentLog = require('../models/PaymentLog');

/**
 * Initialize MongoDB connection
 */
async function initDatabase() {
  try {
    const mongoUri = process.env.MONGODB_URI || process.env.DATABASE_URL;
    
    if (!mongoUri) {
      throw new Error('MONGODB_URI or DATABASE_URL must be set in environment variables');
    }

    await mongoose.connect(mongoUri, {
      // These options are recommended for Mongoose 6+
      // Remove if using older version
    });

    console.log('MongoDB connected successfully');
    return true;
  } catch (error) {
    console.error('MongoDB connection error:', error);
    throw error;
  }
}

/**
 * Close MongoDB connection
 */
async function closeDatabase() {
  await mongoose.connection.close();
  console.log('MongoDB connection closed');
}

// ==================== USER OPERATIONS ====================

/**
 * Get user by Discord ID
 */
async function getUserByDiscordId(discordId) {
  try {
    const user = await User.findOne({ discordId }).lean();
    return user;
  } catch (error) {
    console.error('Error getting user by Discord ID:', error);
    return null;
  }
}

/**
 * Get user by username
 */
async function getUserByUsername(username) {
  try {
    const user = await User.findOne({ 
      username: { $regex: new RegExp(`^${username}$`, 'i') } 
    }).lean();
    return user;
  } catch (error) {
    console.error('Error getting user by username:', error);
    return null;
  }
}

/**
 * Create a new user
 */
async function createUser(discordId, role = 'User', username = null, nickname = null) {
  try {
    const user = await User.create({
      discordId,
      role,
      username,
      nickname,
    });
    return user.toObject();
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
    const user = await User.findOneAndUpdate(
      { discordId },
      { 
        role: newRole,
        updatedAt: new Date(),
      },
      { new: true, lean: true }
    );
    
    if (!user) {
      throw new Error('User not found');
    }
    
    return user;
  } catch (error) {
    console.error('Error updating user role:', error);
    throw error;
  }
}

/**
 * Update user credentials (username/password)
 */
async function updateUserCredentials(discordId, username, password) {
  try {
    const updateData = {
      updatedAt: new Date(),
    };
    
    if (username !== undefined && username !== null) {
      updateData.username = username;
    }
    
    if (password !== undefined && password !== null && password !== '') {
      updateData.password = password; // Should be hashed before calling this
    }
    
    const user = await User.findOneAndUpdate(
      { discordId },
      updateData,
      { new: true, lean: true }
    );
    
    if (!user) {
      throw new Error('User not found');
    }
    
    return user;
  } catch (error) {
    console.error('Error updating user credentials:', error);
    throw error;
  }
}

/**
 * Get all users
 */
async function getAllUsers() {
  try {
    const users = await User.find({})
      .select('-password') // Don't return password
      .sort({ createdAt: -1 })
      .lean();
    return users;
  } catch (error) {
    console.error('Error getting all users:', error);
    return [];
  }
}

/**
 * Delete user
 */
async function deleteUser(discordId) {
  try {
    const result = await User.deleteOne({ discordId });
    if (result.deletedCount === 0) {
      throw new Error('User not found');
    }
    return true;
  } catch (error) {
    console.error('Error deleting user:', error);
    throw error;
  }
}

/**
 * Get user nickname
 */
async function getUserNickname(discordId) {
  try {
    const user = await User.findOne({ discordId })
      .select('nickname')
      .lean();
    return user?.nickname || discordId || 'Unknown';
  } catch (error) {
    console.error('Error getting user nickname:', error);
    return discordId || 'Unknown';
  }
}

// ==================== SELLER OPERATIONS ====================

/**
 * Get seller info by Discord ID
 */
async function getSellerInfo(discordId) {
  try {
    const seller = await Seller.findOne({ discordId })
      .select('card sheba name phone wallet')
      .lean();
    return seller;
  } catch (error) {
    console.error('Error getting seller info:', error);
    return null;
  }
}

/**
 * Create or update seller info
 */
async function upsertSellerInfo(discordId, data) {
  try {
    const seller = await Seller.findOneAndUpdate(
      { discordId },
      {
        discordId,
        card: data.card || null,
        sheba: data.sheba || null,
        name: data.name || null,
        phone: data.phone || null,
        wallet: data.wallet || null,
        updatedAt: new Date(),
      },
      {
        upsert: true,
        new: true,
        lean: true,
      }
    );
    return seller;
  } catch (error) {
    console.error('Error upserting seller info:', error);
    throw error;
  }
}

// ==================== PAYMENT OPERATIONS ====================

/**
 * Get all payments with pagination
 */
async function getAllPayments(options = {}) {
  try {
    const {
      page = 1,
      limit = 100,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = options;
    
    const skip = (page - 1) * limit;
    const sort = { [sortBy]: sortOrder === 'desc' ? -1 : 1 };
    
    const [payments, total] = await Promise.all([
      Payment.find({})
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .lean(),
      Payment.countDocuments({}),
    ]);
    
    return {
      payments,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  } catch (error) {
    console.error('Error getting all payments:', error);
    throw error;
  }
}

/**
 * Get payment by ID (uniqueID)
 */
async function getPaymentById(id) {
  try {
    const payment = await Payment.findOne({ uniqueID: String(id) }).lean();
    return payment;
  } catch (error) {
    console.error('Error getting payment by ID:', error);
    return null;
  }
}

/**
 * Get payment by uniqueID
 */
async function getPaymentByUniqueID(uniqueID) {
  try {
    const payment = await Payment.findOne({ uniqueID }).lean();
    return payment;
  } catch (error) {
    console.error('Error getting payment by uniqueID:', error);
    return null;
  }
}

/**
 * Create a new payment
 */
async function createPayment(paymentData) {
  try {
    const payment = await Payment.create(paymentData);
    return payment.toObject();
  } catch (error) {
    console.error('Error creating payment:', error);
    throw error;
  }
}

/**
 * Update payment
 */
async function updatePayment(uniqueID, updateData) {
  try {
    const payment = await Payment.findOneAndUpdate(
      { uniqueID },
      {
        ...updateData,
        updatedAt: new Date(),
      },
      { new: true, lean: true }
    );
    
    if (!payment) {
      throw new Error('Payment not found');
    }
    
    return payment;
  } catch (error) {
    console.error('Error updating payment:', error);
    throw error;
  }
}

/**
 * Delete payment
 */
async function deletePayment(uniqueID) {
  try {
    // Delete payment logs first
    await PaymentLog.deleteMany({ paymentID: uniqueID });
    
    // Delete payment
    const result = await Payment.deleteOne({ uniqueID });
    
    if (result.deletedCount === 0) {
      throw new Error('Payment not found');
    }
    
    return true;
  } catch (error) {
    console.error('Error deleting payment:', error);
    throw error;
  }
}

// ==================== PAYMENT LOG OPERATIONS ====================

/**
 * Add payment log entry
 */
async function addPaymentLog(paymentUniqueID, action, userId, changes) {
  try {
    const utils = require('./utils');
    const timestamp = utils.formatDate();
    
    const log = await PaymentLog.create({
      paymentID: paymentUniqueID,
      action,
      user: userId,
      timestamp,
      changes: changes || {},
    });
    
    return log.toObject();
  } catch (error) {
    console.error('Error adding payment log:', error);
    // Don't throw - logging failures shouldn't break payment operations
    return null;
  }
}

/**
 * Get payment logs for a specific payment
 */
async function getPaymentLogs(paymentUniqueID) {
  try {
    const logs = await PaymentLog.find({ paymentID: paymentUniqueID })
      .sort({ createdAt: -1 })
      .lean();
    return logs;
  } catch (error) {
    console.error('Error getting payment logs:', error);
    return [];
  }
}

module.exports = {
  mongoose,
  initDatabase,
  closeDatabase,
  // User operations
  getUserByDiscordId,
  getUserByUsername,
  createUser,
  updateUserRole,
  updateUserCredentials,
  getAllUsers,
  deleteUser,
  getUserNickname,
  // Seller operations
  getSellerInfo,
  upsertSellerInfo,
  // Payment operations
  getAllPayments,
  getPaymentById,
  getPaymentByUniqueID,
  createPayment,
  updatePayment,
  deletePayment,
  // Payment log operations
  addPaymentLog,
  getPaymentLogs,
};

