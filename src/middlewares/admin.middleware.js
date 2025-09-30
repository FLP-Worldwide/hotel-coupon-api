// middlewares/adminAuth.js
const jwt = require('jsonwebtoken');
const Admin = require('../models/Admin');

module.exports = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ message: 'Authorization header missing' });

    const parts = authHeader.split(' ');
    if (parts.length !== 2 || parts[0] !== 'Bearer') return res.status(401).json({ message: 'Invalid authorization format' });

    const token = parts[1];
    let payload;
    try {
      payload = jwt.verify(token, process.env.JWT_ACCESS_SECRET);
    } catch (e) {
      return res.status(401).json({ message: 'Invalid or expired token' });
    }
    // ensure token is admin type (optional)
    if (payload.type !== 'admin') {
      return res.status(403).json({ message: 'Forbidden: admin tokens only' });
    }

    const admin = await Admin.findById(payload.sub);
    if (!admin) return res.status(401).json({ message: 'Admin not found' });

    req.admin = admin;
    req.tokenPayload = payload;
    req.role = payload.role; // 'admin', 'hotel', 'agent'
    next();
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Internal server error' });
  }
};
