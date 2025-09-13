// routes/hotel.js
const express = require('express');
const router = express.Router();
const hotelCtrl = require('../controllers/hotel.controller');
const adminAuth = require('../middlewares/admin.middleware');

// Public listing & get (optional: change to protected as needed)
router.get('/', hotelCtrl.listHotels);
router.get('/:id', hotelCtrl.getHotel);

// Protected hotel management (admin or hotel role)
router.post('/', adminAuth, hotelCtrl.createHotel);
router.put('/:id', adminAuth, hotelCtrl.updateHotel);
router.delete('/:id', adminAuth, hotelCtrl.deleteHotel);

module.exports = router;
