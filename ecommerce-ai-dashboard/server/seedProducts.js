/**
 * seedProducts.js — Seed sample products into MongoDB
 * Usage: cd server && node seedProducts.js
 */
require('dotenv').config();
const mongoose = require('mongoose');

const MONGO_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/ecommerce_ai';

const productSchema = new mongoose.Schema({
  name:        String,
  description: String,
  price:       Number,
  category:    String,
  stock:       Number,
  isActive:    { type: Boolean, default: true },
  brand:       String,
  warranty:    String,
  sizes:       [String],
  colors:      [String],
  expiryDate:  Date,
  isPerishable:Boolean,
  tags:        [String],
  ratings:     { average: Number, count: Number },
}, { timestamps: true });

const Product = mongoose.models.Product || mongoose.model('Product', productSchema);

const PRODUCTS = [
  // ── Electronics ────────────────────────────────────────────────────────────
  {
    name:'Sony WH-1000XM5 Headphones', category:'Electronics', price:349, stock:25,
    description:'Wireless noise-cancelling headphones with 30-hour battery, LDAC, and multipoint Bluetooth.',
    brand:'Sony', warranty:'1 year',
    tags:['headphone','wireless','noise cancelling'],
    ratings:{ average:4.9, count:1204 }, isActive:true,
  },
  {
    name:'Samsung Galaxy S24', category:'Electronics', price:799, stock:18,
    description:'Android flagship with Snapdragon 8 Gen 3, 50MP camera, and 7 years of OS updates.',
    brand:'Samsung', warranty:'1 year',
    tags:['smartphone','android','samsung'],
    ratings:{ average:4.8, count:521 }, isActive:true,
  },
  {
    name:'MacBook Air M2', category:'Electronics', price:1099, stock:10,
    description:'Fanless ultrabook with Apple M2 chip, 18-hour battery, and 13.6-inch Liquid Retina display.',
    brand:'Apple', warranty:'1 year',
    tags:['laptop','apple','macbook'],
    ratings:{ average:4.9, count:876 }, isActive:true,
  },
  {
    name:'Mechanical Gaming Keyboard', category:'Electronics', price:89, stock:40,
    description:'TKL mechanical keyboard with Cherry MX Red switches, RGB backlighting, and aluminium frame.',
    brand:'Logitech', warranty:'2 years',
    tags:['keyboard','gaming','mechanical'],
    ratings:{ average:4.6, count:445 }, isActive:true,
  },
  {
    name:'4K Webcam Ultra HD', category:'Electronics', price:79, stock:30,
    description:'4K 30fps webcam with autofocus, noise-cancelling mic, and plug-and-play USB-C.',
    brand:'Logitech', warranty:'2 years',
    tags:['webcam','4k','streaming'],
    ratings:{ average:4.5, count:213 }, isActive:true,
  },
  {
    name:'USB-C Hub 10-in-1', category:'Electronics', price:55, stock:60,
    description:'10-port hub with 4K HDMI, 100W PD, SD card reader, 3×USB-A, and Ethernet.',
    brand:'Anker', warranty:'18 months',
    tags:['usb hub','adapter','multi port'],
    ratings:{ average:4.4, count:678 }, isActive:true,
  },
  {
    name:'Portable Solar Charger 20000mAh', category:'Electronics', price:49, stock:35,
    description:'Dual USB solar power bank with 20000mAh capacity, waterproof, and LED flashlight.',
    brand:'Anker', warranty:'1 year',
    tags:['solar','power bank','portable'],
    ratings:{ average:4.3, count:189 }, isActive:true,
  },

  // ── Fashion ─────────────────────────────────────────────────────────────────
  {
    name:'Wool Blend Winter Coat', category:'Fashion', price:189, stock:20,
    description:'Slim-fit mid-length coat in 70% wool and 30% polyester blend, fully lined.',
    sizes:['XS','S','M','L','XL','XXL'], colors:['Camel','Black','Grey','Navy'],
    tags:['coat','winter','wool'],
    ratings:{ average:4.6, count:97 }, isActive:true,
  },
  {
    name:'Running Sneakers Ultra Boost', category:'Fashion', price:129, stock:45,
    description:'Responsive running shoe with Boost foam midsole, Primeknit upper, and Continental rubber outsole.',
    brand:'Adidas', sizes:['38','39','40','41','42','43','44','45'], colors:['White','Black','Blue','Red'],
    tags:['sneakers','running','adidas'],
    ratings:{ average:4.7, count:380 }, isActive:true,
  },
  {
    name:'Premium Slim Fit Jeans', category:'Fashion', price:65, stock:55,
    description:'Stretch denim jeans in slim-fit cut, 98% cotton and 2% elastane for comfort.',
    sizes:['28','30','32','34','36','38'], colors:['Dark Blue','Light Blue','Black'],
    tags:['jeans','denim','slim fit'],
    ratings:{ average:4.3, count:278 }, isActive:true,
  },
  {
    name:'Classic Leather Wallet', category:'Fashion', price:45, stock:70,
    description:'Bifold leather wallet with 6 card slots, cash compartment, and RFID blocking.',
    colors:['Brown','Black','Tan'],
    tags:['wallet','leather','rfid'],
    ratings:{ average:4.5, count:512 }, isActive:true,
  },
  {
    name:'Polarised Sunglasses', category:'Fashion', price:59, stock:38,
    description:'UV400 polarised lenses with TR90 frame. Suitable for driving, fishing, and outdoor sports.',
    colors:['Black/Grey','Brown/Gold','Blue/Silver'],
    tags:['sunglasses','polarised','uv400'],
    ratings:{ average:4.4, count:163 }, isActive:true,
  },
  {
    name:'Cotton Hoodie Unisex', category:'Fashion', price:48, stock:65,
    description:'Heavyweight 380gsm cotton fleece hoodie with kangaroo pocket and adjustable drawstring.',
    sizes:['XS','S','M','L','XL','XXL','3XL'], colors:['Black','White','Olive','Burgundy','Navy'],
    tags:['hoodie','cotton','unisex'],
    ratings:{ average:4.6, count:430 }, isActive:true,
  },

  // ── Food & Beverage ──────────────────────────────────────────────────────────
  {
    name:'Whole Milk 1 Litre', category:'Food & Beverage', price:1.50, stock:120,
    description:'Fresh full-fat whole milk, pasteurised and homogenised. Rich in calcium and vitamin D.',
    isPerishable:true, expiryDate: new Date(Date.now() + 7*86400000),
    tags:['milk','dairy','fresh'],
    ratings:{ average:4.7, count:234 }, isActive:true,
  },
  {
    name:'Arabica Coffee Beans 500g', category:'Food & Beverage', price:12.99, stock:80,
    description:'Single-origin Ethiopian Yirgacheffe arabica beans, medium roast, with notes of blueberry and chocolate.',
    isPerishable:false, expiryDate: new Date(Date.now() + 180*86400000),
    tags:['coffee','arabica','ethiopian'],
    ratings:{ average:4.9, count:567 }, isActive:true,
  },
  {
    name:'Extra Virgin Olive Oil 750ml', category:'Food & Beverage', price:8.50, stock:60,
    description:'Cold-pressed extra virgin olive oil from Greek Kalamata olives. Acidity below 0.3%.',
    isPerishable:false, expiryDate: new Date(Date.now() + 540*86400000),
    tags:['olive oil','cooking','greek'],
    ratings:{ average:4.8, count:312 }, isActive:true,
  },
  {
    name:'Greek Yoghurt 500g', category:'Food & Beverage', price:3.20, stock:90,
    description:'Strained Greek yoghurt with 10% fat, high protein, no added sugar or preservatives.',
    isPerishable:true, expiryDate: new Date(Date.now() + 14*86400000),
    tags:['yoghurt','greek','protein'],
    ratings:{ average:4.7, count:189 }, isActive:true,
  },
  {
    name:'Organic Honey 500g', category:'Food & Beverage', price:9.99, stock:50,
    description:'Raw unfiltered organic wildflower honey, cold extracted to preserve enzymes and antioxidants.',
    isPerishable:false, expiryDate: new Date(Date.now() + 1095*86400000),
    tags:['honey','organic','raw'],
    ratings:{ average:4.8, count:445 }, isActive:true,
  },
  {
    name:'Instant Oats 1kg', category:'Food & Beverage', price:4.50, stock:150,
    description:'Whole grain rolled oats, ready in 3 minutes. High in fibre and beta-glucan.',
    isPerishable:false, expiryDate: new Date(Date.now() + 365*86400000),
    tags:['oats','breakfast','whole grain'],
    ratings:{ average:4.6, count:278 }, isActive:true,
  },

  // ── Sports & Fitness ─────────────────────────────────────────────────────────
  {
    name:'Adjustable Dumbbell Set 2–24kg', category:'Sports & Fitness', price:199, stock:15,
    description:'Selectorized dumbbell pair adjustable from 2kg to 24kg in 2kg increments. Replaces 12 pairs.',
    tags:['dumbbell','weights','gym'],
    ratings:{ average:4.8, count:304 }, isActive:true,
  },
  {
    name:'Yoga Mat Premium 6mm', category:'Sports & Fitness', price:58, stock:40,
    description:'Non-slip 6mm TPE yoga mat, 183×61cm, with alignment lines and carrying strap.',
    colors:['Purple','Black','Blue','Pink'],
    tags:['yoga','mat','exercise'],
    ratings:{ average:4.7, count:612 }, isActive:true,
  },
  {
    name:'Insulated Water Bottle 1 Litre', category:'Sports & Fitness', price:32, stock:85,
    description:'Double-wall stainless steel vacuum flask. Keeps cold 24hr, hot 12hr. BPA-free lid.',
    colors:['Black','Silver','Navy','Olive'],
    tags:['water bottle','insulated','stainless'],
    ratings:{ average:4.7, count:823 }, isActive:true,
  },
  {
    name:'Resistance Band Set (5 levels)', category:'Sports & Fitness', price:24, stock:100,
    description:'Set of 5 latex resistance bands: 10/20/30/40/50 lbs. Includes carry bag and guide.',
    colors:['Multicolor'],
    tags:['resistance band','stretching','workout'],
    ratings:{ average:4.6, count:891 }, isActive:true,
  },
  {
    name:'Tennis Racket Pro 300g', category:'Sports & Fitness', price:110, stock:22,
    description:'100% graphite frame, 100sq inch head, string tension 52–62 lbs. For intermediate players.',
    tags:['tennis','racket','graphite'],
    ratings:{ average:4.4, count:143 }, isActive:true,
  },
  {
    name:'Jump Rope Speed Cable', category:'Sports & Fitness', price:18, stock:120,
    description:'Adjustable 3m speed rope with ball-bearing handles. Suitable for CrossFit, boxing, and HIIT.',
    tags:['jump rope','skipping','cardio'],
    ratings:{ average:4.5, count:567 }, isActive:true,
  },

  // ── Books ────────────────────────────────────────────────────────────────────
  {
    name:'Atomic Habits — James Clear', category:'Books', price:16, stock:200,
    description:'Practical guide to building good habits and breaking bad ones using tiny 1% improvements daily.',
    tags:['habits','self-help','productivity'],
    ratings:{ average:4.9, count:1204 }, isActive:true,
  },
  {
    name:'Deep Work — Cal Newport', category:'Books', price:15, stock:180,
    description:'Rules for focused success in a distracted world — how to produce elite work in less time.',
    tags:['focus','productivity','work'],
    ratings:{ average:4.7, count:876 }, isActive:true,
  },
  {
    name:'The Design of Everyday Things', category:'Books', price:18, stock:90,
    description:'Don Norman\'s classic on how design shapes human psychology and everyday interactions.',
    tags:['design','ux','psychology'],
    ratings:{ average:4.8, count:543 }, isActive:true,
  },
  {
    name:'Clean Code — Robert C. Martin', category:'Books', price:42, stock:75,
    description:'Handbook of agile software craftsmanship covering naming, functions, objects, and boundaries.',
    tags:['programming','software','coding'],
    ratings:{ average:4.6, count:712 }, isActive:true,
  },
  {
    name:'The Pragmatic Programmer', category:'Books', price:38, stock:60,
    description:'20th Anniversary Edition — your journey to mastery with topics from careers to concurrency.',
    tags:['programming','software engineering','pragmatic'],
    ratings:{ average:4.7, count:489 }, isActive:true,
  },
  {
    name:'Sapiens — Yuval Noah Harari', category:'Books', price:14, stock:160,
    description:'Brief history of humankind from the Stone Age through the political and technological revolutions.',
    tags:['history','humanity','science'],
    ratings:{ average:4.8, count:1890 }, isActive:true,
  },

  // ── Home & Living ────────────────────────────────────────────────────────────
  {
    name:'Ceramic Pour-Over Coffee Set', category:'Home & Living', price:55, stock:35,
    description:'Hand-thrown ceramic dripper, server, and two cups. Brews a clean, bright 400ml cup in 3 minutes.',
    colors:['White','Matte Black','Terracotta'],
    tags:['coffee','ceramic','pour over'],
    ratings:{ average:4.8, count:467 }, isActive:true,
  },
  {
    name:'Memory Foam Pillow', category:'Home & Living', price:42, stock:55,
    description:'Contour memory foam pillow with removable bamboo cover. Supports neck and spine alignment.',
    tags:['pillow','memory foam','sleep'],
    ratings:{ average:4.6, count:593 }, isActive:true,
  },
  {
    name:'Bamboo Cutting Board Set (3 pcs)', category:'Home & Living', price:32, stock:70,
    description:'Set of 3 organic bamboo boards: small, medium, large. Juice groove on large board.',
    tags:['cutting board','bamboo','kitchen'],
    ratings:{ average:4.5, count:229 }, isActive:true,
  },
  {
    name:'Scented Soy Candle Set (4 pcs)', category:'Home & Living', price:28, stock:80,
    description:'Hand-poured soy wax candles with cotton wick. Scents: lavender, vanilla, eucalyptus, sandalwood.',
    tags:['candle','soy','aromatherapy'],
    ratings:{ average:4.7, count:341 }, isActive:true,
  },
  {
    name:'Indoor Herb Garden Kit', category:'Home & Living', price:36, stock:45,
    description:'Self-watering planter with 5 seed pods (basil, parsley, mint, thyme, coriander) and LED grow light.',
    tags:['herb garden','indoor plant','kitchen'],
    ratings:{ average:4.4, count:175 }, isActive:true,
  },
  {
    name:'Stainless Steel Kitchen Knife Set (5 pcs)', category:'Home & Living', price:75, stock:30,
    description:'German steel knife block set: chef 20cm, bread 20cm, santoku 18cm, utility 13cm, paring 9cm.',
    tags:['knife','kitchen','chef'],
    ratings:{ average:4.8, count:398 }, isActive:true,
  },
  {
    name:'Air Purifier HEPA H13', category:'Home & Living', price:129, stock:20,
    description:'True HEPA H13 filter removes 99.97% of particles ≥0.3μm. Coverage 40m². Auto mode + sleep mode.',
    tags:['air purifier','hepa','clean air'],
    ratings:{ average:4.7, count:234 }, isActive:true,
  },

  // ── Beauty & Care ────────────────────────────────────────────────────────────
  {
    name:'Vitamin C Serum 30ml', category:'Beauty & Care', price:24, stock:60,
    description:'15% L-ascorbic acid serum with hyaluronic acid and vitamin E. Brightens and firms skin.',
    tags:['serum','vitamin c','skincare'],
    ratings:{ average:4.6, count:378 }, isActive:true,
  },
  {
    name:'Natural Shampoo Bar', category:'Beauty & Care', price:12, stock:100,
    description:'Plastic-free solid shampoo with argan oil and biotin. Sulphate-free, vegan. 80 washes per bar.',
    tags:['shampoo','natural','eco friendly'],
    ratings:{ average:4.5, count:267 }, isActive:true,
  },

  // ── Health ───────────────────────────────────────────────────────────────────
  {
    name:'Vitamin D3 + K2 Supplement (90 caps)', category:'Health', price:18, stock:90,
    description:'2000 IU vitamin D3 paired with 100mcg MK-7 K2 for calcium absorption and bone health.',
    isPerishable:false, expiryDate: new Date(Date.now() + 730*86400000),
    tags:['vitamin d','supplement','bone health'],
    ratings:{ average:4.8, count:445 }, isActive:true,
  },
  {
    name:'Whey Protein Isolate 1kg', category:'Health', price:39, stock:45,
    description:'90% protein per serving, low lactose, fast-absorbing CFM whey isolate. Chocolate flavour.',
    isPerishable:false, expiryDate: new Date(Date.now() + 365*86400000),
    tags:['protein','whey','gym supplement'],
    ratings:{ average:4.7, count:612 }, isActive:true,
  },

  // ── Toys ─────────────────────────────────────────────────────────────────────
  {
    name:'LEGO Technic Racing Car 420 pcs', category:'Toys', price:49, stock:30,
    description:'Build a detailed racing car with working steering and gear shift. Ages 10+.',
    tags:['lego','technic','building'],
    ratings:{ average:4.9, count:234 }, isActive:true,
  },
];

async function seed() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('✅ Connected to MongoDB');

    const existing = await Product.countDocuments();
    if (existing > 0) {
      console.log(`⚠️  ${existing} products already exist. Skipping seed.`);
      console.log('   To re-seed, run: node seedProducts.js --force');
      if (!process.argv.includes('--force')) {
        process.exit(0);
      }
      await Product.deleteMany({});
      console.log('🗑  Cleared existing products');
    }

    const result = await Product.insertMany(PRODUCTS);
    console.log(`\n✅ Successfully seeded ${result.length} products:\n`);

    const byCategory = {};
    result.forEach(p => {
      byCategory[p.category] = (byCategory[p.category] || 0) + 1;
    });
    Object.entries(byCategory).sort((a,b)=>b[1]-a[1]).forEach(([cat, count]) => {
      console.log(`   ${cat.padEnd(22)} ${count} products`);
    });

    console.log('\n🎉 Done! Open the customer Shop to see all products.');
  } catch (err) {
    console.error('❌ Seed failed:', err.message);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
}

seed();
