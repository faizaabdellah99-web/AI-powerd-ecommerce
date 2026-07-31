/**
 * segmentation.js — AI-powered customer segmentation engine
 * 
 * Segments customers based on their purchase behavior, order history,
 * and engagement patterns. Provides personalised marketing strategies
 * per segment.
 */

const SEGMENTS = {
  vip: {
    key: 'vip',
    label: '👑 VIP',
    color: '#f59e0b',
    bg: '#f59e0b15',
    description: 'High frequency + high spend — your most valuable customers',
    minOrders: 5,
    minSpent: 500,
    maxDaysSinceLastOrder: 30,
    benefits: [
      'Free express shipping on all orders',
      'Early access to new products',
      'Exclusive VIP-only discounts (15-20%)',
      'Dedicated priority customer support',
      'Birthday & anniversary special offers',
    ],
    marketingStrategy: {
      channel: 'Personalised email + SMS',
      frequency: 'Weekly',
      offers: 'Exclusive early access, VIP-only flash sales, loyalty points multiplier',
      tone: 'Premium, exclusive, appreciative',
    },
  },
  regular: {
    key: 'regular',
    label: '⭐ Regular',
    color: '#10b981',
    bg: '#10b98115',
    description: 'Consistent, loyal customers who shop regularly',
    minOrders: 3,
    minSpent: 100,
    maxDaysSinceLastOrder: 45,
    benefits: [
      'Loyalty discount of 10% on next purchase',
      'Free shipping on orders over $50',
      'Early access to seasonal sales',
      'Personalised product recommendations',
    ],
    marketingStrategy: {
      channel: 'Email + in-app notifications',
      frequency: 'Bi-weekly',
      offers: 'Loyalty rewards, "Frequently bought together" suggestions, category-specific promotions',
      tone: 'Friendly, appreciative, helpful',
    },
  },
  occasional: {
    key: 'occasional',
    label: '🔄 Occasional',
    color: '#8b5cf6',
    bg: '#8b5cf615',
    description: 'Infrequent shoppers who need re-engagement',
    minOrders: 1,
    minSpent: 0,
    maxDaysSinceLastOrder: 60,
    benefits: [
      'Welcome-back discount of 15%',
      'Free shipping on first order back',
      'Curated product recommendations based on past purchases',
    ],
    marketingStrategy: {
      channel: 'Email + retargeting ads',
      frequency: 'Weekly for 3 weeks, then monthly',
      offers: 'Re-engagement discounts, "We miss you" campaigns, new arrival highlights',
      tone: 'Warm, inviting, curiosity-driven',
    },
  },
  new: {
    key: 'new',
    label: '🆕 New',
    color: '#3b82f6',
    bg: '#3b82f615',
    description: 'Recently joined — needs nurturing to convert to regular',
    minOrders: 0,
    minSpent: 0,
    maxDaysSinceLastOrder: 0,
    benefits: [
      'Welcome discount of 10% on first order',
      'Onboarding guide to platform features',
      'AI shopping assistant introduction',
    ],
    marketingStrategy: {
      channel: 'Email drip campaign + push notifications',
      frequency: '3 emails over 14 days, then weekly',
      offers: 'Welcome discount, first-purchase free shipping, category exploration prompts',
      tone: 'Welcoming, educational, encouraging',
    },
  },
  atrisk: {
    key: 'atrisk',
    label: '⚠️ At Risk',
    color: '#ef4444',
    bg: '#ef444415',
    description: 'Declining activity — may churn without intervention',
    minOrders: 1,
    minSpent: 0,
    maxDaysSinceLastOrder: 90,
    benefits: [
      'Win-back discount of 20%',
      'Urgency-based limited-time offer',
      'Personalised re-engagement message',
    ],
    marketingStrategy: {
      channel: 'Email + SMS + push notification',
      frequency: '3 messages over 10 days, then monthly check-in',
      offers: '20% win-back coupon with 7-day expiry, free shipping, "New for you" product picks',
      tone: 'Urgent but caring, personalised, value-focused',
    },
  },
  inactive: {
    key: 'inactive',
    label: '😴 Inactive',
    color: '#64748b',
    bg: '#64748b15',
    description: 'No activity in 90+ days — last-chance re-engagement',
    minOrders: 0,
    minSpent: 0,
    maxDaysSinceLastOrder: Infinity,
    benefits: [
      'Final re-engagement offer of 30% off',
      'Simple one-click reorder from history',
      'Notification of new features since last visit',
    ],
    marketingStrategy: {
      channel: 'One final email + SMS',
      frequency: 'One last attempt, then suppress',
      offers: '30% off final offer, "We updated our platform" message, easy reorder link',
      tone: 'Direct, honest, low-pressure',
    },
  },
};

/**
 * Determine customer segment based on order history
 * @param {Object} stats - { totalOrders, totalSpent, avgOrder, daysSinceLastOrder }
 * @returns {string} segment key
 */
