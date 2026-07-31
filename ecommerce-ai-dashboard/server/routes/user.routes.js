const express = require('express');
const router  = express.Router();
const { protect, authorize } = require('../middleware/auth.middleware');
const User  = require('../models/User.model');
const Order = require('../models/Order.model');

// ── GET all users (admin) ──────────────────────────────────────────────────────
router.get('/', protect, authorize('admin'), async (req, res) => {
  try {
    const users = await User.find().select('-password');
    res.json(users);
  } catch (e) { res.status(500).json({ message: e.message }); }
});

// ── GET all customers with real order stats ────────────────────────────────────
router.get('/customers', protect, authorize('admin', 'vendor'), async (req, res) => {
  try {
    const customers = await User.find({ role: 'customer' })
      .select('-password')
      .sort({ createdAt: -1 });

    // Fetch order stats for each customer
    const customerIds = customers.map(c => c._id);
    const orders = await Order.find({ customer: { $in: customerIds } });

    const customerData = customers.map(c => {
      const myOrders   = orders.filter(o => o.customer.toString() === c._id.toString());
      const totalOrders= myOrders.length;
      const totalSpent = myOrders.filter(o=>o.paymentStatus==='paid').reduce((s,o)=>s+o.total,0);
      const avgOrder   = totalOrders > 0 ? totalSpent / totalOrders : 0;
      const lastOrder  = myOrders.length > 0
        ? Math.ceil((Date.now() - new Date(myOrders.sort((a,b)=>new Date(b.createdAt)-new Date(a.createdAt))[0].createdAt)) / 86400000)
        : null;

      // Auto-segment based on behaviour
      let status = 'new';
      if (totalOrders === 0)                               status = 'new';
      else if (lastOrder > 90)                             status = 'inactive';
      else if (lastOrder > 45)                             status = 'atrisk';
      else if (totalSpent > 500 && totalOrders >= 5)       status = 'vip';
      else if (avgOrder   > 150)                           status = 'highvalue';
      else if (totalOrders >= 3)                           status = 'regular';

      // Favourite categories from orders
      const cats = {};
      myOrders.forEach(o => o.items?.forEach(i => { cats[i.category] = (cats[i.category]||0)+1; }));
      const categories = Object.entries(cats).sort((a,b)=>b[1]-a[1]).map(([c])=>c).slice(0,3);

      return {
        _id:        c._id,
        name:       c.name,
        email:      c.email,
        createdAt:  c.createdAt,
        orders:     totalOrders,
        totalSpent: Math.round(totalSpent),
        avgOrder:   Math.round(avgOrder),
        lastOrder:  lastOrder,
        status,
        categories,
      };
    });

    res.json(customerData);
  } catch (e) {
    console.error('GET /users/customers error:', e.message);
    res.status(500).json({ message: e.message });
  }
});

// ── Update profile ─────────────────────────────────────────────────────────────
router.put('/profile', protect, async (req, res) => {
  try {
    const user = await User.findByIdAndUpdate(req.user._id, req.body, { new: true }).select('-password');
    res.json(user);
  } catch (e) { res.status(500).json({ message: e.message }); }
});

module.exports = router;
