const express = require('express');
const router = express.Router();
const {
  getNodes,
  getNodeById,
  registerNode,
  sendHeartbeat,
  deleteNode,
} = require('../controllers/nodeController');
const { requireAuth, requireRole } = require('../middleware/authMiddleware');

// Monitoring node communication (public / agent-auth)
router.post('/register', registerNode);
router.post('/heartbeat', sendHeartbeat);

// Dashboard routes (requireAuth)
router.get('/', requireAuth, getNodes);
router.get('/:id', requireAuth, getNodeById);
router.delete('/:id', requireAuth, requireRole('admin'), deleteNode);

module.exports = router;
