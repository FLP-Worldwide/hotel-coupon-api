// models/Otp.js
const mongoose = require("mongoose");

const otpSchema = new mongoose.Schema({
  phone: {
    type: String,
    default: null, // ✅ optional
  },

  email: {
    type: String,
    lowercase: true,
    default: null, // ✅ optional
  },

  otpHash: {
    type: String,
    required: true,
  },

  expiresAt: {
    type: Date,
    required: true,
  },

  attempts: {
    type: Number,
    default: 0,
  },

  createdAt: {
    type: Date,
    default: Date.now,
  },
});

/**
 * 🔥 INDEXES
 */

// fast lookup
otpSchema.index({ phone: 1 });
otpSchema.index({ email: 1 });

// auto delete expired OTP
otpSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model("Otp", otpSchema);