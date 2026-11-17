const express = require('express');
const router = express.Router();
const {
  getAlerts,
  getAlertById,
  acknowledgeAlert,
  resolveAlert,
} = require('../controllers/alertController');
const { requireAuth } = require('../middleware/authMiddleware');

router.get('/', requireAuth, getAlerts);
router.get('/:id', requireAuth, getAlertById);
router.patch('/:id/acknowledge', requireAuth, acknowledgeAlert);
router.patch('/:id/resolve', requireAuth, resolveAlert);

module.exports = router;
