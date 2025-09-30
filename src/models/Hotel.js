// models/Hotel.js
const mongoose = require('mongoose');

const hotelSchema = new mongoose.Schema({
    admin : {type: mongoose.Schema.Types.ObjectId, ref: 'Admin', required: true},
    name: { type: String, required: true },                // Hotel name
    description: { type: String },
    price: { type: Number, required: true },                         // Short description
    address: {
        street: { type: String },
        city: { type: String, required: true },
        state: { type: String },
        country: { type: String, default: 'India' },
        postalCode: { type: String }
    },
    contact: {
        phone: { type: String, required: true },
        email: { type: String }
    },
    location: {
        type: { type: String, enum: ['Point'], default: 'Point' }, // For GeoJSON queries
        coordinates: { type: [Number], default: [0, 0] }            // [longitude, latitude]
    },
    amenities: [{ type: String }],                     // e.g., ["wifi", "parking", "pool"]
    images: [{ type: String }],                        // Array of image URLs
    rating: { type: Number, default: 0, min: 0, max: 5 },

    // Owner fields
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Admin',                                     // Link to admin/hotel user
        required: true
    },
    ownerName: { type: String, required: true },        // Store owner’s name (immutable snapshot)

    status: { type: String, enum: ['active', 'inactive'], default: 'active' },
    createdAt: { type: Date, default: Date.now }
});

// Index for geo queries (nearby hotels)
hotelSchema.index({ location: "2dsphere" });

module.exports = mongoose.model('Hotel', hotelSchema);
