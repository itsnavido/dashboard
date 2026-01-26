// MongoDB User Model using Mongoose
const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  discordId: {
    type: String,
    required: true,
    unique: true,
    index: true,
  },
  username: {
    type: String,
    sparse: true, // Allow multiple nulls
  },
  nickname: {
    type: String,
  },
  password: {
    type: String, // Hashed password
  },
  role: {
    type: String,
    enum: ['Admin', 'User'],
    default: 'User',
  },
}, {
  timestamps: true, // Automatically adds createdAt and updatedAt
});

// Indexes
userSchema.index({ discordId: 1 });
userSchema.index({ username: 1 });

module.exports = mongoose.model('User', userSchema);

