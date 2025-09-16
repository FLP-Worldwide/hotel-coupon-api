const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  phone: { type: String, required: true, unique: true }, // ✅ phone compulsory
  email: { type: String, lowercase: true },              // ✅ optional
  name: { type: String },
  avatar: { type: String },
  isVerified: { type: Boolean, default: false },
  refreshTokens: [
    { token: String, createdAt: { type: Date, default: Date.now } }
  ],
  createdAt: { type: Date, default: Date.now }
});

// Indexes
userSchema.index({ phone: 1 }, { unique: true });

module.exports = mongoose.model('User', userSchema);
