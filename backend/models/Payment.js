// MongoDB Payment Model using Mongoose
const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema({
  uniqueID: {
    type: String,
    required: true,
    unique: true,
    index: true,
  },
  time: {
    type: String, // Formatted date string
    required: true,
  },
  userid: {
    type: String, // Discord ID
    required: true,
    index: true,
  },
  paymentDuration: {
    type: String,
    required: true,
  },
  paymentType: {
    type: String,
    enum: ['Naghdi', 'Gold'],
  },
  realm: {
    type: String,
    required: true,
  },
  amount: {
    type: Number,
  },
  price: {
    type: Number,
  },
  gheymat: {
    type: Number,
  },
  note: {
    type: String,
  },
  card: {
    type: String,
  },
  sheba: {
    type: String,
  },
  name: {
    type: String,
  },
  phone: {
    type: String,
  },
  wallet: {
    type: String,
  },
  admin: {
    type: String, // Admin nickname
    required: true,
  },
  processed: {
    type: Boolean,
    default: false,
  },
  columnQ: {
    type: Boolean,
    default: false,
  },
  timeLeftToPay: {
    type: String,
  },
}, {
  timestamps: true,
});

// Indexes for better query performance
paymentSchema.index({ userid: 1 });
paymentSchema.index({ uniqueID: 1 });
paymentSchema.index({ createdAt: -1 });
paymentSchema.index({ realm: 1 });
paymentSchema.index({ processed: 1 });

module.exports = mongoose.model('Payment', paymentSchema);

