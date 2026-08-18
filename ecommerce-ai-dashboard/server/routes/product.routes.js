const express  = require('express');
const router   = express.Router();
const Product  = require('../models/Product.model');
const { protect, authorize } = require('../middleware/auth.middleware');
const { PRODUCT_SEGMENTS, determineProductSegment, getProductSegmentDetails, calculateProductStats } = require('../utils/productSegmentation');

// ── GET all products (public — for customer shop) ─────────────────────────────
router.get('/', async (req, res) => {
  try {
    const { category, search, page = 1, limit = 100, all } = req.query;

    // Admin/vendor can see inactive products with ?all=true
    const query = all === 'true' ? {} : { isActive: true };
    if (category) query.category = { $regex: new RegExp(category, 'i') };
    if (search)   query.name     = { $regex: new RegExp(search, 'i') };

    const products = await Product.find(query)
      .sort({ createdAt: -1 })
      .limit(+limit)
      .skip((+page - 1) * +limit);

    const total = await Product.countDocuments(query);
    res.json({ products, total, page: +page });
  } catch (e) {
    console.error('GET /products error:', e.message);
    res.status(500).json({ message: e.message });
  }
});

// ── GET product segments (enhanced with Fast-Moving, Dead Stock, Critical Low Stock) ──
router.get('/segments/all', protect, authorize('admin'), async (req, res) => {
  try {
    const products = await Product.find();
    
    // Initialize segment counts
    const segmentCounts = {};
    Object.keys(PRODUCT_SEGMENTS).forEach(k => { segmentCounts[k] = 0; });

    // Detailed product data per segment
    const segmentProducts = {};
    Object.keys(PRODUCT_SEGMENTS).forEach(k => { segmentProducts[k] = []; });

    products.forEach(product => {
      const segmentKey = determineProductSegment(product);
      segmentCounts[segmentKey] = (segmentCounts[segmentKey] || 0) + 1;
      
      const stats = calculateProductStats(product);
      segmentProducts[segmentKey].push({
        _id: product._id,
        name: product.name,
        price: product.price,
        stock: product.stock,
        category: product.category,
        ...stats,
      });
    });

    // Build result with segment details
    const result = {};
    Object.entries(PRODUCT_SEGMENTS).forEach(([key, seg]) => {
      result[key] = {
        ...seg,
        count: segmentCounts[key] || 0,
        products: segmentProducts[key] || [],
        totalValue: segmentProducts[key].reduce((sum, p) => sum + (p.price * p.currentStock), 0),
      };
    });

    res.json(result);
  } catch (e) {
    console.error('GET /products/segments error:', e.message);
    res.status(500).json({ message: e.message });
  }
});

