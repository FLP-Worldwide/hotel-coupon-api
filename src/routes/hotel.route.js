// routes/hotel.js
const express = require('express');
const router = express.Router();
const hotelCtrl = require('../controllers/hotel.controller');
const adminAuth = require('../middlewares/admin.middleware');
const upload = require('../middlewares/upload');

// Public listing & get (optional: change to protected as needed)
router.get('/', hotelCtrl.listHotels);
router.get('/admin', adminAuth, hotelCtrl.listHotelsAdmin);
router.get('/:id', hotelCtrl.getHotel);

// Protected hotel management (admin or hotel role)
router.post('/', adminAuth, upload.array('images', 10), hotelCtrl.createHotel);
router.put('/:id', adminAuth, upload.array('images', 10), hotelCtrl.updateHotel);
router.delete('/:id', adminAuth, hotelCtrl.deleteHotel);

module.exports = router;
