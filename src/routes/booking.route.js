// routes/bookings.js
const express = require('express');
const router = express.Router();
const bookingCtrl = require('../controllers/booking.controller');
// auth middleware that sets req.user
const requireAuth = require('../middlewares/auth.middleware');
const requireAdmin = require('../middlewares/admin.middleware'); // optional

// Create booking (user)
router.post('/', requireAuth, bookingCtrl.createBooking);

// User bookings
router.get('/me', requireAuth, bookingCtrl.getMyBookings);

// Admin listing + update
router.get('/', requireAdmin, bookingCtrl.getHotelBookings);
router.patch('/:id/status', requireAdmin, bookingCtrl.updateBookingStatus);

module.exports = router;
