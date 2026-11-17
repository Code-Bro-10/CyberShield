const http = require('http');
const app = require('./app');
const env = require('./config/env');
const { connectDB, disconnectDB } = require('./config/db');
const { initRedis } = require('./queues/redisClient');
const { startStreamConsumer, stopStreamConsumer } = require('./queues/eventStreamQueue');
const { processEvent } = require('./services/eventCorrelationService');
const { startNodeHealthMonitor, stopNodeHealthMonitor } = require('./services/nodeHealthService');
const { simulatedNodeManager } = require('./simulation/simulatedNodes');
const { initSocketIO } = require('./sockets/socketHandler');
const logger = require('./utils/logger');

const server = http.createServer(app);

const startServer = async () => {
  try {
    logger.info('Starting CyberShield Distributed SOC Central Server...');

    // 1. Initialize MongoDB
    await connectDB();

    // 2. Initialize Redis (Real or Embedded Stream Broker)
    await initRedis();

    // 3. Initialize Socket.IO
    initSocketIO(server, env.CORS_ORIGIN);

    // 4. Start Distributed Redis Stream Consumer
    await startStreamConsumer(processEvent);

    // 5. Start Heartbeat & Node Health Monitor
    startNodeHealthMonitor();

    // 6. Initialize Simulated Node Cluster
    await simulatedNodeManager.initialize();

    // 7. Bind Server
    server.listen(env.PORT, () => {
      logger.success(`========================================================`);
      logger.success(` CyberShield Central SOC Server listening on port ${env.PORT}`);
      logger.success(` REST API: http://localhost:${env.PORT}/api`);
      logger.success(` Socket.IO Engine: Ready for SOC dashboard clients`);
      logger.success(`========================================================`);
    });

  } catch (err) {
    logger.error('Fatal server boot failure:', err.message);
    process.exit(1);
  }
};

// Graceful shutdown handling
const gracefulShutdown = async () => {
  logger.info('Shutting down CyberShield Server gracefully...');
  stopStreamConsumer();
  stopNodeHealthMonitor();
  simulatedNodeManager.stop();
  await disconnectDB();
  server.close(() => {
    logger.info('HTTP Server closed. Safe exit complete.');
    process.exit(0);
  });
};

process.on('SIGINT', gracefulShutdown);
process.on('SIGTERM', gracefulShutdown);

if (require.main === module) {
  startServer();
}

module.exports = { server, startServer };
