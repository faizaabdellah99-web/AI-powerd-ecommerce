/**
 * Migration Script: Update delivered COD orders to paid status
 * 
 * Run: node migrateCodOrders.js
 * 
 * This script finds all orders that:
 *   - Have paymentMethod === 'cod'
 *   - Have status === 'delivered'
 *   - Have paymentStatus === 'unpaid'
 * 
 * And updates them to paymentStatus === 'paid'
 * since cash was collected upon delivery.
 */

const mongoose = require('mongoose');
const path = require('path');

// Load env
require('dotenv').config({ path: path.join(__dirname, '.env') });

const Order = require('./models/Order.model');

async function migrate() {
  try {
    const uri = process.env.MONGO_URI || process.env.MONGODB_URI;
    if (!uri) {
      console.error('❌ MONGO_URI not found in .env file');
      process.exit(1);
    }

    await mongoose.connect(uri);
    console.log('✅ Connected to MongoDB');

    // Find delivered COD orders that are still unpaid
    const deliveredCodOrders = await Order.find({
      paymentMethod: 'cod',
      status: 'delivered',
      paymentStatus: 'unpaid',
    });

    console.log(`\n📋 Found ${deliveredCodOrders.length} delivered COD orders that need to be marked as paid`);

    if (deliveredCodOrders.length === 0) {
      console.log('✅ No orders to migrate. All delivered COD orders are already marked as paid.');
      await mongoose.disconnect();
      return;
    }

    // Show a preview
    console.log('\n📄 Preview of orders to update:');
    deliveredCodOrders.slice(0, 5).forEach(o => {
      console.log(`   ${o.orderId} — $${o.total?.toFixed(2)} — ${o.createdAt?.toISOString().slice(0, 10)}`);
    });
    if (deliveredCodOrders.length > 5) {
      console.log(`   ... and ${deliveredCodOrders.length - 5} more`);
    }

    // Update all delivered COD orders to paid
    const result = await Order.updateMany(
      {
        paymentMethod: 'cod',
        status: 'delivered',
        paymentStatus: 'unpaid',
      },
      {
        $set: { paymentStatus: 'paid' },
        $push: {
          timeline: {
            status: 'paid',
            timestamp: new Date(),
            note: 'Auto-marked as paid (COD — cash collected on delivery)',
          },
        },
      }
    );

    console.log(`\n✅ Updated ${result.modifiedCount} orders to paid status`);
    console.log('🎉 Migration complete!');

    await mongoose.disconnect();
    console.log('👋 Disconnected from MongoDB');
  } catch (err) {
    console.error('❌ Migration failed:', err.message);
    process.exit(1);
  }
}

migrate();