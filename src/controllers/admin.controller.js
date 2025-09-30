// controllers/adminController.js
const bcrypt = require('bcryptjs');
const Admin = require('../models/Admin');
const {
  createAccessToken,
  createRefreshToken,
  verifyRefreshToken,
} = require('../utils/jwt'); // your helper (create/verify)

// Helper to set refresh cookie
function setRefreshCookie(res, token) {
  const days = parseInt(process.env.REFRESH_TOKEN_EXPIRES_DAYS || '7', 10);
  const maxAge = Number.isFinite(days) ? days * 24 * 60 * 60 * 1000 : 7 * 24 * 60 * 60 * 1000;
  // res.cookie('refreshToken', token, {
  //   httpOnly: true,
  //   secure: process.env.NODE_ENV === 'production',
  //   sameSite: process.env.REFRESH_COOKIE_SAMESITE || 'lax',
  //   path: process.env.REFRESH_COOKIE_PATH || '/api/admin',
  //   maxAge,
  // });

  res.cookie("refreshToken", token, {
    httpOnly: true,
    secure: false,          // allow localhost
    sameSite: "none",       // allow cross-site requests (different ports)
    path: "/api/admin",
    maxAge,
  });
}

// Helper to clear refresh cookie
function clearRefreshCookie(res) {
  res.clearCookie('refreshToken', { path: process.env.REFRESH_COOKIE_PATH || '/api/auth' });
}

const SALT_ROUNDS = 10;

// Register (optional) — use only to bootstrap or create admins via CLI / protected route
exports.register = async (req, res) => {
  try {
    const { email, password, name, username } = req.body;
    if (!email || !password) return res.status(400).json({ message: 'email and password required' });

    const exists = await Admin.findOne({ email: email.toLowerCase() });
    if (exists) return res.status(400).json({ error: "Admin already exists" });
    
    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
    const admin = await Admin.create({ email: email.toLowerCase(), username, passwordHash, name });
    return res.status(201).json({ message: 'Admin created', admin: { id: admin._id, email: admin.email } });
  } catch (err) {
    console.error('register error', err);
    return res.status(500).json({ message: 'Internal server error', error: err.message });
  }
};

// Login
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password)
      return res.status(400).json({ message: 'Email and password required' });

    // lookup by email only
    const admin = await Admin.findOne({ email: email.toLowerCase() });
    if (!admin) return res.status(401).json({ message: 'Invalid credentials' });

    // compare password
    const ok = await bcrypt.compare(password, admin.passwordHash);
    if (!ok) return res.status(401).json({ message: 'Invalid credentials' });

    // payload for token
    const payload = { sub: admin._id.toString(), role: admin.role, type: 'admin' };

    // create tokens
    const accessToken = createAccessToken(payload);
    const refreshToken = createRefreshToken(payload);

    // set refresh token as HttpOnly cookie
    setRefreshCookie(res, refreshToken);

    return res.json({
      message: 'Login successful',
      data: {
        accessToken,
        admin: {
          id: admin._id,
          email: admin.email,
          name: admin.name,
          role: admin.role,
        },
      },
    });
  } catch (err) {
    console.error('login error', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
};


// Refresh - read refresh cookie, verify, rotate, return new access token
exports.refresh = async (req, res) => {
  console.log('Refresh token request received',req.cookies);
  try {
    const token = req.cookies?.refreshToken;
    if (!token) return res.status(401).json({ message: 'No refresh token' });

    let payload;
    try {
      payload = verifyRefreshToken(token);
    } catch (err) {
      console.warn('Invalid refresh token', err && err.message);
      clearRefreshCookie(res);
      return res.status(401).json({ message: 'Invalid refresh token' });
    }

    // Optionally: you may fetch the admin to ensure still exists/active
    const admin = await Admin.findById(payload.sub);
    if (!admin) {
      clearRefreshCookie(res);
      return res.status(401).json({ message: 'Invalid token: user not found' });
    }

    // Issue new access token
    const newAccessToken = createAccessToken({ sub: payload.sub, role: payload.role, type: payload.type });

    // Rotate refresh token: issue new refresh token and set cookie
    const newRefreshToken = createRefreshToken({ sub: payload.sub, role: payload.role, type: payload.type });
    setRefreshCookie(res, newRefreshToken);

    return res.json({ accessToken: newAccessToken });
  } catch (err) {
    console.error('refresh error', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

// Get admin profile (expects middleware that sets req.admin)
exports.me = async (req, res) => {
  try {
    const admin = req.admin;
    if (!admin) return res.status(401).json({ message: 'Unauthorized' });

    return res.json({
      id: admin._id,
      email: admin.email,
      username: admin.username,
      name: admin.name,
      role: admin.role,
    });
  } catch (err) {
    console.error('me error', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

// Logout - clear refresh cookie
exports.logout = async (req, res) => {
  try {
    clearRefreshCookie(res);
    // If you store refresh tokens server-side, revoke here.
    return res.json({ message: 'Logged out' });
  } catch (err) {
    console.error('logout error', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
};
