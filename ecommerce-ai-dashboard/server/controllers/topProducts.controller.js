const Order = require('../models/Order.model');
const Product = require('../models/Product.model');
const axios = require('axios');

// ── Gemini REST helper (same pattern as other controllers) ────────────────────
const MODELS = [
  'gemini-2.5-flash',
  'gemini-2.0-flash',
  'gemini-2.0-flash-lite',
  'gemini-1.5-flash',
  'gemini-1.5-flash-8b',
];

function getKey() {
  const key = (process.env.GEMINI_API_KEY || '').trim();
  if (!key || key === 'your_gemini_api_key_here') {
    throw new Error('GEMINI_API_KEY is not set in server/.env');
  }
  return key;
}

async function callGemini(prompt) {
  const key = getKey();
  const body = { contents: [{ parts: [{ text: prompt }] }] };

  let lastErr;
  for (const model of MODELS) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;
    const headers = [
      { 'x-goog-api-key': key, 'Content-Type': 'application/json' },
      { 'Authorization': `Bearer ${key}`, 'Content-Type': 'application/json' },
    ];
    for (const h of headers) {
      try {
        const resp = await axios.post(url, body, { headers: h, timeout: 30000 });
        const text = resp.data?.candidates?.[0]?.content?.parts?.[0]?.text;
        if (text) return text;
      } catch (e) {
        lastErr = e;
        const status = e.response?.status;
        const msg = (e.response?.data?.error?.message || '').toLowerCase();
        if (status !== 429 && !msg.includes('quota')) {
          if (status === 401 || status === 403) break;
          throw e;
        }
        const retryMs = (() => {
          const raw = e.response?.data?.error?.message || '';
          const m = raw.match(/retry in ([\d.]+)s/i);
          return m ? Math.min(parseFloat(m[1]) * 1000, 5000) : 1000;
        })();
        await new Promise(r => setTimeout(r, retryMs));
        break;
      }
    }
  }
  throw lastErr || new Error('All Gemini models exceeded quota');
}

/**
 * GET /api/top-products
 * MongoDB Aggregation: Top selling products by revenue, quantity, and order count
 * Query params:
 *   - days: number of days to look back (default: all time)
 *   - limit: number of top products to return (default: 10)
 *   - category: filter by category
 */
