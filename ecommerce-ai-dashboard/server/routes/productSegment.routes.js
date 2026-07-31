const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth.middleware');
const { 
  getProductSegmentOverview, 
  getProductsBySegment, 
  getProductSegmentRecommendations 
} = require('../controllers/productSegment.controller');

// GET /api/product-segments/overview — Enhanced product segment overview (admin/vendor)
router.get('/overview', protect, authorize('admin', 'vendor'), getProductSegmentOverview);

// GET /api/product-segments/recommendations — AI recommendations for product segments
router.get('/recommendations', protect, authorize('admin', 'vendor'), getProductSegmentRecommendations);

// GET /api/product-segments/:segment — Products in a specific segment
router.get('/:segment', protect, authorize('admin', 'vendor'), getProductsBySegment);

module.exports = router;