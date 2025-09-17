// controllers/booking.controller.js
const mongoose = require('mongoose');
const Booking = require('../models/Booking');
const Coupon = require('../models/Coupon');
const Hotel = require('../models/Hotel');
const User = require('../models/User');

/**
 * POST /api/bookings
 * Body: { couponId, hotelId, qty, price? }
 * Uses req.user._id if auth middleware present.
 */

exports.createBooking = async (req, res) => {
  try {
    const { couponId, hotelId: bodyHotelId, qty = 1, price: bodyPrice } = req.body;
    const userId = req.user && req.user._id;

    if (!userId) return res.status(401).json({ message: 'Unauthorized' });
    if (!couponId) return res.status(400).json({ message: 'couponId is required' });

    const coupon = await Coupon.findById(couponId);
    if (!coupon) return res.status(404).json({ message: 'Coupon not found' });

    // Optional: allow linking a coupon purchase to a specific hotel (if applicable)
    let hotelId = bodyHotelId;
    if (!hotelId) {
      // if coupon applies to exactly one hotel you may infer it; otherwise it's optional for purchase
      if (Array.isArray(coupon.applicableHotels) && coupon.applicableHotels.length === 1) {
        hotelId = coupon.applicableHotels[0];
      } else {
        hotelId = null; // purchase can be without hotel link
      }
    }

    // If hotelId provided, ensure it exists
    if (hotelId) {
      const hotel = await Hotel.findById(hotelId);
      if (!hotel) return res.status(404).json({ message: 'Hotel not found' });
    }

    // Validate coupon status & date window for purchase
    if (coupon.status !== 'active') return res.status(400).json({ message: 'Coupon is not active' });
    const now = new Date();
    if (coupon.validFrom && coupon.validFrom > now) return res.status(400).json({ message: 'Coupon not yet available for purchase' });
    if (coupon.validTo && coupon.validTo < now) return res.status(400).json({ message: 'Coupon offer expired' });

    // Determine unit price (purchase price). For purchase flow we require coupon.price OR client must pass price override.
    const unitPrice = (bodyPrice != null && !isNaN(Number(bodyPrice)))
      ? Number(bodyPrice)
      : (coupon.price != null ? Number(coupon.price) : null);

    if (unitPrice == null || Number.isNaN(unitPrice)) {
      return res.status(400).json({ message: 'Price not available for this coupon. Provide price in request or set coupon.price.' });
    }

    const quantity = Number(qty) || 1;
    if (!Number.isInteger(quantity) || quantity < 1) return res.status(400).json({ message: 'qty must be integer >= 1' });

    const subTotal = Number((unitPrice * quantity).toFixed(2));
    const total = subTotal; // no discount for purchase flow

    // If coupon has a usageLimit, ensure availability: usedCount + qty <= usageLimit
    if (coupon.usageLimit && coupon.usageLimit > 0) {
      if ((coupon.usedCount || 0) + quantity > coupon.usageLimit) {
        return res.status(400).json({ message: 'Coupon stock / usage limit exceeded' });
      }
    }

    // Atomic-ish update: try increment user's usedBy entry OR push a new entry, increment usedCount by qty
    // First, try increment existing usedBy entry
    const incExisting = await Coupon.updateOne(
      {
        _id: couponId,
        'usedBy.userId': userId,
        ...(coupon.usageLimit && coupon.usageLimit > 0 ? { usedCount: { $lte: coupon.usageLimit - quantity } } : {}),
      },
      {
        $inc: { 'usedBy.$.count': quantity, usedCount: quantity },
        $set: { 'usedBy.$.lastUsedAt': new Date() },
      }
    );

    let couponUpdated = false;
    if (incExisting.modifiedCount && incExisting.modifiedCount > 0) {
      couponUpdated = true;
    } else {
      // push new usedBy entry (if not exists) and increment usedCount
      const pushNew = await Coupon.updateOne(
        {
          _id: couponId,
          'usedBy': { $not: { $elemMatch: { userId: userId } } },
          ...(coupon.usageLimit && coupon.usageLimit > 0 ? { usedCount: { $lte: coupon.usageLimit - quantity } } : {}),
        },
        {
          $inc: { usedCount: quantity },
          $push: { usedBy: { userId, count: quantity, lastUsedAt: new Date() } },
        }
      );
      if (pushNew.modifiedCount && pushNew.modifiedCount > 0) {
        couponUpdated = true;
      }
    }

    if (!couponUpdated) {
      // could not update coupon (likely usageLimit reached or race)
      return res.status(400).json({ message: 'Coupon cannot be purchased (limit reached). Try again.' });
    }

    // create booking record for purchase
    let booking;
    try {
      booking = await Booking.create({
        user: userId,
        hotel: hotelId, // may be null
        coupon: couponId,
        qty: quantity,
        price: unitPrice, // per unit
        total,            // full booking total (no discount)
        status: 'pending', // or 'paid' if payment accepted immediately
      });
    } catch (createErr) {
      // best-effort rollback: decrement usedCount and user's count
      try {
        await Coupon.updateOne(
          { _id: couponId, 'usedBy.userId': userId },
          { $inc: { 'usedBy.$.count': -quantity, usedCount: -quantity } }
        );
        // remove any usedBy entries that may have count <= 0
        await Coupon.updateOne(
          { _id: couponId },
          { $pull: { usedBy: { userId: userId, count: { $lte: 0 } } } }
        );
      } catch (rbErr) {
        console.error('Rollback after booking create failure failed:', rbErr);
      }
      console.error('Booking creation failed after coupon update:', createErr);
      return res.status(500).json({ message: 'Failed to create booking' });
    }

    // populate booking for response
    const populated = await Booking.findById(booking._id)
      .populate('user', 'name email')
      .populate('hotel', 'name city')
      .populate('coupon', 'code title price');

    return res.status(201).json({ message: 'Coupon purchased', booking: populated });
  } catch (err) {
    console.error('createBooking (purchase) error:', err);
    return res.status(500).json({ message: 'Internal server error', error: err.message || err });
  }
};

/**
 * Admin: get all bookings (paginated)
 * Query: ?page=1&limit=20
 */
exports.getAllBookings = async (req, res) => {
  try {
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(100, Number(req.query.limit) || 20);
    const skip = (page - 1) * limit;

    const [bookings, total] = await Promise.all([
      Booking.find()
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('user', 'name email phone')
        .populate('hotel', 'name city')
        .populate('coupon', 'code title discountType discountValue'),
      Booking.countDocuments(),
    ]);

    return res.json({ page, limit, total, totalPages: Math.ceil(total / limit), bookings });
  } catch (err) {
    console.error('getAllBookings error', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

/**
 * User: get my bookings
 */
exports.getMyBookings = async (req, res) => {
  try {
    const userId = req.user && req.user._id;
    if (!userId) return res.status(401).json({ message: 'Unauthorized' });

    const bookings = await Booking.find({ user: userId })
      .sort({ createdAt: -1 })
      .populate('hotel', 'name city')
      .populate('coupon', 'code title discountType discountValue');

    return res.json({ bookings });
  } catch (err) {
    console.error('getMyBookings error', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

/**
 * Admin: update booking status
 */
exports.updateBookingStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    if (!['pending', 'paid', 'cancelled'].includes(status)) {
      return res.status(400).json({ message: 'Invalid status' });
    }

    const booking = await Booking.findById(id);
    if (!booking) return res.status(404).json({ message: 'Booking not found' });

    booking.status = status;
    await booking.save();

    return res.json({ message: 'Booking updated', booking });
  } catch (err) {
    console.error('updateBookingStatus error', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
};
