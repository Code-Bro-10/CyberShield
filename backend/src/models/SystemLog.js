const mongoose = require('mongoose');

const systemLogSchema = new mongoose.Schema({
  logType: {
    type: String,
    enum: ['NODE_CONNECTION', 'SERVER_INFO', 'AUTH_EVENT', 'PROCESSING_FAILURE', 'REDIS_MESSAGE', 'DETECTION_TRIGGER', 'SIMULATION_EVENT'],
    required: true,
    index: true,
  },
  nodeId: {
    type: String,
    default: 'CENTRAL_SERVER',
    index: true,
  },
  message: {
    type: String,
    required: true,
  },
  level: {
    type: String,
    enum: ['INFO', 'WARN', 'ERROR', 'DEBUG', 'CRITICAL'],
    default: 'INFO',
    index: true,
  },
  details: {
    type: mongoose.Schema.Types.Mixed,
  },
  timestamp: {
    type: Date,
    default: Date.now,
    index: true,
  },
});

module.exports = mongoose.model('SystemLog', systemLogSchema);
