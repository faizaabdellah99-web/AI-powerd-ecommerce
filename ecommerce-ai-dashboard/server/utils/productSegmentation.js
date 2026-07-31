/**
 * productSegmentation.js — Product segmentation engine
 * 
 * Segments products based on sales velocity, stock levels, and age.
 * Provides actionable insights for inventory management.
 */

const PRODUCT_SEGMENTS = {
  fastMoving: {
    key: 'fastMoving',
    label: '🚀 Fast-Moving',
    color: '#10b981',
    bg: '#10b98115',
    description: 'High sales velocity — top selling products',
    action: 'Increase inventory, feature on homepage, bundle with accessories',
  },
  normal: {
    key: 'normal',
    label: '📦 Normal',
    color: '#3b82f6',
    bg: '#3b82f615',
    description: 'Steady selling products with healthy stock',
    action: 'Maintain current inventory levels, monitor trends',
  },
  slowMoving: {
    key: 'slowMoving',
    label: '🐌 Slow-Moving',
    color: '#f59e0b',
    bg: '#f59e0b15',
    description: 'Low sales velocity — may become dead stock',
    action: 'Consider discount, bundle, or promotional campaign',
  },
  deadStock: {
    key: 'deadStock',
    label: '💀 Dead Stock',
    color: '#ef4444',
    bg: '#ef444415',
    description: 'No sales in 90+ days — taking up inventory space',
    action: 'Clearance sale (40-60% off), bundle, or donate for tax write-off',
  },
  criticalLowStock: {
    key: 'criticalLowStock',
    label: '🔴 Critical Low Stock',
    color: '#dc2626',
    bg: '#dc262615',
    description: 'Stock below reorder point — urgent restock needed',
    action: 'Immediate restock — contact suppliers for expedited shipping',
  },
  lowStock: {
    key: 'lowStock',
    label: '⚠️ Low Stock',
    color: '#f97316',
    bg: '#f9731615',
    description: 'Running low — approaching reorder point',
    action: 'Plan restock soon, monitor daily',
  },
  outOfStock: {
    key: 'outOfStock',
    label: '❌ Out of Stock',
    color: '#991b1b',
    bg: '#991b1b15',
    description: 'Zero inventory — lost sales opportunity',
    action: 'Expedite supplier order, set to pre-order mode',
  },
};

/**
 * Determine product segment based on stock, sales history, and age
 * @param {Object} product - Product document from MongoDB
 * @returns {string} segment key
 */
function determineProductSegment(product) {
  const { stock, reorderPoint = 10, salesHistory = [], createdAt } = product;

  // Out of stock
  if (stock === 0) return 'outOfStock';

  // Critical low stock (below reorder point)
  if (stock <= reorderPoint) return 'criticalLowStock';

  // Low stock (approaching reorder point — within 2x of reorder point)
  if (stock <= reorderPoint * 2) return 'lowStock';

  // Check sales history for velocity
  if (salesHistory.length > 0) {
    const now = Date.now();
    const ninetyDaysAgo = now - 90 * 86400000;
    const thirtyDaysAgo = now - 30 * 86400000;

    // Sales in last 90 days
    const recentSales = salesHistory.filter(s => new Date(s.date).getTime() > ninetyDaysAgo);
    const totalSold90 = recentSales.reduce((sum, s) => sum + (s.quantity || 0), 0);

    // Sales in last 30 days
    const last30Sales = salesHistory.filter(s => new Date(s.date).getTime() > thirtyDaysAgo);
    const totalSold30 = last30Sales.reduce((sum, s) => sum + (s.quantity || 0), 0);

    // Dead stock: no sales in 90+ days
    if (totalSold90 === 0) return 'deadStock';

    // Fast-moving: high sales velocity (more than 30 units in 30 days)
    if (totalSold30 >= 30) return 'fastMoving';

    // Slow-moving: low sales velocity (less than 5 units in 90 days)
    if (totalSold90 < 5) return 'slowMoving';

    // Normal: everything else
    return 'normal';
  }

  // No sales history — use stock level as heuristic
  if (stock >= 50) return 'fastMoving';   // High stock = likely best seller
  if (stock >= 20) return 'normal';
  return 'slowMoving';
}

/**
 * Get full segment details for a product
 * @param {Object} product - Product document
 * @returns {Object} segment info
 */
function getProductSegmentDetails(product) {
  const key = determineProductSegment(product);
  return {
    key,
    ...PRODUCT_SEGMENTS[key],
  };
}

/**
 * Calculate product stats for segmentation display
 * @param {Object} product - Product document
 * @returns {Object} stats
 */
function calculateProductStats(product) {
  const { salesHistory = [], stock, price, reorderPoint = 10 } = product;
  const now = Date.now();
  const thirtyDaysAgo = now - 30 * 86400000;
  const ninetyDaysAgo = now - 90 * 86400000;

  const last30Sales = salesHistory.filter(s => new Date(s.date).getTime() > thirtyDaysAgo);
  const last90Sales = salesHistory.filter(s => new Date(s.date).getTime() > ninetyDaysAgo);

  const sales30 = last30Sales.reduce((sum, s) => sum + (s.quantity || 0), 0);
  const sales90 = last90Sales.reduce((sum, s) => sum + (s.quantity || 0), 0);
  const revenue30 = last30Sales.reduce((sum, s) => sum + (s.revenue || 0), 0);
  const revenue90 = last90Sales.reduce((sum, s) => sum + (s.revenue || 0), 0);

  const daysSinceLastSale = sales90 > 0
    ? Math.ceil((now - new Date(last90Sales[last90Sales.length - 1].date).getTime()) / 86400000)
    : null;

  return {
    currentStock: stock,
    reorderPoint,
    salesLast30Days: sales30,
    salesLast90Days: sales90,
    revenueLast30Days: revenue30,
    revenueLast90Days: revenue90,
    daysSinceLastSale,
    stockStatus: stock === 0 ? 'out_of_stock' :
                 stock <= reorderPoint ? 'critical' :
                 stock <= reorderPoint * 2 ? 'low' : 'healthy',
  };
}

module.exports = {
  PRODUCT_SEGMENTS,
  determineProductSegment,
  getProductSegmentDetails,
  calculateProductStats,
};