// models/Agent.js
const mongoose = require('mongoose');

const agentSchema = new mongoose.Schema({
    name: { type: String, required: true },
    adminId: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin'},
    email: { type: String, required: true, unique: true, lowercase: true, index: true },
    address: { type: String },
    code: { type: String, required: true, unique: true },
}, { timestamps: true });

// Auto-generate unique agent code before saving
agentSchema.pre('validate', async function (next) {
    if (!this.code) {
        const rand = () => Math.floor(100000 + Math.random() * 900000).toString(); // 6-digit number
        let newCode, exists;

        // retry until unique code is generated
        do {
            newCode = `AGT-${rand()}`;
            exists = await mongoose.models.Agent.findOne({ code: newCode });
        } while (exists);

        this.code = newCode;
    }
    next();
});

module.exports = mongoose.model('Agent', agentSchema);
