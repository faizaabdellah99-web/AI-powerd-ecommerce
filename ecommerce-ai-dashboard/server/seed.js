/**
 * seed.js — Create demo users for quick testing
 *
 * Usage:
 *   cd server
 *   node seed.js
 *
 * Creates three demo accounts:
 *   admin@demo.com    / demo123  (role: admin)
 *   vendor@demo.com   / demo123  (role: vendor)
 *   customer@demo.com / demo123  (role: customer)
 */

require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt   = require('bcryptjs');

const MONGO_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/ecommerce_ai';

// Minimal User schema (mirrors server/models/User.js)
const userSchema = new mongoose.Schema({
  name:      { type: String, required: true },
  email:     { type: String, required: true, unique: true },
  password:  { type: String, required: true },
  role:      { type: String, enum: ['admin','vendor','customer'], default: 'customer' },
  isActive:  { type: Boolean, default: true },
  // Customer-specific fields
  customerDescription: { type: String, default: '' },
  customerSegment: { type: String, enum: ['new', 'occasional', 'regular', 'vip'], default: 'new' },
  preferences: { type: [String], default: [] },
  location: { type: String, default: '' },
}, { timestamps: true });

const User = mongoose.models.User || mongoose.model('User', userSchema);

const DEMO_USERS = [
  { name:'Admin User',    email:'admin@demo.com',    password:'demo123', role:'admin'    },
  { name:'Vendor User',   email:'vendor@demo.com',   password:'demo123', role:'vendor'   },
  { 
    name:'Customer User', 
    email:'customer@demo.com', 
    password:'demo123', 
    role:'customer',
    customerDescription: 'Active shopper interested in electronics and home products. Prefers quality over price and frequently purchases tech accessories.',
    customerSegment: 'regular',
    preferences: ['Electronics', 'Home & Living', 'Sports'],
    location: 'Addis Ababa, Ethiopia'
  },
];

async function seed() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('✅ Connected to MongoDB:', MONGO_URI);

    let created = 0;
    let skipped = 0;

    for (const u of DEMO_USERS) {
      const exists = await User.findOne({ email: u.email });
      if (exists) {
        console.log(`⏭  Skipped  ${u.email} (already exists)`);
        skipped++;
        continue;
      }
      const hashed = await bcrypt.hash(u.password, 10);
      await User.create({ ...u, password: hashed });
      console.log(`✅ Created  ${u.role.padEnd(8)} — ${u.email}`);
      created++;
    }

    console.log(`\n🎉 Seed complete: ${created} created, ${skipped} skipped`);
    console.log('\nDemo credentials:');
    DEMO_USERS.forEach(u =>
      console.log(`  ${u.role.padEnd(8)} → ${u.email.padEnd(24)} / demo123`)
    );
  } catch (err) {
    console.error('❌ Seed failed:', err.message);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
}

seed();
