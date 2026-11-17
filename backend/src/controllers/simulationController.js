const { simulator } = require('../simulation/simulator');
const { simulatedNodeManager } = require('../simulation/simulatedNodes');

// GET /api/simulation/status
const getSimulationStatus = async (req, res, next) => {
  try {
    const status = simulator.getStatus();
    const nodes = simulatedNodeManager.getRegisteredNodes();
    return res.json({
      success: true,
      ...status,
      simulatedNodes: nodes,
    });
  } catch (err) {
    next(err);
  }
};

// POST /api/simulation/start
const startSimulation = async (req, res, next) => {
  try {
    const { targetNode, scenario, frequencySec } = req.body;
    const status = simulator.start({
      targetNode: targetNode || 'all',
      scenario: scenario || 'all',
      frequencySec: frequencySec ? Number(frequencySec) : 2,
    });
    return res.json({ success: true, message: 'Attack event simulation started', status });
  } catch (err) {
    next(err);
  }
};

// POST /api/simulation/stop
const stopSimulation = async (req, res, next) => {
  try {
    const status = simulator.stop();
    return res.json({ success: true, message: 'Attack event simulation stopped', status });
  } catch (err) {
    next(err);
  }
};

// POST /api/simulation/pause
const pauseSimulation = async (req, res, next) => {
  try {
    const status = simulator.pause();
    return res.json({ success: true, message: 'Attack event simulation paused', status });
  } catch (err) {
    next(err);
  }
};

// POST /api/simulation/resume
const resumeSimulation = async (req, res, next) => {
  try {
    const status = simulator.resume();
    return res.json({ success: true, message: 'Attack event simulation resumed', status });
  } catch (err) {
    next(err);
  }
};

// POST /api/simulation/trigger
const triggerScenario = async (req, res, next) => {
  try {
    const { scenario, targetNode } = req.body;
    if (!scenario) {
      return res.status(400).json({ success: false, message: 'Scenario name is required' });
    }
    const event = await simulator.triggerScenario(scenario, targetNode);
    return res.json({
      success: true,
      message: `Scenario [${scenario}] triggered successfully on [${event.nodeId}]`,
      event,
    });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getSimulationStatus,
  startSimulation,
  stopSimulation,
  pauseSimulation,
  resumeSimulation,
  triggerScenario,
};
