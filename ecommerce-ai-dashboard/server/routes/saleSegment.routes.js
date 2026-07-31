const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth.middleware');
const { getSaleSegmentOverview, getCategoryDetail, getSaleRecommendations } = require('../controllers/saleSegment.controller');

// GET /api/sale-segments/overview — Sale segment overview (admin/vendor)
router.get('/overview', protect, authorize('admin', 'vendor'), getSaleSegmentOverview);

// GET /api/sale-segments/category/:category — Category detail analysis
router.get('/category/:category', protect, authorize('admin', 'vendor'), getCategoryDetail);

// GET /api/sale-segments/recommendations — AI recommendations for sales segments
router.get('/recommendations', protect, authorize('admin', 'vendor'), getSaleRecommendations);

module.exports = router;