exports.getTopProducts = async (req, res) => {
  try {
    const { days, limit = 10, category } = req.query;
    const topN = Math.min(Math.max(parseInt(limit) || 10, 1), 50);

    // Build match stage for orders — only paid (delivered COD is auto-marked paid)
    const matchStage = { paymentStatus: 'paid' };

    if (days && !isNaN(parseInt(days))) {
      const since = new Date(Date.now() - parseInt(days) * 86400000);
      matchStage.createdAt = { $gte: since };
    }

    // Build match stage for items (optional category filter)
    const itemMatchStage = {};
    if (category && category !== 'all') {
      itemMatchStage.category = { $regex: new RegExp(category, 'i') };
    }

    const result = await Order.aggregate([
      // Filter orders
      { $match: matchStage },
      // Unwind items
      { $unwind: { path: '$items', preserveNullAndEmptyArrays: false } },
      // Optional category filter on items
      { $match: itemMatchStage },
      // Group by product name
      {
        $group: {
          _id: '$items.productName',
          category: { $first: { $ifNull: ['$items.category', 'Other'] } },
          totalRevenue: { $sum: { $multiply: ['$items.price', '$items.qty'] } },
          totalQuantity: { $sum: '$items.qty' },
          orderCount: { $addToSet: '$_id' },
          avgUnitPrice: { $avg: '$items.price' },
          lastSaleDate: { $max: '$createdAt' },
          firstSaleDate: { $min: '$createdAt' },
        },
      },
      // Count unique orders
      {
        $addFields: {
          orderCount: { $size: '$orderCount' },
        },
      },
      // Sort by totalRevenue descending
      { $sort: { totalRevenue: -1 } },
      // Limit results
      { $limit: topN },
      // Shape the output
      {
        $project: {
          _id: 0,
          name: '$_id',
          category: 1,
          totalRevenue: { $round: ['$totalRevenue', 2] },
          totalQuantity: 1,
          orderCount: 1,
          avgUnitPrice: { $round: ['$avgUnitPrice', 2] },
          lastSaleDate: 1,
          firstSaleDate: 1,
        },
      },
    ]);

    // Calculate period-based metrics for trend analysis
    const now = new Date();
    const periodMatch = { paymentStatus: 'paid' };

    // Current period (last 30 days)
    const currentPeriodStart = new Date(now.getTime() - 30 * 86400000);
    const prevPeriodStart = new Date(now.getTime() - 60 * 86400000);

    const [currentPeriod, previousPeriod] = await Promise.all([
      Order.aggregate([
        { $match: { ...periodMatch, createdAt: { $gte: currentPeriodStart } } },
        { $unwind: '$items' },
        { $match: itemMatchStage },
        {
          $group: {
            _id: '$items.productName',
            revenue: { $sum: { $multiply: ['$items.price', '$items.qty'] } },
            qty: { $sum: '$items.qty' },
            orders: { $addToSet: '$_id' },
          },
        },
        {
          $addFields: {
            orders: { $size: '$orders' },
          },
        },
      ]),
      Order.aggregate([
        { $match: { ...periodMatch, createdAt: { $gte: prevPeriodStart, $lt: currentPeriodStart } } },
        { $unwind: '$items' },
        { $match: itemMatchStage },
        {
          $group: {
            _id: '$items.productName',
            revenue: { $sum: { $multiply: ['$items.price', '$items.qty'] } },
            qty: { $sum: '$items.qty' },
          },
        },
      ]),
    ]);

    // Build period lookup maps
    const currentMap = {};
    currentPeriod.forEach(p => { currentMap[p._id] = p; });
    const prevMap = {};
    previousPeriod.forEach(p => { prevMap[p._id] = p; });

    // Fetch stock data from Products collection for top products
    const topProductNames = result.map(p => p.name);
    const stockData = await Product.find({
      name: { $in: topProductNames },
    }).select('name stock reorderPoint isActive').lean();
    const stockMap = {};
    stockData.forEach(p => { stockMap[p.name] = p; });

    // Compute trend, growth, and enrich results
    const enriched = result.map((p, idx) => {
      const current = currentMap[p.name] || { revenue: 0, qty: 0, orders: 0 };
      const previous = prevMap[p.name] || { revenue: 0, qty: 0 };
      const prevRev = previous.revenue || 0;
      const trendPct = prevRev > 0
        ? Math.round(((current.revenue - prevRev) / prevRev) * 100)
        : (current.revenue > 0 ? 100 : 0);

      const stock = stockMap[p.name] || { stock: 0, reorderPoint: 10, isActive: false };

      // Generate a color based on rank
      const colors = ['#6366f1', '#8b5cf6', '#10b981', '#f59e0b', '#ef4444', '#3b82f6', '#f97316', '#14b8a6', '#84cc16', '#dc2626'];

      return {
        rank: idx + 1,
        name: p.name,
        category: p.category,
        totalRevenue: p.totalRevenue,
        totalQuantity: p.totalQuantity,
        orderCount: p.orderCount,
        avgUnitPrice: p.avgUnitPrice,
        currentPeriodRevenue: current.revenue,
        currentPeriodQty: current.qty,
        previousPeriodRevenue: previous.revenue,
        growth: trendPct,
        trend: trendPct >= 0 ? 'up' : 'down',
        trendLabel: `${trendPct >= 0 ? '↑' : '↓'} ${Math.abs(trendPct)}%`,
        lastSaleDate: p.lastSaleDate,
        currentStock: stock.stock || 0,
        reorderPoint: stock.reorderPoint || 10,
        lowStock: (stock.stock || 0) <= (stock.reorderPoint || 10),
        color: colors[idx % colors.length],
      };
    });

    // Calculate grand total and percentages
    const grandTotalRevenue = enriched.reduce((s, p) => s + p.totalRevenue, 0) || 1;
    const dataWithPercentages = enriched.map(p => ({
      ...p,
      revenueShare: Math.round((p.totalRevenue / grandTotalRevenue) * 100),
      revenueFormatted: `$${p.totalRevenue.toLocaleString()}`,
    }));

    res.json({
      topProducts: dataWithPercentages.length > 0 ? dataWithPercentages : [],
      grandTotalRevenue: grandTotalRevenue || 0,
      totalProducts: dataWithPercentages.length,
      empty: dataWithPercentages.length === 0,
    });
  } catch (err) {
    console.error('Top Products Aggregation Error:', err.message);
    res.status(500).json({ message: err.message });
  }
};

