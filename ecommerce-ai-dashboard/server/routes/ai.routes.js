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

// ── Image Search (Fallback for Product AI page) ───────────────────────────────
router.post('/search-images', protect, async (req, res) => {
  try {
    const { query, category } = req.body;
    if (!query?.trim()) return res.status(400).json({ message: 'query is required' });

    // Generate AI images using Pollinations AI (free, no API key)
    const styles = [
      'professional product photography, studio lighting, white background',
      'ecommerce product photo, high detail, sharp focus',
      'product on gradient background, commercial photography',
      'lifestyle product photo, natural lighting, modern setting',
      'product close-up, macro photography, detailed texture',
      'product packaging shot, clean composition, retail ready',
    ];

    const results = [];
    const seen = new Set();

    styles.forEach((style, i) => {
      const prompt = `${query}, ${category || 'product'}, ${style}`;
      const encoded = encodeURIComponent(prompt);
      const url = `https://image.pollinations.ai/prompt/${encoded}?width=400&height=400&nologo=true`;
      
      if (!seen.has(url)) {
        seen.add(url);
        results.push({
          id: `ai-${i}`,
          thumb: url,
          url: url,
          label: `${query} ${i+1}`,
          by: 'AI Generated'
        });
      }
    });

    res.json({ results: results.slice(0, 9) });
  } catch (error) {
    console.error('Image Search Error:', error.message);
    res.status(500).json({ message: error.message });
  }
});

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
