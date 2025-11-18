// routes/coupon.route.js
const express = require('express');
const router = express.Router();
const couponCtrl = require('../controllers/coupon.controller');
const adminAuth = require('../middlewares/admin.middleware'); // requires admin token (admin & hotel)
const requireRole = require('../middlewares/requireRole'); // optional role guard

// Public
router.get('/', couponCtrl.listCoupons);



router.post('/plans', adminAuth, couponCtrl.createPlan);
router.get('/plans', couponCtrl.listPlans);
router.get('/plans/:id', adminAuth,couponCtrl.getPlans);
router.put('/plans/:id', adminAuth,couponCtrl.updatePlan);
router.delete('/plans/:id', adminAuth,couponCtrl.deletePlan);

router.get('/:id', couponCtrl.getCoupon);

// Protected (create/update/delete) - admin or hotel
router.post('/', adminAuth, couponCtrl.createCoupon);
router.put('/:id', adminAuth, couponCtrl.updateCoupon);
router.delete('/:id', adminAuth, couponCtrl.deleteCoupon);

// Apply & redeem
router.post('/apply', couponCtrl.applyCoupon);       // public endpoint to validate
router.post('/redeem', adminAuth, couponCtrl.redeemCoupon); // call after booking success


module.exports = router;
