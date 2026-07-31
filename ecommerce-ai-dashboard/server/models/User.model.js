const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const UserSchema = new mongoose.Schema({
  name:     { type: String, required: true, trim: true },
  email:    { type: String, required: true, unique: true, lowercase: true },
  password: { type: String, required: true, minlength: 6 },
  role:     { type: String, enum: ['admin', 'vendor', 'customer'], default: 'customer' },
  avatar:   { type: String, default: '' },

  // Customer-specific
  orderHistory:    [{ type: mongoose.Schema.Types.ObjectId, ref: 'Order' }],
  savedProducts:   [{ type: mongoose.Schema.Types.ObjectId, ref: 'Product' }],
  purchasePattern: { type: mongoose.Schema.Types.Mixed, default: {} },
  customerDescription: { type: String, default: '' },
  customerSegment: { type: String, enum: ['new', 'occasional', 'regular', 'vip'], default: 'new' },
  preferences: { type: [String], default: [] },
  location: { type: String, default: '' },

  // Vendor-specific
  storeName:  { type: String, default: '' },
  storeStats: { type: mongoose.Schema.Types.Mixed, default: {} },

  isActive:   { type: Boolean, default: true },
}, { timestamps: true });

// Hash password before save
UserSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

// Compare password
UserSchema.methods.matchPassword = async function (entered) {
  return bcrypt.compare(entered, this.password);
};

module.exports = mongoose.model('User', UserSchema);
