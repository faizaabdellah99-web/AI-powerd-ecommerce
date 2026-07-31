/**
 * seedOrders.js — Generate realistic demo orders for the last 6 months
 *
 * This populates the Admin Dashboard with real chart data, category breakdowns,
 * top products, revenue stats, and AI forecast data.
 *
 * Usage:
 *   cd server
 *   node seedOrders.js
 *
 * Prerequisites: Run seed.js and seedProducts.js first so users & products exist.
 */

require('dotenv').config();
const mongoose = require('mongoose');

const MONGO_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/ecommerce_ai';

// ── Minimal schemas (mirrors server models) ──────────────────────────────────
const userSchema = new mongoose.Schema({
  name: String, email: String, password: String, role: String,
  isActive: { type: Boolean, default: true },
  customerDescription: String, customerSegment: String,
  preferences: [String], location: String,
}, { timestamps: true });

const productSchema = new mongoose.Schema({
  name: String, description: String, price: Number, category: String,
  stock: Number, isActive: { type: Boolean, default: true },
  brand: String, tags: [String],
  ratings: { average: Number, count: Number },
  salesHistory: [{
    date: Date, quantity: Number, revenue: Number,
  }],
}, { timestamps: true });

const orderItemSchema = new mongoose.Schema({
  productId: String, productName: String, category: String,
  price: Number, qty: Number,
}, { _id: false });

const orderSchema = new mongoose.Schema({
  customer: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  orderId: { type: String, unique: true },
  items: [orderItemSchema],
  subtotal: Number, shipping: { type: Number, default: 0 },
  tax: { type: Number, default: 0 }, total: Number,
  status: { type: String, default: 'delivered' },
  paymentMethod: { type: String, default: 'card' },
  paymentStatus: { type: String, default: 'paid' },
  shippingAddress: {
    fullName: String, phone: String, city: String,
    subCity: String, woreda: String, street: String,
  },
  timeline: [{
    status: String, timestamp: { type: Date, default: Date.now }, note: String,
  }],
  createdAt: Date,
}, { timestamps: true });

const User = mongoose.models.User || mongoose.model('User', userSchema);
const Product = mongoose.models.Product || mongoose.model('Product', productSchema);
const Order = mongoose.models.Order || mongoose.model('Order', orderSchema);

// ── Demo data generation ─────────────────────────────────────────────────────

const CITIES = [
  'Addis Ababa, Ethiopia', 'Dire Dawa, Ethiopia', 'Bahir Dar, Ethiopia',
  'Hawassa, Ethiopia', 'Gondar, Ethiopia', 'Mekelle, Ethiopia',
  'Jimma, Ethiopia', 'Adama, Ethiopia',
];

const SUB_CITIES = ['Bole', 'Kirkos', 'Yeka', 'Lideta', 'Arada', 'Gulele', 'Nifas Silk', 'Kolfe Keranio'];

const STATUSES = ['delivered', 'delivered', 'delivered', 'delivered', 'shipped', 'confirmed'];
const PAYMENT_METHODS = ['card', 'card', 'card', 'card', 'cod', 'card'];

// Product categories and their typical price ranges
const CATEGORY_PRICE_RANGES = {
  'Electronics':     { min: 49, max: 1099 },
  'Fashion':         { min: 29, max: 189 },
  'Food & Beverage': { min: 1.5, max: 13 },
  'Sports & Fitness': { min: 18, max: 199 },
  'Books':           { min: 14, max: 42 },
  'Home & Living':   { min: 28, max: 129 },
  'Beauty & Care':   { min: 12, max: 24 },
  'Health':          { min: 18, max: 39 },
  'Toys':            { min: 49, max: 49 },
};

