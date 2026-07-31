const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth.middleware');
const { getCustomerSegments, getMySegment, getSegmentOverview, getFilteredCustomers } = require('../controllers/segment.controller');

// GET /api/segments/customers — All customers with segments (admin/vendor)
router.get('/customers', protect, authorize('admin', 'vendor'), getCustomerSegments);

// GET /api/segments/filter/:type — Filter customers by segment type (highValue, new, churnRisk, all)
router.get('/filter/:type', protect, authorize('admin', 'vendor'), getFilteredCustomers);

// GET /api/segments/my-segment — Current customer's segment
router.get('/my-segment', protect, getMySegment);

// GET /api/segments/overview — Segment overview counts (admin/vendor)
router.get('/overview', protect, authorize('admin', 'vendor'), getSegmentOverview);

module.exports = router;
