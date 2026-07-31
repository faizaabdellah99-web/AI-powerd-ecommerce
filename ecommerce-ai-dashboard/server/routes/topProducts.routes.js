const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth.middleware');
const {
  getTopProducts,
  getTopProductsAIInsights,
} = require('../controllers/topProducts.controller');

// ── Top Products APIs ─────────────────────────────────────────────────────────
router.get('/', protect, authorize('admin', 'vendor'), getTopProducts);
router.get('/ai-insights', protect, authorize('admin', 'vendor'), getTopProductsAIInsights);

module.exports = router;