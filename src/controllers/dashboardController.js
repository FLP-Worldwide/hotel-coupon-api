// src/controllers/dashboardController.js
const mongoose = require('mongoose');
const User = require('../models/User');
const Hotel = require('../models/Hotel');
const Coupon = require('../models/Coupon');
const Booking = require('../models/Booking');

/**
 * GET /api/admin/dashboard
 * Returns a dashboard object with:
 *  - totals: users, hotels, coupons, bookings
 *  - revenue: total revenue (sum of booking.total where status=paid)
 *  - bookingsByStatus: counts per status
 *  - recentBookings: last N bookings (populated)
 *  - topHotels: by revenue and by bookings
 *  - monthlyRevenue: last 12 months revenue (array)
 */
exports.getDashboard = async (req, res) => {
    try {
        // 1) Totals (simple counts)
        const [totalUsers, totalHotels, totalCoupons, totalBookings] = await Promise.all([
            User.countDocuments(),
            Hotel.countDocuments(),
            Coupon.countDocuments(),
            Booking.countDocuments(),
        ]);

        // 2) Revenue (only paid bookings)
        const revenueAgg = await Booking.aggregate([
            { $match: { status: 'paid' } },
            { $group: { _id: null, totalRevenue: { $sum: '$total' } } },
        ]);
        const totalRevenue = (revenueAgg[0] && revenueAgg[0].totalRevenue) || 0;

        // 3) Bookings by status
        const bookingsByStatusAgg = await Booking.aggregate([
            { $group: { _id: '$status', count: { $sum: 1 } } },
        ]);
        const bookingsByStatus = bookingsByStatusAgg.reduce((acc, cur) => {
            acc[cur._id] = cur.count;
            return acc;
        }, {});

        // 4) Recent bookings (latest 10)
        const recentBookings = await Booking.find({})
            .sort({ createdAt: -1 })
            .limit(10)
            .populate('user', 'name email phone')
            .populate('hotel', 'name city')
            .populate('coupon', 'title code')
            .lean();

        // 5) Top hotels by revenue (top 5)
        const topHotelsByRevenue = await Booking.aggregate([
            { $match: { status: 'paid', hotel: { $ne: null } } },
            { $group: { _id: '$hotel', revenue: { $sum: '$total' }, bookings: { $sum: 1 } } },
            { $sort: { revenue: -1 } },
            { $limit: 5 },
            {
                $lookup: {
                    from: 'hotels',
                    localField: '_id',
                    foreignField: '_id',
                    as: 'hotel',
                },
            },
            { $unwind: '$hotel' },
            {
                $project: {
                    _id: 0,
                    hotelId: '$_id',
                    hotelName: '$hotel.name',
                    city: '$hotel.address.city',
                    revenue: 1,
                    bookings: 1,
                },
            },
        ]);

        // 6) Top hotels by bookings (top 5)
        const topHotelsByBookings = await Booking.aggregate([
            { $match: { hotel: { $ne: null } } },
            { $group: { _id: '$hotel', bookings: { $sum: 1 }, revenue: { $sum: '$total' } } },
            { $sort: { bookings: -1 } },
            { $limit: 5 },
            {
                $lookup: {
                    from: 'hotels',
                    localField: '_id',
                    foreignField: '_id',
                    as: 'hotel',
                },
            },
            { $unwind: '$hotel' },
            {
                $project: {
                    _id: 0,
                    hotelId: '$_id',
                    hotelName: '$hotel.name',
                    city: '$hotel.address.city',
                    bookings: 1,
                    revenue: 1,
                },
            },
        ]);

        // 7) Monthly revenue for last 12 months (array: {year, month, revenue})
        const now = new Date();
        const start = new Date(now.getFullYear(), now.getMonth() - 11, 1); // start of month 11 months ago
        const monthlyAgg = await Booking.aggregate([
            { $match: { status: 'paid', createdAt: { $gte: start } } },
            {
                $group: {
                    _id: {
                        year: { $year: '$createdAt' },
                        month: { $month: '$createdAt' },
                    },
                    revenue: { $sum: '$total' },
                },
            },
            { $sort: { '_id.year': 1, '_id.month': 1 } },
        ]);

        // convert monthlyAgg to full 12-month series (fill zeros)
        const monthlyRevenue = [];
        for (let i = 11; i >= 0; i--) {
            const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
            const y = d.getFullYear();
            const m = d.getMonth() + 1; // $month is 1-12
            const found = monthlyAgg.find((x) => x._id.year === y && x._id.month === m);
            monthlyRevenue.push({
                year: y,
                month: m,
                revenue: found ? found.revenue : 0,
            });
        }

        // 8) Recent coupons sold (top 5 by sold count)
        const topCoupons = await Booking.aggregate([
            { $match: { coupon: { $ne: null } } },
            { $group: { _id: '$coupon', sold: { $sum: '$qty' }, bookings: { $sum: 1 } } },
            { $sort: { sold: -1 } },
            { $limit: 6 },
            {
                $lookup: {
                    from: 'coupons',
                    localField: '_id',
                    foreignField: '_id',
                    as: 'coupon',
                },
            },
            { $unwind: '$coupon' },
            {
                $project: {
                    _id: 0,
                    couponId: '$_id',
                    title: '$coupon.title',
                    code: '$coupon.code',
                    sold: 1,
                    bookings: 1,
                },
            },
        ]);

        // Build response
        const dashboard = {
            totals: {
                users: totalUsers,
                hotels: totalHotels,
                coupons: totalCoupons,
                bookings: totalBookings,
            },
            revenue: {
                total: totalRevenue,
            },
            bookingsByStatus,
            recentBookings,
            topHotelsByRevenue,
            topHotelsByBookings,
            topCoupons,
            monthlyRevenue,
        };

        return res.json({ success: true, dashboard });
    } catch (err) {
        console.error('dashboard error', err);
        return res.status(500).json({ success: false, message: 'Internal server error', error: err.message });
    }
};
