const express = require('express');
const router  = express.Router();
const Order   = require('../models/Order.model');
const Product = require('../models/Product.model');
const { protect, authorize } = require('../middleware/auth.middleware');
const { getAIForecast } = require('../controllers/forecast.controller');

// ── Helper: deduct stock for ordered items ────────────────────────────────────
async function deductStock(items, io) {
  const lowStockAlerts = [];
  for (const item of items) {
    try {
      // Find by productId (MongoDB ObjectId or numeric string), fallback to name match
      let product;
      if (item.productId) {
        if (item.productId.match(/^[a-f\d]{24}$/i)) {
          product = await Product.findById(item.productId);
        } else {
          // Try finding by a unique identifier (could be numeric fallback or name)
          product = await Product.findById(item.productId).catch(() => null);
        }
      }
      if (!product) {
        product = await Product.findOne({ name: { $regex: new RegExp(item.productName.replace(/[.*+?^${}()|[\]\\]/g,'\\$&'), 'i') } });
      }
      if (!product) continue;

      const newStock = Math.max(0, product.stock - item.qty);
      product.stock  = newStock;
      await product.save();

      const reorderPoint = product.reorderPoint || 10;
      if (newStock <= reorderPoint && newStock < product.stock + item.qty) {
        // Stock just fell below reorder point
        lowStockAlerts.push({ name: product.name, stock: newStock, reorderPoint });
      }
    } catch (e) {
      console.error('Stock deduction error for', item.productName, e.message);
    }
  }
  if (io && lowStockAlerts.length > 0) {
    io.emit('low-stock', lowStockAlerts);
  }
}

// ── Helper: register sale on product side (update salesHistory) ──────────────
async function registerProductSale(items) {
  for (const item of items) {
    try {
      let product;
      if (item.productId) {
        if (item.productId.match(/^[a-f\d]{24}$/i)) {
          product = await Product.findById(item.productId);
        } else {
          product = await Product.findById(item.productId).catch(() => null);
        }
      }
      if (!product) {
        product = await Product.findOne({ name: { $regex: new RegExp(item.productName.replace(/[.*+?^${}()|[\]\\]/g,'\\$&'), 'i') } });
      }
      if (!product) continue;

      // Add sale record to salesHistory
      product.salesHistory.push({
        date: new Date(),
        quantity: item.qty || 1,
        revenue: (item.price || 0) * (item.qty || 1),
      });

      // Keep only last 365 days of history
      const oneYearAgo = new Date(Date.now() - 365 * 86400000);
      product.salesHistory = product.salesHistory.filter(s => new Date(s.date) > oneYearAgo);

      await product.save();
    } catch (e) {
      console.error('Product sale registration error for', item.productName, e.message);
    }
  }
}

// ── Customer: place a new order ───────────────────────────────────────────────
router.post('/', protect, authorize('customer'), async (req, res) => {
  try {
    const { items, subtotal, shipping, tax, total, paymentMethod, shippingAddress } = req.body;

    if (!items?.length) return res.status(400).json({ message: 'Order must have at least one item' });

    // ── Validate stock availability before creating order ─────────────────
    for (const item of items) {
      let product = null;
      if (item.productId) {
        if (item.productId.match(/^[a-f\d]{24}$/i)) {
          product = await Product.findById(item.productId);
        } else {
          product = await Product.findById(item.productId).catch(() => null);
        }
      }
      if (!product) {
        product = await Product.findOne({ name: { $regex: new RegExp(item.productName.replace(/[.*+?^${}()|[\]\\]/g,'\\$&'), 'i') } });
      }
      if (product) {
        if (product.stock === 0) {
          return res.status(400).json({
            message: `"${item.productName}" is out of stock. Please remove it from your cart.`,
            outOfStock: item.productName,
          });
        }
        if (product.stock < item.qty) {
          return res.status(400).json({
            message: `Only ${product.stock} unit${product.stock > 1 ? 's' : ''} of "${item.productName}" available. Please adjust your quantity.`,
            insufficientStock: item.productName,
            available: product.stock,
          });
        }
      }
    }

    const isPaid = paymentMethod !== 'cod';

    const order = await Order.create({
      customer: req.user._id,
      items,
      subtotal,
      shipping: shipping || 0,
      tax:      tax      || 0,
      total,
      paymentMethod: paymentMethod || 'cod',
      paymentStatus: isPaid ? 'paid' : 'unpaid',
      status:        isPaid ? 'confirmed' : 'pending',
      shippingAddress,
      timeline: [{ status: isPaid ? 'confirmed' : 'pending', note: 'Order placed' }],
    });

    // ── Register product sales (update salesHistory for segmentation) ─────
    await registerProductSale(order.items);

    // ── Real-time Socket.io broadcast ──────────────────────────────────────
    const io = req.app.get('io');
    if (io) {
      // Notify all admin/vendor dashboards
      io.emit('new-order', {
        orderId:     order.orderId,
        total:       order.total,
        status:      order.status,
        paymentStatus: order.paymentStatus,
        customerName: req.user.name,
        items:       order.items,
        createdAt:   order.createdAt,
      });

      // If paid — emit revenue update + stock deduction signal
      if (isPaid) {
        io.emit('order-paid', {
          orderId:  order.orderId,
          total:    order.total,
          items:    order.items,
          customer: req.user.name,
        });
      }
      // ── Deduct stock for ALL orders (paid + COD) ────────────────────────
      await deductStock(order.items, io);
    } else {
      await deductStock(order.items, null);
    }

    res.status(201).json(order);
  } catch (e) {
    console.error('Create order error:', e.message);
    res.status(500).json({ message: e.message });
  }
});

