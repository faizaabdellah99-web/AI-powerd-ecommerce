const Order = require('../models/Order.model');

/**
 * GET /api/revenue/monthly-breakdown
 * Returns monthly revenue breakdown with comparison to total revenue,
 * percentage shares, and trend analysis.
 * Query params:
 *   - months: number of months to look back (default: 12)
 */
exports.getMonthlyRevenueBreakdown = async (req, res) => {
  try {
    const { months = 12 } = req.query;
    const lookbackMonths = Math.min(Math.max(parseInt(months) || 12, 1), 24);

    const now = new Date();
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - lookbackMonths);
    startDate.setDate(1);
    startDate.setHours(0, 0, 0, 0);

    // Fetch all paid orders in the period (delivered COD orders are auto-marked as paid)
    const orders = await Order.find({
      paymentStatus: 'paid',
      createdAt: { $gte: startDate },
    });

    const monthNames = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

    // Build monthly buckets
    const monthlyBuckets = {};
    for (let i = 0; i < lookbackMonths; i++) {
      const d = new Date();
      d.setMonth(d.getMonth() - (lookbackMonths - 1 - i));
      const key = `${d.getFullYear()}-${String(d.getMonth()).padStart(2, '0')}`;
      monthlyBuckets[key] = {
        year: d.getFullYear(),
        monthIndex: d.getMonth(),
        month: monthNames[d.getMonth()],
        label: `${monthNames[d.getMonth()]} ${d.getFullYear()}`,
        revenue: 0,
        orders: 0,
        itemsSold: 0,
        avgOrderValue: 0,
      };
    }

    // Populate monthly data — count each product item as an order entry
    orders.forEach(o => {
      const d = new Date(o.createdAt);
      const key = `${d.getFullYear()}-${String(d.getMonth()).padStart(2, '0')}`;
      if (monthlyBuckets[key]) {
        monthlyBuckets[key].revenue += o.total || 0;
        // Count total product quantity (e.g. 5 products = 5 orders)
        const totalQty = (o.items || []).reduce((sum, item) => sum + (item.qty || 0), 0);
        monthlyBuckets[key].orders += totalQty || 1;
        (o.items || []).forEach(item => {
          monthlyBuckets[key].itemsSold += item.qty || 0;
        });
      }
    });

    const monthlyData = Object.values(monthlyBuckets);

    // Calculate totals (orders = sum of product quantities)
    const totalRevenue = monthlyData.reduce((s, m) => s + m.revenue, 0) || 0;
    const totalOrders = monthlyData.reduce((s, m) => s + m.orders, 0);
    const totalItemsSold = monthlyData.reduce((s, m) => s + m.itemsSold, 0);

    // Enrich with percentage of total, cumulative revenue, avg order value
    let cumulative = 0;
    const enrichedData = monthlyData.map((m, idx) => {
      cumulative += m.revenue;
      const avgOrder = m.orders > 0 ? Math.round(m.revenue / m.orders) : 0;
      const pctOfTotal = totalRevenue > 0 ? parseFloat(((m.revenue / totalRevenue) * 100).toFixed(1)) : 0;

      // Trend vs previous month
      const prev = idx > 0 ? monthlyData[idx - 1].revenue : 0;
      const trendPct = prev > 0 ? Math.round(((m.revenue - prev) / prev) * 100) : null;

      return {
        ...m,
        revenue: Math.round(m.revenue),
        avgOrderValue: avgOrder,
        percentageOfTotal: pctOfTotal,
        cumulativeRevenue: Math.round(cumulative),
        trend: trendPct,
        trendLabel: trendPct !== null
          ? `${trendPct >= 0 ? '↑' : '↓'} ${Math.abs(trendPct)}%`
          : '—',
        up: trendPct !== null ? trendPct >= 0 : null,
      };
    });

    // Calculate growth rate (first month vs last month with data)
    const monthsWithData = enrichedData.filter(m => m.revenue > 0);
    const growthRate = (() => {
      if (monthsWithData.length < 2) return 0;
      const first = monthsWithData[0].revenue || 1;
      const last = monthsWithData[monthsWithData.length - 1].revenue || 1;
      return Math.round(((last - first) / first) * 100);
    })();

    // Category breakdown across entire period
    const categoryRevenue = {};
    orders.forEach(o => {
      (o.items || []).forEach(item => {
        const cat = item.category || 'Other';
        if (!categoryRevenue[cat]) categoryRevenue[cat] = 0;
        categoryRevenue[cat] += (item.price || 0) * (item.qty || 0);
      });
    });
    const catTotal = Object.values(categoryRevenue).reduce((s, v) => s + v, 0) || 1;
    const colors = ['#6366f1', '#8b5cf6', '#10b981', '#f59e0b', '#ef4444', '#3b82f6', '#f97316', '#14b8a6', '#84cc16', '#dc2626'];
    const categoryBreakdown = Object.entries(categoryRevenue)
      .sort((a, b) => b[1] - a[1])
      .map(([name, value], i) => ({
        name,
        revenue: Math.round(value),
        percentage: Math.round((value / catTotal) * 100),
        color: colors[i % colors.length],
      }));

    // Best & worst months
    const sortedByRevenue = [...enrichedData].filter(m => m.revenue > 0).sort((a, b) => b.revenue - a.revenue);
    const bestMonth = sortedByRevenue[0] || null;
    const worstMonth = sortedByRevenue[sortedByRevenue.length - 1] || null;

    // Linear regression forecast (next 5 months — Aug, Sep, Oct, Nov, Dec)
    const actualMonths = enrichedData.filter(m => m.revenue > 0).map((m, idx) => ({ x: idx, y: m.revenue }));
    const actualOrderMonths = enrichedData.filter(m => m.orders > 0).map((m, idx) => ({ x: idx, y: m.orders }));
    const n = actualMonths.length;
    const no = actualOrderMonths.length;
    let forecastMonths = [];
    let forecastTotalRevenue = 0;

    if (n >= 2) {
      const sumX = actualMonths.reduce((s, p) => s + p.x, 0);
      const sumY = actualMonths.reduce((s, p) => s + p.y, 0);
      const sumXY = actualMonths.reduce((s, p) => s + p.x * p.y, 0);
      const sumX2 = actualMonths.reduce((s, p) => s + p.x * p.x, 0);
      const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
      const intercept = (sumY - slope * sumX) / n;

      // Orders linear regression
      const oSumX = actualOrderMonths.reduce((s, p) => s + p.x, 0);
      const oSumY = actualOrderMonths.reduce((s, p) => s + p.y, 0);
      const oSumXY = actualOrderMonths.reduce((s, p) => s + p.x * p.y, 0);
      const oSumX2 = actualOrderMonths.reduce((s, p) => s + p.x * p.x, 0);
      const oSlope = no > 1 ? (no * oSumXY - oSumX * oSumY) / (no * oSumX2 - oSumX * oSumX) : 0;
      const oIntercept = no > 1 ? (oSumY - oSlope * oSumX) / no : actualOrderMonths[0]?.y || 0;

      for (let i = 1; i <= 5; i++) {
        const nextX = n - 1 + i;
        const predRev = Math.max(0, Math.round(slope * nextX + intercept));
        const predOrd = Math.max(0, Math.round(oSlope * nextX + oIntercept));
        const d = new Date();
        d.setMonth(d.getMonth() + i);
        forecastMonths.push({
          month: monthNames[d.getMonth()],
          year: d.getFullYear(),
          label: `${monthNames[d.getMonth()]} ${d.getFullYear()}`,
          revenue: predRev,
          orders: predOrd,
        });
        forecastTotalRevenue += predRev;
      }
    }

    res.json({
      success: true,
      summary: {
        totalRevenue: Math.round(totalRevenue),
        totalOrders,
        totalItemsSold,
        averageMonthlyRevenue: Math.round(totalRevenue / Math.max(enrichedData.filter(m => m.revenue > 0).length, 1)),
        growthRate,
        bestMonth: bestMonth ? { month: bestMonth.label, revenue: bestMonth.revenue } : null,
        worstMonth: worstMonth ? { month: worstMonth.label, revenue: worstMonth.revenue } : null,
        monthsAnalyzed: enrichedData.length,
        monthsWithData: monthsWithData.length,
      },
      monthlyBreakdown: enrichedData,
      categoryBreakdown,
      forecast: {
        nextMonths: forecastMonths,
        totalForecastRevenue: forecastTotalRevenue,
        hasData: n >= 2,
      },
    });
  } catch (err) {
    console.error('Revenue Monthly Breakdown Error:', err.message);
    res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * GET /api/revenue/daily-trends
 * Returns daily revenue for the last N days (for finer-grained charting)
 * Query params:
 *   - days: number of days to look back (default: 30)
 */
exports.getDailyRevenueTrends = async (req, res) => {
  try {
    const { days = 30 } = req.query;
    const lookbackDays = Math.min(Math.max(parseInt(days) || 30, 7), 365);

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - lookbackDays);
    startDate.setHours(0, 0, 0, 0);

    const orders = await Order.find({
      paymentStatus: 'paid',
      createdAt: { $gte: startDate },
    });

    // Build daily buckets
    const dailyBuckets = {};
    for (let i = 0; i < lookbackDays; i++) {
      const d = new Date();
      d.setDate(d.getDate() - (lookbackDays - 1 - i));
      const key = d.toISOString().slice(0, 10);
      dailyBuckets[key] = {
        date: key,
        label: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        revenue: 0,
        orders: 0,
        dayOfWeek: d.getDay(),
      };
    }

    orders.forEach(o => {
      const key = new Date(o.createdAt).toISOString().slice(0, 10);
      if (dailyBuckets[key]) {
        dailyBuckets[key].revenue += o.total || 0;
        // Count total product quantity (e.g. 5 products = 5 orders)
        const totalQty = (o.items || []).reduce((sum, item) => sum + (item.qty || 0), 0);
        dailyBuckets[key].orders += totalQty || 1;
      }
    });

    const dailyData = Object.values(dailyBuckets).map(d => ({
      ...d,
      revenue: Math.round(d.revenue),
    }));

    const totalRevenue = dailyData.reduce((s, d) => s + d.revenue, 0);
    const avgDailyRevenue = Math.round(totalRevenue / Math.max(dailyData.filter(d => d.revenue > 0).length, 1));

    res.json({
      success: true,
      summary: {
        totalRevenue,
        avgDailyRevenue,
        daysWithSales: dailyData.filter(d => d.revenue > 0).length,
        totalDays: lookbackDays,
      },
      dailyData,
    });
  } catch (err) {
    console.error('Daily Revenue Trends Error:', err.message);
    res.status(500).json({ success: false, message: err.message });
  }
};