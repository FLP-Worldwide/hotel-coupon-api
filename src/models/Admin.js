 // models/Admin.js
const mongoose = require('mongoose');

const adminSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true, lowercase: true, index: true },
  passwordHash: { type: String, required: true },
  name: { type: String },
  role: { type: String, enum: ['admin', 'hotel', 'agent'], default: 'hotel' }, // <-- two roles
},{timestamps: true});

module.exports = mongoose.model('Admin', adminSchema);
