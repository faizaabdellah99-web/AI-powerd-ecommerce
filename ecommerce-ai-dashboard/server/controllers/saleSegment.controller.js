const Order = require('../models/Order.model');
const Product = require('../models/Product.model');

// ─── SALE SEGMENT DEFINITIONS ──────────────────────────────────────────────────
const SALE_SEGMENTS = {
  topPerforming: {
    key: 'topPerforming',
    label: '🏆 Top Performing',
    color: '#10b981',
    bg: '#10b98115',
    description: 'Categories and products with highest sales volume and revenue',
    action: 'Increase marketing budget, feature prominently, ensure adequate stock',
  },
  growing: {
    key: 'growing',
    label: '📈 Growing',
    color: '#6366f1',
    bg: '#6366f115',
    description: 'Categories showing positive growth trend month-over-month',
    action: 'Invest in inventory expansion, create targeted promotions',
  },
  stable: {
    key: 'stable',
    label: '✅ Stable',
    color: '#3b82f6',
    bg: '#3b82f615',
    description: 'Consistent performers with steady sales',
    action: 'Maintain current strategy, monitor for changes',
  },
  declining: {
    key: 'declining',
    label: '📉 Declining',
    color: '#f59e0b',
    bg: '#f59e0b15',
    description: 'Categories with decreasing sales trend',
    action: 'Review pricing, consider bundling, run promotional campaigns',
  },
  underperforming: {
    key: 'underperforming',
    label: '⚠️ Underperforming',
    color: '#ef4444',
    bg: '#ef444415',
    description: 'Low sales relative to inventory investment',
    action: 'Evaluate discontinuation, deep discount, or repositioning',
  },
  seasonal: {
    key: 'seasonal',
    label: '🎯 Seasonal',
    color: '#8b5cf6',
    bg: '#8b5cf615',
    description: 'Products with seasonal demand patterns',
    action: 'Plan inventory cycles around seasonal peaks, create advance orders',
  },
};

/**
 * Determine sale segment for a category based on sales data
 */
function determineSaleSegment(categoryData) {
  const { currentSales, previousSales, growthRate, totalInventory, totalSales } = categoryData;

  // Seasonal detection: if previous period had 0 sales but current has significant
  if (previousSales === 0 && currentSales > 0) return 'growing';

  // Top performing: high sales volume and positive growth
  if (currentSales > 0 && growthRate >= 20) return 'topPerforming';

  // Growing: positive growth but not yet top
  if (growthRate > 0 && growthRate < 20) return 'growing';

  // Declining: negative growth
  if (growthRate < -10) return 'declining';

  // Underperforming: low sales relative to inventory
  if (totalInventory > 0 && totalSales < totalInventory * 0.1) return 'underperforming';

  // Stable: everything else with sales
  if (currentSales > 0) return 'stable';

  return 'underperforming';
}

/**
 * GET /api/sale-segments/overview — Get sale segment overview
 */
