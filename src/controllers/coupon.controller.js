// controllers/couponController.js
const mongoose = require('mongoose');
const Coupon = require('../models/Coupon');
const Plan = require('../models/Plan');
const Hotel = require('../models/Hotel');

/** Helper: compute discount */
function computeDiscount(coupon, amount) {
    if (coupon.discountType === 'fixed') {
        let disc = coupon.discountValue;
        if (coupon.maxDiscount) disc = Math.min(disc, coupon.maxDiscount);
        return Math.min(disc, amount);
    } else { // percentage
        let disc = (amount * coupon.discountValue) / 100;
        if (coupon.maxDiscount) disc = Math.min(disc, coupon.maxDiscount);
        return Math.min(disc, amount);
    }
}

/** Create coupon */
exports.createCoupon = async (req, res) => {
    try {
        const creator = req.admin; // adminAuth sets this
        if (!creator) return res.status(401).json({ message: 'Unauthorized' });

        const body = req.body;
        // basic required checks
        if (!body.code || !body.discountType || !body.discountValue || !body.validTo) {
            return res.status(400).json({ message: 'code, discountType, discountValue and validTo are required' });
        }

        const code = String(body.code).trim().toUpperCase();

        // If hotel role, restrict applicableHotels to hotels this user created (or single hotel)
        if (creator.role === 'hotel') {
            // ensure body.applicableHotels either empty or includes creator's hotels
            // For simplicity enforce createdBy = creator._id
            body.createdBy = creator._id;
        } else {
            body.createdBy = creator._id;
        }

        const coupon = await Coupon.create({
            ...body,
            code,
            createdBy: body.createdBy
        });

        return res.status(201).json({ message: 'Coupon created', coupon });
    } catch (err) {
        console.error('createCoupon', err);
        if (err.code === 11000) return res.status(409).json({ message: 'Coupon code already exists' });
        return res.status(500).json({ message: 'Internal server error', error: err.message });
    }
};

exports.createPlan = async (req, res) => {
  try {
    const creator = req.admin;
    if (!creator) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const {
      name,
      title,
      description,
      price,
      validityMonths,
      applicableHotels,
      status,
      benefits,
    } = req.body;

    if (!name || price == null || !validityMonths) {
      return res.status(400).json({
        message: 'name, price and validityMonths are required',
      });
    }

    // 1️⃣ Create plan
    const plan = await Plan.create({
      name,
      title,
      description,
      price,
      validityMonths,
      applicableHotels: applicableHotels || [],
      status: status || 'active',
      createdBy: creator._id,
    });

    // 2️⃣ Create coupons from benefits
    if (Array.isArray(benefits) && benefits.length > 0) {
      const couponDocs = [];

      benefits.forEach((benefit) => {
        const {
          name: benefitName,
          discountType,
          discountValue,
          redeemPerVisit,
          coupons,
        } = benefit;

        if (!Array.isArray(coupons) || coupons.length === 0) return;

        coupons.forEach((c) => {
          const code = String(c.code).trim().toUpperCase();

          couponDocs.push({
            code,

            title: benefitName || title || name,
            description: benefitName,

            discountType,
            discountValue: Number(discountValue) || 0,

            applicableHotels: applicableHotels || [],

            status: status || 'active',

            createdBy: creator._id,

            plan: plan._id,

            benefitName,

            redeemPerVisit: Number(redeemPerVisit) || 1,

            usedCount: 0,

            validFrom: null,
            validTo: null,
          });
        });
      });

      if (couponDocs.length > 0) {
        await Coupon.insertMany(couponDocs);
      }
    }

    return res.status(201).json({
      message: 'Plan created successfully',
      plan,
    });
  } catch (err) {
    console.error('createPlan', err);

    if (err.code === 11000) {
      return res
        .status(409)
        .json({ message: 'Duplicate coupon code detected' });
    }

    return res.status(500).json({
      message: 'Internal server error',
      error: err.message,
    });
  }
};

