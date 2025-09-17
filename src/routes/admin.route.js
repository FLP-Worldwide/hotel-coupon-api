// routes/admin.js
const express = require('express');
const router = express.Router();
const adminCtrl = require('../controllers/admin.controller'); // matches controllers/adminController.js
const adminAuth = require('../middlewares/admin.middleware');

// Optional register (use carefully; consider disabling in prod)
router.post('/register', adminCtrl.register);

// Login (returns access + sets refresh cookie)
router.post('/login', adminCtrl.login);

// Refresh access token using refresh cookie (no access token required)
router.post('/refresh', adminCtrl.refresh);

// Logout — clear refresh cookie. Not protected so client can logout even if access token expired.
router.post('/logout', adminCtrl.logout);

// Protected admin routes
router.get('/me', adminAuth, adminCtrl.me);

module.exports = router;
