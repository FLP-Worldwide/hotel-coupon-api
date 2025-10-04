// controllers/hotelController.js
const Hotel = require('../models/Hotel');
const Admin = require('../models/Admin'); // to fetch owner info if needed
const mongoose = require('mongoose');
const Coupon = require('../models/Coupon');
const bcrypt = require('bcryptjs');
const { phoneToPasswordRaw } = require('../utils/helper');
const SALT_ROUNDS = 10;


/**
 * Helper: build location object if coords provided
 * coords expected as [lng, lat]
 */
function buildLocation(coords) {
  if (!coords || !Array.isArray(coords) || coords.length !== 2) return undefined;
  return { type: 'Point', coordinates: coords.map(Number) };
}

/**
 * Create Hotel
 * - req.admin must be set by adminAuth middleware
 * - hotel role users create hotels for themselves; ownerName defaults to admin.name
 */
// inside your controller file (e.g. controllers/hotelController.js)
function tryParseJSONField(val) {
  if (!val) return val;
  if (typeof val !== 'string') return val;
  try {
    return JSON.parse(val);
  } catch (e) {
    // not JSON — return the original string
    return val;
  }
}

exports.createHotel = async (req, res) => {
  let hotel; // define upfront for rollback
  try {
    const creator = req.admin;
    if (!creator) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const rawBody = req.body || {};
    const parsedBody = {
      name: rawBody.name,
      description: rawBody.description,
      price: rawBody.price,
      address: tryParseJSONField(rawBody.address) || {},
      contact: tryParseJSONField(rawBody.contact) || {},
      location: tryParseJSONField(rawBody.location) || {},
      amenities: tryParseJSONField(rawBody.amenities) || [],
      images:
        req.files && req.files.length
          ? req.files.map((f) => f.filename)
          : tryParseJSONField(rawBody.images) || [],
      ownerName: rawBody.ownerName,
      status: rawBody.status,
      existingImages: tryParseJSONField(rawBody.existingImages) || [],
    };

    const {
      name,
      description,
      price,
      address = {},
      contact = {},
      location = {},
      amenities = [],
      images = [],
      ownerName,
    } = parsedBody;

    if (!name) {
      return res.status(400).json({ message: "Hotel name is required" });
    }

    if (!contact || !contact.phone) {
      return res
        .status(400)
        .json({ message: "Contact phone is required" });
    }

    const loc = buildLocation(location.coordinates);

    const finalOwnerName =
      ownerName || creator.name || creator.username || creator.email;

    // generate agent password from phone
    const rawPassword = phoneToPasswordRaw(contact.phone);
    console.log(rawPassword);
    const passwordHash = await bcrypt.hash(rawPassword, SALT_ROUNDS);

    const admin = new Admin({
      email: contact.email.toLowerCase(),
      passwordHash,
      name,
      role: "hotel",
    });

    await admin.save();

    // create hotel
    hotel = await Hotel.create({
      admin: admin._id,
      name,
      description,
      price,
      address,
      contact,
      location: loc,
      amenities: Array.isArray(amenities) ? amenities : [],
      images: Array.isArray(images) ? images : [],
      createdBy: creator._id,
      ownerName: finalOwnerName,
      status: "active",
    });



    return res
      .status(201)
      .json({ message: "Hotel created", hotel });
  } catch (err) {
    console.error("createHotel error", err);

    // 🟢 Handle duplicate key error for admin email
    if (err.code === 11000 && err.keyPattern?.email) {
      return res
        .status(400)
        .json({ message: "Admin with this email already exists" });
    }

    // rollback hotel if created
    if (hotel && hotel._id) {
      try {
        await Hotel.findByIdAndDelete(hotel._id);
      } catch (rollbackErr) {
        console.error("Hotel rollback failed", rollbackErr);
      }
    }

    return res.status(500).json({
      message: "Internal server error",
      error: err.message,
    });
  }
};


/**
 * Get a single hotel by id
 * - public or protected depending on router; here we just return hotel if found
 */

