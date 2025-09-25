// controllers/agent.controller.js
const Agent = require('../models/Agent');

// Create Agent
exports.createAgent = async (req, res) => {
    try {
        const agent = new Agent(req.body); // code auto-generates
        await agent.save();
        res.status(201).json(agent);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
};

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
