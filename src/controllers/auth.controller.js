const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const Otp = require('../models/Otp');
const { createAccessToken, createRefreshToken, verifyRefreshToken } = require('../utils/jwt');

const sendEmailOtp = require("../utils/sendEmailOtp");

const OTP_LENGTH = 6;
const OTP_EXPIRES_MIN = 5; // minutes
const MAX_VERIFY_ATTEMPTS = 5;
const RESEND_LOCK_MIN = 1; // minutes between resend allowed

function generateOtp() {
  return Math.floor(100000 + Math.random() * 900000).toString(); // 6-digit
}

function hashOtp(otp) {
  // return bcrypt hash (safe)
  const salt = bcrypt.genSaltSync(8);
  return bcrypt.hashSync(otp, salt);
}

exports.sendEmailOtpController = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ message: "Email is required" });
    }

    const normalizedEmail = email.trim().toLowerCase();

    const otp = generateOtp();
    const otpHash = hashOtp(otp);
    const expiresAt = new Date(Date.now() + OTP_EXPIRES_MIN * 60 * 1000);

    // ✅ Save OTP (only email)
    await Otp.create({
      email: normalizedEmail,
      otpHash,
      expiresAt,
    });

    // ✅ Find or create user
    let user = await User.findOne({ email: normalizedEmail });

    if (!user) {
      user = await User.create({
        email: normalizedEmail,
        isVerified: false,
      });
    }

    // ✅ Send Email
    await sendEmailOtp(normalizedEmail, otp);

    return res.json({
      message: "Email OTP sent",
      otp, // ⚠️ remove in production
    });

  } catch (err) {
    console.error("Email OTP Error:", err);
    return res.status(500).json({
      message: "Internal server error",
      error: err.message,
    });
  }
};


exports.sendOtp = async (req, res) => {
  try {
    const { phone, email } = req.body;
    if (!phone) return res.status(400).json({ message: 'Phone number is required' });

    const normalizedPhone = phone.trim();
    const normalizedEmail = email ? email.trim().toLowerCase() : null;

    const otp = generateOtp();
    const otpHash = hashOtp(otp);
    const expiresAt = new Date(Date.now() + OTP_EXPIRES_MIN * 60 * 1000);

    // Save OTP (bind to phone, store email if available)
    await Otp.create({ phone: normalizedPhone, email: normalizedEmail, otpHash, expiresAt });

    // Create user if not exists
    let user = await User.findOne({ phone: normalizedPhone });
    if (!user) {
      user = await User.create({ phone: normalizedPhone, email: normalizedEmail, isVerified: false });
    } else if (normalizedEmail && !user.email) {
      user.email = normalizedEmail; // attach email later if user didn’t have
      await user.save();
    }

    // Send OTP SMS
    // await sendSmsOtp(normalizedPhone, otp);

    console.log(`OTP for ${normalizedPhone}: ${otp}`); // For testing, log OTP to console

    return res.json({ message: 'OTP sent', otp: otp }); // include OTP in response for testing (remove in production)
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Internal server error', error: err.message });
  }
};


exports.verifyOtp = async (req, res) => {
  try {
    const { email, otp } = req.body;
 
    if (!email || !otp) return res.status(400).json({ message: 'Email and OTP are required' });

    const normalizedEmail = email.trim().toLowerCase();

    const record = await Otp.findOne({ email: normalizedEmail }).sort({ createdAt: -1 });
    if (!record) return res.status(400).json({ message: 'No OTP request found for this email' });

    if (record.attempts >= MAX_VERIFY_ATTEMPTS) {
      return res.status(429).json({ message: 'Too many attempts. Request a new OTP.' });
    }

    if (new Date() > new Date(record.expiresAt)) {
      return res.status(400).json({ message: 'OTP expired, request a new one' });
    }

    const match = await bcrypt.compare(otp, record.otpHash);
    if (!match) {
      record.attempts += 1;
      await record.save();
      return res.status(400).json({ message: 'Invalid OTP' });
    }

    // OTP matched → verify user
    let user = await User.findOne({ email: normalizedEmail });
    if (!user) {
      user = await User.create({ email: normalizedEmail, isVerified: true });
    } else {
      user.isVerified = true;
      await user.save();
    }

    // cleanup OTP
    await Otp.deleteMany({ email: normalizedEmail });

    // issue tokens
    const payload = { sub: user._id.toString() };
    const accessToken = createAccessToken(payload);
    const refreshToken = createRefreshToken(payload);

    user.refreshTokens.push({ token: refreshToken });
    await user.save();

    return res.json({
      message: 'OTP verified',
      data: {
        accessToken,
        refreshToken,
        user: {
          id: user._id,
          phone: user.phone,
          email: user.email,
          isVerified: user.isVerified
        }
      }
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Internal server error', error: err.message });
  }
};


exports.refresh = async (req, res) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) return res.status(400).json({ message: 'refreshToken required' });

    let payload;
    try {
      payload = verifyRefreshToken(refreshToken);
    } catch (e) {
      return res.status(401).json({ message: 'Invalid refresh token' });
    }

    const user = await User.findById(payload.sub);
    if (!user) return res.status(401).json({ message: 'User not found' });

    const stored = user.refreshTokens.find(r => r.token === refreshToken);
    if (!stored) return res.status(401).json({ message: 'Refresh token not recognized' });

    // issue new access token (and optional new refresh token rotation)
    const newAccess = createAccessToken({ sub: user._id.toString() });
    return res.json({ accessToken: newAccess });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

exports.logout = async (req, res) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) return res.status(400).json({ message: 'refreshToken required' });

    // remove refresh token from DB (logout)
    await User.updateOne({ 'refreshTokens.token': refreshToken }, { $pull: { refreshTokens: { token: refreshToken } } });
    return res.json({ message: 'Logged out' });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Internal server error' });
  }
};


// Get profile (protected)
exports.getProfile = async (req, res) => {
  try {
    const user = req.user; // from authMiddleware
    return res.json({
      id: user._id,
      email: user.email,
      phone: user.phone,
      name: user.name,
      avatar: user.avatar,
      isVerified: user.isVerified
    });
  } catch (err) {
    return res.status(500).json({ message: 'Internal server error' });
  }
};

// Update profile (protected)
exports.updateProfile = async (req, res) => {
  try {
    const user = req.user; // from authMiddleware
    const { name, email } = req.body;

    if (name !== undefined) user.name = name;
    if (email !== undefined) user.email = email;

    await user.save();

    return res.json({
      message: 'Profile updated successfully',
      user: {
        id: user._id,
        email: user.email,
        phone: user.phone,
        name: user.name,
        isVerified: user.isVerified
      }
    });
  } catch (err) {
    return res.status(500).json({ message: 'Internal server error', error: err.message });
  }
};
