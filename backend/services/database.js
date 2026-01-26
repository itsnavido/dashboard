// Database service layer using Prisma
// Replaces Google Sheets integration

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
});

/**
 * Initialize database connection
 */
async function initDatabase() {
  try {
    await prisma.$connect();
    console.log('Database connected successfully');
    return true;
  } catch (error) {
    console.error('Database connection error:', error);
    throw error;
  }
}

/**
 * Close database connection
 */
async function closeDatabase() {
  await prisma.$disconnect();
}

// ==================== USER OPERATIONS ====================

/**
 * Get user by Discord ID
 */
async function getUserByDiscordId(discordId) {
  try {
    const user = await prisma.user.findUnique({
      where: { discordId },
      select: {
        id: true,
        discordId: true,
        username: true,
        nickname: true,
        password: true,
        role: true,
        createdAt: true,
        updatedAt: true,
      },
    });
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
    const user = await prisma.user.findFirst({
      where: {
        username: {
          equals: username,
          mode: 'insensitive',
        },
      },
    });
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
    const user = await prisma.user.create({
      data: {
        discordId,
        role,
        username,
        nickname,
      },
    });
    return user;
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
    const user = await prisma.user.update({
      where: { discordId },
      data: {
        role: newRole,
        updatedAt: new Date(),
      },
    });
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
    
    const user = await prisma.user.update({
      where: { discordId },
      data: updateData,
    });
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
    const users = await prisma.user.findMany({
      select: {
        id: true,
        discordId: true,
        username: true,
        nickname: true,
        role: true,
        createdAt: true,
        updatedAt: true,
        // Don't return password
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
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
    await prisma.user.delete({
      where: { discordId },
    });
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
    const user = await prisma.user.findUnique({
      where: { discordId },
      select: { nickname: true },
    });
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
    const seller = await prisma.seller.findUnique({
      where: { discordId },
      select: {
        card: true,
        sheba: true,
        name: true,
        phone: true,
        wallet: true,
      },
    });
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
    const seller = await prisma.seller.upsert({
      where: { discordId },
      update: {
        card: data.card || null,
        sheba: data.sheba || null,
        name: data.name || null,
        phone: data.phone || null,
        wallet: data.wallet || null,
        updatedAt: new Date(),
      },
      create: {
        discordId,
        card: data.card || null,
        sheba: data.sheba || null,
        name: data.name || null,
        phone: data.phone || null,
        wallet: data.wallet || null,
      },
    });
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
    
    const [payments, total] = await Promise.all([
      prisma.payment.findMany({
        skip,
        take: limit,
        orderBy: {
          [sortBy]: sortOrder,
        },
        select: {
          id: true,
          uniqueID: true,
          time: true,
          userid: true,
          paymentDuration: true,
          paymentType: true,
          realm: true,
          amount: true,
          price: true,
          gheymat: true,
          note: true,
          card: true,
          sheba: true,
          name: true,
          phone: true,
          wallet: true,
          admin: true,
          processed: true,
          columnQ: true,
          timeLeftToPay: true,
          createdAt: true,
          updatedAt: true,
        },
      }),
      prisma.payment.count(),
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
 * Get payment by ID (row number from legacy system)
 */
async function getPaymentById(id) {
  try {
    // If id is numeric, it's a legacy row number - convert to uniqueID
    // Otherwise, treat as uniqueID
    const payment = await prisma.payment.findUnique({
      where: { uniqueID: String(id) },
    });
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
    const payment = await prisma.payment.findUnique({
      where: { uniqueID },
    });
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
    const payment = await prisma.payment.create({
      data: {
        uniqueID: paymentData.uniqueID,
        time: paymentData.time,
        userid: paymentData.userid,
        paymentDuration: paymentData.paymentDuration,
        paymentType: paymentData.paymentType,
        realm: paymentData.realm,
        amount: paymentData.amount,
        price: paymentData.price,
        gheymat: paymentData.gheymat,
        note: paymentData.note,
        card: paymentData.card,
        sheba: paymentData.sheba,
        name: paymentData.name,
        phone: paymentData.phone,
        wallet: paymentData.wallet,
        admin: paymentData.admin,
        processed: paymentData.processed || false,
        columnQ: paymentData.columnQ || false,
        timeLeftToPay: paymentData.timeLeftToPay,
      },
    });
    return payment;
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
    const payment = await prisma.payment.update({
      where: { uniqueID },
      data: {
        ...updateData,
        updatedAt: new Date(),
      },
    });
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
    // Delete payment logs first (if cascade not set up)
    await prisma.paymentLog.deleteMany({
      where: { paymentID: uniqueID },
    });
    
    // Delete payment
    await prisma.payment.delete({
      where: { uniqueID },
    });
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
    
    const log = await prisma.paymentLog.create({
      data: {
        paymentID: paymentUniqueID,
        action,
        user: userId,
        timestamp,
        changes: changes || {},
      },
    });
    return log;
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
    const logs = await prisma.paymentLog.findMany({
      where: { paymentID: paymentUniqueID },
      orderBy: {
        createdAt: 'desc',
      },
    });
    return logs;
  } catch (error) {
    console.error('Error getting payment logs:', error);
    return [];
  }
}

module.exports = {
  prisma,
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

