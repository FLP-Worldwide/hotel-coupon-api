const mongoose = require("mongoose");

const bookingSchema = new mongoose.Schema(
    {
        user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
        hotel: { type: mongoose.Schema.Types.ObjectId, ref: "Hotel", required: true },
        coupon: { type: mongoose.Schema.Types.ObjectId, ref: "Coupon", required: true },
        agent: { type: mongoose.Schema.Types.ObjectId, ref: "Agent" }, // optional
        rfercode: { type: String }, // optional
        qty: { type: Number, required: true, default: 1 },
        price: { type: Number, required: true }, // price per coupon
        total: { type: Number, required: true },

        status: {
            type: String,
            enum: ["pending", "paid", "cancelled"],
            default: "pending",
        },
    },
    { timestamps: true }
);

module.exports = mongoose.model("Booking", bookingSchema);
