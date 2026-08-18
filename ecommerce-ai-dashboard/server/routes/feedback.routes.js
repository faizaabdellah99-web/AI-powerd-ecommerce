const express  = require('express');
const router   = express.Router();
const Feedback = require('../models/Feedback.model');
const { protect, authorize } = require('../middleware/auth.middleware');

// Emit socket event when feedback is submitted (so admin sidebar updates in real-time)
router.post('/', protect, async (req, res) => {
  try {
    const { category, rating, title, message, productName } = req.body;
    if (!category || !message || !rating)
      return res.status(400).json({ message: 'Category, rating and message are required' });

    const idStr   = req.user._id.toString();
    const hashNum = idStr.split('').reduce((s,c) => s + c.charCodeAt(0), 0) % 9000 + 1000;
    const alias   = `Customer #${hashNum}`;

    const feedback = await Feedback.create({
      alias, category, rating: +rating,
      title: title?.trim() || '', message: message.trim(),
      productName: productName?.trim() || '', isAnonymous: true,
    });

    // Notify admin sidebar in real-time
    const io = req.app.get('io');
    if (io) {
      const unread = await Feedback.countDocuments({ status: 'new' });
      io.emit('feedback-new', { unreadCount: unread, category, rating: +rating });
    }

    res.status(201).json({ message: 'Feedback submitted. Thank you!', id: feedback._id });
  } catch (e) {
    console.error('Feedback submit error:', e.message);
    res.status(500).json({ message: e.message });
  }
});

// ── GET: Unread feedback count (for sidebar badge) ───────────────────────────
router.get('/unread-count', protect, authorize('admin', 'vendor'), async (req, res) => {
  try {
    const count = await Feedback.countDocuments({ status: 'new' });
    res.json({ count });
  } catch (e) { res.status(500).json({ message: e.message }); }
});

// ── GET: My feedback (customer) — shows admin replies ─────────────────────────
router.get('/my', protect, async (req, res) => {
  try {
    // Find by alias hash
    const idStr  = req.user._id.toString();
    const hashNum= idStr.split('').reduce((s,c) => s + c.charCodeAt(0), 0) % 9000 + 1000;
    const alias  = `Customer #${hashNum}`;

    const items = await Feedback.find({ alias })
      .select('category rating title message adminReply repliedAt status createdAt productName')
      .sort({ createdAt: -1 });

    res.json(items);
  } catch (e) { res.status(500).json({ message: e.message }); }
});

// ── GET: All feedback (admin/vendor only) ─────────────────────────────────────
router.get('/', protect, authorize('admin', 'vendor'), async (req, res) => {
  try {
    const { status, category, page = 1, limit = 50 } = req.query;
    const filter = {};
    if (status   && status   !== 'all') filter.status   = status;
    if (category && category !== 'all') filter.category = category;

    const items = await Feedback.find(filter)
      .sort({ createdAt: -1 })
      .skip((+page - 1) * +limit)
      .limit(+limit);

    const total = await Feedback.countDocuments(filter);

    // Summary stats
    const allItems  = await Feedback.find({});
    const avgRating = allItems.length
      ? +(allItems.reduce((s, f) => s + f.rating, 0) / allItems.length).toFixed(1)
      : 0;
    const byCategory = allItems.reduce((acc, f) => {
      acc[f.category] = (acc[f.category] || 0) + 1;
      return acc;
    }, {});
    const byStatus = allItems.reduce((acc, f) => {
      acc[f.status] = (acc[f.status] || 0) + 1;
      return acc;
    }, {});

    res.json({ items, total, page: +page, avgRating, byCategory, byStatus });
  } catch (e) { res.status(500).json({ message: e.message }); }
});

// ── PATCH: Update feedback status + admin note + reply ───────────────────────
router.patch('/:id', protect, authorize('admin', 'vendor'), async (req, res) => {
  try {
    const { status, adminNote, adminReply } = req.body;
    const update = {};
    if (status    !== undefined) update.status    = status;
    if (adminNote !== undefined) update.adminNote = adminNote;
    if (adminReply !== undefined) {
      update.adminReply = adminReply;
      update.repliedAt  = adminReply.trim() ? new Date() : null;
    }

    const feedback = await Feedback.findByIdAndUpdate(req.params.id, update, { new: true });
    if (!feedback) return res.status(404).json({ message: 'Feedback not found' });

    // If admin just sent a reply, notify the customer via socket
    const io = req.app.get('io');
    if (io && adminReply !== undefined && adminReply.trim()) {
      io.emit('feedback-reply', {
        alias:    feedback.alias,
        category: feedback.category,
        message:  'The store team replied to your feedback',
      });
    }

    res.json(feedback);
  } catch (e) { res.status(500).json({ message: e.message }); }
});

// ── DELETE: Archive/delete feedback ──────────────────────────────────────────
router.delete('/:id', protect, authorize('admin'), async (req, res) => {
  try {
    await Feedback.findByIdAndDelete(req.params.id);
    res.json({ message: 'Feedback deleted' });
  } catch (e) { res.status(500).json({ message: e.message }); }
});

module.exports = router;
