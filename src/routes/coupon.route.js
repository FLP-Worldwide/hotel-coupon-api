// routes/coupon.route.js
const express = require('express');
const router = express.Router();
const couponCtrl = require('../controllers/coupon.controller');
const adminAuth = require('../middlewares/admin.middleware'); // requires admin token (admin & hotel)
const requireRole = require('../middlewares/requireRole'); // optional role guard

// Public
router.get('/', couponCtrl.listCoupons);
router.get('/:id', couponCtrl.getCoupon);

// Protected (create/update/delete) - admin or hotel
router.post('/', adminAuth, couponCtrl.createCoupon);
router.put('/:id', adminAuth, couponCtrl.updateCoupon);
router.delete('/:id', adminAuth, couponCtrl.deleteCoupon);

// Apply & redeem
router.post('/apply', couponCtrl.applyCoupon);       // public endpoint to validate
router.post('/redeem', adminAuth, couponCtrl.redeemCoupon); // call after booking success

module.exports = router;