// ── Get order stats (for sidebar & dashboard) ────────────────────────────────
router.get('/stats', protect, authorize('admin', 'vendor'), async (req, res) => {
  try {
    const todayStart = new Date(); todayStart.setHours(0,0,0,0);
    const todayEnd   = new Date(); todayEnd.setHours(23,59,59,999);

    const [totalOrders, pendingOrders, confirmedOrders, shippedOrders, outForDeliveryOrders, deliveredOrders, cancelledOrders, allOrders, todayOrdersData] = await Promise.all([
      Order.countDocuments(),
      Order.countDocuments({ status: 'pending' }),
      Order.countDocuments({ status: 'confirmed' }),
      Order.countDocuments({ status: 'shipped' }),
      Order.countDocuments({ status: 'out_for_delivery' }),
      Order.countDocuments({ status: 'delivered' }),
      Order.countDocuments({ status: 'cancelled' }),
      Order.find({}, { total: 1, items: 1 }),
      Order.find({ createdAt: { $gte: todayStart, $lte: todayEnd }, paymentStatus: 'paid' }, { total: 1 }),
    ]);

    const todayRevenue = todayOrdersData.reduce((s, o) => s + (o.total || 0), 0);
    const totalRevenue = allOrders.reduce((s, o) => s + (o.total || 0), 0);

    // Count total product quantity (sum of all items.qty) for accurate order volume
    const totalProductQty = allOrders.reduce((sum, o) => {
      const qty = (o.items || []).reduce((s, item) => s + (item.qty || 0), 0);
      return sum + (qty || 1);
    }, 0);

    res.json({
      totalOrders,          // Raw document count (matches orders page)
      pendingOrders,        // Orders waiting for payment
      confirmedOrders,      // Confirmed orders
      shippedOrders,        // Shipped orders
      outForDeliveryOrders, // Out for delivery orders
      deliveredOrders,      // Delivered orders
      cancelledOrders,      // Cancelled orders
      todayRevenue,
      totalRevenue,
      totalProductQty,       // Total products sold for reference
    });
  } catch (e) { res.status(500).json({ message: e.message }); }
});

    // ── Dashboard aggregation (real charts + AI forecast) ────────────────────────
