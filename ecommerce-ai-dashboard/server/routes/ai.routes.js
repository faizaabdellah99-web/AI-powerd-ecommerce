const express = require('express');
const multer  = require('multer');
const axios   = require('axios');

const router = express.Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits:  { fileSize: 10 * 1024 * 1024 }, // 10 MB
});

const { protect, authorize } = require('../middleware/auth.middleware');
const {
  generateDescription,
  demandForecastAI,
  smartPricingAI,
  reorderPredictionAI,
  aiChat,
  detectProduct,
  analyzeProductImage,
} = require('../controllers/ai.controller');

// ── Product AI ────────────────────────────────────────────────────────────────
router.post('/generate-description', protect, authorize('admin','vendor'), generateDescription);
router.post('/demand-forecast',      protect, authorize('admin','vendor'), demandForecastAI);
router.post('/smart-pricing',        protect, authorize('admin','vendor'), smartPricingAI);
router.post('/reorder-prediction',   protect,                              reorderPredictionAI);

// ── AI Chat ───────────────────────────────────────────────────────────────────
router.post('/chat',           protect, aiChat);

// ── Smart Fill & Vision ───────────────────────────────────────────────────────
router.post('/detect-product', protect, detectProduct);
router.post('/analyze-image',  protect, upload.single('image'), analyzeProductImage);

// ── Visual Search (proxied to Python FastAPI) ─────────────────────────────────
const AI_URL = process.env.AI_SERVICE_URL || 'http://localhost:8001';

router.post('/visual-search', protect, upload.single('image'), async (req, res) => {
  try {
    const FormData = require('form-data');
    const form = new FormData();
    form.append('image', req.file.buffer, {
      filename:    req.file.originalname,
      contentType: req.file.mimetype,
    });
    const response = await axios.post(`${AI_URL}/ai/visual-search`, form, {
      headers: form.getHeaders(),
      timeout: 30000,
    });
    res.json(response.data);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
