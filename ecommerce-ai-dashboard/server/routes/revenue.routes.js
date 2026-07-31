const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth.middleware');
const {
  getMonthlyRevenueBreakdown,
  getDailyRevenueTrends,
} = require('../controllers/revenue.controller');

// ── Revenue APIs ──────────────────────────────────────────────────────────────
router.get('/monthly-breakdown', protect, authorize('admin', 'vendor'), getMonthlyRevenueBreakdown);
router.get('/daily-trends', protect, authorize('admin', 'vendor'), getDailyRevenueTrends);

module.exports = router;