router.get('/dashboard', protect, authorize('admin', 'vendor'), async (req, res) => {
  try {
    const now = new Date();
    const sixMonthsAgo = new Date(); sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
    const twelveMonthsAgo = new Date(); twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);

    // Fetch ALL orders (paid + unpaid/COD) for accurate total counts
    // Paid orders used for revenue/chart data
    const allOrders = await Order.find({
      createdAt: { $gte: twelveMonthsAgo },
    });

    // Paid orders only for revenue/chart calculations
    const paidOrders = allOrders.filter(o => o.paymentStatus === 'paid');

    // ── Monthly revenue & order counts (last 6 months actual) ────────────
    const monthNames = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    const monthMap = {};
    const forecastMonthMap = {};

    // Build last 6 months of actual data
    for (let i = 5; i >= 0; i--) {
      const d = new Date(); d.setMonth(d.getMonth() - i);
      const key = `${d.getFullYear()}-${d.getMonth()}`;
      monthMap[key] = { month: monthNames[d.getMonth()], revenue: 0, orders: 0 };
    }

    // Build next 3 months for forecast
    for (let i = 1; i <= 3; i++) {
      const d = new Date(); d.setMonth(d.getMonth() + i);
      const key = `${d.getFullYear()}-${d.getMonth()}`;
      forecastMonthMap[key] = { month: monthNames[d.getMonth()], revenue: null, orders: null, forecast: 0, forecastOrders: 0 };
    }

    // Populate actual monthly data — count each product item as an order entry
    paidOrders.forEach(o => {
      const d = new Date(o.createdAt);
      const key = `${d.getFullYear()}-${d.getMonth()}`;
      if (monthMap[key]) {
        monthMap[key].revenue += o.total || 0;
        // Count total product quantity across all items (e.g. 5 products = 5 orders)
        const totalQty = (o.items || []).reduce((sum, item) => sum + (item.qty || 0), 0);
        monthMap[key].orders += totalQty || 1;
      }
    });

    const monthly = Object.values(monthMap);

    // ── AI Forecast Calculation (Linear Regression on last 6 months) ─────
    const actualMonths = monthly.map((m, idx) => ({ x: idx, y: m.revenue }));
    const actualOrderMonths = monthly.map((m, idx) => ({ x: idx, y: m.orders }));

    // Linear regression: y = mx + b
    function linearRegression(data) {
      const n = data.length;
      if (n < 2) return { slope: 0, intercept: data[0]?.y || 0 };
      const sumX = data.reduce((s, p) => s + p.x, 0);
      const sumY = data.reduce((s, p) => s + p.y, 0);
      const sumXY = data.reduce((s, p) => s + p.x * p.y, 0);
      const sumX2 = data.reduce((s, p) => s + p.x * p.x, 0);
      const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
      const intercept = (sumY - slope * sumX) / n;
      return { slope, intercept };
    }

    const revReg = linearRegression(actualMonths);
    const ordReg = linearRegression(actualOrderMonths);

    // Generate forecast for next 3 months
    const forecastEntries = Object.entries(forecastMonthMap);
    forecastEntries.forEach(([key, val], idx) => {
      const nextX = monthly.length + idx;
      const predictedRevenue = Math.max(0, revReg.slope * nextX + revReg.intercept);
      const predictedOrders = Math.max(0, Math.round(ordReg.slope * nextX + ordReg.intercept));
      forecastMonthMap[key].forecast = Math.round(predictedRevenue);
      forecastMonthMap[key].forecastOrders = predictedOrders;
    });

    const forecastData = Object.values(forecastMonthMap);

    // ── Top products by revenue (ALL paid orders, not just recent) ──────────────────
    const productRevenue = {};
    const productRevenuePrev = {};
    const threeMonthsAgo = new Date(); threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);

    console.log(`Processing ${paidOrders.length} paid orders for top products...`);

    paidOrders.forEach(o => {
      const isRecent = new Date(o.createdAt) >= threeMonthsAgo;
      (o.items || []).forEach(item => {
        const name = item.productName || 'Unknown';
        // Include ALL paid orders in current revenue (not just recent)
        if (!productRevenue[name]) productRevenue[name] = { name, sales: 0, revenue: 0 };
        productRevenue[name].sales += item.qty || 0;
        productRevenue[name].revenue += (item.price || 0) * (item.qty || 0);
        
        // For trend comparison, track previous period separately
        if (!isRecent) {
          if (!productRevenuePrev[name]) productRevenuePrev[name] = { name, sales: 0, revenue: 0 };
          productRevenuePrev[name].sales += item.qty || 0;
          productRevenuePrev[name].revenue += (item.price || 0) * (item.qty || 0);
        }
      });
    });

    console.log('Product revenue map:', productRevenue);

    const topProducts = Object.values(productRevenue)
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5)
      .map(p => {
        const prev = productRevenuePrev[p.name]?.revenue || 0;
        const trendPct = prev > 0 ? Math.round(((p.revenue - prev) / prev) * 100) : 100;
        return {
          ...p,
          revenue: `$${p.revenue.toLocaleString()}`,
          trend: `${trendPct >= 0 ? '↑' : '↓'} ${Math.abs(trendPct)}%`,
          up: trendPct >= 0,
        };
      });

    console.log('Top products result:', topProducts);

    // ── Category breakdown ────────────────────────────────────────────────
    const categoryMap = {};
    paidOrders.forEach(o => {
      (o.items || []).forEach(item => {
        const cat = item.category || 'Other';
        if (!categoryMap[cat]) categoryMap[cat] = 0;
        categoryMap[cat] += (item.price || 0) * (item.qty || 0);
      });
    });

    const catTotal = Object.values(categoryMap).reduce((s, v) => s + v, 0) || 1;
    const colors = ['#6366f1', '#8b5cf6', '#10b981', '#f59e0b', '#ef4444', '#3b82f6'];
    const categories = Object.entries(categoryMap)
      .map(([name, value], i) => ({ name, value: Math.round((value / catTotal) * 100), color: colors[i % colors.length] }))
      .sort((a, b) => b.value - a.value);

    // ── Totals ────────────────────────────────────────────────────────────
    const totalRevenue = paidOrders.reduce((s, o) => s + (o.total || 0), 0);
    // Total order document count (raw count) — matches orders page count
    const totalOrders = await Order.countDocuments();
    // Pending orders count (pending payment, not confirmed) — matches orders page
    const pendingOrders = await Order.countDocuments({
      status: 'pending'
    });
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const todayRevenue = paidOrders
      .filter(o => new Date(o.createdAt) >= today)
      .reduce((s, o) => s + (o.total || 0), 0);

    res.json({
      monthly,
      forecast: forecastData,
      topProducts,
      categories,
      totalRevenue,
      totalOrders,
      pendingOrders,
      todayRevenue,
    });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

