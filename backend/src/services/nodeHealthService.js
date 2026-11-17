const Node = require('../models/Node');
const SystemLog = require('../models/SystemLog');
const env = require('../config/env');
const logger = require('../utils/logger');
const { getSocketIO } = require('../sockets/socketHandler');

let healthCheckInterval = null;

const startNodeHealthMonitor = () => {
  if (healthCheckInterval) return;

  const checkIntervalMs = 10000; // Check every 10 seconds

  healthCheckInterval = setInterval(async () => {
    try {
      const timeoutThreshold = new Date(Date.now() - env.NODE_HEARTBEAT_TIMEOUT_MS);

      // Find nodes that were Online or Reconnecting but missed heartbeat
      const staleNodes = await Node.find({
        status: { $in: ['Online', 'Reconnecting', 'Degraded'] },
        lastHeartbeat: { $lt: timeoutThreshold }
      });

      for (const node of staleNodes) {
        node.status = 'Offline';
        await node.save();

        await SystemLog.create({
          logType: 'NODE_CONNECTION',
          nodeId: node.nodeId,
          message: `Monitoring node [${node.nodeId}] missed heartbeat window (${env.NODE_HEARTBEAT_TIMEOUT_MS / 1000}s). Status transitioned to OFFLINE.`,
          level: 'WARN',
          details: { lastHeartbeat: node.lastHeartbeat, threshold: timeoutThreshold }
        });

        logger.warn(`Node ${node.nodeId} missed heartbeat. Marked OFFLINE.`);

        const io = getSocketIO();
        if (io) {
          io.emit('node_status_change', {
            nodeId: node.nodeId,
            status: 'Offline',
            lastHeartbeat: node.lastHeartbeat,
          });
        }
      }
    } catch (err) {
      logger.error('Error during node health check:', err.message);
    }
  }, checkIntervalMs);

  logger.info(`Node Health Monitor running (Interval: ${checkIntervalMs / 1000}s, Timeout: ${env.NODE_HEARTBEAT_TIMEOUT_MS / 1000}s)`);
};

const stopNodeHealthMonitor = () => {
  if (healthCheckInterval) {
    clearInterval(healthCheckInterval);
    healthCheckInterval = null;
  }
};

module.exports = {
  startNodeHealthMonitor,
  stopNodeHealthMonitor,
};
