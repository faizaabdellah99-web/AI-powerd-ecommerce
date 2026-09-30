const express = require('express');
const router = express.Router();
const { competitorScraper, getCompetitorHistory } = require('../controllers/competitor.controller');
const { protect } = require('../middleware/auth.middleware');

// ── Competitor Price Scraping Routes ─────────────────────────────────────────────
// POST /api/competitor/scrape - Scrape competitor prices from URLs
router.post('/scrape', protect, competitorScraper);

// GET /api/competitor/history/:product_id - Get competitor price history
router.get('/history/:product_id', protect, getCompetitorHistory);

module.exports = router;
