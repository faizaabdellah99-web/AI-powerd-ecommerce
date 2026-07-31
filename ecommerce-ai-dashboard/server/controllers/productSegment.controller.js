const Product = require('../models/Product.model');
const Order = require('../models/Order.model');
const { PRODUCT_SEGMENTS, determineProductSegment, getProductSegmentDetails, calculateProductStats } = require('../utils/productSegmentation');

/**
 * GET /api/product-segments/overview — Enhanced product segment overview
 */
exports.getProductSegmentOverview = async (req, res) => {
  try {
    const products = await Product.find();
    const orders = await Order.find({ paymentStatus: 'paid' });

    // Initialize segment data
    const segmentData = {};
    Object.keys(PRODUCT_SEGMENTS).forEach(k => {
      segmentData[k] = {
        ...PRODUCT_SEGMENTS[k],
        count: 0,
        products: [],
        totalValue: 0,
        totalStock: 0,
        totalRevenue: 0,
      };
    });

    // Process each product
    products.forEach(product => {
      const segmentKey = determineProductSegment(product);
      const stats = calculateProductStats(product);

      // Calculate revenue from orders for this product
      let productRevenue = 0;
      let productSalesQty = 0;
      orders.forEach(order => {
        order.items.forEach(item => {
          if (item.productId === product._id.toString() || 
              item.productName?.toLowerCase() === product.name?.toLowerCase()) {
            productRevenue += (item.price || 0) * (item.qty || 0);
            productSalesQty += item.qty || 0;
          }
        });
      });

      if (segmentData[segmentKey]) {
        segmentData[segmentKey].count += 1;
        segmentData[segmentKey].totalValue += (product.stock || 0) * (product.price || 0);
        segmentData[segmentKey].totalStock += product.stock || 0;
        segmentData[segmentKey].totalRevenue += productRevenue;
        segmentData[segmentKey].products.push({
          _id: product._id,
          name: product.name,
          price: product.price,
          stock: product.stock,
          category: product.category,
          revenue: productRevenue,
          salesQty: productSalesQty,
          ...stats,
        });
      }
    });

    // Sort products within each segment by revenue
    Object.keys(segmentData).forEach(k => {
      segmentData[k].products.sort((a, b) => b.revenue - a.revenue);
    });

    res.json(segmentData);
  } catch (err) {
    console.error('GET /product-segments/overview error:', err.message);
    res.status(500).json({ message: err.message });
  }
};

/**
 * GET /api/product-segments/:segment — Get products in a specific segment
 */
exports.getProductsBySegment = async (req, res) => {
  try {
    const { segment } = req.params;
    const validSegments = Object.keys(PRODUCT_SEGMENTS);
    
    if (!validSegments.includes(segment)) {
      return res.status(400).json({ 
        message: `Invalid segment. Valid segments: ${validSegments.join(', ')}` 
      });
    }

    const products = await Product.find();
    const orders = await Order.find({ paymentStatus: 'paid' });

    const segmentProducts = [];
    products.forEach(product => {
      const segmentKey = determineProductSegment(product);
      if (segmentKey === segment) {
        const stats = calculateProductStats(product);
        
        let productRevenue = 0;
        orders.forEach(order => {
          order.items.forEach(item => {
            if (item.productId === product._id.toString() || 
                item.productName?.toLowerCase() === product.name?.toLowerCase()) {
              productRevenue += (item.price || 0) * (item.qty || 0);
            }
          });
        });

        segmentProducts.push({
          _id: product._id,
          name: product.name,
          price: product.price,
          stock: product.stock,
          category: product.category,
          description: product.description,
          brand: product.brand,
          images: product.images,
          revenue: productRevenue,
          ...stats,
        });
      }
    });

    res.json({
      segment: PRODUCT_SEGMENTS[segment],
      products: segmentProducts.sort((a, b) => b.revenue - a.revenue),
      total: segmentProducts.length,
    });
  } catch (err) {
    console.error('GET /product-segments/:segment error:', err.message);
    res.status(500).json({ message: err.message });
  }
};

/**
 * GET /api/product-segments/recommendations — AI recommendations for product segments
 */
exports.getProductSegmentRecommendations = async (req, res) => {
  try {
    const recommendations = {
      fastMoving: [
        '🚀 Increase inventory by 30% for fast-moving products to prevent stockouts',
        '📢 Feature on homepage and in promotional campaigns',
        '💎 Bundle with accessories to increase average order value',
        '📊 Monitor closely for supply chain bottlenecks',
      ],
      normal: [
        '📦 Maintain current inventory levels',
        '🔄 Review pricing strategy for margin optimization',
        '📈 Monitor sales trends for early signs of change',
        '👥 Gather customer reviews to maintain momentum',
      ],
      slowMoving: [
        '🐌 Consider discount or promotional campaign to stimulate demand',
        '🔄 Bundle with fast-moving products to clear inventory',
        '📉 Review pricing — may be overpriced for market',
        '🔍 Evaluate if product positioning needs adjustment',
      ],
      deadStock: [
        '💀 Run clearance sale with 40-60% discount',
        '📦 Bundle with popular items to move inventory',
        '🎁 Consider as free gift with purchase promotion',
        '💸 Donate for tax write-off if storage costs exceed value',
      ],
      criticalLowStock: [
        '🔴 Immediate restock required — contact suppliers for expedited shipping',
        '📊 Consider temporary price increase to manage remaining demand',
        '🔄 Set up pre-order option for customers',
        '📋 Review reorder point settings to prevent future occurrences',
      ],
      lowStock: [
        '⚠️ Plan restock soon — monitor daily',
        '📦 Place supplier order within 7 days',
        '📊 Review lead times and adjust reorder points',
        '🔄 Consider alternative suppliers for backup',
      ],
      outOfStock: [
        '❌ Expedite supplier order immediately',
        '🔄 Enable pre-order mode to capture demand',
        '📋 Notify customers when back in stock',
        '🔍 Analyze why stock ran out and prevent recurrence',
      ],
    };

    res.json({ recommendations });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

module.exports = {
  getProductSegmentOverview: exports.getProductSegmentOverview,
  getProductsBySegment: exports.getProductsBySegment,
  getProductSegmentRecommendations: exports.getProductSegmentRecommendations,
};