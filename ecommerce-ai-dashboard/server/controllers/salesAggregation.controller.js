const Order = require('../models/Order.model');

/**
 * GET /api/sales-aggregation/category
 * MongoDB Aggregation: Total sales grouped by product category
 * Query params:
 *   - city: filter by shipping city
 *   - days: number of days to look back (default: all time)
 */
exports.getCategorySales = async (req, res) => {
  try {
    const { city, days } = req.query;

    // Build match stage — only count paid orders (delivered COD is auto-marked paid)
    const matchStage = { paymentStatus: 'paid' };

    // Filter by time period if days specified
    if (days && !isNaN(parseInt(days))) {
      const since = new Date(Date.now() - parseInt(days) * 86400000);
      matchStage.createdAt = { $gte: since };
    }

    // Filter by city if specified
    if (city && city !== 'all') {
      matchStage['shippingAddress.city'] = { $regex: new RegExp(city, 'i') };
    }

    const result = await Order.aggregate([
      // Only paid orders with optional filters
      { $match: matchStage },
      // Unwind safely — skip docs with missing/empty items array
      { $unwind: { path: '$items', preserveNullAndEmptyArrays: false } },
      // Group by category
      {
        $group: {
          _id: { $ifNull: ['$items.category', 'Other'] },
          totalSales: { $sum: { $multiply: ['$items.price', '$items.qty'] } },
          totalQuantity: { $sum: '$items.qty' },
          orderCount: { $addToSet: '$_id' },
        },
      },
      // Count unique orders per category
      {
        $addFields: {
          orderCount: { $size: '$orderCount' },
        },
      },
      // Sort by totalSales descending
      { $sort: { totalSales: -1 } },
      // Shape the output
      {
        $project: {
          _id: 0,
          category: '$_id',
          totalSales: { $round: ['$totalSales', 2] },
          totalQuantity: 1,
          orderCount: 1,
        },
      },
    ]);

    // Calculate percentages
    const grandTotal = result.reduce((sum, c) => sum + c.totalSales, 0) || 1;
    const colors = ['#6366f1', '#8b5cf6', '#10b981', '#f59e0b', '#ef4444', '#3b82f6', '#f97316', '#dc2626', '#14b8a6', '#84cc16'];

    const data = result.map((item, idx) => ({
      ...item,
      percentage: Math.round((item.totalSales / grandTotal) * 100),
      color: colors[idx % colors.length],
    }));

    res.json({ categories: data.length > 0 ? data : [], grandTotal: grandTotal || 0, empty: data.length === 0 });
  } catch (err) {
    console.error('Category Sales Aggregation Error:', err.message);
    res.status(500).json({ message: err.message });
  }
};

/**
 * GET /api/sales-aggregation/location
 * MongoDB Aggregation: Total sales grouped by shipping city
 * Query params:
 *   - days: number of days to look back (default: all time)
 */
exports.getLocationSales = async (req, res) => {
  try {
    const { days } = req.query;

    // Build match stage — only count paid orders (delivered COD is auto-marked paid)
    const matchStage = { paymentStatus: 'paid' };

    // Filter by time period if days specified
    if (days && !isNaN(parseInt(days))) {
      const since = new Date(Date.now() - parseInt(days) * 86400000);
      matchStage.createdAt = { $gte: since };
    }

    const result = await Order.aggregate([
      // Only paid orders
      { $match: matchStage },
      // Group by shipping city
      {
        $group: {
          _id: { $ifNull: ['$shippingAddress.city', 'Unknown'] },
          totalSales: { $sum: '$total' },
          orderCount: { $sum: 1 },
          customerCount: { $addToSet: '$customer' },
        },
      },
      // Count unique customers
      {
        $addFields: {
          customerCount: { $size: '$customerCount' },
        },
      },
      // Sort by totalSales descending
      { $sort: { totalSales: -1 } },
      // Shape the output
      {
        $project: {
          _id: 0,
          city: '$_id',
          totalSales: { $round: ['$totalSales', 2] },
          orderCount: 1,
          customerCount: 1,
        },
      },
    ]);

    const colors = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#3b82f6', '#f97316', '#dc2626', '#14b8a6', '#84cc16'];

    const data = result.map((item, idx) => ({
      ...item,
      color: colors[idx % colors.length],
    }));

    res.json({ locations: data.length > 0 ? data : [], empty: data.length === 0 });
  } catch (err) {
    console.error('Location Sales Aggregation Error:', err.message);
    res.status(500).json({ message: err.message });
  }
};

/**
 * GET /api/sales-aggregation/ai-insights
 * Generate AI-powered insights from real sales data for the recommendations section
 */
