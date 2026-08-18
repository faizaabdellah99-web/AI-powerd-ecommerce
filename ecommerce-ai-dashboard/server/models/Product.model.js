const mongoose = require('mongoose');

const ProductSchema = new mongoose.Schema({
  vendor:      { type: mongoose.Schema.Types.ObjectId, ref: 'User' },  // optional — admin can create without vendor
  name:        { type: String, required: true, trim: true },
  description: { type: String, default: '' },
  price:       { type: Number, required: true, min: 0 },
  aiPrice:     { type: Number, default: null },
  category:    { type: String, required: true },
  tags:        [String],
  images:      [{ url: String, publicId: String }],
  imageVector: [Number],
  stock:       { type: Number, default: 0 },
  reorderPoint:{ type: Number, default: 10 },  // trigger low-stock alert below this
  isActive:    { type: Boolean, default: true },

  // Category-specific fields
  brand:       { type: String, default: '' },          // Electronics
  warranty:    { type: String, default: '' },          // Electronics
  sizes:       [String],                               // Clothing
  colors:      [String],                               // Clothing
  expiryDate:  { type: Date, default: null },          // Food & Beverage
  isPerishable:{ type: Boolean, default: false },      // Food & Beverage

  // Ratings & Reviews
  ratings: {
    average: { type: Number, default: 0 },
    count:   { type: Number, default: 0 },
  },
  reviews: [{
    user:      { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    rating:    { type: Number, required: true, min: 1, max: 5 },
    comment:   { type: String, default: '' },
    createdAt: { type: Date,   default: Date.now },
    // Note: user name is stored in User model — never exposed directly to other customers
  }],
  salesHistory: [{
    date:     Date,
    quantity: Number,
    revenue:  Number,
  }],
  forecastedDemand: { type: mongoose.Schema.Types.Mixed, default: null },

  // AI-generated content
  aiDescription: { type: String, default: '' },
  aiTags:        [String],

  ratings:  { average: { type: Number, default: 0 }, count: { type: Number, default: 0 } },
}, { timestamps: true });

// Text index for search
ProductSchema.index({ name: 'text', description: 'text', tags: 'text' });

module.exports = mongoose.model('Product', ProductSchema);
