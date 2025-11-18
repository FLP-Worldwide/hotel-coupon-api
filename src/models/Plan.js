// models/Plan.js
const mongoose = require('mongoose');

const planSchema = new mongoose.Schema({
  name: { type: String, required: true },       // e.g. "starter"
  title: { type: String },                      // "Starter Plan"
  description: { type: String },                // "combo offer"

  price: { type: Number, required: true },      // main plan price

  validFrom: { type: Date, default: Date.now },
  validTo: { type: Date, required: true },

  applicableHotels: [
    { type: mongoose.Schema.Types.ObjectId, ref: 'Hotel' },
  ],                                            // plan can be used by many hotels

  status: {
    type: String,
    enum: ['active', 'inactive', 'expired'],
    default: 'active',
  },

  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Admin',
    required: true,
  },

  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('Plan', planSchema);
