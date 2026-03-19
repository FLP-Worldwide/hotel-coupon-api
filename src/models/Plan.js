// models/Plan.js
const mongoose = require('mongoose');

const planSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  }, // e.g. starter

  title: {
    type: String,
  }, // Starter Plan

  description: {
    type: String,
  }, // plan description

  price: {
    type: Number,
    required: true,
  },

  // validity AFTER purchase
  validityMonths: {
    type: Number,
    required: true,
  },

  applicableHotels: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Hotel',
    },
  ],

  status: {
    type: String,
    enum: ['active', 'inactive'],
    default: 'active',
  },

  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Admin',
    required: true,
  },
  
  rules: [
    {
      type: String,
    },
  ],
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model('Plan', planSchema);