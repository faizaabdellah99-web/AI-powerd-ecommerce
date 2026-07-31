const jwt = require('jsonwebtoken');
const { validationResult } = require('express-validator');
const User = require('../models/User.model');
const Order = require('../models/Order.model');
const { getSegmentDetails, calculateStats, getFavouriteCategories, generateRecommendations } = require('../utils/segmentation');

// Generate JWT
const signToken = (id) =>
  jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || '7d' });

/**
 * Enrich user object with segment data (for customer role)
 */
async function enrichWithSegment(user) {
  if (user.role !== 'customer') {
    const userObj = user.toObject ? user.toObject() : user;
    return { user: userObj };
  }

  const userObj = user.toObject ? user.toObject() : user;
  const orders = await Order.find({ customer: user._id }).sort({ createdAt: -1 });
  const stats = calculateStats(orders);
  const segment = getSegmentDetails(stats);
  const categories = getFavouriteCategories(orders);
  const recommendations = generateRecommendations(segment, stats, categories);

  return {
    user: {
      ...userObj,
      customerSegment: segment.key,
      customerDescription: segment.description,
      segmentDetails: segment,
      orderStats: stats,
      favouriteCategories: categories,
      recommendations,
    },
  };
}

// POST /api/auth/register
exports.register = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  try {
    const { name, email, password, role, vendorCode } = req.body;

    // ── Role security ────────────────────────────────────────────────────────
    if (role === 'admin') {
      return res.status(403).json({ message: 'Admin accounts cannot be created via registration. Contact your system administrator.' });
    }

    const VENDOR_INVITE_CODE = process.env.VENDOR_INVITE_CODE || 'VENDOR2025';
    if (role === 'vendor') {
      if (!vendorCode || vendorCode.trim() !== VENDOR_INVITE_CODE) {
        return res.status(403).json({ message: 'Invalid vendor invite code. Please contact an administrator to get access.' });
      }
    }

    const allowedRole = ['customer', 'vendor'].includes(role) ? role : 'customer';

    const exists = await User.findOne({ email });
    if (exists) return res.status(400).json({ message: 'Email already registered' });

    const user  = await User.create({ name, email, password, role: allowedRole });
    const token = signToken(user._id);

    // Enrich with segment data for customers
    const enriched = await enrichWithSegment(user);

    res.status(201).json({
      token,
      ...enriched,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// POST /api/auth/login
exports.login = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email }).select('+password');
    if (!user || !(await user.matchPassword(password)))
      return res.status(401).json({ message: 'Invalid credentials' });

    const token = signToken(user._id);

    // Enrich with segment data for customers
    const enriched = await enrichWithSegment(user);

    res.json({
      token,
      ...enriched,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// GET /api/auth/me
exports.getMe = async (req, res) => {
  try {
    const enriched = await enrichWithSegment(req.user);
    res.json(enriched);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// POST /api/auth/logout
exports.logout = async (req, res) => {
  res.json({ message: 'Logged out successfully' });
};