// ── Customer: my orders ───────────────────────────────────────────────────────
router.get('/my', protect, async (req, res) => {
  try {
    const orders = await Order.find({ customer: req.user._id })
      .sort({ createdAt: -1 });
    res.json(orders);
  } catch (e) { res.status(500).json({ message: e.message }); }
});

// ── Admin/Vendor: all orders ──────────────────────────────────────────────────
router.get('/', protect, authorize('admin', 'vendor'), async (req, res) => {
  try {
    const { status, page = 1, limit = 50 } = req.query;
    const filter = status ? { status } : {};
    const orders = await Order.find(filter)
      .populate('customer', 'name email')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(+limit);
    const total = await Order.countDocuments(filter);
    res.json({ orders, total, page: +page });
  } catch (e) { res.status(500).json({ message: e.message }); }
});

// ── Get sales segments (category and location performance) ─────────────────────
router.get('/segments/all', protect, authorize('admin'), async (req, res) => {
  try {
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 86400000);
    const sixtyDaysAgo  = new Date(now.getTime() - 60 * 86400000);

    // Fetch all paid orders with customer data
    const orders = await Order.find({ paymentStatus: 'paid' }).populate('customer');

    // ── Category Sales (real data, no random) ──────────────────────────────
    const categorySales = {};
    const categorySalesPrev = {}; // for growth comparison (30-60 days ago)

    orders.forEach(order => {
      const orderDate = new Date(order.createdAt);
      const isCurrent = orderDate >= thirtyDaysAgo;
      const isPrev    = orderDate >= sixtyDaysAgo && orderDate < thirtyDaysAgo;

      order.items.forEach(item => {
        const category = item.category || 'Other';
        const revenue = item.price * item.qty;

        if (isCurrent) {
          if (!categorySales[category]) categorySales[category] = { sales: 0, count: 0 };
          categorySales[category].sales += revenue;
          categorySales[category].count += item.qty;
        }
        if (isPrev) {
          if (!categorySalesPrev[category]) categorySalesPrev[category] = { sales: 0 };
          categorySalesPrev[category].sales += revenue;
        }
      });
    });

    const categoryColors = ['#6366f1', '#8b5cf6', '#10b981', '#f59e0b', '#ef4444', '#3b82f6', '#f97316', '#dc2626'];
    const categoryResult = Object.entries(categorySales).map(([category, data], idx) => {
      const prevSales = categorySalesPrev[category]?.sales || 0;
      let growthPct = 0;
      if (prevSales > 0) {
        growthPct = Math.round(((data.sales - prevSales) / prevSales) * 100);
      } else if (data.sales > 0) {
        growthPct = 100; // new category with no previous data
      }
      return {
        category,
        sales: `$${data.sales.toFixed(2)}`,
        growth: `${growthPct >= 0 ? '+' : ''}${growthPct}%`,
        trend: growthPct >= 0 ? 'up' : 'down',
        color: categoryColors[idx % categoryColors.length],
      };
    });

    // ── Location Sales (from actual customer data) ─────────────────────────
    const locationSales = {};
    const locationSalesPrev = {};

    orders.forEach(order => {
      const orderDate = new Date(order.createdAt);
      const isCurrent = orderDate >= thirtyDaysAgo;
      const isPrev    = orderDate >= sixtyDaysAgo && orderDate < thirtyDaysAgo;

      // Get location: prefer customer.location (country), fallback to shipping city
      let location = 'Unknown';
      if (order.customer && order.customer.location) {
        location = order.customer.location;
      } else if (order.shippingAddress && order.shippingAddress.city) {
        location = order.shippingAddress.city;
      }

      const revenue = order.total || 0;

      if (isCurrent) {
        if (!locationSales[location]) locationSales[location] = { sales: 0, customers: new Set() };
        locationSales[location].sales += revenue;
        if (order.customer) locationSales[location].customers.add(order.customer._id.toString());
      }
      if (isPrev) {
        if (!locationSalesPrev[location]) locationSalesPrev[location] = { sales: 0 };
        locationSalesPrev[location].sales += revenue;
      }
    });

    const locationColors = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#3b82f6', '#f97316', '#dc2626'];
    const locationResult = Object.entries(locationSales)
      .sort((a, b) => b[1].sales - a[1].sales)
      .map(([location, data], idx) => {
        const prevSales = locationSalesPrev[location]?.sales || 0;
        let growthPct = 0;
        if (prevSales > 0) {
          growthPct = Math.round(((data.sales - prevSales) / prevSales) * 100);
        } else if (data.sales > 0) {
          growthPct = 100;
        }
        return {
          location,
          sales: `$${data.sales.toFixed(2)}`,
          growth: `${growthPct >= 0 ? '+' : ''}${growthPct}%`,
          customers: data.customers.size,
          trend: growthPct >= 0 ? 'up' : 'down',
          color: locationColors[idx % locationColors.length],
        };
      });

    res.json({
      categorySales: categoryResult,
      locationSales: locationResult,
    });
  } catch (e) {
    console.error('GET /orders/segments error:', e.message);
    res.status(500).json({ message: e.message });
  }
});

