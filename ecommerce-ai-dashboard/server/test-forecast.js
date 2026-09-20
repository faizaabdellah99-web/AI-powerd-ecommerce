require('dotenv').config();
const mongoose = require('mongoose');
const Order = require('./models/Order.model');

async function test() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Count orders in last 12 months
    const twelveMonthsAgo = new Date();
    twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);
    const orders = await Order.find({
      paymentStatus: 'paid',
      createdAt: { $gte: twelveMonthsAgo },
    });
    console.log(`✅ Found ${orders.length} paid orders in last 12 months`);

    // Build monthly aggregation (same as controller logic)
    const monthNames = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    const monthRevenue = {};

    for (let i = 11; i >= 0; i--) {
      const d = new Date(); d.setMonth(d.getMonth() - i);
      const key = monthNames[d.getMonth()];
      monthRevenue[key] = 0;
    }

    orders.forEach(o => {
      const d = new Date(o.createdAt);
      const key = monthNames[d.getMonth()];
      if (monthRevenue[key] !== undefined) {
        monthRevenue[key] += o.total || 0;
      }
    });

    console.log('📊 Monthly revenue (oldest → newest):');
    Object.entries(monthRevenue).forEach(([m, v]) => {
      console.log(`   ${m}: $${(v/1000).toFixed(1)}k`);
    });

    // OLD logic (slice(0, 6)) - takes OLDEST 6 months
    const oldData = Object.entries(monthRevenue).slice(0, 6).filter(([_, v]) => v > 0);
    console.log(`\n❌ OLD logic (slice(0,6)): ${oldData.length} months with data → ${oldData.length >= 2 ? 'can forecast' : 'FAILS: Not enough data'}`);

    // NEW logic (slice(-6)) - takes MOST RECENT 6 months
    const newData = Object.entries(monthRevenue).slice(-6).filter(([_, v]) => v > 0);
    console.log(`✅ NEW logic (slice(-6)): ${newData.length} months with data → ${newData.length >= 2 ? 'can forecast' : 'FAIL: Not enough data'}`);

    if (newData.length >= 2) {
      const revenueValues = newData.map(([_, v]) => v);
      const n = revenueValues.length;
      const points = revenueValues.map((y, x) => ({ x, y }));
      const sumX = points.reduce((s, p) => s + p.x, 0);
      const sumY = points.reduce((s, p) => s + p.y, 0);
      const sumXY = points.reduce((s, p) => s + p.x * p.y, 0);
      const sumX2 = points.reduce((s, p) => s + p.x * p.x, 0);
      const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
      const intercept = (sumY - slope * sumX) / n;
      const nextX = n;
      const forecastRevenue = Math.max(0, Math.round(slope * nextX + intercept));
      console.log(`\n🔮 Predicted next month revenue: $${(forecastRevenue/1000).toFixed(0)}k`);
      console.log(`   Actual data used: ${newData.map(([m, v]) => `${m}=$${(v/1000).toFixed(0)}k`).join(', ')}`);
    }

    await mongoose.disconnect();
    console.log('\n✅ Test complete');
  } catch (err) {
    console.error('❌ Test error:', err.message);
    process.exit(1);
  }
}

run();
</｜DSML｜>
<task_progress>
- [x] Explore project structure
- [x] Examine AdminDashboard and forecast pages
- [x] Examine forecast/revenue controllers and routes
- [x] Check AI services integration
- [x] Identify why data isn't showing
- [x] Fix the issue
- [ ] Verify the fix
</task_progress>
</｜DSML｜>