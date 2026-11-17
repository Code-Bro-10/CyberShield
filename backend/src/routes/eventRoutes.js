const express = require('express');
const router = express.Router();
const { ingestEvents, getEvents, getEventById } = require('../controllers/eventController');
const { requireAuth } = require('../middleware/authMiddleware');
const { requireAgentAuth } = require('../middleware/agentAuthMiddleware');

// Ingest from monitoring nodes (authenticated via agent key or shared secret)
router.post('/', requireAgentAuth, ingestEvents);

// Query for SOC dashboard (authenticated user)
router.get('/', requireAuth, getEvents);
router.get('/:id', requireAuth, getEventById);

module.exports = router;
