const express = require('express');
const router = express.Router();
const authCtrl = require('../controllers/auth.controller');
const authMiddleware = require('../middlewares/auth.middleware');

// request OTP
// body: { identifier: "user@example.com" or "+911234567890", via: "email" | "sms" }
router.post('/send-otp', authCtrl.sendOtp);

// verify OTP
// body: { identifier, otp }
router.post('/verify-otp', authCtrl.verifyOtp);

// refresh access token
// body: { refreshToken }
router.post('/refresh', authCtrl.refresh);

// logout
// body: { refreshToken }
router.post('/logout', authCtrl.logout);


// profile routes (protected)
router.get('/profile', authMiddleware, authCtrl.getProfile);
router.put('/profile', authMiddleware, authCtrl.updateProfile);


module.exports = router;
