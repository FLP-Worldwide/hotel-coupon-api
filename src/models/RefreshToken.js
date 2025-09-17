// models/RefreshToken.js
const mongoose = require('mongoose');

const refreshTokenSchema = new mongoose.Schema({
  token: { type: String, required: true, index: true },
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  expiresAt: { type: Date, required: true },
  createdAt: { type: Date, default: Date.now },
  createdByIp: { type: String },
  revokedAt: { type: Date },
  revokedByIp: { type: String },
  replacedByToken: { type: String }, // new token string when rotated
  reasonRevoked: { type: String },
}, { timestamps: true });

// virtual to check if expired or revoked
refreshTokenSchema.virtual('isExpired').get(function () {
  return Date.now() >= this.expiresAt;
});
refreshTokenSchema.virtual('isActive').get(function () {
  return !this.revokedAt && Date.now() < this.expiresAt;
});

module.exports = mongoose.model('RefreshToken', refreshTokenSchema);
