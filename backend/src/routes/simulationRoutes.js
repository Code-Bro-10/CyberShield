const express = require('express');
const router = express.Router();
const {
  getSimulationStatus,
  startSimulation,
  stopSimulation,
  pauseSimulation,
  resumeSimulation,
  triggerScenario,
} = require('../controllers/simulationController');
const { requireAuth } = require('../middleware/authMiddleware');

router.get('/status', requireAuth, getSimulationStatus);
router.post('/start', requireAuth, startSimulation);
router.post('/stop', requireAuth, stopSimulation);
router.post('/pause', requireAuth, pauseSimulation);
router.post('/resume', requireAuth, resumeSimulation);
router.post('/trigger', requireAuth, triggerScenario);

module.exports = router;