exports.getPlans = async (req, res) => {
  try {
    const creator = req.admin;
    if (!creator) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const plans = await Plan.find({ createdBy: creator._id })
      .sort({ createdAt: -1 })
      .lean();

    // attach coupon list (codes & discounts) for each plan
    const planIds = plans.map((p) => p._id);
    const coupons = await Coupon.find({ plan: { $in: planIds } }).lean();

    const couponsByPlan = coupons.reduce((acc, c) => {
      const pid = String(c.plan);
      if (!acc[pid]) acc[pid] = [];
      acc[pid].push(c);
      return acc;
    }, {});

    const result = plans.map((p) => ({
      ...p,
      coupons: couponsByPlan[String(p._id)] || [],
    }));

    return res.json({ message: 'Plans fetched', plans: result });
  } catch (err) {
    console.error('getPlans', err);
    return res
      .status(500)
      .json({ message: 'Internal server error', error: err.message });
  }
};
exports.deletePlan = async (req, res) => {
  try {
    const creator = req.admin;
    if (!creator) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ message: 'Invalid id' });
    }

    // check plan exists and belongs to this admin
    const plan = await Plan.findOne({ _id: id, createdBy: creator._id });
    if (!plan) {
      return res.status(404).json({ message: 'Plan not found' });
    }

    // Delete all coupons linked to this plan
    await Coupon.deleteMany({ plan: plan._id });

    // Delete plan itself
    await Plan.deleteOne({ _id: plan._id });

    return res.json({ message: 'Plan deleted successfully' });
  } catch (err) {
    console.error('deletePlan', err);
    return res
      .status(500)
      .json({ message: 'Internal server error', error: err.message });
  }
};

exports.updateCoupon = async (req, res) => {
  try {
    const creator = req.admin;

    if (!creator) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const { id } = req.params;

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ message: "Invalid id" });
    }

    const {
      name,
      title,
      description,
      price,
      validityMonths,
      applicableHotels,
      status,
      benefits,
    } = req.body;

    if (!name || price == null || !validityMonths) {
      return res.status(400).json({
        message: "name, price and validityMonths are required",
      });
    }

    // 1️⃣ Update Plan
    const plan = await Plan.findOneAndUpdate(
      { _id: id, createdBy: creator._id },
      {
        name,
        title,
        description,
        price,
        validityMonths,
        applicableHotels: applicableHotels || [],
        status: status || "active",
      },
      { new: true }
    );

    if (!plan) {
      return res.status(404).json({ message: "Plan not found" });
    }

    // 2️⃣ Delete existing coupons of this plan
    await Coupon.deleteMany({ plan: plan._id });

    // 3️⃣ Re-create coupons from benefits
    if (Array.isArray(benefits) && benefits.length > 0) {
      const couponDocs = [];

      benefits.forEach((benefit) => {
        const {
          name: benefitName,
          discountType,
          discountValue,
          redeemPerVisit,
          coupons,
        } = benefit;

        if (!Array.isArray(coupons)) return;

        coupons.forEach((c) => {
          if (!c.code) return;

          const code = String(c.code).trim().toUpperCase();

          couponDocs.push({
            code,

            plan: plan._id,

            benefitName: benefitName, // ⭐ REQUIRED FIELD

            title: benefitName || title || name,

            description: benefitName || description || "",

            discountType: discountType || "free",

            discountValue: Number(discountValue) || 0,

            redeemPerVisit: Number(redeemPerVisit) || 1,

            applicableHotels: applicableHotels || [],

            createdBy: creator._id,

            status: status || "active",

            usedCount: 0,

            validFrom: null,
            validTo: null,
          });
        });
      });

      if (couponDocs.length > 0) {
        await Coupon.insertMany(couponDocs);
      }
    }

    return res.status(200).json({
      message: "Plan updated successfully",
      plan,
    });
  } catch (err) {
    console.error("updatePlan", err);

    if (err.code === 11000) {
      return res.status(409).json({
        message: "Duplicate coupon code detected",
      });
    }

    return res.status(500).json({
      message: "Internal server error",
      error: err.message,
    });
  }
};

exports.listPlans = async (req, res) => {
  try {
    const q = req.query || {};
    const page = Math.max(1, parseInt(q.page, 10) || 1);
    const limit = Math.min(100, parseInt(q.limit, 10) || 20);
    const skip = (page - 1) * limit;

   const filter = {};

    if (q.status) filter.status = q.status;
    if (q.name) filter.name = new RegExp(String(q.name), 'i');
    if (q.hotel && mongoose.isValidObjectId(q.hotel)) {
      filter.applicableHotels = q.hotel;
    }

    const [total, plans] = await Promise.all([
      Plan.countDocuments(filter),
      Plan.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
    ]);

    const planIds = plans.map((p) => p._id);
    let couponsByPlan = {};

    if (planIds.length) {
      const coupons = await Coupon.find({ plan: { $in: planIds } }).lean();

      couponsByPlan = coupons.reduce((acc, c) => {
        const pid = String(c.plan);
        if (!acc[pid]) acc[pid] = [];
        acc[pid].push(c);
        return acc;
      }, {});
    }

    const result = plans.map((p) => ({
      ...p,
      coupons: couponsByPlan[String(p._id)] || [],
    }));

    return res.json({
      meta: { total, page, limit },
      plans: result,
    });
  } catch (err) {
    console.error('listPlans', err);
    return res
      .status(500)
      .json({ message: 'Internal server error', error: err.message });
  }
};



