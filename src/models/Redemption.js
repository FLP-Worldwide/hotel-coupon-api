const mongoose = require('mongoose');

const redemptionSchema = new mongoose.Schema({
  coupon: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Coupon',
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
  hotel: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Hotel',
  },
  usedAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model('Redemption', redemptionSchema);