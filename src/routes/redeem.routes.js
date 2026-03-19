const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const adminAuth = require('../middlewares/admin.middleware');

const Coupon = mongoose.model('Coupon');
const Hotel = mongoose.model('Hotel');
const User = mongoose.model('User');
const Redemption = require('../models/Redemption');

/* =====================================================
   ✅ REDEEM BY CODE + PHONE (FINAL SAFE 🔥)
   ===================================================== */
// POST /admin/redeem/by-code
router.post('/by-code', adminAuth, async (req, res) => {
  try {
    const { code, phone } = req.body;
    const adminId = req.admin?._id;

    if (!code || !phone) {
      return res.status(400).json({
        message: "Coupon code and phone required",
      });
    }

    /* 🔥 Find hotel of admin */
    const hotel = await Hotel.findOne({ admin: adminId }).select('_id');
    if (!hotel) {
      return res.status(400).json({ message: "Hotel not found" });
    }

    const hotelId = hotel._id;

    /* 🔥 Find user */
    const user = await User.findOne({ phone });
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    /* 🔥 Find coupon */
    const coupon = await Coupon.findOne({
      code: code.trim().toUpperCase(),
    }).populate('purchaseId');

    if (!coupon) {
      return res.status(404).json({ message: "Invalid coupon code" });
    }

    /* ❌ Check coupon belongs to this user */
    if (String(coupon.purchaseId?.user) !== String(user._id)) {
      return res.status(403).json({
        message: "This coupon does not belong to this user",
      });
    }

    /* ❌ Not valid for this hotel */
    if (!coupon.applicableHotels.map(String).includes(String(hotelId))) {
      return res.status(403).json({
        message: "Not valid for this hotel",
      });
    }

    const now = new Date();

    /* ❌ Expired */
    if (coupon.validTo && now > coupon.validTo) {
      return res.status(400).json({ message: "Coupon expired" });
    }

    /* =====================================================
       🔥 FINAL RULE: 1 COUPON = 1 USE
       ===================================================== */
    const alreadyUsed = await Redemption.findOne({
      user: user._id,
      coupon: coupon._id,
    });

    if (alreadyUsed) {
      return res.status(400).json({
        message: "Coupon already redeemed",
      });
    }

    /* =====================================================
       ✅ SAVE REDEMPTION
       ===================================================== */
    await Redemption.create({
      coupon: coupon._id,
      user: user._id,
      hotel: hotelId,
    });

    /* OPTIONAL: update coupon usage */
    coupon.usedCount += 1;
    coupon.usedBy.push({
      userId: user._id,
      usedAt: now,
    });

    await coupon.save();

    return res.json({
      message: "Coupon redeemed successfully",
      code: coupon.code,
      user: user.phone,
    });

  } catch (err) {
    console.error("redeem error", err);
    return res.status(500).json({ message: "Internal error" });
  }
});

// GET /admin/redeem/history
// GET /admin/redeem/history
router.get('/history', adminAuth, async (req, res) => {
  try {
    const adminId = req.admin._id;

    const hotel = await Hotel.findOne({ admin: adminId }).select('_id');

    if (!hotel) {
      return res.status(400).json({ message: "Hotel not found" });
    }

    const history = await Redemption.find({ hotel: hotel._id })
      .populate('user', 'name phone')
      .populate('coupon', 'code benefitName')
      .sort({ usedAt: -1 });

    res.json(history);

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Error" });
  }
});

module.exports = router;