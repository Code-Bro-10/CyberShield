const bruteForceDetector = require('./rules/bruteForceDetector');
const portScanDetector = require('./rules/portScanDetector');
const dosDetector = require('./rules/dosDetector');
const suspiciousIpDetector = require('./rules/suspiciousIpDetector');
const malwareHashDetector = require('./rules/malwareHashDetector');
const networkAnomalyDetector = require('./rules/networkAnomalyDetector');
const logger = require('../utils/logger');

const detectors = [
  bruteForceDetector,
  portScanDetector,
  dosDetector,
  suspiciousIpDetector,
  malwareHashDetector,
  networkAnomalyDetector,
];

const evaluateEvent = async (event) => {
  const matches = [];

  for (const detector of detectors) {
    try {
      const result = await detector.evaluate(event);
      if (result && result.matched) {
        matches.push({
          detectorName: detector.name,
          ...result,
        });
      }
    } catch (err) {
      logger.error(`Error in detector [${detector.name}]:`, err.message);
    }
  }

  return matches;
};

module.exports = {
  detectors,
  evaluateEvent,
};
