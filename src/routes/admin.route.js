// routes/admin.js
const express = require('express');
const router = express.Router();
const adminCtrl = require('../controllers/admin.controller');
const adminAuth = require('../middlewares/admin.middleware');

// Optional register (use carefully; consider disabling in prod)
router.post('/register', adminCtrl.register);

// Login (returns access + refresh)
router.post('/login', adminCtrl.login);

// Protected admin routes
router.get('/me', adminAuth, adminCtrl.me);
router.post('/logout', adminAuth, adminCtrl.logout);

module.exports = router;


// const adminCtrl = require('../controllers/adminController');
// const adminAuth = require('../middlewares/adminAuth');
// const requireRole = require('../middlewares/requireRole');

// // public
// router.post('/login', adminCtrl.login);

// // protected routes
// router.get('/me', adminAuth, adminCtrl.me);

// // admin-only route
// router.get('/all-admins', adminAuth, requireRole('admin'), adminCtrl.listAllAdmins);

// // hotel-only route (accessible only to hotel role)
// router.get('/hotel/dashboard', adminAuth, requireRole('hotel'), adminCtrl.hotelDashboard);

// // accessible to both admin & hotel
// router.get('/shared', adminAuth, requireRole(['admin','hotel']), adminCtrl.sharedForBoth);

// module.exports = router;
