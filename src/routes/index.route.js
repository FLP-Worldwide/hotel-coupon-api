// routes/index.js
const express = require('express');
const router = express.Router();

// Import sub-routers
const authRoutes = require('./auth.route');
const adminRoutes = require('./admin.route');
const hotelRoutes = require('./hotel.route');

// Mount them under base paths
router.use('/auth', authRoutes);
router.use('/admin', adminRoutes);
router.use('/hotels', hotelRoutes);
router.use('/coupons', require('./coupon.route'));

module.exports = router;
