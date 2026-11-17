const express = require('express');
const router = express.Router();
const {
  getIncidents,
  createIncident,
  getIncidentById,
  updateIncident,
  addInvestigationNote,
} = require('../controllers/incidentController');
const { requireAuth } = require('../middleware/authMiddleware');

router.get('/', requireAuth, getIncidents);
router.post('/', requireAuth, createIncident);
router.get('/:id', requireAuth, getIncidentById);
router.patch('/:id', requireAuth, updateIncident);
router.post('/:id/notes', requireAuth, addInvestigationNote);

module.exports = router;