exports.getHotel = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) return res.status(400).json({ message: 'Invalid hotel id' });

    // Fetch hotel
    const hotel = await Hotel.findById(id).populate('createdBy', 'email username name role');
    if (!hotel) return res.status(404).json({ message: 'Hotel not found' });

    // Find coupons applicable to this hotel (or global)
    const now = new Date();
    const coupons = await Coupon.find({
      status: 'active',
      validFrom: { $lte: now },
      validTo: { $gte: now },
      $or: [
        { applicableHotels: new mongoose.Types.ObjectId(id) },          // specific to this hotel
        { applicableHotels: { $exists: true, $size: 0 } },          // explicit empty array = global
        { applicableHotels: { $exists: false } }                    // field missing = treat as global
      ]
    })
      .select('code title price description discountType discountValue minOrderValue maxDiscount validFrom validTo usageLimit perUserLimit') // only send needed fields
      .sort({ validTo: 1 }) // soonest expiring first
      .lean();

    return res.json({ success: true, hotel, coupons });
  } catch (err) {
    console.error('getHotel error', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
};


/**
 * List hotels with pagination, filters and optional geo-near
 * Query params supported:
 *  - page, limit, city, state, amenities (comma), status, createdBy
 *  - nearLng, nearLat, nearRadius (in meters)
 */
exports.listHotels = async (req, res) => {
  try {
    const q = req.query || {};
    const page = Math.max(1, parseInt(q.page, 10) || 1);
    const limit = Math.min(100, parseInt(q.limit, 10) || 20);
    const skip = (page - 1) * limit;

    const filter = {};

    if (q.city) filter['address.city'] = q.city;
    if (q.state) filter['address.state'] = q.state;
    if (q.status) filter.status = q.status;
    if (q.createdBy && mongoose.isValidObjectId(q.createdBy)) filter.createdBy = q.createdBy;
    if (q.amenities) {
      const arr = String(q.amenities).split(',').map(s => s.trim()).filter(Boolean);
      if (arr.length) filter.amenities = { $all: arr };
    }

    // geo-near (optional)
    if (q.nearLng && q.nearLat) {
      const lng = Number(q.nearLng);
      const lat = Number(q.nearLat);
      const radius = Number(q.nearRadius || 5000); // default 5km
      filter.location = {
        $nearSphere: {
          $geometry: { type: 'Point', coordinates: [lng, lat] },
          $maxDistance: radius
        }
      };
    }

    const [total, hotels] = await Promise.all([
      Hotel.countDocuments(filter),
      Hotel.find(filter)
        .populate('createdBy', 'username name email role')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
    ]);

    return res.json({
      meta: { total, page, limit, pages: Math.ceil(total / limit) || 1 },
      hotels
    });
  } catch (err) {
    console.error('listHotels error', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

// search hotels by name or description

exports.searchHotels = async (req, res) => {
  try {
    const { query } = req.params;
    if (!query || typeof query !== 'string' || query.trim().length === 0) {
      return res.status(400).json({ message: 'Search query is required' });
    }
    const q = req.query || {};
    const page = Math.max(1, parseInt(q.page, 10) || 1);
    const limit = Math.min(100, parseInt(q.limit, 10) || 20);
    const skip = (page - 1) * limit;
    const searchRegex = new RegExp(query.trim(), 'i'); // case-insensitive
    const filter = {
      $or: [
        { name: searchRegex },
        { description: searchRegex }
      ]
    };
    const [total, hotels] = await Promise.all([
      Hotel.countDocuments(filter),
      Hotel.find(filter)
        .populate('createdBy', 'username name email role')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
    ]);
    return res.json({
      meta: { total, page, limit, pages: Math.ceil(total / limit) || 1 },
      hotels
    });
  } catch (err) {
    console.error('searchHotels error', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
};




exports.listHotelsAdmin = async (req, res) => {
  try {
    const q = req.query || {};
    const page = Math.max(1, parseInt(q.page, 10) || 1);
    const limit = Math.min(100, parseInt(q.limit, 10) || 20);
    const skip = (page - 1) * limit;

    const filter = {};
    // ✅ Role based filter
    if (req.role === 'hotel') {
      filter.admin = req.admin._id; // sirf apne hotels

    }
    // agar role 'admin' hai -> koi filter nahi, sab hotels aayenge

    if (q.city) filter['address.city'] = q.city;
    if (q.state) filter['address.state'] = q.state;
    if (q.status) filter.status = q.status;

    if (q.amenities) {
      const arr = String(q.amenities).split(',').map(s => s.trim()).filter(Boolean);
      if (arr.length) filter.amenities = { $all: arr };
    }

    // geo-near (optional)
    if (q.nearLng && q.nearLat) {
      const lng = Number(q.nearLng);
      const lat = Number(q.nearLat);
      const radius = Number(q.nearRadius || 5000); // default 5km
      filter.location = {
        $nearSphere: {
          $geometry: { type: 'Point', coordinates: [lng, lat] },
          $maxDistance: radius
        }
      };
    }

    const [total, hotels] = await Promise.all([
      Hotel.countDocuments(filter),
      Hotel.find(filter)
        .populate('createdBy', 'username name email role')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
    ]);

    return res.json({
      meta: { total, page, limit, pages: Math.ceil(total / limit) || 1 },
      hotels
    });
  } catch (err) {
    console.error('listHotels error', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

/**
 * Update hotel
 * - Only 'admin' role can update any hotel
 * - 'hotel' role can update only hotels where createdBy === req.admin._id
 */
exports.updateHotel = async (req, res) => {
  try {
    const updater = req.admin;
    if (!updater) return res.status(401).json({ message: 'Unauthorized' });

    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) return res.status(400).json({ message: 'Invalid hotel id' });

    const hotel = await Hotel.findById(id);
    if (!hotel) return res.status(404).json({ message: 'Hotel not found' });

    // permission check
    if (updater.role !== 'admin' && String(hotel.createdBy) !== String(updater._id)) {
      return res.status(403).json({ message: 'Forbidden: you cannot update this hotel' });
    }

    // Parse possible JSON-string fields (multipart/form-data sends JSON as strings)
    const rawBody = req.body || {};
    const parsedBody = {
      name: rawBody.name,
      description: rawBody.description,
      price: rawBody.price,
      address: tryParseJSONField(rawBody.address),
      contact: tryParseJSONField(rawBody.contact),
      location: tryParseJSONField(rawBody.location),
      amenities: tryParseJSONField(rawBody.amenities),
      existingImages: tryParseJSONField(rawBody.existingImages), // array of urls or filenames client wants to keep
      ownerName: rawBody.ownerName,
      status: rawBody.status,
    };

    // Allowed update keys (whitelist)
    const allowed = ['name', 'description', 'address', 'contact', 'amenities', 'images', 'status', 'ownerName'];

    // Apply simple fields (but for address/contact/etc we merge carefully)
    // 1) Name/description/status/ownerName
    ['name', 'description', 'price', 'status', 'ownerName'].forEach(field => {
      if (parsedBody[field] !== undefined) hotel[field] = parsedBody[field];
    });

    // 2) Address (merge)
    if (parsedBody.address !== undefined) {
      // if address is a string or object; tryParseJSONField already handled JSON strings
      hotel.address = typeof parsedBody.address === 'object' && parsedBody.address !== null
        ? { ...hotel.address, ...parsedBody.address }
        : parsedBody.address; // fallback: replace
    }

    // 3) Contact (merge)
    if (parsedBody.contact !== undefined) {
      const incomingContact = typeof parsedBody.contact === 'object' && parsedBody.contact !== null
        ? parsedBody.contact
        : parsedBody.contact; // if it's a string, leave it (but ideally it's parsed)
      hotel.contact = { ...(hotel.contact || {}), ...(incomingContact || {}) };
      // Validate phone if contact was provided and now missing
      if (parsedBody.contact && !hotel.contact.phone) {
        return res.status(400).json({ message: 'Contact phone is required' });
      }
    }

    // If client didn't provide contact but hotel has no phone at all -> require phone
    if (!parsedBody.contact && (!hotel.contact || !hotel.contact.phone)) {
      // if there is no phone on existing record, block updates that would leave it missing
      return res.status(400).json({ message: 'Contact phone is required (existing record missing phone)' });
    }

    // 4) Amenities
    if (parsedBody.amenities !== undefined) {
      // ensure array
      hotel.amenities = Array.isArray(parsedBody.amenities)
        ? parsedBody.amenities
        : (typeof parsedBody.amenities === 'string' ? tryParseJSONField(parsedBody.amenities) : parsedBody.amenities);
      if (!Array.isArray(hotel.amenities)) hotel.amenities = [];
    }

    // 5) Location: support { coordinates: [lng, lat] } or coordinates array string
    if (parsedBody.location !== undefined) {
      let coords = null;
      if (Array.isArray(parsedBody.location.coordinates)) {
        coords = parsedBody.location.coordinates;
      } else if (Array.isArray(parsedBody.location)) {
        coords = parsedBody.location;
      } else if (typeof parsedBody.location === 'string') {
        // try parse stringified coordinates or object
        const locParsed = tryParseJSONField(parsedBody.location);
        if (locParsed && Array.isArray(locParsed.coordinates)) coords = locParsed.coordinates;
        else if (Array.isArray(locParsed)) coords = locParsed;
      }
      if (coords && Array.isArray(coords)) {
        const loc = buildLocation(coords);
        if (loc) hotel.location = loc;
      }
    }

    // 6) Images: combine existingImages from body (URLs/filenames client wants to keep) + newly uploaded files in req.files
    // multer will populate req.files depending on your middleware (array/single). We'll support both.
    const uploadedFiles = (req.files && Array.isArray(req.files)) ? req.files : (req.file ? [req.file] : []);
    const uploadedFilenames = uploadedFiles.map(f => f.filename).filter(Boolean);

    // existingImages expected to be array of urls or filenames client wants to keep
    const keepExisting = Array.isArray(parsedBody.existingImages) ? parsedBody.existingImages : [];

    // If parsedBody.images is provided as JSON array (legacy), prefer that as explicit set
    let finalImages = null;
    if (parsedBody.images !== undefined) {
      // parsedBody.images might be array or string; try parse
      const imgVal = tryParseJSONField(parsedBody.images);
      if (Array.isArray(imgVal)) finalImages = imgVal;
    }

    if (finalImages === null) {
      // otherwise assemble: kept existing + new uploaded files
      finalImages = [...(keepExisting || []), ...(uploadedFilenames || [])];
    }

    // If client explicitly provided empty existingImages and no new files, we'll clear images
    if (Array.isArray(parsedBody.existingImages) && parsedBody.existingImages.length === 0 && uploadedFilenames.length === 0 && parsedBody.images === undefined) {
      // explicit intent to remove all existing images
      hotel.images = [];
    } else if (finalImages) {
      hotel.images = finalImages;
    }

    // Save
    await hotel.save();

    return res.json({ message: 'Hotel updated', hotel });
  } catch (err) {
    return res.status(500).json({ message: 'Internal server error', error: err.message });
  }
};

/**
 * Delete hotel
 * - admin role can delete any
 * - hotel role can delete only own hotels
 * - here we perform hard delete; change to soft-delete if you prefer
 */
exports.deleteHotel = async (req, res) => {
  try {
    const deleter = req.admin;
    if (!deleter) return res.status(401).json({ message: 'Unauthorized' });

    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) return res.status(400).json({ message: 'Invalid hotel id' });

    const hotel = await Hotel.findById(id);
    if (!hotel) return res.status(404).json({ message: 'Hotel not found' });

    if (deleter.role !== 'admin' && String(hotel.createdBy) !== String(deleter._id)) {
      return res.status(403).json({ message: 'Forbidden: you cannot delete this hotel' });
    }

    await Hotel.deleteOne({ _id: id });

    return res.json({ message: 'Hotel deleted' });
  } catch (err) {
    console.error('deleteHotel error', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
};