// ── Admin: update order status ────────────────────────────────────────────────
router.patch('/:id/status', protect, authorize('admin', 'vendor'), async (req, res) => {
  try {
    const { status } = req.body;
    const allowed = ['pending','confirmed','shipped','out_for_delivery','delivered','cancelled'];
    if (!allowed.includes(status)) return res.status(400).json({ message: 'Invalid status' });

    // ── Fetch the existing order to check payment method ──────────────────
    const existingOrder = await Order.findById(req.params.id);
    if (!existingOrder) return res.status(404).json({ message: 'Order not found' });

    const updateData = {
      status,
      $push: { timeline: { status, timestamp: new Date(), note: `Status updated to ${status}` } },
    };

    // ── Auto-mark COD as paid when delivered (cash collected on delivery) ──
    if (status === 'delivered' && existingOrder.paymentMethod === 'cod') {
      updateData.paymentStatus = 'paid';
    }

    const order = await Order.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true }
    ).populate('customer', 'name email');

    if (!order) return res.status(404).json({ message: 'Order not found' });

    // Notify customer in real-time when status changes
    const io = req.app.get('io');
    if (io) {
      io.emit(`order-status-${order._id}`, { orderId: order.orderId, status, order });
      io.emit('order-status-updated', { orderId: order.orderId, status, customerId: order.customer });
    }

    res.json(order);
  } catch (e) { res.status(500).json({ message: e.message }); }
});

// ── AI Forecast Analysis (real data + Gemini) ─────────────────────────────────
router.get('/ai-forecast', protect, authorize('admin', 'vendor'), getAIForecast);

// ── Get single order ──────────────────────────────────────────────────────────
router.get('/:id', protect, async (req, res) => {
  try {
    const order = await Order.findById(req.params.id)
      .populate('customer', 'name email');
    if (!order) return res.status(404).json({ message: 'Order not found' });

    // Customer can only see own orders
    if (req.user.role === 'customer' && order.customer._id.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }
    res.json(order);
  } catch (e) { res.status(500).json({ message: e.message }); }
});

module.exports = router;