/** Get coupon */
exports.getCoupon = async (req, res) => {
    try {
        const { id } = req.params;
        if (!mongoose.isValidObjectId(id)) return res.status(400).json({ message: 'Invalid id' });
        const coupon = await Coupon.findById(id).populate('applicableHotels', 'name address');
        if (!coupon) return res.status(404).json({ message: 'Coupon not found' });
        return res.json({ coupon });
    } catch (err) {
        console.error('getCoupon', err);
        return res.status(500).json({ message: 'Internal server error' });
    }
};

/** List coupons with filters */
exports.listCoupons = async (req, res) => {
    try {
        const q = req.query || {};
        const page = Math.max(1, parseInt(q.page, 10) || 1);
        const limit = Math.min(100, parseInt(q.limit, 10) || 20);
        const skip = (page - 1) * limit;

        const filter = {};
        if (q.status) filter.status = q.status;
        if (q.code) filter.code = String(q.code).toUpperCase();
        if (q.createdBy && mongoose.isValidObjectId(q.createdBy)) filter.createdBy = q.createdBy;
        // optional hotel filter
        if (q.hotel && mongoose.isValidObjectId(q.hotel)) filter.applicableHotels = q.hotel;

        const [total, coupons] = await Promise.all([
            Coupon.countDocuments(filter),
            Coupon.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).populate('createdBy', 'username name role')
        ]);

        return res.json({ meta: { total, page, limit }, coupons });
    } catch (err) {
        console.error('listCoupons', err);
        return res.status(500).json({ message: 'Internal server error' });
    }
};

/** Update coupon */
exports.updatePlan = async (req, res) => {
  try {
    const creator = req.admin;

    if (!creator) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const { id } = req.params;

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ message: "Invalid id" });
    }

    const {
      name,
      title,
      description,
      price,
      validityMonths,
      applicableHotels,
      status,
      benefits,
    } = req.body;

    if (!name || price == null || !validityMonths) {
      return res.status(400).json({
        message: "name, price and validityMonths are required",
      });
    }

    // 1️⃣ Update Plan
    const plan = await Plan.findOneAndUpdate(
      { _id: id, createdBy: creator._id },
      {
        name,
        title,
        description,
        price,
        validityMonths,
        applicableHotels: applicableHotels || [],
        status: status || "active",
      },
      { new: true }
    );

    if (!plan) {
      return res.status(404).json({ message: "Plan not found" });
    }

    // 2️⃣ Delete existing coupons
    await Coupon.deleteMany({ plan: plan._id });

    // 3️⃣ Re-create coupons from benefits
    if (Array.isArray(benefits) && benefits.length > 0) {
      const couponDocs = [];

      benefits.forEach((benefit) => {
        const {
          name: benefitName,
          discountType,
          discountValue,
          redeemPerVisit,
          coupons,
        } = benefit;

        if (!Array.isArray(coupons)) return;

        coupons.forEach((c) => {
          if (!c.code) return;

          const code = String(c.code).trim().toUpperCase();

          couponDocs.push({
            code,

            plan: plan._id,

            benefitName: benefitName || "Benefit", // ⭐ FIX

            title: benefitName || title || name,

            description: benefitName || description || "",

            discountType: discountType || "fixed",

            discountValue: Number(discountValue) || 0,

            redeemPerVisit: Number(redeemPerVisit) || 1,

            applicableHotels: applicableHotels || [],

            createdBy: creator._id,

            status: status || "active",

            usedCount: 0,

            validFrom: null,
            validTo: null,
          });
        });
      });

      if (couponDocs.length > 0) {
        await Coupon.insertMany(couponDocs);
      }
    }

    return res.status(200).json({
      message: "Plan updated successfully",
      plan,
    });

  } catch (err) {
    console.error("updatePlan", err);

    if (err.code === 11000) {
      return res.status(409).json({
        message: "Duplicate coupon code detected",
      });
    }

    return res.status(500).json({
      message: "Internal server error",
      error: err.message,
    });
  }
};

