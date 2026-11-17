const express = require('express');
const router = express.Router();
const {
  getOverviewStats,
  getAttackAnalytics,
  getNodeAnalytics,
} = require('../controllers/analyticsController');
const { requireAuth } = require('../middleware/authMiddleware');

router.get('/overview', requireAuth, getOverviewStats);
router.get('/attacks', requireAuth, getAttackAnalytics);
router.get('/nodes', requireAuth, getNodeAnalytics);

module.exports = router;
