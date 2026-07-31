const User = require('../models/User.model');
const Order = require('../models/Order.model');
const { SEGMENTS, determineSegment, getSegmentDetails, calculateStats, getFavouriteCategories, generateRecommendations } = require('../utils/segmentation');

// GET /api/segments/customers — Get all customers with their segments
exports.getCustomerSegments = async (req, res) => {
  try {
    const customers = await User.find({ role: 'customer' }).select('-password').sort({ createdAt: -1 });
    const customerIds = customers.map(c => c._id);
    const orders = await Order.find({ customer: { $in: customerIds } });

    const segmentCounts = {};
    Object.keys(SEGMENTS).forEach(k => { segmentCounts[k] = 0; });

    const customerData = customers.map(c => {
      const myOrders = orders.filter(o => o.customer.toString() === c._id.toString());
      const stats = calculateStats(myOrders);
      const segment = getSegmentDetails(stats);
      const categories = getFavouriteCategories(myOrders);
      const recommendations = generateRecommendations(segment, stats, categories);

      segmentCounts[segment.key] = (segmentCounts[segment.key] || 0) + 1;

      return {
        _id: c._id,
        name: c.name,
        email: c.email,
        avatar: c.avatar,
        location: c.location || '',
        createdAt: c.createdAt,
        ...stats,
        segment: segment.key,
        segmentLabel: segment.label,
        segmentColor: segment.color,
        segmentDescription: segment.description,
        favouriteCategories: categories,
        recommendations,
        benefits: segment.benefits || [],
        marketingStrategy: segment.marketingStrategy || {},
      };
    });

    res.json({
      customers: customerData,
      segmentCounts,
      totalCustomers: customers.length,
    });
  } catch (err) {
    console.error('GET /segments/customers error:', err.message);
    res.status(500).json({ message: err.message });
  }
};

// GET /api/segments/my-segment — Get current customer's segment (for customer dashboard)
exports.getMySegment = async (req, res) => {
  try {
    const orders = await Order.find({ customer: req.user._id }).sort({ createdAt: -1 });
    const stats = calculateStats(orders);
    const segment = getSegmentDetails(stats);
    const categories = getFavouriteCategories(orders);
    const recommendations = generateRecommendations(segment, stats, categories);

    res.json({
      segment: {
        key: segment.key,
        label: segment.label,
        color: segment.color,
        bg: segment.bg,
        description: segment.description,
        benefits: segment.benefits || [],
        marketingStrategy: segment.marketingStrategy || {},
      },
      stats,
      favouriteCategories: categories,
      recommendations,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// GET /api/segments/filter/:type — Get filtered customer data by segment type
exports.getFilteredCustomers = async (req, res) => {
  try {
    const { type } = req.params;
    const validTypes = ['highValue', 'new', 'churnRisk', 'all'];
    if (!validTypes.includes(type)) {
      return res.status(400).json({ message: 'Invalid filter type. Use: highValue, new, churnRisk, or all' });
    }

    const customers = await User.find({ role: 'customer' }).select('-password').sort({ createdAt: -1 });
    const customerIds = customers.map(c => c._id);
    const orders = await Order.find({ customer: { $in: customerIds } });

    let filteredCustomers = customers.map(c => {
      const myOrders = orders.filter(o => o.customer.toString() === c._id.toString());
      const stats = calculateStats(myOrders);
      const segment = getSegmentDetails(stats);
      const categories = getFavouriteCategories(myOrders);
      const recommendations = generateRecommendations(segment, stats, categories);

      return {
        _id: c._id,
        name: c.name,
        email: c.email,
        avatar: c.avatar,
        location: c.location || '',
        createdAt: c.createdAt,
        ...stats,
        segment: segment.key,
        segmentLabel: segment.label,
        segmentColor: segment.color,
        segmentDescription: segment.description,
        favouriteCategories: categories,
        recommendations,
        benefits: segment.benefits || [],
        marketingStrategy: segment.marketingStrategy || {},
      };
    });

    // Apply filter based on type
    switch (type) {
      case 'highValue':
        // High-Value: VIP + Regular with high avg order (>$100)
        filteredCustomers = filteredCustomers.filter(c => 
          c.segment === 'vip' || (c.segment === 'regular' && c.avgOrder > 100)
        );
        break;
      case 'new':
        // New: Less than 30 days old, 0 or 1 order
        const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000);
        filteredCustomers = filteredCustomers.filter(c => 
          new Date(c.createdAt) > thirtyDaysAgo && c.totalOrders <= 1
        );
        break;
      case 'churnRisk':
        // Churn Risk: At Risk + Inactive
        filteredCustomers = filteredCustomers.filter(c => 
          c.segment === 'atrisk' || c.segment === 'inactive'
        );
        break;
      case 'all':
      default:
        // No filter, return all
        break;
    }

    res.json({
      customers: filteredCustomers,
      totalFiltered: filteredCustomers.length,
      filterType: type,
    });
  } catch (err) {
    console.error('GET /segments/filter error:', err.message);
    res.status(500).json({ message: err.message });
  }
};

// GET /api/segments/overview — Get segment overview counts (for admin dashboard)
exports.getSegmentOverview = async (req, res) => {
  try {
    const customers = await User.find({ role: 'customer' });
    const customerIds = customers.map(c => c._id);
    const orders = await Order.find({ customer: { $in: customerIds } });

    const segmentData = {};
    Object.keys(SEGMENTS).forEach(k => {
      segmentData[k] = {
        ...SEGMENTS[k],
        count: 0,
        totalRevenue: 0,
        avgOrder: 0,
      };
    });

    customers.forEach(c => {
      const myOrders = orders.filter(o => o.customer.toString() === c._id.toString());
      const stats = calculateStats(myOrders);
      const key = determineSegment(stats);

      if (segmentData[key]) {
        segmentData[key].count += 1;
        segmentData[key].totalRevenue += stats.totalSpent;
      }
    });

    // Calculate averages
    Object.keys(segmentData).forEach(k => {
      if (segmentData[k].count > 0) {
        segmentData[k].avgOrder = Math.round(segmentData[k].totalRevenue / segmentData[k].count);
      }
      segmentData[k].totalRevenue = `$${(segmentData[k].totalRevenue || 0).toLocaleString()}`;
      segmentData[k].avgOrder = `$${segmentData[k].avgOrder || 0}`;
    });

    res.json(segmentData);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};