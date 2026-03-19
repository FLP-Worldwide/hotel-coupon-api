// models/Coupon.js
const mongoose = require('mongoose');

const couponSchema = new mongoose.Schema({
  code: {
    type: String,
    required: true,
    uppercase: true,
    index: true,
  },

  // 🔗 coupon belongs to plan
  plan: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Plan',
    required: true,
  },

  // 🔗 benefit inside plan (Dinner / Stay / Tea etc)
  benefitName: {
    type: String,
    required: true,
  },

  title: {
    type: String,
  },

  description: {
    type: String,
  },

  discountType: {
    type: String,
    enum: ['percentage', 'fixed','free'],
    default: 'free',
  },

  discountValue: {
    type: Number,
    default: 0,
  },

  // how many times allowed per visit
  redeemPerVisit: {
    type: Number,
    default: 1,
  },

  // 🔗 when membership purchased
  purchaseId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Booking',
  },

  // validity will start AFTER purchase
  validFrom: {
    type: Date,
  },

  validTo: {
    type: Date,
  },

  // tracking usage
  usedCount: {
    type: Number,
    default: 0,
  },

  usedBy: [
    {
      userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
      usedAt: {
        type: Date,
        default: Date.now,
      },
    },
  ],

  applicableHotels: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Hotel',
    },
  ],

  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Admin',
    required: true,
  },

  status: {
    type: String,
    enum: ['active', 'inactive', 'expired'],
    default: 'active',
  },

  createdAt: {
    type: Date,
    default: Date.now,
  },
});

// unique coupon per plan
couponSchema.index({ code: 1, plan: 1 }, { unique: true });

module.exports = mongoose.model('Coupon', couponSchema);