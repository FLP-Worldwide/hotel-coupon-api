// models/Coupon.js
const mongoose = require('mongoose');

const couponSchema = new mongoose.Schema({
  code: {
    type: String,
    required: true,
    uppercase: true,
    index: true,
  },

  // 🔗 every coupon now belongs to a plan
  plan: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Plan',
    required: true,
  },

  title: { type: String },           // usually plan title or custom
  description: { type: String },     // "food", "travel", "room", etc.

  // discount info from frontend row
  discountType: {
    type: String,
    enum: ['percentage', 'fixed'],
    required: true,
  },
  discountValue: {
    type: Number,
    required: true,
  },

  // from coupon row
  minOrderValue: { type: Number, default: 0 },

  // optional caps / limits (not on UI but safe to keep)
  maxDiscount: { type: Number },
  usageLimit: { type: Number, default: 0 },   // 0 = unlimited
  perUserLimit: { type: Number, default: 1 },

  // validity – re-used from plan.validTo when you create
  validFrom: { type: Date, default: Date.now },
  validTo: { type: Date, required: true },

  // tracking usage (you can keep or remove)
  usedCount: { type: Number, default: 0 },
  usedBy: [
    {
      userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      count: { type: Number, default: 1 },
      lastUsedAt: { type: Date, default: Date.now },
    },
  ],

  // usually same as plan.applicableHotels, but can override per coupon if needed
  applicableHotels: [
    { type: mongoose.Schema.Types.ObjectId, ref: 'Hotel' },
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

  // 💡 this is where frontend `couponPrice` is stored
  price: { type: Number },

  createdAt: { type: Date, default: Date.now },
});

// unique code per plan (so same code allowed for another plan if you want)
couponSchema.index({ code: 1, plan: 1 }, { unique: true });

module.exports = mongoose.model('Coupon', couponSchema);