exports.getSalesAIInsights = async (req, res) => {
  try {
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 86400000);
    const sixtyDaysAgo = new Date(now.getTime() - 60 * 86400000);

    // Match paid orders OR delivered COD orders (delivered COD = effectively paid)
    const paidMatch = {
      $or: [
        { paymentStatus: 'paid' },
        { paymentMethod: 'cod', status: 'delivered' },
      ],
    };

    // Get category sales for current and previous period (all-time fallback)
    const [currentCategorySales, previousCategorySales, locationSales, allTimeCategorySales, allTimeLocationSales] = await Promise.all([
      Order.aggregate([
        { $match: { ...paidMatch, createdAt: { $gte: thirtyDaysAgo } } },
        { $unwind: '$items' },
        {
          $group: {
            _id: { $ifNull: ['$items.category', 'Other'] },
            totalSales: { $sum: { $multiply: ['$items.price', '$items.qty'] } },
            totalQty: { $sum: '$items.qty' },
          },
        },
        { $sort: { totalSales: -1 } },
      ]),
      Order.aggregate([
        { $match: { ...paidMatch, createdAt: { $gte: sixtyDaysAgo, $lt: thirtyDaysAgo } } },
        { $unwind: '$items' },
        {
          $group: {
            _id: { $ifNull: ['$items.category', 'Other'] },
            totalSales: { $sum: { $multiply: ['$items.price', '$items.qty'] } },
          },
        },
      ]),
      Order.aggregate([
        { $match: { ...paidMatch, createdAt: { $gte: thirtyDaysAgo } } },
        {
          $group: {
            _id: { $ifNull: ['$shippingAddress.city', 'Unknown'] },
            totalSales: { $sum: '$total' },
            orderCount: { $sum: 1 },
          },
        },
        { $sort: { totalSales: -1 } },
      ]),
      // All-time category sales (fallback if no recent data)
      Order.aggregate([
        { $match: paidMatch },
        { $unwind: '$items' },
        {
          $group: {
            _id: { $ifNull: ['$items.category', 'Other'] },
            totalSales: { $sum: { $multiply: ['$items.price', '$items.qty'] } },
            totalQty: { $sum: '$items.qty' },
          },
        },
        { $sort: { totalSales: -1 } },
      ]),
      // All-time location sales (fallback if no recent data)
      Order.aggregate([
        { $match: paidMatch },
        {
          $group: {
            _id: { $ifNull: ['$shippingAddress.city', 'Unknown'] },
            totalSales: { $sum: '$total' },
            orderCount: { $sum: 1 },
          },
        },
        { $sort: { totalSales: -1 } },
      ]),
    ]);

    // Use all-time data as fallback if no recent data
    const effectiveCategorySales = currentCategorySales.length > 0 ? currentCategorySales : allTimeCategorySales;
    const effectiveLocationSales = locationSales.length > 0 ? locationSales : allTimeLocationSales;

    // Build category insights
    const categoryMap = {};
    effectiveCategorySales.forEach(c => {
      categoryMap[c._id] = { current: c.totalSales, qty: c.totalQty };
    });
    previousCategorySales.forEach(c => {
      if (categoryMap[c._id]) {
        categoryMap[c._id].previous = c.totalSales;
      } else {
        categoryMap[c._id] = { current: 0, previous: c.totalSales };
      }
    });

    // Find best and worst performing categories
    let bestCategory = null, worstCategory = null;
    let bestGrowth = -Infinity, worstGrowth = Infinity;

    Object.entries(categoryMap).forEach(([cat, data]) => {
      const prev = data.previous || 0;
      const curr = data.current || 0;
      const growth = prev > 0 ? ((curr - prev) / prev) * 100 : (curr > 0 ? 100 : 0);

      if (growth > bestGrowth && curr > 0) {
        bestGrowth = growth;
        bestCategory = { category: cat, growth: Math.round(growth), sales: curr };
      }
      if (growth < worstGrowth && prev > 0) {
        worstGrowth = growth;
        worstCategory = { category: cat, growth: Math.round(growth), sales: curr, previous: prev };
      }
    });

    // Build location insights
    const topLocation = effectiveLocationSales.length > 0 ? effectiveLocationSales[0] : null;
    const totalLocationSales = effectiveLocationSales.reduce((s, l) => s + l.totalSales, 0);

    const empty = effectiveCategorySales.length === 0 && effectiveLocationSales.length === 0;

    res.json({
      insights: {
        bestCategory,
        worstCategory,
        topLocation: topLocation ? {
          city: topLocation._id,
          sales: topLocation.totalSales,
          orders: topLocation.orderCount,
        } : null,
        totalCategorySales: effectiveCategorySales.reduce((s, c) => s + c.totalSales, 0),
        totalLocationSales,
        categoryCount: effectiveCategorySales.length,
        locationCount: effectiveLocationSales.length,
        empty,
      },
      categoryMap,
      locationSales: effectiveLocationSales.map(l => ({
        city: l._id,
        sales: l.totalSales,
        orders: l.orderCount,
      })),
    });
  } catch (err) {
    console.error('Sales AI Insights Error:', err.message);
    res.status(500).json({ message: err.message });
  }
};