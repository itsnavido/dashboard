// MongoDB Seller Model using Mongoose
const mongoose = require('mongoose');

const sellerSchema = new mongoose.Schema({
  discordId: {
    type: String,
    required: true,
    unique: true,
    index: true,
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
}, {
  timestamps: true,
});

// Indexes
sellerSchema.index({ discordId: 1 });

module.exports = mongoose.model('Seller', sellerSchema);

