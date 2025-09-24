// routes/hotel.js
const express = require('express');
const router = express.Router();
const payementController = require('../controllers/payment.controller');

// Public listing & get (optional: change to protected as needed)
router.post('/initialize-payment',payementController.initializePayment)
router.get("/payment-status",payementController.paymentStatus)

module.exports = router;
