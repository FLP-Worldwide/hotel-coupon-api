// routes/index.js
const express = require('express');
const router = express.Router();

// Import sub-routers
const authRoutes = require('./auth.route');
const adminRoutes = require('./admin.route');
const hotelRoutes = require('./hotel.route');
const couponRoutes = require('./coupon.route');
const bookingRoutes = require('./booking.route');
const dashboardRoutes = require('./dashboard.route');
const userRoutes = require('./user.route');
const paymentRoutes = require('./payment');
const agentRroutes = require('./agent.routes');


// Mount them under base paths
router.use('/auth', authRoutes);
router.use('/admin', adminRoutes);
router.use('/admin/hotels', hotelRoutes);
router.use('/hotels', hotelRoutes);
router.use('/admin/coupons', couponRoutes);
router.use('/coupons', couponRoutes);
router.use("/admin/bookings", bookingRoutes);
router.use('/bookings', bookingRoutes);
router.use('/admin/dashboard', dashboardRoutes);
router.use('/admin/users', userRoutes);
router.use('/phonepe', paymentRoutes);
router.use('/admin/agents', agentRroutes);

module.exports = router;
