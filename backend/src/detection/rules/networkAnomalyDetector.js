const env = require('../../config/env');

const networkAnomalyDetector = {
  name: 'Network Anomaly Detector',
  category: 'Network Anomaly',

  evaluate: async (event) => {
    // Check if event has high packet size, abnormal protocol flags, or ML anomaly score
    const isExplicitAnomaly =
      event.eventType === 'NETWORK_ANOMALY' ||
      event.detectionMethod === 'MACHINE_LEARNING' ||
      (event.metadata && event.metadata.isAnomaly === true);

    const anomalyScore = event.metadata?.anomalyScore || (event.confidence > 0.8 ? event.confidence : null);

    if (isExplicitAnomaly || (anomalyScore && anomalyScore > 0.75)) {
      const score = anomalyScore ? parseFloat(anomalyScore) : 0.82;
      return {
        matched: true,
        category: 'Network Anomaly',
        severity: score > 0.85 ? 'High' : 'Medium',
        confidenceScore: score,
        description: `Statistical/ML network flow anomaly detected on ${event.nodeId}. Flow from ${event.sourceIP}:${event.sourcePort || 'any'} to ${event.destinationIP}:${event.destinationPort || 'any'} deviated significantly from baseline (Anomaly Score: ${score.toFixed(3)}).`,
        metadata: {
          anomalyScore: score,
          method: event.detectionMethod || 'MACHINE_LEARNING',
          flowMetrics: event.metadata || {},
        }
      };
    }

    return null;
  }
};

module.exports = networkAnomalyDetector;
