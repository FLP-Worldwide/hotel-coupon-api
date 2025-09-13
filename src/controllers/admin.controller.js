// controllers/adminController.js
const bcrypt = require('bcryptjs');
const Admin = require('../models/Admin');
const { createAccessToken, createRefreshToken, verifyRefreshToken } = require('../utils/jwt');

const SALT_ROUNDS = 10;

// Register (optional) — use only to bootstrap or create admins via CLI / protected route
exports.register = async (req, res) => {
  try {
    const { email, password, name } = req.body;
    if (!email || !password) return res.status(400).json({ message: 'email, username and password required' });

    const exists = await Admin.findOne({ $or: [{ email }] });
    if (exists) return res.status(409).json({ message: 'Admin with email or username already exists' });

    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
    const admin = await Admin.create({ email, passwordHash, name });
    return res.status(201).json({ message: 'Admin created', admin: { id: admin._id, email: admin.email } });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Internal server error', error: err.message });
  }
};

// Login
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ message: 'email and password required' });

    const admin = await Admin.findOne({
      $or: [{ email: email.toLowerCase() }, { username: email }]
    });
    if (!admin) return res.status(401).json({ message: 'Invalid credentials' });

    const ok = await bcrypt.compare(password, admin.passwordHash);
    if (!ok) return res.status(401).json({ message: 'Invalid credentials' });

    // payload includes role so admin-only middleware can check
    const payload = { sub: admin._id.toString(), role: admin.role, type: 'admin' };
    const accessToken = createAccessToken(payload);
    const refreshToken = createRefreshToken(payload);


    return res.json({
        message: 'Login successful',
        data: {
          accessToken,
          refreshToken,
          admin: { id: admin._id, email: admin.email, username: admin.username, name: admin.name, role: admin.role }
        }
    });

  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

// Get admin profile
exports.me = async (req, res) => {
  try {
    const admin = req.admin;
    return res.json({ id: admin._id, email: admin.email, username: admin.username, name: admin.name, role: admin.role });
  } catch (err) {
    return res.status(500).json({ message: 'Internal server error' });
  }
};

// Logout - if you store refresh tokens for admins, implement invalidation here
exports.logout = async (req, res) => {
  // If using stored refresh tokens: remove them here
  return res.json({ message: 'Logged out (client should delete tokens)' });
};
