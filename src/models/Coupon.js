// models/Coupon.js
const mongoose = require('mongoose');

const couponSchema = new mongoose.Schema({
    code: { type: String, required: true, uppercase: true, index: true }, // unique per tenant/ global
    title: { type: String },
    description: { type: String },

    // type: percentage (e.g. 10) or fixed amount (e.g. 500)
    discountType: { type: String, enum: ['percentage', 'fixed'], required: true },
    discountValue: { type: Number, required: true },

    minOrderValue: { type: Number, default: 0 },   // min booking amount to apply
    maxDiscount: { type: Number },                 // cap on percentage discounts

    validFrom: { type: Date, default: Date.now },
    validTo: { type: Date, required: true },

    usageLimit: { type: Number, default: 0 },      // 0 = unlimited
    perUserLimit: { type: Number, default: 1 },    // times a single user can use

    usedCount: { type: Number, default: 0 },       // global uses
    usedBy: [{                                     // track usage by user (optional)
        userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        count: { type: Number, default: 1 },
        lastUsedAt: { type: Date, default: Date.now }
    }],

    applicableHotels: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Hotel' }], // empty = all hotels
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin', required: true }, // admin or hotel user
    status: { type: String, enum: ['active', 'inactive', 'expired'], default: 'active' },
    price: { type: Number },
    createdAt: { type: Date, default: Date.now }
});

// Compound index to avoid duplicate codes per creator scope (optional)
couponSchema.index({ code: 1, createdBy: 1 }, { unique: true });

module.exports = mongoose.model('Coupon', couponSchema);
