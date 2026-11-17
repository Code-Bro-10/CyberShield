const { Server } = require('socket.io');
const logger = require('../utils/logger');

let io = null;

const initSocketIO = (httpServer, corsOrigin) => {
  io = new Server(httpServer, {
    cors: {
      origin: true,
      methods: ['GET', 'POST'],
      credentials: true,
    },
    transports: ['websocket', 'polling'],
  });

  io.on('connection', (socket) => {
    logger.debug(`SOC Dashboard client connected: ${socket.id}`);

    socket.emit('connection_established', {
      serverTime: new Date().toISOString(),
      socketId: socket.id,
      system: 'CyberShield Central SOC',
    });

    socket.on('subscribe_node', (nodeId) => {
      socket.join(`node:${nodeId}`);
      logger.debug(`Client ${socket.id} joined room node:${nodeId}`);
    });

    socket.on('unsubscribe_node', (nodeId) => {
      socket.leave(`node:${nodeId}`);
    });

    socket.on('disconnect', (reason) => {
      logger.debug(`SOC Dashboard client disconnected: ${socket.id} (${reason})`);
    });
  });

  logger.info('Socket.IO real-time engine initialized.');
  return io;
};

const getSocketIO = () => io;

module.exports = {
  initSocketIO,
  getSocketIO,
};
