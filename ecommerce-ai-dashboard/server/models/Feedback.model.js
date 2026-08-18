const mongoose = require('mongoose');

const FeedbackSchema = new mongoose.Schema({
  // Identity — always anonymous to other customers, admin sees only alias
  alias:    { type: String, default: 'Anonymous' }, // system-generated: "Customer #4521"
  
  // Feedback content
  category: {
    type: String,
    enum: ['product_quality','delivery','customer_service','website','pricing','suggestion','other'],
    required: true,
  },
  rating:   { type: Number, min: 1, max: 5, required: true },
  title:    { type: String, default: '' },
  message:  { type: String, required: true, trim: true },
  
  // Optional: which product (if product-specific feedback)
  productName: { type: String, default: '' },
  
  // Admin management
  status:     { type: String, enum: ['new','read','resolved','archived'], default: 'new' },
  adminNote:  { type: String, default: '' },
  adminReply: { type: String, default: '' },   // visible to customer
  repliedAt:  { type: Date,   default: null },
  
  // Metadata (no PII stored)
  isAnonymous: { type: Boolean, default: true },
}, { timestamps: true });

module.exports = mongoose.model('Feedback', FeedbackSchema);
