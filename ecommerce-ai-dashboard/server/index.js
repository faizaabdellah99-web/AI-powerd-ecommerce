const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const { createServer } = require('http');
const { Server } = require('socket.io');
require('dotenv').config();

const app = express();
const httpServer = createServer(app);

// ─── Socket.io ───────────────────────────────────────────────────────────────
const io = new Server(httpServer, {
  cors: { origin: process.env.CLIENT_URL || 'http://localhost:3000', methods: ['GET', 'POST'] }
});

// ─── Middleware ───────────────────────────────────────────────────────────────
app.use(helmet());
app.use(morgan('dev'));
app.use(cors({ origin: process.env.CLIENT_URL || 'http://localhost:3000', credentials: true }));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Rate limiting
const limiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 500 });
app.use('/api/', limiter);

// ─── Routes ───────────────────────────────────────────────────────────────────
app.use('/api/auth',              require('./routes/auth.routes'));
app.use('/api/products',          require('./routes/product.routes'));
app.use('/api/orders',            require('./routes/order.routes'));
app.use('/api/users',             require('./routes/user.routes'));
app.use('/api/ai',                require('./routes/ai.routes'));
app.use('/api/feedback',          require('./routes/feedback.routes'));

// ─── Segmentation routes ──────────────────────────────────────────────────────
app.use('/api/segments',          require('./routes/segment.routes'));
app.use('/api/product-segments',  require('./routes/productSegment.routes'));
app.use('/api/sale-segments',     require('./routes/saleSegment.routes'));
app.use('/api/sales-aggregation', require('./routes/salesAggregation.routes'));

// ─── Competitor routes ───────────────────────────────────────────────────────
app.use('/api/competitor',        require('./routes/competitor.routes'));

// ─── Revenue & Top Products routes ───────────────────────────────────────────
app.use('/api/revenue',           require('./routes/revenue.routes'));
app.use('/api/top-products',      require('./routes/topProducts.routes'));

// Health check
app.get('/health', (req, res) => res.json({ status: 'OK', timestamp: new Date() }));

// ─── MongoDB ──────────────────────────────────────────────────────────────────
mongoose
  .connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/ecommerce_ai')
  .then(() => console.log('✅ MongoDB connected'))
  .catch(err => console.error('❌ MongoDB error:', err));

// ─── Socket events ────────────────────────────────────────────────────────────
io.on('connection', socket => {
  console.log('🔌 Client connected:', socket.id);

  socket.on('join-vendor', vendorId => socket.join(`vendor-${vendorId}`));
  socket.on('join-customer', customerId => socket.join(`customer-${customerId}`));

  socket.on('disconnect', () => console.log('🔌 Client disconnected:', socket.id));
});

// Export io for use in controllers
app.set('io', io);

// ─── Expiry Date Checker (runs every 30 min) ───────────────────────────────────
const Product = require('./models/Product.model');
const User = require('./models/User.model');

async function checkExpiryDates() {
  try {
    const today = new Date();
    const products = await Product.find({ expiryDate: { $ne: null } });
    const expiring7Days = [];
    const expiring15Days = [];
    const expired = [];

    products.forEach(p => {
      const daysLeft = Math.ceil((new Date(p.expiryDate) - today) / 86400000);
      if (daysLeft <= 0) {
        expired.push({ name: p.name, expiryDate: p.expiryDate, category: p.category });
      } else if (daysLeft <= 7) {
        expiring7Days.push({ name: p.name, daysLeft, expiryDate: p.expiryDate, category: p.category });
      } else if (daysLeft <= 15) {
        expiring15Days.push({ name: p.name, daysLeft, expiryDate: p.expiryDate, category: p.category });
      }
    });

    // Send dashboard notification for products expiring in 7 days
    if (expiring7Days.length > 0 && io) {
      io.emit('expiry-alert', { expiringSoon: expiring7Days, expiredCount: expired.length, threshold: 7 });
      console.log(`🔔 Expiry alert sent: ${expiring7Days.length} products expiring in 7 days`);
    }

    // Send dashboard notification for products expiring in 15 days
    if (expiring15Days.length > 0 && io) {
      io.emit('expiry-alert', { expiringSoon: expiring15Days, expiredCount: expired.length, threshold: 15 });
      console.log(`🔔 Expiry alert sent: ${expiring15Days.length} products expiring in 15 days`);
    }

    // Send email notifications to admin and vendors
    if (expiring7Days.length > 0 || expiring15Days.length > 0) {
      const adminsAndVendors = await User.find({ role: { $in: ['admin', 'vendor'] } });
      adminsAndVendors.forEach(user => {
        if (user.email) {
          console.log(`📧 Would send expiry email to ${user.email}:`);
          console.log(`   - ${expiring7Days.length} products expiring in 7 days`);
          console.log(`   - ${expiring15Days.length} products expiring in 15 days`);
          // TODO: Implement actual email sending with nodemailer
          // sendExpiryEmail(user.email, expiring7Days, expiring15Days);
        }
      });
    }
  } catch (e) {
    console.error('Expiry checker error:', e.message);
  }
}

// Run every 30 minutes after initial 1-min delay
setTimeout(() => {
  checkExpiryDates();
  setInterval(checkExpiryDates, 30 * 60 * 1000);
}, 60 * 1000);

// ─── Start ────────────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 5000;
httpServer.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
