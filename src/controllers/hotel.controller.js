// controllers/hotelController.js
const Hotel = require('../models/Hotel');
const Admin = require('../models/Admin'); // to fetch owner info if needed
const mongoose = require('mongoose');

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
exports.createHotel = async (req, res) => {
  try {
    const creator = req.admin;
    if (!creator) return res.status(401).json({ message: 'Unauthorized' });

    const {
      name, description, address = {}, contact = {},
      location = {}, amenities = [], images = [], ownerName
    } = req.body;

    if (!name) return res.status(400).json({ message: 'Hotel name is required' });
    if (!contact.phone) return res.status(400).json({ message: 'Contact phone is required' });

    const loc = buildLocation(location.coordinates);

    // Use provided ownerName or fallback to admin's name
    const finalOwnerName = ownerName || creator.name || `${creator.username || creator.email}`;

    const hotel = await Hotel.create({
      name,
      description,
      address,
      contact,
      location: loc,
      amenities: Array.isArray(amenities) ? amenities : [],
      images: Array.isArray(images) ? images : [],
      createdBy: creator._id,
      ownerName: finalOwnerName,
      status: 'active'
    });

    return res.status(201).json({ message: 'Hotel created', hotel });
  } catch (err) {
    console.error('createHotel error', err);
    return res.status(500).json({ message: 'Internal server error', error: err.message });
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

    const hotel = await Hotel.findById(id).populate('createdBy', 'email username name role');
    if (!hotel) return res.status(404).json({ message: 'Hotel not found' });

    return res.json({ hotel });
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

    // allowed updates (whitelist)
    const allowed = ['name','description','address','contact','amenities','images','status','ownerName'];
    allowed.forEach(field => {
      if (req.body[field] !== undefined) hotel[field] = req.body[field];
    });

    // location special handling
    if (req.body.location && Array.isArray(req.body.location.coordinates)) {
      const loc = buildLocation(req.body.location.coordinates);
      if (loc) hotel.location = loc;
    }

    await hotel.save();

    return res.json({ message: 'Hotel updated', hotel });
  } catch (err) {
    console.error('updateHotel error', err);
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
