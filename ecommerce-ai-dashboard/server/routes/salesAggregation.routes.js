const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth.middleware');
const {
  getCategorySales,
  getLocationSales,
  getSalesAIInsights,
} = require('../controllers/salesAggregation.controller');

// ── Sales Aggregation APIs ──────────────────────────────────────────────────
router.get('/category', protect, authorize('admin', 'vendor'), getCategorySales);
router.get('/location', protect, authorize('admin', 'vendor'), getLocationSales);
router.get('/ai-insights', protect, authorize('admin', 'vendor'), getSalesAIInsights);

module.exports = router;