// src/routes/dashboard.route.js
const express = require('express');
const router = express.Router();
const dashboardCtrl = require('../controllers/dashboardController');
const adminMiddleware = require('../middlewares/admin.middleware');

// GET admin dashboard (protected)
router.get('/', adminMiddleware, dashboardCtrl.getDashboard);

module.exports = router;
