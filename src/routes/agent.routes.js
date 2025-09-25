// routes/agent.routes.js
const express = require('express');
const router = express.Router();
const agentCtrl = require('../controllers/agent.controller');

const adminAuth = require('../middlewares/admin.middleware');


router.post('/', adminAuth, agentCtrl.createAgent);
router.get('/', adminAuth, agentCtrl.getAgents);
router.get('/:id', adminAuth, agentCtrl.getAgentById);
router.put('/:id', adminAuth, agentCtrl.updateAgent);
router.delete('/:id', adminAuth, agentCtrl.deleteAgent);

module.exports = router;
