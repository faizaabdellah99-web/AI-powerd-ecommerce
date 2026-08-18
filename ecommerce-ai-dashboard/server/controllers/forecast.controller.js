const Order = require('../models/Order.model');
const Product = require('../models/Product.model');
const axios = require('axios');

// ── Gemini REST helper (same pattern as ai.controller.js) ────────────────────
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
 * GET /api/orders/ai-forecast
 * Fetches real sales data from MongoDB + Gemini AI to generate comprehensive forecast
 */
exports.getAIForecast = async (req, res) => {
  try {
    const now = new Date();
    const sixMonthsAgo = new Date(); sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
    const twelveMonthsAgo = new Date(); twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);

    // ── Fetch real data ────────────────────────────────────────────────────
    const [orders, topProductsByStock] = await Promise.all([
      Order.find({
        paymentStatus: 'paid',
        createdAt: { $gte: twelveMonthsAgo },
      }).populate('customer', 'name email location'),
      Product.find({ isActive: true }).sort({ stock: -1 }).limit(10).select('name category price stock salesHistory'),
    ]);

    // ── Monthly revenue aggregation ────────────────────────────────────────
    const monthNames = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    const monthRevenue = {};
    const monthOrders = {};
    const monthProductSales = {};

    for (let i = 11; i >= 0; i--) {
      const d = new Date(); d.setMonth(d.getMonth() - i);
      const key = monthNames[d.getMonth()];
      monthRevenue[key] = 0;
      monthOrders[key] = 0;
      monthProductSales[key] = {};
    }

    orders.forEach(o => {
      const d = new Date(o.createdAt);
      const key = monthNames[d.getMonth()];
      if (monthRevenue[key] !== undefined) {
        monthRevenue[key] += o.total || 0;
        // Count total product quantity (e.g. 5 products = 5 orders)
        const totalQty = (o.items || []).reduce((sum, item) => sum + (item.qty || 0), 0);
        monthOrders[key] += totalQty || 1;
        (o.items || []).forEach(item => {
          const pName = item.productName || 'Unknown';
          if (!monthProductSales[key][pName]) monthProductSales[key][pName] = 0;
          monthProductSales[key][pName] += (item.price || 0) * (item.qty || 0);
        });
      }
    });

    // ── Category performance ───────────────────────────────────────────────
    const categoryRevenue = {};
    const categoryCount = {};
    orders.forEach(o => {
      (o.items || []).forEach(item => {
        const cat = item.category || 'Other';
        if (!categoryRevenue[cat]) { categoryRevenue[cat] = 0; categoryCount[cat] = 0; }
        categoryRevenue[cat] += (item.price || 0) * (item.qty || 0);
        categoryCount[cat] += item.qty || 0;
      });
    });

    // ── Build monthly trend string ─────────────────────────────────────────
    const actualMonths = Object.entries(monthRevenue).slice(0, 6).filter(([_, v]) => v > 0);
    const revenueTrend = actualMonths.map(([m, v]) => `${m}: $${(v / 1000).toFixed(0)}k`).join(', ');
    const orderTrend = Object.entries(monthOrders).slice(0, 6).filter(([_, v]) => v > 0).map(([m, v]) => `${m}: ${v} orders`).join(', ');

    // ── Top products recent 3 months ───────────────────────────────────────
    const recent3Months = Object.entries(monthProductSales).slice(0, 3);
    const productAgg = {};
    recent3Months.forEach(([_, prods]) => {
      Object.entries(prods).forEach(([name, rev]) => {
        if (!productAgg[name]) productAgg[name] = 0;
        productAgg[name] += rev;
      });
    });
    const topProducts = Object.entries(productAgg)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([name, rev], i) => `${i + 1}. ${name} ($${(rev / 1000).toFixed(0)}k)`);

    // ── Category breakdown ─────────────────────────────────────────────────
    const totalCatRev = Object.values(categoryRevenue).reduce((s, v) => s + v, 0) || 1;
    const catBreakdown = Object.entries(categoryRevenue)
      .sort((a, b) => b[1] - a[1])
      .map(([cat, rev]) => `${cat}: ${Math.round((rev / totalCatRev) * 100)}%`);

    // ── Stock / inventory insights ─────────────────────────────────────────
    const lowStockProducts = topProductsByStock.filter(p => p.stock <= (p.reorderPoint || 10));
    const highStockProducts = topProductsByStock.filter(p => p.stock > 100);

    // ── Linear regression forecast (server-side calculation) ──────────────
    const actualData = Object.entries(monthRevenue).slice(0, 6).filter(([_, v]) => v > 0);
    const revenueValues = actualData.map(([_, v]) => v);
    const n = revenueValues.length;

    let forecastRevenue = null;
    let forecastOrders = null;
    let growthRate = 0;

    if (n >= 2) {
      const points = revenueValues.map((y, x) => ({ x, y }));
      const sumX = points.reduce((s, p) => s + p.x, 0);
      const sumY = points.reduce((s, p) => s + p.y, 0);
      const sumXY = points.reduce((s, p) => s + p.x * p.y, 0);
      const sumX2 = points.reduce((s, p) => s + p.x * p.x, 0);
      const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
      const intercept = (sumY - slope * sumX) / n;

      const orderPoints = Object.entries(monthOrders).slice(0, 6).filter(([_, v]) => v > 0).map(([_, y], x) => ({ x, y }));
      const oSumX = orderPoints.reduce((s, p) => s + p.x, 0);
      const oSumY = orderPoints.reduce((s, p) => s + p.y, 0);
      const oSumXY = orderPoints.reduce((s, p) => s + p.x * p.y, 0);
      const oSumX2 = orderPoints.reduce((s, p) => s + p.x * p.x, 0);
      const oSlope = (n * oSumXY - oSumX * oSumY) / (n * oSumX2 - oSumX * oSumX);
      const oIntercept = (oSumY - oSlope * oSumX) / n;

      const nextX = n;
      forecastRevenue = Math.max(0, Math.round(slope * nextX + intercept));
      forecastOrders = Math.max(0, Math.round(oSlope * nextX + oIntercept));

      // Growth rate from first to last actual month
      const firstRev = revenueValues[0] || 1;
      const lastRev = revenueValues[n - 1] || 1;
      growthRate = Math.round(((lastRev - firstRev) / firstRev) * 100);

      // Generate 5-month forecast (Aug, Sep, Oct, Nov, Dec)
      const nextMonths = [];
      for (let i = 1; i <= 5; i++) {
        const x = n - 1 + i;
        const fRev = Math.max(0, Math.round(slope * x + intercept));
        const fOrd = Math.max(0, Math.round(oSlope * x + oIntercept));
        const d = new Date(); d.setMonth(d.getMonth() + i);
        nextMonths.push({
          month: monthNames[d.getMonth()],
          revenue: fRev,
          orders: fOrd,
          growth: i === 1 ? Math.round(((fRev - (revenueValues[n - 1] || 0)) / (revenueValues[n - 1] || 1)) * 100) : 0,
        });
      }

      // ── Call Gemini AI for deeper analysis ───────────────────────────────
      const prompt = `You are a senior e-commerce data analyst. Analyze this real sales data and provide a comprehensive forecast.

REVENUE TREND (last 6 months):
${revenueTrend || 'No revenue data available'}

ORDER TREND:
${orderTrend || 'No order data available'}

CATEGORY BREAKDOWN:
${catBreakdown.join('\n') || 'No category data'}

TOP PRODUCTS (last 3 months by revenue):
${topProducts.join('\n') || 'No product data'}

SERVER CALCULATED FORECAST:
- Next month projected revenue: $${(forecastRevenue / 1000).toFixed(0)}k
- Next month projected orders: ${forecastOrders}
- Growth rate (6-month): ${growthRate}%

INVENTORY INSIGHTS:
- Low stock products: ${lowStockProducts.length > 0 ? lowStockProducts.map(p => `${p.name} (${p.stock} left)`).join(', ') : 'None'}
- Overstocked products: ${highStockProducts.length > 0 ? highStockProducts.map(p => `${p.name} (${p.stock} units)`).join(', ') : 'None'}

TOTAL ORDERS ANALYZED: ${orders.length}
TOTAL REVENUE: $${(orders.reduce((s, o) => s + (o.total || 0), 0) / 1000).toFixed(0)}k

Return ONLY raw JSON (no markdown, no code fences):
{
  "summary": "2-3 sentence executive summary of the overall forecast with key numbers",
  "growthAnalysis": {
    "trend": "increasing|decreasing|stable",
    "growthRate": "${growthRate}",
    "momentum": "strong|moderate|weak",
    "keyDriver": "the main product or category driving growth"
  },
  "categoryForecast": {
    "topCategory": "name of highest performing category",
    "risingCategory": "category with most growth potential",
    "decliningCategory": "category that needs attention (or null)"
  },
  "productRecommendations": [
    {"product": "product name", "action": "increase stock|promote|bundle|discount", "reason": "specific data-driven reason"}
  ],
  "riskAlerts": [
    {"type": "stockout|overstock|declining|opportunity", "severity": "high|medium|low", "message": "specific alert message with numbers"}
  ],
  "actionableInsights": [
    "4 specific actionable recommendations with numbers, each as a string"
  ],
  "confidenceScore": "number between 0 and 1"
}`;

      let aiAnalysis = null;
      try {
        const aiReply = await callGemini(prompt);
        const clean = aiReply.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim();
        const match = clean.match(/\{[\s\S]*\}/);
        if (match) aiAnalysis = JSON.parse(match[0]);
      } catch (aiErr) {
        console.error('Gemini forecast analysis error:', aiErr.message);
        // Fallback: generate analysis server-side
        aiAnalysis = {
          summary: `Revenue trending ${growthRate >= 0 ? 'up' : 'down'} at ${Math.abs(growthRate)}% over 6 months. Next month projected at $${(forecastRevenue / 1000).toFixed(0)}k with ${forecastOrders} orders.`,
          growthAnalysis: {
            trend: growthRate >= 10 ? 'increasing' : growthRate <= -10 ? 'decreasing' : 'stable',
            growthRate: `${growthRate}%`,
            momentum: growthRate >= 15 ? 'strong' : growthRate >= 0 ? 'moderate' : 'weak',
            keyDriver: topProducts[0]?.split('. ')[1]?.replace(/\(.*\)/, '').trim() || 'N/A',
          },
          categoryForecast: {
            topCategory: catBreakdown[0]?.split(':')[0] || 'N/A',
            risingCategory: catBreakdown.length > 1 ? catBreakdown[1]?.split(':')[0] : null,
            decliningCategory: null,
          },
          productRecommendations: lowStockProducts.slice(0, 3).map(p => ({
            product: p.name,
            action: 'increase stock',
            reason: `Only ${p.stock} units remaining — risk of stockout`,
          })).concat(topProducts.slice(0, 2).map((t, i) => {
            const name = t.split('. ')[1]?.replace(/\(.*?\)/, '').trim() || 'Top product';
            return { product: name, action: i === 0 ? 'promote' : 'bundle', reason: 'Strong sales momentum — maximize revenue' };
          })),
          riskAlerts: lowStockProducts.length > 0 ? [{ type: 'stockout', severity: 'high', message: `${lowStockProducts.length} products low on stock — reorder immediately` }] : [],
          actionableInsights: [
            `Increase stock for top-selling products to capture projected $${(forecastRevenue / 1000).toFixed(0)}k revenue`,
            `Focus marketing on ${catBreakdown[0]?.split(':')[0] || 'top'} category — ${catBreakdown[0]?.split(':')[1]?.trim() || 'top performer'} of revenue`,
            `Monitor ${lowStockProducts.length > 0 ? lowStockProducts.map(p => p.name).join(', ') : 'inventory levels'} to prevent stockouts`,
            `Optimize pricing in ${catBreakdown[catBreakdown.length - 1]?.split(':')[0] || 'underperforming'} category to improve margins`,
          ],
          confidenceScore: 0.75,
        };
      }

      res.json({
        success: true,
        forecast: nextMonths,
        analysis: aiAnalysis,
        summary: {
          totalRevenue: orders.reduce((s, o) => s + (o.total || 0), 0),
          totalOrders: orders.length,
          growthRate,
          nextMonthRevenue: forecastRevenue,
          nextMonthOrders: forecastOrders,
          topCategory: catBreakdown[0]?.split(':')[0] || 'N/A',
          topProduct: topProducts[0]?.split('. ')[1]?.replace(/\(.*?\)/, '').trim() || 'N/A',
        },
      });
    } else {
      // Not enough data
      res.json({
        success: true,
        forecast: [],
        analysis: {
          summary: 'Not enough sales data to generate a reliable forecast. Need at least 2 months of data.',
          growthAnalysis: { trend: 'stable', growthRate: '0%', momentum: 'weak', keyDriver: 'N/A' },
          categoryForecast: { topCategory: 'N/A', risingCategory: null, decliningCategory: null },
          productRecommendations: [],
          riskAlerts: [{ type: 'opportunity', severity: 'low', message: 'Start recording sales to enable AI forecast analysis' }],
          actionableInsights: ['Add products and start selling to generate AI forecast insights'],
          confidenceScore: 0,
        },
        summary: {
          totalRevenue: 0,
          totalOrders: orders.length,
          growthRate: 0,
          nextMonthRevenue: 0,
          nextMonthOrders: 0,
          topCategory: 'N/A',
          topProduct: 'N/A',
        },
      });
    }
  } catch (err) {
    console.error('AI Forecast Error:', err.message);
    res.status(500).json({ success: false, message: err.message });
  }
};