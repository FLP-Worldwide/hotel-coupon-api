const mongoose = require('mongoose');

const otpSchema = new mongoose.Schema({
  phone: { type: String, required: true },     // ✅ default for OTP
  email: { type: String, lowercase: true },    // ✅ optional, store if provided
  otpHash: { type: String, required: true },
  expiresAt: { type: Date, required: true },
  attempts: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now }
});

otpSchema.index({ phone: 1 });

module.exports = mongoose.model('Otp', otpSchema);
