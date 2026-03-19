const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  phone: { type: String, required: false }, // ✅ phone compulsory
  email: { type: String, lowercase: true, unique: true, required: false },              // ✅ optional
  name: { type: String },
  avatar: { type: String },
  isVerified: { type: Boolean, default: false },
  refreshTokens: [
    { token: String, createdAt: { type: Date, default: Date.now } }
  ],
  createdAt: { type: Date, default: Date.now }
});


module.exports = mongoose.model('User', userSchema);
