// MongoDB PaymentLog Model using Mongoose
const mongoose = require('mongoose');

const paymentLogSchema = new mongoose.Schema({
  paymentID: {
    type: String, // Payment uniqueID
    required: true,
    index: true,
  },
  action: {
    type: String,
    enum: ['create', 'edit', 'delete'],
    required: true,
  },
  user: {
    type: String, // User who performed action
    required: true,
  },
  timestamp: {
    type: String, // Formatted date string
    required: true,
  },
  changes: {
    type: mongoose.Schema.Types.Mixed, // JSON object
    default: {},
  },
}, {
  timestamps: true,
});

// Indexes
paymentLogSchema.index({ paymentID: 1 });
paymentLogSchema.index({ createdAt: -1 });

module.exports = mongoose.model('PaymentLog', paymentLogSchema);