/** Delete coupon */
exports.deleteCoupon = async (req, res) => {
    try {
      const deleter = req.admin;
      if (!deleter) return res.status(401).json({ message: 'Unauthorized' });
  
      const { id } = req.params;
      if (!mongoose.isValidObjectId(id)) return res.status(400).json({ message: 'Invalid id' });
  
      // Build filter: always match id; if deleter is hotel, require createdBy
      const filter = { _id: id };
      if (deleter.role === 'hotel') filter.createdBy = deleter._id;
  
      const result = await Coupon.deleteOne(filter);
  
      if (result.deletedCount === 0) {
        // Could be not found, or forbidden (hotel tried to delete other's coupon)
        // Check existence to provide better message
        const exists = await Coupon.exists({ _id: id });
        if (!exists) return res.status(404).json({ message: 'Coupon not found' });
        return res.status(403).json({ message: 'Forbidden' });
      }
  
      return res.json({ message: 'Coupon deleted' });
    } catch (err) {
      console.error('deleteCoupon', err);
      return res.status(500).json({ message: 'Internal server error' });
    }
  };
  

/**
 * Validate & compute discount for a coupon code
 * body: { code, hotelId, userId, amount }
 */
exports.applyCoupon = async (req, res) => {
    try {
        const { code, hotelId, userId, amount } = req.body;
        if (!code || !hotelId || !amount) return res.status(400).json({ message: 'code, hotelId and amount are required' });

        const coupon = await Coupon.findOne({ code: String(code).toUpperCase() });
        if (!coupon) return res.status(404).json({ message: 'Coupon not found' });

        // Check status and expiry
        const now = new Date();
        if (coupon.status !== 'active' || now < new Date(coupon.validFrom) || now > new Date(coupon.validTo)) {
            return res.status(400).json({ message: 'Coupon not active or expired' });
        }

        // Hotel applicability
        if (coupon.applicableHotels && coupon.applicableHotels.length > 0) {
            const ok = coupon.applicableHotels.some(h => String(h) === String(hotelId));
            if (!ok) return res.status(400).json({ message: 'Coupon not applicable for this hotel' });
        }

        // Usage limits
        if (coupon.usageLimit > 0 && coupon.usedCount >= coupon.usageLimit) {
            return res.status(400).json({ message: 'Coupon usage limit reached' });
        }

        // Per user limit
        if (userId && coupon.perUserLimit > 0) {
            const entry = (coupon.usedBy || []).find(u => String(u.userId) === String(userId));
            if (entry && entry.count >= coupon.perUserLimit) {
                return res.status(400).json({ message: 'You have already used this coupon the maximum allowed times' });
            }
        }

        // Min order value
        if (coupon.minOrderValue && amount < coupon.minOrderValue) {
            return res.status(400).json({ message: `Minimum order value is ${coupon.minOrderValue}` });
        }

        const discount = computeDiscount(coupon, amount);
        const finalAmount = Math.max(0, amount - discount);

        return res.json({
            ok: true,
            coupon: { id: coupon._id, code: coupon.code, discountType: coupon.discountType, discountValue: coupon.discountValue },
            discount, finalAmount
        });
    } catch (err) {
        console.error('applyCoupon', err);
        return res.status(500).json({ message: 'Internal server error' });
    }
};

/**
 * redeemCoupon: mark coupon as used (call after booking is confirmed)
 * body: { couponId, userId }
 */
exports.redeemCoupon = async (req, res) => {
    try {
        const { couponId, userId } = req.body;
        if (!couponId) return res.status(400).json({ message: 'couponId is required' });

        const coupon = await Coupon.findById(couponId);
        if (!coupon) return res.status(404).json({ message: 'Coupon not found' });

        // increment usedCount and user entry
        coupon.usedCount = (coupon.usedCount || 0) + 1;
        if (userId) {
            const existing = (coupon.usedBy || []).find(u => String(u.userId) === String(userId));
            if (existing) {
                existing.count = (existing.count || 0) + 1;
                existing.lastUsedAt = new Date();
            } else {
                coupon.usedBy.push({ userId, count: 1, lastUsedAt: new Date() });
            }
        }
        // optionally expire if usageLimit reached
        if (coupon.usageLimit > 0 && coupon.usedCount >= coupon.usageLimit) {
            coupon.status = 'expired';
        }

        await coupon.save();
        return res.json({ message: 'Coupon redeemed', coupon });
    } catch (err) {
        console.error('redeemCoupon', err);
        return res.status(500).json({ message: 'Internal server error' });
    }
};