// ── GET sales history for a product (for demand forecasting) ─────────────────
router.get('/:id/sales-history', protect, authorize('admin', 'vendor'), async (req, res) => {
  try {
    const days = Math.min(Math.max(+(req.query.days || 30), 7), 365);
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ message: 'Product not found' });

    const since = new Date(Date.now() - days * 86400000);
    const history = (product.salesHistory || [])
      .filter(s => new Date(s.date) >= since)
      .sort((a, b) => new Date(a.date) - new Date(b.date));

    res.json({
      productId: product._id,
      productName: product.name,
      days,
      history,
    });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

// ── GET single product (must be AFTER /:id/sales-history) ────────────────────
router.get('/:id', async (req, res) => {
  try {
    const p = await Product.findById(req.params.id);
    if (!p) return res.status(404).json({ message: 'Product not found' });
    res.json(p);
  } catch (e) { res.status(500).json({ message: e.message }); }
});

// ── POST create product (vendor or admin) ─────────────────────────────────────
router.post('/', protect, authorize('vendor', 'admin'), async (req, res) => {
  try {
    const productData = {
      ...req.body,
      vendor:   req.user._id,
      isActive: req.body.isActive !== undefined ? req.body.isActive : true,
    };
    const product = await Product.create(productData);
    res.status(201).json(product);
  } catch (e) {
    console.error('POST /products error:', e.message);
    res.status(500).json({ message: e.message });
  }
});

// ── PUT update product ────────────────────────────────────────────────────────
router.put('/:id', protect, authorize('vendor', 'admin'), async (req, res) => {
  try {
    // Admin can update any product; vendor can only update their own
    const filter = req.user.role === 'admin'
      ? { _id: req.params.id }
      : { _id: req.params.id, vendor: req.user._id };

    const product = await Product.findOneAndUpdate(filter, req.body, { new: true, runValidators: true });
    if (!product) return res.status(404).json({ message: 'Product not found or unauthorized' });
    res.json(product);
  } catch (e) {
    console.error('PUT /products error:', e.message);
    res.status(500).json({ message: e.message });
  }
});

// ── DELETE product ────────────────────────────────────────────────────────────
router.delete('/:id', protect, authorize('vendor', 'admin'), async (req, res) => {
  try {
    const filter = req.user.role === 'admin'
      ? { _id: req.params.id }
      : { _id: req.params.id, vendor: req.user._id };

    const product = await Product.findOneAndDelete(filter);
    if (!product) return res.status(404).json({ message: 'Product not found or unauthorized' });
    res.json({ message: 'Product deleted successfully' });
  } catch (e) {
    console.error('DELETE /products error:', e.message);
    res.status(500).json({ message: e.message });
  }
});

// ── GET expiry-tracker data (admin/vendor) ─────────────────────────────────────
router.get('/expiry-tracker', protect, authorize('admin', 'vendor'), async (req, res) => {
  try {
    const products = await Product.find({ expiryDate: { $ne: null } }).sort({ expiryDate: 1 });
    const today = new Date();
    const data = products.map(p => {
      const daysLeft = Math.ceil((new Date(p.expiryDate) - today) / 86400000);
      let level, discount;
      if (daysLeft <= 1)        { level = 'critical'; discount = 40; }
      else if (daysLeft <= 3)   { level = 'urgent';   discount = 30; }
      else if (daysLeft <= 7)   { level = 'warning';  discount = 20; }
      else if (daysLeft <= 30)  { level = 'ok';       discount = 10; }
      else                      { level = 'good';     discount = 0;  }
      return {
        _id: p._id,
        name: p.name,
        category: p.category,
        stock: p.stock,
        price: p.price,
        expiryDate: p.expiryDate,
        daysLeft,
        isPerishable: p.isPerishable,
        level,
        discount,
      };
    });
    res.json({ products: data, total: data.length });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

// ── PUT apply expiry discount ──────────────────────────────────────────────────
router.put('/:id/expiry-discount', protect, authorize('admin', 'vendor'), async (req, res) => {
  try {
    const { discountPct, discountedPrice } = req.body;
    const product = await Product.findByIdAndUpdate(
      req.params.id,
      { aiPrice: discountedPrice, price: discountedPrice },
      { new: true }
    );
    if (!product) return res.status(404).json({ message: 'Product not found' });
    res.json(product);
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

// ── POST add review (customer only) ──────────────────────────────────────────
router.post('/:id/reviews', protect, async (req, res) => {
  try {
    const { rating, comment } = req.body;
    if (!rating || rating < 1 || rating > 5)
      return res.status(400).json({ message: 'Rating must be between 1 and 5' });

    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ message: 'Product not found' });

    // One review per customer per product
    const alreadyReviewed = product.reviews.find(r => r.user.toString() === req.user._id.toString());
    if (alreadyReviewed)
      return res.status(400).json({ message: 'You have already reviewed this product' });

    product.reviews.push({ user: req.user._id, rating: +rating, comment: comment?.trim() || '' });

    // Recalculate average
    const total = product.reviews.reduce((s, r) => s + r.rating, 0);
    product.ratings = { average: +(total / product.reviews.length).toFixed(1), count: product.reviews.length };
    await product.save();

    res.status(201).json({ message: 'Review added', ratings: product.ratings });
  } catch (e) { res.status(500).json({ message: e.message }); }
});

// ── GET reviews for a product (anonymous — no customer names) ─────────────────
router.get('/:id/reviews', async (req, res) => {
  try {
    const product = await Product.findById(req.params.id).select('reviews ratings name');
    if (!product) return res.status(404).json({ message: 'Product not found' });

    // Return reviews WITHOUT names — only masked identity
    const anonymousReviews = product.reviews.map((r, i) => ({
      id:        r._id,
      rating:    r.rating,
      comment:   r.comment,
      createdAt: r.createdAt,
      // Anonymous label: "Customer #1", "Customer #2" etc — no real name
      reviewer:  `Customer #${i + 1}`,
      verified:  true, // all reviews are from verified DB users
    }));

    res.json({ reviews: anonymousReviews, ratings: product.ratings });
  } catch (e) { res.status(500).json({ message: e.message }); }
});

// ── GET reviews with names (admin only) ───────────────────────────────────────
router.get('/:id/reviews/admin', protect, authorize('admin', 'vendor'), async (req, res) => {
  try {
    const product = await Product.findById(req.params.id)
      .select('reviews ratings name')
      .populate('reviews.user', 'name email');
    if (!product) return res.status(404).json({ message: 'Product not found' });
    res.json({ reviews: product.reviews, ratings: product.ratings });
  } catch (e) { res.status(500).json({ message: e.message }); }
});

module.exports = router;
