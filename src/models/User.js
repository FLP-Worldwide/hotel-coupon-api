// models/User.js
const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
  phone: {
    type: String,
    default: null, // ✅ allow null
  },

  email: {
    type: String,
    lowercase: true,
    default: null,
  },

  name: {
    type: String,
    default: "",
  },

  avatar: {
    type: String,
    default: "",
  },

  isVerified: {
    type: Boolean,
    default: false,
  },

  refreshTokens: [
    {
      token: String,
      createdAt: { type: Date, default: Date.now },
    },
  ],

  createdAt: {
    type: Date,
    default: Date.now,
  },
});

/**
 * 🔥 INDEXES (VERY IMPORTANT)
 */

// ✅ Email unique but allow multiple null
userSchema.index(
  { email: 1 },
  { unique: true, sparse: true }
);

// ✅ Phone unique but allow multiple null
userSchema.index(
  { phone: 1 },
  { unique: true, sparse: true }
);

module.exports = mongoose.model("User", userSchema);