function randomBetween(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomFloat(min, max, decimals = 2) {
  return parseFloat((Math.random() * (max - min) + min).toFixed(decimals));
}

function randomItem(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function generateOrderId(index) {
  return 'ORD-' + String(10001 + index).padStart(5, '0');
}

// ── Main seed function ───────────────────────────────────────────────────────
async function seedOrders() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('✅ Connected to MongoDB:', MONGO_URI);

    // Check if orders already exist
    const existingOrders = await Order.countDocuments();
    if (existingOrders > 0) {
      console.log(`⚠️  ${existingOrders} orders already exist.`);
      console.log('   To re-seed, run: node seedOrders.js --force');
      if (!process.argv.includes('--force')) {
        console.log('   Exiting without changes.');
        process.exit(0);
      }
      await Order.deleteMany({});
      console.log('🗑  Cleared existing orders');
    }

    // Fetch users and products from DB
    const customer = await User.findOne({ role: 'customer' });
    if (!customer) {
      console.error('❌ No customer user found. Run node seed.js first.');
      process.exit(1);
    }

    const products = await Product.find({ isActive: true });
    if (products.length === 0) {
      console.error('❌ No products found. Run node seedProducts.js first.');
      process.exit(1);
    }

    console.log(`👤 Using customer: ${customer.name} (${customer.email})`);
    console.log(`📦 Found ${products.length} products to generate orders from\n`);

    // ── Generate 6 months of realistic order data ──────────────────────────
    const now = new Date();
    const orders = [];
    const productSalesMap = {}; // Track sales per product for salesHistory

    // Initialize product sales tracking
    products.forEach(p => {
      productSalesMap[p._id.toString()] = { product: p, sales: [] };
    });

    // Generate 80-120 orders spread across 6 months
    const numOrders = randomBetween(80, 120);
    console.log(`🔄 Generating ${numOrders} demo orders...`);

    for (let i = 0; i < numOrders; i++) {
      // Random date within last 6 months
      const daysAgo = randomBetween(0, 180);
      const orderDate = new Date(now.getTime() - daysAgo * 86400000);
      orderDate.setHours(randomBetween(8, 22), randomBetween(0, 59), randomBetween(0, 59));

      // Pick 1-4 random products for this order
      const numItems = randomBetween(1, 4);
      const orderProducts = [];
      const usedIndices = new Set();

      for (let j = 0; j < numItems; j++) {
        let idx;
        do {
          idx = randomBetween(0, products.length - 1);
        } while (usedIndices.has(idx) && usedIndices.size < products.length);
        usedIndices.add(idx);

        const product = products[idx];
        const qty = randomBetween(1, 3);
        const price = product.price || randomFloat(
          CATEGORY_PRICE_RANGES[product.category]?.min || 10,
          CATEGORY_PRICE_RANGES[product.category]?.max || 100
        );

        orderProducts.push({
          productId: product._id.toString(),
          productName: product.name,
          category: product.category || 'Other',
          price,
          qty,
        });

        // Track for salesHistory
        if (productSalesMap[product._id.toString()]) {
          productSalesMap[product._id.toString()].sales.push({
            date: orderDate,
            quantity: qty,
            revenue: price * qty,
          });
        }
      }

      const subtotal = orderProducts.reduce((s, item) => s + item.price * item.qty, 0);
      const shipping = subtotal > 50 ? 0 : randomFloat(3, 8);
      const tax = parseFloat((subtotal * 0.15).toFixed(2));
      const total = parseFloat((subtotal + shipping + tax).toFixed(2));
      const status = randomItem(STATUSES);
      const paymentMethod = randomItem(PAYMENT_METHODS);
      const city = randomItem(CITIES);
      const subCity = randomItem(SUB_CITIES);

      const order = {
        customer: customer._id,
        orderId: generateOrderId(i),
        items: orderProducts,
        subtotal,
        shipping,
        tax,
        total,
        status,
        paymentMethod,
        paymentStatus: paymentMethod === 'cod' ? 'unpaid' : 'paid',
        shippingAddress: {
          fullName: customer.name,
          phone: '+251-9' + randomBetween(10, 99) + '-' + randomBetween(100, 999) + '-' + randomBetween(1000, 9999),
          city,
          subCity,
          woreda: String(randomBetween(1, 20)),
          street: 'Street ' + randomBetween(1, 50),
        },
        timeline: [
          { status: 'confirmed', timestamp: new Date(orderDate.getTime() + 1000), note: 'Order placed' },
        ],
        createdAt: orderDate,
      };

      // Add more timeline entries for delivered orders
      if (status === 'delivered') {
        order.timeline.push(
          { status: 'shipped', timestamp: new Date(orderDate.getTime() + 86400000), note: 'Order shipped' },
          { status: 'delivered', timestamp: new Date(orderDate.getTime() + 3 * 86400000), note: 'Order delivered successfully' }
        );
      } else if (status === 'shipped') {
        order.timeline.push(
          { status: 'shipped', timestamp: new Date(orderDate.getTime() + 86400000), note: 'Order shipped' }
        );
      }

      orders.push(order);
    }

    // Sort orders by date (oldest first for consistent orderId generation)
    orders.sort((a, b) => a.createdAt - b.createdAt);

    // Re-assign orderIds based on sorted order
    orders.forEach((order, idx) => {
      order.orderId = generateOrderId(idx);
    });

    // Insert all orders
    const inserted = await Order.insertMany(orders);
    console.log(`✅ Inserted ${inserted.length} orders\n`);

    // ── Update product salesHistory ────────────────────────────────────────
    console.log('🔄 Updating product sales history...');
    let updatedProducts = 0;

    for (const [productId, data] of Object.entries(productSalesMap)) {
      if (data.sales.length > 0) {
        // Keep only last 365 days
        const oneYearAgo = new Date(Date.now() - 365 * 86400000);
        const recentSales = data.sales.filter(s => s.date > oneYearAgo);

        await Product.findByIdAndUpdate(productId, {
          $push: { salesHistory: { $each: recentSales } },
        });
        updatedProducts++;
      }
    }
    console.log(`✅ Updated sales history for ${updatedProducts} products\n`);

    // ── Summary ────────────────────────────────────────────────────────────
    const byCategory = {};
    const byMonth = {};
    let totalRevenue = 0;
    let totalQty = 0;

    orders.forEach(order => {
      totalRevenue += order.total;
      const monthKey = order.createdAt.toLocaleString('default', { month: 'short', year: 'numeric' });
      byMonth[monthKey] = (byMonth[monthKey] || 0) + 1;

      order.items.forEach(item => {
        const cat = item.category || 'Other';
        byCategory[cat] = (byCategory[cat] || 0) + item.qty;
        totalQty += item.qty;
      });
    });

    console.log('📊 Order Summary:');
    console.log(`   Total orders:   ${orders.length}`);
    console.log(`   Total revenue:  $${totalRevenue.toLocaleString()}`);
    console.log(`   Total items:    ${totalQty}`);
    console.log(`   Avg order:      $${(totalRevenue / orders.length).toFixed(2)}`);
    console.log('');

    console.log('📅 Orders by Month:');
    Object.entries(byMonth)
      .sort((a, b) => new Date(a[0]) - new Date(b[0]))
      .forEach(([month, count]) => {
        console.log(`   ${month.padEnd(15)} ${count} orders`);
      });
    console.log('');

    console.log('🏷️  Items by Category:');
    Object.entries(byCategory)
      .sort((a, b) => b[1] - a[1])
      .forEach(([cat, count]) => {
        console.log(`   ${cat.padEnd(22)} ${count} items`);
      });
    console.log('');

    console.log('🎉 Done! The Admin Dashboard will now show:');
    console.log('   • Revenue & Sales Forecast chart with 6 months of data');
    console.log('   • Top Products ranking');
    console.log('   • Sales by Category pie chart');
    console.log('   • Monthly Orders bar chart');
    console.log('   • Order stats (total, pending, today)');
    console.log('   • AI Forecast analysis with real data');
    console.log('');
    console.log('👉 Login at http://localhost:3000 with admin@demo.com / demo123');

  } catch (err) {
    console.error('❌ Seed failed:', err.message);
    console.error(err);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
}

seedOrders();