function determineSegment(stats) {
  const { totalOrders, totalSpent, avgOrder, daysSinceLastOrder } = stats;

  if (totalOrders === 0) return 'new';
  if (daysSinceLastOrder > 90) return 'inactive';
  if (daysSinceLastOrder > 45) return 'atrisk';
  if (totalSpent >= 500 && totalOrders >= 5) return 'vip';
  if (avgOrder > 150) return 'vip';
  if (totalOrders >= 3) return 'regular';
  if (totalOrders >= 1) return 'occasional';
  return 'new';
}

/**
 * Get full segment details for a customer
 * @param {Object} stats - { totalOrders, totalSpent, avgOrder, daysSinceLastOrder }
 * @returns {Object} segment info with key, label, color, benefits, strategy
 */
function getSegmentDetails(stats) {
  const key = determineSegment(stats);
  return {
    key,
    ...SEGMENTS[key],
    stats,
  };
}

/**
 * Calculate customer stats from orders array
 * @param {Array} orders - Array of order objects
 * @returns {Object} { totalOrders, totalSpent, avgOrder, daysSinceLastOrder }
 */
function calculateStats(orders = []) {
  const totalOrders = orders.length;
  const paidOrders = orders.filter(o => o.paymentStatus === 'paid');
  const totalSpent = paidOrders.reduce((sum, o) => sum + (o.total || 0), 0);
  const avgOrder = totalOrders > 0 ? Math.round(totalSpent / totalOrders) : 0;

  let daysSinceLastOrder = null;
  if (orders.length > 0) {
    const sorted = [...orders].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    const lastDate = new Date(sorted[0].createdAt);
    daysSinceLastOrder = Math.ceil((Date.now() - lastDate) / 86400000);
  }

  return { totalOrders, totalSpent, avgOrder, daysSinceLastOrder };
}

/**
 * Get favourite categories from orders
 * @param {Array} orders - Array of order objects with items
 * @returns {Array} top categories
 */
function getFavouriteCategories(orders = []) {
  const cats = {};
  orders.forEach(o => o.items?.forEach(i => {
    const cat = i.category || 'Uncategorized';
    cats[cat] = (cats[cat] || 0) + (i.qty || 1);
  }));
  return Object.entries(cats)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([cat]) => cat);
}

/**
 * Generate AI-style personalised recommendations based on segment
 * @param {Object} segment - segment details object
 * @param {Object} stats - customer stats
 * @param {Array} categories - favourite categories
 * @returns {Array} recommendation strings
 */
function generateRecommendations(segment, stats, categories = []) {
  const { key, marketingStrategy } = segment;
  const catStr = categories.length > 0 ? categories.slice(0, 2).join(' and ') : 'our products';

  const recommendations = {
    vip: [
      `🎯 Offer exclusive early access to new ${catStr} arrivals — VIPs love being first`,
      `💎 Send a personalised thank-you gift with their next order (e.g. free premium sample)`,
      `📈 Invite to a VIP loyalty tier with points multiplier on ${catStr} purchases`,
      `🎁 Birthday month: double loyalty points + $20 store credit`,
    ],
    regular: [
      `🔄 Send "Frequently bought together" suggestions based on their ${catStr} history`,
      `⭐ Offer a 10% loyalty discount code valid for their next ${catStr} purchase`,
      `📧 Weekly newsletter featuring new ${catStr} arrivals and trending items`,
      `🏆 Create a simple referral program: "Refer a friend, get $10 off"`,
    ],
    occasional: [
      `👋 Send a "We miss you" email with 15% off their favourite ${catStr} categories`,
      `🆕 Highlight what's new in ${catStr} since their last visit`,
      `📱 Push notification: "New arrivals in ${catStr} — see what's trending"`,
      `💡 Recommend best-sellers in ${catStr} to rebuild purchase confidence`,
    ],
    new: [
      `🎉 Welcome series: Email 1 — platform overview, Email 2 — ${catStr} highlights, Email 3 — 10% discount`,
      `🤖 Introduce the AI shopping assistant for personalised ${catStr} recommendations`,
      `📚 Share a "Getting Started" guide with tips for finding the best ${catStr} products`,
      `⭐ Encourage first purchase with free shipping on orders over $30`,
    ],
    atrisk: [
      `⚠️ Urgent: 20% off coupon expiring in 7 days — "We don't want to lose you!"`,
      `📞 Personal follow-up: "Haven't seen you in a while — here's what's new in ${catStr}"`,
      `🎯 Targeted retargeting ad featuring top-rated ${catStr} products they viewed`,
      `💬 SMS reminder after 3 days if email is not opened`,
    ],
    inactive: [
      `😴 Final re-engagement: 30% off + free shipping — "Come back and see what's changed"`,
      `🔄 One-click reorder from their last purchase in ${catStr}`,
      `📢 "Big changes!" email highlighting new features, products, and improvements`,
      `✅ If no response in 14 days, mark as churned and remove from active campaigns`,
    ],
  };

  return recommendations[key] || recommendations.new;
}

module.exports = {
  SEGMENTS,
  determineSegment,
  getSegmentDetails,
  calculateStats,
  getFavouriteCategories,
  generateRecommendations,
};