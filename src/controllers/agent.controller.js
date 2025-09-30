// controllers/agent.controller.js
const mongoose = require('mongoose');
const Admin = require('../models/Admin');
const Agent = require('../models/Agent');
const bcrypt = require('bcryptjs');
const SALT_ROUNDS = 10;
// Create Agent
exports.createAgent = async (req, res) => {
    let savedAgent = null;

    try {
        // 1. Create agent
        const agent = new Agent(req.body);
        savedAgent = await agent.save();

        // 2. Hash agent code for password
        const passwordHash = await bcrypt.hash(savedAgent.code, SALT_ROUNDS);

        // 3. Create admin linked to agent
        const admin = new Admin({
            email: savedAgent.email.toLowerCase(),
            passwordHash,
            name: savedAgent.name,
            role: 'agent',
        });

        await admin.save();

        res.status(201).json(savedAgent);

    } catch (err) {
        // 🟢 Handle duplicate key error for admin email
    if (err.code === 11000 && err.keyPattern?.email) {
        return res
          .status(400)
          .json({ message: "Agent with this email already exists" });
      }
        // Rollback agent if admin creation fails
        if (savedAgent) {
            await Agent.findByIdAndDelete(savedAgent._id);
        }
        res.status(400).json({ error: err.message });
    }
}

// Get all Agents
exports.getAgents = async (req, res) => {
    try {
        const agents = await Agent.find().sort({ createdAt: -1 }).lean();
        res.json({ data: agents, total: agents.length }); // <-- frontend ke liye compatible
    } catch (err) {
        res.status(500).json({ message: 'Server error' });
    }
};


// Get single Agent
exports.getAgentById = async (req, res) => {
    try {
        const agent = await Agent.findById(req.params.id);
        if (!agent) return res.status(404).json({ error: 'Agent not found' });
        res.json(agent);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// Update Agent
exports.updateAgent = async (req, res) => {
    try {
        const agent = await Agent.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
        if (!agent) return res.status(404).json({ error: 'Agent not found' });
        res.json(agent);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
};

// Delete Agent
exports.deleteAgent = async (req, res) => {
    try {
        const agent = await Agent.findByIdAndDelete(req.params.id);
        if (!agent) return res.status(404).json({ error: 'Agent not found' });
        res.json({ message: 'Agent deleted successfully' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};
