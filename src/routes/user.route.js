// routes/user.routes.js
const express = require('express');
const router = express.Router();
const { listUsers } = require('../controllers/user.controller');

// Example: protect with admin auth middleware
const adminMiddleware = require("../middlewares/admin.middleware");

// GET /api/admin/users
router.get('/', adminMiddleware, listUsers);

module.exports = router;