exports.getSaleSegmentOverview = async (req, res) => {
  try {
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 86400000);
    const sixtyDaysAgo = new Date(now.getTime() - 60 * 86400000);

    // Fetch all paid orders for analytics (delivered COD is auto-marked paid)
    const orders = await Order.find({ paymentStatus: 'paid' }).populate('customer');
    const products = await Product.find();

    // ── Category Sales Analysis ──────────────────────────────────────────
    const categoryData = {};
    const categoryDataPrev = {};

    orders.forEach(order => {
      const orderDate = new Date(order.createdAt);
      const isCurrent = orderDate >= thirtyDaysAgo;
      const isPrev = orderDate >= sixtyDaysAgo && orderDate < thirtyDaysAgo;

      order.items.forEach(item => {
        const category = item.category || 'Other';
        const revenue = item.price * item.qty;

        if (isCurrent) {
          if (!categoryData[category]) categoryData[category] = { sales: 0, count: 0, revenue: 0 };
          categoryData[category].sales += revenue;
          categoryData[category].count += item.qty;
          categoryData[category].revenue += revenue;
        }
        if (isPrev) {
          if (!categoryDataPrev[category]) categoryDataPrev[category] = { sales: 0, count: 0 };
          categoryDataPrev[category].sales += revenue;
          categoryDataPrev[category].count += item.qty;
        }
      });
    });

    // Calculate inventory per category
    const categoryInventory = {};
    products.forEach(p => {
      const cat = p.category || 'Other';
      if (!categoryInventory[cat]) categoryInventory[cat] = { totalStock: 0, totalValue: 0 };
      categoryInventory[cat].totalStock += p.stock || 0;
      categoryInventory[cat].totalValue += (p.stock || 0) * (p.price || 0);
    });

    const categoryColors = ['#6366f1', '#8b5cf6', '#10b981', '#f59e0b', '#ef4444', '#3b82f6', '#f97316', '#dc2626'];
    const categorySegments = Object.entries(categoryData).map(([category, data], idx) => {
      const prev = categoryDataPrev[category];
      const prevSales = prev?.sales || 0;
      const growthRate = prevSales > 0 ? ((data.sales - prevSales) / prevSales) * 100 : (data.sales > 0 ? 100 : 0);
      const inventory = categoryInventory[category] || { totalStock: 0, totalValue: 0 };

      const segmentKey = determineSaleSegment({
        currentSales: data.sales,
        previousSales: prevSales,
        growthRate,
        totalInventory: inventory.totalStock,
        totalSales: data.count,
      });

      return {
        category,
        sales: `$${data.sales.toFixed(2)}`,
        revenue: data.revenue,
        count: data.count,
        growth: `${growthRate >= 0 ? '+' : ''}${Math.round(growthRate)}%`,
        trend: growthRate >= 0 ? 'up' : 'down',
        color: categoryColors[idx % categoryColors.length],
        segment: SALE_SEGMENTS[segmentKey],
        inventory: inventory.totalStock,
        inventoryValue: inventory.totalValue,
      };
    });

    // ── Time-based Sales Trend ───────────────────────────────────────────
    const dailySales = {};
    const monthlySales = {};

    orders.forEach(order => {
      const date = new Date(order.createdAt);
      const dayKey = date.toISOString().split('T')[0];
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

      if (!dailySales[dayKey]) dailySales[dayKey] = { date: dayKey, sales: 0, orders: 0 };
      dailySales[dayKey].sales += order.total || 0;
      dailySales[dayKey].orders += 1;

      if (!monthlySales[monthKey]) monthlySales[monthKey] = { month: monthKey, sales: 0, orders: 0 };
      monthlySales[monthKey].sales += order.total || 0;
      monthlySales[monthKey].orders += 1;
    });

    // ── Top Products by Sales ────────────────────────────────────────────
    const productSales = {};
    orders.forEach(order => {
      order.items.forEach(item => {
        const name = item.productName || 'Unknown';
        if (!productSales[name]) productSales[name] = { name, qty: 0, revenue: 0, category: item.category || 'Other' };
        productSales[name].qty += item.qty || 0;
        productSales[name].revenue += (item.price || 0) * (item.qty || 0);
      });
    });

    const topProducts = Object.values(productSales)
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 20)
      .map((p, idx) => ({
        ...p,
        rank: idx + 1,
        revenue: `$${p.revenue.toFixed(2)}`,
      }));

    // ── Segment Summary ──────────────────────────────────────────────────
    const segmentSummary = {};
    Object.keys(SALE_SEGMENTS).forEach(k => {
      segmentSummary[k] = {
        ...SALE_SEGMENTS[k],
        count: 0,
        totalRevenue: 0,
        categories: [],
      };
    });

    categorySegments.forEach(cs => {
      const key = cs.segment.key;
      if (segmentSummary[key]) {
        segmentSummary[key].count += 1;
        segmentSummary[key].totalRevenue += cs.revenue;
        segmentSummary[key].categories.push(cs.category);
      }
    });

    const empty = orders.length === 0;

    res.json({
      categorySegments,
      segmentSummary,
      topProducts,
      dailySales: Object.values(dailySales).sort((a, b) => a.date.localeCompare(b.date)).slice(-30),
      monthlySales: Object.values(monthlySales).sort((a, b) => a.month.localeCompare(b.month)).slice(-12),
      totalRevenue: orders.reduce((s, o) => s + (o.total || 0), 0),
      totalOrders: orders.length,
      totalCategories: categorySegments.length,
      empty,
    });
  } catch (err) {
    console.error('GET /sale-segments/overview error:', err.message);
    res.status(500).json({ message: err.message });
  }
};

