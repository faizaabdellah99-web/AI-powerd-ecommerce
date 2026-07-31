const mongoose = require('mongoose');

const orderItemSchema = new mongoose.Schema({
  productId:   { type: String, required: true },
  productName: { type: String, required: true },
  category:    { type: String, default: '' },
  price:       { type: Number, required: true },
  qty:         { type: Number, required: true, min: 1 },
}, { _id: false });

const OrderSchema = new mongoose.Schema({
  customer:    { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  orderId:     { type: String, unique: true },          // e.g. ORD-12345
  items:       [orderItemSchema],
  subtotal:    { type: Number, required: true },
  shipping:    { type: Number, default: 0 },
  tax:         { type: Number, default: 0 },
  total:       { type: Number, required: true },
  status: {
    type:    String,
    enum:    ['pending','confirmed','shipped','out_for_delivery','delivered','cancelled'],
    default: 'confirmed',
  },
  paymentMethod:  { type: String, default: 'cod' },
  paymentStatus:  { type: String, enum: ['unpaid','paid','refunded'], default: 'unpaid' },
  shippingAddress: {
    fullName: String,
    phone:    String,
    city:     String,
    subCity:  String,
    woreda:   String,
    street:   String,
  },
  timeline: [{
    status:    String,
    timestamp: { type: Date, default: Date.now },
    note:      String,
  }],
  nextReorderDate: { type: Date, default: null },
}, { timestamps: true });

// Auto-generate orderId before save
OrderSchema.pre('save', async function (next) {
  if (!this.orderId) {
    const count = await mongoose.model('Order').countDocuments();
    this.orderId = 'ORD-' + String(count + 10001).padStart(5, '0');
  }
  next();
});

module.exports = mongoose.model('Order', OrderSchema);