/**
 * GET /api/top-products/ai-insights
 * Generate AI-powered insights for top products using Gemini
 */
exports.getTopProductsAIInsights = async (req, res) => {
  try {
    const { days = 90, limit = 10 } = req.query;
    const topN = Math.min(Math.max(parseInt(limit) || 10, 1), 20);

    // Fetch top products data
    const since = new Date(Date.now() - parseInt(days) * 86400000);
    const prevPeriodStart = new Date(since.getTime() - parseInt(days) * 86400000);

    const [currentData, previousData, productData] = await Promise.all([
      Order.aggregate([
        { $match: { paymentStatus: 'paid', createdAt: { $gte: since } } },
        { $unwind: '$items' },
        {
          $group: {
            _id: '$items.productName',
            category: { $first: { $ifNull: ['$items.category', 'Other'] } },
            revenue: { $sum: { $multiply: ['$items.price', '$items.qty'] } },
            qty: { $sum: '$items.qty' },
            orders: { $addToSet: '$_id' },
          },
        },
        { $addFields: { orders: { $size: '$orders' } } },
        { $sort: { revenue: -1 } },
        { $limit: topN },
      ]),
      Order.aggregate([
        { $match: { paymentStatus: 'paid', createdAt: { $gte: prevPeriodStart, $lt: since } } },
        { $unwind: '$items' },
        {
          $group: {
            _id: '$items.productName',
            revenue: { $sum: { $multiply: ['$items.price', '$items.qty'] } },
          },
        },
      ]),
      Product.find({ isActive: true })
        .select('name stock reorderPoint category price')
        .sort({ stock: 1 })
        .limit(10)
        .lean(),
    ]);

    // Build previous period lookup
    const prevMap = {};
    previousData.forEach(p => { prevMap[p._id] = p.revenue; });

    // Enrich with growth
    const enriched = currentData.map(p => {
      const prevRev = prevMap[p._id] || 0;
      const growth = prevRev > 0 ? Math.round(((p.revenue - prevRev) / prevRev) * 100) : 100;
      const stockInfo = productData.find(sp => sp.name.toLowerCase() === p._id.toLowerCase());
      return {
        name: p._id,
        category: p.category,
        revenue: p.revenue,
        qty: p.qty,
        orders: p.orders,
        growth,
        stock: stockInfo?.stock || 0,
        reorderPoint: stockInfo?.reorderPoint || 10,
        lowStock: (stockInfo?.stock || 0) <= (stockInfo?.reorderPoint || 10),
      };
    }).sort((a, b) => b.revenue - a.revenue);

    const topProductsStr = enriched.slice(0, 5).map((p, i) =>
      `${i + 1}. ${p.name} (${p.category}) - $${(p.revenue / 1000).toFixed(1)}k, ${p.growth >= 0 ? '+' : ''}${p.growth}% growth, ${p.qty} units sold`
    ).join('\n');

    const lowStockStr = enriched.filter(p => p.lowStock).map(p =>
      `${p.name} (${p.stock} left, reorder at ${p.reorderPoint})`
    ).join(', ');

    // Build category breakdown
    const catRevenue = {};
    enriched.forEach(p => {
      if (!catRevenue[p.category]) catRevenue[p.category] = 0;
      catRevenue[p.category] += p.revenue;
    });
    const catStr = Object.entries(catRevenue)
      .sort((a, b) => b[1] - a[1])
      .map(([cat, rev]) => `${cat}: $${(rev / 1000).toFixed(1)}k`)
      .join(', ');

    const totalRevenue = enriched.reduce((s, p) => s + p.revenue, 0);
    const totalQty = enriched.reduce((s, p) => s + p.qty, 0);

    // Build AI prompt
    const prompt = `You are a senior e-commerce product analyst. Analyze this top products data and provide actionable insights.

TOP PRODUCTS (last ${days} days):
${topProductsStr || 'No product sales data available'}

CATEGORY BREAKDOWN:
${catStr || 'No category data'}

INVENTORY ALERTS:
${lowStockStr || 'No low stock products'}

TOTAL TOP PRODUCTS REVENUE: $${(totalRevenue / 1000).toFixed(1)}k
TOTAL UNITS SOLD: ${totalQty}
NUMBER OF PRODUCTS ANALYZED: ${enriched.length}

Return ONLY raw JSON (no markdown, no code fences):
{
  "summary": "2-3 sentence executive summary of top products performance with key numbers",
  "topPerformer": {
    "name": "best performing product name",
    "revenue": number,
    "growth": number,
    "reason": "one sentence why it's performing well"
  },
  "risingStar": {
    "name": "product with highest growth potential",
    "growth": number,
    "reason": "one sentence about growth potential"
  },
  "categoryInsights": "one sentence about category performance",
  "inventoryRecommendations": [
    {"product": "product name", "action": "restock|promote|bundle|discount|clearance", "reason": "specific data-driven reason with numbers"}
  ],
  "riskAlerts": [
    {"type": "stockout|overstock|declining|opportunity", "severity": "high|medium|low", "message": "specific alert with numbers"}
  ],
  "actionableInsights": [
    "4 specific actionable recommendations with numbers, each as a string"
  ],
  "confidenceScore": number between 0 and 1
}`;

    let aiAnalysis = null;
    try {
      const aiReply = await callGemini(prompt);
      const clean = aiReply.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim();
      const match = clean.match(/\{[\s\S]*\}/);
      if (match) aiAnalysis = JSON.parse(match[0]);
    } catch (aiErr) {
      console.error('Gemini top products analysis error:', aiErr.message);
      // Fallback analysis
      const top = enriched[0];
      const rising = [...enriched].sort((a, b) => b.growth - a.growth)[0];
      aiAnalysis = {
        summary: `Top ${enriched.length} products generated $${(totalRevenue / 1000).toFixed(1)}k revenue with ${totalQty} units sold. ${top ? top.name + ' leads with $' + (top.revenue / 1000).toFixed(1) + 'k.' : ''} ${lowStockStr ? lowStockStr.split(', ').length + ' products need restocking.' : ''}`,
        topPerformer: top ? {
          name: top.name,
          revenue: top.revenue,
          growth: top.growth,
          reason: `Top revenue generator with ${top.growth >= 0 ? '+' : ''}${top.growth}% growth`,
        } : null,
        risingStar: rising ? {
          name: rising.name,
          growth: rising.growth,
          reason: `${rising.growth >= 0 ? '+' : ''}${rising.growth}% growth rate — highest momentum`,
        } : null,
        categoryInsights: `Top categories: ${catStr}`,
        inventoryRecommendations: enriched.filter(p => p.lowStock).slice(0, 3).map(p => ({
          product: p.name,
          action: 'restock',
          reason: `Only ${p.stock} units remaining (reorder at ${p.reorderPoint})`,
        })).concat(enriched.slice(0, 2).map(p => ({
          product: p.name,
          action: 'promote',
          reason: `Strong performer with $${(p.revenue / 1000).toFixed(1)}k revenue — increase visibility`,
        }))),
        riskAlerts: enriched.filter(p => p.lowStock).length > 0
          ? [{ type: 'stockout', severity: 'high', message: `${enriched.filter(p => p.lowStock).length} top products critically low on stock` }]
          : [{ type: 'opportunity', severity: 'low', message: 'All top products have adequate stock levels' }],
        actionableInsights: [
          `Focus marketing on ${enriched[0]?.name || 'top product'} — generated $${(enriched[0]?.revenue / 1000 || 0).toFixed(1)}k revenue`,
          `${lowStockStr ? 'Restock: ' + lowStockStr : 'Monitor inventory levels for top products'}`,
          `Bundle ${enriched[1]?.name || 'complementary products'} with ${enriched[0]?.name || 'top seller'} to increase basket size`,
          `Review pricing for ${enriched[enriched.length - 1]?.name || 'lower performing products'} to improve margins`,
        ],
        confidenceScore: 0.7,
      };
    }

    res.json({
      success: true,
      products: enriched.slice(0, topN),
      analysis: aiAnalysis,
      summary: {
        totalRevenue,
        totalQty,
        productCount: enriched.length,
        topProduct: enriched[0]?.name || 'N/A',
        topCategory: Object.entries(catRevenue).sort((a, b) => b[1] - a[1])[0]?.[0] || 'N/A',
        lowStockCount: enriched.filter(p => p.lowStock).length,
      },
      period: parseInt(days),
    });
  } catch (err) {
    console.error('Top Products AI Insights Error:', err.message);
    res.status(500).json({ success: false, message: err.message });
  }
};