/**
 * GET /api/sale-segments/category/:category — Get detailed analysis for a specific category
 */
exports.getCategoryDetail = async (req, res) => {
  try {
    const { category } = req.params;
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 86400000);

    const orders = await Order.find({
      paymentStatus: 'paid',
      'items.category': { $regex: new RegExp(category, 'i') },
    });

    // Products in this category
    const products = await Product.find({ category: { $regex: new RegExp(category, 'i') } });

    // Sales breakdown
    const productBreakdown = {};
    orders.forEach(order => {
      order.items.forEach(item => {
        if (item.category?.toLowerCase() === category.toLowerCase()) {
          const name = item.productName || 'Unknown';
          if (!productBreakdown[name]) productBreakdown[name] = { name, qty: 0, revenue: 0 };
          productBreakdown[name].qty += item.qty || 0;
          productBreakdown[name].revenue += (item.price || 0) * (item.qty || 0);
        }
      });
    });

    const totalSales = Object.values(productBreakdown).reduce((s, p) => s + p.revenue, 0);
    const totalQty = Object.values(productBreakdown).reduce((s, p) => s + p.qty, 0);

    res.json({
      category,
      totalSales,
      totalQty,
      totalOrders: orders.length,
      productCount: products.length,
      totalStock: products.reduce((s, p) => s + (p.stock || 0), 0),
      inventoryValue: products.reduce((s, p) => s + (p.stock || 0) * (p.price || 0), 0),
      products: Object.values(productBreakdown).sort((a, b) => b.revenue - a.revenue),
      inventory: products.map(p => ({
        _id: p._id,
        name: p.name,
        price: p.price,
        stock: p.stock,
        reorderPoint: p.reorderPoint,
      })),
    });
  } catch (err) {
    console.error('GET /sale-segments/category error:', err.message);
    res.status(500).json({ message: err.message });
  }
};

/**
 * GET /api/sale-segments/recommendations — Get AI-style recommendations for sales segments
 */
exports.getSaleRecommendations = async (req, res) => {
  try {
    const recommendations = {
      topPerforming: [
        '🚀 Increase inventory for top-performing categories by 25-30% to prevent stockouts',
        '📢 Feature top products on homepage and in email campaigns',
        '💎 Create premium bundles with top sellers to increase average order value',
        '📊 Monitor competitor pricing — top categories attract competition',
      ],
      growing: [
        '📈 Invest in inventory expansion for growing categories — trend is your friend',
        '🎯 Create targeted social media campaigns around growing product lines',
        '🤝 Partner with influencers in growing categories to accelerate momentum',
        '📋 Review supplier contracts to secure better pricing for increasing volumes',
      ],
      stable: [
        '✅ Maintain current inventory levels for stable categories',
        '🔄 Cross-sell stable products with top performers to boost revenue',
        '📊 Run A/B tests on pricing to see if you can increase margins',
        '👥 Gather customer feedback to identify improvement opportunities',
      ],
      declining: [
        '📉 Review pricing strategy — consider temporary discounts to stimulate demand',
        '🔄 Bundle declining products with popular items to clear inventory',
        '🔍 Investigate root cause: market shift, new competition, or seasonal effect',
        '💡 Consider product refresh or repositioning before discontinuation',
      ],
      underperforming: [
        '⚠️ Run clearance sale with 30-50% discount to recover inventory costs',
        '📦 Bundle with best-sellers to move slow inventory',
        '🔍 Evaluate if these products should be discontinued or replaced',
        '💸 Consider donation for tax write-off if storage costs exceed value',
      ],
      seasonal: [
        '🎯 Plan inventory 60-90 days ahead of seasonal peaks',
        '📅 Create advance order campaigns to capture early demand',
        '💾 Use historical data to right-size seasonal inventory levels',
        '🔄 Have post-season clearance plan ready to avoid dead stock',
      ],
    };

    res.json({ recommendations });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

module.exports = {
  SALE_SEGMENTS,
  determineSaleSegment,
  getSaleSegmentOverview: exports.getSaleSegmentOverview,
  getCategoryDetail: exports.getCategoryDetail,
  getSaleRecommendations: exports.getSaleRecommendations,
};