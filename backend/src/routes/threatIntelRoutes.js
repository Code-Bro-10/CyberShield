const express = require('express');
const router = express.Router();
const {
  getThreatIntelligence,
  addThreatIndicator,
  deleteThreatIndicator,
} = require('../controllers/threatIntelController');
const { requireAuth, requireRole } = require('../middleware/authMiddleware');

router.get('/', requireAuth, getThreatIntelligence);
router.post('/', requireAuth, addThreatIndicator);
router.delete('/:id', requireAuth, requireRole('admin', 'analyst'), deleteThreatIndicator);

module.exports = router;
